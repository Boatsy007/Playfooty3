/**
 * Notifications public API (Phase B9) — additive.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/notifications. Reads a recipient's notifications + preferences;
 * marking read and setting preferences are permission-gated via attachActor +
 * requireAdminActor (permission-ready). No existing route modified.
 */

import { Router } from 'express'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { attachActor, requireAdminActor } from '../middleware/permissions.js'
import { listNotifications } from '../../notifications/reports.js'
import { markRead } from '../../notifications/notify.js'

const router = Router()
router.use(attachActor)

// List notifications for a recipient (or all, admin).
router.get('/', publicRateLimit, async (req, res) => {
  const { scope, recipientId, type, category, status, unread } = req.query as Record<string, string>
  res.json({ data: await listNotifications({ recipientScope: scope, recipientId, type, category, status, unreadOnly: unread === 'true' }) })
})

// Mark a single notification read.
router.patch('/:id/read', requireAdminActor, async (req, res) => {
  const n = await markRead(String(req.params.id))
  if (!n) return res.status(404).json({ error: 'notification not found' })
  res.json({ data: n })
})

// Read a recipient's preferences.
router.get('/preferences/:scope/:recipientId', publicRateLimit, async (req, res) => {
  res.json({ data: await prisma.notificationPreference.findMany({ where: { recipientScope: String(req.params.scope).toUpperCase(), recipientId: String(req.params.recipientId) } }) })
})

// Set a preference (opt-in/out) for a type + channel.
router.post('/preferences/:scope/:recipientId', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { type?: string; channel?: string; enabled?: boolean }
  if (!b.type) return res.status(400).json({ error: 'type required' })
  const scope = String(req.params.scope).toUpperCase()
  const channel = (b.channel ?? 'IN_APP').toUpperCase()
  const pref = await prisma.notificationPreference.upsert({
    where: { recipientScope_recipientId_type_channel: { recipientScope: scope, recipientId: String(req.params.recipientId), type: b.type, channel } },
    create: { recipientScope: scope, recipientId: String(req.params.recipientId), type: b.type, channel, enabled: b.enabled ?? true },
    update: { enabled: b.enabled ?? true },
  })
  res.json({ data: pref })
})

export { router as notificationsRouter }
