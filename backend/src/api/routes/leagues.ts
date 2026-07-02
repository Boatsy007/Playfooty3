/**
 * Leagues API Routes
 * GET /api/leagues         — all leagues with latest club counts
 * GET /api/leagues/:id     — single league detail
 */

import { Router }          from 'express'
import { prisma }          from '../../db/client.js'
import { cachePublic }     from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// GET /api/leagues
router.get('/', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>

    const leagues = await prisma.league.findMany({
      where: {
        isActive: true,
        ...(state ? { state: { code: state } } : {}),
      },
      include: {
        state:   { select: { code: true, name: true } },
        sources: { where: { isActive: true }, select: { sourceType: true } },
        _count:  { select: { clubSeasons: true } },
      },
      orderBy: [{ state: { name: 'asc' } }, { name: 'asc' }],
    })

    res.json({
      data: leagues.map(l => ({
        id:             l.id,
        name:           l.name,
        state:          l.state.code,
        stateName:      l.state.name,
        strengthScore:  l.strengthScore,
        sourceTypes:    l.sources.map(s => s.sourceType),
        clubCount:      l._count.clubSeasons,
      })),
      meta: { total: leagues.length },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/leagues/:id
router.get('/:id', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const league = await prisma.league.findUnique({
      where:   { id: req.params.id },
      include: {
        state:   true,
        sources: true,
        association: { select: { name: true } },
      },
    })

    if (!league) return res.status(404).json({ error: 'League not found' })

    res.json({
      data: {
        id:            league.id,
        name:          league.name,
        state:         league.state.code,
        association:   league.association?.name,
        strengthScore: league.strengthScore,
        sources:       league.sources.map(s => ({
          sourceType:  s.sourceType,
          ladderUrl:   s.ladderUrl,
          fixturesUrl: s.fixturesUrl,
          isActive:    s.isActive,
          lastScraped: s.lastScrapedAt,
        })),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as leaguesRouter }
