/**
 * Club Identity Validation (Phase 2 — real town / real club)
 * ─────────────────────────────────────────────────────────────────────────────
 * CNCA is a COUNTRY NETBALL database: every team must represent a real
 * football/netball club or country town. This module decides whether a scraped
 * / imported team name is a legitimate club identity or an anonymous placeholder
 * (a colour, a nickname, a "Division 1"/"Team 2" grade label) that must be
 * reviewed before it can stand on its own.
 *
 * It also resolves abbreviations/aliases to canonical club names where the
 * canonical form is known (e.g. TTU → Traralgon Tyers United), and normalises
 * names for duplicate detection.
 *
 * Pure + unit-testable. No browser, no DB.
 */

const norm = (s: string) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Anonymous / non-town tokens. A team whose name is ONLY one (or a couple) of
 * these — with no real town/club word attached — is not a valid standalone club
 * identity. These frequently appear as a club's 2nd/3rd team ("Vixens", "Blue").
 */
const ANON_WORDS = new Set([
  // colours
  'blue', 'white', 'red', 'gold', 'green', 'black', 'gold', 'maroon', 'navy', 'yellow', 'purple', 'orange', 'pink', 'silver',
  // generic nicknames used across many clubs
  'vixens', 'diamonds', 'mustangs', 'tigers', 'lions', 'eagles', 'magpies', 'saints', 'demons', 'bulldogs',
  'cats', 'hawks', 'swans', 'roos', 'kangaroos', 'bombers', 'panthers', 'cougars', 'sharks', 'storm',
  'thunder', 'lightning', 'flames', 'fury', 'force', 'rovers', 'wanderers', 'stars', 'suns', 'jets',
  // grade / team labels
  'division', 'div', 'open', 'senior', 'seniors', 'reserve', 'reserves', 'team', 'grade', 'section',
  'one', 'two', 'three', 'four', 'a', 'b', 'c', 'd',
])

const GRADE_LABEL_RE = /^(division|div|open|team|section|grade)\s*\d+$/i
const PURE_NUMBER_RE  = /^\d+$/

export type ClubIdentityVerdict = 'VALID' | 'REVIEW' | 'ANONYMOUS'

export interface ClubIdentityResult {
  verdict:      ClubIdentityVerdict
  reason:       string
  canonical:    string | null   // resolved canonical name, if an alias matched
  confidence:   number          // 0–1
  isAnonymous:  boolean
}

/**
 * Known abbreviation / alias → canonical club name. Country netball is full of
 * initialisms; resolving them keeps one club identity instead of splitting.
 * Extendable from the admin alias table at runtime (see resolveAlias overload).
 */
const CANONICAL_ALIASES: Record<string, string> = {
  ttu:  'Traralgon Tyers United Football Netball Club',
  yyn:  'Yallourn Yallourn North Football Netball Club',
  pfnc: 'Pinjarra Football Netball Club',
  narnargoon: 'Nar Nar Goon Football Netball Club',
}

/**
 * Resolve a raw name to a canonical club name using the built-in alias map plus
 * any runtime aliases (e.g. loaded from ClubNameVariant). Returns null when no
 * alias is known — the raw name is assumed canonical.
 */
export function resolveAlias(raw: string, runtimeAliases: Record<string, string> = {}): string | null {
  const key = norm(raw).replace(/\s+/g, '')
  const merged = { ...CANONICAL_ALIASES, ...normaliseAliasKeys(runtimeAliases) }
  return merged[key] ?? null
}

function normaliseAliasKeys(m: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(m)) out[norm(k).replace(/\s+/g, '')] = v
  return out
}

