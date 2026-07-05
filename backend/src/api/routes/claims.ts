/**
 * Claims API (Phase B2) — mounted at /api/claims.
 * ─────────────────────────────────────────────────────────────────────────────
 * Public (rate-limited) claim submission + admin review. Additive; no existing
 * route is touched. Admin operations flow through the actor/permission model
 * (attachActor + requireAdminActor) rather than a hardcoded key check.
 *
 *   POST  /api/claims/club     submit a club claim   (public, rate-limited)
 *   POST  /api/claims/league   submit a league claim (public, rate-limited)
 *   GET   /api/claims          list claims           (admin)
 *   PATCH /api/claims/:id      review a claim         (admin)  { type, action, notes }
 */

import { Router } from 'express'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { attachActor, requireAdminActor, type AuthedRequest } from '../middleware/permissions.js'
import { submitClubClaim, submitLeagueClaim, reviewClubClaim, reviewLeagueClaim } from '../../services/claims.service.js'
import { logger } from '../../utils/logger.js'

const router = Router()

// ── Public submission (rate-limited) ──────────────────────────────────────────
router.post('/club', publicRateLimit, async (req, res) => {
  try {
    const r = await submitClubClaim(req.body ?? {})
    res.status(r.status).json(r.ok ? { data: { id: r.claimId, status: 'PENDING' } } : { error: r.error })
  } catch (err) { logger.error('POST /claims/club', { detail: String(err) }); res.status(500).json({ error: 'claim failed' }) }
})

router.post('/league', publicRateLimit, async (req, res) => {
  try {
    const r = await submitLeagueClaim(req.body ?? {})
    res.status(r.status).json(r.ok ? { data: { id: r.claimId, status: 'PENDING' } } : { error: r.error })
  } catch (err) { logger.error('POST /claims/league', { detail: String(err) }); res.status(500).json({ error: 'claim failed' }) }
})

// ── Admin review surface ──────────────────────────────────────────────────────
router.get('/', attachActor, requireAdminActor, async (req, res) => {
  const status = (req.query.status as string) ?? 'PENDING'
  const type = (req.query.type as string) ?? 'all'
  const where = { ...(status === 'ALL' ? {} : { status }), deletedAt: null }
  const [clubClaims, leagueClaims] = await Promise.all([
    type === 'league' ? [] : prisma.clubClaim.findMany({ where, orderBy: { submittedAt: 'desc' }, take: 200 }),
    type === 'club'   ? [] : prisma.leagueClaim.findMany({ where, orderBy: { submittedAt: 'desc' }, take: 200 }),
  ])
  res.json({ data: { clubClaims, leagueClaims }, meta: { status, type } })
})

router.patch('/:id', attachActor, requireAdminActor, async (req: AuthedRequest, res) => {
  const { type, action, notes } = (req.body ?? {}) as { type?: 'club' | 'league'; action?: 'VERIFIED' | 'REJECTED'; notes?: string }
  if (!type || !['club', 'league'].includes(type)) return res.status(400).json({ error: 'type must be club|league' })
  if (!action || !['VERIFIED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'action must be VERIFIED|REJECTED' })
  const reviewer = req.actor?.userId ?? 'admin'
  try {
    const r = type === 'club'
      ? await reviewClubClaim(String(req.params.id), action, reviewer, notes)
      : await reviewLeagueClaim(String(req.params.id), action, reviewer, notes)
    res.status(r.status).json(r.ok ? { data: { id: r.claimId, status: action } } : { error: r.error })
  } catch (err) { logger.error('PATCH /claims/:id', { detail: String(err) }); res.status(500).json({ error: 'review failed' }) }
})

export { router as claimsRouter }
