/**
 * PlayHQ ↔ internal mapping + sync-log helpers (Phase F1).
 * ─────────────────────────────────────────────────────────────────────────────
 * Idempotency backbone: every external PlayHQ entity is recorded in
 * PlayhqEntityMap keyed by (entityType, playhqId) and linked to its internal
 * record. Re-running an import updates the same mapping instead of duplicating.
 * Also small utilities: default-state resolution (football leagues/clubs need a
 * state), slugify, and structured sync logging for the admin status/logs views.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export type PlayhqEntityType = 'ORGANISATION' | 'ASSOCIATION' | 'COMPETITION' | 'SEASON' | 'GRADE' | 'CLUB' | 'TEAM' | 'FIXTURE' | 'RESULT' | 'LADDER' | 'VENUE' | 'SURFACE' | 'ROUND' | 'POOL'

export interface MapFields {
  tenant?: string | null; organisationId?: string | null; internalId?: string | null; internalType?: string | null
  name?: string | null; parentPlayhqId?: string | null; sport?: string | null; payload?: unknown; sourceUpdatedAt?: Date | null
}

/** Insert/update a PlayHQ→internal mapping (idempotent on entityType+playhqId). */
export async function mapUpsert(entityType: PlayhqEntityType, playhqId: string, fields: MapFields = {}) {
  const data = {
    tenant: fields.tenant ?? null, organisationId: fields.organisationId ?? null,
    internalId: fields.internalId ?? null, internalType: fields.internalType ?? null,
    name: fields.name ?? null, parentPlayhqId: fields.parentPlayhqId ?? null,
    sport: fields.sport ?? 'FOOTBALL', payload: fields.payload != null ? JSON.stringify(fields.payload) : undefined,
    sourceUpdatedAt: fields.sourceUpdatedAt ?? null, lastSyncedAt: new Date(),
  }
  return prisma.playhqEntityMap.upsert({
    where: { entityType_playhqId: { entityType, playhqId } },
    create: { entityType, playhqId, ...data },
    update: data,
  })
}

export async function getMapping(entityType: PlayhqEntityType, playhqId: string) {
  return prisma.playhqEntityMap.findUnique({ where: { entityType_playhqId: { entityType, playhqId } } }).catch(() => null)
}
export async function getMappedInternalId(entityType: PlayhqEntityType, playhqId: string): Promise<string | null> {
  const m = await getMapping(entityType, playhqId)
  return m?.internalId ?? null
}

export interface SyncLogEntry {
  operation: string; status: 'OK' | 'ERROR' | 'SKIPPED' | 'NOOP' | 'DISABLED'
  tenant?: string | null; organisationId?: string | null; playhqId?: string | null
  message?: string; counts?: Record<string, number>; warnings?: string[]; durationMs?: number; createdBy?: string
}

/** Best-effort structured sync log — never throws into the caller. */
export async function logSync(entry: SyncLogEntry) {
  try {
    await prisma.playhqSyncLog.create({ data: {
      operation: entry.operation, status: entry.status, tenant: entry.tenant ?? null, organisationId: entry.organisationId ?? null,
      playhqId: entry.playhqId ?? null, message: entry.message ?? null,
      counts: entry.counts ? JSON.stringify(entry.counts) : null, warnings: entry.warnings?.length ? JSON.stringify(entry.warnings) : null,
      durationMs: entry.durationMs ?? null, createdBy: entry.createdBy ?? 'admin',
    } })
  } catch (e) { logger.warn('playhq sync log failed', { detail: String(e), operation: entry.operation }) }
}

export function slugify(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'club'
}

/**
 * Resolve a state id for football leagues/clubs. Preference: explicit → the
 * `defaultFootballStateId` setting → a state matching the given name → the first
 * state in the DB. Returns null only if the DB has no states at all.
 */
export async function resolveStateId(explicit?: string | null, stateName?: string | null): Promise<string | null> {
  if (explicit) { const s = await prisma.state.findUnique({ where: { id: explicit } }).catch(() => null); if (s) return s.id }
  const setting = await prisma.setting.findUnique({ where: { key: 'defaultFootballStateId' } }).catch(() => null)
  if (setting?.value) { const s = await prisma.state.findUnique({ where: { id: setting.value } }).catch(() => null); if (s) return s.id }
  if (stateName) { const s = await prisma.state.findFirst({ where: { OR: [{ name: { equals: stateName, mode: 'insensitive' } }, { code: { equals: stateName, mode: 'insensitive' } }] } }).catch(() => null); if (s) return s.id }
  const first = await prisma.state.findFirst({ orderBy: { name: 'asc' } }).catch(() => null)
  return first?.id ?? null
}
