/**
 * Weekly Rankings Update Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Main orchestration job. Runs every Monday morning via GitHub Actions cron.
 * Can also be triggered manually from the admin dashboard.
 *
 * Pipeline:
 *  1. Load league configurations from DB
 *  2. Scrape all data sources (adapters)
 *  3. Normalise raw data → club records
 *  4. Load previous rankings for movement calculation
 *  5. Run ranking engine
 *  6. Persist snapshot to DB
 *  7. Log result summary
 */

import { prisma }           from '../db/client.js'
import { scrapeAll }        from '../scrapers/scraper.engine.js'
import { normaliseResults } from '../scrapers/result-normalizer.js'
import { rankingEngine }    from '../engine/ranking.engine.js'
import { getISOWeekLabel, getCurrentSeason } from '../utils/week-label.js'
import { logger }           from '../utils/logger.js'
import type { LeagueSourceUrl, DataSourceType } from '../types/index.js'

export interface JobResult {
  weekLabel:   string
  season:      string
  clubsRanked: number
  errors:      number
  durationMs:  number
  status:      'SUCCESS' | 'PARTIAL' | 'FAILED'
}

export async function runWeeklyUpdate(overrideWeekLabel?: string): Promise<JobResult> {
  const start     = Date.now()
  const weekLabel = overrideWeekLabel ?? getISOWeekLabel()
  const season    = getCurrentSeason()

  logger.info('WeeklyUpdateJob: starting', { weekLabel, season })

  // ── 1. Load league configurations ──────────────────────────────────────────
  const leagueRows = await prisma.leagueSource.findMany({
    where:   { isActive: true },
    include: { league: { include: { state: true } } },
  })

  if (leagueRows.length === 0) {
    logger.warn('WeeklyUpdateJob: no active league sources found — aborting')
    return { weekLabel, season, clubsRanked: 0, errors: 0, durationMs: Date.now() - start, status: 'FAILED' }
  }

  const leagues: LeagueSourceUrl[] = leagueRows.map(row => ({
    leagueId:    row.leagueId,
    leagueName:  row.league.name,
    state:       row.league.state.code,
    season,
    sourceType:  row.sourceType as DataSourceType,
    ladderUrl:   row.ladderUrl ?? undefined,
    fixturesUrl: row.fixturesUrl ?? undefined,
  }))

  // ── 2. Load league strength scores ─────────────────────────────────────────
  const leagueStrength: Record<string, number> = {}
  for (const row of leagueRows) {
    leagueStrength[row.league.name] = row.league.strengthScore ?? 50
  }

  // ── 3. Scrape data ──────────────────────────────────────────────────────────
  const scrapeResult = await scrapeAll(leagues)

  // ── 4. Normalise ────────────────────────────────────────────────────────────
  const clubRecords = normaliseResults({
    ladders:        scrapeResult.ladders,
    matches:        scrapeResult.matches,
    leagueStrength,
    season,
  })

  if (clubRecords.length === 0) {
    logger.error('WeeklyUpdateJob: normalisation produced zero club records')
    return { weekLabel, season, clubsRanked: 0, errors: scrapeResult.errors.length, durationMs: Date.now() - start, status: 'FAILED' }
  }

  // ── 5. Load previous rankings for movement tracking ─────────────────────────
  const previousRankings = new Map<string, number>()
  const previousRun = await prisma.rankingRun.findFirst({
    where:   { season, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: { entries: { select: { clubId: true, rank: true } } },
  })

  if (previousRun) {
    for (const entry of previousRun.entries) {
      previousRankings.set(entry.clubId, entry.rank)
    }
  }

  // ── 6. Load ranking weights (from DB config, fallback to defaults) ──────────
  const configRow = await prisma.rankingConfig.findFirst({
    where:   { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  let weights = {}
  if (configRow?.weights) {
    try {
      weights = JSON.parse(configRow.weights as string)
    } catch {
      logger.warn('WeeklyUpdateJob: failed to parse weights from DB — using defaults')
    }
  }

  // ── 7. Run ranking engine ───────────────────────────────────────────────────
  const { RankingEngine } = await import('../engine/ranking.engine.js')
  const engine = new RankingEngine(weights)
  const rankings = engine.rankCohort(clubRecords, previousRankings, weekLabel, season)

  // ── 8. Persist to DB ────────────────────────────────────────────────────────
  const run = await prisma.rankingRun.create({
    data: {
      weekLabel,
      season,
      status:      'COMPLETED',
      clubCount:   rankings.length,
      configId:    configRow?.id ?? null,
      completedAt: new Date(),
      entries: {
        create: rankings.map(r => ({
          clubId:      r.clubId,
          clubName:    r.clubName,
          leagueId:    r.leagueId,
          leagueName:  r.leagueName,
          state:       r.state,
          rank:        r.rank,
          previousRank: r.previousRank ?? null,
          rankMovement: r.rankMovement,
          powerRating: r.powerRating,
          recentForm:  JSON.stringify(r.recentForm),
          componentScores: JSON.stringify(r.componentScores),
          calculatedAt: r.calculatedAt,
        })),
      },
    },
  })

  const durationMs = Date.now() - start
  const hasErrors  = scrapeResult.errors.length > 0
  const status     = hasErrors ? 'PARTIAL' : 'SUCCESS'

  logger.info('WeeklyUpdateJob: complete', {
    runId:       run.id,
    weekLabel,
    clubsRanked: rankings.length,
    errors:      scrapeResult.errors.length,
    durationMs,
    status,
  })

  return { weekLabel, season, clubsRanked: rankings.length, errors: scrapeResult.errors.length, durationMs, status }
}
