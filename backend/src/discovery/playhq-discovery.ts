/**
 * PlayHQ Discovery Crawler (preview-only — writes nothing to the DB)
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1: crawl the Netball Australia association directory, page by page, and
 *         collect every association (name, URL, logo, state/region if shown).
 * Step 2: for a sample of associations, drill into the association page and
 *         capture its season/grade/ladder structure (both DOM signals and the
 *         GraphQL responses PlayHQ fetches) so we can build precise parsing.
 *
 * Output is a JSON preview object (also written to discovery-preview.json in CI
 * and uploaded as an artifact). No database changes, no ranking changes.
 *
 * Runs under Playwright/Chromium — intended for GitHub Actions (full internet).
 */

import { writeFile } from 'fs/promises'
import { logger }     from '../utils/logger.js'
import { matchAGrade, isRejected, filterSeniorWomensAGrade, type GradeCandidate, type StructuredGrade } from './grade-matcher.js'

const DIRECTORY_BASE = 'https://www.playhq.com/netball-australia'
const NAV_TIMEOUT    = 30_000
const SETTLE_MS      = 6_000

export interface DiscoveredAssociation {
  name:   string
  url:    string
  slug:   string
  logo:   string | null
  state:  string | null
  region: string | null
}

export interface AssociationDrilldown {
  association:     string
  url:             string
  seasonsFound:    string[]
  gradeNamesFound: string[]
  aGradeMatch:     { name: string; matchedRule: string } | null
  ladderUrls:      string[]
  capturedApiUrls: string[]
  note:            string
}

export interface DiscoveryPreview {
  crawledAt:        string
  directoryUrl:     string
  pagesCrawled:     number
  associationCount: number
  associations:     DiscoveredAssociation[]
  drilldowns:       AssociationDrilldown[]
}

// ─── Public entry ─────────────────────────────────────────────────────────────

export async function runDiscoveryPreview(opts: {
  maxPages?:      number
  drilldownLimit?: number
  outPath?:       string
  deepSlug?:      string   // if set, deep-dump this association's GraphQL schema
  aGradeSlug?:    string   // if set, Phase 3 A-Grade extraction for this assoc
} = {}): Promise<DiscoveryPreview> {
  const maxPages       = opts.maxPages       ?? 40
  const drilldownLimit = opts.drilldownLimit ?? 3
  const outPath        = opts.outPath        ?? 'discovery-preview.json'

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  })

  try {
    const ctx  = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    // ── Step 1: crawl the directory ──────────────────────────────────────────
    const associations = await crawlDirectory(page, maxPages)
    logger.info('Discovery: association crawl complete', { count: associations.length })

    // ── Optional: deep GraphQL schema dump for one association ────────────────
    if (opts.deepSlug) {
      const target = associations.find(a => a.slug === opts.deepSlug)
        ?? { name: opts.deepSlug, url: `${DIRECTORY_BASE}/org/${opts.deepSlug}`, slug: opts.deepSlug, logo: null, state: null, region: null }
      await deepDumpSchema(page, target)
    }

    // ── Optional: Phase 3 A-Grade extraction for one association ──────────────
    if (opts.aGradeSlug) {
      const target = associations.find(a => a.slug === opts.aGradeSlug)
        ?? { name: opts.aGradeSlug, url: `${DIRECTORY_BASE}/org/${opts.aGradeSlug}`, slug: opts.aGradeSlug, logo: null, state: null, region: null }
      await extractAGradeLadders(page, target)
    }

    // ── Step 2: instrumented drilldown on a sample ───────────────────────────
    const drilldowns: AssociationDrilldown[] = []
    for (const assoc of associations.slice(0, drilldownLimit)) {
      drilldowns.push(await drilldownAssociation(page, assoc))
    }

    const preview: DiscoveryPreview = {
      crawledAt:        new Date().toISOString(),
      directoryUrl:     `${DIRECTORY_BASE}?page=1&types=ASSOCIATION`,
      pagesCrawled:     Math.min(maxPages, associations.length > 0 ? maxPages : 1),
      associationCount: associations.length,
      associations,
      drilldowns,
    }

    await writeFile(outPath, JSON.stringify(preview, null, 2), 'utf8')
    logger.info('Discovery: preview written', { outPath, associations: associations.length, drilldowns: drilldowns.length })
    return preview

  } finally {
    await browser.close()
  }
}

