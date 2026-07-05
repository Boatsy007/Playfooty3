/**
 * Club history aggregation (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives per-club career aggregates from the immutable ranking_history archive
 * into ClubHistory (a rebuildable cache — the archive itself is never touched).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Row = { weekLabel: string; rank: number; rankMovement: number; powerRating: number; clubName: string }

function longestRun(flags: boolean[]): number {
  let best = 0, cur = 0
  for (const f of flags) { cur = f ? cur + 1 : 0; best = Math.max(best, cur) }
  return best
}

function aggregate(rows: Row[]) {
  const ranks = rows.map(r => r.rank)
  const ratings = rows.map(r => r.powerRating)
  const rises = rows.map(r => r.rankMovement).filter(m => m > 0)
  const falls = rows.map(r => r.rankMovement).filter(m => m < 0)
  return {
    highestRank: Math.min(...ranks),
    lowestRank: Math.max(...ranks),
    avgRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
    weeksRanked: rows.length,
    weeksTop10: ranks.filter(r => r <= 10).length,
    weeksTop25: ranks.filter(r => r <= 25).length,
    weeksTop50: ranks.filter(r => r <= 50).length,
    weeksTop100: ranks.filter(r => r <= 100).length,
    longestConsecutiveWeeks: rows.length, // rows are per-archived-week; contiguous by nature of weekly runs
    longestTop10Run: longestRun(rows.map(r => r.rank <= 10)),
    largestWeeklyRise: rises.length ? Math.max(...rises) : null,
    largestWeeklyFall: falls.length ? Math.min(...falls) : null,
    highestRating: Math.max(...ratings),
    avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    firstWeek: rows[0].weekLabel,
    lastWeek: rows[rows.length - 1].weekLabel,
    timeline: rows.map(r => ({ week: r.weekLabel, rank: r.rank, rating: +r.powerRating.toFixed(2), movement: r.rankMovement })),
  }
}

export interface ClubHistoryReport { clubs: number }

/** Recompute ClubHistory for every club with an archived history. */
export async function computeClubHistories(): Promise<ClubHistoryReport> {
  const history = await prisma.rankingHistory.findMany({
    orderBy: [{ weekLabel: 'asc' }],
    select: { clubId: true, clubName: true, weekLabel: true, rank: true, rankMovement: true, powerRating: true },
  })
  const byClub = new Map<string, Row[]>()
  for (const h of history) {
    const a = byClub.get(h.clubId) ?? []
    a.push({ weekLabel: h.weekLabel, rank: h.rank, rankMovement: h.rankMovement, powerRating: h.powerRating, clubName: h.clubName })
    byClub.set(h.clubId, a)
  }

  for (const [clubId, rows] of byClub) {
    const agg = aggregate(rows)
    const clubName = rows[rows.length - 1].clubName
    await prisma.clubHistory.upsert({
      where: { clubId },
      create: { clubId, clubName, ...agg, timeline: JSON.stringify(agg.timeline) },
      update: { clubName, ...agg, timeline: JSON.stringify(agg.timeline) },
    })
  }
  logger.info('Club histories computed', { clubs: byClub.size })
  return { clubs: byClub.size }
}
