/**
 * Validation script for Ladder Import V2.
 *
 * Pure checks (no DB writes): netball ladder maths (points, safe percentage,
 * sort order, streak/last5), CSV parsing, and that the Prisma client exposes the
 * new models.
 *
 * Usage: tsx src/jobs/_test-ladder.ts
 */

import { prisma } from '../db/client.js'
import { computeStandings, safePercentage } from '../ladder/generate.js'
import { parseCsv } from '../ladder/bulk-import.js'

const R = (h: string, hn: string, a: string, an: string, hs: number, as: number, round: number) =>
  ({ homeClubId: h, homeClubName: hn, awayClubId: a, awayClubName: an, homeScore: hs, awayScore: as, isDraw: hs === as, winnerClubId: hs === as ? null : (hs > as ? h : a), round, matchDate: new Date(2026, 0, round) })

async function main() {
  const checks: [string, boolean][] = []

  // Safe percentage (GA=0 handled)
  checks.push(['pct 60/40 = 150', safePercentage(60, 40) === 150])
  checks.push(['pct GA=0 GF>0 safe', safePercentage(50, 0) === 9999])
  checks.push(['pct 0/0 = 0', safePercentage(0, 0) === 0])

  // Standings: A beats B and C; B beats C.
  const results = [
    R('a', 'Alpha', 'b', 'Beta', 50, 40, 1),
    R('a', 'Alpha', 'c', 'Cee', 55, 30, 2),
    R('b', 'Beta', 'c', 'Cee', 45, 44, 3),
    R('b', 'Beta', 'a', 'Alpha', 30, 30, 4), // draw
  ]
  const table = computeStandings(results, { winPoints: 4, drawPoints: 2 })
  const alpha = table.find(t => t.clubId === 'a')!
  const beta = table.find(t => t.clubId === 'b')!
  const cee = table.find(t => t.clubId === 'c')!
  checks.push(['alpha played 3', alpha.played === 3])
  checks.push(['alpha 2W 1D → 10 pts', alpha.wins === 2 && alpha.draws === 1 && alpha.points === 10])
  checks.push(['alpha top of ladder', alpha.position === 1])
  checks.push(['cee bottom (0 wins)', cee.position === 3 && cee.wins === 0])
  checks.push(['beta second', beta.position === 2])
  checks.push(['goalDiff computed', alpha.goalDiff === (50 + 55 + 30) - (40 + 30 + 30)])
  checks.push(['last5 present', Array.isArray(alpha.last5) && alpha.last5.length >= 1])
  checks.push(['streak signed', typeof alpha.currentStreak === 'number'])

  // Sort tie-break: equal points → higher percentage first
  const tie = computeStandings([R('x', 'X', 'y', 'Y', 60, 20, 1), R('y', 'Y', 'z', 'Z', 30, 25, 2), R('x', 'X', 'z', 'Z', 20, 40, 3)], { winPoints: 4, drawPoints: 2 })
  checks.push(['tie-break by percentage', tie[0].percentage >= tie[1].percentage])

  // CSV parse
  const csv = 'League,Season,Grade,Round,Home,Away,HomeScore,AwayScore\nGVL,2026,A Grade,1,Alpha,Beta,50,40'
  const parsed = parseCsv(csv)
  checks.push(['csv parsed 1 row', parsed.length === 1])
  checks.push(['csv fields mapped', parsed[0].homeClub === 'Alpha' && parsed[0].awayScore === '40' && parsed[0].round === '1'])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['ladder', 'ladderRow']) checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])

  let failed = 0
  console.log('── Ladder Import V2 validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
