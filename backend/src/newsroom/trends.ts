/**
 * Trend detection + league-strength history (Phase B3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives per-club trend metrics from the immutable ranking-snapshot history and
 * stores them in ClubTrend for future frontend use. Also records this week's
 * league strength into LeagueStrengthSnapshot so strength trends can be derived
 * next week. Everything is computed from stored data — nothing invented.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export interface TrendReport {
  weekLabel: string | null
  clubsAnalysed: number
  leaguesSnapshotted: number
  fastestRising: { clubName: string; delta: number }[]
  fastestFalling: { clubName: string; delta: number }[]
  mostConsistent: { clubName: string; volatility: number }[]
  mostVolatile: { clubName: string; volatility: number }[]
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
}

/** Least-squares slope of y over index (per-week change). Positive = increasing. */
function slope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (i - xMean) * (ys[i] - yMean); den += (i - xMean) ** 2 }
  return den === 0 ? 0 : num / den
}

/**
 * Recompute club trends + snapshot league strength for the latest run.
 * Idempotent: ClubTrend is upserted per club; strength snapshots are unique per
 * (league, week) so re-running the same week overwrites in place.
 */
export async function computeTrends(): Promise<TrendReport> {
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return { weekLabel: null, clubsAnalysed: 0, leaguesSnapshotted: 0, fastestRising: [], fastestFalling: [], mostConsistent: [], mostVolatile: [] }

  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id } })

  // Snapshot history for every currently-ranked club, chronological.
  const snaps = await prisma.rankingSnapshot.findMany({
    where: { clubId: { in: entries.map(e => e.clubId) } },
    orderBy: { weekLabel: 'asc' },
    select: { clubId: true, rank: true, powerRating: true, weekLabel: true },
  })
  const byClub = new Map<string, { rank: number; powerRating: number; weekLabel: string }[]>()
  for (const s of snaps) { const a = byClub.get(s.clubId) ?? []; a.push(s); byClub.set(s.clubId, a) }

  const risingList: { clubName: string; delta: number }[] = []
  const fallingList: { clubName: string; delta: number }[] = []
  const volatilityList: { clubName: string; volatility: number }[] = []

  for (const e of entries) {
    const hist = byClub.get(e.clubId) ?? []
    const ranks = hist.map(h => h.rank)
    const ratings = hist.map(h => h.powerRating)
    const recentRanks = ranks.slice(-4)
    // rank delta over ~4 weeks: earlier rank − current rank (positive = improved)
    const rank4wkDelta = recentRanks.length >= 2 ? recentRanks[0] - e.rank : null
    const vol = stddev(recentRanks.length >= 2 ? recentRanks : ranks)
    const ratingTrend = slope(ratings.slice(-6))
    const momentum = ratings.length >= 2 ? ratings[ratings.length - 1] - ratings[ratings.length - 2] : 0
    const bestRankEver = ranks.length ? Math.min(...ranks, e.rank) : e.rank
    const worstRankEver = ranks.length ? Math.max(...ranks, e.rank) : e.rank
    const isRising = (rank4wkDelta ?? 0) > 0 && ratingTrend >= 0
    const isFalling = (rank4wkDelta ?? 0) < 0 && ratingTrend <= 0

    await prisma.clubTrend.upsert({
      where: { clubId: e.clubId },
      create: {
        clubId: e.clubId, clubName: e.clubName, leagueName: e.leagueName, state: e.state,
        currentRank: e.rank, bestRankEver, worstRankEver, rank4wkDelta,
        ratingTrend, consistency: vol > 0 ? 1 / vol : 1, volatility: vol, momentum,
        weeksTracked: hist.length + 1, isRising, isFalling,
      },
      update: {
        clubName: e.clubName, leagueName: e.leagueName, state: e.state,
        currentRank: e.rank, bestRankEver, worstRankEver, rank4wkDelta,
        ratingTrend, consistency: vol > 0 ? 1 / vol : 1, volatility: vol, momentum,
        weeksTracked: hist.length + 1, isRising, isFalling,
      },
    })

    if (rank4wkDelta != null && rank4wkDelta > 0) risingList.push({ clubName: e.clubName, delta: rank4wkDelta })
    if (rank4wkDelta != null && rank4wkDelta < 0) fallingList.push({ clubName: e.clubName, delta: rank4wkDelta })
    if (recentRanks.length >= 3) volatilityList.push({ clubName: e.clubName, volatility: vol })
  }

  // Snapshot this week's league strength for future trend derivation.
  const leagues = await prisma.league.findMany({ where: { isActive: true, enabled: true, archivedAt: null } })
  const rankedCount = new Map<string, number>()
  for (const e of entries) rankedCount.set(e.leagueId, (rankedCount.get(e.leagueId) ?? 0) + 1)
  let leaguesSnapshotted = 0
  for (const l of leagues) {
    const rc = rankedCount.get(l.id) ?? 0
    if (rc === 0) continue
    await prisma.leagueStrengthSnapshot.upsert({
      where: { leagueId_weekLabel: { leagueId: l.id, weekLabel: run.weekLabel } },
      create: { leagueId: l.id, leagueName: l.name, weekLabel: run.weekLabel, season: run.season, strengthScore: l.strengthScore, strengthTier: l.strengthTier, rankedClubs: rc },
      update: { strengthScore: l.strengthScore, strengthTier: l.strengthTier, rankedClubs: rc, leagueName: l.name },
    })
    leaguesSnapshotted++
  }

  logger.info('Newsroom trends computed', { week: run.weekLabel, clubs: entries.length, leagues: leaguesSnapshotted })
  return {
    weekLabel: run.weekLabel,
    clubsAnalysed: entries.length,
    leaguesSnapshotted,
    fastestRising: risingList.sort((a, b) => b.delta - a.delta).slice(0, 10),
    fastestFalling: fallingList.sort((a, b) => a.delta - b.delta).slice(0, 10),
    mostConsistent: volatilityList.filter(v => v.volatility > 0).sort((a, b) => a.volatility - b.volatility).slice(0, 10),
    mostVolatile: [...volatilityList].sort((a, b) => b.volatility - a.volatility).slice(0, 10),
  }
}
