/**
 * Comparison engine (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only historical comparisons over the immutable archives: club vs club,
 * league vs league, current vs previous week, current vs previous season, and
 * current vs historical peak. Prepares data for future frontend; no UI.
 */

import { prisma } from '../db/client.js'

async function clubSeries(clubId: string) {
  return prisma.rankingHistory.findMany({ where: { clubId }, orderBy: { weekLabel: 'asc' }, select: { weekLabel: true, season: true, rank: true, powerRating: true, rankMovement: true, clubName: true } })
}
async function leagueSeries(leagueId: string) {
  return prisma.leagueRankingHistory.findMany({ where: { leagueId }, orderBy: { weekLabel: 'asc' }, select: { weekLabel: true, season: true, leagueRank: true, strengthScore: true, rankedClubs: true, leagueName: true } })
}

function summariseClub(rows: Awaited<ReturnType<typeof clubSeries>>) {
  if (rows.length === 0) return null
  const ranks = rows.map(r => r.rank), ratings = rows.map(r => r.powerRating)
  const last = rows[rows.length - 1]
  return {
    clubName: last.clubName, current: { week: last.weekLabel, rank: last.rank, rating: last.powerRating },
    peakRank: Math.min(...ranks), avgRank: +(ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1),
    peakRating: Math.max(...ratings), weeksRanked: rows.length,
  }
}

export async function compareClubs(aId: string, bId: string) {
  const [a, b] = await Promise.all([clubSeries(aId), clubSeries(bId)])
  return { type: 'club-vs-club', a: summariseClub(a), b: summariseClub(b) }
}

export async function compareLeagues(aId: string, bId: string) {
  const build = (rows: Awaited<ReturnType<typeof leagueSeries>>) => {
    if (rows.length === 0) return null
    const last = rows[rows.length - 1]; const strengths = rows.map(r => r.strengthScore)
    const ranks = rows.map(r => r.leagueRank).filter((x): x is number => x != null)
    return { leagueName: last.leagueName, current: { week: last.weekLabel, rank: last.leagueRank, strength: last.strengthScore }, peakRank: ranks.length ? Math.min(...ranks) : null, avgStrength: +(strengths.reduce((x, y) => x + y, 0) / strengths.length).toFixed(1), peakStrength: Math.max(...strengths), weeksRanked: rows.length }
  }
  const [a, b] = await Promise.all([leagueSeries(aId), leagueSeries(bId)])
  return { type: 'league-vs-league', a: build(a), b: build(b) }
}

/** Current vs previous week for a club. */
export async function compareWeeks(clubId: string) {
  const rows = await clubSeries(clubId)
  if (rows.length === 0) return { type: 'week-vs-week', clubId, current: null, previous: null }
  const current = rows[rows.length - 1], previous = rows[rows.length - 2] ?? null
  return {
    type: 'week-vs-week', clubName: current.clubName,
    current: { week: current.weekLabel, rank: current.rank, rating: current.powerRating },
    previous: previous ? { week: previous.weekLabel, rank: previous.rank, rating: previous.powerRating } : null,
    rankChange: previous ? previous.rank - current.rank : 0,
    ratingChange: previous ? +(current.powerRating - previous.powerRating).toFixed(2) : 0,
  }
}

/** Current season vs the previous season (best + average rank) for a club. */
export async function compareSeasons(clubId: string) {
  const rows = await clubSeries(clubId)
  if (rows.length === 0) return { type: 'season-vs-season', clubId, seasons: [] }
  const bySeason = new Map<string, number[]>()
  for (const r of rows) { const a = bySeason.get(r.season) ?? []; a.push(r.rank); bySeason.set(r.season, a) }
  const seasons = [...bySeason.entries()].map(([season, ranks]) => ({ season, bestRank: Math.min(...ranks), avgRank: +(ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1), weeks: ranks.length })).sort((a, b) => a.season.localeCompare(b.season))
  const current = seasons[seasons.length - 1] ?? null, previous = seasons[seasons.length - 2] ?? null
  return { type: 'season-vs-season', clubName: rows[rows.length - 1].clubName, current, previous, seasons }
}

/** Current standing vs the club's all-time historical peak. */
export async function compareToPeak(clubId: string) {
  const rows = await clubSeries(clubId)
  if (rows.length === 0) return { type: 'current-vs-peak', clubId, current: null, peak: null }
  const current = rows[rows.length - 1]
  const peakRankRow = [...rows].sort((a, b) => a.rank - b.rank)[0]
  const peakRatingRow = [...rows].sort((a, b) => b.powerRating - a.powerRating)[0]
  return {
    type: 'current-vs-peak', clubName: current.clubName,
    current: { week: current.weekLabel, rank: current.rank, rating: current.powerRating },
    peak: { bestRank: peakRankRow.rank, bestRankWeek: peakRankRow.weekLabel, bestRating: peakRatingRow.powerRating, bestRatingWeek: peakRatingRow.weekLabel },
    offPeakBy: current.rank - peakRankRow.rank,
  }
}
