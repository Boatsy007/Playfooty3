/**
 * Sponsorship deal service (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates sponsorship deals and drives their workflow via status transitions,
 * each recorded in the SponsorshipEvent ledger + AuditLog. Soft-delete only —
 * sponsorship history is never removed. Expiry is derived from endDate.
 */

import { prisma } from '../db/client.js'
import { logCommercialAction } from './audit.js'
import { logger } from '../utils/logger.js'

export const SPONSORSHIP_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'VERIFICATION_REQUIRED', 'AWAITING_PAYMENT', 'PAYMENT_COMPLETE', 'CANCELLED'] as const
export type SponsorshipStatus = typeof SPONSORSHIP_STATUSES[number]

const CREATE_FIELDS = ['scope', 'clubId', 'leagueId', 'championshipId', 'package', 'tier', 'startDate', 'endDate', 'displayPriority', 'bannerPosition', 'ctaLabel', 'ctaUrl', 'trackingId', 'amount', 'currency', 'notes'] as const

export async function createSponsorship(body: Record<string, unknown>, performedBy = 'admin') {
  if (!body.sponsorId) return { ok: false as const, error: 'sponsorId required' }
  const sponsor = await prisma.commercialSponsor.findUnique({ where: { id: String(body.sponsorId) }, select: { id: true, deletedAt: true } })
  if (!sponsor || sponsor.deletedAt) return { ok: false as const, error: 'sponsor not found' }
  const data: Record<string, unknown> = { sponsorId: String(body.sponsorId), createdBy: performedBy, status: 'PENDING' }
  for (const k of CREATE_FIELDS) if (k in body && body[k] !== undefined) data[k] = (k === 'startDate' || k === 'endDate') && body[k] ? new Date(body[k] as string) : body[k]
  const deal = await prisma.sponsorship.create({ data: data as never })
  await prisma.sponsorshipEvent.create({ data: { sponsorshipId: deal.id, fromStatus: null, toStatus: 'PENDING', actor: performedBy, note: 'created' } })
  await logCommercialAction('CREATE_SPONSORSHIP', 'Sponsorship', deal.id, { sponsorId: deal.sponsorId, scope: deal.scope }, { performedBy })
  return { ok: true as const, sponsorship: deal }
}

/** Transition a sponsorship to a new status (records the workflow event). */
export async function transition(id: string, toStatus: SponsorshipStatus, opts: { note?: string; performedBy?: string } = {}) {
  if (!SPONSORSHIP_STATUSES.includes(toStatus)) return { ok: false as const, status: 400, error: 'invalid status' }
  const deal = await prisma.sponsorship.findUnique({ where: { id } })
  if (!deal || deal.deletedAt) return { ok: false as const, status: 404, error: 'sponsorship not found' }
  if (deal.status === toStatus) return { ok: true as const, status: 200, sponsorship: deal }

  const data: Record<string, unknown> = { status: toStatus }
  if (toStatus === 'APPROVED' || toStatus === 'ACTIVE') data.approvedBy = opts.performedBy ?? 'admin'
  const updated = await prisma.sponsorship.update({ where: { id }, data })
  await prisma.sponsorshipEvent.create({ data: { sponsorshipId: id, fromStatus: deal.status, toStatus, actor: opts.performedBy ?? 'admin', note: opts.note ?? null } })
  await logCommercialAction('SPONSORSHIP_TRANSITION', 'Sponsorship', id, { from: deal.status, to: toStatus }, { before: { status: deal.status }, reason: opts.note, performedBy: opts.performedBy })
  return { ok: true as const, status: 200, sponsorship: updated }
}

/** Soft-delete a sponsorship deal — never removed from history. */
export async function softDeleteSponsorship(id: string, performedBy = 'admin') {
  const before = await prisma.sponsorship.findUnique({ where: { id } })
  if (!before) return { ok: false as const, error: 'sponsorship not found' }
  await prisma.sponsorship.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } })
  await prisma.sponsorshipEvent.create({ data: { sponsorshipId: id, fromStatus: before.status, toStatus: 'CANCELLED', actor: performedBy, note: 'soft deleted' } })
  await logCommercialAction('ARCHIVE_SPONSORSHIP', 'Sponsorship', id, { deletedAt: new Date() }, { before, performedBy })
  return { ok: true as const }
}

/** Sweep: mark ACTIVE/APPROVED sponsorships whose endDate has passed as EXPIRED. */
export async function sweepExpiredSponsorships(performedBy = 'SYSTEM'): Promise<{ expired: number; renewalDue: number }> {
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiring = await prisma.sponsorship.findMany({ where: { deletedAt: null, status: { in: ['ACTIVE', 'APPROVED', 'PAYMENT_COMPLETE'] }, endDate: { lt: now } } })
  for (const d of expiring) await transition(d.id, 'EXPIRED', { note: 'auto-expired (endDate passed)', performedBy })
  const dueSoon = await prisma.sponsorship.findMany({ where: { deletedAt: null, status: { in: ['ACTIVE', 'PAYMENT_COMPLETE'] }, endDate: { gte: now, lt: soon } } })
  for (const d of dueSoon) await transition(d.id, 'RENEWAL_DUE', { note: 'renewal due within 30 days', performedBy })
  logger.info('Sponsorship expiry sweep', { expired: expiring.length, renewalDue: dueSoon.length })
  return { expired: expiring.length, renewalDue: dueSoon.length }
}

// ── Reads (public: active deals for an entity) ────────────────────────────────
const ACTIVE = ['APPROVED', 'ACTIVE', 'PAYMENT_COMPLETE', 'RENEWAL_DUE']

export async function getClubSponsorships(clubId: string, activeOnly = true) {
  const deals = await prisma.sponsorship.findMany({ where: { clubId, deletedAt: null, ...(activeOnly ? { status: { in: ACTIVE } } : {}) }, orderBy: { displayPriority: 'desc' } })
  return enrich(deals)
}
export async function getLeagueSponsorships(leagueId: string, activeOnly = true) {
  const deals = await prisma.sponsorship.findMany({ where: { leagueId, deletedAt: null, ...(activeOnly ? { status: { in: ACTIVE } } : {}) }, orderBy: { displayPriority: 'desc' } })
  return enrich(deals)
}

async function enrich(deals: Awaited<ReturnType<typeof prisma.sponsorship.findMany>>) {
  const ids = [...new Set(deals.map(d => d.sponsorId))]
  const sponsors = ids.length ? await prisma.commercialSponsor.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, logoUrl: true, websiteUrl: true, tier: true } }) : []
  const byId = new Map(sponsors.map(s => [s.id, s]))
  return deals.map(d => ({ ...d, sponsor: byId.get(d.sponsorId) ?? null }))
}
