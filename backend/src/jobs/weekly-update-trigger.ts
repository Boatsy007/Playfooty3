/**
 * CLI trigger for the Weekly Update Engine (Backend Phase B1).
 *
 * Runs the full Monday weekly update. The ladder sync step needs a browser
 * (Playwright/Chromium), so this is dispatched to GitHub Actions via
 * .github/workflows/weekly-update.yml — but it also runs locally.
 *
 * Usage:
 *   tsx src/jobs/weekly-update-trigger.ts                 # full run (sync all + recalc + sweep + drafts)
 *   tsx src/jobs/weekly-update-trigger.ts --no-sync       # skip ladder sync (serverless-safe steps only)
 *   tsx src/jobs/weekly-update-trigger.ts --league=<id>   # sync just one league
 *   tsx src/jobs/weekly-update-trigger.ts --no-backup     # skip the pre-run backup
 *   tsx src/jobs/weekly-update-trigger.ts --dry-run       # plan only, writes nothing
 */

import { prisma }          from '../db/client.js'
import { runWeeklyUpdate } from './weekly-update-engine.js'
import { logger }          from '../utils/logger.js'

function has(flag: string): boolean { return process.argv.includes(`--${flag}`) }
function val(name: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

async function main() {
  const leagueId = val('league')
  const report = await runWeeklyUpdate({
    leagueId,
    sync:           !has('no-sync'),
    backupFirst:    !has('no-backup'),
    recalculate:    !has('no-recalc'),
    sweep:          !has('no-sweep'),
    generateDrafts: !has('no-drafts'),
    dryRun:         has('dry-run'),
    source:         'CLI',
  })

  console.log('\n═══ WEEKLY UPDATE ═══')
  console.log(JSON.stringify(report, null, 2))

  await prisma.$disconnect()
  // Non-zero exit if any step that ran failed, so CI surfaces problems.
  const anyFailed = report.steps.some(s => s.ran && !s.ok)
  if (anyFailed) process.exit(1)
}

main().catch(async e => {
  logger.error('Weekly update trigger failed', { detail: String(e) })
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
