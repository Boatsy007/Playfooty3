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

export interface ResultRow { homeName: string; awayName: string; homeGoals?: number; homeBehinds?: number; homePoints?: number; awayGoals?: number; awayBehinds?: number; awayPoints?: number; round?: string; matchDate?: string; time?: string; venue?: string; status?: string; sourceUrl?: string }
export interface FixtureRow { homeName: string; awayName: string; round?: string; matchDate?: string; time?: string; venue?: string; status?: string; sourceUrl?: string }
export interface LadderRow { clubName: string; position?: number; played?: number; wins?: number; losses?: number; draws?: number; byes?: number; pointsFor?: number; pointsAgainst?: number; percentage?: number; points?: number; forfeits?: number; disqualified?: number; adjustedPoints?: number }
export interface ParseOutcome<T> { rows: T[]; confidence: number; strategy: string; warnings: string[] }

export interface FetchedPage { url: string; ok: boolean; status: number; contentType: string; body: string; error?: string; diagnostics?: Record<string, unknown> }

/** Fetch a page's text. Never throws — returns ok:false with a reason. */
export async function fetchPage(url: string, timeoutMs = 15000): Promise<FetchedPage> {
  if (shouldRenderPlayHq(url)) {
    const rendered = await fetchRenderedPlayHqPage(url, timeoutMs).catch(e => {
      logger.warn('PlayHQ rendered fetch failed, falling back to plain fetch', { url, detail: String(e) })
      return null
    })
    if (rendered?.ok && rendered.body) return rendered
  }
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

function shouldRenderPlayHq(url: string): boolean {
  return /\/\/(?:www\.)?playhq\.com\//i.test(url) && process.env.PLAYFOOTY_RENDER_PLAYHQ === '1'
}

async function fetchRenderedPlayHqPage(url: string, timeoutMs: number): Promise<FetchedPage> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] })
  const capturedJson: unknown[] = []
  try {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-AU',
    })
    const page = await ctx.newPage()
    page.on('response', async response => {
      const ct = response.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|analytics/i.test(response.url())) return
      try { capturedJson.push(await response.json()) } catch { /* ignore */ }
    })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    const title = await page.title().catch(() => '')
    let advancedLadderFound = false
    if (/\/ladder(?:$|[?#])/i.test(url)) advancedLadderFound = await enableAdvancedLadder(page)
    await page.waitForTimeout(3500)
    const tableCount = await page.locator('table, [role="table"], [role="grid"]').count().catch(() => 0)
    const html = await page.content()
    const diagnostics = { title, advancedLadderFound, tableCount, capturedJsonCount: capturedJson.length }
    logger.info('PlayHQ rendered page loaded', { url, ...diagnostics })
    console.log(`[playhq-render] url=${url}`)
    console.log(`[playhq-render] page title=${title || '(empty)'}`)
    console.log(`[playhq-render] advanced ladder button found=${advancedLadderFound ? 'yes' : 'no'}`)
    console.log(`[playhq-render] tables found=${tableCount}`)
    console.log(`[playhq-render] JSON responses captured=${capturedJson.length}`)
    return { url, ok: true, status: 200, contentType: 'text/html; rendered=playwright', body: `${html}\n<script id="__PLAYFOOTY_CAPTURED_JSON__" type="application/json">${JSON.stringify(capturedJson).replace(/</g, '\\u003c')}</script>`, diagnostics }
  } finally {
    await browser.close()
  }
}

async function enableAdvancedLadder(page: import('playwright').Page): Promise<boolean> {
  const controls = [
    page.getByRole('button', { name: /show advanced ladder/i }),
    page.getByRole('checkbox', { name: /show advanced ladder/i }),
    page.getByText(/show advanced ladder/i),
  ]
  for (const control of controls) {
    try {
      if (await control.first().isVisible({ timeout: 1500 })) {
        await control.first().click({ timeout: 3000 })
        await page.waitForTimeout(1500)
        return true
      }
    } catch { /* try next selector */ }
  }
  return false
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

function extractCapturedJson(html: string): unknown[] {
  const m = /<script id="__PLAYFOOTY_CAPTURED_JSON__"[^>]*>([\s\S]*?)<\/script>/i.exec(html)
  if (!m) return []
  try { const json = JSON.parse(m[1]); return Array.isArray(json) ? json : [json] } catch { return [] }
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
    const home = teamName(o.homeTeam ?? o.home ?? o.homeTeamName ?? o.homeName ?? o.homeCompetitor ?? o.homeSide)
    const away = teamName(o.awayTeam ?? o.away ?? o.awayTeamName ?? o.awayName ?? o.awayCompetitor ?? o.awaySide)
    if (!home || !away) return null
    const hs = parseScoreValue(o.homeScore ?? o.homePoints ?? o.homeResult ?? o.home)
    const as = parseScoreValue(o.awayScore ?? o.awayPoints ?? o.awayResult ?? o.away)
    const hg = asNum(o.homeGoals) ?? hs?.goals, hb = asNum(o.homeBehinds) ?? hs?.behinds, hp = asNum(o.homeScore ?? o.homePoints) ?? hs?.total
    const ag = asNum(o.awayGoals) ?? as?.goals, ab = asNum(o.awayBehinds) ?? as?.behinds, ap = asNum(o.awayScore ?? o.awayPoints) ?? as?.total
    if (hg == null && hp == null && ag == null && ap == null) return null // fixtures, not results
    return { homeName: home, awayName: away, homeGoals: hg, homeBehinds: hb, homePoints: hp, awayGoals: ag, awayBehinds: ab, awayPoints: ap, round: str(o.round ?? o.roundName), matchDate: str(o.date ?? o.startDate ?? o.matchDate ?? o.startTime), time: str(o.time ?? o.matchTime), venue: teamName(o.venue ?? o.venueName), status: str(o.status ?? o.matchStatus) }
  })
}
function fixturesFromJson(root: unknown): FixtureRow[] {
  return walk<FixtureRow>(root, o => {
    const home = teamName(o.homeTeam ?? o.home ?? o.homeTeamName ?? o.homeName ?? o.homeCompetitor ?? o.homeSide)
    const away = teamName(o.awayTeam ?? o.away ?? o.awayTeamName ?? o.awayName ?? o.awayCompetitor ?? o.awaySide)
    if (!home || !away) return null
    if (parseScoreValue(o.homeScore ?? o.homePoints ?? o.homeResult) || parseScoreValue(o.awayScore ?? o.awayPoints ?? o.awayResult)) return null
    return { homeName: home, awayName: away, round: str(o.round ?? o.roundName), matchDate: str(o.date ?? o.startDate ?? o.matchDate ?? o.startTime), time: str(o.time ?? o.startTime ?? o.matchTime), venue: teamName(o.venue ?? o.venueName), status: str(o.status ?? o.matchStatus) ?? 'upcoming' }
  })
}
function ladderFromJson(root: unknown): LadderRow[] {
  return walk<LadderRow>(root, o => {
    const club = teamName(o.team ?? o.club ?? o.clubName ?? o.teamName ?? o.name)
    const played = asNum(o.played ?? o.P ?? o.games)
    const pts = asNum(o.points ?? o.premiershipPoints ?? o.pts)
    if (!club || (played == null && pts == null)) return null
    return { clubName: club, position: asNum(o.position ?? o.rank), played, wins: asNum(o.wins ?? o.won ?? o.W), losses: asNum(o.losses ?? o.lost ?? o.L), draws: asNum(o.draws ?? o.drawn ?? o.D), byes: asNum(o.bye ?? o.byes), pointsFor: asNum(o.pointsFor ?? o.for ?? o.scoreFor), pointsAgainst: asNum(o.pointsAgainst ?? o.against ?? o.scoreAgainst), percentage: asNum(o.percentage ?? o.percent), points: pts, forfeits: asNum(o.forfeit ?? o.forfeits), disqualified: asNum(o.disqualified), adjustedPoints: asNum(o.adjustedPoints ?? o.adjusted) }
  })
}
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? clean(v) : undefined)
const parseScoreValue = (v: unknown): { goals?: number; behinds?: number; total?: number } | null => {
  if (typeof v === 'number') return { total: v }
  if (typeof v === 'string') return parseScoreToken(v)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const goals = asNum(o.goals), behinds = asNum(o.behinds), total = asNum(o.total ?? o.points ?? o.score)
    if (goals != null || behinds != null || total != null) return { goals, behinds, total: total ?? ((goals ?? 0) * 6 + (behinds ?? 0)) }
  }
  return null
}

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

