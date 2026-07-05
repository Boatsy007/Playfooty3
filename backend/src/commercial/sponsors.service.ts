/**
 * Sponsor business service (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD for CommercialSponsor (the advertiser entity). Soft-delete only; every
 * change is audited. Media are stored as references (URLs).
 */

import { prisma } from '../db/client.js'
import { logCommercialAction } from './audit.js'

const FIELDS = ['name', 'businessName', 'logoUrl', 'heroImageUrl', 'bannerUrl', 'squareLogoUrl', 'websiteUrl', 'email', 'phone', 'description', 'industry', 'state', 'tier', 'status', 'facebookUrl', 'instagramUrl', 'linkedinUrl', 'brandPrimary', 'brandSecondary', 'notes'] as const

function pick(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of FIELDS) if (k in body && body[k] !== undefined) out[k] = body[k]
  return out
}

export async function listSponsors(opts: { state?: string; industry?: string; status?: string; includeDeleted?: boolean } = {}) {
  return prisma.commercialSponsor.findMany({
    where: { ...(opts.includeDeleted ? {} : { deletedAt: null }), ...(opts.state ? { state: opts.state } : {}), ...(opts.industry ? { industry: opts.industry } : {}), ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: 'desc' }, take: 1000,
  })
}

export async function getSponsor(id: string) {
  const sponsor = await prisma.commercialSponsor.findUnique({ where: { id } })
  if (!sponsor || sponsor.deletedAt) return null
  const sponsorships = await prisma.sponsorship.findMany({ where: { sponsorId: id, deletedAt: null }, orderBy: { createdAt: 'desc' } })
  return { ...sponsor, sponsorships }
}

export async function createSponsor(body: Record<string, unknown>, performedBy = 'admin') {
  if (!body.name) return { ok: false as const, error: 'name required' }
  const sponsor = await prisma.commercialSponsor.create({ data: { name: String(body.name), ...pick(body) } })
  await logCommercialAction('CREATE_SPONSOR', 'CommercialSponsor', sponsor.id, { name: sponsor.name }, { performedBy })
  return { ok: true as const, sponsor }
}

export async function updateSponsor(id: string, body: Record<string, unknown>, performedBy = 'admin') {
  const before = await prisma.commercialSponsor.findUnique({ where: { id } })
  if (!before || before.deletedAt) return { ok: false as const, error: 'sponsor not found' }
  const updates = pick(body)
  if (Object.keys(updates).length === 0) return { ok: false as const, error: 'no editable fields' }
  const sponsor = await prisma.commercialSponsor.update({ where: { id }, data: updates })
  await logCommercialAction('UPDATE_SPONSOR', 'CommercialSponsor', id, updates, { before, performedBy })
  return { ok: true as const, sponsor }
}

/** Soft-delete a sponsor — history (its sponsorships) is preserved. */
export async function softDeleteSponsor(id: string, performedBy = 'admin') {
  const before = await prisma.commercialSponsor.findUnique({ where: { id } })
  if (!before) return { ok: false as const, error: 'sponsor not found' }
  await prisma.commercialSponsor.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } })
  await logCommercialAction('ARCHIVE_SPONSOR', 'CommercialSponsor', id, { deletedAt: new Date() }, { before, performedBy })
  return { ok: true as const }
}
