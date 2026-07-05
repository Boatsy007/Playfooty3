/**
 * Ranking archive (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Permanently archives a completed ranking run into ranking_history and
 * league_ranking_history. Rows are IMMUTABLE: one per (week, entity), written
 * once and never overwritten — re-running skips weeks already archived. Reads
 * the existing RankingEntry / League data (read-only); nothing existing changes.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

const ENGINE_VERSION = 'v2'

async function calcVersion(): Promise<string> {
  const cfg = await prisma.rankingConfig.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, select: { id: true } }).catch(() => null)
  return cfg?.id ?? 'default'
}

export interface ArchiveReport { weekLabel: string | null; season: string | null; clubsArchived: number; leaguesArchived: number; skipped: boolean }

/** Archive the latest completed run (or a specific runId). Immutable + idempotent. */
export async function archiveRankingRun(runId?: string): Promise<ArchiveReport> {
  const run = runId
    ? await prisma.rankingRun.findUnique({ where: { id: runId } })
    : await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return { weekLabel: null, season: null, clubsArchived: 0, leaguesArchived: 0, skipped: false }

  const report: ArchiveReport = { weekLabel: run.weekLabel, season: run.season, clubsArchived: 0, leaguesArchived: 0, skipped: false }

  // If this week is already fully archived, do nothing (immutability).
  const already = await prisma.rankingHistory.count({ where: { weekLabel: run.weekLabel } })
  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
  if (entries.length === 0) return report
  if (already >= entries.length) { report.skipped = true; return report }

  const cv = await calcVersion()
  const snapshotDate = run.completedAt ?? new Date()

  // League strength lookups for reasoning + leagueStrength value.
  const leagueIds = [...new Set(entries.map(e => e.leagueId))]
  const leagues = await prisma.league.findMany({
    where: { id: { in: leagueIds } },
    select: { id: true, name: true, strengthScore: true, strengthTier: true, strengthReasoning: true, state: { select: { code: true } } },
  })
  const leagueById = new Map(leagues.map(l => [l.id, l]))

  // ── Club archive (skip rows already present for this week) ──────────────────
  for (const e of entries) {
    const exists = await prisma.rankingHistory.findUnique({ where: { weekLabel_clubId: { weekLabel: run.weekLabel, clubId: e.clubId } }, select: { id: true } })
    if (exists) continue
    const lg = leagueById.get(e.leagueId)
    await prisma.rankingHistory.create({
      data: {
        runId: run.id, weekLabel: run.weekLabel, season: run.season, snapshotDate,
        clubId: e.clubId, clubName: e.clubName, leagueId: e.leagueId, leagueName: e.leagueName, state: e.state,
        rank: e.rank, previousRank: e.previousRank, rankMovement: e.rankMovement, powerRating: e.powerRating,
        leagueStrength: lg?.strengthScore ?? null, reasoning: lg?.strengthReasoning ?? null,
        engineVersion: ENGINE_VERSION, calcVersion: cv,
      },
    })
    report.clubsArchived++
  }

  // ── League archive ─────────────────────────────────────────────────────────
  const ranked = new Map<string, { count: number; top25: number; top100: number }>()
  for (const e of entries) {
    const g = ranked.get(e.leagueId) ?? { count: 0, top25: 0, top100: 0 }
    g.count++; if (e.rank <= 25) g.top25++; if (e.rank <= 100) g.top100++
    ranked.set(e.leagueId, g)
  }
  const leagueOrder = [...leagues].sort((a, b) => b.strengthScore - a.strengthScore)
  const leagueRankById = new Map(leagueOrder.map((l, i) => [l.id, i + 1]))
  for (const [leagueId, g] of ranked) {
    const lg = leagueById.get(leagueId)
    if (!lg) continue
    const exists = await prisma.leagueRankingHistory.findUnique({ where: { weekLabel_leagueId: { weekLabel: run.weekLabel, leagueId } }, select: { id: true } })
    if (exists) continue
    await prisma.leagueRankingHistory.create({
      data: {
        runId: run.id, weekLabel: run.weekLabel, season: run.season, snapshotDate,
        leagueId, leagueName: lg.name, state: lg.state?.code ?? null, leagueRank: leagueRankById.get(leagueId) ?? null,
        strengthScore: lg.strengthScore, strengthTier: lg.strengthTier, rankedClubs: g.count, top25Clubs: g.top25, top100Clubs: g.top100,
        reasoning: lg.strengthReasoning ?? null, engineVersion: ENGINE_VERSION,
      },
    })
    report.leaguesArchived++
  }

  logger.info('Ranking run archived', { week: run.weekLabel, clubs: report.clubsArchived, leagues: report.leaguesArchived })
  return report
}
