/**
 * Nightly maintenance — automatic backup + data-quality sweep.
 * Run by .github/workflows/nightly-maintenance.yml (cron) or by hand:
 *   tsx src/jobs/nightly-maintenance.ts
 */

import { prisma } from '../db/client.js'
import { createBackup } from './backup.js'
import { sweepDataQuality } from './data-quality.js'

async function main() {
  console.log('═══ NIGHTLY MAINTENANCE ═══')

  const backup = await createBackup('NIGHTLY')
  console.log(`Backup ${backup.id}: ${Object.entries(backup.counts).map(([k, v]) => `${k}=${v}`).join(' ')}`)

  const sweep = await sweepDataQuality()
  console.log(`Quality sweep: ${sweep.duplicateClubs} duplicate group(s), ${sweep.missingLogos} missing logo(s), ${sweep.orphanClubs} orphan club(s), ${sweep.staleLeagues} stale league(s)`)
  console.log(`Review queue: ${sweep.raised} new item(s) raised, ${sweep.skippedExisting} already pending`)

  const pending = await prisma.reviewItem.count({ where: { status: 'PENDING' } })
  console.log(`Pending reviews now: ${pending}`)
  console.log('═══ DONE ═══')
  await prisma.$disconnect()
}

main().catch(async e => { console.error('Nightly maintenance failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
