/**
 * Championship reports (Phase B7) — read-only backend reporting.
 * ─────────────────────────────────────────────────────────────────────────────
 * Qualified clubs, declined invitations, waiting list, state / league
 * representation and the qualification-method breakdown.
 */

import { prisma } from '../db/client.js'

export async function championshipReport(championshipId: string) {
  const [qualified, invitations] = await Promise.all([
    prisma.qualifiedClub.findMany({ where: { championshipId }, orderBy: { order: 'asc' } }),
    prisma.championshipInvitation.findMany({ where: { championshipId }, orderBy: { invitedAt: 'desc' } }),
  ])

  const tally = (rows: { [k: string]: unknown }[], key: string) => {
    const m: Record<string, number> = {}
    for (const r of rows) { const v = String(r[key] ?? 'Unknown'); m[v] = (m[v] ?? 0) + 1 }
    return m
  }

  const q = qualified.filter(c => c.status === 'QUALIFIED')
  return {
    championshipId,
    counts: {
      qualified: q.length,
      reserves: qualified.filter(c => c.status === 'RESERVE').length,
      waitlist: qualified.filter(c => c.status === 'WAITLIST' || c.status === 'RESERVE').length,
      removed: qualified.filter(c => c.status === 'REMOVED').length,
      invitations: invitations.length,
      accepted: invitations.filter(i => i.status === 'ACCEPTED').length,
      declined: invitations.filter(i => i.status === 'DECLINED').length,
      pending: invitations.filter(i => i.status === 'PENDING').length,
    },
    qualifiedClubs: q,
    declinedInvitations: invitations.filter(i => i.status === 'DECLINED'),
    waitingList: qualified.filter(c => c.status === 'RESERVE' || c.status === 'WAITLIST'),
    stateRepresentation: tally(q, 'state'),
    leagueRepresentation: tally(q, 'leagueName'),
    qualificationMethodBreakdown: tally(q, 'method'),
  }
}
