/**
 * Admin newsroom endpoints (Phase B3) — mounted at /admin/newsroom.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected controls + read access for the intelligence layer. Additive; no
 * existing route touched. Article DRAFTS still flow through the normal AI
 * Publishing review/approve/publish surface — this only generates + inspects.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runNewsroom } from '../newsroom/index.js'
import { analyseWeek } from '../newsroom/analysis.js'
import { getEditorialCalendar } from '../newsroom/calendar.js'
import { rebuildSearchIndex } from '../newsroom/search.js'

const router = Router()
router.use(requireAdminKey)

// Run the newsroom (dryRun/force/reindex via body).
router.post('/run', async (req, res) => {
  const b = (req.body ?? {}) as { force?: boolean; dryRun?: boolean; reindex?: boolean }
  try {
    const report = await runNewsroom({ force: b.force, dryRun: b.dryRun, reindex: b.reindex })
    res.json({ data: report })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'newsroom run failed' }) }
})

// Inspect the derived analysis without writing anything.
router.get('/analysis', async (_req, res) => {
  const a = await analyseWeek()
  if (!a) return res.status(404).json({ error: 'no completed ranking run' })
  res.json({ data: a })
})

// Signals for a week (default the latest).
router.get('/signals', async (req, res) => {
  const week = req.query.week as string | undefined
  const where = week ? { weekLabel: week } : {}
  const signals = await prisma.newsSignal.findMany({ where, orderBy: [{ weekLabel: 'desc' }, { priority: 'desc' }], take: 300 })
  res.json({ data: signals })
})

// Trend leaderboards.
router.get('/trends', async (req, res) => {
  const kind = (req.query.kind as string) ?? 'rising'
  const orderBy = kind === 'falling' ? { rank4wkDelta: 'asc' as const }
    : kind === 'volatile' ? { volatility: 'desc' as const }
    : kind === 'consistent' ? { volatility: 'asc' as const }
    : { rank4wkDelta: 'desc' as const }
  const where = kind === 'rising' ? { isRising: true } : kind === 'falling' ? { isFalling: true } : {}
  const trends = await prisma.clubTrend.findMany({ where, orderBy, take: 50 })
  res.json({ data: trends, meta: { kind } })
})

router.get('/calendar', async (_req, res) => { res.json({ data: await getEditorialCalendar() }) })

router.post('/reindex', async (_req, res) => {
  try { res.json({ data: await rebuildSearchIndex() }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'reindex failed' }) }
})

// Basic search over the backend index (supports future frontend).
router.get('/search', async (req, res) => {
  const q = ((req.query.q as string) ?? '').trim()
  if (q.length < 2) return res.json({ data: [] })
  const docs = await prisma.searchDoc.findMany({
    where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }] },
    orderBy: { weight: 'desc' }, take: 50,
  })
  res.json({ data: docs })
})

export { router as adminNewsroomRouter }
