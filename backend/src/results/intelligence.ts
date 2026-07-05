/**
 * Match intelligence (Phase B5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects newsworthy matches from stored results and records them as MatchInsight
 * rows (deduped). Per round it finds: biggest win, closest match, highest/lowest
 * scoring, match of the round, upsets and draws. Upsets read the latest ranking
 * run (READ-ONLY) to compare the winner's and loser's national ranks. Nothing is
 * invented — every insight points at a real MatchResult.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Result = Awaited<ReturnType<typeof prisma.matchResult.findMany>>[number]

export interface InsightReport { season: string; rounds: number; created: number; skipped: number }

const UPSET_RANK_GAP = 10

async function latestRanks(): Promise<Map<string, number>> {
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return new Map()
  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, select: { clubId: true, rank: true } })
  return new Map(entries.map(e => [e.clubId, e.rank]))
}

async function persist(season: string, leagueId: string | null, round: number | null, kind: string, headline: string, resultId: string | null, metrics: unknown, r: InsightReport) {
  const dedupeKey = `${season}:r${round ?? 'x'}:${kind}:${resultId ?? 'agg'}`
  const existing = await prisma.matchInsight.findUnique({ where: { dedupeKey } })
  if (existing) { r.skipped++; return }
  await prisma.matchInsight.create({ data: { season, leagueId, round, kind, headline, resultId, metrics: metrics ? JSON.stringify(metrics) : null, dedupeKey } })
  r.created++
}

/** Compute per-round match insights for a season. */
export async function computeMatchInsights(season: string): Promise<InsightReport> {
  const report: InsightReport = { season, rounds: 0, created: 0, skipped: 0 }
  const results = await prisma.matchResult.findMany({ where: { season, status: { in: ['FINAL', 'PROVISIONAL'] } } })
  if (results.length === 0) return report
  const ranks = await latestRanks()

  const byRound = new Map<number, Result[]>()
  for (const m of results) { const k = m.round ?? 0; byRound.set(k, [...(byRound.get(k) ?? []), m]) }

  for (const [round, games] of byRound) {
    report.rounds++
    const decided = games.filter(g => !g.isDraw)
    const total = (g: Result) => g.homeScore + g.awayScore

    if (decided.length) {
      const biggest = [...decided].sort((a, b) => b.margin - a.margin)[0]
      await persist(season, biggest.leagueId, round, 'BIGGEST_WIN', `${biggest.winnerClubId === biggest.homeClubId ? biggest.homeClubName : biggest.awayClubName} win by ${biggest.margin} in round ${round}`, biggest.id, { margin: biggest.margin, score: `${biggest.homeScore}-${biggest.awayScore}` }, report)

      const closest = [...decided].sort((a, b) => a.margin - b.margin)[0]
      await persist(season, closest.leagueId, round, 'CLOSEST_MATCH', `${closest.homeClubName} v ${closest.awayClubName} decided by ${closest.margin} in round ${round}`, closest.id, { margin: closest.margin, score: `${closest.homeScore}-${closest.awayScore}` }, report)
    }

    const highest = [...games].sort((a, b) => total(b) - total(a))[0]
    await persist(season, highest.leagueId, round, 'HIGHEST_SCORING', `${highest.homeClubName} v ${highest.awayClubName} produced ${total(highest)} goals in round ${round}`, highest.id, { total: total(highest), score: `${highest.homeScore}-${highest.awayScore}` }, report)

    const lowest = [...games].sort((a, b) => total(a) - total(b))[0]
    await persist(season, lowest.leagueId, round, 'LOWEST_SCORING', `${lowest.homeClubName} v ${lowest.awayClubName} produced just ${total(lowest)} goals in round ${round}`, lowest.id, { total: total(lowest) }, report)

    // Match of the round — the two highest-ranked clubs meeting (if ranked).
    const ranked = games
      .map(g => ({ g, best: Math.min(ranks.get(g.homeClubId) ?? 9999, ranks.get(g.awayClubId) ?? 9999) }))
      .filter(x => x.best < 9999)
      .sort((a, b) => a.best - b.best)
    if (ranked[0]) {
      const g = ranked[0].g
      await persist(season, g.leagueId, round, 'MATCH_OF_ROUND', `Match of round ${round}: ${g.homeClubName} v ${g.awayClubName}`, g.id, { topRank: ranked[0].best, score: `${g.homeScore}-${g.awayScore}` }, report)
    }

    // Upsets — winner ranked well below the loser.
    for (const g of decided) {
      const winnerId = g.winnerClubId!
      const loserId = winnerId === g.homeClubId ? g.awayClubId : g.homeClubId
      const wr = ranks.get(winnerId), lr = ranks.get(loserId)
      if (wr != null && lr != null && wr - lr >= UPSET_RANK_GAP) {
        const wn = winnerId === g.homeClubId ? g.homeClubName : g.awayClubName
        const ln = winnerId === g.homeClubId ? g.awayClubName : g.homeClubName
        await persist(season, g.leagueId, round, 'UPSET', `Upset: #${wr} ${wn} beat #${lr} ${ln} by ${g.margin}`, g.id, { winnerRank: wr, loserRank: lr, margin: g.margin }, report)
      }
    }

    // Draws
    for (const g of games.filter(x => x.isDraw)) {
      await persist(season, g.leagueId, round, 'DRAW', `${g.homeClubName} and ${g.awayClubName} drew ${g.homeScore}-${g.awayScore} in round ${round}`, g.id, { score: `${g.homeScore}-${g.awayScore}` }, report)
    }
  }

  logger.info('Match insights computed', { season, rounds: report.rounds, created: report.created })
  return report
}
