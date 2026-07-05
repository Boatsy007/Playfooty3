/**
 * Validation script for the Weekly Update Engine (Backend Phase B1).
 *
 * Runs runWeeklyUpdate({ dryRun: true }) which writes NOTHING — it only reports
 * the plan and the resolved sync targets. This confirms the orchestration wiring
 * and the report shape without mutating any data.
 *
 * Usage: tsx src/jobs/_test-weekly-update.ts
 */

import { prisma }          from '../db/client.js'
import { runWeeklyUpdate } from './weekly-update-engine.js'

async function main() {
  console.log('▶ Weekly Update Engine — dry-run validation (no writes)\n')

  const report = await runWeeklyUpdate({ sync: true, dryRun: true, source: 'VALIDATION' })

  const checks: [string, boolean][] = [
    ['report has weekLabel',        typeof report.weekLabel === 'string' && report.weekLabel.length > 0],
    ['dryRun flag is true',         report.dryRun === true],
    ['no backup was taken',         report.backup === null],
    ['steps array populated',       Array.isArray(report.steps) && report.steps.length === 5],
    ['no step actually ran',        report.steps.every(s => s.ran === false)],
    ['sync targets resolved',       !!report.sync && Array.isArray(report.sync.leagues)],
    ['durationMs is a number',      typeof report.durationMs === 'number'],
  ]

  console.log(JSON.stringify(report, null, 2))
  console.log('\n── checks ──')
  let failed = 0
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`)
    if (!ok) failed++
  }

  await prisma.$disconnect()
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
