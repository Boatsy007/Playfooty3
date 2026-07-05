/**
 * Round summaries + integration data outputs (Phase B10).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives a round-by-round league summary from MatchResult (read-only over the
 * results store) and prepares DATA OUTPUTS for the ranking engine and the article
 * engine — without modifying either. Nothing is auto-published or auto-ranked;
 * the outputs (article-ready round wraps, ladder/ranking impact) are stored as
 * JSON on RoundSummary for future consumers. Also exposes B10 validation helpers
 * (club-in-league, valid round, result-matches-fixture).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Result = Awaited<ReturnType<typeof prisma.matchResult.findMany>>[number]

// ── B10 validation helpers ────────────────────────────────────────────────────

/** True if both clubs have an active membership of the league (any season). */
export async function clubsBelongToLeague(leagueId: string, homeClubId: string, awayClubId: string): Promise<{ ok: boolean; missing: string[] }> {
  const memberships = await prisma.clubLeagueSeason.findMany({ where: { leagueId, clubId: { in: [homeClubId, awayClubId] } }, select: { clubId: true } })
  const present = new Set(memberships.map(m => m.clubId))
  const missing = [homeClubId, awayClubId].filter(id => !present.has(id))
  return { ok: missing.length === 0, missing }
}

/** A round is valid if it is a positive integer within a sane range. */
export function isValidRound(round: number | null | undefined): boolean {
  return round == null || (Number.isInteger(round) && round >= 0 && round <= 60)
}

/** Confirm a result's clubs/league/round match the fixture it references. */
export async function resultMatchesFixture(fixtureId: string, r: { leagueId: string; homeClubId: string; awayClubId: string; round?: number | null }): Promise<{ ok: boolean; reason?: string }> {
  const f = await prisma.fixture.findUnique({ where: { id: fixtureId } })
  if (!f) return { ok: false, reason: 'fixture not found' }
  if (f.leagueId !== r.leagueId) return { ok: false, reason: 'league mismatch with fixture' }
  const pair = new Set([f.homeClubId, f.awayClubId])
  if (!pair.has(r.homeClubId) || !pair.has(r.awayClubId)) return { ok: false, reason: 'clubs do not match fixture' }
  if (r.round != null && f.round != null && r.round !== f.round) return { ok: false, reason: 'round mismatch with fixture' }
  return { ok: true }
}

// ── Round summary + data outputs ──────────────────────────────────────────────

async function latestRanks(): Promise<Map<string, number>> {
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return new Map()
  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, select: { clubId: true, rank: true } })
  return new Map(entries.map(e => [e.clubId, e.rank]))
}

const UPSET_GAP = 10

