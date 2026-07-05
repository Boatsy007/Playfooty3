/**
 * Notifications & Automation Engine orchestrator (Phase B9).
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the notification rules (idempotent) and runs the automation scan. The
 * only writes are into the B9 tables; nothing existing is modified.
 */

import { seedNotificationRules } from './notify.js'
import { runAutomationScan, type ScanReport } from './automation.js'
import { logger } from '../utils/logger.js'

export interface EngineReport { rulesSeeded: number; scan: ScanReport }

export async function runNotificationEngine(opts: { seed?: boolean; sections?: string[] } = {}): Promise<EngineReport> {
  const rulesSeeded = opts.seed === false ? 0 : (await seedNotificationRules()).seeded
  const scan = await runAutomationScan({ sections: opts.sections })
  logger.info('Notification engine run complete', { rulesSeeded, created: scan.created })
  return { rulesSeeded, scan }
}
