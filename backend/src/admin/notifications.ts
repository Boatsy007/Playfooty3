/**
 * Admin notifications endpoints (Phase B9) — mounted at /admin/notifications.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected controls: run the automation scan, seed rules, read summary +
 * rules + automation-run history, mark delivered. Additive; no existing route
 * modified.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runNotificationEngine } from '../notifications/index.js'
import { seedNotificationRules, markDelivered } from '../notifications/notify.js'
import { notificationSummary } from '../notifications/reports.js'

const router = Router()
router.use(requireAdminKey)

router.post('/scan', async (req, res) => {
  const b = (req.body ?? {}) as { seed?: boolean; sections?: string[] }
  try { res.json({ data: await runNotificationEngine({ seed: b.seed, sections: b.sections }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'scan failed' }) }
})

router.post('/seed', async (_req, res) => { res.json({ data: await seedNotificationRules() }) })
router.get('/summary', async (_req, res) => { res.json({ data: await notificationSummary() }) })
router.get('/rules', async (_req, res) => { res.json({ data: await prisma.notificationRule.findMany({ orderBy: { type: 'asc' } }) }) })

// Enable/disable a rule (mute a whole notification type).
router.patch('/rules/:type', async (req, res) => {
  const b = (req.body ?? {}) as { enabled?: boolean; defaultChannels?: string[] }
  const rule = await prisma.notificationRule.update({ where: { type: req.params.type }, data: { ...(b.enabled != null ? { enabled: b.enabled } : {}), ...(b.defaultChannels ? { defaultChannels: JSON.stringify(b.defaultChannels) } : {}) } }).catch(() => null)
  if (!rule) return res.status(404).json({ error: 'rule not found' })
  res.json({ data: rule })
})

router.get('/runs', async (_req, res) => { res.json({ data: await prisma.automationRun.findMany({ orderBy: { ranAt: 'desc' }, take: 100 }) }) })

router.post('/deliver', async (req, res) => {
  const b = (req.body ?? {}) as { ids?: string[] }
  if (!Array.isArray(b.ids)) return res.status(400).json({ error: 'ids[] required' })
  res.json({ data: await markDelivered(b.ids) })
})

export { router as adminNotificationsRouter }
