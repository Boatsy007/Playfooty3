/**
 * Results & Fixtures Engine orchestrator (Phase B5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Ties the pipeline together for a season: bridge legacy scraped matches into
 * the results store → recompute per-club statistics → detect match insights →
 * generate match-based DRAFT articles. Additive and idempotent; the only writes
 * are into the B5 tables + GeneratedArticle drafts + review items. Nothing else
 * is mutated.
 */

import { prisma } from '../db/client.js'
import { bridgeFromMatches } from './results.service.js'
import { computeClubStats } from './statistics.js'
import { computeMatchInsights } from './intelligence.js'
import { generateMatchArticles } from './match-articles.js'
import { computeLeagueRoundSummaries } from './rounds.js'
import { logger } from '../utils/logger.js'

export interface EngineOptions { season?: string; bridge?: boolean; generateArticles?: boolean }
export interface EngineReport {
  season: string | null
  bridge?: { created: number; updated: number; skipped: number; invalid: number }
  stats?: { clubs: number }
  insights?: { rounds: number; created: number }
  roundSummaries?: { rounds: number }
  articles?: { created: number; updated: number; skipped: number }
  warnings: string[]
}

async function resolveSeason(explicit?: string): Promise<string | null> {
  if (explicit) return explicit
  const s = await prisma.setting.findUnique({ where: { key: 'currentSeason' } }).catch(() => null)
  if (s?.value) return s.value
  const latest = await prisma.matchResult.findFirst({ orderBy: { matchDate: 'desc' }, select: { season: true } })
    ?? await prisma.match.findFirst({ orderBy: { matchDate: 'desc' }, select: { season: true } })
  return latest?.season ?? null
}

export async function runResultsEngine(opts: EngineOptions = {}): Promise<EngineReport> {
  const { bridge = true, generateArticles = true } = opts
  const report: EngineReport = { season: null, warnings: [] }
  const season = await resolveSeason(opts.season)
  if (!season) { report.warnings.push('no season with results to process'); return report }
  report.season = season

  if (bridge) {
    try { const b = await bridgeFromMatches({ season }); report.bridge = { created: b.created, updated: b.updated, skipped: b.skipped, invalid: b.invalid } }
    catch (e) { report.warnings.push(`bridge failed: ${String(e)}`) }
  }
  try { const s = await computeClubStats(season); report.stats = { clubs: s.clubs } } catch (e) { report.warnings.push(`stats failed: ${String(e)}`) }
  try { const i = await computeMatchInsights(season); report.insights = { rounds: i.rounds, created: i.created } } catch (e) { report.warnings.push(`insights failed: ${String(e)}`) }
  // B10 — round-by-round summaries for every league with results this season.
  try {
    const leagues = await prisma.matchResult.findMany({ where: { season }, distinct: ['leagueId'], select: { leagueId: true } })
    let rounds = 0
    for (const l of leagues) rounds += (await computeLeagueRoundSummaries(l.leagueId, season)).rounds
    report.roundSummaries = { rounds }
  } catch (e) { report.warnings.push(`round summaries failed: ${String(e)}`) }
  if (generateArticles) {
    try { const a = await generateMatchArticles(season); report.articles = { created: a.created, updated: a.updated, skipped: a.skipped } } catch (e) { report.warnings.push(`articles failed: ${String(e)}`) }
  }

  logger.info('Results engine run complete', { season, stats: report.stats, insights: report.insights })
  return report
}
