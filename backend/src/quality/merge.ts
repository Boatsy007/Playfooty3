/**
 * Safe merge support (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Merges a duplicate club/league INTO a surviving one WITHOUT destroying history:
 *   • current data (memberships, matches, sources, name variants) is repointed
 *     to the target; conflicting rows are archived, never deleted
 *   • the source record is soft-archived (archivedAt + note), never deleted
 *   • the source's name becomes a ClubAlias/NameVariant of the target
 *   • historical ranking rows (ranking_entries / ranking_snapshots) are LEFT
 *     UNTOUCHED — merging must not rewrite ranking history
 *   • a reversible MergeRecord snapshot + an AuditLog entry are written
 *
 * Guards: a verified or manualOverride SOURCE is not merged silently (needs
 * force); the TARGET's own fields are never overwritten.
 */

import { prisma } from '../db/client.js'
import { logQualityAction } from './audit.js'
import { logger } from '../utils/logger.js'

const normalize = (s: string) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '')

export interface MergeResult {
  ok: boolean
  status: number
  error?: string
  mergeRecordId?: string
  movedCounts?: Record<string, number>
}

export async function mergeClubs(sourceId: string, targetId: string, opts: { reason?: string; performedBy?: string; force?: boolean } = {}): Promise<MergeResult> {
  if (sourceId === targetId) return { ok: false, status: 400, error: 'source and target are the same club' }
  const [source, target] = await Promise.all([
    prisma.club.findUnique({ where: { id: sourceId } }),
    prisma.club.findUnique({ where: { id: targetId } }),
  ])
  if (!source || !target) return { ok: false, status: 404, error: 'source or target club not found' }
  if (source.archivedAt) return { ok: false, status: 409, error: 'source club is already archived/merged' }

  // Guard: don't silently merge away a verified / manually-owned source.
  const sourceProfile = await prisma.clubProfile.findUnique({ where: { clubId: sourceId }, select: { verified: true } }).catch(() => null)
  if (!opts.force && (source.manualOverride || sourceProfile?.verified)) {
    return { ok: false, status: 409, error: 'source club is verified or manually overridden — pass force to merge it' }
  }

  const movedCounts: Record<string, number> = { seasonsRepointed: 0, seasonsArchived: 0, matchesRepointed: 0, variantsRepointed: 0 }
  const snapshot = { club: source }

  await prisma.$transaction(async (tx) => {
    // Memberships (unique on clubId+leagueId+season+grade → repoint or archive conflicts)
    const srcSeasons = await tx.clubLeagueSeason.findMany({ where: { clubId: sourceId } })
    const tgtSeasons = await tx.clubLeagueSeason.findMany({ where: { clubId: targetId }, select: { leagueId: true, season: true, grade: true } })
    const tgtKeys = new Set(tgtSeasons.map(s => `${s.leagueId}:${s.season}:${s.grade}`))
    for (const s of srcSeasons) {
      const k = `${s.leagueId}:${s.season}:${s.grade}`
      if (tgtKeys.has(k)) { await tx.clubLeagueSeason.update({ where: { id: s.id }, data: { isActive: false } }); movedCounts.seasonsArchived++ }
      else { await tx.clubLeagueSeason.update({ where: { id: s.id }, data: { clubId: targetId } }); movedCounts.seasonsRepointed++ }
    }

    // Matches — no unique constraint, safe to repoint both sides.
    const h = await tx.match.updateMany({ where: { homeClubId: sourceId }, data: { homeClubId: targetId } })
    const a = await tx.match.updateMany({ where: { awayClubId: sourceId }, data: { awayClubId: targetId } })
    movedCounts.matchesRepointed = h.count + a.count

    // Name variants (unique rawName+sourceType → repoint only non-conflicting)
    const srcVariants = await tx.clubNameVariant.findMany({ where: { clubId: sourceId } })
    for (const v of srcVariants) {
      const clash = await tx.clubNameVariant.findFirst({ where: { rawName: v.rawName, sourceType: v.sourceType, NOT: { id: v.id } } })
      if (!clash) { await tx.clubNameVariant.update({ where: { id: v.id }, data: { clubId: targetId } }); movedCounts.variantsRepointed++ }
    }

    // Source name → alias/variant of the target (so future imports resolve correctly).
    await tx.clubAlias.upsert({
      where:  { normalizedAlias: normalize(source.name) },
      create: { alias: source.name, normalizedAlias: normalize(source.name), clubId: targetId, source: 'MERGE', confidence: 0.9 },
      update: { clubId: targetId, source: 'MERGE' },
    }).catch(() => { /* alias may already point elsewhere; leave it */ })

    // Soft-archive the source — never delete.
    await tx.club.update({ where: { id: sourceId }, data: { archivedAt: new Date(), isActive: false, notes: `${source.notes ? source.notes + ' | ' : ''}Merged into ${target.name} (${targetId})` } })
  })

  const record = await prisma.mergeRecord.create({
    data: { entityType: 'CLUB', sourceId, sourceName: source.name, targetId, targetName: target.name, reason: opts.reason ?? null, movedCounts: JSON.stringify(movedCounts), snapshot: JSON.stringify(snapshot), performedBy: opts.performedBy ?? 'admin' },
  })
  await logQualityAction('MERGE_CLUB', 'Club', targetId, { sourceId, targetId, movedCounts }, { before: snapshot, reason: opts.reason ?? `merged ${source.name} → ${target.name}`, performedBy: opts.performedBy })
  logger.info('Clubs merged', { sourceId, targetId, movedCounts })
  return { ok: true, status: 200, mergeRecordId: record.id, movedCounts }
}

