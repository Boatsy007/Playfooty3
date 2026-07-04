/**
 * Recompute league strength (v2, multi-factor) + re-rank
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-pass:
 *   1. Rank once (uses whatever strength is currently stored).
 *   2. For each active league, recompute strength from the NATIONAL power
 *      ratings of its member clubs (league-strength-v2). Manual overrides win;
 *      low-confidence leagues are flagged for manual review.
 *   3. Re-rank so the standings reflect the new strengths.
 *
 * Usage: tsx src/jobs/recompute-strength.ts
 */

import { prisma }       from '../db/client.js'
import { rankAndStore } from './playhq-scrape.js'
import { computeLeagueStrengthV2 } from '../config/league-strength-v2.js'
import { leagueStrengthReasoning } from '../config/ranking-reasoning.js'
import { finalStrength } from '../config/league-strength-auto.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }       from '../utils/logger.js'

export interface RecalcReport {
  leagues: { name: string; before: number; after: number; conf: number; review: boolean; reasoning: string }[]
  clubsRanked: number
  top: { rank: number; clubId?: string; clubName: string; leagueName: string | null; powerRating: number }[]
}

/**
 * Full national recalculation: rank → recompute every active league's strength
 * from its clubs' national ratings (manual overrides win) → re-rank. Returns a
 * report. Reusable by the CLI and the admin "Recalculate National Rankings".
 */
export async function recalculateNational(): Promise<RecalcReport> {
  const label = getISOWeekLabel()
  await rankAndStore(label)

  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return { leagues: [], clubsRanked: 0, top: [] }

  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, select: { leagueId: true, powerRating: true } })
  const byLeague = new Map<string, number[]>()
  for (const e of entries) { if (e.leagueId) byLeague.set(e.leagueId, [...(byLeague.get(e.leagueId) ?? []), e.powerRating]) }

  const leagues = await prisma.league.findMany({ where: { isActive: true, enabled: true }, include: { association: { select: { name: true } } } })
  const report: RecalcReport['leagues'] = []
  for (const l of leagues) {
    const ratings = byLeague.get(l.id) ?? []
    const cls = await prisma.clubLeagueSeason.findMany({ where: { leagueId: l.id, season: '2026', grade: 'A Grade' }, select: { played: true, goalsFor: true, goalsAgainst: true } })
    const dataComplete = cls.length > 0 && cls.every(c => c.played > 0 && (c.goalsFor > 0 || c.goalsAgainst > 0))
    const v2 = computeLeagueStrengthV2(ratings, 1, dataComplete)
    const final = finalStrength(v2.rating, l.manualStrengthOverride)
    const finalScore = l.manualStrengthOverride != null ? l.manualStrengthOverride * 20 : v2.score
    const reasoning = leagueStrengthReasoning({ leagueName: l.name, v2, manualOverride: l.manualStrengthOverride })
    await prisma.league.update({ where: { id: l.id }, data: { automaticStrengthRating: v2.rating, finalStrengthRating: final, strengthScore: finalScore, strengthTier: Math.max(1, Math.min(5, Math.round(final))), strengthConfidence: v2.confidence, needsStrengthReview: l.manualStrengthOverride == null && v2.needsReview, strengthReasoning: reasoning, strengthCalculatedAt: new Date() } })
    report.push({ name: l.association?.name ?? l.name, before: Math.round(l.strengthScore), after: Math.round(finalScore), conf: v2.confidence, review: l.manualStrengthOverride == null && v2.needsReview, reasoning })
  }

  const { clubsRanked } = await rankAndStore(label)
  const run2 = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  const top = run2 ? await prisma.rankingEntry.findMany({ where: { runId: run2.id }, orderBy: { rank: 'asc' }, take: 25, select: { rank: true, clubId: true, clubName: true, leagueName: true, powerRating: true } }) : []
  return { leagues: report.sort((a, b) => b.after - a.after), clubsRanked, top }
}

async function main() {
  const label = getISOWeekLabel()

  // Pass 1 — rank with current strengths so every club has a national rating.
  logger.info('Strength v2: pass 1 ranking')
  await rankAndStore(label)

  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) { console.log('No completed ranking run found.'); await prisma.$disconnect(); return }

  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, select: { leagueId: true, powerRating: true } })
  const byLeague = new Map<string, number[]>()
  for (const e of entries) {
    if (!e.leagueId) continue
    byLeague.set(e.leagueId, [...(byLeague.get(e.leagueId) ?? []), e.powerRating])
  }

  const leagues = await prisma.league.findMany({ where: { isActive: true, enabled: true }, include: { association: { select: { name: true } } } })
  const report: { name: string; before: number; after: number; conf: number; review: boolean }[] = []

  for (const l of leagues) {
    const ratings = byLeague.get(l.id) ?? []
    // Data completeness for confidence: were played + goals recorded?
    const cls = await prisma.clubLeagueSeason.findMany({ where: { leagueId: l.id, season: '2026', grade: 'A Grade' }, select: { played: true, goalsFor: true, goalsAgainst: true } })
    const dataComplete = cls.length > 0 && cls.every(c => c.played > 0 && (c.goalsFor > 0 || c.goalsAgainst > 0))

    const v2 = computeLeagueStrengthV2(ratings, 1, dataComplete)
    const final = finalStrength(v2.rating, l.manualStrengthOverride)
    const finalScore = l.manualStrengthOverride != null ? l.manualStrengthOverride * 20 : v2.score

    await prisma.league.update({
      where: { id: l.id },
      data: {
        automaticStrengthRating: v2.rating,
        finalStrengthRating:     final,
        strengthScore:           finalScore,
        strengthTier:            Math.max(1, Math.min(5, Math.round(final))),
        strengthConfidence:      v2.confidence,
        needsStrengthReview:     l.manualStrengthOverride == null && v2.needsReview,
        strengthReasoning:       leagueStrengthReasoning({ leagueName: l.name, v2, manualOverride: l.manualStrengthOverride }),
        strengthCalculatedAt:    new Date(),
      },
    })
    report.push({ name: l.association?.name ?? l.name, before: Math.round(l.strengthScore), after: Math.round(finalScore), conf: v2.confidence, review: l.manualStrengthOverride == null && v2.needsReview })
  }

  // Pass 2 — re-rank with the new strengths.
  logger.info('Strength v2: pass 2 ranking')
  const { clubsRanked } = await rankAndStore(label)

  console.log('\n═══ LEAGUE STRENGTH v2 ═══')
  console.log('  before  after  conf   review  league')
  for (const r of report.sort((a, b) => b.after - a.after)) {
    console.log(`  ${String(r.before).padStart(5)}  ${String(r.after).padStart(5)}  ${r.conf.toFixed(2)}   ${r.review ? '⚠ REVIEW' : '   ok  '}  ${r.name}`)
  }

  const top = await prisma.rankingEntry.findMany({ where: { runId: (await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } }))!.id }, orderBy: { rank: 'asc' }, take: 25, select: { rank: true, clubName: true, leagueName: true, powerRating: true } })
  console.log('\n─── TOP 25 (after v2) ───')
  for (const e of top) console.log(`  ${String(e.rank).padStart(3)}. ${e.clubName.padEnd(26)} ${(e.leagueName ?? '').padEnd(34)} ${e.powerRating.toFixed(2)}`)
  console.log(`\nClubs ranked: ${clubsRanked}`)
  console.log('═══ DONE ═══')
  await prisma.$disconnect()
}

main().catch(async e => { console.error('Strength v2 failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
