/**
 * CLI trigger for the Phase B3 newsroom.
 *
 * Usage:
 *   tsx src/jobs/newsroom-trigger.ts             # run for the latest ranking run
 *   tsx src/jobs/newsroom-trigger.ts --force     # regenerate even if already run
 *   tsx src/jobs/newsroom-trigger.ts --dry-run   # analyse + detect only, no writes
 *   tsx src/jobs/newsroom-trigger.ts --no-reindex
 */

import { prisma } from '../db/client.js'
import { runNewsroom } from '../newsroom/index.js'
import { logger } from '../utils/logger.js'

const has = (f: string) => process.argv.includes(`--${f}`)

async function main() {
  const report = await runNewsroom({ force: has('force'), dryRun: has('dry-run'), reindex: !has('no-reindex') })
  console.log('\n═══ NEWSROOM ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Newsroom trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
