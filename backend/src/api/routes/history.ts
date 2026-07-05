/**
 * Historical Rankings & Records public API (Phase B6) — additive, read-only.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/history BEFORE the legacy /api/history/:clubId delegation.
 * It only defines multi-segment paths (/clubs/:id, /leagues/:id, /weeks,
 * /records, /compare, /timeline/...), so a bare /api/history/:clubId request
 * falls through untouched to the existing club-history handler.
 */

import { Router } from 'express'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { cachePublic } from '../middleware/cache-middleware.js'
import { clubTimeline, leagueTimeline, listWeeks, weekBoard } from '../../history/timeline.js'
import { compareClubs, compareLeagues, compareWeeks, compareSeasons, compareToPeak } from '../../history/comparison.js'
import { logger } from '../../utils/logger.js'

const router = Router()

// Club career history + timeline.
router.get('/clubs/:id', publicRateLimit, cachePublic(1800), async (req, res) => {
  try {
    const id = String(req.params.id)
    const [history, timeline] = await Promise.all([prisma.clubHistory.findUnique({ where: { clubId: id } }), clubTimeline(id)])
    if (!history && timeline.weekly.length === 0) return res.status(404).json({ error: 'no history for this club' })
    res.json({ data: { ...history, timeline: timeline.weekly, seasonTrend: timeline.seasonTrend } })
  } catch (err) { logger.error('GET /history/clubs/:id', { detail: String(err) }); res.status(500).json({ error: 'failed' }) }
})

// League history + timeline.
router.get('/leagues/:id', publicRateLimit, cachePublic(1800), async (req, res) => {
  const id = String(req.params.id)
  const [history, timeline] = await Promise.all([prisma.leagueHistory.findUnique({ where: { leagueId: id } }), leagueTimeline(id)])
  if (!history && timeline.weekly.length === 0) return res.status(404).json({ error: 'no history for this league' })
  res.json({ data: { ...history, timeline: timeline.weekly } })
})

// Week browser + a single archived week board.
router.get('/weeks', publicRateLimit, cachePublic(1800), async (req, res) => {
  res.json({ data: await listWeeks(req.query.season as string | undefined) })
})
router.get('/weeks/:weekLabel', publicRateLimit, cachePublic(3600), async (req, res) => {
  const board = await weekBoard(String(req.params.weekLabel))
  if (board.length === 0) return res.status(404).json({ error: 'no archived rankings for this week' })
  res.json({ data: board, meta: { weekLabel: req.params.weekLabel, total: board.length } })
})

// Record book.
router.get('/records', publicRateLimit, cachePublic(1800), async (_req, res) => {
  res.json({ data: await prisma.recordBookEntry.findMany({ orderBy: { title: 'asc' } }) })
})

// Timelines (explicit).
router.get('/timeline/club/:id', publicRateLimit, cachePublic(1800), async (req, res) => { res.json({ data: await clubTimeline(String(req.params.id)) }) })
router.get('/timeline/league/:id', publicRateLimit, cachePublic(1800), async (req, res) => { res.json({ data: await leagueTimeline(String(req.params.id)) }) })

// Comparison engine — /api/history/compare?type=club&a=..&b=..
router.get('/compare', publicRateLimit, cachePublic(600), async (req, res) => {
  const { type, a, b } = req.query as Record<string, string>
  try {
    switch (type) {
      case 'club': if (!a || !b) return res.status(400).json({ error: 'a and b required' }); return res.json({ data: await compareClubs(a, b) })
      case 'league': if (!a || !b) return res.status(400).json({ error: 'a and b required' }); return res.json({ data: await compareLeagues(a, b) })
      case 'week': if (!a) return res.status(400).json({ error: 'a (clubId) required' }); return res.json({ data: await compareWeeks(a) })
      case 'season': if (!a) return res.status(400).json({ error: 'a (clubId) required' }); return res.json({ data: await compareSeasons(a) })
      case 'peak': if (!a) return res.status(400).json({ error: 'a (clubId) required' }); return res.json({ data: await compareToPeak(a) })
      default: return res.status(400).json({ error: 'type must be club|league|week|season|peak' })
    }
  } catch (err) { logger.error('GET /history/compare', { detail: String(err) }); res.status(500).json({ error: 'compare failed' }) }
})

export { router as historyRouter }
