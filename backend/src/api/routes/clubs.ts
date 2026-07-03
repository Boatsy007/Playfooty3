/**
 * Clubs API Routes
 * GET /api/clubs           — list all clubs (latest season)
 * GET /api/clubs/:id       — single club profile with history
 * GET /api/history/:clubId — full ranking history for a club
 */

import { Router }          from 'express'
import { prisma }          from '../../db/client.js'
import { cachePublic }     from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// GET /api/clubs
router.get('/', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state, league, season } = req.query as Record<string, string>

    const run = await prisma.rankingRun.findFirst({
      where:   { status: 'COMPLETED', ...(season ? { season } : {}) },
      orderBy: { completedAt: 'desc' },
    })

    if (!run) return res.json({ data: [], meta: {} })

    const entries = await prisma.rankingEntry.findMany({
      where: {
        runId: run.id,
        ...(state  ? { state }       : {}),
        ...(league ? { leagueName: { contains: league, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { rank: 'asc' },
      take:    200,
    })

    res.json({
      data: entries.map(e => ({
        clubId:      e.clubId,
        clubName:    e.clubName,
        leagueName:  e.leagueName,
        state:       e.state,
        rank:        e.rank,
        powerRating: e.powerRating,
      })),
      meta: { weekLabel: run.weekLabel, season: run.season, total: entries.length },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/clubs/:id
// Full read-only club profile for the team profile page: current national rank,
// power rating, league + league strength, season record / goals / percentage /
// ladder position, recent form, championship qualification, and rank history.
const QUALIFY_CUTOFF = 32

router.get('/:id', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const clubId = req.params.id

    // Get current ranking (latest run), if this club is ranked.
    const currentEntry = await prisma.rankingEntry.findFirst({
      where:   { clubId },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      include: { rankingRun: { select: { id: true, weekLabel: true, season: true, completedAt: true } } },
    })

    // Fallback base: the club itself + its most recent season row, so EVERY club
    // in the directory has a working profile even when it isn't currently ranked.
    const club = await prisma.club.findUnique({
      where:  { id: clubId },
      include: { state: { select: { code: true } } },
    })
    if (!currentEntry && !club) return res.status(404).json({ error: 'Club not found' })

    const season = currentEntry?.rankingRun.season
    const cls = await prisma.clubLeagueSeason.findFirst({
      where:   { clubId, ...(currentEntry ? { season, leagueId: currentEntry.leagueId } : {}) },
      orderBy: { season: 'desc' },
      include: { league: { select: { id: true, name: true, strengthScore: true, strengthTier: true } } },
    })

    const league = cls?.league
      ?? (currentEntry ? await prisma.league.findFirst({ where: { id: currentEntry.leagueId }, select: { id: true, name: true, strengthScore: true, strengthTier: true } }) : null)

    const history = await prisma.rankingEntry.findMany({
      where:   { clubId },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      take:    12,
      include: { rankingRun: { select: { weekLabel: true, completedAt: true } } },
    })

    const rank = currentEntry?.rank ?? null

    res.json({
      data: {
        clubId,
        clubName:    currentEntry?.clubName ?? club?.name ?? 'Unknown Club',
        leagueId:    currentEntry?.leagueId ?? league?.id ?? cls?.leagueId ?? null,
        leagueName:  currentEntry?.leagueName ?? league?.name ?? null,
        state:       currentEntry?.state ?? club?.state?.code ?? null,
        rank,
        previousRank: currentEntry?.previousRank ?? null,
        rankMovement: currentEntry?.rankMovement ?? 0,
        powerRating: currentEntry?.powerRating ?? null,
        ranked:      !!currentEntry,
        qualified:   rank != null && rank <= QUALIFY_CUTOFF,
        qualifyCutoff: QUALIFY_CUTOFF,
        record:      { wins: cls?.wins ?? 0, losses: cls?.losses ?? 0, draws: cls?.draws ?? 0, played: cls?.played ?? 0 },
        goalsFor:    cls?.goalsFor ?? 0,
        goalsAgainst: cls?.goalsAgainst ?? 0,
        percentage:  cls?.percentage ?? 0,
        ladderPosition: cls?.position ?? null,
        leagueStrengthScore: league?.strengthScore ?? null,
        leagueStrengthTier:  league?.strengthTier ?? null,
        recentForm:  currentEntry ? JSON.parse(currentEntry.recentForm as string ?? '[]') : [],
        componentScores: currentEntry ? JSON.parse(currentEntry.componentScores as string ?? '{}') : {},
        weekLabel:   currentEntry?.rankingRun.weekLabel ?? null,
        season:      season ?? cls?.season ?? null,
        history:     history.map(h => ({ weekLabel: h.rankingRun.weekLabel, rank: h.rank, powerRating: h.powerRating, date: h.rankingRun.completedAt })),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/history/:clubId
router.get('/history/:clubId', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const { clubId }  = req.params
    const { season }  = req.query as Record<string, string>
    const limit       = Math.min(parseInt(String(req.query.limit), 10) || 52, 52)

    const history = await prisma.rankingEntry.findMany({
      where: {
        clubId,
        ...(season ? { rankingRun: { season } } : {}),
      },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      take:    limit,
      include: { rankingRun: { select: { weekLabel: true, season: true, completedAt: true } } },
    })

    if (history.length === 0) return res.status(404).json({ error: 'No history found for this club' })

    res.json({
      data: history.map(h => ({
        weekLabel:   h.rankingRun.weekLabel,
        season:      h.rankingRun.season,
        rank:        h.rank,
        powerRating: h.powerRating,
        rankMovement: h.rankMovement,
        date:        h.rankingRun.completedAt,
      })),
      meta: { clubId, total: history.length },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as clubsRouter }
