/**
 * Football URL ingestion + parser (Admin V3).
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side fetch + parse so operators paste URLs instead of rows. Dependency
 * free: given a page it tries, in order, (1) JSON body, (2) Next.js
 * `__NEXT_DATA__` embedded JSON, (3) Australian-football score text/tables in
 * the HTML. Returns normalised rows + a confidence + warnings; when nothing
 * structured can be extracted it returns an empty set with a clear warning so
 * the caller can route the import to review (never fabricated).
 *
 * AFL score notation is goals.behinds (total) — e.g. "12.8 (80)" = 12*6+8.
 */

import { logger } from '../utils/logger.js'

export interface ResultRow { homeName: string; awayName: string; homeGoals?: number; homeBehinds?: number; homePoints?: number; awayGoals?: number; awayBehinds?: number; awayPoints?: number; round?: string; matchDate?: string; venue?: string }
export interface FixtureRow { homeName: string; awayName: string; round?: string; matchDate?: string; time?: string; venue?: string }
export interface LadderRow { clubName: string; position?: number; played?: number; wins?: number; losses?: number; draws?: number; pointsFor?: number; pointsAgainst?: number; percentage?: number; points?: number }
export interface ParseOutcome<T> { rows: T[]; confidence: number; strategy: string; warnings: string[] }

export interface FetchedPage { url: string; ok: boolean; status: number; contentType: string; body: string; error?: string }

/** Fetch a page's text. Never throws — returns ok:false with a reason. */
export async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchedPage> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'PlayFooty/1.0 (+https://playfooty.com.au)', 'Accept': 'text/html,application/json,application/xhtml+xml' },
    })
    const contentType = res.headers.get('content-type') ?? ''
    const body = await res.text()
    return { url, ok: res.ok, status: res.status, contentType, body, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    logger.warn('fetchPage failed', { url, detail: String(e) })
    return { url, ok: false, status: 0, contentType: '', body: '', error: String(e) }
  }
}

// ── low-level helpers ─────────────────────────────────────────────────────────
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const stripTags = (html: string) => clean(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"'))

/** AFL score token: "12.8 (80)" | "12.8" | "(80)" → {goals,behinds,total}. */
function parseScoreToken(tok: string): { goals?: number; behinds?: number; total?: number } | null {
  const gb = /(\d{1,3})\.(\d{1,2})(?:\s*\((\d{1,3})\))?/.exec(tok)
  if (gb) return { goals: +gb[1], behinds: +gb[2], total: gb[3] != null ? +gb[3] : +gb[1] * 6 + +gb[2] }
  const tot = /\((\d{1,3})\)/.exec(tok)
  if (tot) return { total: +tot[1] }
  return null
}

function extractNextData(html: string): unknown | null {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

/** Deep-walk a JSON value collecting objects that satisfy `pick`. */
function walk<T>(root: unknown, pick: (o: Record<string, unknown>) => T | null, out: T[] = [], seen = new Set<unknown>(), depth = 0): T[] {
  if (out.length > 2000 || depth > 12 || root == null || typeof root !== 'object' || seen.has(root)) return out
  seen.add(root)
  if (Array.isArray(root)) { for (const v of root) walk(v, pick, out, seen, depth + 1); return out }
  const o = root as Record<string, unknown>
  const got = pick(o); if (got) out.push(got)
  for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, pick, out, seen, depth + 1)
  return out
}

const asNum = (v: unknown): number | undefined => { const n = Number(v); return Number.isFinite(n) ? n : undefined }
const teamName = (v: unknown): string | undefined => {
  if (typeof v === 'string' && v.trim()) return clean(v)
  if (v && typeof v === 'object') { const o = v as Record<string, unknown>; return teamName(o.name ?? o.teamName ?? o.displayName ?? o.title) }
  return undefined
}

// ── structured (JSON / __NEXT_DATA__) extraction ──────────────────────────────
function resultsFromJson(root: unknown): ResultRow[] {
  return walk<ResultRow>(root, o => {
    const home = teamName(o.homeTeam ?? o.home ?? o.homeTeamName ?? o.homeName)
    const away = teamName(o.awayTeam ?? o.away ?? o.awayTeamName ?? o.awayName)
    if (!home || !away) return null
    const hg = asNum(o.homeGoals), hb = asNum(o.homeBehinds), hp = asNum(o.homeScore ?? o.homePoints)
    const ag = asNum(o.awayGoals), ab = asNum(o.awayBehinds), ap = asNum(o.awayScore ?? o.awayPoints)
    if (hg == null && hp == null && ag == null && ap == null) return null // fixtures, not results
    return { homeName: home, awayName: away, homeGoals: hg, homeBehinds: hb, homePoints: hp, awayGoals: ag, awayBehinds: ab, awayPoints: ap, round: str(o.round ?? o.roundName), matchDate: str(o.date ?? o.startDate ?? o.matchDate), venue: teamName(o.venue) }
  })
}
function fixturesFromJson(root: unknown): FixtureRow[] {
  return walk<FixtureRow>(root, o => {
    const home = teamName(o.homeTeam ?? o.home ?? o.homeTeamName ?? o.homeName)
    const away = teamName(o.awayTeam ?? o.away ?? o.awayTeamName ?? o.awayName)
    if (!home || !away) return null
    return { homeName: home, awayName: away, round: str(o.round ?? o.roundName), matchDate: str(o.date ?? o.startDate ?? o.matchDate), time: str(o.time ?? o.startTime), venue: teamName(o.venue) }
  })
}
function ladderFromJson(root: unknown): LadderRow[] {
  return walk<LadderRow>(root, o => {
    const club = teamName(o.team ?? o.club ?? o.clubName ?? o.teamName ?? o.name)
    const played = asNum(o.played ?? o.P ?? o.games)
    const pts = asNum(o.points ?? o.premiershipPoints ?? o.pts)
    if (!club || (played == null && pts == null)) return null
    return { clubName: club, position: asNum(o.position ?? o.rank), played, wins: asNum(o.wins ?? o.won ?? o.W), losses: asNum(o.losses ?? o.lost ?? o.L), draws: asNum(o.draws ?? o.drawn ?? o.D), pointsFor: asNum(o.pointsFor ?? o.for ?? o.scoreFor), pointsAgainst: asNum(o.pointsAgainst ?? o.against ?? o.scoreAgainst), percentage: asNum(o.percentage ?? o.percent), points: pts }
  })
}
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? clean(v) : undefined)

