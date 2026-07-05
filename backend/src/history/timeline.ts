/**
 * Timeline support (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Prepares historical timeline data (weekly / monthly / season) for future
 * frontend charts. Read-only over the immutable archives.
 */

import { prisma } from '../db/client.js'

/** Weekly rank + rating series for a club, plus season roll-ups. */
export async function clubTimeline(clubId: string) {
  const rows = await prisma.rankingHistory.findMany({ where: { clubId }, orderBy: { weekLabel: 'asc' }, select: { weekLabel: true, season: true, snapshotDate: true, rank: true, powerRating: true, rankMovement: true } })
  const weekly = rows.map(r => ({ week: r.weekLabel, date: r.snapshotDate, rank: r.rank, rating: +r.powerRating.toFixed(2), movement: r.rankMovement }))
  const bySeason = new Map<string, { rank: number; rating: number }[]>()
  for (const r of rows) { const a = bySeason.get(r.season) ?? []; a.push({ rank: r.rank, rating: r.powerRating }); bySeason.set(r.season, a) }
  const seasonTrend = [...bySeason.entries()].map(([season, xs]) => ({ season, bestRank: Math.min(...xs.map(x => x.rank)), avgRank: +(xs.reduce((a, b) => a + b.rank, 0) / xs.length).toFixed(1), peakRating: Math.max(...xs.map(x => x.rating)), weeks: xs.length }))
  return { clubId, weekly, seasonTrend }
}

/** Weekly strength + league-rank series for a league. */
export async function leagueTimeline(leagueId: string) {
  const rows = await prisma.leagueRankingHistory.findMany({ where: { leagueId }, orderBy: { weekLabel: 'asc' }, select: { weekLabel: true, season: true, snapshotDate: true, leagueRank: true, strengthScore: true, rankedClubs: true } })
  return { leagueId, weekly: rows.map(r => ({ week: r.weekLabel, date: r.snapshotDate, rank: r.leagueRank, strength: +r.strengthScore.toFixed(1), rankedClubs: r.rankedClubs })) }
}

/** All archived weeks (for a week browser / picker). */
export async function listWeeks(season?: string) {
  const rows = await prisma.rankingHistory.groupBy({
    by: ['weekLabel', 'season'],
    where: season ? { season } : {},
    _count: { clubId: true },
    orderBy: { weekLabel: 'desc' },
  })
  return rows.map(r => ({ weekLabel: r.weekLabel, season: r.season, clubs: r._count.clubId }))
}

/** Full archived board for one week (club rankings that week). */
export async function weekBoard(weekLabel: string) {
  return prisma.rankingHistory.findMany({ where: { weekLabel }, orderBy: { rank: 'asc' } })
}