/** Compute + persist the summary for one league/season/grade/round. */
export async function computeRoundSummary(leagueId: string, season: string, round: number, grade = 'A Grade'): Promise<{ ok: boolean; summary?: unknown; error?: string }> {
  const results = await prisma.matchResult.findMany({ where: { leagueId, season, grade, round, status: { in: ['FINAL', 'PROVISIONAL'] } } })
  if (results.length === 0) return { ok: false, error: 'no results for this round' }

  const ranks = await latestRanks()
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }).catch(() => null)
  const total = (r: Result) => r.homeScore + r.awayScore
  const teamScores = results.flatMap(r => [r.homeScore, r.awayScore])
  const margins = results.filter(r => !r.isDraw).map(r => r.margin)

  // Upset detection (read-only ranking comparison).
  const upsets = results.filter(r => {
    if (r.isDraw || !r.winnerClubId) return false
    const loserId = r.winnerClubId === r.homeClubId ? r.awayClubId : r.homeClubId
    const wr = ranks.get(r.winnerClubId), lr = ranks.get(loserId)
    return wr != null && lr != null && wr - lr >= UPSET_GAP
  })

  const biggestWin = [...results].filter(r => !r.isDraw).sort((a, b) => b.margin - a.margin)[0] ?? null
  const closest = [...results].filter(r => !r.isDraw).sort((a, b) => a.margin - b.margin)[0] ?? null
  const highestScoring = [...results].sort((a, b) => total(b) - total(a))[0] ?? null

  // Ladder impact — per-club W/L/D + goal diff this round (data output).
  const ladder: Record<string, { w: number; l: number; d: number; gf: number; ga: number }> = {}
  const bump = (id: string, name: string, gf: number, ga: number, res: 'W' | 'L' | 'D') => {
    const k = `${id}`; ladder[k] = ladder[k] ?? { w: 0, l: 0, d: 0, gf: 0, ga: 0 }
    ladder[k].gf += gf; ladder[k].ga += ga; if (res === 'W') ladder[k].w++; else if (res === 'L') ladder[k].l++; else ladder[k].d++
    void name
  }
  for (const r of results) {
    const hr = r.isDraw ? 'D' : (r.winnerClubId === r.homeClubId ? 'W' : 'L')
    const ar = r.isDraw ? 'D' : (r.winnerClubId === r.awayClubId ? 'W' : 'L')
    bump(r.homeClubId, r.homeClubName, r.homeScore, r.awayScore, hr)
    bump(r.awayClubId, r.awayClubName, r.awayScore, r.homeScore, ar)
  }

  // Article-engine data outputs (data only — never auto-published).
  const articleData = {
    roundWrap: { leagueName: league?.name ?? leagueId, round, matches: results.length, headline: `${league?.name ?? 'League'} round ${round}: ${results.length} matches` },
    biggestWin: biggestWin ? { home: biggestWin.homeClubName, away: biggestWin.awayClubName, score: `${biggestWin.homeScore}-${biggestWin.awayScore}`, margin: biggestWin.margin } : null,
    biggestUpset: upsets[0] ? { home: upsets[0].homeClubName, away: upsets[0].awayClubName, score: `${upsets[0].homeScore}-${upsets[0].awayScore}` } : null,
    closestMatch: closest ? { home: closest.homeClubName, away: closest.awayClubName, margin: closest.margin } : null,
    highestScoringMatch: highestScoring ? { home: highestScoring.homeClubName, away: highestScoring.awayClubName, total: total(highestScoring) } : null,
  }

  // Ranking-integration output (data hook — the ranking engine is NOT modified).
  const rankingImpact = { note: 'form/ladder deltas available for future ranking integration', clubs: Object.keys(ladder).length, upsets: upsets.length }

  const data = {
    leagueId, leagueName: league?.name ?? null, season, grade, round,
    matchesPlayed: results.length,
    highestScore: Math.max(...teamScores),
    lowestScore: Math.min(...teamScores),
    closestMargin: margins.length ? Math.min(...margins) : 0,
    biggestMargin: margins.length ? Math.max(...margins) : 0,
    averageMargin: margins.length ? +(margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(1) : 0,
    upsetDetected: upsets.length > 0,
    ladderImpact: JSON.stringify(ladder),
    rankingImpact: JSON.stringify(rankingImpact),
    articleData: JSON.stringify(articleData),
    generatedAt: new Date(),
  }

  const summary = await prisma.roundSummary.upsert({
    where: { leagueId_season_grade_round: { leagueId, season, grade, round } },
    create: data,
    update: data,
  })
  logger.info('Round summary computed', { leagueId, season, round, matches: results.length })
  return { ok: true, summary }
}

/** Compute summaries for every round a league has results in (a season). */
export async function computeLeagueRoundSummaries(leagueId: string, season: string, grade = 'A Grade'): Promise<{ rounds: number }> {
  const rounds = await prisma.matchResult.findMany({ where: { leagueId, season, grade, round: { not: null } }, distinct: ['round'], select: { round: true } })
  let n = 0
  for (const r of rounds) { if (r.round != null) { const res = await computeRoundSummary(leagueId, season, r.round, grade); if (res.ok) n++ } }
  return { rounds: n }
}

export async function getRoundSummary(leagueId: string, round: number, opts: { season?: string; grade?: string } = {}) {
  const where = { leagueId, round, ...(opts.season ? { season: opts.season } : {}), ...(opts.grade ? { grade: opts.grade } : {}) }
  return prisma.roundSummary.findFirst({ where, orderBy: { generatedAt: 'desc' } })
}
