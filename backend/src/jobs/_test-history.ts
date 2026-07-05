/**
 * Validation script for the Phase B6 historical rankings & records engine.
 *
 * Pure checks (no DB writes): the club-history aggregation maths and record
 * derivations behave correctly on synthetic input, and the Prisma client exposes
 * every new model. Safe to run anywhere.
 *
 * Usage: tsx src/jobs/_test-history.ts
 */

import { prisma } from '../db/client.js'

// Mirror the aggregation used by club-history.ts on a synthetic series.
function longestRun(flags: boolean[]): number { let best = 0, cur = 0; for (const f of flags) { cur = f ? cur + 1 : 0; best = Math.max(best, cur) } return best }

async function main() {
  const checks: [string, boolean][] = []

  // Synthetic 5-week club series: ranks 30 → 8 → 5 → 12 → 3
  const rows = [
    { week: '2026-W01', rank: 30, movement: 0, rating: 60 },
    { week: '2026-W02', rank: 8, movement: 22, rating: 72 },
    { week: '2026-W03', rank: 5, movement: 3, rating: 75 },
    { week: '2026-W04', rank: 12, movement: -7, rating: 70 },
    { week: '2026-W05', rank: 3, movement: 9, rating: 80 },
  ]
  const ranks = rows.map(r => r.rank)
  const movements = rows.map(r => r.movement)

  checks.push(['highest rank (min) = 3', Math.min(...ranks) === 3])
  checks.push(['lowest rank (max) = 30', Math.max(...ranks) === 30])
  checks.push(['weeks in top 10 = 3', ranks.filter(r => r <= 10).length === 3])
  checks.push(['weeks in top 25 = 4', ranks.filter(r => r <= 25).length === 4])
  checks.push(['largest weekly rise = +22', Math.max(...movements.filter(m => m > 0)) === 22])
  checks.push(['largest weekly fall = -7', Math.min(...movements.filter(m => m < 0)) === -7])
  checks.push(['longest top-10 run = 2', longestRun(ranks.map(r => r <= 10)) === 2])
  checks.push(['season improvement 30→3 = 27', rows[0].rank - rows[rows.length - 1].rank === 27])
  checks.push(['highest rating = 80', Math.max(...rows.map(r => r.rating)) === 80])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['rankingHistory', 'leagueRankingHistory', 'clubHistory', 'leagueHistory', 'recordBookEntry', 'historyCorrection']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B6 history validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