function ladderFromHtml(html: string): LadderRow[] {
  const tableMatches = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0])
  console.log(`[playhq-parse] HTML tables found=${tableMatches.length}`)
  for (const table of tableMatches) {
    const rowHtml = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(m => m[0])
    const rows = rowHtml.map(r => [...r.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => stripTags(c[1]))).filter(r => r.length >= 4)
    if (rows.length < 2) continue
    const headers = rows[0].map(h => h.toUpperCase())
    const teamIdx = headers.findIndex(h => h === 'TEAM' || h.includes('TEAM') || h === 'CLUB')
    if (teamIdx < 0) continue
    const idx = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)))
    const posIdx = idx(['POS', 'POSITION'])
    const playedIdx = idx(['PLAYED', 'PLD', 'P'])
    const pointsIdx = idx(['PTS', 'POINTS'])
    const pctIdx = idx(['%', 'PERC', 'PCT'])
    const winsIdx = idx(['WINS', 'WON', 'W'])
    const lossesIdx = idx(['LOSSES', 'LOST', 'L'])
    const drawsIdx = idx(['DRAWS', 'DRAWN', 'D'])
    const byeIdx = idx(['BYE'])
    const forIdx = idx(['FOR'])
    const againstIdx = idx(['AGAINST'])
    const forfeitIdx = idx(['FORFEIT'])
    const dqIdx = idx(['DISQUALIFIED'])
    const adjustedIdx = idx(['ADJUSTED'])
    const numAt = (r: string[], i: number) => i >= 0 ? asNum(r[i]?.replace(/[^\d.-]/g, '')) : undefined
    const out = rows.slice(1).map((r, i): LadderRow | null => {
      const clubName = clean(r[teamIdx] ?? '')
      if (!clubName || clubName.toUpperCase() === 'TEAM') return null
      return { clubName, position: numAt(r, posIdx) ?? i + 1, played: numAt(r, playedIdx), wins: numAt(r, winsIdx), losses: numAt(r, lossesIdx), draws: numAt(r, drawsIdx), byes: numAt(r, byeIdx), pointsFor: numAt(r, forIdx), pointsAgainst: numAt(r, againstIdx), percentage: numAt(r, pctIdx), points: numAt(r, pointsIdx), forfeits: numAt(r, forfeitIdx), disqualified: numAt(r, dqIdx), adjustedPoints: numAt(r, adjustedIdx) }
    }).filter((r): r is LadderRow => !!r)
    if (out.length >= 4) return out
  }
  return []
}

