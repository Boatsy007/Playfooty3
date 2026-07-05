/**
 * Duplicate detection (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds likely duplicates across the database and (optionally) raises deduped
 * ReviewItems so an operator can confirm or merge them. It never mutates data —
 * detection only. Covers:
 *
 *   • duplicate clubs in the SAME league (canonical-key collision)
 *   • the SAME club across DIFFERENT leagues (same canonical key, many leagues)
 *   • duplicate leagues by similar name (canonical league key)
 *   • the SAME league imported from MULTIPLE sources (shared PlayHQ slug/grade or
 *     ladder/source URL)
 */

import { prisma } from '../db/client.js'
import { canonicalClubKey } from '../validation/club-identity.js'
import { logger } from '../utils/logger.js'

export interface DuplicateCandidate {
  kind: 'DUPLICATE_CLUB' | 'SAME_CLUB_MULTI_LEAGUE' | 'DUPLICATE_LEAGUE' | 'DUPLICATE_LEAGUE_SOURCE'
  key: string
  entityType: 'Club' | 'League'
  ids: string[]
  names: string[]
  context?: string
  confidence: number
}

export interface DuplicateReport {
  duplicateClubs: DuplicateCandidate[]
  sameClubMultiLeague: DuplicateCandidate[]
  duplicateLeagues: DuplicateCandidate[]
  duplicateLeagueSources: DuplicateCandidate[]
  raised: number
  skippedExisting: number
}

const leagueKey = (name: string) => name.toLowerCase().replace(/&/g, ' and ').replace(/\b(a grade|senior|womens?|women's|netball|competition|league|association|inc)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

async function raise(entityType: string, entityId: string | null, kind: string, reason: string, confidence: number, payload: unknown, r: DuplicateReport): Promise<void> {
  const existing = await prisma.reviewItem.findFirst({ where: { entityType, entityId, kind, status: 'PENDING' }, select: { id: true } })
  if (existing) { r.skippedExisting++; return }
  await prisma.reviewItem.create({ data: { entityType, entityId, kind, reason, confidence, payload: payload ? JSON.stringify(payload) : null } })
  r.raised++
}

/** Detect duplicates. Pass { raiseReviews: true } to populate the review queue. */
export async function detectDuplicates(opts: { raiseReviews?: boolean } = {}): Promise<DuplicateReport> {
  const report: DuplicateReport = { duplicateClubs: [], sameClubMultiLeague: [], duplicateLeagues: [], duplicateLeagueSources: [], raised: 0, skippedExisting: 0 }

  // ── Clubs: within-league duplicates + same-club-across-leagues ─────────────
  const memberships = await prisma.clubLeagueSeason.findMany({
    where: { isActive: true, club: { isActive: true, archivedAt: null } },
    select: { leagueId: true, club: { select: { id: true, name: true, manualOverride: true } }, league: { select: { name: true } } },
  })
  // group by league → canonical key
  const perLeague = new Map<string, Map<string, { id: string; name: string }[]>>()
  // group club canonical key → set of leagues (for cross-league)
  const keyToClubs = new Map<string, Map<string, { clubId: string; name: string; leagueName: string }>>()
  for (const m of memberships) {
    const key = canonicalClubKey(m.club.name)
    if (!key) continue
    const lg = perLeague.get(m.leagueId) ?? new Map()
    lg.set(key, [...(lg.get(key) ?? []), { id: m.club.id, name: m.club.name }])
    perLeague.set(m.leagueId, lg)

    const clubs = keyToClubs.get(key) ?? new Map()
    clubs.set(m.club.id, { clubId: m.club.id, name: m.club.name, leagueName: m.league.name })
    keyToClubs.set(key, clubs)
  }
  for (const [, byKey] of perLeague) {
    for (const [key, group] of byKey) {
      const uniq = [...new Map(group.map(g => [g.id, g])).values()]
      if (uniq.length < 2) continue
      report.duplicateClubs.push({ kind: 'DUPLICATE_CLUB', key, entityType: 'Club', ids: uniq.map(u => u.id), names: uniq.map(u => u.name), confidence: 0.75 })
    }
  }
  for (const [key, clubs] of keyToClubs) {
    if (clubs.size < 2) continue
    const arr = [...clubs.values()]
    report.sameClubMultiLeague.push({ kind: 'SAME_CLUB_MULTI_LEAGUE', key, entityType: 'Club', ids: arr.map(a => a.clubId), names: arr.map(a => `${a.name} (${a.leagueName})`), confidence: 0.5, context: 'same canonical club name in multiple leagues — may be a duplicate import or legitimately distinct' })
  }

  // ── Leagues: similar names + multi-source imports ──────────────────────────
  const leagues = await prisma.league.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, playhqOrgSlug: true, playhqGradeId: true, ladderUrl: true, sourceUrl: true, ladderUrlOverride: true, manualOverride: true },
  })
  const byNameKey = new Map<string, { id: string; name: string }[]>()
  const bySource = new Map<string, { id: string; name: string }[]>()
  for (const l of leagues) {
    const nk = leagueKey(l.name)
    if (nk) byNameKey.set(nk, [...(byNameKey.get(nk) ?? []), { id: l.id, name: l.name }])
    // source signatures that should be unique to one league
    const sigs = new Set<string>()
    if (l.playhqOrgSlug && l.playhqGradeId) sigs.add(`playhq:${l.playhqOrgSlug}:${l.playhqGradeId}`)
    for (const u of [l.ladderUrl, l.sourceUrl, l.ladderUrlOverride]) if (u) sigs.add(`url:${u}`)
    for (const s of sigs) bySource.set(s, [...(bySource.get(s) ?? []), { id: l.id, name: l.name }])
  }
  for (const [key, group] of byNameKey) {
    const uniq = [...new Map(group.map(g => [g.id, g])).values()]
    if (uniq.length < 2) continue
    report.duplicateLeagues.push({ kind: 'DUPLICATE_LEAGUE', key, entityType: 'League', ids: uniq.map(u => u.id), names: uniq.map(u => u.name), confidence: 0.7 })
  }
  for (const [sig, group] of bySource) {
    const uniq = [...new Map(group.map(g => [g.id, g])).values()]
    if (uniq.length < 2) continue
    report.duplicateLeagueSources.push({ kind: 'DUPLICATE_LEAGUE_SOURCE', key: sig, entityType: 'League', ids: uniq.map(u => u.id), names: uniq.map(u => u.name), confidence: 0.9, context: `${uniq.length} leagues share the same source signature` })
  }

  if (opts.raiseReviews) {
    for (const c of report.duplicateClubs) await raise('Club', c.ids[0], c.kind, `Likely duplicate clubs (${c.key}): ${c.names.join(' vs ')} — merge or confirm distinct.`, c.confidence, c, report)
    for (const c of report.sameClubMultiLeague) await raise('Club', c.ids[0], c.kind, `Same club name across leagues: ${c.names.join(' · ')}. ${c.context}`, c.confidence, c, report)
    for (const c of report.duplicateLeagues) await raise('League', c.ids[0], c.kind, `Likely duplicate leagues: ${c.names.join(' vs ')} — merge or confirm distinct.`, c.confidence, c, report)
    for (const c of report.duplicateLeagueSources) await raise('League', c.ids[0], c.kind, `Leagues share a source signature (${c.key}): ${c.names.join(' vs ')} — one league imported twice?`, c.confidence, c, report)
  }

  logger.info('Duplicate detection complete', { clubs: report.duplicateClubs.length, crossLeague: report.sameClubMultiLeague.length, leagues: report.duplicateLeagues.length, sources: report.duplicateLeagueSources.length, raised: report.raised })
  return report
}
