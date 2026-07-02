/**
 * Scraper Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates all data adapters to collect ladders and match results for
 * every configured league. Adapters run in priority order; errors from one
 * source never block others.
 *
 * Output is raw (RawLadder[] / RawMatch[]) — pass to result-normalizer next.
 */

import type {
  LeagueSourceUrl,
  RawLadder,
  RawMatch,
  DataSourceType,
  AdapterError,
} from '../types/index.js'
import { getAdapter, getAllAdapters } from '../adapters/adapter-registry.js'
import { logger } from '../utils/logger.js'

export interface ScrapeResult {
  ladders:    RawLadder[]
  matches:    RawMatch[]
  errors:     AdapterError[]
  durationMs: number
  sourceCounts: Record<string, number>
}

/**
 * Collect all ladders and matches for the given league configurations.
 * Groups leagues by source type and dispatches each group to the right adapter.
 */
export async function scrapeAll(leagues: LeagueSourceUrl[]): Promise<ScrapeResult> {
  const start   = Date.now()
  const ladders: RawLadder[]  = []
  const matches: RawMatch[]   = []
  const errors: AdapterError[] = []
  const sourceCounts: Record<string, number> = {}

  // Group leagues by their source type
  const grouped = new Map<DataSourceType, LeagueSourceUrl[]>()
  for (const league of leagues) {
    const existing = grouped.get(league.sourceType) ?? []
    existing.push(league)
    grouped.set(league.sourceType, existing)
  }

  // Dispatch to each adapter in parallel (adapters handle their own rate limiting)
  await Promise.allSettled(
    Array.from(grouped.entries()).map(async ([sourceType, group]) => {
      const adapter = getAdapter(sourceType)
      if (!adapter) {
        logger.warn(`ScraperEngine: no adapter registered for ${sourceType}`)
        return
      }

      logger.info(`ScraperEngine: collecting ${group.length} leagues via ${adapter.name}`)

      const [ladderResult, matchResult] = await Promise.allSettled([
        adapter.collectLadders(group),
        adapter.collectMatches(group),
      ])

      if (ladderResult.status === 'fulfilled') {
        ladders.push(...ladderResult.value.data)
        errors.push(...ladderResult.value.errors)
        sourceCounts[`${sourceType}.ladders`] = ladderResult.value.data.length
      } else {
        logger.error(`ScraperEngine: ${adapter.name} collectLadders threw`, { error: ladderResult.reason })
      }

      if (matchResult.status === 'fulfilled') {
        matches.push(...matchResult.value.data)
        errors.push(...matchResult.value.errors)
        sourceCounts[`${sourceType}.matches`] = matchResult.value.data.length
      } else {
        logger.error(`ScraperEngine: ${adapter.name} collectMatches threw`, { error: matchResult.reason })
      }
    }),
  )

  const durationMs = Date.now() - start

  logger.info('ScraperEngine: collection complete', {
    ladders:   ladders.length,
    matches:   matches.length,
    errors:    errors.length,
    durationMs,
  })

  return { ladders, matches, errors, durationMs, sourceCounts }
}

/** Health check — ping all adapters and return status. */
export async function checkAdapterHealth(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}

  await Promise.allSettled(
    getAllAdapters().map(async adapter => {
      results[adapter.name] = await adapter.ping().catch(() => false)
    }),
  )

  return results
}
