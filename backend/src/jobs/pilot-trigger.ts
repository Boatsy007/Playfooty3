/**
 * CLI entry point for the NGFNL 2026 pilot seed job.
 * Usage: node dist/jobs/pilot-trigger.js [--week 2026-W27]
 */

import { runNGFNLPilot } from './pilot.js'

const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]

runNGFNLPilot(weekArg).then(result => {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'SUCCESS' ? 0 : 1)
}).catch(err => {
  console.error('Pilot trigger failed:', err)
  process.exit(1)
})
