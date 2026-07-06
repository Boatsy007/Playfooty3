/**
 * Rankings API Routes
 * GET /api/rankings        — full current rankings
 * GET /api/top10           — top 10 clubs
 * GET /api/top25           — top 25 clubs
 * GET /api/top100          — top 100 clubs
 * GET /api/rankings/week/:weekLabel — rankings for a specific week
 */

import { Router }        from 'express'
import { prisma }        from '../../db/client.js'
import { cachePublic }   from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { clubRankingReasoning } from '../../config/ranking-reasoning.js'
import { logger }        from '../../utils/logger.js'

const router = Router()

async function getLatestRun(season?: string) {
  return prisma.rankingRun.findFirst({
    where:   { status: 'COMPLETED', ...(season ? { season } : {}) },
    orderBy: { completedAt: 'desc' },
  })
}

async function getEntries(runId: string, limit?: number, state?: string) {
  return prisma.rankingEntry.findMany({
    where: {
      runId,
      league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      ...(state ? { state } : {}),
    },
    orderBy: { rank: 'asc' },
    ...(limit ? { take: limit } : {}),
  })
}

/** Shape a ranking entry for public API response. */
function formatEntry(
  entry: Awaited<ReturnType<typeof getEntries>>[number],
  stats?: { played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; percentage: number },
) {
  let recentForm: unknown = []
  let componentScores: unknown = {}
  try { recentForm = JSON.parse((entry.recentForm as string) || '[]') } catch { /* keep [] */ }
  try { componentScores = JSON.parse((entry.componentScores as string) || '{}') } catch { /* keep {} */ }

  return {
    rank:         entry.rank,
    previousRank: entry.previousRank,
    rankMovement: entry.rankMovement,
    clubId:       entry.clubId,
    clubName:     entry.clubName,
    leagueName:   entry.leagueName,
    state:        entry.state,
    powerRating:  entry.powerRating,
    // Raw season stats (from ClubLeagueSeason) so the frontend can show record + goals
    record:       { wins: stats?.wins ?? 0, losses: stats?.losses ?? 0, draws: stats?.draws ?? 0, played: stats?.played ?? 0 },
    goalsFor:     stats?.goalsFor ?? 0,
    goalsAgainst: stats?.goalsAgainst ?? 0,
    percentage:   stats?.percentage ?? 0,
    recentForm,
    componentScores,
    calculatedAt: entry.calculatedAt,
  }
}

/** Format a list of entries, enriching each with its season stats. */
async function formatEntries(
  entries: Awaited<ReturnType<typeof getEntries>>,
  season: string,
) {
  const clubIds = entries.map(e => e.clubId)
  const seasons = await prisma.clubLeagueSeason.findMany({
    where:  { clubId: { in: clubIds }, season },
    select: { clubId: true, leagueId: true, played: true, wins: true, losses: true, draws: true, goalsFor: true, goalsAgainst: true, percentage: true },
  })
  type SeasonStats = { clubId: string; leagueId: string; played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; percentage: number }
  const byClubLeague = new Map<string, SeasonStats>(seasons.map((s: SeasonStats) => [`${s.clubId}:${s.leagueId}`, s]))
  const byClub       = new Map<string, SeasonStats>(seasons.map((s: SeasonStats) => [s.clubId, s]))

  return entries.map(e => {
    const stats = byClubLeague.get(`${e.clubId}:${e.leagueId}`) ?? byClub.get(e.clubId)
    return formatEntry(e, stats)
  })
}

// GET /api/rankings
router.get('/', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { season, state } = req.query as Record<string, string>
    const run = await getLatestRun(season)
    if (!run) { res.json({ data: [], meta: { weekLabel: null, season: null, total: 0 } }); return }

    const entries = await getEntries(run.id, undefined, state)
    res.json({
      data: await formatEntries(entries, run.season),
      meta: { weekLabel: run.weekLabel, season: run.season, total: entries.length, generatedAt: run.completedAt },
    })
  } catch (err) {
    logger.error('GET /rankings error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /api/rankings/week/:weekLabel
router.get('/week/:weekLabel', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const run = await prisma.rankingRun.findFirst({
      where:   { weekLabel: req.params.weekLabel, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    })
    if (!run) { res.status(404).json({ error: 'No rankings found for this week' }); return }

    const entries = await getEntries(run.id)
    res.json({
      data: await formatEntries(entries, run.season),
      meta: { weekLabel: run.weekLabel, season: run.season, total: entries.length },
    })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /api/top10
router.get('/top10', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) { res.json({ data: [], meta: {} }); return }

    const entries = await getEntries(run.id, 10, state)
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /api/top25
router.get('/top25', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) { res.json({ data: [], meta: {} }); return }

    const entries = await getEntries(run.id, 25, state)
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /api/top100
router.get('/top100', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) { res.json({ data: [], meta: {} }); return }

    const entries = await getEntries(run.id, 100, state)
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /api/rankings/explain/:clubId — why this club is ranked where it is,
// plus why its league carries its strength rating (Phase 6 explainability).
router.get('/explain/:clubId', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const run = await getLatestRun()
    if (!run) { res.status(404).json({ error: 'No completed ranking run' }); return }

    const entry = await prisma.rankingEntry.findUnique({
      where: { runId_clubId: { runId: run.id, clubId: String(req.params.clubId) } },
    })
    if (!entry) { res.status(404).json({ error: 'Club not found in the current rankings' }); return }
    const publicLeague = await prisma.league.findFirst({ where: { id: entry.leagueId, sport: 'FOOTBALL', archivedAt: null, isActive: true }, select: { id: true } })
    if (!publicLeague) { res.status(404).json({ error: 'Club not found in the current rankings' }); return }

    let componentScores: Record<string, number> = {}
    let recentForm: string[] = []
    try { componentScores = JSON.parse(entry.componentScores || '{}') } catch { /* keep {} */ }
    try { recentForm = JSON.parse(entry.recentForm || '[]') } catch { /* keep [] */ }

    // Active weights (falls back to defaults inside the reasoning module).
    const config = await prisma.rankingConfig.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
    let weights
    try { weights = config?.weights ? JSON.parse(config.weights as string) : undefined } catch { weights = undefined }

    const league = entry.leagueId
      ? await prisma.league.findUnique({ where: { id: entry.leagueId }, select: { strengthReasoning: true, strengthConfidence: true, finalStrengthRating: true, strengthCalculatedAt: true } })
      : null

    res.json({ data: {
      clubId:      entry.clubId,
      clubName:    entry.clubName,
      rank:        entry.rank,
      powerRating: entry.powerRating,
      weekLabel:   run.weekLabel,
      reasoning:   clubRankingReasoning({
        clubName: entry.clubName, leagueName: entry.leagueName, rank: entry.rank,
        powerRating: entry.powerRating, rankMovement: entry.rankMovement,
        componentScores, recentForm, weights,
      }),
      componentScores,
      league: league ? {
        name:          entry.leagueName,
        strength:      league.finalStrengthRating,
        confidence:    league.strengthConfidence,
        reasoning:     league.strengthReasoning,
        calculatedAt:  league.strengthCalculatedAt,
      } : null,
    } })
  } catch (err) {
    logger.error('GET /rankings/explain error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as rankingsRouter }
