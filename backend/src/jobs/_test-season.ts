/**
 * Validation script for Phase B10.5 — Full Season Ingestion Engine.
 *
 * Pure checks (no DB writes): extended standings metrics (home/away splits,
 * avg margin, largest win/loss, longest streaks) and that the Prisma client
 * exposes the new season-ingestion models.
 *
 * Usage: tsx src/jobs/_test-season.ts
 */

import { prisma } from '../db/client.js'
import { computeStandings } from '../ladder/generate.js'

const R = (h: string, a: string, hs: number, as: number, round: number) =>
  ({ homeClubId: h, homeClubName: h.toUpperCase(), awayClubId: a, awayClubName: a.toUpperCase(), homeScore: hs, awayScore: as, isDraw: hs === as, winnerClubId: hs === as ? null : (hs > as ? h : a), round, matchDate: new Date(2026, 0, round) })

async function main() {
  const checks: [string, boolean][] = []

  // 'a': R1 home win by 10, R2 away win by 25, R3 home loss by 1, R4 away win by 20
  const results = [
    R('a', 'b', 50, 40, 1), // a home W +10
    R('c', 'a', 30, 55, 2), // a away W +25
    R('a', 'd', 44, 45, 3), // a home L -1
    R('e', 'a', 20, 40, 4), // a away W +20
  ]
  const table = computeStandings(results, { winPoints: 4, drawPoints: 2 })
  const a = table.find(t => t.clubId === 'a')!

  checks.push(['a played 4', a.played === 4])
  checks.push(['a 3W 1L', a.wins === 3 && a.losses === 1])
  checks.push(['a home split 1W 1L', a.homeWins === 1 && a.homeLosses === 1])
  checks.push(['a away split 2W 0L', a.awayWins === 2 && a.awayLosses === 0])
  checks.push(['a largest win 25', a.largestWin === 25])
  checks.push(['a largest loss 1', a.largestLoss === 1])
  checks.push(['a avg margin = 14', a.avgMargin === +((10 + 25 + 1 + 20) / 4).toFixed(2)])
  // timeline order by round: W(+10), W(+25), L, W(+20) → longest win streak 2, longest loss streak 1
  checks.push(['a longest win streak 2', a.longestWinStreak === 2])
  checks.push(['a longest loss streak 1', a.longestLossStreak === 1])
  checks.push(['a current streak +1 (last was W)', a.currentStreak === 1])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['seasonImport', 'seasonImportRow', 'clubSeasonTimeline']) checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])

  let failed = 0
  console.log('── Season Ingestion (B10.5) validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
