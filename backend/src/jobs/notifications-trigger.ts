/**
 * CLI trigger for the Phase B9 notifications & automation engine.
 *
 * Usage:
 *   tsx src/jobs/notifications-trigger.ts               # seed rules + full scan
 *   tsx src/jobs/notifications-trigger.ts --no-seed     # scan only
 *   tsx src/jobs/notifications-trigger.ts --sections=RANKINGS,CLAIMS
 */

import { prisma } from '../db/client.js'
import { runNotificationEngine } from '../notifications/index.js'
import { logger } from '../utils/logger.js'

const has = (f: string) => process.argv.includes(`--${f}`)
const val = (n: string) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : undefined }

async function main() {
  const sections = val('sections')?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  const report = await runNotificationEngine({ seed: !has('no-seed'), sections })
  console.log('\n═══ NOTIFICATION ENGINE ═══')
  console.log(JSON.stringify(report, null, 2))
  await prisma.$disconnect()
}

main().catch(async e => { logger.error('Notifications trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
