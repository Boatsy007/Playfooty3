/**
 * PlayHQ URL Classifier (pure, no network)
 * ─────────────────────────────────────────────────────────────────────────────
 * Given ANY PlayHQ URL a user pastes, work out what it points at and extract
 * every routing token we can (tenant sport, org slug, competition/season slug,
 * grade slug, grade id, whether it is already a ladder URL).
 *
 * PlayHQ public URL shapes (football is commonly tenant "afl"):
 *
 *   Association   /{tenant}/org/{orgSlug}
 *   Association   /{tenant}/org/{orgSlug}/{hexOrgId}
 *   Competition   /{tenant}/org/{orgSlug}/{compSlug}
 *   Season/Grade  /{tenant}/org/{orgSlug}/{compSlug}/{gradeSlug}/{gradeId}
 *   Ladder        /{tenant}/org/{orgSlug}/{compSlug}/{gradeSlug}/{gradeId}/ladder
 *   Fixtures      /{tenant}/org/{orgSlug}/{compSlug}/{gradeSlug}/{gradeId}/fixture
 *
 * The classifier is deliberately forgiving: PlayHQ occasionally reshapes these
 * paths, so we anchor on the stable `/org/{slug}` segment and the terminal
 * `/ladder` | `/fixture` markers, and treat a long hex/uuid token as the grade
 * id. Anything we cannot pin down comes back as UNKNOWN with whatever tokens we
 * did recover, so the importer can still fall back to association resolution.
 */

export type PlayHQUrlKind =
  | 'ASSOCIATION'
  | 'COMPETITION'
  | 'GRADE'
  | 'LADDER'
  | 'FIXTURE'
  | 'UNKNOWN'

export interface ParsedPlayHQUrl {
  ok:            boolean
  kind:          PlayHQUrlKind
  tenant:        string | null   // e.g. "netball-australia" | "afl"
  orgSlug:       string | null   // the association org slug
  competitionSlug: string | null // competition/season slug segment (if present)
  gradeSlug:     string | null   // grade slug segment (if present)
  gradeId:       string | null   // long hex/uuid grade id (if present)
  isLadder:      boolean
  associationUrl: string | null  // canonical association landing URL
  ladderUrl:     string | null   // reconstructed ladder URL when we have all parts
  raw:           string
  warnings:      string[]
}

const HEX_ID = /^[a-f0-9]{6,}$/i        // PlayHQ grade/org ids are long hex strings
const UUID    = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

function looksLikeId(seg: string): boolean {
  return UUID.test(seg) || HEX_ID.test(seg)
}

/** Parse and classify a pasted PlayHQ URL. Never throws. */
export function parsePlayHQUrl(input: string): ParsedPlayHQUrl {
  const raw = (input ?? '').trim()
  const base: ParsedPlayHQUrl = {
    ok: false, kind: 'UNKNOWN', tenant: null, orgSlug: null, competitionSlug: null,
    gradeSlug: null, gradeId: null, isLadder: false, associationUrl: null, ladderUrl: null,
    raw, warnings: [],
  }

  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return { ...base, warnings: ['Not a valid URL'] }
  }

  if (!/(^|\.)playhq\.com$/i.test(url.hostname)) {
    return { ...base, warnings: [`Not a playhq.com URL (host: ${url.hostname})`] }
  }

  const segs = url.pathname.split('/').map(s => s.trim()).filter(Boolean)
  // Expect: {tenant}/org/{orgSlug}/...
  const orgIdx = segs.indexOf('org')
  if (orgIdx === -1 || orgIdx + 1 >= segs.length) {
    return { ...base, tenant: segs[0] ?? null, warnings: ['No /org/{slug} segment found'] }
  }

  const tenant  = segs[orgIdx - 1] ?? segs[0] ?? null
  const orgSlug = segs[orgIdx + 1]
  const rest    = segs.slice(orgIdx + 2)   // everything after the org slug

  const isLadder  = rest.includes('ladder')
  const isFixture = rest.includes('fixture') || rest.includes('fixtures')

  // Walk the rest, classifying each token.
  let competitionSlug: string | null = null
  let gradeSlug: string | null = null
  let gradeId: string | null = null
  for (const seg of rest) {
    if (seg === 'ladder' || seg === 'fixture' || seg === 'fixtures' || seg === 'games' || seg === 'results') continue
    if (looksLikeId(seg)) { gradeId = seg; continue }
    if (competitionSlug == null) competitionSlug = seg
    else if (gradeSlug == null) gradeSlug = seg
  }

  // The first token after org may itself be a long hex — that's an org id, not a
  // competition. Treat a lone id-looking first segment as the org id, not comp.
  if (competitionSlug && looksLikeId(competitionSlug)) { competitionSlug = null }

  const tenantSafe = tenant ?? 'netball-australia'
  const associationUrl = `https://www.playhq.com/${tenantSafe}/org/${orgSlug}`

  let ladderUrl: string | null = null
  if (isLadder) {
    ladderUrl = url.toString()
  } else if (competitionSlug && gradeSlug && gradeId) {
    ladderUrl = `${associationUrl}/${competitionSlug}/${gradeSlug}/${gradeId}/ladder`
  }

  // Decide kind
  let kind: PlayHQUrlKind = 'UNKNOWN'
  if (isLadder) kind = 'LADDER'
  else if (isFixture) kind = 'FIXTURE'
  else if (gradeId) kind = 'GRADE'
  else if (competitionSlug) kind = 'COMPETITION'
  else kind = 'ASSOCIATION'

  const warnings: string[] = []
  if (tenantSafe === 'afl') {
    warnings.push('AFL tenant detected. Confirm this URL points to the football competition/grade you want to import.')
  }

  return {
    ok: true, kind, tenant: tenantSafe, orgSlug, competitionSlug, gradeSlug, gradeId,
    isLadder, associationUrl, ladderUrl, raw, warnings,
  }
}
