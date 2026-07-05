/**
 * CLI trigger for the Phase B4 data-quality & integrity engine.
 *
 * Usage:
 *   tsx src/jobs/quality-trigger.ts                # full run (raise reviews + store health)
 *   tsx src/jobs/quality-trigger.ts --no-raise     # detect only, don't touch the review queue
 *   tsx src/jobs/quality-trigger.ts --no-store     # don't persist a health snapshot
 */

import { prisma } from '../db/client.js'
import { runQualityEngine } from '../quality/index.js'
import { logger } from '../utils/logger.js'

const has = (f: string) => process.argv.includes(`--${f}`)

async function main() {
  const report = await runQualityEngine({ raiseReviews: !has('no-raise'), storeHealth: !has('no-store'), performedBy: 'CLI' })
  console.log('\n═══ DATA QUALITY ENGINE ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Quality trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
