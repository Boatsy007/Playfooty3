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
router.get('/:id', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const clubId = req.params.id

    // Get current ranking
    const currentEntry = await prisma.rankingEntry.findFirst({
      where:   { clubId },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      include: { rankingRun: { select: { weekLabel: true, season: true, completedAt: true } } },
    })

    if (!currentEntry) return res.status(404).json({ error: 'Club not found' })

    // Get ranking history (last 12 weeks)
    const history = await prisma.rankingEntry.findMany({
      where:   { clubId },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      take:    12,
      include: { rankingRun: { select: { weekLabel: true, completedAt: true } } },
    })

    res.json({
      data: {
        clubId:      currentEntry.clubId,
        clubName:    currentEntry.clubName,
        leagueName:  currentEntry.leagueName,
        state:       currentEntry.state,
        rank:        currentEntry.rank,
        previousRank: currentEntry.previousRank,
        rankMovement: currentEntry.rankMovement,
        powerRating: currentEntry.powerRating,
        recentForm:  JSON.parse(currentEntry.recentForm as string ?? '[]'),
        componentScores: JSON.parse(currentEntry.componentScores as string ?? '{}'),
        weekLabel:   currentEntry.rankingRun.weekLabel,
        history:     history.map(h => ({
          weekLabel:   h.rankingRun.weekLabel,
          rank:        h.rank,
          powerRating: h.powerRating,
          date:        h.rankingRun.completedAt,
        })),
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
