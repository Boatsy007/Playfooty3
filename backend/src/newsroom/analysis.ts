/**
 * Newsroom analysis engine (Phase B3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads REAL data — the latest completed ranking run, the run before it, the
 * full ranking-snapshot history, club-league-season ladders and match results —
 * and derives a structured WeeklyAnalysis describing WHAT changed. It invents
 * nothing: every figure is read from the database and carried with its source.
 *
 * Downstream, the trigger engine (detector.ts) turns this analysis into
 * NewsSignals, and the composer (composer.ts) turns signals into prose.
 */

import { prisma } from '../db/client.js'

export interface ClubMovement {
  clubId: string; clubName: string; leagueId: string; leagueName: string; state: string
  rank: number; previousRank: number | null; rankMovement: number; powerRating: number
  form: string[]; wins: number; played: number
}

export interface LadderStat {
  clubId: string; clubName: string; leagueId: string; leagueName: string
  played: number; wins: number; losses: number; draws: number
  goalsFor: number; goalsAgainst: number; percentage: number; points: number; position: number | null
  isPremier: boolean
}

export interface LeagueStrengthChange {
  leagueId: string; leagueName: string; state: string
  strengthScore: number; strengthTier: number; rankedClubs: number
  previousScore: number | null; delta: number | null; highestEver: boolean
}

export interface HistoricBest {
  clubId: string; clubName: string; rank: number; previousBest: number | null; weeksTracked: number
}

export interface Crossing {
  clubId: string; clubName: string; leagueName: string; state: string
  rank: number; previousRank: number | null; threshold: number; direction: 'ENTER' | 'EXIT'
}

export interface MatchHighlight {
  leagueId: string; leagueName: string; round: number | null
  homeClub: string; awayClub: string; homeGoals: number; awayGoals: number; margin: number
}

export interface WeeklyAnalysis {
  weekLabel: string
  season: string
  runId: string
  previousRunId: string | null
  hasHistory: boolean
  totalRanked: number

  leader: ClubMovement | null
  previousLeader: { clubId: string; clubName: string } | null
  newNumberOne: boolean

  risers: ClubMovement[]
  fallers: ClubMovement[]

  crossings: Crossing[]            // top-10/25/50/100 entries + top-100 exits
  newEntrants: ClubMovement[]      // clubs with no previous rank
  historicBests: HistoricBest[]    // clubs at their best rank ever

  undefeated: LadderStat[]
  highestScoring: LadderStat[]     // by goalsFor
  bestDefence: LadderStat[]        // by fewest goalsAgainst (min games)
  woodenSpoon: LadderStat[]        // bottom of each league ladder
  closestRace: { leagueId: string; leagueName: string; topTwoPointGap: number; leader: string; chaser: string }[]

  leagueStrength: LeagueStrengthChange[]
  largestMargins: MatchHighlight[]
  lowestScoringRounds: { leagueId: string; leagueName: string; round: number | null; totalGoals: number }[]
}

const parseForm = (s: string | null): string[] => { try { return JSON.parse(s || '[]') as string[] } catch { return [] } }
const THRESHOLDS = [10, 25, 50]

