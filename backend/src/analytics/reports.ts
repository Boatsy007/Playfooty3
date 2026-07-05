/**
 * Analytics reports (Phase B11) — read-only over the aggregate caches.
 * ─────────────────────────────────────────────────────────────────────────────
 * Overview, per-type popularity, search analytics, trending, top referrers and
 * commercial reports. All figures come from EntityPopularity / SearchTermStat /
 * AnalyticsDaily plus light raw queries — never PII.
 */

import { prisma } from '../db/client.js'

const topPopularity = (entityType: string, windowKey: string, by: 'score' | 'views' | 'searches' | 'trendScore' | 'sponsorClicks' = 'score', take = 20) =>
  prisma.entityPopularity.findMany({ where: { entityType, windowKey }, orderBy: { [by]: 'desc' }, take })

export async function overview() {
  const now = Date.now()
  const [today, last7, last30, totalEvents, totalSearches, lastRun] = await Promise.all([
    prisma.analyticsDaily.findUnique({ where: { day: new Date().toISOString().slice(0, 10) } }),
    prisma.analyticsDaily.findMany({ where: { day: { gte: new Date(now - 7 * 86400000).toISOString().slice(0, 10) } } }),
    prisma.analyticsDaily.findMany({ where: { day: { gte: new Date(now - 30 * 86400000).toISOString().slice(0, 10) } } }),
    prisma.analyticsEvent.count(),
    prisma.searchQuery.count(),
    prisma.analyticsRun.findFirst({ orderBy: { ranAt: 'desc' } }),
  ])
  const sum = (rows: { visitors: number; sessions: number; events: number; returningVisitors: number }[], k: 'visitors' | 'sessions' | 'events' | 'returningVisitors') => rows.reduce((a, r) => a + r[k], 0)
  return {
    daily: today ?? null,
    weekly: { visitors: sum(last7, 'visitors'), sessions: sum(last7, 'sessions'), events: sum(last7, 'events'), returning: sum(last7, 'returningVisitors') },
    monthly: { visitors: sum(last30, 'visitors'), sessions: sum(last30, 'sessions'), events: sum(last30, 'events'), returning: sum(last30, 'returningVisitors') },
    totals: { events: totalEvents, searches: totalSearches },
    lastAggregation: lastRun?.ranAt ?? null,
  }
}

export async function clubReport(windowKey = 'ALL') {
  return {
    mostViewed: await topPopularity('CLUB', windowKey, 'views'),
    trending: await topPopularity('CLUB', 'ROLL7', 'trendScore'),
    mostSearched: await topPopularity('CLUB', windowKey, 'searches'),
  }
}
export async function leagueReport(windowKey = 'ALL') {
  return {
    mostViewed: await topPopularity('LEAGUE', windowKey, 'views'),
    trending: await topPopularity('LEAGUE', 'ROLL7', 'trendScore'),
    mostSearched: await topPopularity('LEAGUE', windowKey, 'searches'),
  }
}
export async function newsReport(windowKey = 'ALL') {
  return {
    mostViewed: await topPopularity('ARTICLE', windowKey, 'views'),
    trending: await topPopularity('ARTICLE', 'ROLL7', 'trendScore'),
  }
}

export async function searchReport(windowKey = 'ALL') {
  const [popular, zero, trending] = await Promise.all([
    prisma.searchTermStat.findMany({ where: { windowKey }, orderBy: { searches: 'desc' }, take: 30 }),
    prisma.searchTermStat.findMany({ where: { windowKey, zeroResults: { gt: 0 } }, orderBy: { zeroResults: 'desc' }, take: 30 }),
    prisma.searchTermStat.findMany({ where: { windowKey: 'ROLL7' }, orderBy: { trendScore: 'desc' }, take: 20 }),
  ])
  return { popular, zeroResult: zero, trending }
}

export async function trendingReport() {
  return {
    clubs: await topPopularity('CLUB', 'ROLL7', 'trendScore', 15),
    leagues: await topPopularity('LEAGUE', 'ROLL7', 'trendScore', 15),
    articles: await topPopularity('ARTICLE', 'ROLL7', 'trendScore', 15),
    searchTerms: await prisma.searchTermStat.findMany({ where: { windowKey: 'ROLL7' }, orderBy: { trendScore: 'desc' }, take: 15 }),
  }
}

export async function topReferrers(limit = 20) {
  const rows = await prisma.analyticsEvent.groupBy({ by: ['referrer'], where: { referrer: { not: null } }, _count: { referrer: true }, orderBy: { _count: { referrer: 'desc' } }, take: limit })
  return rows.map(r => ({ referrer: r.referrer, count: r._count.referrer }))
}

/** Commercial report: sponsor impressions/clicks + featured/premium exposure. */
export async function commercialReport() {
  const [impressions, clicks, bySponsor] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: 'SPONSOR_IMPRESSION' } }),
    prisma.analyticsEvent.count({ where: { eventType: 'SPONSOR_CLICK' } }),
    prisma.analyticsEvent.groupBy({ by: ['entityId'], where: { eventType: 'SPONSOR_CLICK', entityId: { not: null } }, _count: { entityId: true }, orderBy: { _count: { entityId: 'desc' } }, take: 25 }),
  ])
  const ctr = impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0
  const [externalClicks, claimClubCtas, claimLeagueCtas] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: 'EXTERNAL_LINK_CLICK' } }),
    prisma.analyticsEvent.count({ where: { eventType: 'CLAIM_CLUB_CTA' } }),
    prisma.analyticsEvent.count({ where: { eventType: 'CLAIM_LEAGUE_CTA' } }),
  ])
  return {
    sponsor: { impressions, clicks, ctrPct: ctr, topClicked: bySponsor.map(s => ({ sponsorshipId: s.entityId, clicks: s._count.entityId })) },
    externalClicks, claimClubCtas, claimLeagueCtas,
    note: 'derived from anonymous events; advertising analytics extend from here',
  }
}
