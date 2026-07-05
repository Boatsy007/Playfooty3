/**
 * Quality-engine audit helper (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Every merge, flag, correction or validation action is written to the existing
 * AuditLog (source = QUALITY). Best-effort — auditing never throws into callers.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export async function logQualityAction(
  action: string,
  entityType: string,
  entityId: string | null,
  after: unknown,
  opts: { before?: unknown; reason?: string; performedBy?: string } = {},
): Promise<void> {
  try {
    const u = await prisma.adminUser.upsert({
      where:  { email: 'admin@cnca.local' },
      create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' },
      update: {},
    })
    await prisma.auditLog.create({
      data: {
        userId: u.id, action, entityType, entityId,
        before: opts.before ? JSON.stringify(opts.before) : null,
        after: after ? JSON.stringify(after) : null,
        source: 'QUALITY', reason: opts.reason ?? null,
      },
    })
  } catch (e) { logger.warn('quality audit failed', { detail: String(e), action }) }
}