/** Build the full weekly analysis from real data. Returns null if no ranking run. */
export async function analyseWeek(): Promise<WeeklyAnalysis | null> {
  const runs = await prisma.rankingRun.findMany({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 2 })
  const run = runs[0]
  if (!run) return null
  const previousRun = runs[1] ?? null

  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
  if (entries.length === 0) return null

  const toMovement = (e: typeof entries[number]): ClubMovement => {
    const form = parseForm(e.recentForm)
    return {
      clubId: e.clubId, clubName: e.clubName, leagueId: e.leagueId, leagueName: e.leagueName, state: e.state,
      rank: e.rank, previousRank: e.previousRank, rankMovement: e.rankMovement, powerRating: e.powerRating,
      form, wins: form.filter(f => f === 'W').length, played: form.length,
    }
  }
  const movements = entries.map(toMovement)

  // Leader + new #1
  const leader = movements[0] ?? null
  const prevLeaderEntry = previousRun
    ? await prisma.rankingEntry.findFirst({ where: { runId: previousRun.id, rank: 1 } })
    : null
  const previousLeader = prevLeaderEntry ? { clubId: prevLeaderEntry.clubId, clubName: prevLeaderEntry.clubName } : null
  const newNumberOne = !!leader && !!previousLeader && leader.clubId !== previousLeader.clubId

  // Movers
  const moved = movements.filter(m => m.previousRank != null && m.rankMovement !== 0)
  const risers = moved.filter(m => m.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement)
  const fallers = moved.filter(m => m.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement)
  const newEntrants = movements.filter(m => m.previousRank == null)

  // Threshold crossings (needs previousRank)
  const crossings: Crossing[] = []
  for (const m of movements) {
    if (m.previousRank == null) continue
    for (const t of THRESHOLDS) {
      if (m.rank <= t && m.previousRank > t) crossings.push({ clubId: m.clubId, clubName: m.clubName, leagueName: m.leagueName, state: m.state, rank: m.rank, previousRank: m.previousRank, threshold: t, direction: 'ENTER' })
    }
    if (m.rank > 100 && m.previousRank <= 100) crossings.push({ clubId: m.clubId, clubName: m.clubName, leagueName: m.leagueName, state: m.state, rank: m.rank, previousRank: m.previousRank, threshold: 100, direction: 'EXIT' })
  }

  // Historic bests — compare each ranked club against its snapshot history.
  const historicBests: HistoricBest[] = []
  const snaps = await prisma.rankingSnapshot.findMany({
    where: { clubId: { in: entries.map(e => e.clubId) } },
    select: { clubId: true, rank: true, weekLabel: true },
  })
  const snapsByClub = new Map<string, { rank: number; weekLabel: string }[]>()
  for (const s of snaps) { const a = snapsByClub.get(s.clubId) ?? []; a.push({ rank: s.rank, weekLabel: s.weekLabel }); snapsByClub.set(s.clubId, a) }
  for (const m of movements) {
    const hist = (snapsByClub.get(m.clubId) ?? []).filter(s => s.weekLabel !== run.weekLabel)
    if (hist.length === 0) continue
    const prevBest = Math.min(...hist.map(s => s.rank))
    if (m.rank < prevBest) historicBests.push({ clubId: m.clubId, clubName: m.clubName, rank: m.rank, previousBest: prevBest, weeksTracked: hist.length + 1 })
  }

  // Ladder-derived stories (from ClubLeagueSeason for the current season).
  const seasons = await prisma.clubLeagueSeason.findMany({ where: { season: run.season, isActive: true } })
  const clubNameById = new Map(entries.map(e => [e.clubId, e.clubName]))
  const leagueNameById = new Map(entries.map(e => [e.leagueId, e.leagueName]))
  const ladder: LadderStat[] = seasons.map(s => ({
    clubId: s.clubId, clubName: clubNameById.get(s.clubId) ?? s.clubId,
    leagueId: s.leagueId, leagueName: leagueNameById.get(s.leagueId) ?? s.leagueId,
    played: s.played, wins: s.wins, losses: s.losses, draws: s.draws,
    goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, percentage: s.percentage, points: s.points,
    position: s.position, isPremier: s.isPremier,
  }))

  const undefeated = ladder.filter(l => l.played >= 3 && l.losses === 0).sort((a, b) => b.wins - a.wins)
  const highestScoring = [...ladder].filter(l => l.played >= 1).sort((a, b) => (b.goalsFor / Math.max(1, b.played)) - (a.goalsFor / Math.max(1, a.played))).slice(0, 5)
  const bestDefence = [...ladder].filter(l => l.played >= 3).sort((a, b) => (a.goalsAgainst / Math.max(1, a.played)) - (b.goalsAgainst / Math.max(1, b.played))).slice(0, 5)

  // Per-league: wooden spoon (bottom) + closest premiership race (top-two point gap).
  const byLeague = new Map<string, LadderStat[]>()
  for (const l of ladder) { const a = byLeague.get(l.leagueId) ?? []; a.push(l); byLeague.set(l.leagueId, a) }
  const woodenSpoon: LadderStat[] = []
  const closestRace: WeeklyAnalysis['closestRace'] = []
  for (const [leagueId, rows] of byLeague) {
    if (rows.length < 4) continue
    const byPoints = [...rows].sort((a, b) => (b.points - a.points) || (b.percentage - a.percentage))
    woodenSpoon.push(byPoints[byPoints.length - 1])
    const gap = byPoints[0].points - byPoints[1].points
    closestRace.push({ leagueId, leagueName: rows[0].leagueName, topTwoPointGap: gap, leader: byPoints[0].clubName, chaser: byPoints[1].clubName })
  }
  closestRace.sort((a, b) => a.topTwoPointGap - b.topTwoPointGap)

  // League strength changes vs last recorded snapshot.
  const leagues = await prisma.league.findMany({ where: { isActive: true, enabled: true, archivedAt: null }, include: { state: { select: { code: true } } } })
  const rankedCountByLeague = new Map<string, number>()
  for (const e of entries) rankedCountByLeague.set(e.leagueId, (rankedCountByLeague.get(e.leagueId) ?? 0) + 1)
  const prevStrength = await prisma.leagueStrengthSnapshot.findMany({ where: { leagueId: { in: leagues.map(l => l.id) } }, orderBy: { createdAt: 'desc' } })
  const prevByLeague = new Map<string, number[]>()
  for (const p of prevStrength) { const a = prevByLeague.get(p.leagueId) ?? []; a.push(p.strengthScore); prevByLeague.set(p.leagueId, a) }
  const leagueStrength: LeagueStrengthChange[] = leagues
    .filter(l => (rankedCountByLeague.get(l.id) ?? 0) > 0)
    .map(l => {
      const hist = prevByLeague.get(l.id) ?? []
      const previousScore = hist[0] ?? null
      const highestEver = hist.length > 0 ? l.strengthScore > Math.max(...hist) : false
      return {
        leagueId: l.id, leagueName: l.name, state: l.state?.code ?? '',
        strengthScore: l.strengthScore, strengthTier: l.strengthTier, rankedClubs: rankedCountByLeague.get(l.id) ?? 0,
        previousScore, delta: previousScore != null ? l.strengthScore - previousScore : null, highestEver,
      }
    })

  // Match highlights — largest margins + lowest-scoring rounds (this season).
  const matches = await prisma.match.findMany({ where: { season: run.season }, orderBy: { matchDate: 'desc' }, take: 500 })
  const highlights: MatchHighlight[] = matches.map(m => ({
    leagueId: m.leagueId, leagueName: leagueNameById.get(m.leagueId) ?? m.leagueId, round: m.round,
    homeClub: clubNameById.get(m.homeClubId) ?? m.homeClubId, awayClub: clubNameById.get(m.awayClubId) ?? m.awayClubId,
    homeGoals: m.homeGoals, awayGoals: m.awayGoals, margin: Math.abs(m.homeGoals - m.awayGoals),
  }))
  const largestMargins = [...highlights].sort((a, b) => b.margin - a.margin).slice(0, 5)
  const roundTotals = new Map<string, { leagueId: string; leagueName: string; round: number | null; totalGoals: number }>()
  for (const m of matches) {
    const key = `${m.leagueId}:${m.round ?? 'x'}`
    const cur = roundTotals.get(key) ?? { leagueId: m.leagueId, leagueName: leagueNameById.get(m.leagueId) ?? m.leagueId, round: m.round, totalGoals: 0 }
    cur.totalGoals += m.homeGoals + m.awayGoals
    roundTotals.set(key, cur)
  }
  const lowestScoringRounds = [...roundTotals.values()].filter(r => r.totalGoals > 0).sort((a, b) => a.totalGoals - b.totalGoals).slice(0, 3)

  return {
    weekLabel: run.weekLabel, season: run.season, runId: run.id, previousRunId: previousRun?.id ?? null,
    hasHistory: !!previousRun || snaps.length > 0, totalRanked: entries.length,
    leader, previousLeader, newNumberOne,
    risers, fallers, crossings, newEntrants, historicBests,
    undefeated, highestScoring, bestDefence, woodenSpoon, closestRace,
    leagueStrength, largestMargins, lowestScoringRounds,
  }
}
