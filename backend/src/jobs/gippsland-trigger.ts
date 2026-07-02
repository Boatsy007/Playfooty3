/**
 * CLI trigger for the Gippsland League PlayHQ scrape job.
 *
 * Usage:
 *   tsx src/jobs/gippsland-trigger.ts --url=<playhq-ladder-url>
 *   tsx src/jobs/gippsland-trigger.ts --url=<url> --week=2026-W28
 *
 * Or after build:
 *   node dist/jobs/gippsland-trigger.js --url=<url>
 *
 * The --url argument is the full PlayHQ ladder URL for the Gippsland League
 * A Grade Netball 2026 season. Find it at https://www.playhq.com
 */

import { runGippslandScrape } from './gippsland-scrape.js'

const urlArg  = process.argv.find(a => a.startsWith('--url='))?.split('=').slice(1).join('=')
const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]
const envUrl  = process.env.GIPPSLAND_PLAYHQ_URL

const ladderUrl = urlArg ?? envUrl

if (!ladderUrl) {
  console.error('ERROR: No PlayHQ ladder URL provided.')
  console.error('')
  console.error('Usage: tsx src/jobs/gippsland-trigger.ts --url=<playhq-ladder-url>')
  console.error('')
  console.error('To find the URL:')
  console.error('  1. Open https://www.playhq.com in your browser')
  console.error('  2. Search for "Gippsland League" or browse AFL Victoria associations')
  console.error('  3. Select "Gippsland League 2026" → "A Grade Netball" → "Ladder" tab')
  console.error('  4. Copy the URL from your browser address bar')
  console.error('')
  console.error('Or set GIPPSLAND_PLAYHQ_URL env var.')
  process.exit(1)
}

console.log(`Starting Gippsland League scrape from: ${ladderUrl}`)
console.log('')

runGippslandScrape({ ladderUrl, weekLabel: weekArg })
  .then(result => {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.status === 'SUCCESS' ? 0 : 1)
  })
  .catch(err => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })
