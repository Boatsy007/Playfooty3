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
      ...(state ? { state } : {}),
    },
    orderBy: { rank: 'asc' },
    ...(limit ? { take: limit } : {}),
  })
}

/** Shape a ranking entry for public API response. */
function formatEntry(entry: Awaited<ReturnType<typeof getEntries>>[number]) {
  return {
    rank:         entry.rank,
    previousRank: entry.previousRank,
    rankMovement: entry.rankMovement,
    clubId:       entry.clubId,
    clubName:     entry.clubName,
    leagueName:   entry.leagueName,
    state:        entry.state,
    powerRating:  entry.powerRating,
    recentForm:   JSON.parse(entry.recentForm as string ?? '[]'),
    componentScores: JSON.parse(entry.componentScores as string ?? '{}'),
    calculatedAt: entry.calculatedAt,
  }
}

// GET /api/rankings
router.get('/', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { season, state } = req.query as Record<string, string>
    const run = await getLatestRun(season)
    if (!run) { res.json({ data: [], meta: { weekLabel: null, season: null, total: 0 } }); return }

    const entries = await getEntries(run.id, undefined, state)
    res.json({
      data: entries.map(formatEntry),
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
      data: entries.map(formatEntry),
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
    res.json({ data: entries.map(formatEntry), meta: { weekLabel: run.weekLabel, season: run.season } })
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
    res.json({ data: entries.map(formatEntry), meta: { weekLabel: run.weekLabel, season: run.season } })
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
    res.json({ data: entries.map(formatEntry), meta: { weekLabel: run.weekLabel, season: run.season } })
  } catch (err) {
    logger.error('Rankings route error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

export { router as rankingsRouter }
