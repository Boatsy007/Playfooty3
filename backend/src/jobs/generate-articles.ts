/**
 * AI Publishing — weekly draft generator.
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the latest COMPLETED ranking run and drafts a set of articles entirely
 * from REAL data (templated natural-language prose over actual numbers). Nothing
 * is invented. Drafts are stored as GeneratedArticle rows (status DRAFT) for the
 * operator to review, edit, approve and publish.
 *
 * Article types produced each week:
 *   • NATIONAL_ROUNDUP   — the week at the top of the national ladder
 *   • BIGGEST_MOVERS     — the biggest risers and fallers
 *   • STRONGEST_LEAGUES  — the national league strength picture
 *   • LEAGUE_ROUNDUP     — one per active league with enough data
 *
 * Re-running regenerates the current run's drafts in place (idempotent by slug),
 * but never touches an article an operator has already PUBLISHED or edited into
 * APPROVED — those are left as-is.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export type Block = { type: 'p' | 'h' | 'quote'; text: string }

interface Draft {
  slug: string; kind: string; category: string; title: string; subtitle: string
  summary: string; body: Block[]; heroSeed: string; tags: Record<string, unknown>
  seoTitle: string; seoDescription: string
}

export interface GenerateReport { weekLabel: string | null; created: number; updated: number; skipped: number; drafts: { kind: string; title: string; slug: string }[] }

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const shortLeague = (name: string) => name.replace(/\s*-\s*a grade.*/i, '').trim()

export async function generateWeeklyDrafts(): Promise<GenerateReport> {
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (!run) return { weekLabel: null, created: 0, updated: 0, skipped: 0, drafts: [] }
  const week = run.weekLabel

  const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
  if (entries.length === 0) return { weekLabel: week, created: 0, updated: 0, skipped: 0, drafts: [] }

  const leagues = await prisma.league.findMany({ where: { isActive: true, enabled: true, archivedAt: null }, include: { state: { select: { code: true, name: true } } } })
  const leagueByName = new Map(leagues.map(l => [l.name, l]))

  const drafts: Draft[] = []
  drafts.push(nationalRoundup(entries, week))
  const movers = biggestMovers(entries, week)
  if (movers) drafts.push(movers)
  const strong = strongestLeagues(leagues, entries, week)
  if (strong) drafts.push(strong)
  for (const l of leagues) {
    const d = leagueRoundup(l, entries.filter(e => e.leagueName === l.name), week)
    if (d) drafts.push(d)
  }

  let created = 0, updated = 0, skipped = 0
  const made: GenerateReport['drafts'] = []
  for (const d of drafts) {
    const existing = await prisma.generatedArticle.findUnique({ where: { slug: d.slug } })
    if (existing && (existing.status === 'PUBLISHED' || existing.status === 'APPROVED')) { skipped++; continue }
    const data = {
      kind: d.kind, category: d.category, title: d.title, subtitle: d.subtitle, summary: d.summary,
      body: JSON.stringify(d.body), heroSeed: d.heroSeed, tags: JSON.stringify(d.tags), status: 'DRAFT',
      runId: run.id, weekLabel: week, seoTitle: d.seoTitle, seoDescription: d.seoDescription,
    }
    if (existing) { await prisma.generatedArticle.update({ where: { slug: d.slug }, data }); updated++ }
    else { await prisma.generatedArticle.create({ data: { slug: d.slug, ...data } }); created++ }
    made.push({ kind: d.kind, title: d.title, slug: d.slug })
  }

  // Reference leagueByName so lint keeps the richer include (state) available to
  // future league-scoped copy without another query.
  void leagueByName
  logger.info('GenerateArticles: done', { week, created, updated, skipped })
  return { weekLabel: week, created, updated, skipped, drafts: made }
}

type Entry = Awaited<ReturnType<typeof prisma.rankingEntry.findMany>>[number]
const form = (e: Entry) => { try { return JSON.parse(e.recentForm || '[]') as string[] } catch { return [] } }
const wins = (e: Entry) => form(e).filter(f => f === 'W').length

// ─── National roundup ─────────────────────────────────────────────────────────
function nationalRoundup(entries: Entry[], week: string): Draft {
  const top = entries.slice(0, 10)
  const leader = top[0]
  const risers = entries.filter(e => e.previousRank != null && e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement)
  const body: Block[] = []
  body.push({ type: 'p', text: `${leader.clubName} sit on top of Australian community football this week, leading the national rankings with a power rating of ${leader.powerRating.toFixed(1)} out of the ${entries.length} ranked senior football clubs.` })
  body.push({ type: 'h', text: 'The national top five' })
  body.push({ type: 'p', text: top.slice(0, 5).map((e, i) => `${i + 1}. ${e.clubName} (${e.leagueName ? shortLeague(e.leagueName) : e.state}, ${e.powerRating.toFixed(1)})`).join('  ·  ') })
  if (risers[0] && risers[0].rankMovement > 0) {
    body.push({ type: 'h', text: 'On the move' })
    body.push({ type: 'p', text: `${risers[0].clubName} were the week's biggest climber, rising ${risers[0].rankMovement} place${risers[0].rankMovement === 1 ? '' : 's'} to #${risers[0].rank}${risers.length > 1 ? `, with ${risers[1].clubName} (up ${risers[1].rankMovement}) also on the charge` : ''}.` })
  }
  body.push({ type: 'p', text: `The national rankings are recalculated every week of the season from live ladder data across every tracked country and regional league.` })
  return {
    slug: `national-roundup-${week ? slugify(week) : 'latest'}`,
    kind: 'NATIONAL_ROUNDUP', category: 'rankings', heroSeed: 'national-roundup',
    title: `National roundup: ${leader.clubName} lead the country`,
    subtitle: `The week at the top of Australia's community football rankings${week ? `, ${week}` : ''}.`,
    summary: `${leader.clubName} top the national country footy rankings with a rating of ${leader.powerRating.toFixed(1)}${risers[0] && risers[0].rankMovement > 0 ? `, while ${risers[0].clubName} were the week's biggest climber.` : '.'}`,
    body, tags: { state: 'National' },
    seoTitle: `National Country Footy Rankings Roundup ${week ?? ''} | PlayFooty`.trim(),
    seoDescription: `This week's country footy national rankings: ${leader.clubName} lead from ${top[1]?.clubName ?? ''}. Biggest movers, the national top five and more on PlayFooty.`,
  }
}

// ─── Biggest movers ───────────────────────────────────────────────────────────
function biggestMovers(entries: Entry[], week: string): Draft | null {
  const moved = entries.filter(e => e.previousRank != null && e.rankMovement !== 0)
  const risers = moved.filter(e => e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement).slice(0, 5)
  const fallers = moved.filter(e => e.rankMovement < 0).sort((a, b) => a.rankMovement - b.rankMovement).slice(0, 5)
  if (risers.length === 0 && fallers.length === 0) return null
  const body: Block[] = []
  if (risers.length) {
    body.push({ type: 'h', text: 'Risers' })
    for (const e of risers) body.push({ type: 'p', text: `${e.clubName} climbed ${e.rankMovement} place${e.rankMovement === 1 ? '' : 's'} to #${e.rank} nationally${e.previousRank != null ? ` (up from #${e.previousRank})` : ''}, on the back of a ${wins(e)}-from-${form(e).length} recent run.` })
  }
  if (fallers.length) {
    body.push({ type: 'h', text: 'Fallers' })
    for (const e of fallers) body.push({ type: 'p', text: `${e.clubName} slipped ${Math.abs(e.rankMovement)} place${Math.abs(e.rankMovement) === 1 ? '' : 's'} to #${e.rank}${e.previousRank != null ? ` (from #${e.previousRank})` : ''}.` })
  }
  const lead = risers[0]
  return {
    slug: `biggest-movers-${week ? slugify(week) : 'latest'}`,
    kind: 'BIGGEST_MOVERS', category: 'rankings', heroSeed: 'biggest-movers',
    title: `Biggest movers: ${lead ? `${lead.clubName} surge` : 'the week in motion'}`,
    subtitle: `Who climbed and who slipped on the national ladder${week ? `, ${week}` : ''}.`,
    summary: lead ? `${lead.clubName} were the week's biggest riser, up ${lead.rankMovement} to #${lead.rank}. The full list of risers and fallers.` : 'The full list of risers and fallers on the national ladder this week.',
    body, tags: { state: 'National' },
    seoTitle: `Country Footy Rankings: Biggest Movers ${week ?? ''} | PlayFooty`.trim(),
    seoDescription: `The biggest risers and fallers in Australian community football this week${lead ? `, led by ${lead.clubName}` : ''}. National ranking movement on PlayFooty.`,
  }
}

// ─── Strongest leagues ────────────────────────────────────────────────────────
function strongestLeagues(leagues: LeagueWithState[], entries: Entry[], week: string): Draft | null {
  const ranked = leagues.filter(l => entries.some(e => e.leagueName === l.name)).sort((a, b) => b.strengthScore - a.strengthScore)
  if (ranked.length < 3) return null
  const body: Block[] = []
  body.push({ type: 'p', text: `${shortLeague(ranked[0].name)} is the strongest country footy competition in the land this week, on a strength rating of ${(ranked[0].strengthScore / 20).toFixed(1)} out of 5.` })
  body.push({ type: 'h', text: 'The national top five leagues' })
  for (let i = 0; i < Math.min(5, ranked.length); i++) {
    const l = ranked[i]
    const clubs = entries.filter(e => e.leagueName === l.name)
    const top100 = clubs.filter(e => e.rank <= 100).length
    body.push({ type: 'p', text: `${i + 1}. ${shortLeague(l.name)} (${l.state?.code ?? ''}) — ${(l.strengthScore / 20).toFixed(1)}/5, ${clubs.length} ranked club${clubs.length === 1 ? '' : 's'}${top100 ? `, ${top100} inside the national Top 100` : ''}.` })
  }
  body.push({ type: 'p', text: `League strength is calculated from the national ratings of each competition's clubs, never from ladder position alone.` })
  return {
    slug: `strongest-leagues-${week ? slugify(week) : 'latest'}`,
    kind: 'STRONGEST_LEAGUES', category: 'league-news', heroSeed: 'strongest-leagues',
    title: `Strongest leagues: ${shortLeague(ranked[0].name)} lead the way`,
    subtitle: `The national country footy league strength picture${week ? `, ${week}` : ''}.`,
    summary: `${shortLeague(ranked[0].name)} is rated the strongest country footy league in Australia this week, ahead of ${shortLeague(ranked[1].name)} and ${shortLeague(ranked[2].name)}.`,
    body, tags: { state: 'National' },
    seoTitle: `Strongest Country Footy Leagues ${week ?? ''} | PlayFooty`.trim(),
    seoDescription: `Australia's strongest country footy leagues ranked: ${shortLeague(ranked[0].name)}, ${shortLeague(ranked[1].name)}, ${shortLeague(ranked[2].name)} and more, by national strength rating.`,
  }
}

// ─── Per-league roundup ───────────────────────────────────────────────────────
type LeagueWithState = { id: string; name: string; strengthScore: number; state?: { code: string; name: string } | null }
function leagueRoundup(league: LeagueWithState, clubs: Entry[], week: string): Draft | null {
  if (clubs.length < 3) return null
  const sorted = [...clubs].sort((a, b) => a.rank - b.rank)
  const best = sorted[0]
  const riser = [...clubs].filter(e => e.previousRank != null && e.rankMovement > 0).sort((a, b) => b.rankMovement - a.rankMovement)[0]
  const name = shortLeague(league.name)
  const body: Block[] = []
  body.push({ type: 'p', text: `${best.clubName} are the highest nationally ranked club in the ${name} this week, sitting #${best.rank} in Australia on a rating of ${best.powerRating.toFixed(1)}.` })
  body.push({ type: 'h', text: `${name} on the national ladder` })
  body.push({ type: 'p', text: sorted.slice(0, 6).map(e => `${e.clubName} (#${e.rank})`).join('  ·  ') })
  if (riser && riser.rankMovement > 0) body.push({ type: 'p', text: `${riser.clubName} were the league's big improver, climbing ${riser.rankMovement} national place${riser.rankMovement === 1 ? '' : 's'} to #${riser.rank}.` })
  body.push({ type: 'p', text: `The ${name} has ${clubs.length} club${clubs.length === 1 ? '' : 's'} ranked nationally and carries a strength rating of ${(league.strengthScore / 20).toFixed(1)} out of 5.` })
  return {
    slug: `${slugify(name)}-roundup-${week ? slugify(week) : 'latest'}`,
    kind: 'LEAGUE_ROUNDUP', category: 'league-news', heroSeed: `${slugify(name)}`,
    title: `${name} roundup: ${best.clubName} lead the way`,
    subtitle: `Where the ${name} clubs stand nationally${week ? `, ${week}` : ''}.`,
    summary: `${best.clubName} are the top nationally ranked ${name} club at #${best.rank}${riser && riser.rankMovement > 0 ? `, while ${riser.clubName} were the league's biggest climber.` : '.'}`,
    body, tags: { state: league.state?.code ?? undefined, league: league.name, leagueId: league.id },
    seoTitle: `${name} Footy Roundup ${week ?? ''}: Rankings & Movers | PlayFooty`.trim(),
    seoDescription: `${name} country footy roundup: ${best.clubName} lead nationally at #${best.rank}. National rankings, movers and the league picture on PlayFooty.`,
  }
}
