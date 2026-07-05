/**
 * Notification reporting + reads (Phase B9).
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only listing + summary counts for notifications.
 */

import { prisma } from '../db/client.js'

export async function listNotifications(opts: { recipientScope?: string; recipientId?: string; type?: string; category?: string; status?: string; unreadOnly?: boolean; limit?: number } = {}) {
  return prisma.notification.findMany({
    where: {
      ...(opts.recipientScope ? { recipientScope: opts.recipientScope } : {}),
      ...(opts.recipientId ? { recipientId: opts.recipientId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.unreadOnly ? { status: { notIn: ['READ', 'SUPPRESSED'] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(opts.limit ?? 200, 1000),
  })
}

export async function notificationSummary() {
  const [total, unread, byCategory, bySeverity, lastScan] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { status: { notIn: ['READ', 'SUPPRESSED'] } } }),
    prisma.notification.groupBy({ by: ['category'], _count: { category: true } }),
    prisma.notification.groupBy({ by: ['severity'], _count: { severity: true } }),
    prisma.automationRun.findFirst({ orderBy: { ranAt: 'desc' } }),
  ])
  return {
    total, unread,
    byCategory: Object.fromEntries(byCategory.map(c => [c.category ?? 'Unknown', c._count.category])),
    bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count.severity])),
    lastScan,
  }
}
