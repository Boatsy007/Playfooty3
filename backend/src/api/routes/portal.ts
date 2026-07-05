/**
 * Club portal API (Phase B2) — mounted at /api/portal.
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-service, permission-gated club management. Additive; does NOT touch the
 * existing /api/clubs routes. Every endpoint runs through attachActor + a
 * capability check (requireCap) so future roles plug in without code changes.
 *
 *   POST /api/portal/clubs/:id/claim     submit a claim for this club (public, rate-limited)
 *   POST /api/portal/clubs/:id/invite    invite an admin/editor/contributor (club:invite)
 *   GET  /api/portal/clubs/:id/audit     field-level change history (club:manage)
 *   GET  /api/portal/clubs/:id/media     media library for this club (club:view)
 *   POST /api/portal/clubs/:id/media     add a media reference (club:media)
 *   GET  /api/portal/clubs/:id/sponsors  sponsors for this club (club:view)
 *   POST /api/portal/clubs/:id/sponsors  add a sponsor (club:sponsors)
 *   GET  /api/portal/clubs/:id/members   list club members (club:manage)
 */

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { attachActor, requireCap, type AuthedRequest } from '../middleware/permissions.js'
import { submitClubClaim, isValidEmail } from '../../services/claims.service.js'
import { logChanges, actorFromRequest } from '../../services/change-log.service.js'
import { logger } from '../../utils/logger.js'

const router = Router()
router.use(attachActor)

const INVITE_ROLES = ['ADMINISTRATOR', 'EDITOR', 'CONTRIBUTOR']
const MEDIA_KINDS  = ['IMAGE', 'VIDEO', 'DOCUMENT', 'HERO', 'GALLERY', 'SPONSOR', 'PDF']

// ── Claim (public, rate-limited) ──────────────────────────────────────────────
router.post('/clubs/:id/claim', publicRateLimit, async (req, res) => {
  try {
    const r = await submitClubClaim({ ...(req.body ?? {}), clubId: String(req.params.id) })
    res.status(r.status).json(r.ok ? { data: { id: r.claimId, status: 'PENDING' } } : { error: r.error })
  } catch (err) { logger.error('POST portal claim', { detail: String(err) }); res.status(500).json({ error: 'claim failed' }) }
})

// ── Invitations ───────────────────────────────────────────────────────────────
router.post('/clubs/:id/invite', requireCap('club:invite'), async (req: AuthedRequest, res) => {
  const { email, role } = (req.body ?? {}) as { email?: string; role?: string }
  const wantRole = (role ?? 'CONTRIBUTOR').toUpperCase()
  if (!email || !isValidEmail(email.trim().toLowerCase())) return res.status(400).json({ error: 'valid email required' })
  if (!INVITE_ROLES.includes(wantRole)) return res.status(400).json({ error: `role must be one of ${INVITE_ROLES.join('|')}` })
  const normEmail = email.trim().toLowerCase()

  // Prevent duplicate pending invite for the same club+email.
  const dup = await prisma.clubInvitation.findFirst({ where: { clubId: String(req.params.id), email: normEmail, status: 'PENDING', deletedAt: null } })
  if (dup) return res.status(409).json({ error: 'a pending invitation already exists for this email' })

  const invite = await prisma.clubInvitation.create({
    data: {
      clubId: String(req.params.id), email: normEmail, role: wantRole,
      token: randomUUID(), status: 'PENDING', invitedBy: req.actor?.userId ?? null,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  })
  await prisma.platformNotification.create({ data: { userId: null, type: 'ADMIN_INVITED', title: `Invitation sent to ${normEmail}`, entityType: 'ClubInvitation', entityId: invite.id } }).catch(() => {})
  res.status(201).json({ data: { id: invite.id, email: invite.email, role: invite.role, status: invite.status, expiresAt: invite.expiresAt } })
})

// ── Audit (field-level change history) ────────────────────────────────────────
router.get('/clubs/:id/audit', requireCap('club:manage'), async (req, res) => {
  const logs = await prisma.profileChangeLog.findMany({
    where: { entityType: 'Club', entityId: String(req.params.id) },
    orderBy: { createdAt: 'desc' }, take: 300,
  })
  res.json({ data: logs })
})

// ── Media library ─────────────────────────────────────────────────────────────
router.get('/clubs/:id/media', requireCap('club:view'), async (req, res) => {
  const media = await prisma.mediaAsset.findMany({
    where: { clubId: String(req.params.id), deletedAt: null },
    orderBy: [{ kind: 'asc' }, { displayOrder: 'asc' }],
  })
  res.json({ data: media })
})

router.post('/clubs/:id/media', requireCap('club:media'), async (req: AuthedRequest, res) => {
  const b = (req.body ?? {}) as { kind?: string; url?: string; title?: string; mimeType?: string; displayOrder?: number }
  const kind = (b.kind ?? '').toUpperCase()
  if (!b.url || typeof b.url !== 'string') return res.status(400).json({ error: 'url required' })
  if (!MEDIA_KINDS.includes(kind)) return res.status(400).json({ error: `kind must be one of ${MEDIA_KINDS.join('|')}` })
  const asset = await prisma.mediaAsset.create({
    data: { scope: 'CLUB', clubId: String(req.params.id), kind, url: b.url, title: b.title ?? null, mimeType: b.mimeType ?? null, displayOrder: b.displayOrder ?? 0, uploadedBy: req.actor?.userId ?? null },
  })
  await logChanges('Club', String(req.params.id), {}, { [`media:${asset.id}`]: asset.url }, actorFromRequest(req, { actorType: req.actor?.isAdmin ? 'ADMIN' : 'USER', actorId: req.actor?.userId ?? null }))
  res.status(201).json({ data: asset })
})

// ── Sponsors ──────────────────────────────────────────────────────────────────
router.get('/clubs/:id/sponsors', requireCap('club:view'), async (req, res) => {
  const sponsors = await prisma.sponsor.findMany({
    where: { clubId: String(req.params.id), deletedAt: null },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  })
  res.json({ data: sponsors })
})

router.post('/clubs/:id/sponsors', requireCap('club:sponsors'), async (req: AuthedRequest, res) => {
  const b = (req.body ?? {}) as { name?: string; websiteUrl?: string; logoUrl?: string; description?: string; tier?: string; startDate?: string; endDate?: string; displayOrder?: number }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const sponsor = await prisma.sponsor.create({
    data: {
      scope: 'CLUB', clubId: String(req.params.id), name: b.name,
      websiteUrl: b.websiteUrl ?? null, logoUrl: b.logoUrl ?? null, description: b.description ?? null, tier: b.tier ?? null,
      startDate: b.startDate ? new Date(b.startDate) : null, endDate: b.endDate ? new Date(b.endDate) : null,
      displayOrder: b.displayOrder ?? 0,
    },
  })
  await logChanges('Club', String(req.params.id), {}, { [`sponsor:${sponsor.id}`]: sponsor.name }, actorFromRequest(req, { actorType: req.actor?.isAdmin ? 'ADMIN' : 'USER', actorId: req.actor?.userId ?? null }))
  res.status(201).json({ data: sponsor })
})

// ── Members ───────────────────────────────────────────────────────────────────
router.get('/clubs/:id/members', requireCap('club:manage'), async (req, res) => {
  const members = await prisma.clubMembership.findMany({ where: { clubId: String(req.params.id), deletedAt: null }, orderBy: { createdAt: 'asc' } })
  res.json({ data: members })
})

export { router as portalRouter }
