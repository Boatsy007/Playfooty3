/**
 * Article composer (Phase B3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Turns NewsSignals + the WeeklyAnalysis into journalist-quality DRAFT articles.
 * Prose explains WHY (movement, history, league strength, form, context), never
 * "team played well". Every article stores its editorial reasoning: why it
 * exists, which signals/rules triggered it, the source data and a confidence.
 *
 * Additive + safe:
 *   • Uses distinct slugs/kinds so it coexists with the existing AI-Publishing
 *     generateWeeklyDrafts (no slug collision).
 *   • Idempotent by slug; never overwrites an APPROVED or PUBLISHED article.
 *   • Links each article to its clubs/leagues/state/signals (ArticleLink).
 */

import { prisma } from '../db/client.js'
import type { WeeklyAnalysis } from './analysis.js'
import type { Signal } from './detector.js'
import { logger } from '../utils/logger.js'

type Block = { type: 'p' | 'h' | 'quote'; text: string }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const shortLeague = (name: string) => name.replace(/\s*-\s*a grade.*/i, '').trim()
const plural = (n: number, s = 's') => (Math.abs(n) === 1 ? '' : s)

interface Composed {
  slug: string; kind: string; category: string; title: string; subtitle: string; summary: string
  body: Block[]; heroSeed: string; tags: Record<string, unknown>; seoTitle: string; seoDescription: string
  reasoning: string; triggers: string[]; sourceData: Record<string, unknown>; confidence: number
  links: { entityType: string; entityId?: string; label?: string }[]
  signalKeys: string[]
}

export interface ComposeReport { weekLabel: string | null; created: number; updated: number; skipped: number; articles: { kind: string; slug: string }[] }

// ── Article builders (each returns null when it lacks qualifying data) ─────────