// ─── Step 1: directory crawl ──────────────────────────────────────────────────

async function crawlDirectory(page: import('playwright').Page, maxPages: number): Promise<DiscoveredAssociation[]> {
  const bySlug = new Map<string, DiscoveredAssociation>()

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${DIRECTORY_BASE}?page=${pageNum}&types=ASSOCIATION`
    logger.info('Discovery: crawling directory page', { pageNum, url })

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    } catch (err) {
      logger.warn('Discovery: directory goto did not settle', { pageNum, detail: String(err) })
    }
    await page.waitForTimeout(SETTLE_MS)

    const found = await extractAssociationsFromPage(page)
    let newOnPage = 0
    for (const a of found) {
      if (!bySlug.has(a.slug)) { bySlug.set(a.slug, a); newOnPage++ }
    }
    logger.info('Discovery: directory page parsed', { pageNum, foundOnPage: found.length, newOnPage, total: bySlug.size })

    // Stop when a page yields no NEW associations (end of directory)
    if (found.length === 0 || newOnPage === 0) {
      logger.info('Discovery: no new associations — stopping pagination', { pageNum })
      break
    }
  }

  return [...bySlug.values()]
}

/** Extract association cards from the current directory page via org anchors. */
async function extractAssociationsFromPage(page: import('playwright').Page): Promise<DiscoveredAssociation[]> {
  const anchors = await page.locator('a[href*="/netball-australia/org/"]').all()
  const out: DiscoveredAssociation[] = []

  for (const a of anchors) {
    try {
      const href = await a.getAttribute('href')
      if (!href) continue
      const url = href.startsWith('http') ? href : `https://www.playhq.com${href}`

      // Slug = the org path segment after /org/
      const m = url.match(/\/netball-australia\/org\/([^/?#]+)/)
      if (!m) continue
      const slug = m[1]

      const text = (await a.textContent())?.replace(/\s+/g, ' ').trim() ?? ''
      const name = cleanAssociationName(text, slug)

      let logo: string | null = null
      try { logo = await a.locator('img').first().getAttribute('src', { timeout: 300 }) } catch { /* none */ }

      // State/region sometimes appears in the card sub-text (best effort)
      const stateMatch = text.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/)

      out.push({
        name,
        url,
        slug,
        logo,
        state:  stateMatch ? stateMatch[1] : null,
        region: null,
      })
    } catch { /* skip bad card */ }
  }

  // Dedup within page by slug
  const seen = new Set<string>()
  return out.filter(a => (seen.has(a.slug) ? false : (seen.add(a.slug), true)))
}

/**
 * Clean the concatenated card text into the real association name.
 * PlayHQ cards render as "[breadcrumb]Netball Australia[name]…[type badge]Association",
 * so we strip the leading parent and the trailing type badge.
 */
