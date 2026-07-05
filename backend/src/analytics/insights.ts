/**
 * Per-entity insights (Phase B11) — future club/league dashboard data.
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only summaries for one club or league: profile views (all / 7d / 30d),
 * weekly & monthly growth, searches, sponsor clicks; leagues also get their most
 * viewed clubs. Sourced from the aggregate caches + light raw counts.
 */

import { prisma } from '../db/client.js'

const DAY_MS = 86400000

async function windowRow(entityType: string, entityId: string, windowKey: string) {
  return prisma.entityPopularity.findUnique({ where: { entityType_entityId_windowKey: { entityType, entityId, windowKey } } })
}

function growth(recent: number, previous: number): number {
  if (previous <= 0) return recent > 0 ? 100 : 0
  return +(((recent - previous) / previous) * 100).toFixed(1)
}

export async function clubInsights(clubId: string) {
  const [all, roll7, roll30, club] = await Promise.all([
    windowRow('CLUB', clubId, 'ALL'), windowRow('CLUB', clubId, 'ROLL7'), windowRow('CLUB', clubId, 'ROLL30'),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
  ])
  // Previous 7 days (for weekly growth) from raw events.
  const now = Date.now()
  const prev7 = await prisma.analyticsEvent.count({ where: { eventType: 'CLUB_VIEW', entityId: clubId, createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } } })
  const prev30 = await prisma.analyticsEvent.count({ where: { eventType: 'CLUB_VIEW', entityId: clubId, createdAt: { gte: new Date(now - 60 * DAY_MS), lt: new Date(now - 30 * DAY_MS) } } })
  const newsReads = await prisma.analyticsEvent.count({ where: { eventType: 'ARTICLE_VIEW', meta: { contains: clubId } } }).catch(() => 0)
  return {
    clubId, clubName: club?.name ?? null,
    profileViews: { all: all?.views ?? 0, last7: roll7?.views ?? 0, last30: roll30?.views ?? 0 },
    uniqueVisitors: { all: all?.uniqueVisitors ?? 0, last7: roll7?.uniqueVisitors ?? 0 },
    weeklyGrowthPct: growth(roll7?.views ?? 0, prev7),
    monthlyGrowthPct: growth(roll30?.views ?? 0, prev30),
    searches: all?.searches ?? 0,
    sponsorClicks: all?.sponsorClicks ?? 0,
    newsReads,
  }
}

export async function leagueInsights(leagueId: string) {
  const [all, roll7, roll30, league] = await Promise.all([
    windowRow('LEAGUE', leagueId, 'ALL'), windowRow('LEAGUE', leagueId, 'ROLL7'), windowRow('LEAGUE', leagueId, 'ROLL30'),
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }),
  ])
  const now = Date.now()
  const prev7 = await prisma.analyticsEvent.count({ where: { eventType: 'LEAGUE_VIEW', entityId: leagueId, createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } } })
  // Most viewed clubs of this league (from ClubLeagueSeason membership × popularity).
  const memberships = await prisma.clubLeagueSeason.findMany({ where: { leagueId }, select: { clubId: true }, take: 400 })
  const clubIds = [...new Set(memberships.map(m => m.clubId))]
  const pops = clubIds.length ? await prisma.entityPopularity.findMany({ where: { entityType: 'CLUB', windowKey: 'ALL', entityId: { in: clubIds } }, orderBy: { views: 'desc' }, take: 15 }) : []
  return {
    leagueId, leagueName: league?.name ?? null,
    profileViews: { all: all?.views ?? 0, last7: roll7?.views ?? 0, last30: roll30?.views ?? 0 },
    weeklyGrowthPct: growth(roll7?.views ?? 0, prev7),
    searchVolume: all?.searches ?? 0,
    mostViewedClubs: pops.map(p => ({ clubId: p.entityId, clubName: p.entityName, views: p.views })),
  }
}
