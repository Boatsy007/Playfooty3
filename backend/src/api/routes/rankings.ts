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

function logAndRethrow(route: string, err: unknown): never {
  console.error(err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  console.error(`[rankings] ${route} failed`, {
    name: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
  })
  throw err
}

async function getLatestRun(season?: string) {
  const runs = await prisma.rankingRun.findMany({
    where:   { status: 'COMPLETED', ...(season ? { season } : {}) },
    orderBy: { completedAt: 'desc' },
    take:    25,
  })

  for (const run of runs) {
    const publicFootballEntries = await prisma.rankingEntry.count({
      where: {
        runId: run.id,
        league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
        club: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      },
    })
    if (publicFootballEntries > 0) return run
  }

  return null
}

async function getEntries(runId: string, limit?: number, state?: string) {
  return prisma.rankingEntry.findMany({
    where: {
      runId,
      league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      club: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      ...(state ? { state } : {}),
    },
    orderBy: { rank: 'asc' },
    ...(limit ? { take: limit } : {}),
  })
}

/** Shape a ranking entry for public API response. */
function formatEntry(
  entry: Awaited<ReturnType<typeof getEntries>>[number],
  stats?: { played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; percentage: number; points: number },
) {
  let recentForm: unknown = []
  let componentScores: unknown = {}
  try { recentForm = JSON.parse((entry.recentForm as string) || '[]') } catch { /* keep [] */ }
  try { componentScores = JSON.parse((entry.componentScores as string) || '{}') } catch { /* keep {} */ }

  return {
    rank:         entry.rank,
    previousRank: entry.previousRank,
    rankMovement: entry.rankMovement ?? 0,
    clubId:       entry.clubId,
    clubName:     entry.clubName ?? 'Unknown Club',
    logoUrl:      null,
    leagueName:   entry.leagueName ?? 'Unknown League',
    state:        entry.state ?? '—',
    powerRating:  Number.isFinite(entry.powerRating) ? entry.powerRating : 0,
    // Raw season stats (from ClubLeagueSeason) so the frontend can show record + goals
    record:       { wins: stats?.wins ?? 0, losses: stats?.losses ?? 0, draws: stats?.draws ?? 0, played: stats?.played ?? 0 },
    goalsFor:     stats?.goalsFor ?? 0,
    goalsAgainst: stats?.goalsAgainst ?? 0,
    percentage:   stats?.percentage ?? 0,
    points:       stats?.points ?? 0,
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
    select: { clubId: true, leagueId: true, played: true, wins: true, losses: true, draws: true, goalsFor: true, goalsAgainst: true, percentage: true, points: true },
  })
  type SeasonStats = { clubId: string; leagueId: string; played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; percentage: number; points: number }
  const byClubLeague = new Map<string, SeasonStats>(seasons.map((s: SeasonStats) => [`${s.clubId}:${s.leagueId}`, s]))
  const byClub       = new Map<string, SeasonStats>(seasons.map((s: SeasonStats) => [s.clubId, s]))

  return entries.map(e => {
    const stats = byClubLeague.get(`${e.clubId}:${e.leagueId}`) ?? byClub.get(e.clubId)
    return formatEntry(e, stats)
  })
}


async function getFallbackEntries(limit?: number, state?: string, season?: string) {
  const latestSeason = season ?? (await prisma.clubLeagueSeason.findFirst({
    where: { isActive: true, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true }, club: { sport: 'FOOTBALL', archivedAt: null, isActive: true } },
    orderBy: { season: 'desc' },
    select: { season: true },
  }))?.season

  const rows = await prisma.clubLeagueSeason.findMany({
    where: {
      isActive: true,
      ...(season ? { season } : {}),
      league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      club: { sport: 'FOOTBALL', archivedAt: null, isActive: true, ...(state ? { state: { code: state } } : {}) },
    },
    orderBy: [{ points: 'desc' }, { percentage: 'desc' }, { wins: 'desc' }, { club: { name: 'asc' } }],
    ...(limit ? { take: limit } : {}),
    select: {
      clubId: true, leagueId: true, season: true, played: true, wins: true, losses: true, draws: true, goalsFor: true, goalsAgainst: true, percentage: true, points: true,
      club: { select: { name: true, state: { select: { code: true } } } },
      league: { select: { name: true } },
    },
  })

  return {
    season: latestSeason ?? null,
    data: rows.map((row, index) => ({
      rank: index + 1,
      previousRank: null,
      rankMovement: 0,
      clubId: row.clubId,
      clubName: row.club?.name ?? 'Unknown Club',
      logoUrl: null,
      leagueName: row.league?.name ?? 'Unknown League',
      state: row.club?.state?.code ?? '—',
      powerRating: row.points || row.percentage ? Math.round((((row.points ?? 0) * 4) + (row.percentage ?? 0)) * 10) / 10 : 0,
      record: { wins: row.wins, losses: row.losses, draws: row.draws, played: row.played },
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      percentage: row.percentage,
      points: row.points,
      recentForm: [],
      componentScores: {},
      calculatedAt: null,
    })),
  }
}

