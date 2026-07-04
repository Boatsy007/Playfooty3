/**
 * Country Football-Netball League classifier
 * ─────────────────────────────────────────────────────────────────────────────
 * CNCA imports ONLY genuine country Football-Netball Leagues. A league is kept
 * iff:
 *   1. its name is a Football-Netball League / Clubs (any punctuation), OR
 *   2. it is on the ALLOW_LIST of recognised country leagues (which may be named
 *      just "X League" or "X" without the word "netball").
 * Everything else — standalone Netball Associations, metro comps, juniors, reps,
 * social/night/indoor/school comps — is rejected.
 *
 * Pure + unit-testable. No browser, no DB.
 */

const norm = (s: string) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()

// A Football-Netball League by name (covers League/Leagues/Club/Clubs, and the
// FNL/FNC/FNA abbreviations).
const FNL_RE = /(football\s*(?:and\s*)?netball|netball\s*(?:and\s*)?football)\s*(league|leagues|club|clubs|association)?|(^|[^a-z])(fnl|fnc|fna|fndl)([^a-z]|$)/i

// Recognised country football (netball) leagues that must always be kept, even
// when PlayHQ stores them as just "X League" or "X". Matched on normalised name
// containing one of these keys.
const ALLOW_LIST = [
  // Victoria
  'afl barwon', 'ballarat', 'bellarine', 'bendigo', 'central highlands', 'central murray',
  'colac and district', 'east gippsland', 'ellinbank and district', 'geelong and district',
  'geelong', 'gippsland league', 'golden rivers', 'goulburn valley', 'hampden', 'heathcote and district',
  'horsham and district', 'kyabram and district', 'loddon valley', 'maryborough castlemaine',
  'mid gippsland', 'millewa', 'mininera and district', 'mornington peninsula', 'mpnfl', 'murray',
  'murray league', 'north central', 'north gippsland', 'omeo and district', 'outer east',
  'ovens and king', 'ovens and murray', 'picola and district', 'riddell and district',
  'south west district', 'sunraysia', 'tallangatta and district', 'upper murray',
  'warrnambool and district', 'western border', 'west gippsland', 'wimmera',
  // Interstate country football-netball leagues (football-league names)
  'peel', 'limestone coast', 'great southern', 'river murray',
  'kowree naracoorte tatiara',
]

export interface LeagueClassification {
  keep:     boolean
  category: 'FNL' | 'ALLOW_LIST' | 'NETBALL_ASSOCIATION' | 'REJECTED'
  reason:   string
}

export function classifyLeague(rawName: string): LeagueClassification {
  const n = norm(rawName)
  if (!n) return { keep: false, category: 'REJECTED', reason: 'empty name' }

  // 1) Genuine Football-Netball League by name → always keep.
  if (FNL_RE.test(rawName)) return { keep: true, category: 'FNL', reason: 'Football-Netball League' }

  // 2) Standalone Netball Association (and metro/junior/etc. variants) → reject,
  //    even if it contains an allow-list token (e.g. "Ballarat Netball Assoc").
  if (/\bnetball\s+(association|assn|assoc|inc|club|division)\b/.test(n) || /\bnetball\s+association\b/.test(n))
    return { keep: false, category: 'NETBALL_ASSOCIATION', reason: 'standalone netball association' }

  // 3) Recognised country league on the allow-list → keep.
  const hit = ALLOW_LIST.find(k => n === k || n.includes(k))
  if (hit) return { keep: true, category: 'ALLOW_LIST', reason: `allow-list: ${hit}` }

  // 4) Anything else is not a country football-netball league.
  return { keep: false, category: 'REJECTED', reason: 'not a country Football-Netball League' }
}

/** Convenience boolean. */
export const isCountryFootballNetballLeague = (name: string): boolean => classifyLeague(name).keep
