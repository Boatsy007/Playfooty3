import { createHash } from 'node:crypto'
import { parsePlayHQUrl } from '../discovery/playhq-url.js'
import { githubConfig } from '../integrations/github-dispatch.js'
import { logger } from '../utils/logger.js'

export type SmartSource = 'PLAYHQ_API' | 'PLAYHQ_RENDERED' | 'RAW_JSON' | 'RAW_HTML' | 'MANUAL_REVIEW'
export type SmartDataType = 'FIXTURES' | 'RESULTS' | 'LADDER'

export interface SmartFootballRows {
  dataType: SmartDataType
  rows: Record<string, unknown>[]
}

export interface SmartIngestResult {
  source: SmartSource
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED'
  confidence: number
  sourceUrl: string
  importedAt: string
  scrapedAt?: string
  payloadHash: string
  groups: SmartFootballRows[]
  warnings: string[]
  message?: string
  workflow?: { configured: boolean; repo: string; ref: string }
}

const RENDERED_RUNNER_MESSAGE = 'Rendered PlayHQ scrape requires Actions runner configuration'

const n = (v: unknown, fallback = 0) => {
  const x = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(x) ? x : fallback
}

const s = (v: unknown, fallback = '') => typeof v === 'string' && v.trim() ? v.trim() : fallback
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex')
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export async function smartIngestFootballUrl(sourceUrl: string): Promise<SmartIngestResult> {
  const url = sourceUrl.trim()
  const warnings: string[] = []
  const parsed = parsePlayHQUrl(url)
  const importedAt = new Date().toISOString()

  if (parsed.ok && parsed.tenant === 'afl') {
    warnings.push('AFL tenant detected. Confirm this URL points to the football competition/grade you want to import.')
  }

  const api = await tryPlayHQApi(url)
  warnings.push(...api.warnings)
  if (api.groups.length > 0) return finish('PLAYHQ_API', url, importedAt, api.groups, warnings, 0.9)

  if (parsed.ok) {
    const rendered = await tryRenderedPlayHQ(url)
    warnings.push(...rendered.warnings)
    if (rendered.groups.length > 0) return finish('PLAYHQ_RENDERED', url, importedAt, rendered.groups, warnings, 0.78, rendered.scrapedAt)
    if (rendered.requiresRunner) {
      const cfg = githubConfig()
      warnings.push(RENDERED_RUNNER_MESSAGE)
      return {
        source: 'MANUAL_REVIEW',
        status: 'NEEDS_REVIEW',
        confidence: 0.15,
        sourceUrl: url,
        importedAt,
        payloadHash: hash({ url, warnings }),
        groups: [],
        warnings,
        message: RENDERED_RUNNER_MESSAGE,
        workflow: { configured: cfg.hasToken, repo: cfg.repo, ref: cfg.ref },
      }
    }
  }

  const raw = await tryRawUrl(url)
  warnings.push(...raw.warnings)
  if (raw.groups.length > 0) return finish(raw.source, url, importedAt, raw.groups, warnings, raw.source === 'RAW_JSON' ? 0.68 : 0.55)

  return {
    source: 'MANUAL_REVIEW',
    status: 'NEEDS_REVIEW',
    confidence: 0.1,
    sourceUrl: url,
    importedAt,
    payloadHash: hash({ url, warnings }),
    groups: [],
    warnings: warnings.length ? warnings : ['No fixtures, results or ladder rows could be detected from this URL.'],
    message: 'No usable rows detected. Send to review/manual import.',
  }
}

function finish(source: SmartSource, sourceUrl: string, importedAt: string, groups: SmartFootballRows[], warnings: string[], confidence: number, scrapedAt?: string): SmartIngestResult {
  return {
    source,
    status: 'SUCCESS',
    confidence,
    sourceUrl,
    importedAt,
    scrapedAt,
    payloadHash: hash({ source, sourceUrl, groups }),
    groups,
    warnings,
  }
}

async function tryPlayHQApi(_url: string): Promise<{ groups: SmartFootballRows[]; warnings: string[] }> {
  const configured = !!(process.env.PLAYHQ_API_KEY || process.env.PLAYHQ_API_TOKEN || process.env.PLAYHQ_CLIENT_ID)
  if (!configured) return { groups: [], warnings: ['PlayHQ API credentials are not configured; falling back to rendered/raw ingestion.'] }
  return { groups: [], warnings: ['PlayHQ API credentials were detected, but no official PlayHQ football API provider is wired in this branch; falling back to rendered/raw ingestion.'] }
}

