/**
 * Aggregation jobs (Phase B11).
 * ─────────────────────────────────────────────────────────────────────────────
 * Rolls raw AnalyticsEvent + SearchQuery rows up into EntityPopularity,
 * SearchTermStat and AnalyticsDaily (rebuildable caches). Runs across time
 * windows (ALL / rolling-7 / rolling-30) and computes a trend score (recent-7 vs
 * the previous-7). Designed to run out-of-band (workflow/CLI) so page requests
 * are never slowed. Idempotent: caches are upserted per (entity/term, window).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

const DAY_MS = 24 * 60 * 60 * 1000
const VIEW_ENTITY: Record<string, string> = { CLUB_VIEW: 'CLUB', LEAGUE_VIEW: 'LEAGUE', ARTICLE_VIEW: 'ARTICLE' }
const SEARCH_EVENTS = new Set(['CLUB_SEARCH', 'LEAGUE_SEARCH'])

interface Tally { entityType: string; entityId: string; entityName?: string | null; views: number; visitors: Set<string>; searches: number; sponsorClicks: number }

function tallyEvents(events: { eventType: string; entityType: string | null; entityId: string | null; visitorId: string | null }[]): Map<string, Tally> {
  const m = new Map<string, Tally>()
  const get = (type: string, id: string) => { const k = `${type}:${id}`; let t = m.get(k); if (!t) { t = { entityType: type, entityId: id, views: 0, visitors: new Set(), searches: 0, sponsorClicks: 0 }; m.set(k, t) } return t }
  for (const e of events) {
    if (!e.entityId) continue
    const viewType = VIEW_ENTITY[e.eventType]
    if (viewType) { const t = get(viewType, e.entityId); t.views++; if (e.visitorId) t.visitors.add(e.visitorId) }
    else if (SEARCH_EVENTS.has(e.eventType) && e.entityType) { const t = get(e.entityType, e.entityId); t.searches++ }
    else if (e.eventType === 'SPONSOR_CLICK' && e.entityType) { const t = get(e.entityType, e.entityId); t.sponsorClicks++ }
  }
  return m
}

async function loadEvents(sinceMs?: number) {
  return prisma.analyticsEvent.findMany({
    where: sinceMs ? { createdAt: { gte: new Date(sinceMs) } } : {},
    select: { eventType: true, entityType: true, entityId: true, visitorId: true },
    take: 500000,
  })
}

async function nameFor(entityType: string, entityId: string): Promise<string | null> {
  try {
    if (entityType === 'CLUB') return (await prisma.club.findUnique({ where: { id: entityId }, select: { name: true } }))?.name ?? null
    if (entityType === 'LEAGUE') return (await prisma.league.findUnique({ where: { id: entityId }, select: { name: true } }))?.name ?? null
    if (entityType === 'ARTICLE') return (await prisma.generatedArticle.findUnique({ where: { id: entityId }, select: { title: true } }))?.title ?? null
  } catch { /* ignore */ }
  return null
}

async function writePopularity(windowKey: string, tally: Map<string, Tally>, trendFrom?: Map<string, Tally>): Promise<number> {
  let n = 0
  for (const [, t] of tally) {
    const prevViews = trendFrom?.get(`${t.entityType}:${t.entityId}`)?.views ?? 0
    const trendScore = t.views - prevViews
    const score = t.views * 1 + t.visitors.size * 2 + t.searches * 1.5 + t.sponsorClicks * 3
    const name = await nameFor(t.entityType, t.entityId)
    await prisma.entityPopularity.upsert({
      where: { entityType_entityId_windowKey: { entityType: t.entityType, entityId: t.entityId, windowKey } },
      create: { entityType: t.entityType, entityId: t.entityId, entityName: name, windowKey, views: t.views, uniqueVisitors: t.visitors.size, searches: t.searches, sponsorClicks: t.sponsorClicks, score, trendScore },
      update: { entityName: name, views: t.views, uniqueVisitors: t.visitors.size, searches: t.searches, sponsorClicks: t.sponsorClicks, score, trendScore },
    })
    n++
  }
  return n
}