// ── public parse API ──────────────────────────────────────────────────────────
export function parseResults(page: FetchedPage): ParseOutcome<ResultRow> {
  const warnings: string[] = []
  if (!page.ok) return { rows: [], confidence: 0, strategy: 'none', warnings: [page.error ?? 'fetch failed'] }
  // 1) JSON body
  if (page.contentType.includes('json')) {
    try { const rows = resultsFromJson(JSON.parse(page.body)); if (rows.length) return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.85, strategy: 'json', warnings } } catch { warnings.push('json parse failed') }
  }
  // 2) __NEXT_DATA__
  const nd = extractNextData(page.body)
  if (nd) { const rows = resultsFromJson(nd); if (rows.length) return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.8, strategy: '__NEXT_DATA__', warnings } }
  for (const json of extractCapturedJson(page.body)) {
    const rows = resultsFromJson(json)
    if (rows.length) { console.log(`[playhq-parse] result rows parsed=${rows.length} strategy=playwright-json`); return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.9, strategy: 'playwright-json', warnings } }
  }
  // 3) HTML text
  const rows = resultsFromText(stripTags(page.body))
  if (rows.length) { console.log(`[playhq-parse] result rows parsed=${rows.length} strategy=html-text`); return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.6, strategy: 'html-text', warnings } }
  warnings.push('no results could be extracted from this page (JS-rendered page or unsupported format — PlayHQ API credentials may be required)')
  return { rows: [], confidence: 0, strategy: 'none', warnings }
}

export function parseFixtures(page: FetchedPage): ParseOutcome<FixtureRow> {
  const warnings: string[] = []
  if (!page.ok) return { rows: [], confidence: 0, strategy: 'none', warnings: [page.error ?? 'fetch failed'] }
  if (page.contentType.includes('json')) {
    try { const rows = fixturesFromJson(JSON.parse(page.body)); if (rows.length) return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.85, strategy: 'json', warnings } } catch { warnings.push('json parse failed') }
  }
  const nd = extractNextData(page.body)
  if (nd) { const rows = fixturesFromJson(nd); if (rows.length) return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.8, strategy: '__NEXT_DATA__', warnings } }
  for (const json of extractCapturedJson(page.body)) {
    const rows = fixturesFromJson(json)
    if (rows.length) { console.log(`[playhq-parse] fixture rows parsed=${rows.length} strategy=playwright-json`); return { rows: rows.map(r => ({ ...r, sourceUrl: page.url })), confidence: 0.9, strategy: 'playwright-json', warnings } }
  }
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
  for (const json of extractCapturedJson(page.body)) {
    const rows = ladderFromJson(json)
    if (rows.length) { console.log(`[playhq-parse] ladder rows parsed=${rows.length} strategy=playwright-json`); return { rows, confidence: 0.9, strategy: 'playwright-json', warnings } }
  }
  const rows = ladderFromHtml(page.body)
  if (rows.length) { console.log(`[playhq-parse] ladder rows parsed=${rows.length} strategy=html-table`); return { rows, confidence: 0.7, strategy: 'html-table', warnings } }
  warnings.push('no ladder could be extracted (JS-rendered page or unsupported format — PlayHQ API credentials may be required)')
  return { rows: [], confidence: 0, strategy: 'none', warnings }
}
