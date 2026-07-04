/**
 * Data-quality sweep (Phase 5) — feeds the review queue
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans the core data for problems an operator should look at and raises
 * ReviewItems for each:
 *
 *   • DUPLICATE_CLUB — two active clubs in the SAME league whose names collapse
 *     to the same canonical key ("Churchill FNC" vs "Churchill Cougars").
 *     Cross-association same-names are NOT flagged (legitimately different).
 *   • MISSING_LOGO   — active, approved clubs with no logo.
 *   • ORPHAN_CLUB    — active clubs that belong to no league at all.
 *   • STALE_LEAGUE   — active leagues whose last sync/manual update is >21 days
 *     old (data may be drifting out of date).
 *
 * Idempotent: an item is only raised when there is no PENDING item of the same
 * kind for the same entity, so re-running the sweep never floods the queue.
 * The sweep never mutates the data itself — it only asks for review.
 */

import { prisma } from '../db/client.js'
import { canonicalClubKey } from '../validation/club-identity.js'
import { logger } from '../utils/logger.js'

export interface SweepReport {
  duplicateClubs: number
  missingLogos:   number
  orphanClubs:    number
  staleLeagues:   number
  raised:         number   // new ReviewItems actually created (post-dedup)
  skippedExisting: number  // already pending — not re-raised
}

const STALE_DAYS = 21

/** Raise a ReviewItem unless an identical PENDING one already exists. */
async function raise(entityType: string, entityId: string | null, kind: string, reason: string, confidence: number | null, payload: unknown, report: SweepReport): Promise<void> {
  const existing = await prisma.reviewItem.findFirst({ where: { entityType, entityId, kind, status: 'PENDING' }, select: { id: true } })
  if (existing) { report.skippedExisting++; return }
  await prisma.reviewItem.create({ data: { entityType, entityId, kind, reason, confidence, payload: payload ? JSON.stringify(payload) : null } })
  report.raised++
}

export async function sweepDataQuality(): Promise<SweepReport> {
  const report: SweepReport = { duplicateClubs: 0, missingLogos: 0, orphanClubs: 0, staleLeagues: 0, raised: 0, skippedExisting: 0 }

  // ── Duplicate clubs (within the same league) ───────────────────────────────
  const memberships = await prisma.clubLeagueSeason.findMany({
    where:  { isActive: true, club: { isActive: true, archivedAt: null } },
    select: { leagueId: true, club: { select: { id: true, name: true } }, league: { select: { name: true } } },
  })
  const byLeague = new Map<string, { leagueName: string; clubs: { id: string; name: string }[] }>()
  for (const m of memberships) {
    const g = byLeague.get(m.leagueId) ?? { leagueName: m.league.name, clubs: [] }
    if (!g.clubs.some(c => c.id === m.club.id)) g.clubs.push(m.club)
    byLeague.set(m.leagueId, g)
  }
  for (const [leagueId, g] of byLeague) {
    const byKey = new Map<string, { id: string; name: string }[]>()
    for (const c of g.clubs) {
      const key = canonicalClubKey(c.name)
      byKey.set(key, [...(byKey.get(key) ?? []), c])
    }
    for (const [key, group] of byKey) {
      if (group.length < 2 || !key) continue
      report.duplicateClubs++
      await raise(
        'Club', group[0].id, 'DUPLICATE_CLUB',
        `Likely duplicates in ${g.leagueName}: ${group.map(c => `"${c.name}"`).join(' vs ')} — merge or confirm they are distinct.`,
        0.75,
        { leagueId, canonicalKey: key, clubIds: group.map(c => c.id), clubNames: group.map(c => c.name) },
        report,
      )
    }
  }

  // ── Missing logos ──────────────────────────────────────────────────────────
  const noLogo = await prisma.club.findMany({
    where:  { isActive: true, archivedAt: null, approvalStatus: 'APPROVED', OR: [{ logoUrl: null }, { logoUrl: '' }] },
    select: { id: true, name: true },
  })
  report.missingLogos = noLogo.length
  for (const c of noLogo) {
    await raise('Club', c.id, 'MISSING_LOGO', `"${c.name}" has no logo — upload one or confirm none exists.`, null, { clubName: c.name }, report)
  }

  // ── Orphan clubs (no league membership at all) ─────────────────────────────
  const orphans = await prisma.club.findMany({
    where:  { isActive: true, archivedAt: null, leagueSeasons: { none: {} } },
    select: { id: true, name: true },
  })
  report.orphanClubs = orphans.length
  for (const c of orphans) {
    await raise('Club', c.id, 'ORPHAN_CLUB', `"${c.name}" belongs to no league — assign it, merge it, or archive it.`, null, { clubName: c.name }, report)
  }

  // ── Stale leagues (no sync or manual update for STALE_DAYS) ────────────────
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  const stale = await prisma.league.findMany({
    where: {
      isActive: true, enabled: true, archivedAt: null,
      AND: [
        { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] },
        { OR: [{ lastManualUpdateAt: null }, { lastManualUpdateAt: { lt: cutoff } }] },
      ],
    },
    select: { id: true, name: true, lastSyncedAt: true, lastManualUpdateAt: true },
  })
  report.staleLeagues = stale.length
  for (const l of stale) {
    const last = l.lastSyncedAt ?? l.lastManualUpdateAt
    await raise('League', l.id, 'STALE_LEAGUE', `"${l.name}" has not been updated ${last ? `since ${last.toISOString().slice(0, 10)}` : 'at all'} — sync it or confirm the season is over.`, null, { leagueName: l.name }, report)
  }

  logger.info('DataQuality: sweep complete', { ...report })
  return report
}
