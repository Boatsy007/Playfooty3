/**
 * Validation script for the Phase B4 data-quality engine.
 *
 * Pure checks (no DB writes): the identity resolver / eligibility heuristics /
 * duplicate keys behave correctly on synthetic input, and the Prisma client
 * exposes every new model. Safe to run anywhere.
 *
 * Usage: tsx src/jobs/_test-quality.ts
 */

import { prisma } from '../db/client.js'
import { isGenericTeamName } from '../quality/identity-resolver.js'
import { canonicalClubKey, areLikelyDuplicateClubs, validateClubIdentity } from '../validation/club-identity.js'

async function main() {
  const checks: [string, boolean][] = []

  // Generic / real detection
  checks.push(['"Vixens" is generic', isGenericTeamName('Vixens')])
  checks.push(['"Team 1" is generic', isGenericTeamName('Team 1')])
  checks.push(['"Dubbo Netball Club" is real', !isGenericTeamName('Dubbo Netball Club')])
  checks.push(['"Blue" is generic', isGenericTeamName('Blue')])

  // Canonical duplicate detection
  checks.push(['Churchill FNC ~ Churchill Cougars', areLikelyDuplicateClubs('Churchill FNC', 'Churchill Cougars')])
  checks.push(['distinct towns not dup', !areLikelyDuplicateClubs('Dubbo Netball', 'Mudgee Netball')])
  checks.push(['canonical key non-empty', canonicalClubKey('Traralgon Football Netball Club').length > 0])

  // Eligibility heuristic proxies (regex mirrors league-eligibility.ts)
  const junior = /\b(junior|juniors|under[\s-]?\d{1,2}|u\/?\d{1,2}|net[\s-]?set[\s-]?go|netsetgo|primary|schoolgirls?)\b/i
  const metro = /\b(metro|metropolitan|city)\b/i
  const indoor = /\b(indoor|fast[\s-]?5|fast5|stadium)\b/i
  checks.push(['junior comp flagged', junior.test('Ballarat Junior Netball U15')])
  checks.push(['metro comp flagged', metro.test('Melbourne Metropolitan Netball')])
  checks.push(['indoor comp flagged', indoor.test('Bendigo Indoor Fast5')])
  checks.push(['country A-grade not flagged', !junior.test('Goulburn Valley Netball League A Grade') && !metro.test('Goulburn Valley Netball League A Grade')])

  // Identity verdicts
  checks.push(['alias TTU resolves', validateClubIdentity('TTU').canonical !== null])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['mergeRecord', 'clubAlias', 'leagueEligibility', 'dataHealthSnapshot']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B4 quality validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
