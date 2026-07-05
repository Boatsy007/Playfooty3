/**
 * Commercial engine orchestrator (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds defaults (tiers + inventory) and runs the expiry/renewal sweep. Additive
 * and idempotent; the only writes are into the B8 tables + audit logs. Nothing
 * is ever deleted (sweep only transitions status).
 */

import { seedTiers } from './tiers.service.js'
import { seedInventory } from './inventory.service.js'
import { sweepExpiredSponsorships } from './sponsorships.service.js'
import { logCommercialAction } from './audit.js'
import { logger } from '../utils/logger.js'

export interface CommercialSweepReport { tiersSeeded: number; inventorySeeded: number; expired: number; renewalDue: number }

export async function runCommercialSweep(opts: { seed?: boolean; performedBy?: string } = {}): Promise<CommercialSweepReport> {
  const report: CommercialSweepReport = { tiersSeeded: 0, inventorySeeded: 0, expired: 0, renewalDue: 0 }
  if (opts.seed !== false) {
    report.tiersSeeded = (await seedTiers()).seeded
    report.inventorySeeded = (await seedInventory()).seeded
  }
  const sweep = await sweepExpiredSponsorships(opts.performedBy ?? 'SYSTEM')
  report.expired = sweep.expired
  report.renewalDue = sweep.renewalDue
  await logCommercialAction('COMMERCIAL_SWEEP', 'System', null, report, { reason: 'commercial sweep', performedBy: opts.performedBy })
  logger.info('Commercial sweep complete', { ...report })
  return report
}
