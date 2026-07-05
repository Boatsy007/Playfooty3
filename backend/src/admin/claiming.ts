/**
 * Admin claiming / profile management (Phase B2) — mounted at /admin/claiming.
 * ─────────────────────────────────────────────────────────────────────────────
 * Internal admin surface for the claiming platform: edit club/league profiles
 * (with field-level change logging), toggle verification & feature flags, and
 * read notifications / users. Key-protected (requireAdminKey) — additive; no
 * existing admin route is modified.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { logChanges, actorFromRequest } from '../services/change-log.service.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminKey)

// Editable profile fields (whitelist — never lets a request set verification /
// billing / flags through the generic profile PATCH).
const CLUB_PROFILE_FIELDS = [
  'ground', 'address', 'googleMapsUrl', 'websiteUrl', 'facebookUrl', 'instagramUrl', 'tiktokUrl', 'youtubeUrl',
  'email', 'phone', 'trainingNights', 'homeCourt', 'clubColours', 'history', 'foundedYear',
  'committee', 'president', 'secretary', 'coach', 'assistantCoach',
  'uniformPhotos', 'gallery', 'partnerLogos', 'membershipLink', 'volunteerLink',
] as const
const LEAGUE_PROFILE_FIELDS = [
  'history', 'headOffice', 'websiteUrl', 'facebookUrl', 'instagramUrl', 'tiktokUrl', 'youtubeUrl',
  'committee', 'president', 'secretary', 'operationsManager', 'logoUrl', 'heroImageUrl', 'contactEmail', 'phone', 'region',
] as const
const FLAG_FIELDS = ['premium', 'featured', 'hidden', 'suspended', 'archived', 'imported', 'playhqManaged', 'manualOverride'] as const

function pick<T extends readonly string[]>(body: Record<string, unknown>, allowed: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allowed) if (k in body && body[k] !== undefined) out[k] = body[k]
  return out
}

// ── Club profile ──────────────────────────────────────────────────────────────
router.get('/profiles/club/:clubId', async (req, res) => {
  const profile = await prisma.clubProfile.upsert({ where: { clubId: req.params.clubId }, create: { clubId: req.params.clubId }, update: {} })
  res.json({ data: profile })
})

router.patch('/profiles/club/:clubId', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const updates = pick(body, CLUB_PROFILE_FIELDS)
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no editable fields supplied' })
    const before = await prisma.clubProfile.upsert({ where: { clubId: req.params.clubId }, create: { clubId: req.params.clubId }, update: {} })
    const after = await prisma.clubProfile.update({ where: { clubId: req.params.clubId }, data: updates })
    const changed = await logChanges('Club', req.params.clubId, before, updates, actorFromRequest(req, { actorType: 'ADMIN', actorId: 'admin' }))
    res.json({ data: after, meta: { changed } })
  } catch (err) { logger.error('PATCH club profile', { detail: String(err) }); res.status(500).json({ error: 'update failed' }) }
})

// ── League profile ────────────────────────────────────────────────────────────
router.get('/profiles/league/:leagueId', async (req, res) => {
  const profile = await prisma.leagueProfile.upsert({ where: { leagueId: req.params.leagueId }, create: { leagueId: req.params.leagueId }, update: {} })
  res.json({ data: profile })
})

router.patch('/profiles/league/:leagueId', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const updates = pick(body, LEAGUE_PROFILE_FIELDS)
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no editable fields supplied' })
    const before = await prisma.leagueProfile.upsert({ where: { leagueId: req.params.leagueId }, create: { leagueId: req.params.leagueId }, update: {} })
    const after = await prisma.leagueProfile.update({ where: { leagueId: req.params.leagueId }, data: updates })
    const changed = await logChanges('League', req.params.leagueId, before, updates, actorFromRequest(req, { actorType: 'ADMIN', actorId: 'admin' }))
    res.json({ data: after, meta: { changed } })
  } catch (err) { logger.error('PATCH league profile', { detail: String(err) }); res.status(500).json({ error: 'update failed' }) }
})

// ── Verification + feature flags ──────────────────────────────────────────────
router.post('/verify/club/:clubId', async (req, res) => {
  const { verified, notes } = (req.body ?? {}) as { verified?: boolean; notes?: string }
  const v = verified !== false
  const profile = await prisma.clubProfile.upsert({
    where:  { clubId: req.params.clubId },
    create: { clubId: req.params.clubId, verified: v, verifiedAt: v ? new Date() : null, verifiedBy: 'admin', verificationNotes: notes ?? null },
    update: { verified: v, verifiedAt: v ? new Date() : null, verifiedBy: 'admin', verificationNotes: notes ?? null },
  })
  await logChanges('Club', req.params.clubId, {}, { verified: v }, actorFromRequest(req, { actorType: 'ADMIN', actorId: 'admin' }))
  res.json({ data: profile })
})

router.post('/verify/league/:leagueId', async (req, res) => {
  const { verified, notes } = (req.body ?? {}) as { verified?: boolean; notes?: string }
  const v = verified !== false
  const profile = await prisma.leagueProfile.upsert({
    where:  { leagueId: req.params.leagueId },
    create: { leagueId: req.params.leagueId, verified: v, verifiedAt: v ? new Date() : null, verifiedBy: 'admin', verificationNotes: notes ?? null },
    update: { verified: v, verifiedAt: v ? new Date() : null, verifiedBy: 'admin', verificationNotes: notes ?? null },
  })
  await logChanges('League', req.params.leagueId, {}, { verified: v }, actorFromRequest(req, { actorType: 'ADMIN', actorId: 'admin' }))
  res.json({ data: profile })
})

router.patch('/flags/club/:clubId', async (req, res) => {
  const updates = pick((req.body ?? {}) as Record<string, unknown>, FLAG_FIELDS)
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no flag fields supplied' })
  const before = await prisma.clubProfile.upsert({ where: { clubId: req.params.clubId }, create: { clubId: req.params.clubId }, update: {} })
  const after = await prisma.clubProfile.update({ where: { clubId: req.params.clubId }, data: updates })
  await logChanges('Club', req.params.clubId, before, updates, actorFromRequest(req, { actorType: 'ADMIN', actorId: 'admin' }))
  res.json({ data: after })
})

// ── Notifications + users (read) ──────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  const unreadOnly = req.query.unread === 'true'
  const items = await prisma.platformNotification.findMany({ where: unreadOnly ? { read: false } : {}, orderBy: { createdAt: 'desc' }, take: 200 })
  res.json({ data: items })
})

router.get('/users', async (_req, res) => {
  const users = await prisma.platformUser.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, email: true, name: true, phone: true, emailVerified: true, createdAt: true } })
  res.json({ data: users })
})

export { router as adminClaimingRouter }
