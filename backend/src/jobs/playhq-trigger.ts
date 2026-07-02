/**
 * CLI trigger for the PlayHQ multi-league scrape + rank job.
 *
 * Usage:
 *   tsx src/jobs/playhq-trigger.ts
 *   tsx src/jobs/playhq-trigger.ts --week=2026-W28
 *
 * Scrapes every league in LEAGUE_CONFIGS (playhq-scrape.ts) and produces one
 * combined ranking. Ladder URLs come from each league's config (or its env
 * var override).
 */

import { runAllPlayHQScrapes } from './playhq-scrape.js'

const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]

runAllPlayHQScrapes({ weekLabel: weekArg })
  .then(result => {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.status === 'SUCCESS' ? 0 : 1)
  })
  .catch(err => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })
