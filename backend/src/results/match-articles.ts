/**
 * Match-based article generation (Phase B5) — additive AI Publishing expansion.
 * ─────────────────────────────────────────────────────────────────────────────
 * Extends AI Publishing WITHOUT modifying the existing generate-articles.ts.
 * Composes DRAFT articles that understand match results, winning margins,
 * streaks and upsets — entirely from verified backend data (MatchResult,
 * MatchInsight, ClubMatchStat + the latest ranking run for movement context).
 * Distinct slugs/kinds so it coexists with every other generator; idempotent by
 * slug; never overwrites an APPROVED or PUBLISHED article. No score is invented.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

type Block = { type: 'p' | 'h' | 'quote'; text: string }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export interface MatchArticleReport { season: string | null; round: number | null; created: number; updated: number; skipped: number; articles: { kind: string; slug: string }[] }

async function persist(a: { slug: string; kind: string; category: string; title: string; subtitle: string; summary: string; body: Block[]; heroSeed: string; tags: Record<string, unknown>; seoTitle: string; seoDescription: string; reasoning: string; triggers: string[]; sourceData: unknown; confidence: number }, season: string, round: number | null, r: MatchArticleReport) {
  const existing = await prisma.generatedArticle.findUnique({ where: { slug: a.slug } })
  if (existing && (existing.status === 'PUBLISHED' || existing.status === 'APPROVED')) { r.skipped++; return }
  const data = {
    kind: a.kind, category: a.category, title: a.title, subtitle: a.subtitle, summary: a.summary,
    body: JSON.stringify(a.body), heroSeed: a.heroSeed, tags: JSON.stringify(a.tags), status: 'DRAFT',
    weekLabel: null as string | null, seoTitle: a.seoTitle, seoDescription: a.seoDescription,
    confidence: a.confidence, reasoning: a.reasoning, triggers: JSON.stringify(a.triggers), sourceData: JSON.stringify(a.sourceData), dedupeKey: `${a.kind}:${season}:r${round ?? 'x'}`,
  }
  if (existing) { await prisma.generatedArticle.update({ where: { slug: a.slug }, data }); r.updated++ }
  else { await prisma.generatedArticle.create({ data: { slug: a.slug, ...data } }); r.created++ }
  r.articles.push({ kind: a.kind, slug: a.slug })
}

/** Generate match-based DRAFT articles for the latest round of a season. */
export async function generateMatchArticles(season?: string): Promise<MatchArticleReport> {
  const report: MatchArticleReport = { season: season ?? null, round: null, created: 0, updated: 0, skipped: 0, articles: [] }

  // Resolve the season (latest with results) + its latest round.
  const latest = season
    ? await prisma.matchResult.findFirst({ where: { season }, orderBy: [{ round: 'desc' }] })
    : await prisma.matchResult.findFirst({ orderBy: [{ matchDate: 'desc' }] })
  if (!latest) { report.season = null; return report }
  const useSeason = latest.season
  report.season = useSeason
  const round = latest.round ?? null
  report.round = round

  const insights = await prisma.matchInsight.findMany({ where: { season: useSeason, ...(round != null ? { round } : {}) } })
  const byKind = (k: string) => insights.filter(i => i.kind === k)

  // ── Results wrap ────────────────────────────────────────────────────────────
  const biggest = byKind('BIGGEST_WIN')[0]
  const closest = byKind('CLOSEST_MATCH')[0]
  const highest = byKind('HIGHEST_SCORING')[0]
  const upsets = byKind('UPSET')
  const draws = byKind('DRAW')
  if (biggest || closest || highest || upsets.length) {
    const body: Block[] = []
    if (biggest) body.push({ type: 'p', text: biggest.headline + '.' })
    if (upsets.length) { body.push({ type: 'h', text: 'Upsets' }); for (const u of upsets.slice(0, 4)) body.push({ type: 'p', text: u.headline + '.' }) }
    if (closest) { body.push({ type: 'h', text: 'Down to the wire' }); body.push({ type: 'p', text: closest.headline + '.' }) }
    if (highest) { body.push({ type: 'h', text: 'Goal fest' }); body.push({ type: 'p', text: highest.headline + '.' }) }
    if (draws.length) { body.push({ type: 'p', text: `${draws.length} match${draws.length === 1 ? '' : 'es'} finished level.` }) }
    body.push({ type: 'p', text: 'Every result above is taken directly from verified match data — no score or statistic is estimated.' })
    await persist({
      slug: `results-wrap-${slug(useSeason)}-r${round ?? 'x'}`, kind: 'RESULTS_WRAP', category: 'results', heroSeed: 'results-wrap',
      title: `Results wrap${round != null ? `: round ${round}` : ''}`,
      subtitle: `The results that mattered${round != null ? ` in round ${round}` : ''}, ${useSeason}.`,
      summary: `${biggest ? biggest.headline + '. ' : ''}${upsets.length ? `${upsets.length} upset${upsets.length === 1 ? '' : 's'}. ` : ''}The round in results.`,
      body, tags: { season: useSeason, round, kind: 'results' },
      seoTitle: `Country Netball Results Wrap ${round != null ? `Round ${round} ` : ''}${useSeason} | Got Netty`,
      seoDescription: `Country netball results: biggest wins, upsets, closest games and highest-scoring matches${round != null ? ` from round ${round}` : ''}. On Got Netty.`,
      reasoning: `Composed from ${insights.length} match insights for ${useSeason}${round != null ? ` round ${round}` : ''}.`,
      triggers: ['biggest_win', 'closest_match', 'upset', 'highest_scoring'].filter(Boolean),
      sourceData: { biggest, closest, highest, upsets: upsets.slice(0, 4), draws: draws.length }, confidence: 0.9,
    }, useSeason, round, report)
  }

  // ── Streaks & undefeated ────────────────────────────────────────────────────
  const stats = await prisma.clubMatchStat.findMany({ where: { season: useSeason, played: { gt: 0 } } })
  const undefeated = stats.filter(s => s.losses === 0 && s.played >= 3).sort((a, b) => b.wins - a.wins)
  const hotStreaks = [...stats].filter(s => s.currentStreak >= 3).sort((a, b) => b.currentStreak - a.currentStreak)
  if (undefeated.length || hotStreaks.length) {
    const body: Block[] = []
    if (undefeated.length) { body.push({ type: 'h', text: 'Still perfect' }); body.push({ type: 'p', text: undefeated.slice(0, 8).map(s => `${s.clubName} (${s.wins}-0${s.draws ? `-${s.draws}` : ''})`).join('  ·  ') }) }
    if (hotStreaks.length) { body.push({ type: 'h', text: 'On a roll' }); for (const s of hotStreaks.slice(0, 6)) body.push({ type: 'p', text: `${s.clubName} have won ${s.currentStreak} in a row.` }) }
    body.push({ type: 'p', text: 'Streaks are counted from verified match results only.' })
    await persist({
      slug: `streaks-${slug(useSeason)}-r${round ?? 'x'}`, kind: 'STREAKS_REPORT', category: 'results', heroSeed: 'streaks',
      title: `Streaks: who's hot in ${useSeason}`,
      subtitle: `Winning runs and unbeaten clubs, ${useSeason}.`,
      summary: `${undefeated[0] ? `${undefeated[0].clubName} stay unbeaten. ` : ''}${hotStreaks[0] ? `${hotStreaks[0].clubName} have won ${hotStreaks[0].currentStreak} straight.` : ''}`.trim(),
      body, tags: { season: useSeason, kind: 'streaks' },
      seoTitle: `Country Netball Winning Streaks ${useSeason} | Got Netty`,
      seoDescription: `The longest winning streaks and unbeaten country netball clubs of ${useSeason}, from verified results. On Got Netty.`,
      reasoning: `${undefeated.length} undefeated, ${hotStreaks.length} clubs on 3+ win streaks (from ClubMatchStat).`,
      triggers: ['undefeated', 'winning_streak'], sourceData: { undefeated: undefeated.slice(0, 8).map(s => s.clubName), hotStreaks: hotStreaks.slice(0, 6).map(s => ({ club: s.clubName, streak: s.currentStreak })) }, confidence: 0.9,
    }, useSeason, round, report)
  }

  logger.info('Match articles generated', { season: useSeason, round, created: report.created, updated: report.updated })
  return report
}
