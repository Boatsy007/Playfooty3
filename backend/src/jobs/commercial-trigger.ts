/**
 * CLI trigger for the Phase B8 commercial platform maintenance sweep.
 *
 * Usage:
 *   tsx src/jobs/commercial-trigger.ts            # seed defaults + expiry/renewal sweep
 *   tsx src/jobs/commercial-trigger.ts --no-seed  # sweep only
 */

import { prisma } from '../db/client.js'
import { runCommercialSweep } from '../commercial/index.js'
import { logger } from '../utils/logger.js'

const has = (f: string) => process.argv.includes(`--${f}`)

async function main() {
  const report = await runCommercialSweep({ seed: !has('no-seed'), performedBy: 'CLI' })
  console.log('\n═══ COMMERCIAL SWEEP ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Commercial trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