async function tryRenderedPlayHQ(url: string): Promise<{ groups: SmartFootballRows[]; warnings: string[]; scrapedAt?: string; requiresRunner?: boolean }> {
  if (process.env.VERCEL && !process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return { groups: [], warnings: ['Serverless environment detected without a configured Chromium path.'], requiresRunner: true }
  }

  const { chromium } = await import('playwright')
  const warnings: string[] = []
  const capturedJson: unknown[] = []
  const scrapedAt = new Date().toISOString()
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    })
    const page = await ctx.newPage()
    page.on('response', async response => {
      const ct = response.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs/.test(response.url())) return
      try { capturedJson.push(await response.json()) } catch { /* ignore non-JSON */ }
    })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(e => warnings.push(`PlayHQ page load did not fully settle: ${String(e).slice(0, 180)}`))
    await page.waitForTimeout(8000)
    const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
    const fromJson = parseStructuredPayloads(capturedJson)
    const fromText = parseTextRows(text)
    return { groups: mergeGroups([...fromJson, ...fromText]), warnings, scrapedAt }
  } catch (err) {
    logger.warn('Smart ingest rendered PlayHQ scrape failed', { error: String(err) })
    const msg = String(err)
    const needsRunner = /Executable doesn't exist|browserType\.launch|Failed to launch|ENOENT|Chromium/i.test(msg)
    return { groups: [], warnings: [`Rendered PlayHQ scrape failed: ${msg.slice(0, 220)}`], requiresRunner: needsRunner }
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

async function tryRawUrl(url: string): Promise<{ source: 'RAW_JSON' | 'RAW_HTML'; groups: SmartFootballRows[]; warnings: string[] }> {
  const warnings: string[] = []
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'PlayFooty/1.0 football data import', 'Accept': 'text/html,application/json' },
    })
    if (!res.ok) return { source: 'RAW_HTML', groups: [], warnings: [`Raw URL fetch failed with HTTP ${res.status}.`] }
    const ct = res.headers.get('content-type') ?? ''
    const body = await res.text()
    if (ct.includes('json')) {
      return { source: 'RAW_JSON', groups: parseStructuredPayloads([JSON.parse(body)]), warnings }
    }
    const next = body.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
    const groups = next ? parseStructuredPayloads([JSON.parse(next[1])]) : parseTextRows(stripHtml(body))
    return { source: next ? 'RAW_JSON' : 'RAW_HTML', groups: mergeGroups(groups), warnings }
  } catch (err) {
    return { source: 'RAW_HTML', groups: [], warnings: [`Raw URL parser failed: ${String(err).slice(0, 220)}`] }
  }
}

function parseStructuredPayloads(payloads: unknown[]): SmartFootballRows[] {
  const rows: SmartFootballRows[] = []
  for (const payload of payloads) {
    const arrays = findObjectArrays(payload)
    for (const arr of arrays) {
      const ladder = mapLadder(arr)
      if (ladder.length >= 4) rows.push({ dataType: 'LADDER', rows: ladder })
      const results = mapResults(arr)
      if (results.length > 0) rows.push({ dataType: 'RESULTS', rows: results })
      const fixtures = mapFixtures(arr)
      if (fixtures.length > 0) rows.push({ dataType: 'FIXTURES', rows: fixtures })
    }
  }
  return mergeGroups(rows)
}

function findObjectArrays(root: unknown): Record<string, unknown>[][] {
  const found: Record<string, unknown>[][] = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every(isObj)) found.push(node)
      for (const child of node) visit(child)
    } else if (isObj(node)) {
      for (const v of Object.values(node)) visit(v)
    }
  }
  visit(root)
  return found
}

function mapLadder(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  const mapped = arr.map((row, i) => {
    const clubName = findString(row, /^(club|team|name|displayName|teamName|clubName)$/i)
    if (!clubName) return null
    return {
      position: findNum(row, /^(position|rank|pos)$/i) ?? i + 1,
      clubName,
      played: findNum(row, /^(played|p|pld|matchesPlayed)$/i) ?? 0,
      wins: findNum(row, /^(wins|won|w)$/i) ?? 0,
      losses: findNum(row, /^(losses|lost|l)$/i) ?? 0,
      draws: findNum(row, /^(draws|drawn|d)$/i) ?? 0,
      pointsFor: findNum(row, /^(pointsFor|for|pf|f|scoreFor)$/i) ?? 0,
      pointsAgainst: findNum(row, /^(pointsAgainst|against|pa|a|scoreAgainst)$/i) ?? 0,
      percentage: findNum(row, /^(percentage|percent|pct)$/i) ?? 0,
      premiershipPoints: findNum(row, /^(premiershipPoints|ladderPoints|points|pts)$/i) ?? 0,
    }
  })
  return mapped.filter((x): x is NonNullable<typeof x> => !!x && (n(x.played) > 0 || n(x.premiershipPoints) > 0 || n(x.wins) > 0))
}

