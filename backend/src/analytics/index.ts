/**
 * Analytics engine orchestrator (Phase B11).
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the aggregation jobs (out-of-band). The only writes are into the B11
 * caches + an AnalyticsRun audit row. Supports a future retention purge.
 */

import { prisma } from '../db/client.js'
import { runAggregation, type AggregateReport } from './aggregate.js'
import { logger } from '../utils/logger.js'

export async function runAnalyticsEngine(): Promise<AggregateReport> {
  return runAggregation()
}

/**
 * Retention purge (future data-retention settings). Deletes raw events/search
 * logs older than `days` (aggregates are kept). Off by default (days<=0 = no-op).
 */
export async function purgeOldRawData(days: number): Promise<{ events: number; searches: number }> {
  if (!days || days <= 0) return { events: 0, searches: 0 }
  const cutoff = new Date(Date.now() - days * 86400000)
  const e = await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } })
  const s = await prisma.searchQuery.deleteMany({ where: { createdAt: { lt: cutoff } } })
  await prisma.analyticsRun.create({ data: { kind: 'PURGE', detail: JSON.stringify({ days, events: e.count, searches: s.count }) } }).catch(() => {})
  logger.info('Analytics retention purge', { days, events: e.count, searches: s.count })
  return { events: e.count, searches: s.count }
}
