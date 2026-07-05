/**
 * Statistics engine (Phase B5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives per-club season statistics from MatchResult (streaks, home/away split,
 * margins, form) into ClubMatchStat, and computes league/global leaderboards for
 * future frontend statistics pages. Everything comes from stored results — no
 * value is invented. Idempotent: ClubMatchStat is upserted per (club, season).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

interface Acc {
  clubId: string; clubName: string
  played: number; wins: number; losses: number; draws: number
  goalsFor: number; goalsAgainst: number
  homeWins: number; homeLosses: number; homeDraws: number
  awayWins: number; awayLosses: number; awayDraws: number
  winMargins: number[]; largestWinningMargin: number
  timeline: { date: number; outcome: 'W' | 'L' | 'D' }[]
}

function streaks(timeline: { outcome: 'W' | 'L' | 'D' }[]) {
  // timeline is oldest→newest for longest-run detection.
  let longestWin = 0, longestLoss = 0, run = 0, runType: 'W' | 'L' | 'D' | null = null
  for (const t of timeline) {
    if (t.outcome === runType) run++
    else { run = 1; runType = t.outcome }
    if (t.outcome === 'W') longestWin = Math.max(longestWin, run)
    if (t.outcome === 'L') longestLoss = Math.max(longestLoss, run)
  }
  // current streak from the most recent backwards
  let current = 0, curType: 'W' | 'L' | 'D' | null = null
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (curType == null) { curType = timeline[i].outcome; current = 1 }
    else if (timeline[i].outcome === curType) current++
    else break
  }
  const signed = curType === 'W' ? current : curType === 'L' ? -current : 0
  return { longestWin, longestLoss, currentStreak: signed, currentStreakType: curType }
}

/** Recompute ClubMatchStat for every club that has results in the season. */
export async function computeClubStats(season: string): Promise<{ season: string; clubs: number }> {
  const results = await prisma.matchResult.findMany({ where: { season, status: { in: ['FINAL', 'PROVISIONAL'] } }, orderBy: { matchDate: 'asc' } })
  const acc = new Map<string, Acc>()
  const ensure = (id: string, name: string): Acc => {
    let a = acc.get(id)
    if (!a) { a = { clubId: id, clubName: name, played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, homeWins: 0, homeLosses: 0, homeDraws: 0, awayWins: 0, awayLosses: 0, awayDraws: 0, winMargins: [], largestWinningMargin: 0, timeline: [] }; acc.set(id, a) }
    return a
  }

  for (const r of results) {
    const date = r.matchDate ? r.matchDate.getTime() : (r.round ?? 0)
    const applySide = (clubId: string, name: string, gf: number, ga: number, isHome: boolean) => {
      const a = ensure(clubId, name)
      a.played++; a.goalsFor += gf; a.goalsAgainst += ga
      let outcome: 'W' | 'L' | 'D'
      if (gf === ga) { a.draws++; outcome = 'D'; isHome ? a.homeDraws++ : a.awayDraws++ }
      else if (gf > ga) { a.wins++; outcome = 'W'; isHome ? a.homeWins++ : a.awayWins++; const m = gf - ga; a.winMargins.push(m); a.largestWinningMargin = Math.max(a.largestWinningMargin, m) }
      else { a.losses++; outcome = 'L'; isHome ? a.homeLosses++ : a.awayLosses++ }
      a.timeline.push({ date, outcome })
    }
    applySide(r.homeClubId, r.homeClubName, r.homeScore, r.awayScore, true)
    applySide(r.awayClubId, r.awayClubName, r.awayScore, r.homeScore, false)
  }

  for (const a of acc.values()) {
    a.timeline.sort((x, y) => x.date - y.date)
    const s = streaks(a.timeline)
    const recent = [...a.timeline].reverse().map(t => t.outcome)
    const goalDiff = a.goalsFor - a.goalsAgainst
    const percentage = a.goalsAgainst > 0 ? (a.goalsFor / a.goalsAgainst) * 100 : (a.goalsFor > 0 ? 1000 : 0)
    const avgWinningMargin = a.winMargins.length ? a.winMargins.reduce((x, y) => x + y, 0) / a.winMargins.length : 0
    await prisma.clubMatchStat.upsert({
      where: { clubId_season: { clubId: a.clubId, season } },
      create: {
        clubId: a.clubId, clubName: a.clubName, season, played: a.played, wins: a.wins, losses: a.losses, draws: a.draws,
        goalsFor: a.goalsFor, goalsAgainst: a.goalsAgainst, goalDiff, percentage, avgWinningMargin, largestWinningMargin: a.largestWinningMargin,
        homeWins: a.homeWins, homeLosses: a.homeLosses, homeDraws: a.homeDraws, awayWins: a.awayWins, awayLosses: a.awayLosses, awayDraws: a.awayDraws,
        currentStreak: s.currentStreak, currentStreakType: s.currentStreakType, longestWinStreak: s.longestWin, longestLossStreak: s.longestLoss,
        last5: JSON.stringify(recent.slice(0, 5)), last10: JSON.stringify(recent.slice(0, 10)),
      },
      update: {
        clubName: a.clubName, played: a.played, wins: a.wins, losses: a.losses, draws: a.draws,
        goalsFor: a.goalsFor, goalsAgainst: a.goalsAgainst, goalDiff, percentage, avgWinningMargin, largestWinningMargin: a.largestWinningMargin,
        homeWins: a.homeWins, homeLosses: a.homeLosses, homeDraws: a.homeDraws, awayWins: a.awayWins, awayLosses: a.awayLosses, awayDraws: a.awayDraws,
        currentStreak: s.currentStreak, currentStreakType: s.currentStreakType, longestWinStreak: s.longestWin, longestLossStreak: s.longestLoss,
        last5: JSON.stringify(recent.slice(0, 5)), last10: JSON.stringify(recent.slice(0, 10)),
      },
    })
  }
  logger.info('Club match stats computed', { season, clubs: acc.size })
  return { season, clubs: acc.size }
}

