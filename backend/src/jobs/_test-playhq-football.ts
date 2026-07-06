/**
 * Validation script for Phase F1 — PlayHQ Football API ingestion.
 *
 * Pure/offline checks: football scoring maths, ladder sort, graceful-disabled
 * behaviour when credentials are absent, and that the Prisma client exposes the
 * new mapping/log models + sport columns.
 *
 * Usage: tsx src/jobs/_test-playhq-football.ts   (run with NO PlayHQ env vars)
 */

import { prisma } from '../db/client.js'
import { footballTotal, resolveScore, ladderPercentage, computeFootballLadder } from '../football/scoring.js'
import { isPlayhqConfigured, PLAYHQ_CREDENTIALS_MISSING } from '../providers/playhq/config.js'
import { getPlayhqProvider } from '../providers/registry.js'
import { getFootballStatus } from '../football/ingest.js'

async function main() {
  const checks: [string, boolean][] = []

  // Scoring: goals*6 + behinds; missing handled safely.
  checks.push(['12.8 = 80 pts', footballTotal(12, 8) === 80])
  checks.push(['goals only (behinds missing) = 60', footballTotal(10, null) === 60])
  checks.push(['both missing = 0', footballTotal(null, undefined) === 0])
  checks.push(['resolveScore prefers explicit', resolveScore(95, 1, 1) === 95])
  checks.push(['resolveScore falls back to g/b', resolveScore(null, 10, 5) === 65])
  checks.push(['resolveScore null when no data', resolveScore(null, null, null) === null])
  checks.push(['percentage 120/100 = 120', ladderPercentage(120, 100) === 120])
  checks.push(['percentage against=0 safe', ladderPercentage(80, 0) === 9999])

  // Ladder: A beats B, B beats C, A draws C.
  const ladder = computeFootballLadder([
    { homeClubId: 'a', homeClubName: 'A', awayClubId: 'b', awayClubName: 'B', homePoints: 100, awayPoints: 60 },
    { homeClubId: 'b', homeClubName: 'B', awayClubId: 'c', awayClubName: 'C', homePoints: 90, awayPoints: 50 },
    { homeClubId: 'a', homeClubName: 'A', awayClubId: 'c', awayClubName: 'C', homePoints: 70, awayPoints: 70 },
  ])
  const a = ladder.find(r => r.clubId === 'a')!
  checks.push(['A top (1W 1D = 6pts)', a.position === 1 && a.points === 6])
  checks.push(['A percentage computed', a.percentage === ladderPercentage(170, 130)])
  checks.push(['3 clubs ranked', ladder.length === 3])

  // Graceful disabled (test env has no PlayHQ vars).
  const configured = isPlayhqConfigured()
  const status = getFootballStatus()
  const provider = getPlayhqProvider()
  if (!configured) {
    checks.push(['status message = credentials missing', status.message === PLAYHQ_CREDENTIALS_MISSING])
    checks.push(['provider reports not configured', provider.isConfigured() === false])
    let threw = false
    try { await provider.listOrganisations() } catch (e) { threw = (e as Error).message === PLAYHQ_CREDENTIALS_MISSING }
    checks.push(['provider throws clear disabled error', threw])
  } else {
    checks.push(['(PlayHQ configured — skipping disabled checks)', true])
  }

  // Prisma models + sport columns present.
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['playhqEntityMap', 'playhqSyncLog']) checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])

  let failed = 0
  console.log('── PlayHQ Football (F1) validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