export async function mergeLeagues(sourceId: string, targetId: string, opts: { reason?: string; performedBy?: string; force?: boolean } = {}): Promise<MergeResult> {
  if (sourceId === targetId) return { ok: false, status: 400, error: 'source and target are the same league' }
  const [source, target] = await Promise.all([
    prisma.league.findUnique({ where: { id: sourceId } }),
    prisma.league.findUnique({ where: { id: targetId } }),
  ])
  if (!source || !target) return { ok: false, status: 404, error: 'source or target league not found' }
  if (source.archivedAt) return { ok: false, status: 409, error: 'source league is already archived/merged' }
  if (!opts.force && source.manualOverride) return { ok: false, status: 409, error: 'source league is manually overridden — pass force to merge it' }

  const movedCounts: Record<string, number> = { seasonsRepointed: 0, seasonsArchived: 0, matchesRepointed: 0, sourcesRepointed: 0 }
  const snapshot = { league: source }

  await prisma.$transaction(async (tx) => {
    // Memberships (unique clubId+leagueId+season+grade → repoint or archive conflicts)
    const srcSeasons = await tx.clubLeagueSeason.findMany({ where: { leagueId: sourceId } })
    const tgtSeasons = await tx.clubLeagueSeason.findMany({ where: { leagueId: targetId }, select: { clubId: true, season: true, grade: true } })
    const tgtKeys = new Set(tgtSeasons.map(s => `${s.clubId}:${s.season}:${s.grade}`))
    for (const s of srcSeasons) {
      const k = `${s.clubId}:${s.season}:${s.grade}`
      if (tgtKeys.has(k)) { await tx.clubLeagueSeason.update({ where: { id: s.id }, data: { isActive: false } }); movedCounts.seasonsArchived++ }
      else { await tx.clubLeagueSeason.update({ where: { id: s.id }, data: { leagueId: targetId } }); movedCounts.seasonsRepointed++ }
    }
    const m = await tx.match.updateMany({ where: { leagueId: sourceId }, data: { leagueId: targetId } })
    movedCounts.matchesRepointed = m.count
    const src = await tx.leagueSource.updateMany({ where: { leagueId: sourceId }, data: { leagueId: targetId } })
    movedCounts.sourcesRepointed = src.count

    await tx.league.update({ where: { id: sourceId }, data: { archivedAt: new Date(), isActive: false, enabled: false, reviewReason: `Merged into ${target.name} (${targetId})` } })
  })

  const record = await prisma.mergeRecord.create({
    data: { entityType: 'LEAGUE', sourceId, sourceName: source.name, targetId, targetName: target.name, reason: opts.reason ?? null, movedCounts: JSON.stringify(movedCounts), snapshot: JSON.stringify(snapshot), performedBy: opts.performedBy ?? 'admin' },
  })
  await logQualityAction('MERGE_LEAGUE', 'League', targetId, { sourceId, targetId, movedCounts }, { before: snapshot, reason: opts.reason ?? `merged ${source.name} → ${target.name}`, performedBy: opts.performedBy })
  logger.info('Leagues merged', { sourceId, targetId, movedCounts })
  return { ok: true, status: 200, mergeRecordId: record.id, movedCounts }
}