export interface StatLeaderboards {
  season: string
  highestScoring: { clubName: string; goalsFor: number; played: number }[]
  bestDefence: { clubName: string; goalsAgainst: number; played: number }[]
  highestPercentage: { clubName: string; percentage: number }[]
  longestWinStreak: { clubName: string; streak: number }[]
  longestLossStreak: { clubName: string; streak: number }[]
  largestWinningMargin: { clubName: string; margin: number }[]
  avgWinningMargin: { clubName: string; avg: number }[]
  bestHomeRecord: { clubName: string; homeWins: number; homeLosses: number }[]
  bestAwayRecord: { clubName: string; awayWins: number; awayLosses: number }[]
}

/** Read the derived leaderboards for a season (for future statistics pages). */
export async function getStatLeaderboards(season: string): Promise<StatLeaderboards> {
  const stats = await prisma.clubMatchStat.findMany({ where: { season, played: { gt: 0 } } })
  const top = <T>(arr: T[], by: (t: T) => number, n = 10) => [...arr].sort((a, b) => by(b) - by(a)).slice(0, n)
  return {
    season,
    highestScoring: top(stats, s => s.goalsFor).map(s => ({ clubName: s.clubName, goalsFor: s.goalsFor, played: s.played })),
    bestDefence: [...stats].filter(s => s.played >= 3).sort((a, b) => (a.goalsAgainst / a.played) - (b.goalsAgainst / b.played)).slice(0, 10).map(s => ({ clubName: s.clubName, goalsAgainst: s.goalsAgainst, played: s.played })),
    highestPercentage: top(stats, s => s.percentage).map(s => ({ clubName: s.clubName, percentage: +s.percentage.toFixed(1) })),
    longestWinStreak: top(stats, s => s.longestWinStreak).map(s => ({ clubName: s.clubName, streak: s.longestWinStreak })),
    longestLossStreak: top(stats, s => s.longestLossStreak).map(s => ({ clubName: s.clubName, streak: s.longestLossStreak })),
    largestWinningMargin: top(stats, s => s.largestWinningMargin).map(s => ({ clubName: s.clubName, margin: s.largestWinningMargin })),
    avgWinningMargin: top(stats, s => s.avgWinningMargin).map(s => ({ clubName: s.clubName, avg: +s.avgWinningMargin.toFixed(1) })),
    bestHomeRecord: top(stats, s => s.homeWins).map(s => ({ clubName: s.clubName, homeWins: s.homeWins, homeLosses: s.homeLosses })),
    bestAwayRecord: top(stats, s => s.awayWins).map(s => ({ clubName: s.clubName, awayWins: s.awayWins, awayLosses: s.awayLosses })),
  }
}
