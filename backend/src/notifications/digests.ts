/**
 * Digest engine (Phase B9b).
 * ─────────────────────────────────────────────────────────────────────────────
 * Assembles digests from real data and stores them. NOTHING is sent — digests
 * are recorded as DRY_RUN (or DRAFT) unless a real transport is configured, so
 * this is safe to run any time. Kinds: daily admin, weekly rankings, weekly club,
 * weekly league.
 */

import { prisma } from '../db/client.js'
import type { DigestKind } from './types.js'
import { logger } from '../utils/logger.js'

export interface DigestResult { kind: DigestKind; itemCount: number; content: unknown; id: string; dryRun: boolean }

function period(kind: DigestKind): { start: Date; end: Date } {
  const end = new Date()
  const days = kind === 'DAILY_ADMIN' ? 1 : 7
  return { start: new Date(end.getTime() - days * 24 * 60 * 60 * 1000), end }
}

/** Build (and store) one digest. dryRun (default true) never dispatches. */
export async function generateDigest(kind: DigestKind, opts: { dryRun?: boolean; recipientScope?: string; recipientId?: string } = {}): Promise<DigestResult> {
  const dryRun = opts.dryRun !== false
  const { start, end } = period(kind)
  let content: unknown = {}
  let itemCount = 0

  if (kind === 'DAILY_ADMIN') {
    const [notifications, byCategory, reviews, failedSyncs, expiringSponsors] = await Promise.all([
      prisma.notification.findMany({ where: { createdAt: { gte: start } }, orderBy: { createdAt: 'desc' }, take: 100, select: { type: true, title: true, severity: true, createdAt: true } }),
      prisma.notification.groupBy({ by: ['category'], where: { createdAt: { gte: start } }, _count: { category: true } }),
      prisma.reviewItem.count({ where: { status: 'PENDING' } }),
      prisma.league.count({ where: { isActive: true, archivedAt: null, syncError: { not: null } } }),
      prisma.sponsorship.count({ where: { deletedAt: null, status: 'RENEWAL_DUE' } }).catch(() => 0),
    ])
    itemCount = notifications.length
    content = { headline: `${notifications.length} events in the last 24h`, byCategory: Object.fromEntries(byCategory.map(c => [c.category ?? 'Unknown', c._count.category])), pendingReviews: reviews, failedSyncs, expiringSponsors, recent: notifications.slice(0, 25) }
  } else if (kind === 'WEEKLY_RANKINGS') {
    const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
    if (run) {
      const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
      const risers = entries.filter(e => e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 5)
      const fallers = entries.filter(e => e.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement).slice(0, 5)
      itemCount = entries.length
      content = { weekLabel: run.weekLabel, leader: entries[0] ? { clubName: entries[0].clubName, rating: entries[0].powerRating } : null, top10: entries.slice(0, 10).map(e => ({ rank: e.rank, clubName: e.clubName })), risers: risers.map(e => ({ clubName: e.clubName, up: e.rankMovement, rank: e.rank })), fallers: fallers.map(e => ({ clubName: e.clubName, down: e.rankMovement, rank: e.rank })) }
    }
  } else if (kind === 'WEEKLY_CLUB') {
    const notes = await prisma.notification.findMany({ where: { category: 'CLUB', createdAt: { gte: start } }, orderBy: { createdAt: 'desc' }, take: 200, select: { recipientId: true, type: true, title: true } })
    itemCount = notes.length
    content = { headline: `${notes.length} club events this week`, items: notes }
  } else if (kind === 'WEEKLY_LEAGUE') {
    const notes = await prisma.notification.findMany({ where: { category: 'LEAGUE', createdAt: { gte: start } }, orderBy: { createdAt: 'desc' }, take: 200, select: { recipientId: true, type: true, title: true } })
    itemCount = notes.length
    content = { headline: `${notes.length} league events this week`, items: notes }
  }

  const row = await prisma.notificationDigest.create({
    data: { kind, recipientScope: opts.recipientScope ?? 'ADMIN', recipientId: opts.recipientId ?? null, periodStart: start, periodEnd: end, itemCount, content: JSON.stringify(content), status: dryRun ? 'DRY_RUN' : 'DRAFT', dryRun },
  })
  logger.info('Digest generated', { kind, itemCount, dryRun })
  return { kind, itemCount, content, id: row.id, dryRun }
}
