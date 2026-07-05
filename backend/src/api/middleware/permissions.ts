/**
 * Role-based permission middleware (Phase B2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Future-ready authorization for the claiming platform. Every self-service
 * endpoint runs through here rather than hardcoding an admin check, so new roles
 * plug in cleanly. Until end-user auth ships, the actor is resolved from headers:
 *
 *   • Authorization: Bearer <ADMIN_API_KEY>  → internal admin (all permissions)
 *   • x-user-id: <platformUserId>            → an end user; role derived from
 *                                              their ClubMembership for the club
 *                                              named in req.params.id / clubId.
 *
 * This is deliberately swappable for Supabase/JWT auth later — the contract is
 * just "populate req.actor, then check a capability".
 */

import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../db/client.js'

export type ClubRole = 'OWNER' | 'ADMINISTRATOR' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER'

// Capabilities each role holds. Higher roles inherit everything below them.
export type Capability =
  | 'club:view' | 'club:edit' | 'club:media' | 'club:sponsors'
  | 'club:invite' | 'club:manage' | 'club:billing'

const ROLE_RANK: Record<ClubRole, number> = {
  VIEWER: 0, CONTRIBUTOR: 1, EDITOR: 2, ADMINISTRATOR: 3, OWNER: 4,
}

// Minimum role required for each capability.
const CAP_MIN_ROLE: Record<Capability, ClubRole> = {
  'club:view':     'VIEWER',
  'club:media':    'CONTRIBUTOR',
  'club:edit':     'EDITOR',
  'club:sponsors': 'EDITOR',
  'club:invite':   'ADMINISTRATOR',
  'club:manage':   'ADMINISTRATOR',
  'club:billing':  'OWNER',
}

export interface Actor {
  kind: 'ADMIN' | 'USER' | 'ANON'
  userId?: string
  isAdmin: boolean
}

// Augment Express Request with the resolved actor (no global .d.ts needed).
export type AuthedRequest = Request & { actor?: Actor }

function resolveAdmin(req: Request): boolean {
  const key = process.env.ADMIN_API_KEY
  if (!key) return false
  const auth = req.headers.authorization ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return provided === key
}

/** Populate req.actor. Never rejects — authorization is enforced by requireCap. */
export function attachActor(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (resolveAdmin(req)) {
    req.actor = { kind: 'ADMIN', isAdmin: true }
  } else {
    const userId = (req.headers['x-user-id'] as string | undefined)?.trim()
    req.actor = userId ? { kind: 'USER', userId, isAdmin: false } : { kind: 'ANON', isAdmin: false }
  }
  next()
}

/** Resolve an end user's role for a club (null if none / revoked / deleted). */
export async function clubRoleFor(clubId: string, userId: string): Promise<ClubRole | null> {
  const m = await prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId, userId } } })
  if (!m || m.deletedAt || m.status !== 'ACTIVE') return null
  return (m.role as ClubRole) ?? null
}

/**
 * Require a capability against the club identified by req.params.id (falling
 * back to req.params.clubId or req.body.clubId). Admins pass unconditionally.
 */
export function requireCap(cap: Capability) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    const actor = req.actor
    if (!actor) { res.status(500).json({ error: 'actor not attached — use attachActor first' }); return }
    if (actor.isAdmin) { next(); return }
    if (actor.kind !== 'USER' || !actor.userId) { res.status(401).json({ error: 'authentication required' }); return }

    const clubId = String(req.params.id ?? req.params.clubId ?? (req.body as { clubId?: string })?.clubId ?? '')
    if (!clubId) { res.status(400).json({ error: 'club id required' }); return }

    const role = await clubRoleFor(clubId, actor.userId)
    if (!role) { res.status(403).json({ error: 'not a member of this club' }); return }

    if (ROLE_RANK[role] < ROLE_RANK[CAP_MIN_ROLE[cap]]) {
      res.status(403).json({ error: `insufficient role: '${cap}' requires ${CAP_MIN_ROLE[cap]}+` })
      return
    }
    next()
  }
}

/** Admin-only guard that still flows through the actor model. */
export function requireAdminActor(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.actor?.isAdmin) { next(); return }
  res.status(401).json({ error: 'admin authorization required' })
}