function rankingAnalysis(a: WeeklyAnalysis, w: string): Composed | null {
  if (!a.leader) return null
  const body: Block[] = []
  const topFive = a.risers.slice(0, 0) // placeholder to keep types happy
  void topFive
  body.push({ type: 'p', text: `${a.leader.clubName} head Australian country netball this week, topping the national rankings on a power rating of ${a.leader.powerRating.toFixed(1)} across ${a.totalRanked} ranked A Grade clubs.` })
  if (a.newNumberOne && a.previousLeader) {
    body.push({ type: 'p', text: `It is a changing of the guard: ${a.leader.clubName} have displaced ${a.previousLeader.clubName} at the summit, a shift driven by their form and the relative strength of their league rather than any single result.` })
  } else {
    body.push({ type: 'p', text: `${a.leader.clubName} hold the top spot for another week, a reflection of sustained rating rather than a one-off performance.` })
  }
  if (a.risers[0]) {
    const r = a.risers[0]
    body.push({ type: 'h', text: 'The week in movement' })
    body.push({ type: 'p', text: `${r.clubName} were the sharpest climbers, up ${r.rankMovement} place${plural(r.rankMovement)} to #${r.rank}${r.previousRank ? ` from #${r.previousRank}` : ''} on the back of a ${r.wins}-from-${r.played} recent run. Ranking movement here is earned against league strength — beating strong opposition moves the needle more than padding a record against weaker sides.` })
  }
  if (a.fallers[0]) {
    const f = a.fallers[0]
    body.push({ type: 'p', text: `At the other end, ${f.clubName} gave up ${Math.abs(f.rankMovement)} place${plural(f.rankMovement)} to #${f.rank}, the largest slide of the week.` })
  }
  body.push({ type: 'p', text: `Rankings are recomputed every week from live ladder data across every tracked country and regional league — no result is invented and no club is rated on reputation.` })
  return {
    slug: `ranking-analysis-${slug(w)}`, kind: 'RANKING_ANALYSIS', category: 'rankings', heroSeed: 'ranking-analysis',
    title: `Ranking analysis: ${a.leader.clubName} ${a.newNumberOne ? 'seize top spot' : 'stay on top'}`,
    subtitle: `What actually moved on the national ladder this week (${w}).`,
    summary: `${a.leader.clubName} lead the national country netball rankings${a.risers[0] ? `, with ${a.risers[0].clubName} the week's biggest climber` : ''}. The movement, and why it happened.`,
    body, tags: { state: 'National', kind: 'analysis' },
    seoTitle: `Country Netball Ranking Analysis ${w} | Got Netty`,
    seoDescription: `Why the national country netball rankings moved this week: ${a.leader.clubName} on top${a.risers[0] ? `, ${a.risers[0].clubName} climbing` : ''}. Analysis on Got Netty.`,
    reasoning: `Generated because a completed ranking run exists for ${w}. Leads on the national leader (${a.leader.clubName}); ${a.newNumberOne ? 'new #1 detected' : 'leader unchanged'}; ${a.risers.length} risers, ${a.fallers.length} fallers.`,
    triggers: ['leader', a.newNumberOne ? 'new_number_one' : 'leader_held', 'movement'],
    sourceData: { leader: a.leader, previousLeader: a.previousLeader, topRiser: a.risers[0] ?? null, topFaller: a.fallers[0] ?? null },
    confidence: 0.95,
    links: [{ entityType: 'RANKING', label: w }, { entityType: 'CLUB', entityId: a.leader.clubId, label: a.leader.clubName }, ...(a.risers[0] ? [{ entityType: 'CLUB', entityId: a.risers[0].clubId, label: a.risers[0].clubName }] : [])],
    signalKeys: [],
  }
}

function weeklyWinners(a: WeeklyAnalysis, w: string): Composed | null {
  const risers = a.risers.slice(0, 5)
  if (risers.length === 0 && a.undefeated.length === 0 && a.historicBests.length === 0) return null
  const body: Block[] = []
  if (risers.length) {
    body.push({ type: 'h', text: 'On the rise' })
    for (const r of risers) body.push({ type: 'p', text: `${r.clubName} climbed ${r.rankMovement} place${plural(r.rankMovement)} to #${r.rank}${r.previousRank ? ` (from #${r.previousRank})` : ''}, converting a ${r.wins}-from-${r.played} run into genuine national ground in the ${shortLeague(r.leagueName)}.` })
  }
  if (a.historicBests.length) {
    body.push({ type: 'h', text: 'Career-high territory' })
    for (const h of a.historicBests.slice(0, 4)) body.push({ type: 'p', text: `${h.clubName} have never been ranked higher — #${h.rank} betters a previous best of #${h.previousBest} across ${h.weeksTracked} tracked weeks.` })
  }
  if (a.undefeated.length) {
    body.push({ type: 'h', text: 'Still unbeaten' })
    body.push({ type: 'p', text: a.undefeated.slice(0, 6).map(u => `${u.clubName} (${u.wins}-0${u.draws ? `-${u.draws}` : ''})`).join('  ·  ') })
  }
  return {
    slug: `weekly-winners-${slug(w)}`, kind: 'WEEKLY_WINNERS', category: 'rankings', heroSeed: 'weekly-winners',
    title: `Weekly winners: ${risers[0]?.clubName ?? a.undefeated[0]?.clubName ?? 'the week\'s big movers'}`,
    subtitle: `The clubs who gained the most ground this week (${w}).`,
    summary: `${risers[0] ? `${risers[0].clubName} led the risers, up ${risers[0].rankMovement} to #${risers[0].rank}. ` : ''}The week's biggest winners across the national rankings.`,
    body, tags: { state: 'National', kind: 'winners' },
    seoTitle: `Country Netball Weekly Winners ${w} | Got Netty`,
    seoDescription: `The biggest country netball winners this week: risers, unbeaten clubs and career-high rankings. On Got Netty.`,
    reasoning: `Aggregates the week's positive signals: ${risers.length} risers, ${a.historicBests.length} historic bests, ${a.undefeated.length} undefeated.`,
    triggers: ['risers', 'historic_best', 'undefeated'],
    sourceData: { risers, historicBests: a.historicBests.slice(0, 4), undefeated: a.undefeated.slice(0, 6) },
    confidence: 0.9,
    links: [{ entityType: 'RANKING', label: w }, ...risers.slice(0, 3).map(r => ({ entityType: 'CLUB', entityId: r.clubId, label: r.clubName }))],
    signalKeys: [],
  }
}

function weeklyLosers(a: WeeklyAnalysis, w: string): Composed | null {
  const fallers = a.fallers.slice(0, 5)
  const exits = a.crossings.filter(c => c.direction === 'EXIT')
  if (fallers.length === 0 && exits.length === 0) return null
  const body: Block[] = []
  if (fallers.length) {
    body.push({ type: 'h', text: 'Losing ground' })
    for (const f of fallers) body.push({ type: 'p', text: `${f.clubName} dropped ${Math.abs(f.rankMovement)} place${plural(f.rankMovement)} to #${f.rank}${f.previousRank ? ` from #${f.previousRank}` : ''} — a slide that reflects results going against them relative to a strengthening field, not a collapse in isolation.` })
  }
  if (exits.length) {
    body.push({ type: 'h', text: 'Out of the picture' })
    for (const c of exits) body.push({ type: 'p', text: `${c.clubName} slipped outside the national Top ${c.threshold}.` })
  }
  return {
    slug: `weekly-losers-${slug(w)}`, kind: 'WEEKLY_LOSERS', category: 'rankings', heroSeed: 'weekly-losers',
    title: `Weekly losers: ${fallers[0]?.clubName ?? 'who went backwards'}`,
    subtitle: `The clubs who lost the most ground this week (${w}).`,
    summary: `${fallers[0] ? `${fallers[0].clubName} led the fallers, down ${Math.abs(fallers[0].rankMovement)} to #${fallers[0].rank}. ` : ''}Where ground was lost on the national ladder.`,
    body, tags: { state: 'National', kind: 'losers' },
    seoTitle: `Country Netball Weekly Losers ${w} | Got Netty`,
    seoDescription: `The clubs that went backwards on the national country netball ladder this week, and the context behind it. On Got Netty.`,
    reasoning: `Aggregates the week's negative signals: ${fallers.length} fallers, ${exits.length} top-tier exits.`,
    triggers: ['fallers', 'exits'],
    sourceData: { fallers, exits }, confidence: 0.85,
    links: [{ entityType: 'RANKING', label: w }, ...fallers.slice(0, 3).map(f => ({ entityType: 'CLUB', entityId: f.clubId, label: f.clubName }))],
    signalKeys: [],
  }
}

function clubSpotlight(a: WeeklyAnalysis, w: string): Composed | null {
  // Lead subject: new #1, else best historic-best, else biggest riser.
  const subject = a.newNumberOne && a.leader ? a.leader
    : a.historicBests[0] ? a.risers.find(r => r.clubId === a.historicBests[0].clubId) ?? a.risers[0]
    : a.risers[0]
  if (!subject) return null
  const hb = a.historicBests.find(h => h.clubId === subject.clubId)
  const body: Block[] = []
  body.push({ type: 'p', text: `${subject.clubName} are the story of the week. Sitting #${subject.rank} nationally on a rating of ${subject.powerRating.toFixed(1)}, they play out of the ${shortLeague(subject.leagueName)} in ${subject.state}.` })
  if (subject.rankMovement > 0) body.push({ type: 'p', text: `Their ${subject.rankMovement}-place rise${subject.previousRank ? ` from #${subject.previousRank}` : ''} is no accident — a ${subject.wins}-from-${subject.played} recent stretch has been rewarded because it came against the calibre of opponent their league provides.` })
  if (hb) body.push({ type: 'p', text: `It is also historic: #${hb.rank} is the highest ${subject.clubName} have ever been ranked, eclipsing a previous best of #${hb.previousBest}.` })
  body.push({ type: 'p', text: `Every figure here is drawn from ${subject.clubName}'s real ladder and ranking record — form, rating and history, nothing more.` })
  return {
    slug: `club-spotlight-${slug(subject.clubName)}-${slug(w)}`, kind: 'CLUB_SPOTLIGHT', category: 'clubs', heroSeed: slug(subject.clubName),
    title: `Club spotlight: ${subject.clubName}`,
    subtitle: `Why ${subject.clubName} are the club to watch this week (${w}).`,
    summary: `${subject.clubName} sit #${subject.rank} nationally${subject.rankMovement > 0 ? `, up ${subject.rankMovement} this week` : ''}${hb ? ' — a club-record ranking' : ''}.`,
    body, tags: { state: subject.state, league: subject.leagueName, leagueId: subject.leagueId, club: subject.clubName, clubId: subject.clubId, kind: 'spotlight' },
    seoTitle: `${subject.clubName} — Country Netball Club Spotlight ${w} | Got Netty`,
    seoDescription: `${subject.clubName} are ranked #${subject.rank} in Australian country netball${hb ? ', a club-record high' : ''}. The form and history behind it, on Got Netty.`,
    reasoning: `${subject.clubName} chosen as spotlight because ${a.newNumberOne && a.leader?.clubId === subject.clubId ? 'they became the new #1' : hb ? 'they hit a club-record ranking' : 'they were the biggest riser'}.`,
    triggers: [a.newNumberOne ? 'new_number_one' : 'biggest_rise', ...(hb ? ['historic_best'] : [])],
    sourceData: { subject, historicBest: hb ?? null }, confidence: 0.9,
    links: [{ entityType: 'CLUB', entityId: subject.clubId, label: subject.clubName }, { entityType: 'LEAGUE', entityId: subject.leagueId, label: subject.leagueName }, { entityType: 'STATE', label: subject.state }],
    signalKeys: [],
  }
}

function leagueAnalysis(a: WeeklyAnalysis, w: string): Composed | null {
  const improved = a.leagueStrength.filter(l => l.delta != null).sort((x, y) => (y.delta ?? 0) - (x.delta ?? 0))[0]
  const strongest = [...a.leagueStrength].sort((x, y) => y.strengthScore - x.strengthScore)[0]
  if (!strongest) return null
  const body: Block[] = []
  body.push({ type: 'p', text: `${strongest.leagueName} is rated the strongest country netball competition in the field this week at ${(strongest.strengthScore / 20).toFixed(1)} out of 5, carrying ${strongest.rankedClubs} nationally ranked club${plural(strongest.rankedClubs)}.` })
  if (improved && improved.delta && improved.delta > 0.01 && improved.leagueId !== strongest.leagueId) {
    body.push({ type: 'p', text: `The sharpest riser is ${improved.leagueName}, whose strength lifted ${improved.delta.toFixed(2)} on last week${improved.highestEver ? ' — a competition-record rating' : ''}, a sign its clubs are winning games that matter against quality opposition.` })
  } else if (strongest.highestEver) {
    body.push({ type: 'p', text: `For ${strongest.leagueName} it is a high-water mark: this is the strongest the competition has ever rated.` })
  }
  const race = a.closestRace[0]
  if (race) body.push({ type: 'p', text: `On the ladder, the tightest premiership race belongs to the ${race.leagueName}, where just ${race.topTwoPointGap} point${plural(race.topTwoPointGap)} separate ${race.leader} and ${race.chaser}.` })
  body.push({ type: 'p', text: `League strength is derived from the national ratings of each competition's clubs — it rewards depth and quality, never mere ladder position.` })
  return {
    slug: `league-analysis-${slug(w)}`, kind: 'LEAGUE_ANALYSIS', category: 'league-news', heroSeed: 'league-analysis',
    title: `League analysis: ${shortLeague(strongest.leagueName)} set the standard`,
    subtitle: `The national league-strength picture, and what's moving (${w}).`,
    summary: `${shortLeague(strongest.leagueName)} is the strongest country netball league this week${improved && improved.delta && improved.delta > 0 ? `, while ${shortLeague(improved.leagueName)} is climbing fastest` : ''}.`,
    body, tags: { state: 'National', kind: 'league-analysis' },
    seoTitle: `Country Netball League Analysis ${w} | Got Netty`,
    seoDescription: `Australia's strongest country netball leagues and the fastest-climbing competitions this week. Analysis on Got Netty.`,
    reasoning: `Leads on strongest league (${strongest.leagueName}); ${improved ? `most improved ${improved.leagueName} (Δ${improved.delta?.toFixed(2)})` : 'no strength change history yet'}.`,
    triggers: ['league_strength', ...(improved ? ['most_improved_league'] : []), ...(race ? ['closest_race'] : [])],
    sourceData: { strongest, improved: improved ?? null, closestRace: race ?? null }, confidence: 0.88,
    links: [{ entityType: 'LEAGUE', entityId: strongest.leagueId, label: strongest.leagueName }, ...(improved ? [{ entityType: 'LEAGUE', entityId: improved.leagueId, label: improved.leagueName }] : [])],
    signalKeys: [],
  }
}

function historicMilestones(a: WeeklyAnalysis, w: string): Composed | null {
  const entries = a.crossings.filter(c => c.direction === 'ENTER')
  if (entries.length === 0 && a.historicBests.length === 0 && !a.leagueStrength.some(l => l.highestEver)) return null
  const body: Block[] = []
  if (entries.length) {
    body.push({ type: 'h', text: 'Breaking through' })
    for (const c of entries) body.push({ type: 'p', text: `${c.clubName} cracked the national Top ${c.threshold} for the first time this run, climbing to #${c.rank}${c.previousRank ? ` from #${c.previousRank}` : ''}.` })
  }
  if (a.historicBests.length) {
    body.push({ type: 'h', text: 'Career highs' })
    for (const h of a.historicBests.slice(0, 6)) body.push({ type: 'p', text: `${h.clubName} reached a club-record #${h.rank}, past a previous best of #${h.previousBest}.` })
  }
  const records = a.leagueStrength.filter(l => l.highestEver)
  if (records.length) {
    body.push({ type: 'h', text: 'Competition records' })
    for (const l of records) body.push({ type: 'p', text: `${l.leagueName} is rated its strongest ever at ${(l.strengthScore / 20).toFixed(1)}/5.` })
  }
  return {
    slug: `historic-milestones-${slug(w)}`, kind: 'HISTORIC_MILESTONES', category: 'rankings', heroSeed: 'historic-milestones',
    title: `Historic milestones: records tumble across the country`,
    subtitle: `The career-highs and firsts logged this week (${w}).`,
    summary: `${entries.length + a.historicBests.length} clubs and ${records.length} league${plural(records.length)} hit historic marks this week.`,
    body, tags: { state: 'National', kind: 'milestones' },
    seoTitle: `Country Netball Historic Milestones ${w} | Got Netty`,
    seoDescription: `Career-high rankings, Top-10/25/50 breakthroughs and competition records in Australian country netball this week. On Got Netty.`,
    reasoning: `${entries.length} threshold entries, ${a.historicBests.length} club-record ranks, ${records.length} league strength records.`,
    triggers: ['crossings', 'historic_best', 'league_strength_record'],
    sourceData: { entries, historicBests: a.historicBests.slice(0, 6), records }, confidence: 0.95,
    links: [{ entityType: 'RANKING', label: w }, ...entries.slice(0, 4).map(c => ({ entityType: 'CLUB', entityId: c.clubId, label: c.clubName }))],
    signalKeys: [],
  }
}

function topPerformers(a: WeeklyAnalysis, w: string): Composed | null {
  if (a.highestScoring.length === 0 && a.bestDefence.length === 0 && a.undefeated.length === 0) return null
  const body: Block[] = []
  if (a.highestScoring.length) {
    body.push({ type: 'h', text: 'Firepower' })
    for (const h of a.highestScoring.slice(0, 3)) body.push({ type: 'p', text: `${h.clubName} average ${(h.goalsFor / Math.max(1, h.played)).toFixed(1)} goals a game (${h.goalsFor} across ${h.played}) — the sharpest attack going around.` })
  }
  if (a.bestDefence.length) {
    body.push({ type: 'h', text: 'The wall' })
    for (const d of a.bestDefence.slice(0, 3)) body.push({ type: 'p', text: `${d.clubName} concede just ${(d.goalsAgainst / Math.max(1, d.played)).toFixed(1)} a game, the meanest defence on the board.` })
  }
  if (a.undefeated.length) {
    body.push({ type: 'h', text: 'Unbeaten' })
    body.push({ type: 'p', text: a.undefeated.slice(0, 6).map(u => `${u.clubName} (${u.wins}-0${u.draws ? `-${u.draws}` : ''}, ${u.percentage.toFixed(0)}%)`).join('  ·  ') })
  }
  return {
    slug: `top-performers-${slug(w)}`, kind: 'TOP_PERFORMERS', category: 'rankings', heroSeed: 'top-performers',
    title: `Top performers: the best attack, defence and unbeaten runs`,
    subtitle: `The standout statistical performers this week (${w}).`,
    summary: `${a.highestScoring[0] ? `${a.highestScoring[0].clubName} lead the scoring` : ''}${a.bestDefence[0] ? `${a.highestScoring[0] ? '; ' : ''}${a.bestDefence[0].clubName} the defence` : ''}.`,
    body, tags: { state: 'National', kind: 'performers' },
    seoTitle: `Country Netball Top Performers ${w} | Got Netty`,
    seoDescription: `The best attacking, defensive and unbeaten country netball clubs this week, by real ladder data. On Got Netty.`,
    reasoning: `${a.highestScoring.length} scoring leaders, ${a.bestDefence.length} defensive leaders, ${a.undefeated.length} undefeated — all from real season ladders.`,
    triggers: ['highest_scoring', 'best_defence', 'undefeated'],
    sourceData: { highestScoring: a.highestScoring.slice(0, 3), bestDefence: a.bestDefence.slice(0, 3), undefeated: a.undefeated.slice(0, 6) }, confidence: 0.85,
    links: [{ entityType: 'RANKING', label: w }],
    signalKeys: [],
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function persist(run: { id: string }, c: Composed, week: string): Promise<'created' | 'updated' | 'skipped'> {
  const existing = await prisma.generatedArticle.findUnique({ where: { slug: c.slug } })
  if (existing && (existing.status === 'PUBLISHED' || existing.status === 'APPROVED')) return 'skipped'
  const dedupeKey = `${c.kind}:${slug(week)}`
  const data = {
    kind: c.kind, category: c.category, title: c.title, subtitle: c.subtitle, summary: c.summary,
    body: JSON.stringify(c.body), heroSeed: c.heroSeed, tags: JSON.stringify(c.tags), status: 'DRAFT',
    runId: run.id, weekLabel: week, seoTitle: c.seoTitle, seoDescription: c.seoDescription,
    confidence: c.confidence, reasoning: c.reasoning, triggers: JSON.stringify(c.triggers),
    sourceData: JSON.stringify(c.sourceData), dedupeKey,
  }
  const article = existing
    ? await prisma.generatedArticle.update({ where: { slug: c.slug }, data })
    : await prisma.generatedArticle.create({ data: { slug: c.slug, ...data } })

  // Rebuild links idempotently.
  await prisma.articleLink.deleteMany({ where: { articleId: article.id } })
  if (c.links.length) {
    await prisma.articleLink.createMany({ data: c.links.map(l => ({ articleId: article.id, entityType: l.entityType, entityId: l.entityId ?? null, label: l.label ?? null })) })
  }
  return existing ? 'updated' : 'created'
}

/** Compose all article types from the analysis. Idempotent + APPROVED/PUBLISHED-safe. */
export async function composeArticles(a: WeeklyAnalysis, _signals: Signal[]): Promise<ComposeReport> {
  const w = a.weekLabel
  const run = { id: a.runId }
  const builders = [rankingAnalysis, weeklyWinners, weeklyLosers, clubSpotlight, leagueAnalysis, historicMilestones, topPerformers]
  let created = 0, updated = 0, skipped = 0
  const articles: ComposeReport['articles'] = []
  for (const build of builders) {
    const c = build(a, w)
    if (!c) continue
    const outcome = await persist(run, c, w)
    if (outcome === 'created') created++; else if (outcome === 'updated') updated++; else skipped++
    if (outcome !== 'skipped') articles.push({ kind: c.kind, slug: c.slug })
  }

  // Mark this week's signals as used (best-effort; supports the "duplicate topic" guard).
  await prisma.newsSignal.updateMany({ where: { weekLabel: w, usedInArticle: false }, data: { usedInArticle: true } }).catch(() => {})

  logger.info('Newsroom articles composed', { week: w, created, updated, skipped })
  return { weekLabel: w, created, updated, skipped, articles }
}
