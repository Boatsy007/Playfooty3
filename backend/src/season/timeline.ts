/**
 * Club season timeline (Phase B10.5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Reconstructs, per club, a round-by-round snapshot of ladder position, record,
 * GF/GA, percentage, points, form and streak — derived entirely from committed
 * MatchResult rows. Feeds future club-profile charts. Read-only over results;
 * writes only to the additive club_season_timeline table.
 */

import { prisma } from '../db/client.js'
import { computeStandings, ladderPoints } from '../ladder/generate.js'
import { logger } from '../utils/logger.js'

type Res = { homeClubId: string; homeClubName: string; awayClubId: string; awayClubName: string; homeScore: number; awayScore: number; isDraw: boolean; winnerClubId: string | null; round: number | null; matchDate: Date | null }

/**
 * Build + persist the per-round timeline for every club in a league/season/grade.
 * Cumulative: each round's row reflects standings up to and including that round.
 */
export async function buildClubSeasonTimeline(leagueId: string, season: string, grade = 'A Grade', _createdBy = 'admin'): Promise<{ rounds: number; clubs: number; rows: number }> {
  const results = await prisma.matchResult.findMany({
    where: { leagueId, season, grade, status: { in: ['FINAL', 'PROVISIONAL'] }, round: { not: null } },
    select: { homeClubId: true, homeClubName: true, awayClubId: true, awayClubName: true, homeScore: true, awayScore: true, isDraw: true, winnerClubId: true, round: true, matchDate: true },
  })
  if (results.length === 0) return { rounds: 0, clubs: 0, rows: 0 }

  const cfg = await ladderPoints()
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true } }).catch(() => null)
  const rounds = [...new Set(results.map(r => r.round!).filter(n => n != null))].sort((a, b) => a - b)

  let written = 0
  const clubSet = new Set<string>()
  for (const round of rounds) {
    const upTo = results.filter(r => (r.round ?? 0) <= round) as Res[]
    const standings = computeStandings(upTo, cfg)
    for (const s of standings) {
      if (!s.clubId) continue
      clubSet.add(s.clubId)
      const data = {
        clubName: s.clubName, leagueName: league?.name ?? null, position: s.position,
        played: s.played, wins: s.wins, losses: s.losses, draws: s.draws,
        goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, goalDiff: s.goalDiff,
        percentage: s.percentage, points: s.points, form: JSON.stringify(s.last5), currentStreak: s.currentStreak,
      }
      await prisma.clubSeasonTimeline.upsert({
        where: { clubId_leagueId_season_grade_round: { clubId: s.clubId, leagueId, season, grade, round } },
        create: { clubId: s.clubId, leagueId, season, grade, round, ...data },
        update: data,
      }).catch(e => logger.warn('timeline upsert failed', { detail: String(e), clubId: s.clubId, round }))
      written++
    }
  }
  logger.info('Club season timeline built', { leagueId, season, grade, rounds: rounds.length, clubs: clubSet.size })
  return { rounds: rounds.length, clubs: clubSet.size, rows: written }
}

/** Read a club's season progression + derived highlights (for profile charts / API). */
export async function getClubSeasonHistory(clubId: string, opts: { season?: string; leagueId?: string; grade?: string } = {}) {
  const timeline = await prisma.clubSeasonTimeline.findMany({
    where: { clubId, ...(opts.season ? { season: opts.season } : {}), ...(opts.leagueId ? { leagueId: opts.leagueId } : {}), ...(opts.grade ? { grade: opts.grade } : {}) },
    orderBy: [{ season: 'asc' }, { round: 'asc' }],
  })
  const positions = timeline.map(t => t.position).filter((p): p is number => p != null)
  // Biggest win / loss come straight from the results store (signed margins).
  const results = await prisma.matchResult.findMany({
    where: { OR: [{ homeClubId: clubId }, { awayClubId: clubId }], ...(opts.season ? { season: opts.season } : {}) },
    orderBy: [{ matchDate: 'asc' }, { round: 'asc' }],
  })
  let biggestWin: { margin: number; opponent: string; score: string } | null = null
  let biggestLoss: { margin: number; opponent: string; score: string } | null = null
  for (const r of results) {
    const isHome = r.homeClubId === clubId
    const my = isHome ? r.homeScore : r.awayScore
    const opp = isHome ? r.awayScore : r.homeScore
    const oppName = isHome ? r.awayClubName : r.homeClubName
    const margin = my - opp
    if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) biggestWin = { margin, opponent: oppName, score: `${my}-${opp}` }
    if (margin < 0 && (!biggestLoss || -margin > biggestLoss.margin)) biggestLoss = { margin: -margin, opponent: oppName, score: `${my}-${opp}` }
  }
  return {
    timeline,
    bestPosition: positions.length ? Math.min(...positions) : null,
    worstPosition: positions.length ? Math.max(...positions) : null,
    positionByRound: timeline.map(t => ({ round: t.round, position: t.position })),
    formTimeline: timeline.map(t => ({ round: t.round, form: t.form ? JSON.parse(t.form) : [], streak: t.currentStreak })),
    percentageTimeline: timeline.map(t => ({ round: t.round, percentage: t.percentage })),
    goalsTimeline: timeline.map(t => ({ round: t.round, goalsFor: t.goalsFor, goalsAgainst: t.goalsAgainst })),
    biggestWin, biggestLoss,
  }
}
