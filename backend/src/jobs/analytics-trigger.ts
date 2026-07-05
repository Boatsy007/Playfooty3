/**
 * CLI trigger for the Phase B11 analytics aggregation.
 *
 * Usage:
 *   tsx src/jobs/analytics-trigger.ts             # run aggregation
 *   tsx src/jobs/analytics-trigger.ts --purge=400 # retention purge (raw >400 days)
 */

import { prisma } from '../db/client.js'
import { runAnalyticsEngine, purgeOldRawData } from '../analytics/index.js'
import { logger } from '../utils/logger.js'

const val = (n: string) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : undefined }

async function main() {
  const purge = val('purge')
  if (purge) console.log('Purge:', JSON.stringify(await purgeOldRawData(parseInt(purge, 10))))
  const report = await runAnalyticsEngine()
  console.log('\n═══ ANALYTICS AGGREGATION ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Analytics trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
