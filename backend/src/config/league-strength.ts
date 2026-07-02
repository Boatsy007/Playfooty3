/**
 * League Strength Scale
 * ─────────────────────────────────────────────────────────────────────────────
 * A transparent, editorial rating of how strong each country league's A Grade
 * netball competition is. Feeds the ranking engine's `leagueStrength` component
 * (0–100) and the star/tier shown on the site.
 *
 * Rated on: number of VNL players involved, representative honours, depth
 * across all A Grade teams, speed of play, and results against neighbouring
 * leagues. State competitions (e.g. the Victorian Netball League) sit ABOVE
 * these community leagues in the player pathway and are not rated on this scale.
 *
 * ★ scale → 0–100 score (fed to the engine) and a coarse 1–5 tier (for display):
 *   ★★★★★   Elite Country League      95 / tier 5
 *   ★★★★½   Premier Country League    87 / tier 5
 *   ★★★★    Strong Country League     79 / tier 4
 *   ★★★½    Above Average League      70 / tier 4
 *   ★★★     Average Country League    61 / tier 3
 *   ★★½     Developing League         52 / tier 3
 *   ★★      Lower Country League      43 / tier 2
 *   ★½      Emerging League           34 / tier 2
 *   ★       Emerging League           25 / tier 1
 */

export interface StrengthTierDef {
  stars:       number   // 1.0 – 5.0 in 0.5 steps
  label:       string
  score:       number   // 0–100, used by the ranking engine
  tier:        1 | 2 | 3 | 4 | 5
  description: string
}

/** The full scale, richest → weakest. */
export const STRENGTH_SCALE: StrengthTierDef[] = [
  { stars: 5.0, score: 95, tier: 5, label: 'Elite Country League',
    description: 'Consistently produces state-level representative players, multiple VNL players, exceptional depth. Premiership contenders would beat almost every other country league.' },
  { stars: 4.5, score: 87, tier: 5, label: 'Premier Country League',
    description: 'One of the strongest leagues in its state. Numerous representative players and high-quality coaching.' },
  { stars: 4.0, score: 79, tier: 4, label: 'Strong Country League',
    description: 'Very good A Grade standard with several VNL-quality players but less depth than the elite leagues.' },
  { stars: 3.5, score: 70, tier: 4, label: 'Above Average League',
    description: 'Strong top four teams, competitive, good skill level, but a noticeable gap to the best country competitions.' },
  { stars: 3.0, score: 61, tier: 3, label: 'Average Country League',
    description: 'Solid local A Grade competition. Good players but relatively few at representative level.' },
  { stars: 2.5, score: 52, tier: 3, label: 'Developing League',
    description: 'Competitive locally but lacks depth and elite talent.' },
  { stars: 2.0, score: 43, tier: 2, label: 'Lower Country League',
    description: 'Smaller talent pool, rebuilding clubs, lower overall standard.' },
  { stars: 1.5, score: 34, tier: 2, label: 'Emerging League',
    description: 'New or struggling competition with limited depth.' },
  { stars: 1.0, score: 25, tier: 1, label: 'Emerging League',
    description: 'New or struggling competition with very limited depth.' },
]

/** Map a star rating (1.0–5.0) to the nearest defined tier on the scale. */
export function strengthForStars(stars: number): StrengthTierDef {
  return STRENGTH_SCALE.reduce((best, cur) =>
    Math.abs(cur.stars - stars) < Math.abs(best.stars - stars) ? cur : best
  , STRENGTH_SCALE[0])
}

// ─── Known league ratings ─────────────────────────────────────────────────────
// Editorial A Grade netball strength for specific leagues. Keyed by canonical
// league name; matching is case-insensitive and space/punctuation tolerant.
// Add new leagues here as they are onboarded.

export const LEAGUE_STARS: { name: string; stars: number }[] = [
  { name: 'Geelong Football Netball League',              stars: 5.0 },
  { name: 'Goulburn Valley Football Netball League',      stars: 4.5 },
  { name: 'Ballarat Football Netball League',             stars: 4.5 },
  { name: 'Gippsland League',                             stars: 4.0 },
  { name: 'Geelong & District Football Netball League',   stars: 4.0 },
  { name: 'Ovens & Murray Football Netball League',       stars: 4.0 },
  { name: 'Bendigo Football Netball League',              stars: 4.0 },
  { name: 'North Gippsland Football-Netball League',      stars: 3.5 },
  { name: 'Mid Gippsland Football-Netball League',        stars: 3.0 },
]

/** Normalise a league name for tolerant matching. */
function normalise(name: string): string {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Resolve a league's strength from its name. Returns the matched tier, or
 * `undefined` if the league isn't in the registry (caller should then fall
 * back to a sensible default and flag it for editorial review).
 */
export function strengthForLeague(leagueName: string): StrengthTierDef | undefined {
  const target = normalise(leagueName)

  // Exact (normalised) match first
  const exact = LEAGUE_STARS.find(l => normalise(l.name) === target)
  if (exact) return strengthForStars(exact.stars)

  // Otherwise, match on distinctive tokens so "Gippsland League - A Grade
  // Netball" still resolves to "Gippsland League" — but never let the shorter
  // "Gippsland League" swallow "North Gippsland ...": prefer the longest
  // registry name whose significant words are all present in the target.
  const candidates = LEAGUE_STARS
    .map(l => ({ l, key: normalise(l.name) }))
    .filter(({ key }) => key.split(' ').every(w => target.includes(w)))
    .sort((a, b) => b.key.length - a.key.length)

  return candidates[0] ? strengthForStars(candidates[0].l.stars) : undefined
}
