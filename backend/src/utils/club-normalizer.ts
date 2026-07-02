/**
 * Club Name Normaliser
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts raw scraped club names into canonical form and detects
 * likely duplicates. The DB's `club_name_variants` table is the source
 * of truth — this module handles the initial matching logic.
 *
 * Design:
 * 1. Strip common suffixes/prefixes to extract the core name
 * 2. Apply token-level similarity scoring
 * 3. If similarity > MATCH_THRESHOLD → treat as same club
 * 4. If similarity in [REVIEW_THRESHOLD, MATCH_THRESHOLD) → queue for review
 * 5. Below REVIEW_THRESHOLD → create new club candidate
 */

const MATCH_THRESHOLD  = 0.85
const REVIEW_THRESHOLD = 0.65

// Suffixes/prefixes that carry no distinguishing information
const STRIP_TOKENS = [
  'netball', 'club', 'nc', 'ladies', 'womens', "women's",
  'association', 'assoc', 'inc', 'football', 'sporting',
  'grade', 'a-grade', 'aagrade',
]

const STATE_ABBREVIATIONS: Record<string, string> = {
  'new south wales': 'NSW', 'nsw': 'NSW',
  'victoria': 'VIC', 'vic': 'VIC',
  'queensland': 'QLD', 'qld': 'QLD',
  'western australia': 'WA', 'wa': 'WA',
  'south australia': 'SA', 'sa': 'SA',
  'tasmania': 'TAS', 'tas': 'TAS',
  'northern territory': 'NT', 'nt': 'NT',
  'australian capital territory': 'ACT', 'act': 'ACT',
}

// Known manual overrides — add here when edge-cases are discovered
const OVERRIDES: Record<string, string> = {
  'wagga':           'Wagga Wagga Netball Club',
  'wagga wagga':     'Wagga Wagga Netball Club',
  'wagga wagga nc':  'Wagga Wagga Netball Club',
  'dubbo nc':        'Dubbo Netball Club',
  'dubbo':           'Dubbo Netball Club',
  'ballarat':        'Ballarat Lightning',
  'mount gambier':   'Mount Gambier Aces',
}

export function tokenise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STRIP_TOKENS.includes(t))
}

export function normaliseClubName(raw: string): {
  canonical: string
  confidence: number
  needsReview: boolean
} {
  const cleaned = raw.trim()
  const lower   = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()

  // Manual override first — highest confidence
  if (OVERRIDES[lower]) {
    return { canonical: OVERRIDES[lower], confidence: 1.0, needsReview: false }
  }

  // Title-case the stripped token set
  const tokens   = tokenise(cleaned)
  const canonical = tokens
    .map(t => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ')

  // Without DB lookup, confidence is heuristic
  const confidence = canonical.length > 3 ? 0.8 : 0.5

  return {
    canonical: canonical || cleaned,
    confidence,
    needsReview: confidence < MATCH_THRESHOLD,
  }
}

/** Jaccard similarity on token sets — fast approximate match */
export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(tokenise(a))
  const tb = new Set(tokenise(b))
  const intersection = [...ta].filter(t => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : intersection / union
}

/** Find the best match for `rawName` among `candidates`. */
export function findBestMatch(
  rawName: string,
  candidates: { id: string; name: string }[],
): { id: string; name: string; similarity: number } | null {
  let best: { id: string; name: string; similarity: number } | null = null

  for (const c of candidates) {
    const sim = tokenSimilarity(rawName, c.name)
    if (!best || sim > best.similarity) {
      best = { ...c, similarity: sim }
    }
  }

  if (!best || best.similarity < REVIEW_THRESHOLD) return null
  return best
}

export function resolveStateCode(raw: string): string | null {
  return STATE_ABBREVIATIONS[raw.toLowerCase().trim()] ?? null
}

export { MATCH_THRESHOLD, REVIEW_THRESHOLD }