function cleanAssociationName(raw: string, slug: string): string {
  let n = raw.trim()
  n = n.replace(/^Netball Australia\s*/i, '')       // parent breadcrumb
  n = n.replace(/\s*(Association|Club|League|Team)\s*$/i, '')  // trailing type badge
  n = n.replace(/\s+/g, ' ').trim()
  // Fallback to a title-cased slug if stripping emptied it
  return n || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Step 2: instrumented drilldown ───────────────────────────────────────────

async function drilldownAssociation(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<AssociationDrilldown> {
  logger.info('Discovery: drilldown', { association: assoc.name, url: assoc.url })

  const capturedApiUrls: string[] = []
  const capturedJson: unknown[]   = []
  const onResponse = async (response: import('playwright').Response) => {
    const ct = response.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    const url = response.url()
    if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs/.test(url)) return
    capturedApiUrls.push(url)
    try { capturedJson.push(await response.json()) } catch { /* non-json */ }
  }
  page.on('response', onResponse)

  const note: string[] = []
  try {
    // The association's Fixtures & Ladders view
    const target = assoc.url.replace(/\/$/, '')
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    } catch (err) {
      note.push(`goto did not settle: ${String(err)}`)
    }
    await page.waitForTimeout(SETTLE_MS)

    // Seasons: any "Winter 20xx" / "Summer 20xx" text on the page
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
    const seasonsFound = [...new Set((bodyText.match(/\b(?:Winter|Summer|Autumn|Spring)\s+20\d{2}\b/gi) ?? []).map(s => s.trim()))]

    // Grade-ish names: from captured GraphQL (objects with a name field) + DOM
    const gradeNamesFromJson = collectGradeNames(capturedJson)
    const gradeNamesFromDom  = await collectGradeNamesFromDom(page)
    const gradeNamesFound = [...new Set([...gradeNamesFromJson, ...gradeNamesFromDom])].filter(n => !isRejected(n)).slice(0, 40)

    // Any ladder URLs surfaced
    const ladderUrls = [...new Set(capturedApiUrls.concat(await collectLadderLinks(page)).filter(u => /ladder/i.test(u)))].slice(0, 20)

    // Best-effort A Grade match from the grade names we saw
    const candidates: GradeCandidate[] = gradeNamesFound.map(name => ({ name }))
    const match = matchAGrade(candidates)

    return {
      association:     assoc.name,
      url:             assoc.url,
      seasonsFound,
      gradeNamesFound,
      aGradeMatch:     match ? { name: match.name, matchedRule: match.matchedRule } : null,
      ladderUrls,
      capturedApiUrls: [...new Set(capturedApiUrls)].slice(0, 30),
      note:            note.join(' | ') || 'ok',
    }
  } finally {
    page.off('response', onResponse)
  }
}

// ─── Phase 3: Senior Women's A Grade extraction (proves the full chain) ──────

async function extractAGradeLadders(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<void> {
  console.log(`\n========== A-GRADE EXTRACT: ${assoc.name} ==========`)

  const captured: unknown[] = []
  const onResponse = async (r: import('playwright').Response) => {
    const ct = r.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|pbstck|adtrafficquality/.test(r.url())) return
    try { captured.push(await r.json()) } catch { /* ignore */ }
  }
  page.on('response', onResponse)

  try {
    try { await page.goto(assoc.url.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* continue */ }
    await page.waitForTimeout(SETTLE_MS)
    await tryClickText(page, ['Fixtures & Ladders', 'Fixtures and Ladders', 'Ladders'])
    await page.waitForTimeout(2500)
    await tryClickText(page, ['Winter 2028', 'Winter 2027', 'Winter 2026'])
    await page.waitForTimeout(3500)

    // 1) Pull the season's structured grades from discoverSeason GraphQL
    const grades = findStructuredGrades(captured)
    console.log(`Structured grades found: ${grades.length}`)

    // 2) Filter to Senior Women's A Grade (can be several per season)
    const matches = filterSeniorWomensAGrade(grades)
    console.log(`Senior Women's A Grade matches: ${matches.length}`)
    for (const m of matches) console.log(`   ✓ ${m.name}  [${m.gender}/${m.age}]  id=${m.id}  (${m.matchedRule})`)

    // 3) For the first couple of matches, drive to the ladder and capture the
    //    real URL + team count (this reveals the ladder URL pattern).
    for (const m of matches.slice(0, 2)) {
      captured.length = 0
      const result = await openGradeLadder(page, m.name)
      console.log(`   → ${m.name}: ladderUrl=${result.url || '(not captured)'}  teams=${result.teams}`)
    }

    console.log(`========== END A-GRADE EXTRACT ==========\n`)
  } finally {
    page.off('response', onResponse)
  }
}

/** Find PlayHQ discoverSeason.grades[] anywhere in captured JSON. */
function findStructuredGrades(jsonBlobs: unknown[]): StructuredGrade[] {
  let best: StructuredGrade[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      // A grades array: elements with name + gender/age objects
      if (node.length > best.length && node.every(x => x && typeof x === 'object' && 'name' in (x as object))) {
        const mapped = node.map(x => toStructuredGrade(x as Record<string, unknown>)).filter((g): g is StructuredGrade => !!g)
        if (mapped.length >= 3 && mapped.length > best.length) best = mapped
      }
      node.forEach(visit)
    } else if (node && typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) visit(v)
    }
  }
  jsonBlobs.forEach(visit)
  return best
}

