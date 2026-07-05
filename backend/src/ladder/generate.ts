/**
 * Ladder generation from results (Ladder Import V2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a complete ladder from MatchResult rows using netball logic — critical
 * for leagues that only post weekly results (no published ladder). Pure
 * `computeStandings` (unit-testable) + `generateLadderFromResults` which persists
 * a Ladder(source=GENERATED_FROM_RESULTS) and raises a comparison review item if
 * it disagrees with a protected uploaded/manual ladder. Manual ladders always
 * win unless an admin approves replacing them.
 */

import { prisma } from '../db/client.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export interface PointsConfig { winPoints: number; drawPoints: number }

/** Read configurable ladder points (defaults: win 4, draw 2, loss 0). */
export async function ladderPoints(): Promise<PointsConfig> {
  const [w, d] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'ladderWinPoints' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'ladderDrawPoints' } }).catch(() => null),
  ])
  const win = Number(w?.value); const draw = Number(d?.value)
  return { winPoints: Number.isFinite(win) && win > 0 ? win : 4, drawPoints: Number.isFinite(draw) && draw >= 0 ? draw : 2 }
}

type ResultRow = { homeClubId: string; homeClubName: string; awayClubId: string; awayClubName: string; homeScore: number; awayScore: number; isDraw: boolean; winnerClubId: string | null; round: number | null; matchDate: Date | null }

export interface StandingRow {
  clubId: string; clubName: string; played: number; wins: number; losses: number; draws: number
  goalsFor: number; goalsAgainst: number; goalDiff: number; percentage: number; points: number
  last5: string[]; currentStreak: number; position: number
}

/** Safe percentage: GF/GA×100; GA=0 handled without crashing. */
export function safePercentage(goalsFor: number, goalsAgainst: number): number {
  if (goalsAgainst > 0) return +((goalsFor / goalsAgainst) * 100).toFixed(2)
  return goalsFor > 0 ? 9999 : 0
}

/** Pure standings computation from result rows. */
export function computeStandings(results: ResultRow[], cfg: PointsConfig): StandingRow[] {
  interface Acc { clubId: string; clubName: string; p: number; w: number; l: number; d: number; gf: number; ga: number; timeline: { key: number; outcome: 'W' | 'L' | 'D' }[] }
  const acc = new Map<string, Acc>()
  const ensure = (id: string, name: string): Acc => { let a = acc.get(id); if (!a) { a = { clubId: id, clubName: name, p: 0, w: 0, l: 0, d: 0, gf: 0, ga: 0, timeline: [] }; acc.set(id, a) } else if (name) a.clubName = name; return a }

  for (const r of results) {
    const key = (r.round ?? 0) * 1e10 + (r.matchDate ? r.matchDate.getTime() : 0)
    const home = ensure(r.homeClubId, r.homeClubName), away = ensure(r.awayClubId, r.awayClubName)
    home.p++; away.p++; home.gf += r.homeScore; home.ga += r.awayScore; away.gf += r.awayScore; away.ga += r.homeScore
    if (r.isDraw || r.homeScore === r.awayScore) { home.d++; away.d++; home.timeline.push({ key, outcome: 'D' }); away.timeline.push({ key, outcome: 'D' }) }
    else if (r.homeScore > r.awayScore) { home.w++; away.l++; home.timeline.push({ key, outcome: 'W' }); away.timeline.push({ key, outcome: 'L' }) }
    else { away.w++; home.l++; away.timeline.push({ key, outcome: 'W' }); home.timeline.push({ key, outcome: 'L' }) }
  }

  const rows: StandingRow[] = [...acc.values()].map(a => {
    a.timeline.sort((x, y) => x.key - y.key)
    const recent = [...a.timeline].reverse().map(t => t.outcome)
    // current streak from most recent backwards
    let streak = 0, type: 'W' | 'L' | 'D' | null = null
    for (const o of recent) { if (type == null) { type = o; streak = 1 } else if (o === type) streak++; else break }
    const signed = type === 'W' ? streak : type === 'L' ? -streak : 0
    const points = a.w * cfg.winPoints + a.d * cfg.drawPoints
    return {
      clubId: a.clubId, clubName: a.clubName, played: a.p, wins: a.w, losses: a.l, draws: a.d,
      goalsFor: a.gf, goalsAgainst: a.ga, goalDiff: a.gf - a.ga, percentage: safePercentage(a.gf, a.ga), points,
      last5: recent.slice(0, 5), currentStreak: signed, position: 0,
    }
  })

  // Sort: points, percentage, goal difference, goals for, then club name.
  rows.sort((a, b) => b.points - a.points || b.percentage - a.percentage || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.clubName.localeCompare(b.clubName))
  rows.forEach((r, i) => { r.position = i + 1 })
  return rows
}

export interface GenerateOptions { roundFrom?: number; roundTo?: number; setCurrent?: boolean; createdBy?: string }
export interface GenerateReport { ok: boolean; ladderId?: string; rows: number; resultsIncluded: number; conflict?: boolean; warnings: string[]; error?: string }

