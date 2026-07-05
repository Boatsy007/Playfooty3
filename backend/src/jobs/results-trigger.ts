/**
 * CLI trigger for the Phase B5 results & fixtures engine.
 *
 * Usage:
 *   tsx src/jobs/results-trigger.ts                 # bridge + stats + insights + articles (current season)
 *   tsx src/jobs/results-trigger.ts --season=2026
 *   tsx src/jobs/results-trigger.ts --no-bridge     # skip the legacy-matches bridge
 *   tsx src/jobs/results-trigger.ts --no-articles   # skip match-article drafts
 */

import { prisma } from '../db/client.js'
import { runResultsEngine } from '../results/index.js'
import { logger } from '../utils/logger.js'

const has = (f: string) => process.argv.includes(`--${f}`)
const val = (n: string) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : undefined }

async function main() {
  const report = await runResultsEngine({ season: val('season'), bridge: !has('no-bridge'), generateArticles: !has('no-articles') })
  console.log('\n═══ RESULTS ENGINE ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Results trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
