/**
 * CLI trigger for the Phase B6 historical rankings & records engine.
 *
 * Usage:
 *   tsx src/jobs/history-trigger.ts            # archive latest run + rebuild histories + records
 *   tsx src/jobs/history-trigger.ts --run=<id> # archive a specific ranking run
 */

import { prisma } from '../db/client.js'
import { runHistoryEngine } from '../history/index.js'
import { logger } from '../utils/logger.js'

const val = (n: string) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : undefined }

async function main() {
  const report = await runHistoryEngine({ runId: val('run') })
  console.log('\n═══ HISTORY ENGINE ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('History trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
