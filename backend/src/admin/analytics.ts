/**
 * Admin analytics endpoints (Phase B11) — mounted at /admin/analytics.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected: run the aggregation job, retention purge, and inspect run
 * history / recent raw events. Additive; no existing route modified.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runAnalyticsEngine, purgeOldRawData } from '../analytics/index.js'

const router = Router()
router.use(requireAdminKey)

router.post('/aggregate', async (_req, res) => {
  try { res.json({ data: await runAnalyticsEngine() }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'aggregation failed' }) }
})

router.post('/purge', async (req, res) => {
  const days = Number((req.body as { days?: number })?.days ?? 0)
  res.json({ data: await purgeOldRawData(days) })
})

router.get('/runs', async (_req, res) => { res.json({ data: await prisma.analyticsRun.findMany({ orderBy: { ranAt: 'desc' }, take: 100 }) }) })

router.get('/events/recent', async (req, res) => {
  const type = req.query.type as string | undefined
  const events = await prisma.analyticsEvent.findMany({ where: type ? { eventType: type } : {}, orderBy: { createdAt: 'desc' }, take: 200 })
  res.json({ data: events })
})

router.get('/daily', async (_req, res) => { res.json({ data: await prisma.analyticsDaily.findMany({ orderBy: { day: 'desc' }, take: 90 }) }) })

export { router as adminAnalyticsRouter }
