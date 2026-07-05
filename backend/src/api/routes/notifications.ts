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
import { markRead, notify } from '../../notifications/notify.js'
import { generateDigest } from '../../notifications/digests.js'
import { CHANNELS, DIGEST_KINDS, VALID_TYPES, type DigestKind } from '../../notifications/types.js'
import { randomUUID } from 'crypto'

const router = Router()
router.use(attachActor)

// List notifications for a recipient (or all, admin).
router.get('/', publicRateLimit, async (req, res) => {
  const { scope, recipientId, type, category, status, unread } = req.query as Record<string, string>
  res.json({ data: await listNotifications({ recipientScope: scope, recipientId, type, category, status, unreadOnly: unread === 'true' }) })
})

// ── Preferences (query/body based, per the B9 API spec) ───────────────────────
router.get('/preferences', publicRateLimit, async (req, res) => {
  const { scope, recipientId } = req.query as Record<string, string>
  if (!scope || !recipientId) return res.status(400).json({ error: 'scope and recipientId required' })
  res.json({ data: await prisma.notificationPreference.findMany({ where: { recipientScope: scope.toUpperCase(), recipientId } }) })
})

router.patch('/preferences', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { scope?: string; recipientId?: string; type?: string; channel?: string; enabled?: boolean; clubId?: string; leagueId?: string; state?: string; frequency?: string }
  if (!b.scope || !b.recipientId || !b.type) return res.status(400).json({ error: 'scope, recipientId and type required' })
  const channel = (b.channel ?? 'IN_APP').toUpperCase()
  if (!(CHANNELS as readonly string[]).includes(channel)) return res.status(400).json({ error: `channel must be one of ${CHANNELS.join('|')}` })
  const pref = await prisma.notificationPreference.upsert({
    where: { recipientScope_recipientId_type_channel: { recipientScope: b.scope.toUpperCase(), recipientId: b.recipientId, type: b.type, channel } },
    create: { recipientScope: b.scope.toUpperCase(), recipientId: b.recipientId, type: b.type, channel, enabled: b.enabled ?? true, clubId: b.clubId ?? null, leagueId: b.leagueId ?? null, state: b.state ?? null, frequency: (b.frequency ?? 'INSTANT').toUpperCase() },
    update: { enabled: b.enabled ?? true, clubId: b.clubId ?? null, leagueId: b.leagueId ?? null, state: b.state ?? null, ...(b.frequency ? { frequency: b.frequency.toUpperCase() } : {}) },
  })
  res.json({ data: pref })
})

// ── Test emit (admin) — verifies the pipeline without external transport ──────
router.post('/test', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { type?: string; recipientScope?: string; recipientId?: string; title?: string }
  const type = b.type && VALID_TYPES.has(b.type) ? b.type : 'RANKINGS_UPDATED'
  const r = await notify({ type, recipientScope: b.recipientScope, recipientId: b.recipientId, title: b.title ?? `Test notification (${type})`, body: 'This is a test notification.', dedupeKey: `test:${randomUUID()}`, data: { test: true } })
  res.status(201).json({ data: r })
})

// ── Digest (admin) — dry-run by default; never dispatches ─────────────────────
router.post('/digest', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { kind?: string; dryRun?: boolean; recipientScope?: string; recipientId?: string }
  const kind = (b.kind ?? 'DAILY_ADMIN').toUpperCase()
  if (!(DIGEST_KINDS as readonly string[]).includes(kind)) return res.status(400).json({ error: `kind must be one of ${DIGEST_KINDS.join('|')}` })
  res.json({ data: await generateDigest(kind as DigestKind, { dryRun: b.dryRun !== false, recipientScope: b.recipientScope, recipientId: b.recipientId }) })
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
