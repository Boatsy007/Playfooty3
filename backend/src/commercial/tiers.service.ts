/**
 * Sponsor tiers service (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the default sponsor tiers and supports custom tiers.
 */

import { prisma } from '../db/client.js'
import { logCommercialAction } from './audit.js'

const DEFAULT_TIERS = [
  { key: 'BRONZE', label: 'Bronze', rank: 10 },
  { key: 'SILVER', label: 'Silver', rank: 20 },
  { key: 'GOLD', label: 'Gold', rank: 30 },
  { key: 'PLATINUM', label: 'Platinum', rank: 40 },
  { key: 'FOUNDING_PARTNER', label: 'Founding Partner', rank: 50 },
  { key: 'NAMING_RIGHTS', label: 'Naming Rights', rank: 60 },
]

export async function seedTiers(): Promise<{ seeded: number }> {
  let seeded = 0
  for (const t of DEFAULT_TIERS) {
    await prisma.sponsorTier.upsert({ where: { key: t.key }, create: { ...t, isCustom: false }, update: { label: t.label, rank: t.rank } })
    seeded++
  }
  return { seeded }
}

export async function listTiers() {
  return prisma.sponsorTier.findMany({ where: { active: true }, orderBy: { rank: 'asc' } })
}

export async function addCustomTier(body: Record<string, unknown>, performedBy = 'admin') {
  if (!body.key || !body.label) return { ok: false as const, error: 'key and label required' }
  const key = String(body.key).toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  const tier = await prisma.sponsorTier.upsert({
    where: { key },
    create: { key, label: String(body.label), rank: Number(body.rank ?? 0), description: (body.description as string) ?? null, benefits: body.benefits ? JSON.stringify(body.benefits) : null, isCustom: true },
    update: { label: String(body.label), rank: Number(body.rank ?? 0), description: (body.description as string) ?? null },
  })
  await logCommercialAction('ADD_SPONSOR_TIER', 'SponsorTier', tier.id, { key }, { performedBy })
  return { ok: true as const, tier }
}
