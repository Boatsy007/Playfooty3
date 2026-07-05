/**
 * Invitation engine (Phase B7).
 * ─────────────────────────────────────────────────────────────────────────────
 * Prepares (does NOT auto-send) championship invitations and records responses.
 * The invitation ledger is PERMANENT — invitations are never hard-deleted; the
 * status carries the history. When a club declines, the next eligible reserve is
 * promoted so it becomes available for invitation. Every override is logged.
 */

import { prisma } from '../db/client.js'
import { promoteNextEligible, removeQualified } from './waitlist.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export interface GenerateReport { championshipId: string; created: number; skipped: number; snapshotId: string | null }

/** Create PENDING invitations for every QUALIFIED club without an active one. */
export async function generateInvitations(championshipId: string, opts: { invitedBy?: string } = {}): Promise<GenerateReport> {
  const report: GenerateReport = { championshipId, created: 0, skipped: 0, snapshotId: null }
  const qualified = await prisma.qualifiedClub.findMany({ where: { championshipId, status: 'QUALIFIED' }, orderBy: { order: 'asc' } })
  const latestSnapshot = await prisma.qualificationSnapshot.findFirst({ where: { championshipId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
  report.snapshotId = latestSnapshot?.id ?? null

  for (const q of qualified) {
    const active = await prisma.championshipInvitation.findFirst({ where: { championshipId, clubId: q.clubId, status: { in: ['PENDING', 'ACCEPTED'] } }, select: { id: true } })
    if (active) { report.skipped++; continue }
    await prisma.championshipInvitation.create({
      data: { championshipId, clubId: q.clubId, clubName: q.clubName, invitationType: 'QUALIFICATION', status: 'PENDING', invitedBy: opts.invitedBy ?? 'admin', snapshotId: latestSnapshot?.id ?? null },
    })
    report.created++
  }
  await logQualityAction('GENERATE_INVITATIONS', 'Championship', championshipId, { created: report.created, skipped: report.skipped }, { reason: 'invitations generated', performedBy: opts.invitedBy })
  logger.info('Invitations generated', { championshipId, created: report.created })
  return report
}

/** Create a single manual/wildcard/host/replacement invitation. */
export async function createManualInvitation(championshipId: string, clubId: string, invitationType: 'WILDCARD' | 'HOST' | 'MANUAL' | 'REPLACEMENT', opts: { invitedBy?: string; notes?: string } = {}) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } })
  if (!club) return { ok: false as const, error: 'club not found' }
  const snapshot = await prisma.qualificationSnapshot.findFirst({ where: { championshipId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
  const invite = await prisma.championshipInvitation.create({
    data: { championshipId, clubId, clubName: club.name, invitationType, status: 'PENDING', invitedBy: opts.invitedBy ?? 'admin', notes: opts.notes ?? null, snapshotId: snapshot?.id ?? null },
  })
  // Record their qualification standing via this manual method (override-safe).
  await prisma.qualifiedClub.upsert({
    where: { championshipId_clubId: { championshipId, clubId } },
    create: { championshipId, clubId, clubName: club.name, method: invitationType === 'WILDCARD' ? 'WILDCARD' : invitationType === 'HOST' ? 'HOST_INVITATION' : invitationType === 'REPLACEMENT' ? 'ADMIN_OVERRIDE' : 'MANUAL_INVITATION', status: invitationType === 'REPLACEMENT' ? 'REPLACEMENT' : 'QUALIFIED', order: 999 },
    update: {},
  })
  await logQualityAction('CREATE_MANUAL_INVITATION', 'Championship', championshipId, { clubId, invitationType }, { reason: opts.notes ?? 'manual invitation', performedBy: opts.invitedBy })
  return { ok: true as const, invitation: invite }
}

/** Record a response to an invitation. Permanent — never deletes the record. */
export async function respondInvitation(invitationId: string, status: 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED', opts: { reason?: string; performedBy?: string } = {}) {
  const invite = await prisma.championshipInvitation.findUnique({ where: { id: invitationId } })
  if (!invite) return { ok: false as const, status: 404, error: 'invitation not found' }
  if (invite.status !== 'PENDING') return { ok: false as const, status: 409, error: `invitation already ${invite.status}` }

  const updated = await prisma.championshipInvitation.update({ where: { id: invitationId }, data: { status, respondedAt: new Date(), reason: opts.reason ?? null } })

  let promoted: { clubName: string } | null = null
  if (status === 'DECLINED' || status === 'WITHDRAWN' || status === 'EXPIRED') {
    // Free the declining club's slot and promote the next reserve.
    await removeQualified(invite.championshipId, invite.clubId, { reason: `invitation ${status}`, performedBy: opts.performedBy })
    promoted = await promoteNextEligible(invite.championshipId, { reason: `slot freed by ${invite.clubName}`, performedBy: opts.performedBy })
  }
  await logQualityAction('RESPOND_INVITATION', 'Championship', invite.championshipId, { invitationId, status, clubId: invite.clubId, promoted: promoted?.clubName ?? null }, { reason: opts.reason ?? status, performedBy: opts.performedBy })
  return { ok: true as const, status: 200, invitation: updated, promoted }
}
