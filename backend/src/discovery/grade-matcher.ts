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

/** Is this grade name a junior/reserve/men's/social grade we must reject?
 *  Uses alphanumeric boundaries so "men" doesn't match inside "women". */
export function isRejected(name: string): boolean {
  const n = norm(name)
  return REJECT.some(r => {
    const t = norm(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(n)
  })
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
