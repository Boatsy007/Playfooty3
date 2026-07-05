/**
 * Qualification engine (Phase B7).
 * ─────────────────────────────────────────────────────────────────────────────
 * Determines which clubs qualify for a championship from its QualificationRules,
 * applied against the latest completed ranking run (READ-ONLY). It freezes the
 * exact ranked list used into an immutable QualificationSnapshot, then writes
 * QualifiedClub standings (QUALIFIED up to maxTeams, the rest RESERVE / WAITLIST).
 *
 * Auto methods: TOP_RANKING, LEAGUE_CHAMPION, RETURNING_CHAMPION. Manual methods
 * (WILDCARD / HOST / MANUAL / ADMIN_OVERRIDE) are added by an admin, not here.
 * Nothing is invented — every pick is a real ranked club. Manual overrides win:
 * a QualifiedClub with status set by an admin is never downgraded automatically.
 */

import { prisma } from '../db/client.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

const AUTO_METHODS = new Set(['TOP_RANKING', 'LEAGUE_CHAMPION', 'RETURNING_CHAMPION'])

export interface QualificationReport {
  championshipId: string
  snapshotId: string | null
  qualified: number
  reserves: number
  byMethod: Record<string, number>
  warnings: string[]
}

interface Ranked { clubId: string; clubName: string; leagueId: string; leagueName: string; state: string; rank: number; powerRating: number }

export async function computeQualification(championshipId: string, opts: { generatedBy?: string } = {}): Promise<QualificationReport> {
  const report: QualificationReport = { championshipId, snapshotId: null, qualified: 0, reserves: 0, byMethod: {}, warnings: [] }
  const champ = await prisma.championship.findUnique({ where: { id: championshipId } })
  if (!champ) { report.warnings.push('championship not found'); return report }

  const rules = await prisma.qualificationRule.findMany({ where: { championshipId }, orderBy: { priority: 'asc' } })
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) { report.warnings.push('no completed ranking run to qualify from'); return report }
  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
  if (entries.length === 0) { report.warnings.push('ranking run has no entries'); return report }

  const ranked: Ranked[] = entries.map(e => ({ clubId: e.clubId, clubName: e.clubName, leagueId: e.leagueId, leagueName: e.leagueName, state: e.state, rank: e.rank, powerRating: e.powerRating }))
  const byClub = new Map(ranked.map(r => [r.clubId, r]))

  // Freeze the exact rankings used (immutable snapshot).
  const snapshot = await prisma.qualificationSnapshot.create({
    data: { championshipId, runId: run.id, weekLabel: run.weekLabel, season: run.season, generatedBy: opts.generatedBy ?? 'SYSTEM', data: JSON.stringify(ranked) },
  })
  report.snapshotId = snapshot.id

  // Default rule if none configured: top-ranking up to maxTeams.
  const effectiveRules = rules.length ? rules : [{ id: 'default', championshipId, method: 'TOP_RANKING', priority: 0, quota: champ.qualificationCutoff ?? champ.maxTeams, params: null, createdAt: new Date() }]

  // Select in rule priority order; a club qualifies once (first method wins).
  const picked = new Map<string, { method: string }>()
  for (const rule of effectiveRules) {
    if (!AUTO_METHODS.has(rule.method)) continue
    let pool: Ranked[] = []
    if (rule.method === 'TOP_RANKING') {
      pool = ranked.filter(r => !picked.has(r.clubId))
    } else if (rule.method === 'LEAGUE_CHAMPION') {
      // Highest-ranked club in each league.
      const bestByLeague = new Map<string, Ranked>()
      for (const r of ranked) { const cur = bestByLeague.get(r.leagueId); if (!cur || r.rank < cur.rank) bestByLeague.set(r.leagueId, r) }
      pool = [...bestByLeague.values()].filter(r => !picked.has(r.clubId)).sort((a, b) => a.rank - b.rank)
    } else if (rule.method === 'RETURNING_CHAMPION') {
      const prev = await prisma.championshipHistory.findFirst({ where: { year: champ.year ? champ.year - 1 : undefined }, orderBy: { createdAt: 'desc' } })
      const champId = prev?.championClubId
      if (champId && byClub.has(champId) && !picked.has(champId)) pool = [byClub.get(champId)!]
    }
    const quota = rule.quota ?? pool.length
    for (const r of pool.slice(0, quota)) { picked.set(r.clubId, { method: rule.method }); report.byMethod[rule.method] = (report.byMethod[rule.method] ?? 0) + 1 }
  }

  // Order picks by national rank; QUALIFIED up to maxTeams, rest RESERVE.
  const orderedPicks = [...picked.entries()].map(([clubId, m]) => ({ ...byClub.get(clubId)!, method: m.method })).sort((a, b) => a.rank - b.rank)

  // Existing admin-set overrides must not be downgraded.
  const existing = await prisma.qualifiedClub.findMany({ where: { championshipId } })
  const overridden = new Set(existing.filter(e => e.method === 'ADMIN_OVERRIDE' || e.status === 'REPLACEMENT').map(e => e.clubId))

  let order = 0
  for (const p of orderedPicks) {
    if (overridden.has(p.clubId)) continue
    order++
    const status = order <= champ.maxTeams ? 'QUALIFIED' : 'RESERVE'
    await prisma.qualifiedClub.upsert({
      where: { championshipId_clubId: { championshipId, clubId: p.clubId } },
      create: { championshipId, clubId: p.clubId, clubName: p.clubName, method: p.method, status, order, state: p.state, leagueId: p.leagueId, leagueName: p.leagueName, snapshotRank: p.rank, snapshotRating: p.powerRating, snapshotId: snapshot.id },
      update: { clubName: p.clubName, method: p.method, status, order, state: p.state, leagueId: p.leagueId, leagueName: p.leagueName, snapshotRank: p.rank, snapshotRating: p.powerRating, snapshotId: snapshot.id },
    })
    if (status === 'QUALIFIED') report.qualified++; else report.reserves++
  }

  await logQualityAction('COMPUTE_QUALIFICATION', 'Championship', championshipId, { snapshotId: snapshot.id, qualified: report.qualified, reserves: report.reserves, byMethod: report.byMethod }, { reason: 'qualification computed', performedBy: opts.generatedBy })
  logger.info('Qualification computed', { championshipId, qualified: report.qualified, reserves: report.reserves })
  return report
}
