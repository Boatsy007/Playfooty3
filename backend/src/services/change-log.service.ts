/**
 * Field-level change logging (Phase B2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Every self-managed edit produces one ProfileChangeLog row per changed field
 * (previous → new). Separate from the ranking AuditLog so that table is never
 * touched. IP / user-agent are captured when available (future-ready).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export interface ChangeActor {
  actorType?: 'USER' | 'ADMIN' | 'SYSTEM'
  actorId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/** Normalise a value for storage/comparison. */
function norm(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * Diff `before` vs `after` (only keys present in `after` are considered) and
 * write one change-log row per field that actually changed. Returns the list of
 * changed field names. Best-effort — logging never throws into the caller.
 */
export async function logChanges(
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actor: ChangeActor = {},
): Promise<string[]> {
  const changed: { field: string; previousValue: string | null; newValue: string | null }[] = []
  for (const key of Object.keys(after)) {
    const prev = norm(before[key])
    const next = norm(after[key])
    if (prev !== next) changed.push({ field: key, previousValue: prev, newValue: next })
  }
  if (changed.length === 0) return []

  try {
    await prisma.profileChangeLog.createMany({
      data: changed.map(c => ({
        actorType:     actor.actorType ?? 'USER',
        actorId:       actor.actorId ?? null,
        entityType,
        entityId,
        field:         c.field,
        previousValue: c.previousValue,
        newValue:      c.newValue,
        ipAddress:     actor.ipAddress ?? null,
        userAgent:     actor.userAgent ?? null,
      })),
    })
  } catch (e) {
    logger.warn('profile change-log write failed', { detail: String(e) })
  }
  return changed.map(c => c.field)
}

/** Pull the actor context off an Express request (IP + user-agent). */
export function actorFromRequest(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }, base: ChangeActor = {}): ChangeActor {
  const xf = req.headers['x-forwarded-for']
  const ip = (typeof xf === 'string' ? xf.split(',')[0].trim() : undefined) ?? req.socket?.remoteAddress ?? null
  const ua = (req.headers['user-agent'] as string | undefined) ?? null
  return { ...base, ipAddress: ip, userAgent: ua }
}
