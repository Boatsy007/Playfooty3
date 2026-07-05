/**
 * Record book (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives the all-time record book from the immutable history archives and
 * upserts one RecordBookEntry per record kind. Every value is computed from real
 * archived data — nothing is invented. Idempotent (unique by kind).
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

const stddev = (xs: number[]) => { if (xs.length < 2) return 0; const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) }

interface RecordDraft { kind: string; title: string; entityType: 'CLUB' | 'LEAGUE'; entityId?: string; entityName?: string; value?: number; valueLabel?: string; weekLabel?: string; season?: string; metrics?: unknown }

export interface RecordBookReport { records: number }

export async function computeRecordBook(): Promise<RecordBookReport> {
  const [clubHist, leagueHist] = await Promise.all([
    prisma.rankingHistory.findMany({ orderBy: { weekLabel: 'asc' }, select: { clubId: true, clubName: true, weekLabel: true, season: true, rank: true, rankMovement: true, powerRating: true } }),
    prisma.leagueRankingHistory.findMany({ orderBy: { weekLabel: 'asc' }, select: { leagueId: true, leagueName: true, weekLabel: true, season: true, leagueRank: true, strengthScore: true } }),
  ])
  const drafts: RecordDraft[] = []
  if (clubHist.length === 0 && leagueHist.length === 0) return { records: 0 }

  // ── Single-row club records ────────────────────────────────────────────────
  if (clubHist.length) {
    const bestRank = [...clubHist].sort((a, b) => a.rank - b.rank || a.weekLabel.localeCompare(b.weekLabel))[0]
    drafts.push({ kind: 'HIGHEST_RANKED_CLUB_EVER', title: 'Highest ranked club ever', entityType: 'CLUB', entityId: bestRank.clubId, entityName: bestRank.clubName, value: bestRank.rank, valueLabel: `#${bestRank.rank}`, weekLabel: bestRank.weekLabel, season: bestRank.season })

    const climb = [...clubHist].sort((a, b) => b.rankMovement - a.rankMovement)[0]
    drafts.push({ kind: 'BIGGEST_WEEKLY_CLIMB', title: 'Biggest weekly climb', entityType: 'CLUB', entityId: climb.clubId, entityName: climb.clubName, value: climb.rankMovement, valueLabel: `+${climb.rankMovement}`, weekLabel: climb.weekLabel, season: climb.season })
    const drop = [...clubHist].sort((a, b) => a.rankMovement - b.rankMovement)[0]
    drafts.push({ kind: 'BIGGEST_WEEKLY_DROP', title: 'Biggest weekly drop', entityType: 'CLUB', entityId: drop.clubId, entityName: drop.clubName, value: drop.rankMovement, valueLabel: `${drop.rankMovement}`, weekLabel: drop.weekLabel, season: drop.season })

    const bestRating = [...clubHist].sort((a, b) => b.powerRating - a.powerRating)[0]
    drafts.push({ kind: 'HIGHEST_RATING_EVER', title: 'Highest rating ever', entityType: 'CLUB', entityId: bestRating.clubId, entityName: bestRating.clubName, value: bestRating.powerRating, valueLabel: bestRating.powerRating.toFixed(1), weekLabel: bestRating.weekLabel, season: bestRating.season })

    // Per-club series
    const byClub = new Map<string, typeof clubHist>()
    for (const h of clubHist) { const a = byClub.get(h.clubId) ?? []; a.push(h); byClub.set(h.clubId, a) }

    let mostConsistent: RecordDraft | null = null, minVar = Infinity
    let numberOne: RecordDraft | null = null, mostWeeksNo1 = 0
    let longestTop10: RecordDraft | null = null, bestTop10 = 0
    let longestTop25: RecordDraft | null = null, bestTop25 = 0
    let fastestRise: RecordDraft | null = null, bestRise = 0
    for (const [clubId, rows] of byClub) {
      const name = rows[rows.length - 1].clubName
      const ranks = rows.map(r => r.rank)
      if (rows.length >= 3) { const v = stddev(ranks); if (v < minVar) { minVar = v; mostConsistent = { kind: 'MOST_CONSISTENT_CLUB', title: 'Most consistent club', entityType: 'CLUB', entityId: clubId, entityName: name, value: +v.toFixed(2), valueLabel: `σ ${v.toFixed(2)} over ${rows.length} wks` } } }
      const weeksNo1 = ranks.filter(r => r === 1).length
      if (weeksNo1 > mostWeeksNo1) { mostWeeksNo1 = weeksNo1; numberOne = { kind: 'LONGEST_TIME_AT_NUMBER_ONE', title: 'Longest time at number one', entityType: 'CLUB', entityId: clubId, entityName: name, value: weeksNo1, valueLabel: `${weeksNo1} weeks` } }
      const run = (thr: number) => { let best = 0, cur = 0; for (const r of ranks) { cur = r <= thr ? cur + 1 : 0; best = Math.max(best, cur) } return best }
      const t10 = run(10); if (t10 > bestTop10) { bestTop10 = t10; longestTop10 = { kind: 'LONGEST_TOP10_STREAK', title: 'Longest Top 10 streak', entityType: 'CLUB', entityId: clubId, entityName: name, value: t10, valueLabel: `${t10} weeks` } }
      const t25 = run(25); if (t25 > bestTop25) { bestTop25 = t25; longestTop25 = { kind: 'LONGEST_TOP25_STREAK', title: 'Longest Top 25 streak', entityType: 'CLUB', entityId: clubId, entityName: name, value: t25, valueLabel: `${t25} weeks` } }
      const rise = rows[0].rank - rows[rows.length - 1].rank
      if (rise > bestRise) { bestRise = rise; fastestRise = { kind: 'FASTEST_RISING_CLUB', title: 'Fastest rising club', entityType: 'CLUB', entityId: clubId, entityName: name, value: rise, valueLabel: `${rows[0].rank} → ${rows[rows.length - 1].rank}` } }

      // Season improvement / decline
    }
    for (const d of [mostConsistent, numberOne, longestTop10, longestTop25, fastestRise]) if (d) drafts.push(d)

    // Largest improvement / decline over a season
    const bySeasonClub = new Map<string, typeof clubHist>()
    for (const h of clubHist) { const k = `${h.season}:${h.clubId}`; const a = bySeasonClub.get(k) ?? []; a.push(h); bySeasonClub.set(k, a) }
    let bestImp: RecordDraft | null = null, impVal = 0, worstDec: RecordDraft | null = null, decVal = 0
    for (const [, rows] of bySeasonClub) {
      if (rows.length < 2) continue
      const delta = rows[0].rank - rows[rows.length - 1].rank // +ve = improved
      if (delta > impVal) { impVal = delta; bestImp = { kind: 'LARGEST_IMPROVEMENT_OVER_SEASON', title: 'Largest improvement over a season', entityType: 'CLUB', entityId: rows[0].clubId, entityName: rows[rows.length - 1].clubName, value: delta, valueLabel: `${rows[0].rank} → ${rows[rows.length - 1].rank}`, season: rows[0].season } }
      if (delta < decVal) { decVal = delta; worstDec = { kind: 'LARGEST_DECLINE_OVER_SEASON', title: 'Largest decline over a season', entityType: 'CLUB', entityId: rows[0].clubId, entityName: rows[rows.length - 1].clubName, value: delta, valueLabel: `${rows[0].rank} → ${rows[rows.length - 1].rank}`, season: rows[0].season } }
    }
    if (bestImp) drafts.push(bestImp); if (worstDec) drafts.push(worstDec)
  }

  // ── League records ──────────────────────────────────────────────────────────
  if (leagueHist.length) {
    const ranked = leagueHist.filter(l => l.leagueRank != null)
    if (ranked.length) {
      const best = [...ranked].sort((a, b) => (a.leagueRank! - b.leagueRank!) || a.weekLabel.localeCompare(b.weekLabel))[0]
      drafts.push({ kind: 'HIGHEST_RANKED_LEAGUE_EVER', title: 'Highest ranked league ever', entityType: 'LEAGUE', entityId: best.leagueId, entityName: best.leagueName, value: best.leagueRank ?? undefined, valueLabel: `#${best.leagueRank}`, weekLabel: best.weekLabel, season: best.season })
    }
    const byLeague = new Map<string, typeof leagueHist>()
    for (const h of leagueHist) { const a = byLeague.get(h.leagueId) ?? []; a.push(h); byLeague.set(h.leagueId, a) }
    let stable: RecordDraft | null = null, minVar = Infinity, improved: RecordDraft | null = null, bestDelta = -Infinity
    for (const [leagueId, rows] of byLeague) {
      const name = rows[rows.length - 1].leagueName
      const strengths = rows.map(r => r.strengthScore)
      if (rows.length >= 3) { const v = stddev(strengths); if (v < minVar) { minVar = v; stable = { kind: 'MOST_STABLE_LEAGUE', title: 'Most stable league', entityType: 'LEAGUE', entityId: leagueId, entityName: name, value: +v.toFixed(2), valueLabel: `σ ${v.toFixed(2)}` } } }
      const delta = strengths[strengths.length - 1] - strengths[0]
      if (rows.length >= 2 && delta > bestDelta) { bestDelta = delta; improved = { kind: 'MOST_IMPROVED_LEAGUE', title: 'Most improved league', entityType: 'LEAGUE', entityId: leagueId, entityName: name, value: +delta.toFixed(2), valueLabel: `+${delta.toFixed(1)}` } }
    }
    if (stable) drafts.push(stable); if (improved) drafts.push(improved)
  }

  for (const d of drafts) {
    await prisma.recordBookEntry.upsert({
      where: { kind: d.kind },
      create: { kind: d.kind, title: d.title, entityType: d.entityType, entityId: d.entityId ?? null, entityName: d.entityName ?? null, value: d.value ?? null, valueLabel: d.valueLabel ?? null, weekLabel: d.weekLabel ?? null, season: d.season ?? null, metrics: d.metrics ? JSON.stringify(d.metrics) : null, computedAt: new Date() },
      update: { title: d.title, entityType: d.entityType, entityId: d.entityId ?? null, entityName: d.entityName ?? null, value: d.value ?? null, valueLabel: d.valueLabel ?? null, weekLabel: d.weekLabel ?? null, season: d.season ?? null, metrics: d.metrics ? JSON.stringify(d.metrics) : null, computedAt: new Date() },
    })
  }
  logger.info('Record book computed', { records: drafts.length })
  return { records: drafts.length }
}