async function aggregateSearchTerms(): Promise<number> {
  const now = Date.now()
  const windows: [string, number | undefined][] = [['ALL', undefined], ['ROLL7', now - 7 * DAY_MS], ['ROLL30', now - 30 * DAY_MS]]
  const prev7 = new Map<string, number>()
  const prevRows = await prisma.searchQuery.findMany({ where: { createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } }, select: { normalizedTerm: true } })
  for (const r of prevRows) prev7.set(r.normalizedTerm, (prev7.get(r.normalizedTerm) ?? 0) + 1)

  let n = 0
  for (const [windowKey, since] of windows) {
    const rows = await prisma.searchQuery.findMany({ where: since ? { createdAt: { gte: new Date(since) } } : {}, select: { term: true, normalizedTerm: true, zeroResult: true, visitorId: true }, take: 200000 })
    const m = new Map<string, { term: string; searches: number; zero: number; visitors: Set<string> }>()
    for (const r of rows) { if (!r.normalizedTerm) continue; let t = m.get(r.normalizedTerm); if (!t) { t = { term: r.term, searches: 0, zero: 0, visitors: new Set() }; m.set(r.normalizedTerm, t) } t.searches++; if (r.zeroResult) t.zero++; if (r.visitorId) t.visitors.add(r.visitorId) }
    for (const [norm, t] of m) {
      const trendScore = windowKey === 'ROLL7' ? t.searches - (prev7.get(norm) ?? 0) : 0
      await prisma.searchTermStat.upsert({
        where: { normalizedTerm_windowKey: { normalizedTerm: norm, windowKey } },
        create: { normalizedTerm: norm, term: t.term, windowKey, searches: t.searches, zeroResults: t.zero, uniqueVisitors: t.visitors.size, trendScore },
        update: { term: t.term, searches: t.searches, zeroResults: t.zero, uniqueVisitors: t.visitors.size, trendScore },
      })
      n++
    }
  }
  return n
}

async function aggregateDaily(): Promise<number> {
  const rows = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: new Date(Date.now() - 90 * DAY_MS) } }, select: { createdAt: true, visitorId: true, sessionId: true, eventType: true }, take: 500000 })
  const byDay = new Map<string, { visitors: Set<string>; sessions: Set<string>; events: number; searches: number }>()
  const firstSeen = new Map<string, string>() // visitorId → first day
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  for (const r of sorted) {
    const day = r.createdAt.toISOString().slice(0, 10)
    let d = byDay.get(day); if (!d) { d = { visitors: new Set(), sessions: new Set(), events: 0, searches: 0 }; byDay.set(day, d) }
    d.events++
    if (r.eventType.includes('SEARCH')) d.searches++
    if (r.visitorId) { d.visitors.add(r.visitorId); if (!firstSeen.has(r.visitorId)) firstSeen.set(r.visitorId, day) }
    if (r.sessionId) d.sessions.add(r.sessionId)
  }
  let n = 0
  for (const [day, d] of byDay) {
    let returning = 0
    for (const v of d.visitors) if (firstSeen.get(v) !== day) returning++
    await prisma.analyticsDaily.upsert({
      where: { day },
      create: { day, visitors: d.visitors.size, sessions: d.sessions.size, events: d.events, searches: d.searches, returningVisitors: returning },
      update: { visitors: d.visitors.size, sessions: d.sessions.size, events: d.events, searches: d.searches, returningVisitors: returning },
    })
    n++
  }
  return n
}

export interface AggregateReport { events: number; entities: number; terms: number; days: number }

export async function runAggregation(): Promise<AggregateReport> {
  const now = Date.now()
  const [allEvents, roll30, roll7, prev7] = await Promise.all([
    loadEvents(),
    loadEvents(now - 30 * DAY_MS),
    loadEvents(now - 7 * DAY_MS),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } }, select: { eventType: true, entityType: true, entityId: true, visitorId: true }, take: 500000 }),
  ])
  const prevTally = tallyEvents(prev7)
  let entities = 0
  entities += await writePopularity('ALL', tallyEvents(allEvents))
  entities += await writePopularity('ROLL30', tallyEvents(roll30))
  entities += await writePopularity('ROLL7', tallyEvents(roll7), prevTally)
  const terms = await aggregateSearchTerms()
  const days = await aggregateDaily()

  const report: AggregateReport = { events: allEvents.length, entities, terms, days }
  await prisma.analyticsRun.create({ data: { kind: 'AGGREGATE', events: report.events, entities, terms, days } }).catch(() => {})
  logger.info('Analytics aggregation complete', { ...report })
  return report
}
