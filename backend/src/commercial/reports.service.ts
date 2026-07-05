/**
 * Commercial reporting (Phase B8) — read-only.
 * ─────────────────────────────────────────────────────────────────────────────
 * Active / expired / expiring-soon sponsorships, premium clubs & leagues,
 * featured listings, a revenue placeholder and state / industry breakdowns.
 */

import { prisma } from '../db/client.js'

const ACTIVE = ['APPROVED', 'ACTIVE', 'PAYMENT_COMPLETE', 'RENEWAL_DUE']

export async function commercialReports() {
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [active, expired, expiringSoon, premium, featured, sponsors, activeDeals] = await Promise.all([
    prisma.sponsorship.count({ where: { deletedAt: null, status: { in: ACTIVE } } }),
    prisma.sponsorship.count({ where: { deletedAt: null, status: 'EXPIRED' } }),
    prisma.sponsorship.findMany({ where: { deletedAt: null, status: { in: ACTIVE }, endDate: { gte: now, lt: soon } }, orderBy: { endDate: 'asc' }, take: 100 }),
    prisma.premiumMembership.findMany({ where: { deletedAt: null, premiumStatus: { in: ['ACTIVE', 'TRIAL'] } } }),
    prisma.premiumMembership.findMany({ where: { deletedAt: null, featured: true } }),
    prisma.commercialSponsor.findMany({ where: { deletedAt: null }, select: { state: true, industry: true } }),
    prisma.sponsorship.findMany({ where: { deletedAt: null, status: { in: ACTIVE } }, select: { amount: true, currency: true } }),
  ])

  const tally = (rows: { [k: string]: unknown }[], key: string) => {
    const m: Record<string, number> = {}
    for (const r of rows) { const v = String(r[key] ?? 'Unknown'); m[v] = (m[v] ?? 0) + 1 }
    return m
  }
  const revenuePlaceholder = activeDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0)

  return {
    generatedAt: now.toISOString(),
    counts: {
      activeSponsorships: active,
      expiredSponsorships: expired,
      expiringSoon: expiringSoon.length,
      premiumClubs: premium.filter(p => p.scope === 'CLUB').length,
      premiumLeagues: premium.filter(p => p.scope === 'LEAGUE').length,
      featuredListings: featured.length,
      totalSponsors: sponsors.length,
    },
    revenuePlaceholder: { total: revenuePlaceholder, currency: 'AUD', note: 'sum of active deal amounts — billing not yet integrated' },
    expiringSoon,
    featuredListings: featured,
    stateBreakdown: tally(sponsors, 'state'),
    industryBreakdown: tally(sponsors, 'industry'),
  }
}
