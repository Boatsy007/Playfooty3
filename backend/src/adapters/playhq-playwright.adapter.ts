/**
 * PlayHQ Playwright Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * PlayHQ is a JavaScript-rendered (Next.js) platform. Ladder data is loaded
 * via internal XHR after page hydration — raw HTML fetch returns only the
 * shell. This adapter uses Playwright (headless Chromium) with response
 * interception to capture the JSON data PlayHQ fetches internally.
 *
 * Strategy (in order of preference):
 *  1. Intercept PlayHQ's internal JSON API responses during page load
 *  2. Extract ladder from DOM after waitForSelector
 *  3. Extract __NEXT_DATA__ embedded JSON (fast path, no browser)
 *
 * Usage:
 *  const adapter = new PlayHQPlaywrightAdapter()
 *  const entries = await adapter.scrapeLadder('https://www.playhq.com/...')
 *
 * Requires: playwright package + Chromium browser installed
 *   npm install playwright
 *   npx playwright install chromium  (or use PLAYWRIGHT_BROWSERS_PATH)
 *
 * For Vercel/Lambda: use @sparticuz/chromium + playwright-core instead.
 */

import { logger } from '../utils/logger.js'
import type { RawLadderEntry } from '../types/index.js'

export interface PlayHQScrapedLadder {
  entries:    RawLadderEntry[]
  leagueName: string
  season:     string
  scrapedAt:  string
  method:     'json-intercept' | 'dom' | 'next-data'
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export class PlayHQPlaywrightAdapter {
  private readonly timeoutMs: number
  private readonly browserPath?: string

  constructor(options?: { timeoutMs?: number; browserPath?: string }) {
    this.timeoutMs   = options?.timeoutMs   ?? 30_000
    this.browserPath = options?.browserPath ?? process.env.PLAYWRIGHT_CHROMIUM_PATH
  }

  /**
   * Scrape a PlayHQ ladder page and return normalised entries.
   * Pass the full PlayHQ season/grade URL, e.g.:
   *   https://www.playhq.com/afl/org/gippsland-league/.../{id}/ladder
   */
  async scrapeLadder(ladderUrl: string): Promise<PlayHQScrapedLadder> {
    logger.info('PlayHQPlaywright: starting scrape', { url: ladderUrl })

    // Fast path — try __NEXT_DATA__ without launching a browser
    const nextDataResult = await this.tryNextData(ladderUrl)
    if (nextDataResult.length > 0) {
      logger.info('PlayHQPlaywright: extracted via __NEXT_DATA__', { entries: nextDataResult.length })
      return this.makeResult(nextDataResult, 'next-data')
    }

    // Full path — Playwright with network response interception
    return this.scrapeWithPlaywright(ladderUrl)
  }

  // ─── Fast path: __NEXT_DATA__ JSON embedded in HTML ────────────────────────

  private async tryNextData(url: string): Promise<RawLadderEntry[]> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          'User-Agent':      'CNCA-Rankings/1.0 (contact@cnca.com.au; sports data research)',
          'Accept':          'text/html,application/xhtml+xml',
          'Accept-Language': 'en-AU,en;q=0.9',
        },
      })

      if (!res.ok) return []

      const html = await res.text()

      // Extract __NEXT_DATA__ JSON and search it for a ladder array
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
      if (!match) return []

      const nextData = JSON.parse(match[1]) as unknown
      return this.findLadderInJson(nextData)

    } catch (err) {
      logger.debug('PlayHQPlaywright: __NEXT_DATA__ extraction failed', { error: String(err) })
      return []
    }
  }

  // ─── Full path: Playwright with JSON response interception ──────────────────

  private async scrapeWithPlaywright(ladderUrl: string): Promise<PlayHQScrapedLadder> {
    const { chromium } = await import('playwright')

    const executablePath = this.browserPath
      ?? (await this.findChromium())

    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    })

    try {
      const ctx  = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
      const page = await ctx.newPage()

      // Capture every JSON body the page fetches. PlayHQ loads its ladder from
      // api.playhq.com/graphql (rendered inside an embed.playhq.com iframe), so
      // the reliable data source is the intercepted GraphQL JSON — not the DOM.
      const capturedJson: unknown[] = []
      page.on('response', async response => {
        const ct = response.headers()['content-type'] ?? ''
        if (!ct.includes('json')) return
        const url = response.url()
        // Ignore ad/analytics networks that never settle (rubicon, posthog, split.io …)
        if (/rubicon|posthog|split\.io|doubleclick|googlesyndication|adnxs/.test(url)) return
        try {
          capturedJson.push(await response.json())
        } catch { /* non-JSON body — ignore */ }
      })

      logger.info('PlayHQPlaywright: navigating to ladder page', { url: ladderUrl })
      // Do NOT wait for networkidle — ad/analytics polling prevents it from
      // ever settling. Load the DOM, then give XHR/GraphQL time to land.
      try {
        await page.goto(ladderUrl, { waitUntil: 'domcontentloaded', timeout: this.timeoutMs })
      } catch (err) {
        logger.warn('PlayHQPlaywright: goto did not fully settle, continuing', { detail: String(err) })
      }
      // Let the ladder GraphQL request complete and the iframe hydrate
      await page.waitForTimeout(8000)

      // 1. Find the ladder inside any captured JSON (GraphQL or REST)
      logger.info('PlayHQPlaywright: scanning captured JSON responses', { count: capturedJson.length })
      for (const json of capturedJson) {
        const entries = this.findLadderInJson(json)
        if (entries.length >= 4) {
          logger.info('PlayHQPlaywright: parsed ladder from intercepted JSON', { entries: entries.length })
          return this.makeResult(entries, 'json-intercept')
        }
      }

      // 2. Fall back to DOM scraping across the main page AND any iframes
      logger.info('PlayHQPlaywright: JSON scan found no ladder, falling back to DOM (incl. frames)')
      for (const frame of page.frames()) {
        try {
          const domEntries = await this.scrapeDom(frame)
          if (domEntries.length > 0) return this.makeResult(domEntries, 'dom')
        } catch { /* frame detached — skip */ }
      }
      return this.makeResult([], 'dom')

    } finally {
      await browser.close()
    }
  }

  // ─── DOM fallback — header-driven column mapping ────────────────────────────
  // Reads the ladder table's header row to map column NAMES → indices, so it
  // works regardless of PlayHQ's column order or which stats are shown.
  // PlayHQ netball ladders vary: some show P|W|L|D|For|Against|%|Pts, others
  // show P|Pts|%|W|L|D with no goals columns (e.g. Gippsland League).

  private async scrapeDom(page: import('playwright').Page | import('playwright').Frame): Promise<RawLadderEntry[]> {
    // Collect candidate row containers: real <table> rows AND ARIA/div grids
    // (PlayHQ sometimes renders ladders as role="row"/"cell" grids, not tables).
    const containers = [
      ...(await page.locator('table').all()),
      ...(await page.locator('[role="table"], [role="grid"]').all()),
    ]

    const diag: string[] = []

    for (const container of containers) {
      // Header = the first row's cells (th OR td), regardless of thead presence
      const firstRow = container.locator('tr, [role="row"]').first()
      const headerCells = await firstRow.locator('th, td, [role="columnheader"], [role="cell"]').allTextContents()
      const headers = headerCells.map(h => h.trim().toUpperCase())
      if (headers.length > 0) diag.push(headers.join('|'))

      const hasTeam = headers.some(h => h === 'TEAM' || h === 'CLUB' || h.includes('TEAM'))
      if (!hasTeam || headers.length < 4) continue

      const colIndex = this.buildColumnMap(headers)

      const allRows = await container.locator('tr, [role="row"]').all()

      const entries: RawLadderEntry[] = []
      for (const row of allRows) {
        const cellsRaw = await row.locator('td, th, [role="cell"], [role="gridcell"]').allTextContents()
        const cells = cellsRaw.map(c => c.trim())
        if (cells.length < 4) continue

        const at = (key: string): string => {
          const idx = colIndex[key]
          return idx != null && idx < cells.length ? cells[idx] : ''
        }

        const teamName = at('team')
        // Skip the header row and any row whose team cell is empty or purely numeric
        if (!teamName || /^\d+$/.test(teamName) || teamName.toUpperCase() === 'TEAM') continue

        const num = (s: string) => { const n = parseInt(s.replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n }
        const flt = (s: string) => { const n = parseFloat(s.replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n }

        entries.push({
          rank:         entries.length + 1,
          teamRaw:      teamName,
          played:       num(at('played')),
          wins:         num(at('wins')),
          losses:       num(at('losses')),
          draws:        num(at('draws')),
          goalsFor:     num(at('goalsFor')),
          goalsAgainst: num(at('goalsAgainst')),
          percentage:   flt(at('percentage')),
          points:       num(at('points')),
        })
      }

      if (entries.length > 0) {
        logger.info('PlayHQPlaywright: parsed ladder via header map', {
          entries: entries.length,
          headers: headers.join('|'),
        })
        return entries
      }
    }

    // Diagnostics — surface what the page actually contained so we can adapt
    logger.warn('PlayHQPlaywright: no ladder table matched — returning empty', {
      tableCount:      containers.length,
      firstRowHeaders: diag.slice(0, 8),
    })
    return []
  }

  /** Map PlayHQ header labels → our field keys, by column index. */
  private buildColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {}
    headers.forEach((h, i) => {
      const label = h.trim().toUpperCase()
      // Team name column
      if ((label === 'TEAM' || label === 'CLUB' || label.includes('TEAM')) && map.team == null) map.team = i
      // Played
      else if (label === 'P' || label === 'PLD' || label === 'PLAYED' || label === 'GP') map.played = i
      // Points
      else if (label === 'PTS' || label === 'POINTS') map.points = i
      // Percentage
      else if (label === '%' || label.includes('PERC') || label === 'PCT') map.percentage = i
      // Wins / Losses / Draws
      else if (label === 'W' || label === 'WON' || label === 'WINS') map.wins = i
      else if (label === 'L' || label === 'LOST' || label === 'LOSSES') map.losses = i
      else if (label === 'D' || label === 'DRAWN' || label === 'DRAWS') map.draws = i
      // Goals for / against (F/A on PlayHQ). Exact matches only so FORF/ADJ
      // are never mistaken for FOR/AGAINST.
      else if (label === 'F' || label === 'FOR' || label === 'GF' || label === 'PF') map.goalsFor = i
      else if (label === 'A' || label === 'AGAINST' || label === 'GA' || label === 'PA') map.goalsAgainst = i
    })
    return map
  }

  // ─── JSON response parser — recursively find the ladder array ───────────────
  // PlayHQ returns the ladder via GraphQL, whose exact shape we don't hardcode.
  // We walk the whole JSON tree, and for every array of objects we try to map
  // it as a ladder (fuzzy key matching). The largest confidently-mapped array
  // wins. This survives GraphQL schema changes and different query names.

  private findLadderInJson(root: unknown): RawLadderEntry[] {
    let best: RawLadderEntry[] = []

    const visit = (node: unknown): void => {
      if (Array.isArray(node)) {
        if (node.length >= 4 && node.every(x => x !== null && typeof x === 'object')) {
          const mapped = this.tryMapLadderArray(node as Record<string, unknown>[])
          if (mapped.length > best.length) best = mapped
        }
        for (const child of node) visit(child)
      } else if (node !== null && typeof node === 'object') {
        for (const v of Object.values(node as Record<string, unknown>)) visit(v)
      }
    }

    visit(root)
    return best
  }

  /** Attempt to map an array of objects into ladder entries via fuzzy keys. */
  private tryMapLadderArray(arr: Record<string, unknown>[]): RawLadderEntry[] {
    const entries: RawLadderEntry[] = []

    arr.forEach((row, i) => {
      const team = this.findTeamName(row)
      if (!team) return
      entries.push({
        rank:         this.findNum(row, /^(rank|position|pos)$/i) ?? i + 1,
        teamRaw:      team,
        played:       this.findNum(row, /^(played|games?|gamesplayed|gp|p)$/i) ?? 0,
        wins:         this.findNum(row, /^(w|won|wins)$/i) ?? 0,
        losses:       this.findNum(row, /^(l|lost|losses)$/i) ?? 0,
        draws:        this.findNum(row, /^(d|draw|draws|drawn|tie|tied|ties)$/i) ?? 0,
        goalsFor:     this.findNum(row, /^(for|f|gf|pf|goalsfor|pointsfor|scoredfor)$/i) ?? 0,
        goalsAgainst: this.findNum(row, /^(against|a|ga|pa|goalsagainst|pointsagainst)$/i) ?? 0,
        percentage:   this.findNum(row, /^(percentage|percent|pct|per|ratio)$/i) ?? 0,
        points:       this.findNum(row, /^(points|pts|competitionpoints|totalpoints|premiershippoints)$/i) ?? 0,
      })
    })

    // Confidence check: a real ladder has most rows carrying played/points/wins
    const confident = entries.filter(e => e.played > 0 || e.points > 0 || e.wins > 0 || e.goalsFor > 0)
    return confident.length >= 4 ? entries.sort((a, b) => a.rank - b.rank) : []
  }

  /** Find a numeric value whose key matches the pattern (searches one level deep). */
  private findNum(obj: Record<string, unknown>, pattern: RegExp): number | undefined {
    for (const [k, v] of Object.entries(obj)) {
      if (pattern.test(k)) {
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
        if (!isNaN(n)) return n
      }
    }
    // one level deep (e.g. { stats: { wins: 5 } })
    for (const v of Object.values(obj)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const n = this.findNum(v as Record<string, unknown>, pattern)
        if (n !== undefined) return n
      }
    }
    return undefined
  }

  /** Find a team/club name string (handles nested { team: { name } }). */
  private findTeamName(obj: Record<string, unknown>): string {
    for (const [k, v] of Object.entries(obj)) {
      if (/^(team|club|teamname|clubname|name|displayname)$/i.test(k)) {
        if (typeof v === 'string' && v.trim()) return v.trim()
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          const nested = (v as Record<string, unknown>).name ?? (v as Record<string, unknown>).displayName
          if (typeof nested === 'string' && nested.trim()) return nested.trim()
        }
      }
    }
    return ''
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private makeResult(entries: RawLadderEntry[], method: PlayHQScrapedLadder['method']): PlayHQScrapedLadder {
    return { entries, leagueName: '', season: '', scrapedAt: new Date().toISOString(), method }
  }

  private async findChromium(): Promise<string | undefined> {
    // Check well-known paths (Vercel, container environments)
    const candidates = [
      process.env.PLAYWRIGHT_BROWSERS_PATH
        ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium-1194/chrome-linux/chrome`
        : '',
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ].filter(Boolean)

    const { access } = await import('fs/promises')
    for (const p of candidates) {
      try {
        await access(p)
        return p
      } catch { /* keep trying */ }
    }
    return undefined  // playwright will use its bundled browser
  }
}
