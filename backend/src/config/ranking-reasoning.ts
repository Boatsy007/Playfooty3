/**
 * Ranking Reasoning (Phase 6) — plain-English explanations
 * ─────────────────────────────────────────────────────────────────────────────
 * Turns the numeric factor breakdowns the platform already computes into
 * human-readable reasoning:
 *
 *   • leagueStrengthReasoning() — why a league carries its strength rating,
 *     built from the StrengthV2 breakdown (top-5/top-8/overall/depth/bottom/
 *     nationally-competitive/parity), confidence, and any manual override.
 *
 *   • clubRankingReasoning() — why a club sits at its national rank, built from
 *     the per-factor componentScores stored on every RankingEntry, the weights
 *     used, recent form and rank movement.
 *
 * Pure + unit-testable. No DB, no network. Never invents numbers — every claim
 * traces back to a stored factor score.
 */

import type { StrengthV2Result } from './league-strength-v2.js'
import type { RankingWeights }   from '../types/index.js'
import { DEFAULT_WEIGHTS }       from '../types/index.js'

const fmt = (n: number) => Math.round(n).toString()
const pct = (n: number) => `${Math.round(n)}%`

// ─── League strength reasoning ────────────────────────────────────────────────

export interface LeagueReasoningInput {
  leagueName:     string
  v2:             StrengthV2Result
  manualOverride: number | null
  seasonsAvailable?: number
}

/** Band a 0–100 factor score into a descriptor. */
function band(score: number): string {
  if (score >= 80) return 'elite'
  if (score >= 68) return 'very strong'
  if (score >= 55) return 'strong'
  if (score >= 42) return 'moderate'
  if (score >= 30) return 'modest'
  return 'weak'
}

export function leagueStrengthReasoning(input: LeagueReasoningInput): string {
  const { v2, manualOverride } = input
  const b = v2.breakdown
  const parts: string[] = []

  if (manualOverride != null) {
    parts.push(`Strength is set by a manual override of ${manualOverride.toFixed(1)}★ — the operator's rating always wins over the automatic model.`)
  }

  if (b.teamCount === 0) {
    parts.push('No ranked clubs were available for this league, so it holds the neutral default (2.5★) until data arrives.')
    return parts.join(' ')
  }

  parts.push(
    `Automatic rating ${v2.rating.toFixed(1)}★ (${fmt(v2.score)}/100) from the national ratings of its ${b.teamCount} clubs — never from ladder position alone.`,
  )
  parts.push(
    `Top clubs are ${band(b.top5)} (best-5 average ${fmt(b.top5)}, best-8 ${fmt(b.top8)}); the overall standard is ${band(b.overall)} (${fmt(b.overall)}).`,
  )
  parts.push(
    `Depth is ${band(b.depth)} — the bottom half averages ${fmt(b.depth)} and the weakest club rates ${fmt(b.bottom)}.`,
  )
  if (b.nationallyCompetitive > 0) {
    parts.push(`${pct(b.nationallyCompetitive)} of its clubs are nationally competitive (rated 70+).`)
  } else {
    parts.push('No club currently reaches the nationally-competitive threshold (70+).')
  }
  parts.push(
    b.parity >= 60
      ? `Competition is even from top to bottom (parity ${fmt(b.parity)}/100), which strengthens the league's overall standard.`
      : `There is a wide gap between the strongest and weakest clubs (parity ${fmt(b.parity)}/100).`,
  )

  const confPct = Math.round(v2.confidence * 100)
  if (v2.needsReview) {
    const why: string[] = []
    if (b.teamCount < 5) why.push('a small competition')
    if (v2.confidence < 0.45) why.push('limited data')
    if (v2.score >= 70 && v2.confidence < 0.6) why.push('a high score resting on thin evidence')
    parts.push(`Confidence ${confPct}% — flagged for manual review (${why.join(', ') || 'low confidence'}).`)
  } else {
    parts.push(`Confidence ${confPct}%.`)
  }

  return parts.join(' ')
}

// ─── Club ranking reasoning ───────────────────────────────────────────────────

export interface ClubReasoningInput {
  clubName:    string
  leagueName:  string | null
  rank:        number
  powerRating: number
  rankMovement: number
  componentScores: Record<string, number>   // 0–100 per factor (as stored)
  recentForm:  string[]                     // e.g. ["W","W","L"]
  weights?:    RankingWeights
}

const FACTOR_LABELS: Record<string, string> = {
  winPercentage:        'win record',
  goalsFor:             'attacking output',
  goalsAgainst:         'defensive record',
  percentage:           'season percentage',
  leagueStrength:       'league strength',
  recentForm:           'recent form',
  finalsSuccess:        'finals success',
  strengthOfOpposition: 'strength of opposition',
  consistency:          'consistency',
}

export function clubRankingReasoning(input: ClubReasoningInput): string {
  const w = input.weights ?? DEFAULT_WEIGHTS
  const cs = input.componentScores ?? {}

  // Weighted contribution per factor → find what drives (and drags) the rating.
  const contributions = Object.entries(FACTOR_LABELS)
    .filter(([k]) => typeof cs[k] === 'number')
    .map(([k, label]) => ({ key: k, label, score: cs[k], contribution: cs[k] * (w[k as keyof RankingWeights] ?? 0) }))
    .sort((a, b) => b.contribution - a.contribution)

  const parts: string[] = []
  parts.push(`Ranked #${input.rank} nationally with a power rating of ${input.powerRating.toFixed(1)}${input.leagueName ? ` playing in ${input.leagueName}` : ''}.`)

  if (contributions.length > 0) {
    const top = contributions.slice(0, 3)
    parts.push(`Biggest drivers: ${top.map(c => `${c.label} (${fmt(c.score)}/100)`).join(', ')}.`)

    const weak = contributions.filter(c => c.score < 40 && (w[c.key as keyof RankingWeights] ?? 0) >= 0.05)
    if (weak.length > 0) {
      parts.push(`Held back by ${weak.slice(0, 2).map(c => `${c.label} (${fmt(c.score)}/100)`).join(' and ')}.`)
    }

    const ls = cs.leagueStrength
    if (typeof ls === 'number') {
      parts.push(
        ls >= 68
          ? `Playing in a ${band(ls)} league lifts the rating — results there carry more national weight.`
          : ls < 45
            ? `A ${band(ls)} league tempers the rating — dominant results are discounted against stronger competitions.`
            : `League strength (${fmt(ls)}/100) is weighted into every result.`,
      )
    }
  }

  if (input.recentForm.length > 0) {
    const wins = input.recentForm.filter(r => r === 'W').length
    parts.push(`Recent form: ${input.recentForm.join('-')} (${wins}/${input.recentForm.length} won).`)
  }

  if (input.rankMovement > 0) parts.push(`Up ${input.rankMovement} place${input.rankMovement === 1 ? '' : 's'} since last week.`)
  else if (input.rankMovement < 0) parts.push(`Down ${-input.rankMovement} place${input.rankMovement === -1 ? '' : 's'} since last week.`)

  return parts.join(' ')
}