/** Generate + persist a ladder from a league's committed results. */
export async function generateLadderFromResults(leagueId: string, season: string, grade = 'A Grade', opts: GenerateOptions = {}): Promise<GenerateReport> {
  const warnings: string[] = []
  const where = { leagueId, season, grade, status: { in: ['FINAL', 'PROVISIONAL'] }, ...(opts.roundFrom != null || opts.roundTo != null ? { round: { ...(opts.roundFrom != null ? { gte: opts.roundFrom } : {}), ...(opts.roundTo != null ? { lte: opts.roundTo } : {}) } } : {}) }
  const results = await prisma.matchResult.findMany({ where, select: { homeClubId: true, homeClubName: true, awayClubId: true, awayClubName: true, homeScore: true, awayScore: true, isDraw: true, winnerClubId: true, round: true, matchDate: true } })
  if (results.length === 0) return { ok: false, rows: 0, resultsIncluded: 0, warnings: ['no committed results for this league/season/grade'], error: 'no results' }

  const cfg = await ladderPoints()
  const standings = computeStandings(results, cfg)
  const rounds = results.map(r => r.round ?? 0)
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }).catch(() => null)

  // Manual/uploaded current ladder is protected: only supersede if admin approved.
  const manualCurrent = await prisma.ladder.findFirst({ where: { leagueId, season, grade, isCurrent: true, deletedAt: null, manualOverride: true } })
  const conflict = !!manualCurrent
  if (conflict) warnings.push('a protected manual/uploaded ladder is current — generated ladder saved as DRAFT for comparison, not published')

  const makeCurrent = !!opts.setCurrent && !conflict
  if (makeCurrent) await prisma.ladder.updateMany({ where: { leagueId, season, grade, isCurrent: true, deletedAt: null }, data: { isCurrent: false, status: 'SUPERSEDED' } })

  const ladder = await prisma.ladder.create({
    data: {
      leagueId, leagueName: league?.name ?? null, season, grade, source: 'GENERATED_FROM_RESULTS',
      status: makeCurrent ? 'CURRENT' : (conflict ? 'REVIEW' : 'DRAFT'), isCurrent: makeCurrent, manualOverride: false,
      roundFrom: opts.roundFrom ?? (rounds.length ? Math.min(...rounds) : null), roundTo: opts.roundTo ?? (rounds.length ? Math.max(...rounds) : null),
      resultsIncluded: results.length, winPoints: cfg.winPoints, drawPoints: cfg.drawPoints,
      confidence: 0.9, warnings: warnings.length ? JSON.stringify(warnings) : null, generatedAt: new Date(), createdBy: opts.createdBy ?? 'admin',
      rows: { create: standings.map(s => ({ position: s.position, clubId: s.clubId, clubName: s.clubName, played: s.played, wins: s.wins, losses: s.losses, draws: s.draws, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, goalDiff: s.goalDiff, percentage: s.percentage, points: s.points, last5: JSON.stringify(s.last5), currentStreak: s.currentStreak })) },
    },
  })

  if (conflict && manualCurrent) {
    const exists = await prisma.reviewItem.findFirst({ where: { entityType: 'Ladder', entityId: leagueId, kind: 'LADDER_CONFLICT', status: 'PENDING' }, select: { id: true } })
    if (!exists) await prisma.reviewItem.create({ data: { entityType: 'Ladder', entityId: leagueId, kind: 'LADDER_CONFLICT', reason: `Generated ladder for ${league?.name ?? leagueId} (${season} ${grade}) differs from the current uploaded/manual ladder — compare and choose which to publish.`, confidence: 0.6, payload: JSON.stringify({ leagueId, season, grade, manualLadderId: manualCurrent.id, generatedLadderId: ladder.id }) } })
  }

  await logQualityAction('GENERATE_LADDER', 'Ladder', ladder.id, { leagueId, season, grade, rows: standings.length, results: results.length, conflict }, { reason: 'ladder generated from results', performedBy: opts.createdBy })
  logger.info('Ladder generated from results', { leagueId, season, grade, rows: standings.length, conflict })
  return { ok: true, ladderId: ladder.id, rows: standings.length, resultsIncluded: results.length, conflict, warnings }
}

/** Generate cumulative per-round ladders for every round with results (audit trail). */
export async function generatePerRoundLadders(leagueId: string, season: string, grade = 'A Grade', createdBy = 'admin'): Promise<{ rounds: number; latestLadderId?: string }> {
  const rows = await prisma.matchResult.findMany({ where: { leagueId, season, grade, round: { not: null } }, distinct: ['round'], select: { round: true }, orderBy: { round: 'asc' } })
  const roundNums = rows.map(r => r.round!).filter(n => n != null).sort((a, b) => a - b)
  let latest: string | undefined
  for (const r of roundNums) {
    const rep = await generateLadderFromResults(leagueId, season, grade, { roundTo: r, createdBy })
    if (rep.ok) latest = rep.ladderId
  }
  // Latest cumulative ladder (all rounds) becomes current if no manual override.
  const full = await generateLadderFromResults(leagueId, season, grade, { setCurrent: true, createdBy })
  return { rounds: roundNums.length, latestLadderId: full.ladderId ?? latest }
}
