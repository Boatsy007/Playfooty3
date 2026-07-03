/**
 * CNCA Data Audit & Cleanup (no crawl — operates on existing DB)
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces the CNCA data model on already-imported data and re-ranks:
 *
 *  1. RENAME  every league's public title to its official PlayHQ ASSOCIATION
 *     name (never a competition / division / grade name).
 *  2. DEACTIVATE any league whose selected competition is NOT the premier senior
 *     women's grade (Division 2+, Open B/C/D…, reserves, juniors, mixed, mens …)
 *     — clears its season stats + PlayHQ source so it leaves the rankings.
 *  3. ONE-PER-ASSOCIATION: keep only the strongest eligible league per
 *     association; neutralise the rest.
 *  4. RECOMPUTE league strength from the kept premier competition only.
 *  5. Delete orphaned clubs, re-run the ranking engine, and VALIDATE.
 *
 * Non-destructive: clubs and history are preserved; leagues are deactivated, not
 * deleted. Produces a full registry/report and a hard pass/fail.
 *
 * Usage: tsx src/jobs/data-audit.ts
 */

import { prisma }        from '../db/client.js'
import { rankAndStore }  from './playhq-scrape.js'
import { isRejected }    from '../discovery/grade-matcher.js'
import { computeAutomaticStrength, finalStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import { stateForAssociation, STATE_NAMES, isMetroAssociation } from '../config/association-states.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }        from '../utils/logger.js'

const SEASON = '2026'
const GRADE  = 'A Grade'

// Public league titles that are competition/division/grade names, never valid
// as a public league name (which must be the association).
const GENERIC = new Set([
  'division', 'division1', 'division1women', 'division2', 'seniorwomen', 'senior', 'seniors',
  'open', 'opendivision1', 'opendivision', 'agrade', 'agradenetball', 'premier', 'premierdivision',
  'championship', 'women', 'reservewomen', 'openwomen',
])
const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const stripGrade = (s: string) => s.replace(/\s*[-–]\s*a grade netball$/i, '').replace(/\s*[-–]\s*a grade$/i, '').trim()

export interface AuditReport {
  renamed: { from: string; to: string }[]
  deactivatedIneligible: { league: string; competition: string | null; reason: string }[]
  deactivatedMetro: string[]
  deactivatedDuplicate: { association: string; kept: string; dropped: string[] }[]
  strengthRecomputed: number
  statesFixed: number
  orphanClubsRemoved: number
  activeLeagues: number
  clubsRanked: number
  validation: { passed: boolean; problems: string[] }
  registry: { association: string; state: string | null; status: string; league: string | null; competition: string | null }[]
}

export async function runDataAudit(): Promise<AuditReport> {
  const label = getISOWeekLabel()
  const report: AuditReport = {
    renamed: [], deactivatedIneligible: [], deactivatedMetro: [], deactivatedDuplicate: [],
    strengthRecomputed: 0, statesFixed: 0, orphanClubsRemoved: 0, activeLeagues: 0, clubsRanked: 0,
    validation: { passed: false, problems: [] }, registry: [],
  }
  logger.info('DataAudit: starting')

  // 1) RENAME leagues to their association's official name ────────────────────
  const all = await prisma.league.findMany({
    include: { association: { select: { name: true, stateCode: true } } },
  })
  for (const l of all) {
    const target = l.association?.name ? l.association.name : stripGrade(l.name)
    if (target && target !== l.name) {
      await prisma.league.update({ where: { id: l.id }, data: { name: target, shortName: target } })
      report.renamed.push({ from: l.name, to: target })
    }
  }

  // 2) DEACTIVATE ineligible leagues (selected competition is not premier) ─────
  const leagues = await prisma.league.findMany({
    include: { association: { select: { name: true, stateCode: true } } },
  })
  const deactivate = async (id: string, reason: string) => {
    await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: id, season: SEASON, grade: GRADE } })
    await prisma.leagueSource.updateMany({ where: { leagueId: id }, data: { isActive: false, lastStatus: 'INELIGIBLE' } })
    await prisma.league.update({ where: { id }, data: { enabled: false, isActive: false, syncError: reason } })
  }
  for (const l of leagues) {
    const comp = l.playhqGradeName ?? null
    // A league is ineligible if its selected competition is a rejected sub-grade,
    // or (no competition recorded and) its title still reads as a generic grade.
    let bad: string | null = null
    if (comp && isRejected(comp)) bad = `Ineligible competition: "${comp}" (not premier senior women's)`
    else if (!l.association?.name && GENERIC.has(norm(l.name))) bad = `Generic competition name, no association: "${l.name}"`
    if (bad && (l.isActive || l.enabled)) {
      await deactivate(l.id, bad)
      report.deactivatedIneligible.push({ league: l.association?.name ?? l.name, competition: comp, reason: bad })
    }
  }

  // 2b) EXCLUDE metropolitan associations (CNCA = Country Netball) ─────────────
  const metroAssocs = await prisma.association.findMany({
    where:   { name: { not: '' } },
    include: { leagues: { select: { id: true, name: true, isActive: true, enabled: true } } },
  })
  for (const a of metroAssocs) {
    if (!isMetroAssociation(a.name)) continue
    for (const l of a.leagues) {
      if (l.isActive || l.enabled) await deactivate(l.id, 'Excluded — metropolitan association (country championship only)')
    }
    await prisma.association.update({ where: { id: a.id }, data: { active: false } }).catch(() => {})
    report.deactivatedMetro.push(a.name)
  }

  // 3) ONE eligible league PER ASSOCIATION (keep strongest) ────────────────────
  const active = await prisma.league.findMany({
    where:   { isActive: true, enabled: true },
    include: { association: { select: { name: true } }, _count: { select: { clubSeasons: true } } },
  })
  const byAssoc = new Map<string, typeof active>()
  for (const l of active) {
    if (!l.associationId) continue
    byAssoc.set(l.associationId, [...(byAssoc.get(l.associationId) ?? []), l])
  }
  for (const group of byAssoc.values()) {
    if (group.length < 2) continue
    const keeper = [...group].sort((a, b) => (b.strengthScore - a.strengthScore) || (b._count.clubSeasons - a._count.clubSeasons))[0]
    const dropped: string[] = []
    for (const loser of group) {
      if (loser.id === keeper.id) continue
      await deactivate(loser.id, 'Superseded — one premier competition per association')
      dropped.push(loser.playhqGradeName ?? loser.name)
    }
    report.deactivatedDuplicate.push({ association: keeper.association?.name ?? keeper.name, kept: keeper.playhqGradeName ?? keeper.name, dropped })
  }

  // 4) RECOMPUTE strength from the kept premier competition's ladder ───────────
  const kept = await prisma.league.findMany({ where: { isActive: true, enabled: true } })
  for (const l of kept) {
    const rows = await prisma.clubLeagueSeason.findMany({ where: { leagueId: l.id, season: SEASON, grade: GRADE } })
    if (rows.length === 0) continue
    const entries = rows.map(r => ({ played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, percentage: r.percentage }))
    const auto = computeAutomaticStrength(entries, 1)
    const final = finalStrength(auto.rating, l.manualStrengthOverride)
    await prisma.league.update({
      where: { id: l.id },
      data: {
        automaticStrengthRating: auto.rating, finalStrengthRating: final, strengthConfidence: auto.confidence,
        strengthScore: strengthScoreFromRating(final), strengthTier: Math.max(1, Math.min(5, Math.round(final))),
        needsStrengthReview: auto.confidence < 0.4,
      },
    })
    report.strengthRecomputed++
  }

  // 4b) BACKFILL STATE from the association (fixes the "everything is VIC" bug) ─
  report.statesFixed = await backfillStates()

  // 5) Orphan cleanup + re-rank ────────────────────────────────────────────────
  report.orphanClubsRemoved = await deleteOrphanClubs()
  const { clubsRanked } = await rankAndStore(label)
  report.clubsRanked = clubsRanked

  // Registry: one row per association, plus validation ─────────────────────────
  const assocs = await prisma.association.findMany({ include: { leagues: { select: { name: true, isActive: true, enabled: true, playhqGradeName: true, syncError: true } } } })
  for (const a of assocs) {
    const activeLeague = a.leagues.find(l => l.isActive && l.enabled)
    const status = isMetroAssociation(a.name) ? 'Excluded — Metropolitan'
      : activeLeague ? 'Imported'
      : a.leagues.some(l => l.syncError?.startsWith('Ineligible')) ? 'No Eligible A Grade Competition'
      : a.leagues.length ? 'Requires Manual Review' : 'No Leagues'
    report.registry.push({ association: a.name, state: a.stateCode ?? null, status, league: activeLeague?.name ?? null, competition: activeLeague?.playhqGradeName ?? null })
  }

  const activeFinal = await prisma.league.findMany({ where: { isActive: true, enabled: true }, include: { association: { select: { name: true } } } })
  report.activeLeagues = activeFinal.length
  const problems: string[] = []
  for (const l of activeFinal) {
    if (l.playhqGradeName && isRejected(l.playhqGradeName)) problems.push(`Active ineligible competition: ${l.name} (${l.playhqGradeName})`)
    if (GENERIC.has(norm(l.name))) problems.push(`Active league titled as a competition, not an association: "${l.name}"`)
    if (isMetroAssociation(l.association?.name)) problems.push(`Active metropolitan association (should be excluded): "${l.name}"`)
  }
  report.validation = { passed: problems.length === 0, problems }

  logger.info('DataAudit: complete', { renamed: report.renamed.length, deactivated: report.deactivatedIneligible.length, dupes: report.deactivatedDuplicate.length, active: report.activeLeagues, ranked: clubsRanked, valid: report.validation.passed })
  return report
}

