/**
 * League Strength v2 — multi-factor, from national club ratings
 * ─────────────────────────────────────────────────────────────────────────────
 * The v1 model only measured a league's INTERNAL competitiveness (team count,
 * depth, balance), so it could not compare one league against another — a team
 * that dominated a weak league could out-rank a mid-table team in a strong one.
 *
 * v2 derives strength from how a league's clubs actually rate NATIONALLY. It is
 * computed in a second pass: rank once, then score each league from the power
 * ratings of its member clubs across these factors:
 *
 *   • Top-5 strength      — mean rating of the league's best 5 clubs   (0.30)
 *   • Top-8 strength      — mean rating of the best 8                  (0.15)
 *   • Overall standard    — mean rating of all clubs                   (0.20)
 *   • Depth               — mean of the bottom half (how far it falls) (0.10)
 *   • Bottom-club strength— the weakest club's rating                  (0.05)
 *   • Nationally competitive — share of clubs rated ≥ 70              (0.15)
 *   • Parity              — low spread of ratings = even competition   (0.05)
 *
 * Confidence reflects how much we can trust it: more clubs + complete data +
 * multiple seasons → higher. Cross-league signal (inter-league games, rep
 * honours) is not yet available, so confidence is capped and low-confidence
 * leagues are flagged for manual review — the operator's override always wins.
 */

export interface StrengthV2Result {
  score:        number   // 0–100 (what the ranking engine consumes)
  rating:       number   // 0–5, rounded to 0.5
  confidence:   number   // 0–1
  needsReview:  boolean
  breakdown: {
    teamCount: number; top5: number; top8: number; overall: number
    depth: number; bottom: number; nationallyCompetitive: number; parity: number
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round5 = (v: number) => Math.round(v * 2) / 2
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

const COMPETITIVE_THRESHOLD = 70   // a club rated ≥70 is "nationally competitive"

/**
 * @param clubRatings national power ratings (0–100) of the league's clubs
 * @param seasonsAvailable number of seasons of data we hold for this league
 * @param dataComplete whether every club had played games + goals recorded
 */
export function computeLeagueStrengthV2(
  clubRatings: number[],
  seasonsAvailable = 1,
  dataComplete = true,
): StrengthV2Result {
  const teamCount = clubRatings.length
  const zero = { teamCount, top5: 0, top8: 0, overall: 0, depth: 0, bottom: 0, nationallyCompetitive: 0, parity: 0 }
  if (teamCount === 0) return { score: 50, rating: 2.5, confidence: 0.1, needsReview: true, breakdown: zero }

  const sorted = [...clubRatings].sort((a, b) => b - a)
  const top5    = mean(sorted.slice(0, 5))
  const top8    = mean(sorted.slice(0, 8))
  const overall = mean(sorted)
  const bottomHalf = sorted.slice(Math.ceil(teamCount / 2))
  const depth   = mean(bottomHalf.length ? bottomHalf : sorted)
  const bottom  = sorted[sorted.length - 1]
  const competitive = (sorted.filter(r => r >= COMPETITIVE_THRESHOLD).length / teamCount) * 100
  // Parity: low stdev → even competition. stdev 0 → 100, stdev ≥25 → 0.
  const m = mean(sorted)
  const stdev = Math.sqrt(mean(sorted.map(r => (r - m) ** 2)))
  const parity = clamp((1 - stdev / 25) * 100, 0, 100)

  // Weighted composite → 0–100 strength score.
  const score = clamp(
    0.30 * top5 +
    0.15 * top8 +
    0.20 * overall +
    0.10 * depth +
    0.05 * bottom +
    0.15 * competitive +
    0.05 * parity,
    0, 100,
  )

  // Confidence: more clubs, complete data, multiple seasons → higher. Capped
  // because we have no cross-league signal yet.
  const teamsFactor = clamp((teamCount - 4) / (12 - 4), 0, 1)
  const confidence = clamp(
    0.20 + 0.30 * teamsFactor + 0.20 * (dataComplete ? 1 : 0) + 0.20 * (seasonsAvailable > 1 ? 1 : 0),
    0, 0.9,
  )

  return {
    score,
    rating: clamp(round5(score / 20), 1, 5),
    confidence,
    // Flag for review when we can't trust it, when it's a small comp, or when a
    // high score rests on low confidence (the risky "weak league rated strong").
    needsReview: confidence < 0.45 || teamCount < 5 || (score >= 70 && confidence < 0.6),
    breakdown: { teamCount, top5, top8, overall, depth, bottom, nationallyCompetitive: competitive, parity },
  }
}