function toStructuredGrade(o: Record<string, unknown>): StructuredGrade | null {
  const name = typeof o.name === 'string' ? o.name : null
  if (!name) return null
  const id = typeof o.id === 'string' ? o.id : ''
  const nested = (k: string): string | null => {
    const v = o[k]
    if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).name === 'string') return (v as Record<string, unknown>).name as string
    return typeof v === 'string' ? v : null
  }
  // Only treat as a grade if it carries gender or age (avoids matching random named objects)
  const gender = nested('gender')
  const age    = nested('age')
  if (gender == null && age == null) return null
  return { id, name, gender, age }
}

/** Click through to a grade's ladder by its name; return final URL + team count. */
async function openGradeLadder(page: import('playwright').Page, gradeName: string): Promise<{ url: string; teams: number }> {
  const captured: unknown[] = []
  const onResp = async (r: import('playwright').Response) => {
    const ct = r.headers()['content-type'] ?? ''
    if (ct.includes('json') && /playhq/.test(r.url())) { try { captured.push(await r.json()) } catch { /* */ } }
  }
  page.on('response', onResp)
  try {
    // Click the grade (or its Select control) then the Ladder tab
    const clickedGrade = await tryClickText(page, [gradeName])
    await page.waitForTimeout(2500)
    if (!clickedGrade) return { url: '', teams: 0 }
    await tryClickText(page, ['Ladder'])
    await page.waitForTimeout(4000)
    const teams = countLadderTeams(captured)
    return { url: page.url(), teams }
  } catch {
    return { url: page.url(), teams: 0 }
  } finally {
    page.off('response', onResp)
  }
}

/** Count ladder rows in captured JSON (largest array of team-stat objects). */
function countLadderTeams(jsonBlobs: unknown[]): number {
  let best = 0
  const looksLikeLadderRow = (o: Record<string, unknown>): boolean => {
    const keys = Object.keys(o).map(k => k.toLowerCase())
    const hasTeam = keys.some(k => /team|club|name/.test(k))
    const hasStat = keys.some(k => /played|points|pts|win|percentage/.test(k))
    return hasTeam && hasStat
  }
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      if (node.length > best && node.every(x => x && typeof x === 'object') &&
          node.filter(x => looksLikeLadderRow(x as Record<string, unknown>)).length >= Math.min(4, node.length)) {
        best = node.length
      }
      node.forEach(visit)
    } else if (node && typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) visit(v)
    }
  }
  jsonBlobs.forEach(visit)
  return best
}

// ─── Deep schema dump (for building precise season/grade/ladder parsing) ──────

