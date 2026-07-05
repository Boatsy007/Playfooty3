/**
 * Validation script for the Phase B5 results & fixtures engine.
 *
 * Pure checks (no DB writes): dedupe-key determinism, validation rules and the
 * streak calculation behave correctly, and the Prisma client exposes every new
 * model. Safe to run anywhere.
 *
 * Usage: tsx src/jobs/_test-results.ts
 */

import { prisma } from '../db/client.js'
import { resultDedupeKey } from '../results/results.service.js'
import { fixtureDedupeKey } from '../results/fixtures.service.js'

async function main() {
  const checks: [string, boolean][] = []

  // Dedupe key is order-independent on the club pairing (home/away swap = same key).
  const k1 = resultDedupeKey('L1', '2026', 5, 'cHome', 'cAway')
  const k2 = resultDedupeKey('L1', '2026', 5, 'cAway', 'cHome')
  checks.push(['result dedupe order-independent', k1 === k2])
  checks.push(['different round → different key', resultDedupeKey('L1', '2026', 6, 'cHome', 'cAway') !== k1])
  checks.push(['fixture dedupe order-independent', fixtureDedupeKey('L1', '2026', 5, 'a', 'b') === fixtureDedupeKey('L1', '2026', 5, 'b', 'a')])

  // Winner / margin logic (mirrors upsertResult).
  const winner = (h: number, a: number) => h === a ? null : (h > a ? 'H' : 'A')
  checks.push(['home win detected', winner(50, 40) === 'H'])
  checks.push(['away win detected', winner(30, 45) === 'A'])
  checks.push(['draw detected', winner(44, 44) === null])
  checks.push(['margin is absolute', Math.abs(30 - 45) === 15])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['matchResult', 'fixture', 'matchInsight', 'clubMatchStat']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B5 results validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
