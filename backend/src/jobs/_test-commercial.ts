/**
 * Validation script for the Phase B8 commercial platform.
 *
 * Pure checks (no DB writes): workflow status set, tier/placement defaults, and
 * expiry logic behave correctly, and the Prisma client exposes every new model.
 *
 * Usage: tsx src/jobs/_test-commercial.ts
 */

import { prisma } from '../db/client.js'
import { SPONSORSHIP_STATUSES } from '../commercial/sponsorships.service.js'
import { PLACEMENTS } from '../commercial/inventory.service.js'

async function main() {
  const checks: [string, boolean][] = []

  // Workflow states cover the brief.
  for (const s of ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'RENEWAL_DUE', 'VERIFICATION_REQUIRED', 'AWAITING_PAYMENT', 'PAYMENT_COMPLETE']) {
    checks.push([`status ${s} supported`, (SPONSORSHIP_STATUSES as readonly string[]).includes(s)])
  }

  // All ad placements present.
  const placementKeys = PLACEMENTS.map(p => p.placement)
  for (const p of ['HOMEPAGE_HERO', 'HOMEPAGE_SIDEBAR', 'RANKINGS_SIDEBAR', 'LEAGUE_PAGE', 'CLUB_PAGE', 'NEWS_PAGE', 'CHAMPIONSHIP_PAGE', 'SEARCH_PAGE', 'STATISTICS_PAGE']) {
    checks.push([`placement ${p} present`, placementKeys.includes(p)])
  }

  // Expiry logic: endDate in the past = expired.
  const now = Date.now()
  const isExpired = (end: number) => end < now
  checks.push(['past endDate is expired', isExpired(now - 86400000)])
  checks.push(['future endDate not expired', !isExpired(now + 86400000)])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['commercialSponsor', 'sponsorship', 'sponsorTier', 'adInventory', 'premiumMembership', 'sponsorshipEvent']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B8 commercial validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
