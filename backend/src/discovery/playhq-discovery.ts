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
import { matchAGrade, isRejected, type GradeCandidate } from './grade-matcher.js'

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
      // Name: first meaningful text line of the card
      const name = text.split('·')[0].trim() || slug.replace(/-/g, ' ')

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