async function deepDumpSchema(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<void> {
  console.log(`\n========== DEEP SCHEMA DUMP: ${assoc.name} ==========`)
  console.log(`URL: ${assoc.url}`)

  const captured: { url: string; json: unknown }[] = []
  const onResponse = async (response: import('playwright').Response) => {
    const ct = response.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    const url = response.url()
    if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|sentry/.test(url)) return
    try { captured.push({ url, json: await response.json() }) } catch { /* ignore */ }
  }
  page.on('response', onResponse)

  try {
    // 1) Association landing
    try { await page.goto(assoc.url.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* continue */ }
    await page.waitForTimeout(SETTLE_MS)

    // 2) Try to reach Fixtures & Ladders and open a season, to trigger the
    //    competition/grade GraphQL calls.
    await tryClickText(page, ['Fixtures & Ladders', 'Fixtures and Ladders', 'Ladders', 'Fixtures'])
    await page.waitForTimeout(3000)
    // Prefer the newest active winter season if a selector is present
    await tryClickText(page, ['Winter 2028', 'Winter 2027', 'Winter 2026'])
    await page.waitForTimeout(3000)

    console.log(`\nCaptured ${captured.length} JSON responses. Structural summaries:`)
    for (const { url, json } of captured) {
      const lines: string[] = []
      summariseStructure(json, '', lines, 0)
      const interesting = lines.filter(l => /season|grade|competition|ladder|winter|summer|standing|team|name|status|tenant|organisation/i.test(l))
      if (interesting.length === 0) continue
      console.log(`\n--- ${url.slice(0, 120)}`)
      console.log(interesting.slice(0, 40).join('\n'))
    }

    // 3) Also list any grade/season option text visible in the DOM now
    const opts = await page.locator('a, button, option, [role="option"], li').allTextContents()
    const gradeish = [...new Set(opts.map(t => t.replace(/\s+/g, ' ').trim()).filter(t => t.length > 1 && t.length < 60 && /grade|premier|division|open|women|winter|summer 20/i.test(t)))]
    console.log(`\nDOM option texts (grade/season-ish):\n${gradeish.slice(0, 40).join(' | ')}`)
    console.log(`\n========== END DUMP ==========\n`)
  } finally {
    page.off('response', onResponse)
  }
}

/** Compact recursive structure summary: array paths + element keys + notable scalars. */
function summariseStructure(node: unknown, path: string, out: string[], depth: number): void {
  if (depth > 7 || out.length > 400) return
  if (Array.isArray(node)) {
    out.push(`${path} [array len=${node.length}]`)
    if (node[0] && typeof node[0] === 'object') {
      out.push(`${path}[0] keys: ${Object.keys(node[0] as object).join(', ')}`)
      summariseStructure(node[0], `${path}[0]`, out, depth + 1)
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k
      if (v && typeof v === 'object') summariseStructure(v, p, out, depth + 1)
      else if (typeof v === 'string' && v.length < 80 && /season|grade|competition|ladder|winter|summer|status|name|slug|id|tenant/i.test(k)) {
        out.push(`${p} = ${v}`)
      }
    }
  }
}

/** Click the first element whose text matches one of the candidates (best-effort). */
async function tryClickText(page: import('playwright').Page, candidates: string[]): Promise<boolean> {
  for (const c of candidates) {
    try {
      const el = page.getByText(c, { exact: false }).first()
      if (await el.count() > 0) {
        await el.click({ timeout: 2500 })
        return true
      }
    } catch { /* try next */ }
  }
  return false
}

/** Recursively collect plausible grade/competition names from captured JSON. */
function collectGradeNames(jsonBlobs: unknown[]): string[] {
  const names = new Set<string>()
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>
      const name = obj.name ?? obj.displayName ?? obj.gradeName
      if (typeof name === 'string' && /grade|premier|division|open|women/i.test(name)) names.add(name.trim())
      for (const v of Object.values(obj)) visit(v)
    }
  }
  jsonBlobs.forEach(visit)
  return [...names].slice(0, 60)
}

async function collectGradeNamesFromDom(page: import('playwright').Page): Promise<string[]> {
  try {
    const texts = await page.locator('a, button, li, option, [role="option"]').allTextContents()
    return texts
      .map(t => t.replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 2 && t.length < 60 && /grade|premier|division|open|women/i.test(t))
  } catch { return [] }
}

async function collectLadderLinks(page: import('playwright').Page): Promise<string[]> {
  try {
    const anchors = await page.locator('a[href*="ladder"]').all()
    const hrefs: string[] = []
    for (const a of anchors) {
      const h = await a.getAttribute('href')
      if (h) hrefs.push(h.startsWith('http') ? h : `https://www.playhq.com${h}`)
    }
    return hrefs
  } catch { return [] }
}
