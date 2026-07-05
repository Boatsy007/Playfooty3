/**
 * Premium membership service (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscription + benefits layer for a club or league (additive to the B2
 * ClubProfile flags). Soft-delete only; audited.
 */

import { prisma } from '../db/client.js'
import { logCommercialAction } from './audit.js'

const FIELDS = ['entityName', 'premiumStatus', 'verified', 'claimed', 'featured', 'subscriptionPlan', 'startedAt', 'expiresAt', 'renewalDate', 'autoRenew', 'benefits'] as const

export async function setPremium(scope: 'CLUB' | 'LEAGUE', entityId: string, body: Record<string, unknown>, performedBy = 'admin') {
  const data: Record<string, unknown> = {}
  for (const k of FIELDS) if (k in body && body[k] !== undefined) data[k] = (k === 'startedAt' || k === 'expiresAt' || k === 'renewalDate') && body[k] ? new Date(body[k] as string) : (k === 'benefits' && body[k] && typeof body[k] !== 'string' ? JSON.stringify(body[k]) : body[k])
  const before = await prisma.premiumMembership.findUnique({ where: { scope_entityId: { scope, entityId } } })
  const row = await prisma.premiumMembership.upsert({
    where: { scope_entityId: { scope, entityId } },
    create: { scope, entityId, ...data },
    update: data,
  })
  await logCommercialAction('SET_PREMIUM', scope === 'CLUB' ? 'Club' : 'League', entityId, data, { before, performedBy })
  return row
}

export async function getPremium(scope: 'CLUB' | 'LEAGUE', entityId: string) {
  const row = await prisma.premiumMembership.findUnique({ where: { scope_entityId: { scope, entityId } } })
  return row && !row.deletedAt ? row : null
}

export async function listPremium(opts: { scope?: 'CLUB' | 'LEAGUE'; status?: string; featured?: boolean } = {}) {
  return prisma.premiumMembership.findMany({
    where: { deletedAt: null, ...(opts.scope ? { scope: opts.scope } : {}), ...(opts.status ? { premiumStatus: opts.status } : {}), ...(opts.featured != null ? { featured: opts.featured } : {}) },
    orderBy: { updatedAt: 'desc' }, take: 1000,
  })
}