function mapFixtures(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  const mapped = arr.map(row => {
    const homeName = findString(row, /^(homeName|homeTeam|home|homeClub)$/i)
    const awayName = findString(row, /^(awayName|awayTeam|away|awayClub)$/i)
    if (!homeName || !awayName) return null
    const hasScore = findNum(row, /^(homePoints|homeScore|homeTotal)$/i) != null || findNum(row, /^(awayPoints|awayScore|awayTotal)$/i) != null
    if (hasScore) return null
    return { homeName, awayName, matchDate: findString(row, /^(date|matchDate|startTime|startDate)$/i), venue: findString(row, /^(venue|ground|location)$/i), round: findString(row, /^(round|roundName)$/i) || 'Round TBC' }
  })
  return mapped.filter((x): x is NonNullable<typeof x> => !!x)
}

function mapResults(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  const mapped = arr.map(row => {
    const homeName = findString(row, /^(homeName|homeTeam|home|homeClub)$/i)
    const awayName = findString(row, /^(awayName|awayTeam|away|awayClub)$/i)
    if (!homeName || !awayName) return null
    const homeGoals = findNum(row, /^(homeGoals|homeGoal|homeG)$/i) ?? 0
    const homeBehinds = findNum(row, /^(homeBehinds|homeBehind|homeB)$/i) ?? 0
    const awayGoals = findNum(row, /^(awayGoals|awayGoal|awayG)$/i) ?? 0
    const awayBehinds = findNum(row, /^(awayBehinds|awayBehind|awayB)$/i) ?? 0
    const homePoints = findNum(row, /^(homePoints|homeScore|homeTotal)$/i) ?? (homeGoals * 6 + homeBehinds)
    const awayPoints = findNum(row, /^(awayPoints|awayScore|awayTotal)$/i) ?? (awayGoals * 6 + awayBehinds)
    if (homePoints === 0 && awayPoints === 0 && homeGoals === 0 && awayGoals === 0) return null
    return { homeName, awayName, homeGoals, homeBehinds, homePoints, awayGoals, awayBehinds, awayPoints, matchDate: findString(row, /^(date|matchDate|startTime|startDate)$/i), venue: findString(row, /^(venue|ground|location)$/i), round: findString(row, /^(round|roundName)$/i) || 'Round TBC', status: findString(row, /^(status|matchStatus)$/i) || 'FINAL' }
  })
  return mapped.filter((x): x is NonNullable<typeof x> => !!x)
}

function findString(obj: Record<string, unknown>, pattern: RegExp): string {
  for (const [k, v] of Object.entries(obj)) {
    if (pattern.test(k)) {
      if (typeof v === 'string' && v.trim()) return v.trim()
      if (isObj(v)) {
        const nested = s(v.name) || s(v.displayName)
        if (nested) return nested
      }
    }
  }
  for (const v of Object.values(obj)) if (isObj(v)) {
    const nested = findString(v, pattern)
    if (nested) return nested
  }
  return ''
}

function findNum(obj: Record<string, unknown>, pattern: RegExp): number | undefined {
  for (const [k, v] of Object.entries(obj)) if (pattern.test(k)) {
    const x = n(v, NaN)
    if (Number.isFinite(x)) return x
  }
  for (const v of Object.values(obj)) if (isObj(v)) {
    const nested = findNum(v, pattern)
    if (nested != null) return nested
  }
  return undefined
}

function parseTextRows(text: string): SmartFootballRows[] {
  const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean)
  const ladder: Record<string, unknown>[] = []
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)$/)
    if (m) ladder.push({ position: n(m[1]), clubName: m[2].trim(), played: n(m[3]), wins: n(m[4]), losses: n(m[5]), draws: n(m[6]), pointsFor: n(m[7]), pointsAgainst: n(m[8]), percentage: n(m[9]), premiershipPoints: n(m[10]) })
  }
  return ladder.length >= 4 ? [{ dataType: 'LADDER', rows: ladder }] : []
}

function mergeGroups(groups: SmartFootballRows[]): SmartFootballRows[] {
  const byType = new Map<SmartDataType, Record<string, unknown>[]>()
  for (const g of groups) {
    const rows = byType.get(g.dataType) ?? []
    rows.push(...g.rows)
    byType.set(g.dataType, dedupeRows(rows))
  }
  return [...byType.entries()].map(([dataType, rows]) => ({ dataType, rows }))
}

function dedupeRows(rows: Record<string, unknown>[]) {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = JSON.stringify(row).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '\n').replace(/<style[\s\S]*?<\/style>/gi, '\n').replace(/<[^>]+>/g, '\n')
}
