/**
 * Commercial audit helper (Phase B8).
 * ─────────────────────────────────────────────────────────────────────────────
 * Every commercial action (create/update/approve/reject/expire/book) is written
 * to the existing AuditLog with source = COMMERCIAL. Best-effort; never throws.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export async function logCommercialAction(
  action: string,
  entityType: string,
  entityId: string | null,
  after: unknown,
  opts: { before?: unknown; reason?: string; performedBy?: string } = {},
): Promise<void> {
  try {
    const u = await prisma.adminUser.upsert({
      where: { email: 'admin@cnca.local' },
      create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' },
      update: {},
    })
    await prisma.auditLog.create({
      data: {
        userId: u.id, action, entityType, entityId,
        before: opts.before ? JSON.stringify(opts.before) : null,
        after: after ? JSON.stringify(after) : null,
        source: 'COMMERCIAL', reason: opts.reason ?? null,
      },
    })
  } catch (e) { logger.warn('commercial audit failed', { detail: String(e), action }) }
}
