/**
 * Story trigger engine (Phase B3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes a WeeklyAnalysis and applies deterministic trigger rules to emit
 * NewsSignals — each carrying its rule id, the exact metrics that fired it, a
 * confidence and a stable dedupeKey. Persisting is idempotent: the unique
 * dedupeKey means the same story is never recorded (or written) twice.
 *
 * Every signal is derived from real figures in the analysis. No rule fabricates
 * data; a rule that has no qualifying data simply emits nothing.
 */

import { prisma } from '../db/client.js'
import type { WeeklyAnalysis } from './analysis.js'
import { logger } from '../utils/logger.js'

export interface Signal {
  kind: string
  scope: 'NATIONAL' | 'LEAGUE' | 'CLUB'
  headline: string
  clubId?: string; clubName?: string
  leagueId?: string; leagueName?: string
  state?: string
  metrics: Record<string, unknown>
  triggerRule: string
  sourceData?: Record<string, unknown>
  confidence: number
  priority: number
  dedupeKey: string
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Apply all trigger rules to the analysis and return the raw signals. */
export function detectSignals(a: WeeklyAnalysis): Signal[] {
  const w = a.weekLabel
  const out: Signal[] = []
  const key = (parts: (string | number)[]) => parts.map(String).map(slug).join(':')

  // New number one
  if (a.newNumberOne && a.leader) {
    out.push({
      kind: 'NEW_NUMBER_ONE', scope: 'NATIONAL', triggerRule: 'leader.changed', confidence: 1, priority: 100,
      clubId: a.leader.clubId, clubName: a.leader.clubName, leagueName: a.leader.leagueName, state: a.leader.state,
      headline: `${a.leader.clubName} are the new national number one`,
      metrics: { rank: 1, powerRating: a.leader.powerRating, previousLeader: a.previousLeader?.clubName ?? null },
      sourceData: { leader: a.leader, previousLeader: a.previousLeader },
      dedupeKey: key(['new-no1', w, a.leader.clubId]),
    })
  }

  // Biggest rise / fall
  const topRise = a.risers[0]
  if (topRise && topRise.rankMovement >= 2) {
    out.push({
      kind: 'BIGGEST_RISE', scope: 'CLUB', triggerRule: 'rank.rise.max', confidence: 0.95, priority: 80,
      clubId: topRise.clubId, clubName: topRise.clubName, leagueName: topRise.leagueName, state: topRise.state,
      headline: `${topRise.clubName} climb ${topRise.rankMovement} to #${topRise.rank}`,
      metrics: { rankMovement: topRise.rankMovement, rank: topRise.rank, previousRank: topRise.previousRank, form: topRise.form },
      sourceData: { entry: topRise }, dedupeKey: key(['biggest-rise', w, topRise.clubId]),
    })
  }
  const topFall = a.fallers[0]
  if (topFall && Math.abs(topFall.rankMovement) >= 2) {
    out.push({
      kind: 'BIGGEST_FALL', scope: 'CLUB', triggerRule: 'rank.fall.max', confidence: 0.9, priority: 60,
      clubId: topFall.clubId, clubName: topFall.clubName, leagueName: topFall.leagueName, state: topFall.state,
      headline: `${topFall.clubName} slip ${Math.abs(topFall.rankMovement)} to #${topFall.rank}`,
      metrics: { rankMovement: topFall.rankMovement, rank: topFall.rank, previousRank: topFall.previousRank },
      sourceData: { entry: topFall }, dedupeKey: key(['biggest-fall', w, topFall.clubId]),
    })
  }

  // Threshold crossings (Top 10/25/50 entries, Top 100 exits)
  for (const c of a.crossings) {
    const label = c.direction === 'ENTER' ? `break into the national Top ${c.threshold}` : `drop out of the national Top ${c.threshold}`
    out.push({
      kind: c.direction === 'ENTER' ? `TOP${c.threshold}_ENTRY` : `TOP${c.threshold}_EXIT`, scope: 'CLUB',
      triggerRule: `crossing.${c.direction.toLowerCase()}.${c.threshold}`, confidence: 1, priority: c.direction === 'ENTER' ? 70 : 55,
      clubId: c.clubId, clubName: c.clubName, leagueName: c.leagueName, state: c.state,
      headline: `${c.clubName} ${label}`,
      metrics: { rank: c.rank, previousRank: c.previousRank, threshold: c.threshold, direction: c.direction },
      sourceData: { crossing: c }, dedupeKey: key(['cross', c.direction, c.threshold, w, c.clubId]),
    })
  }

  // New entrants to the rankings
  for (const m of a.newEntrants.slice(0, 5)) {
    out.push({
      kind: 'NEW_RANKED_CLUB', scope: 'CLUB', triggerRule: 'entry.new', confidence: 0.9, priority: 40,
      clubId: m.clubId, clubName: m.clubName, leagueName: m.leagueName, state: m.state,
      headline: `${m.clubName} enter the national rankings at #${m.rank}`,
      metrics: { rank: m.rank, powerRating: m.powerRating },
      sourceData: { entry: m }, dedupeKey: key(['new-ranked', w, m.clubId]),
    })
  }

  // Historic best rank
  for (const h of a.historicBests.slice(0, 8)) {
    out.push({
      kind: 'HISTORIC_BEST', scope: 'CLUB', triggerRule: 'club.rank.best-ever', confidence: 1, priority: 75,
      clubId: h.clubId, clubName: h.clubName,
      headline: `${h.clubName} reach their highest national ranking ever at #${h.rank}`,
      metrics: { rank: h.rank, previousBest: h.previousBest, weeksTracked: h.weeksTracked },
      sourceData: { historicBest: h }, dedupeKey: key(['historic-best', w, h.clubId, h.rank]),
    })
  }

  // Undefeated clubs
  for (const u of a.undefeated.slice(0, 8)) {
    out.push({
      kind: 'UNDEFEATED', scope: 'CLUB', triggerRule: 'ladder.undefeated', confidence: 1, priority: 65,
      clubId: u.clubId, clubName: u.clubName, leagueId: u.leagueId, leagueName: u.leagueName,
      headline: `${u.clubName} are still undefeated (${u.wins}-0${u.draws ? `-${u.draws}` : ''})`,
      metrics: { wins: u.wins, draws: u.draws, played: u.played, percentage: u.percentage },
      sourceData: { ladder: u }, dedupeKey: key(['undefeated', w, u.clubId]),
    })
  }

  // Highest scoring + best defence (league-agnostic leaders)
  const hs = a.highestScoring[0]
  if (hs && hs.played > 0) {
    out.push({
      kind: 'HIGHEST_SCORING', scope: 'CLUB', triggerRule: 'ladder.attack.max', confidence: 0.9, priority: 45,
      clubId: hs.clubId, clubName: hs.clubName, leagueId: hs.leagueId, leagueName: hs.leagueName,
      headline: `${hs.clubName} are the competition's most potent attack`,
      metrics: { goalsFor: hs.goalsFor, played: hs.played, perGame: +(hs.goalsFor / Math.max(1, hs.played)).toFixed(1) },
      sourceData: { ladder: hs }, dedupeKey: key(['highest-scoring', w, hs.clubId]),
    })
  }
  const bd = a.bestDefence[0]
  if (bd && bd.played >= 3) {
    out.push({
      kind: 'BEST_DEFENCE', scope: 'CLUB', triggerRule: 'ladder.defence.max', confidence: 0.9, priority: 45,
      clubId: bd.clubId, clubName: bd.clubName, leagueId: bd.leagueId, leagueName: bd.leagueName,
      headline: `${bd.clubName} own the meanest defence around`,
      metrics: { goalsAgainst: bd.goalsAgainst, played: bd.played, perGame: +(bd.goalsAgainst / Math.max(1, bd.played)).toFixed(1) },
      sourceData: { ladder: bd }, dedupeKey: key(['best-defence', w, bd.clubId]),
    })
  }

  // League strength changes + most improved
  const improved = a.leagueStrength.filter(l => l.delta != null && l.delta > 0.01).sort((a2, b2) => (b2.delta ?? 0) - (a2.delta ?? 0))[0]
  if (improved) {
    out.push({
      kind: 'MOST_IMPROVED_LEAGUE', scope: 'LEAGUE', triggerRule: 'league.strength.rise.max', confidence: 0.9, priority: 60,
      leagueId: improved.leagueId, leagueName: improved.leagueName, state: improved.state,
      headline: `${improved.leagueName} is the fastest-strengthening competition in the country`,
      metrics: { strengthScore: improved.strengthScore, previousScore: improved.previousScore, delta: improved.delta, highestEver: improved.highestEver },
      sourceData: { league: improved }, dedupeKey: key(['most-improved-league', w, improved.leagueId]),
    })
  }
  for (const l of a.leagueStrength.filter(x => x.highestEver)) {
    out.push({
      kind: 'LEAGUE_STRENGTH_RECORD', scope: 'LEAGUE', triggerRule: 'league.strength.best-ever', confidence: 1, priority: 55,
      leagueId: l.leagueId, leagueName: l.leagueName, state: l.state,
      headline: `${l.leagueName} is rated its strongest ever`,
      metrics: { strengthScore: l.strengthScore, rankedClubs: l.rankedClubs },
      sourceData: { league: l }, dedupeKey: key(['league-strength-record', w, l.leagueId]),
    })
  }

  // Closest premiership race + wooden spoon watch
  const race = a.closestRace[0]
  if (race && race.topTwoPointGap <= 4) {
    out.push({
      kind: 'CLOSEST_RACE', scope: 'LEAGUE', triggerRule: 'ladder.top2.gap.min', confidence: 0.85, priority: 50,
      leagueId: race.leagueId, leagueName: race.leagueName,
      headline: `The ${race.leagueName} premiership race is on a knife's edge`,
      metrics: { pointGap: race.topTwoPointGap, leader: race.leader, chaser: race.chaser },
      sourceData: { race }, dedupeKey: key(['closest-race', w, race.leagueId]),
    })
  }

  // Largest winning margin of the round
  const margin = a.largestMargins[0]
  if (margin && margin.margin > 0) {
    out.push({
      kind: 'LARGEST_MARGIN', scope: 'LEAGUE', triggerRule: 'match.margin.max', confidence: 0.85, priority: 40,
      leagueId: margin.leagueId, leagueName: margin.leagueName,
      headline: `${margin.margin}-goal blowout headlines the round`,
      metrics: { margin: margin.margin, homeClub: margin.homeClub, awayClub: margin.awayClub, score: `${margin.homeGoals}-${margin.awayGoals}` },
      sourceData: { match: margin }, dedupeKey: key(['largest-margin', w, margin.leagueId, margin.round ?? 'x']),
    })
  }

  return out
}

/** Persist signals, skipping any whose dedupeKey already exists. */
export async function persistSignals(a: WeeklyAnalysis, signals: Signal[]): Promise<{ created: number; skipped: number }> {
  let created = 0, skipped = 0
  for (const s of signals) {
    const existing = await prisma.newsSignal.findUnique({ where: { dedupeKey: s.dedupeKey } })
    if (existing) { skipped++; continue }
    await prisma.newsSignal.create({
      data: {
        weekLabel: a.weekLabel, season: a.season, kind: s.kind, scope: s.scope, headline: s.headline,
        clubId: s.clubId ?? null, clubName: s.clubName ?? null, leagueId: s.leagueId ?? null, leagueName: s.leagueName ?? null,
        state: s.state ?? null, metrics: JSON.stringify(s.metrics), triggerRule: s.triggerRule,
        sourceData: s.sourceData ? JSON.stringify(s.sourceData) : null, confidence: s.confidence, priority: s.priority,
        dedupeKey: s.dedupeKey,
      },
    })
    created++
  }
  logger.info('Newsroom signals persisted', { week: a.weekLabel, created, skipped })
  return { created, skipped }
}
