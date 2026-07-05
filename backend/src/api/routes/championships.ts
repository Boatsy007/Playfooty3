/**
 * Championships public API (Phase B7) — mounted at /api/championships.
 * ─────────────────────────────────────────────────────────────────────────────
 * GETs are public; write operations (generate/approve invitations, qualify) are
 * permission-gated via attachActor + requireAdminActor so only administrators
 * may act — permission-ready for future roles. Additive; no existing route
 * modified. Invitation history is permanent; nothing is hard-deleted.
 */

import { Router } from 'express'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { cachePublic } from '../middleware/cache-middleware.js'
import { attachActor, requireAdminActor, type AuthedRequest } from '../middleware/permissions.js'
import { computeQualification } from '../../championship/qualification.js'
import { generateInvitations, createManualInvitation, respondInvitation } from '../../championship/invitations.js'
import { getWaitlist } from '../../championship/waitlist.js'
import { championshipReport } from '../../championship/reports.js'
import { logger } from '../../utils/logger.js'

const router = Router()
router.use(attachActor)

// ── Public reads ──────────────────────────────────────────────────────────────
router.get('/', publicRateLimit, cachePublic(600), async (_req, res) => {
  const data = await prisma.championship.findMany({ where: { archivedAt: null }, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }] })
  res.json({ data })
})

router.get('/:id', publicRateLimit, cachePublic(300), async (req, res) => {
  const champ = await prisma.championship.findUnique({ where: { id: String(req.params.id) } })
  if (!champ || champ.archivedAt) return res.status(404).json({ error: 'championship not found' })
  const [qualified, invitations, history] = await Promise.all([
    prisma.qualifiedClub.count({ where: { championshipId: champ.id, status: 'QUALIFIED' } }),
    prisma.championshipInvitation.count({ where: { championshipId: champ.id } }),
    prisma.championshipHistory.findUnique({ where: { championshipId: champ.id } }),
  ])
  res.json({ data: { ...champ, counts: { qualified, invitations }, history } })
})

router.get('/:id/qualified', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await prisma.qualifiedClub.findMany({ where: { championshipId: String(req.params.id), status: { in: ['QUALIFIED', 'REPLACEMENT'] } }, orderBy: { order: 'asc' } }) })
})

router.get('/:id/waitlist', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getWaitlist(String(req.params.id)) })
})

router.get('/:id/invitations', publicRateLimit, cachePublic(120), async (req, res) => {
  res.json({ data: await prisma.championshipInvitation.findMany({ where: { championshipId: String(req.params.id) }, orderBy: { invitedAt: 'desc' } }) })
})

router.get('/:id/reports', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await championshipReport(String(req.params.id)) })
})

router.get('/:id/history', publicRateLimit, cachePublic(3600), async (req, res) => {
  const h = await prisma.championshipHistory.findUnique({ where: { championshipId: String(req.params.id) } })
  if (!h) return res.status(404).json({ error: 'no recorded history for this championship' })
  res.json({ data: h })
})

// ── Admin-gated writes (permission-ready) ─────────────────────────────────────
// Run qualification (freezes an immutable snapshot).
router.post('/:id/qualify', requireAdminActor, async (req, res) => {
  try { res.json({ data: await computeQualification(String(req.params.id), { generatedBy: 'admin' }) }) }
  catch (err) { logger.error('POST qualify', { detail: String(err) }); res.status(500).json({ error: 'qualification failed' }) }
})

// Generate invitations for all qualified, OR one manual invitation { clubId, type }.
router.post('/:id/invitations', requireAdminActor, async (req: AuthedRequest, res) => {
  const b = (req.body ?? {}) as { clubId?: string; type?: 'WILDCARD' | 'HOST' | 'MANUAL' | 'REPLACEMENT'; notes?: string }
  try {
    if (b.clubId) {
      const r = await createManualInvitation(String(req.params.id), b.clubId, b.type ?? 'MANUAL', { invitedBy: 'admin', notes: b.notes })
      return res.status(r.ok ? 201 : 400).json(r.ok ? { data: r.invitation } : { error: r.error })
    }
    res.json({ data: await generateInvitations(String(req.params.id), { invitedBy: 'admin' }) })
  } catch (err) { logger.error('POST invitations', { detail: String(err) }); res.status(500).json({ error: 'invitation failed' }) }
})

// Respond to an invitation (accept/decline/withdraw/expire) — permanent record.
router.patch('/:id/invitations/:invitationId', requireAdminActor, async (req, res) => {
  const { status, reason } = (req.body ?? {}) as { status?: 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED'; reason?: string }
  if (!status || !['ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'].includes(status)) return res.status(400).json({ error: 'status must be ACCEPTED|DECLINED|WITHDRAWN|EXPIRED' })
  const r = await respondInvitation(String(req.params.invitationId), status, { reason, performedBy: 'admin' })
  res.status(r.status).json(r.ok ? { data: { invitation: r.invitation, promoted: r.promoted } } : { error: r.error })
})

export { router as championshipsRouter }
