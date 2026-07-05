/**
 * League history aggregation (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives per-league history aggregates from league_ranking_history into
 * LeagueHistory (a rebuildable cache; the archive is never touched).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Row = { weekLabel: string; leagueRank: number | null; strengthScore: number; rankedClubs: number; top25Clubs: number; top100Clubs: number; leagueName: string }

export interface LeagueHistoryReport { leagues: number }

export async function computeLeagueHistories(): Promise<LeagueHistoryReport> {
  const history = await prisma.leagueRankingHistory.findMany({
    orderBy: [{ weekLabel: 'asc' }],
    select: { leagueId: true, leagueName: true, weekLabel: true, leagueRank: true, strengthScore: true, rankedClubs: true, top25Clubs: true, top100Clubs: true },
  })
  const byLeague = new Map<string, Row[]>()
  for (const h of history) {
    const a = byLeague.get(h.leagueId) ?? []
    a.push({ weekLabel: h.weekLabel, leagueRank: h.leagueRank, strengthScore: h.strengthScore, rankedClubs: h.rankedClubs, top25Clubs: h.top25Clubs, top100Clubs: h.top100Clubs, leagueName: h.leagueName })
    byLeague.set(h.leagueId, a)
  }

  for (const [leagueId, rows] of byLeague) {
    const ranks = rows.map(r => r.leagueRank).filter((r): r is number => r != null)
    const strengths = rows.map(r => r.strengthScore)
    const name = rows[rows.length - 1].leagueName
    const timeline = rows.map(r => ({ week: r.weekLabel, rank: r.leagueRank, strength: +r.strengthScore.toFixed(1), rankedClubs: r.rankedClubs }))
    await prisma.leagueHistory.upsert({
      where: { leagueId },
      create: {
        leagueId, leagueName: name,
        highestRank: ranks.length ? Math.min(...ranks) : null, lowestRank: ranks.length ? Math.max(...ranks) : null,
        avgStrength: strengths.reduce((a, b) => a + b, 0) / strengths.length, highestStrength: Math.max(...strengths),
        weeksRanked: rows.length, maxRankedClubs: Math.max(...rows.map(r => r.rankedClubs)),
        maxTop25: Math.max(...rows.map(r => r.top25Clubs)), maxTop100: Math.max(...rows.map(r => r.top100Clubs)),
        timeline: JSON.stringify(timeline),
      },
      update: {
        leagueName: name,
        highestRank: ranks.length ? Math.min(...ranks) : null, lowestRank: ranks.length ? Math.max(...ranks) : null,
        avgStrength: strengths.reduce((a, b) => a + b, 0) / strengths.length, highestStrength: Math.max(...strengths),
        weeksRanked: rows.length, maxRankedClubs: Math.max(...rows.map(r => r.rankedClubs)),
        maxTop25: Math.max(...rows.map(r => r.top25Clubs)), maxTop100: Math.max(...rows.map(r => r.top100Clubs)),
        timeline: JSON.stringify(timeline),
      },
    })
  }
  logger.info('League histories computed', { leagues: byLeague.size })
  return { leagues: byLeague.size }
}
