/**
 * Senior Women's A Grade matcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Given a list of grade/competition names for an association's current season,
 * pick the ONE that represents Senior Women's A Grade netball — following the
 * preferred order, and rejecting junior/reserve/social/men's grades.
 *
 * Pure and unit-testable — no browser, no network.
 */

// Preferred names, strongest → weakest (index = priority; lower is better).
const PREFERRED = [
  'a grade',
  'a grade women',
  'a grade netball',
  'a grade cup',
  'a grade dow cup',
  'a grade buckleys cup',
  'senior a grade',
  'premier division',
  'premier league',
  'open a',
  'division 1 women',
  'open women',
]

// If none of the preferred names match exactly, fall back to these "strength"
// keywords (still senior women's A-grade-ish).
const STRENGTH_KEYWORDS = ['a grade', 'premier', 'open', 'division 1']

// Any grade whose name contains one of these is rejected outright.
const REJECT = [
  'b grade', 'c grade', 'd grade', 'e grade',
  'reserve', 'reserves', 'social', 'mixed',
  'men', "men's", 'mens', 'boys', 'girls', 'masters',
  'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13', 'u12', 'u11',
  'under 19', 'under 17', 'under 15', 'under 13',
  '19 & under', '17 & under', '15 & under', '13 & under',
  'junior', 'juniors', 'netsetgo', 'net set go', 'net-set-go',
  '19/u', '17/u', '15/u', '13/u',
]

export interface GradeCandidate {
  name: string
  url?: string
  id?: string
}

export interface GradeMatch extends GradeCandidate {
  matchedRule: string
  priority: number
}

function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
}

// Sub-grade patterns: anything below the top grade. We keep only A-grade /
// Premier / Open A / Division 1, so reject Open B/C/D…, and Division /
// Open Division / Section / Grade numbered 2 and above ("(?!1\b)" keeps 1).
const SUBGRADE_PATTERNS: RegExp[] = [
  /(^|[^a-z0-9])open\s+[b-z]([^a-z0-9]|$)/,                              // Open B/C/D… (not Open A)
  /(^|[^a-z0-9])(?:open\s+)?division\s+(?!1([^0-9]|$))\d+/,             // Division / Open Division 2+
  /(^|[^a-z0-9])section\s+(?!1([^0-9]|$))\d+/,                          // Section 2+
  /(^|[^a-z0-9])grade\s+(?!1([^0-9]|$))\d+/,                            // Grade 2+
]

/** Is this grade name a junior/reserve/men's/social/sub-grade we must reject?
 *  Uses alphanumeric boundaries so "men" doesn't match inside "women". */
export function isRejected(name: string): boolean {
  const n = norm(name)
  if (SUBGRADE_PATTERNS.some(re => re.test(n))) return true
  return REJECT.some(r => {
    const t = norm(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(n)
  })
}

/** A structured grade from PlayHQ's discoverSeason.grades[]. */
export interface StructuredGrade {
  id:     string
  name:   string
  gender: string | null   // "Women" | "Girls" | "Mixed" | "Men" …
  age:    string | null   // "Senior" | "U19" …
}

/**
 * Filter PlayHQ's structured grades to the Senior Women's A Grade(s).
 * A season can contain several (e.g. Bellarine FNL A Grade + Geelong FNL A
 * Grade), so this returns ALL qualifying grades, best-first.
 * Uses the structured gender/age fields plus name rules.
 */
export function filterSeniorWomensAGrade(grades: StructuredGrade[]): (StructuredGrade & { matchedRule: string })[] {
  const out: (StructuredGrade & { matchedRule: string; priority: number })[] = []

  for (const g of grades) {
    if (!g.name) continue
    // Structured guards: must be Women + Senior when those fields are present.
    if (g.gender && !/^women$/i.test(g.gender.trim())) continue
    if (g.age    && !/^senior$/i.test(g.age.trim()))    continue
    if (isRejected(g.name)) continue

    const n = norm(g.name)
    // Must look like a top senior grade.
    const pIdx = PREFERRED.findIndex(p => n.includes(p))
    const sIdx = STRENGTH_KEYWORDS.findIndex(k => n.includes(k))
    if (pIdx === -1 && sIdx === -1) continue

    out.push({
      ...g,
      matchedRule: pIdx >= 0 ? `preferred:${PREFERRED[pIdx]}` : `strength:${STRENGTH_KEYWORDS[sIdx]}`,
      priority:    pIdx >= 0 ? pIdx : 100 + sIdx,
    })
  }

  return out
    .sort((a, b) => a.priority - b.priority)
    .map(({ priority, ...rest }) => (void priority, rest))
}

/**
 * Pick the best Senior Women's A Grade from the candidates.
 * Returns undefined if nothing qualifies.
 */
export function matchAGrade(candidates: GradeCandidate[]): GradeMatch | undefined {
  const eligible = candidates.filter(c => c.name && !isRejected(c.name))

  // 1) Exact/contains match against the preferred list, in priority order.
  for (let i = 0; i < PREFERRED.length; i++) {
    const want = PREFERRED[i]
    const hit = eligible.find(c => {
      const n = norm(c.name)
      return n === want || n.includes(want)
    })
    if (hit) return { ...hit, matchedRule: `preferred:${want}`, priority: i }
  }

  // 2) Fallback: strongest by strength keyword order.
  for (let k = 0; k < STRENGTH_KEYWORDS.length; k++) {
    const kw = STRENGTH_KEYWORDS[k]
    const hit = eligible.find(c => norm(c.name).includes(kw))
    if (hit) return { ...hit, matchedRule: `strength:${kw}`, priority: 100 + k }
  }

  return undefined
}