// ── HTML text fallback (AFL score lines) ──────────────────────────────────────
/** "Home Team 12.8 (80) def/d/v/beat Away Team 9.10 (64)". */
function resultsFromText(text: string): ResultRow[] {
  const out: ResultRow[] = []
  // Team names exclude digits so round labels ("Round 1") can't bleed into them.
  const re = /([A-Z][A-Za-z'&./ -]{1,40}?)\s+(\d{1,3}\.\d{1,2}\s*\(\d{1,3}\))\s+(?:def(?:eated)?|beat|d|drew\s+with|lt|lost\s+to|v|vs|-)\s+([A-Z][A-Za-z'&./ -]{1,40}?)\s+(\d{1,3}\.\d{1,2}\s*\(\d{1,3}\))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const hs = parseScoreToken(m[2]), as = parseScoreToken(m[4])
    if (!hs || !as) continue
    out.push({ homeName: clean(m[1]), awayName: clean(m[3]), homeGoals: hs.goals, homeBehinds: hs.behinds, homePoints: hs.total, awayGoals: as.goals, awayBehinds: as.behinds, awayPoints: as.total })
    if (out.length > 500) break
  }
  return out
}

// ── public parse API ──────────────────────────────────────────────────────────
export function parseResults(page: FetchedPage): ParseOutcome<ResultRow> {
  const warnings: string[] = []
  if (!page.ok) return { rows: [], confidence: 0, strategy: 'none', warnings: [page.error ?? 'fetch failed'] }
  // 1) JSON body
  if (page.contentType.includes('json')) {
    try { const rows = resultsFromJson(JSON.parse(page.body)); if (rows.length) return { rows, confidence: 0.85, strategy: 'json', warnings } } catch { warnings.push('json parse failed') }
  }
  // 2) __NEXT_DATA__
  const nd = extractNextData(page.body)
  if (nd) { const rows = resultsFromJson(nd); if (rows.length) return { rows, confidence: 0.8, strategy: '__NEXT_DATA__', warnings } }
  // 3) HTML text
  const rows = resultsFromText(stripTags(page.body))
  if (rows.length) return { rows, confidence: 0.6, strategy: 'html-text', warnings }
  warnings.push('no results could be extracted from this page (JS-rendered page or unsupported format — PlayHQ API credentials may be required)')
  return { rows: [], confidence: 0, strategy: 'none', warnings }
}

export function parseFixtures(page: FetchedPage): ParseOutcome<FixtureRow> {
  const warnings: string[] = []
  if (!page.ok) return { rows: [], confidence: 0, strategy: 'none', warnings: [page.error ?? 'fetch failed'] }
  if (page.contentType.includes('json')) {
    try { const rows = fixturesFromJson(JSON.parse(page.body)); if (rows.length) return { rows, confidence: 0.85, strategy: 'json', warnings } } catch { warnings.push('json parse failed') }
  }
  const nd = extractNextData(page.body)
  if (nd) { const rows = fixturesFromJson(nd); if (rows.length) return { rows, confidence: 0.8, strategy: '__NEXT_DATA__', warnings } }
  warnings.push('no fixtures could be extracted (JS-rendered page or unsupported format — PlayHQ API credentials may be required)')
  return { rows: [], confidence: 0, strategy: 'none', warnings }
}

export function parseLadder(page: FetchedPage): ParseOutcome<LadderRow> {
  const warnings: string[] = []
  if (!page.ok) return { rows: [], confidence: 0, strategy: 'none', warnings: [page.error ?? 'fetch failed'] }
  if (page.contentType.includes('json')) {
    try { const rows = ladderFromJson(JSON.parse(page.body)); if (rows.length) return { rows, confidence: 0.85, strategy: 'json', warnings } } catch { warnings.push('json parse failed') }
  }
  const nd = extractNextData(page.body)
  if (nd) { const rows = ladderFromJson(nd); if (rows.length) return { rows, confidence: 0.8, strategy: '__NEXT_DATA__', warnings } }
  warnings.push('no ladder could be extracted (JS-rendered page or unsupported format — PlayHQ API credentials may be required)')
  return { rows: [], confidence: 0, strategy: 'none', warnings }
}
