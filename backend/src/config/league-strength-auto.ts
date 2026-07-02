/**
 * Automatic League Strength
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes a league's strength rating (0–5) and a confidence (0–1) from its
 * ladder data. Transparent and pure — no network, no DB.
 *
 * IMPORTANT — honest limitation: ladder data from a single league, on its own,
 * measures INTERNAL competitiveness (depth, balance, spread), not absolute
 * standard versus other leagues. True cross-league strength needs inter-league
 * results / rep honours / multi-season history. Until we have those, the rating
 * is a best-effort from available signals, and `confidence` is deliberately
 * capped for single-season, incomplete, or small leagues.
 *
 * Factors used now:
 *   • number of teams              (bigger, established comps score higher)
 *   • depth                        (share of competitive mid-table teams)
 *   • balance / dominance          (even comps vs one team dominating)
 *   • data completeness            (played + GF/GA present) → confidence
 *   • seasons available            (multi-season → higher confidence)
 * Historical/cross-league factors slot in here later without schema change.
 */

export interface LadderStat {
  played:       number
  wins:         number
  losses:       number
  draws:        number
  goalsFor:     number
  goalsAgainst: number
  percentage:   number
}

export interface AutoStrengthResult {
  rating:     number   // 0–5, rounded to nearest 0.5
  confidence: number   // 0–1
  breakdown: {
    teamCount:    number
    teamsFactor:  number
    depth:        number
    balance:      number
    gfPresent:    boolean
    seasons:      number
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round5 = (v: number) => Math.round(v * 2) / 2

export function computeAutomaticStrength(entries: LadderStat[], seasonsAvailable = 1): AutoStrengthResult {
  const teamCount = entries.length
  if (teamCount === 0) {
    return { rating: 3.0, confidence: 0.1, breakdown: { teamCount: 0, teamsFactor: 0, depth: 0, balance: 0, gfPresent: false, seasons: seasonsAvailable } }
  }

  const winRates = entries.map(e => (e.played > 0 ? e.wins / e.played : 0))

  // More teams → generally a more established competition (4 → 0, 14+ → 1)
  const teamsFactor = clamp((teamCount - 4) / (14 - 4), 0, 1)

  // Depth: share of teams that are competitive mid-table (win rate 0.30–0.70)
  const competitive = winRates.filter(r => r >= 0.30 && r <= 0.70).length
  const depth = competitive / teamCount

  // Balance: low spread of win rates = even competition (stdev 0 → 1, ≥0.40 → 0)
  const mean = winRates.reduce((a, b) => a + b, 0) / teamCount
  const stdev = Math.sqrt(winRates.reduce((a, r) => a + (r - mean) ** 2, 0) / teamCount)
  const balance = clamp(1 - stdev / 0.40, 0, 1)

  // Composite quality → map to a 2.0–5.0 band, then round to 0.5.
  const quality01 = 0.40 * teamsFactor + 0.35 * depth + 0.25 * balance
  const rating = clamp(round5(2.0 + quality01 * 3.0), 2.0, 5.0)

  // Confidence: higher with more teams, complete data, and multiple seasons.
  const gfPresent  = entries.every(e => e.goalsFor > 0 || e.goalsAgainst > 0)
  const allPlayed  = entries.every(e => e.played > 0)
  const confidence = clamp(
    0.15 +
    0.35 * teamsFactor +
    0.20 * (gfPresent ? 1 : 0) +
    0.10 * (allPlayed ? 1 : 0) +
    0.20 * (seasonsAvailable > 1 ? 1 : 0),
    0, 1,
  )

  return { rating, confidence, breakdown: { teamCount, teamsFactor, depth, balance, gfPresent, seasons: seasonsAvailable } }
}

/** finalStrengthRating: manual override wins if present, else the automatic rating. */
export function finalStrength(automatic: number, manualOverride: number | null | undefined): number {
  return manualOverride != null ? manualOverride : automatic
}

/** The 0–100 score the ranking engine consumes, from the 0–5 final rating. */
export function strengthScoreFromRating(finalRating: number): number {
  return clamp(finalRating * 20, 0, 100)
}
