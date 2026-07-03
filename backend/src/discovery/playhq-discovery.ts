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

const ORG_ANCHOR = 'a[href*="/netball-australia/org/"]'

const MAX_PAGE_RETRIES = 2       // attempts per directory page before giving up
const SELECTOR_WAIT    = 12_000  // per-attempt wait for the client-rendered anchors

async function crawlDirectory(page: import('playwright').Page, maxPages: number): Promise<DiscoveredAssociation[]> {
  const bySlug = new Map<string, DiscoveredAssociation>()

  // The directory listing is client-rendered from search.playhq.com/graphql
  // (behind an AWS WAF token challenge), so the org anchors are NOT present at
  // domcontentloaded — we wait for them and retry a page a bounded number of
  // times. A page that is still empty after its retries means we've paged past
  // the final directory page: that is END_OF_DIRECTORY, so we stop (bounded, no
  // indefinite retry loop) and move on to processing the associations we have.
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${DIRECTORY_BASE}?page=${pageNum}&types=ASSOCIATION`
    logger.info('Discovery: crawling directory page', { pageNum, url })

    const found = await loadDirectoryPage(page, url)
    let newOnPage = 0
    for (const a of found) {
      if (!bySlug.has(a.slug)) { bySlug.set(a.slug, a); newOnPage++ }
    }
    logger.info('Discovery: directory page parsed', { pageNum, foundOnPage: found.length, newOnPage, total: bySlug.size })

    // Empty page (after retries) = past the last page → end of directory.
    if (found.length === 0) {
      logger.info('Discovery: END_OF_DIRECTORY reached', { pageNum, totalAssociations: bySlug.size })
      break
    }
    // A full page that adds nothing new means we've looped back to seen orgs.
    if (newOnPage === 0) {
      logger.info('Discovery: END_OF_DIRECTORY reached (no new associations)', { pageNum, totalAssociations: bySlug.size })
      break
    }
  }

  return [...bySlug.values()]
}

/** Load one directory page, waiting for the client-rendered org anchors; bounded retries. */
async function loadDirectoryPage(page: import('playwright').Page, url: string): Promise<DiscoveredAssociation[]> {
  for (let attempt = 1; attempt <= MAX_PAGE_RETRIES; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    } catch (err) {
      logger.warn('Discovery: directory goto did not settle', { url, attempt, detail: String(err) })
    }
    // Wait for the association anchors to be injected by the GraphQL fetch.
    await page.waitForSelector(ORG_ANCHOR, { timeout: SELECTOR_WAIT }).catch(() => {})
    await page.waitForTimeout(SETTLE_MS)
    const found = await extractAssociationsFromPage(page)
    if (found.length > 0) return found
    logger.warn('Discovery: page yielded 0 associations, retrying', { url, attempt })
    await page.waitForTimeout(2000)
  }
  return []
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

// ─── Senior Women's A Grade extraction — returns structured leagues ──────────

export interface DiscoveredLeague {
  associationName: string
  associationSlug: string
  state:           string | null
  leagueName:      string   // derived, e.g. "Bellarine FNL"
  gradeName:       string   // full grade, e.g. "Bellarine FNL A Grade Dow Cup"
  gradeId:         string
  season:          string   // e.g. "Winter 2026"
  ladderUrl:       string
  teams:           number
}

/** Derive a clean league name from a grade name (strip the "A Grade …" suffix). */
function leagueNameFromGrade(gradeName: string, fallback: string): string {
  const stripped = gradeName.replace(/\s*[-–]?\s*A Grade\b.*$/i, '').trim()
  return stripped.length >= 3 ? stripped : fallback
}

/**
 * For one association: find the active season's Senior Women's A Grade
 * league(s), resolve each ladder URL, and validate by counting teams.
 * Returns only leagues whose ladder resolved with a real team count.
 */
export async function resolveAGradeLeagues(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<DiscoveredLeague[]> {
  const captured: unknown[] = []
  const onResponse = async (r: import('playwright').Response) => {
    const ct = r.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|pbstck|adtrafficquality/.test(r.url())) return
    try { captured.push(await r.json()) } catch { /* ignore */ }
  }
  page.on('response', onResponse)

  const out: DiscoveredLeague[] = []
  try {
    try { await page.goto(assoc.url.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* continue */ }
    await page.waitForTimeout(SETTLE_MS)
    await tryClickText(page, ['Fixtures & Ladders', 'Fixtures and Ladders', 'Ladders'])
    await page.waitForTimeout(2500)
    await tryClickText(page, ['Winter 2028', 'Winter 2027', 'Winter 2026'])
    await page.waitForTimeout(3500)

    const grades  = findStructuredGrades(captured)
    const matches = filterSeniorWomensAGrade(grades)
    const meta    = findSeasonMeta(captured)
    const season  = meta.seasonName ?? 'Winter 2026'

    for (const m of matches) {
      const gradeSlug = m.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const candidates = buildLadderUrlCandidates(assoc.slug, meta.competitionSlug, gradeSlug, m.id)
      for (const url of candidates) {
        captured.length = 0
        try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* continue */ }
        await page.waitForTimeout(5000)
        const teams = countLadderTeams(captured)
        if (teams >= 4) {
          out.push({
            associationName: assoc.name,
            associationSlug: assoc.slug,
            state:           assoc.state,
            leagueName:      leagueNameFromGrade(m.name, assoc.name),
            gradeName:       m.name,
            gradeId:         m.id,
            season,
            ladderUrl:       url,
            teams,
          })
          break
        }
      }
    }
  } finally {
    page.off('response', onResponse)
  }
  return out
}

// ─── Coverage diagnostic ──────────────────────────────────────────────────────
// Instruments the resolve funnel per association so we can see WHERE coverage is
// lost (season / grades / A-grade match / ladder), read-only.

export interface AssocDiag {
  association:    string
  slug:           string
  seasonOptions:  string[]   // season labels visible on the page
  seasonPicked:   string | null
  gradeCount:     number
  gradeSample:    string[]
  womensSenior:   number     // grades that are structurally Women+Senior (pre-keyword)
  aGradeMatches:  number     // grades passing filterSeniorWomensAGrade
  ladderTeams:    number
  outcome:        string     // IMPORTED | NO_SEASON | NO_GRADES | NO_WOMENS_SENIOR | NO_AGRADE_MATCH | LADDER_UNRESOLVED
}

/** True if a structured grade is (or is very likely) senior women's, ignoring name keywords. */
function isWomensSenior(g: StructuredGrade): boolean {
  if (isRejected(g.name)) return false
  const genderOk = g.gender ? !/(^|[^a-z])(men|mens|boys|mixed|girls|male)([^a-z]|$)/i.test(g.gender) : true
  const ageOk    = g.age    ? !/(junior|u\/?\s*\d|under|primary|mini|cadet|year\s*\d)/i.test(g.age)    : true
  return genderOk && ageOk
}

/** Instrumented single-association resolve — records the funnel, imports nothing. */
export async function diagnoseAssociation(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<AssocDiag> {
  const captured: unknown[] = []
  const onResponse = async (r: import('playwright').Response) => {
    const ct = r.headers()['content-type'] ?? ''
    if (!ct.includes('json')) return
    if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs|pbstck|adtrafficquality/.test(r.url())) return
    try { captured.push(await r.json()) } catch { /* ignore */ }
  }
  page.on('response', onResponse)

  const diag: AssocDiag = {
    association: assoc.name, slug: assoc.slug, seasonOptions: [], seasonPicked: null,
    gradeCount: 0, gradeSample: [], womensSenior: 0, aGradeMatches: 0, ladderTeams: 0, outcome: 'NO_SEASON',
  }
  try {
    try { await page.goto(assoc.url.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* */ }
    await page.waitForTimeout(SETTLE_MS)
    await tryClickText(page, ['Fixtures & Ladders', 'Fixtures and Ladders', 'Ladders', 'Fixtures'])
    await page.waitForTimeout(2500)

    // What season labels does the page actually offer?
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
    diag.seasonOptions = [...new Set((bodyText.match(/\b(?:Winter|Summer|Autumn|Spring|Netball)\s+20\d{2}\b/gi) ?? []).map(s => s.trim()))]
    // Pick the newest available season generically (any season word + newest year).
    const newest = [...diag.seasonOptions].sort((a, b) => (b.match(/20\d{2}/)?.[0] ?? '').localeCompare(a.match(/20\d{2}/)?.[0] ?? ''))[0]
    if (newest) { await tryClickText(page, [newest]); diag.seasonPicked = newest; await page.waitForTimeout(3500) }

    const grades = findStructuredGrades(captured)
    diag.gradeCount = grades.length
    diag.gradeSample = grades.slice(0, 12).map(g => g.name)
    diag.womensSenior = grades.filter(isWomensSenior).length
    const matches = filterSeniorWomensAGrade(grades)
    diag.aGradeMatches = matches.length
    const meta = findSeasonMeta(captured)

    if (grades.length === 0) diag.outcome = diag.seasonPicked ? 'NO_GRADES' : 'NO_SEASON'
    else if (diag.womensSenior === 0) diag.outcome = 'NO_WOMENS_SENIOR'
    else if (matches.length === 0) diag.outcome = 'NO_AGRADE_MATCH'
    else {
      diag.outcome = 'LADDER_UNRESOLVED'
      const m = matches[0]
      const gradeSlug = m.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      for (const url of buildLadderUrlCandidates(assoc.slug, meta.competitionSlug, gradeSlug, m.id)) {
        captured.length = 0
        try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* */ }
        await page.waitForTimeout(4000)
        const teams = countLadderTeams(captured)
        if (teams >= 4) { diag.ladderTeams = teams; diag.outcome = 'IMPORTED'; break }
      }
    }
  } finally {
    page.off('response', onResponse)
  }
  return diag
}

/** Crawl the directory and diagnose the resolve funnel for a sample of associations. */
export async function diagnoseAssociations(opts: { maxPages?: number; maxAssociations?: number; assocFilter?: string[] } = {}): Promise<AssocDiag[]> {
  const filter = (opts.assocFilter ?? []).map(s => s.toLowerCase()).filter(Boolean)
  const match = (a: DiscoveredAssociation) => filter.length === 0 || filter.some(f => a.name.toLowerCase().includes(f) || a.slug.toLowerCase().includes(f))
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] })
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })
    const page = await ctx.newPage()
    const crawled = (await crawlDirectory(page, opts.maxPages ?? 40)).filter(match)
    const cap = opts.maxAssociations ?? crawled.length
    const out: AssocDiag[] = []
    for (const a of crawled.slice(0, cap)) {
      try { out.push(await diagnoseAssociation(page, a)) }
      catch (err) { logger.warn('Diagnose: association failed', { assoc: a.name, detail: String(err) }); out.push({ association: a.name, slug: a.slug, seasonOptions: [], seasonPicked: null, gradeCount: 0, gradeSample: [], womensSenior: 0, aGradeMatches: 0, ladderTeams: 0, outcome: 'ERROR' }) }
    }
    return out
  } finally {
    await browser.close()
  }
}

/** Logging wrapper used by the preview workflow. */
async function extractAGradeLadders(page: import('playwright').Page, assoc: DiscoveredAssociation): Promise<void> {
  console.log(`\n========== A-GRADE EXTRACT: ${assoc.name} ==========`)
  const leagues = await resolveAGradeLeagues(page, assoc)
  console.log(`Resolved ${leagues.length} A-Grade league(s):`)
  for (const l of leagues) console.log(`   ✓ ${l.leagueName} — ${l.gradeName} — teams=${l.teams} — ${l.ladderUrl}`)
  console.log(`========== END A-GRADE EXTRACT ==========\n`)
}

/**
 * Crawl the whole directory and resolve every association's Senior Women's A
 * Grade league(s). Preview-safe: returns data, writes nothing to the DB.
 */
export async function discoverAllAGradeLeagues(opts: { maxPages?: number; maxAssociations?: number; assocFilter?: string[] } = {}): Promise<DiscoveredLeague[]> {
  const maxPages        = opts.maxPages        ?? 40
  const maxAssociations = opts.maxAssociations ?? Infinity
  // Optional targeted run: only associations whose name/slug contains one of
  // these (case-insensitive) substrings. Used for the safe validation import.
  const filter = (opts.assocFilter ?? []).map(s => s.toLowerCase()).filter(Boolean)
  const matchesFilter = (a: DiscoveredAssociation) =>
    filter.length === 0 || filter.some(f => a.name.toLowerCase().includes(f) || a.slug.toLowerCase().includes(f))

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  })
  try {
    const ctx  = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })
    const page = await ctx.newPage()

    const crawled = await crawlDirectory(page, maxPages)
    const associations = crawled.filter(matchesFilter)
    logger.info('Discovery: crawl complete, resolving A-Grade leagues', { crawled: crawled.length, afterFilter: associations.length, filter })

    const all: DiscoveredLeague[] = []
    let done = 0
    for (const assoc of associations) {
      if (done >= maxAssociations) break
      try {
        const leagues = await resolveAGradeLeagues(page, assoc)
        all.push(...leagues)
        logger.info('Discovery: association resolved', { assoc: assoc.name, leagues: leagues.length })
      } catch (err) {
        logger.warn('Discovery: association failed', { assoc: assoc.name, detail: String(err) })
      }
      done++
    }
    return all
  } finally {
    await browser.close()
  }
}

interface SeasonMeta { seasonName?: string; seasonSlug?: string; competitionSlug?: string; competitionName?: string }

/** Find the discoverSeason node (has grades + competition) and pull slug info. */
function findSeasonMeta(jsonBlobs: unknown[]): SeasonMeta {
  let meta: SeasonMeta = {}
  const slugFrom = (o: Record<string, unknown> | undefined): string | undefined => {
    if (!o) return undefined
    if (typeof o.slug === 'string') return o.slug
    if (typeof o.url === 'string') { const m = o.url.match(/([a-z0-9-]+)(?:\/[a-f0-9]+)?\/?$/i); return m ? m[1] : undefined }
    return undefined
  }
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>
      if (Array.isArray(o.grades) && o.competition && typeof o.competition === 'object') {
        const comp = o.competition as Record<string, unknown>
        meta = {
          seasonName:      typeof o.name === 'string' ? o.name : undefined,
          seasonSlug:      slugFrom(o),
          competitionName: typeof comp.name === 'string' ? comp.name : undefined,
          competitionSlug: slugFrom(comp),
        }
      }
      for (const v of Object.values(o)) visit(v)
    }
  }
  jsonBlobs.forEach(visit)
  return meta
}

/** Candidate grade-ladder URLs (PlayHQ patterns vary slightly by tenant). */
function buildLadderUrlCandidates(orgSlug: string, competitionSlug: string | undefined, gradeSlug: string, gradeId: string): string[] {
  const base = 'https://www.playhq.com/netball-australia/org'
  const urls: string[] = []
  if (competitionSlug) {
    urls.push(`${base}/${orgSlug}/${competitionSlug}/${gradeSlug}/${gradeId}/ladder`)
  }
  // Fallbacks: common season-slug shapes when the competition slug wasn't captured
  for (const season of [competitionSlug, `${orgSlug}-winter-2026`, `${orgSlug}-2026`].filter(Boolean) as string[]) {
    urls.push(`${base}/${orgSlug}/${season}/${gradeSlug}/${gradeId}/ladder`)
  }
  return [...new Set(urls)]
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