// GET /api/rankings
router.get('/', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { season, state } = req.query as Record<string, string>
    const run = await getLatestRun(season)
    if (!run) {
      const fallback = await getFallbackEntries(undefined, state, season)
      res.json({ data: fallback.data, meta: { weekLabel: null, season: fallback.season, total: fallback.data.length, source: 'clubs-fallback' } })
      return
    }

    const entries = await getEntries(run.id, undefined, state)
    if (entries.length === 0) {
      const fallback = await getFallbackEntries(undefined, state, run.season)
      res.json({ data: fallback.data, meta: { weekLabel: run.weekLabel, season: run.season, total: fallback.data.length, generatedAt: run.completedAt, source: 'clubs-fallback' } })
      return
    }
    res.json({
      data: await formatEntries(entries, run.season),
      meta: { weekLabel: run.weekLabel, season: run.season, total: entries.length, generatedAt: run.completedAt },
    })
  } catch (err) {
    logger.error('GET /rankings error', { detail: String(err) })
    logAndRethrow('GET /api/rankings', err)
  }
})

// GET /api/rankings/week/:weekLabel
router.get('/week/:weekLabel', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const run = await prisma.rankingRun.findFirst({
      where:   { weekLabel: String(req.params.weekLabel), status: 'COMPLETED' },
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
    logAndRethrow('GET /api/rankings/week/:weekLabel', err)
  }
})

// GET /api/top10
router.get('/top10', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) {
      const fallback = await getFallbackEntries(10, state)
      res.json({ data: fallback.data, meta: { season: fallback.season, source: 'clubs-fallback' } })
      return
    }

    const entries = await getEntries(run.id, 10, state)
    if (entries.length === 0) {
      const fallback = await getFallbackEntries(10, state, run.season)
      res.json({ data: fallback.data, meta: { weekLabel: run.weekLabel, season: run.season, source: 'clubs-fallback' } })
      return
    }
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    logAndRethrow('GET /api/top10', err)
  }
})

// GET /api/top25
router.get('/top25', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) {
      const fallback = await getFallbackEntries(25, state)
      res.json({ data: fallback.data, meta: { season: fallback.season, source: 'clubs-fallback' } })
      return
    }

    const entries = await getEntries(run.id, 25, state)
    if (entries.length === 0) {
      const fallback = await getFallbackEntries(25, state, run.season)
      res.json({ data: fallback.data, meta: { weekLabel: run.weekLabel, season: run.season, source: 'clubs-fallback' } })
      return
    }
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    logAndRethrow('GET /api/top25', err)
  }
})

// GET /api/top100
router.get('/top100', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>
    const run = await getLatestRun()
    if (!run) {
      const fallback = await getFallbackEntries(100, state)
      res.json({ data: fallback.data, meta: { season: fallback.season, source: 'clubs-fallback' } })
      return
    }

    const entries = await getEntries(run.id, 100, state)
    if (entries.length === 0) {
      const fallback = await getFallbackEntries(100, state, run.season)
      res.json({ data: fallback.data, meta: { weekLabel: run.weekLabel, season: run.season, source: 'clubs-fallback' } })
      return
    }
    res.json({ data: await formatEntries(entries, run.season), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    logAndRethrow('GET /api/top100', err)
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
      league: entry.leagueId ? {
        name:          entry.leagueName,
        strength:      null,
        confidence:    null,
        reasoning:     null,
        calculatedAt:  null,
      } : null,
    } })
  } catch (err) {
    logger.error('GET /rankings/explain error', { detail: String(err) })
    logAndRethrow('GET /api/rankings/explain/:clubId', err)
  }
})

export { router as rankingsRouter }
