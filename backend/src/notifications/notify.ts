/**
 * Notification emitter (Phase B9).
 * ─────────────────────────────────────────────────────────────────────────────
 * The single entry point to raise a notification. It resolves the type's rule
 * (category / severity / recipient / channels), honours per-recipient
 * preferences (opt-out → SUPPRESSED), and dedupes on a stable key so the same
 * alert is never raised twice. Other engines/services call `notify()`; nothing
 * here modifies any existing engine.
 */

import { prisma } from '../db/client.js'
import { TYPE_BY_KEY, VALID_TYPES, NOTIFICATION_TYPES } from './types.js'
import { logger } from '../utils/logger.js'

export interface NotifyInput {
  type: string
  title: string
  body?: string
  recipientScope?: string
  recipientId?: string | null
  entityType?: string
  entityId?: string
  data?: unknown
  channel?: string
  dedupeKey: string   // stable — prevents duplicate alerts
  severity?: string
}

export interface NotifyResult { created: boolean; id?: string; suppressed?: boolean; reason?: string }

/** Seed the default NotificationRule per type (idempotent). */
export async function seedNotificationRules(): Promise<{ seeded: number }> {
  let seeded = 0
  for (const t of NOTIFICATION_TYPES) {
    await prisma.notificationRule.upsert({
      where: { type: t.type },
      create: { type: t.type, label: t.label, category: t.category, severity: t.severity, recipientScope: t.recipientScope },
      update: { label: t.label, category: t.category },
    })
    seeded++
  }
  return { seeded }
}

/** Raise one notification (deduped + preference-aware). */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  if (!VALID_TYPES.has(input.type)) return { created: false, reason: `unknown type ${input.type}` }

  // Dedupe: same key → do not raise again.
  const existing = await prisma.notification.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true } })
  if (existing) return { created: false, id: existing.id, reason: 'duplicate' }

  const def = TYPE_BY_KEY.get(input.type)!
  const rule = await prisma.notificationRule.findUnique({ where: { type: input.type } }).catch(() => null)
  if (rule && !rule.enabled) return { created: false, suppressed: true, reason: 'rule disabled' }

  const recipientScope = input.recipientScope ?? rule?.recipientScope ?? def.recipientScope
  const channel = input.channel ?? 'IN_APP'
  const severity = input.severity ?? rule?.severity ?? def.severity

  // Preference check (opt-out) when we have a concrete recipient.
  let status = 'PENDING'
  if (input.recipientId) {
    const pref = await prisma.notificationPreference.findUnique({
      where: { recipientScope_recipientId_type_channel: { recipientScope, recipientId: input.recipientId, type: input.type, channel } },
    }).catch(() => null)
    if (pref && !pref.enabled) status = 'SUPPRESSED'
  }

  const n = await prisma.notification.create({
    data: {
      recipientScope, recipientId: input.recipientId ?? null, type: input.type, category: rule?.category ?? def.category,
      severity, title: input.title, body: input.body ?? null, entityType: input.entityType ?? null, entityId: input.entityId ?? null,
      data: input.data ? JSON.stringify(input.data) : null, channel, status, dedupeKey: input.dedupeKey,
    },
  })
  return { created: status !== 'SUPPRESSED', id: n.id, suppressed: status === 'SUPPRESSED' }
}

/** Mark a notification read (idempotent). */
export async function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { status: 'READ', readAt: new Date() } }).catch(() => null)
}

/** Mark pending in-app notifications as delivered (no external transport yet). */
export async function markDelivered(ids: string[]) {
  if (ids.length === 0) return { count: 0 }
  const r = await prisma.notification.updateMany({ where: { id: { in: ids }, status: { in: ['PENDING', 'QUEUED'] } }, data: { status: 'DELIVERED', sentAt: new Date() } })
  logger.info('Notifications marked delivered', { count: r.count })
  return { count: r.count }
}
