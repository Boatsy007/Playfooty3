/**
 * Waitlist engine (Phase B7).
 * ─────────────────────────────────────────────────────────────────────────────
 * Maintains the qualified / reserve / waitlist ordering. When a qualified club
 * is removed (e.g. it declines an invitation), the next eligible reserve is
 * promoted into the freed slot so it becomes available for invitation. No
 * automatic invitations are sent — this only prepares the standings.
 */

import { prisma } from '../db/client.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export async function getWaitlist(championshipId: string) {
  const rows = await prisma.qualifiedClub.findMany({ where: { championshipId }, orderBy: [{ order: 'asc' }] })
  return {
    qualified: rows.filter(r => r.status === 'QUALIFIED'),
    reserves: rows.filter(r => r.status === 'RESERVE'),
    waitlist: rows.filter(r => r.status === 'WAITLIST'),
    replacements: rows.filter(r => r.status === 'REPLACEMENT'),
    removed: rows.filter(r => r.status === 'REMOVED'),
  }
}

/** The next reserve in line (lowest order) that could fill a freed slot. */
export async function nextEligible(championshipId: string) {
  return prisma.qualifiedClub.findFirst({ where: { championshipId, status: 'RESERVE' }, orderBy: { order: 'asc' } })
}

/**
 * Promote the next reserve into a QUALIFIED slot (used when a qualified club is
 * removed / declines). Returns the promoted club, or null if none available.
 */
export async function promoteNextEligible(championshipId: string, opts: { reason?: string; performedBy?: string } = {}) {
  const next = await nextEligible(championshipId)
  if (!next) return null
  const promoted = await prisma.qualifiedClub.update({ where: { id: next.id }, data: { status: 'QUALIFIED' } })
  await logQualityAction('PROMOTE_RESERVE', 'Championship', championshipId, { clubId: promoted.clubId, clubName: promoted.clubName }, { reason: opts.reason ?? 'reserve promoted to qualified', performedBy: opts.performedBy })
  logger.info('Reserve promoted', { championshipId, clubId: promoted.clubId })
  return promoted
}

/** Mark a qualified club as removed (opens a slot). Does not delete anything. */
export async function removeQualified(championshipId: string, clubId: string, opts: { reason?: string; performedBy?: string } = {}) {
  const existing = await prisma.qualifiedClub.findUnique({ where: { championshipId_clubId: { championshipId, clubId } } })
  if (!existing) return null
  const updated = await prisma.qualifiedClub.update({ where: { id: existing.id }, data: { status: 'REMOVED' } })
  await logQualityAction('REMOVE_QUALIFIED', 'Championship', championshipId, { clubId, status: 'REMOVED' }, { reason: opts.reason ?? 'qualified club removed', performedBy: opts.performedBy })
  return updated
}
