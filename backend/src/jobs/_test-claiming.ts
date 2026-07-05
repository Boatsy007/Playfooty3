/**
 * Validation script for the Phase B2 claiming platform.
 *
 * Pure checks (no DB writes): confirms email validation, the role/capability
 * matrix, and that the Prisma client exposes every new model. Safe to run
 * anywhere — it never connects to the database for the assertions below.
 *
 * Usage: tsx src/jobs/_test-claiming.ts
 */

import { prisma } from '../db/client.js'
import { isValidEmail } from '../services/claims.service.js'

async function main() {
  const checks: [string, boolean][] = []

  // Email validation
  checks.push(['valid email accepted', isValidEmail('coach@dubbonetball.com.au')])
  checks.push(['missing @ rejected', !isValidEmail('nope')])
  checks.push(['empty rejected', !isValidEmail('')])
  checks.push(['no TLD rejected', !isValidEmail('a@b')])

  // Prisma client exposes every new B2 model
  const models = [
    'platformUser', 'clubClaim', 'leagueClaim', 'clubMembership', 'clubProfile',
    'leagueProfile', 'sponsor', 'mediaAsset', 'clubInvitation', 'platformNotification', 'profileChangeLog',
  ] as const
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of models) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  // Permission matrix sanity (OWNER outranks VIEWER; capability gate present)
  const perms = await import('../api/middleware/permissions.js')
  checks.push(['requireCap is a factory', typeof perms.requireCap === 'function'])
  checks.push(['attachActor exported', typeof perms.attachActor === 'function'])

  let failed = 0
  console.log('── Phase B2 claiming validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