/** True if a token is a real-word place/club signal (not an anonymous placeholder). */
function hasRealClubSignal(name: string): boolean {
  const words = norm(name).split(' ').filter(Boolean)
  // Club-type words are a strong signal of a real club identity.
  if (/\b(fnc|fc|nc|fnetball|football|club|college|school|united|rovers|district|association|magpies)\b/i.test(name)) {
    // but "Rovers/Magpies" alone (in ANON_WORDS) shouldn't count — require another real word too
    const realWords = words.filter(w => !ANON_WORDS.has(w) && !PURE_NUMBER_RE.test(w))
    if (/\b(fnc|fc|nc|fnetball|football|club|college|school|united|district|association)\b/i.test(name)) return true
    return realWords.length > 0
  }
  // Otherwise a real club needs at least one word that isn't an anonymous token
  // and isn't a bare number.
  const realWords = words.filter(w => !ANON_WORDS.has(w) && !PURE_NUMBER_RE.test(w) && w.length >= 3)
  return realWords.length > 0
}

/**
 * Validate a team name as a club identity.
 * @param raw          the scraped/imported team name
 * @param runtimeAliases optional alias→canonical map (from the DB)
 */
export function validateClubIdentity(raw: string, runtimeAliases: Record<string, string> = {}): ClubIdentityResult {
  const name = (raw ?? '').trim()
  if (!name) return { verdict: 'ANONYMOUS', reason: 'empty name', canonical: null, confidence: 0, isAnonymous: true }

  // Alias hit → canonical, high confidence.
  const canonical = resolveAlias(name, runtimeAliases)
  if (canonical) return { verdict: 'VALID', reason: 'resolved via alias', canonical, confidence: 0.95, isAnonymous: false }

  const n = norm(name)
  const words = n.split(' ').filter(Boolean)

  // Pure grade/team label → anonymous.
  if (GRADE_LABEL_RE.test(name) || PURE_NUMBER_RE.test(n)) {
    return { verdict: 'ANONYMOUS', reason: 'grade/team label, no club', canonical: null, confidence: 0.1, isAnonymous: true }
  }

  // Every word is an anonymous token → anonymous (e.g. "Vixens", "Blue", "Gold Team").
  const allAnon = words.length > 0 && words.every(w => ANON_WORDS.has(w) || PURE_NUMBER_RE.test(w))
  if (allAnon) {
    return { verdict: 'ANONYMOUS', reason: `anonymous name ("${name}") — no real town/club`, canonical: null, confidence: 0.15, isAnonymous: true }
  }

  // Has a real club/town signal → valid.
  if (hasRealClubSignal(name)) {
    return { verdict: 'VALID', reason: 'real club/town signal present', canonical: null, confidence: 0.85, isAnonymous: false }
  }

  // Ambiguous — a single short token that isn't obviously anonymous. Send to review.
  return { verdict: 'REVIEW', reason: 'ambiguous club identity — verify town/club', canonical: null, confidence: 0.4, isAnonymous: false }
}

/**
 * Normalise a club name for duplicate detection. Strips club-type suffixes and
 * punctuation so "Churchill FNC", "Churchill Cougars" and "Churchill Football
 * Netball Club" collapse to the same key ("churchill").
 */
export function canonicalClubKey(name: string): string {
  let n = norm(name)
  // strip trailing nickname/colour tokens and club-type words
  n = n
    .replace(/\b(football (and )?netball club|netball club|football club|fnc|fnetc|fc|nc)\b/g, ' ')
    .replace(/\b(magpies|tigers|lions|eagles|cats|hawks|saints|demons|bulldogs|cougars|vixens|diamonds|mustangs|bombers|panthers|sharks|rovers|maroons|colts|blues|roos|giants|crows|dockers|power|swans|suns|jets|storm|thunder|lightning|flames|stars)\b/g, ' ')
    .replace(/\b(blue|white|red|gold|green|black|maroon|maroons|navy|yellow|purple|orange|pink|silver)\b/g, ' ')
    .replace(/\b(reserves?|division|div|open|senior|seniors|team|grade|section)\b/g, ' ')
    .replace(/\b(one|two|three|four|a|b|c|d|\d+)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return n || norm(name)
}

/** True if two club names are likely the same identity (duplicate). */
export function areLikelyDuplicateClubs(a: string, b: string): boolean {
  const ka = canonicalClubKey(a), kb = canonicalClubKey(b)
  if (!ka || !kb) return false
  return ka === kb || ka.includes(kb) || kb.includes(ka)
}