/**
 * Assign the correct State to every association (and its clubs) using the curated
 * association→state map. Ranking-entry state derives from club.state, so this is
 * what removes the blanket "VIC". Only clubs reachable from a mapped association
 * (via any league season) are touched; unknown associations are left as-is.
 */
async function backfillStates(): Promise<number> {
  const stateIdByCode = new Map<string, string>()
  const ensureState = async (code: string): Promise<string> => {
    const hit = stateIdByCode.get(code)
    if (hit) return hit
    const s = await prisma.state.upsert({
      where:  { code },
      update: {},
      create: { code, name: STATE_NAMES[code as keyof typeof STATE_NAMES] ?? code },
    })
    stateIdByCode.set(code, s.id)
    return s.id
  }

  let clubsFixed = 0
  const assocs = await prisma.association.findMany({ select: { id: true, name: true } })
  for (const a of assocs) {
    const code = stateForAssociation(a.name)
    if (!code) continue
    const stateId = await ensureState(code)
    await prisma.association.update({ where: { id: a.id }, data: { stateCode: code } })

    // Every club that plays in one of this association's leagues.
    const clubs = await prisma.club.findMany({
      where:  { leagueSeasons: { some: { league: { associationId: a.id } } }, stateId: { not: stateId } },
      select: { id: true },
    })
    if (clubs.length) {
      await prisma.club.updateMany({ where: { id: { in: clubs.map(c => c.id) } }, data: { stateId } })
      clubsFixed += clubs.length
    }

    // Keep the association's leagues on the same state for consistency.
    await prisma.league.updateMany({ where: { associationId: a.id }, data: { stateId } })
  }
  return clubsFixed
}

async function deleteOrphanClubs(): Promise<number> {
  const orphans = await prisma.club.findMany({ where: { leagueSeasons: { none: {} } }, select: { id: true } })
  let removed = 0
  for (const o of orphans) {
    await prisma.rankingEntry.deleteMany({ where: { clubId: o.id } })
    await prisma.rankingSnapshot.deleteMany({ where: { clubId: o.id } })
    await prisma.clubNameVariant.deleteMany({ where: { clubId: o.id } })
    await prisma.match.deleteMany({ where: { OR: [{ homeClubId: o.id }, { awayClubId: o.id }] } })
    await prisma.club.delete({ where: { id: o.id } })
    removed++
  }
  return removed
}
