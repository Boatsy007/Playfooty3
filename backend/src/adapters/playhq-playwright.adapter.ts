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

// ─── JSON response shapes PlayHQ returns internally ──────────────────────────

interface PlayHQApiTeam {
  id:            string
  name:          string
  shortName?:    string
  logo?:         { sizes?: { url: string }[]; url?: string }
}

interface PlayHQApiLadderEntry {
  team:          PlayHQApiTeam
  rank?:         number
  position?:     number
  played?:       number
  gamesPlayed?:  number
  wins?:         number
  losses?:       number
  draws?:        number
  goalsFor?:     number
  pointsFor?:    number
  goalsAgainst?: number
  pointsAgainst?: number
  percentage?:   number
  points?:       number
  totalPoints?:  number
}

interface PlayHQApiResponse {
  data?: {
    competition?: { name?: string }
    ladder?:      PlayHQApiLadderEntry[]
    standings?:   PlayHQApiLadderEntry[]
    teams?:       PlayHQApiLadderEntry[]
  }
  ladder?:        PlayHQApiLadderEntry[]
  standings?:     PlayHQApiLadderEntry[]
  competition?:   { name?: string }
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

      // Extract __NEXT_DATA__ JSON
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
      if (!match) return []

      const nextData = JSON.parse(match[1]) as {
        props?: {
          pageProps?: {
            ladder?: PlayHQApiLadderEntry[]
            standings?: PlayHQApiLadderEntry[]
            competition?: { name?: string }
            initialState?: { ladder?: PlayHQApiLadderEntry[] }
          }
        }
      }

      const props = nextData?.props?.pageProps
      if (!props) return []

      const raw = props.ladder ?? props.standings ?? props.initialState?.ladder ?? []
      return this.normaliseEntries(raw)

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

      // Intercept all JSON responses — PlayHQ fetches ladder via XHR/fetch
      const capturedApiResponses: PlayHQApiResponse[] = []
      page.on('response', async response => {
        const url     = response.url()
        const ct      = response.headers()['content-type'] ?? ''
        const isJson  = ct.includes('json')
        const isApi   = url.includes('/api/') || url.includes('graphql') || url.includes('ladder') || url.includes('standing')
        if (isJson && isApi) {
          try {
            const json = await response.json() as PlayHQApiResponse
            capturedApiResponses.push(json)
            logger.debug('PlayHQPlaywright: captured JSON response', { url, bytes: JSON.stringify(json).length })
          } catch {
            // some json endpoints return non-ladder data; ignore
          }
        }
      })

      logger.info('PlayHQPlaywright: navigating to ladder page', { url: ladderUrl })
      await page.goto(ladderUrl, {
        waitUntil: 'networkidle',
        timeout:   this.timeoutMs,
      })

      // 1. Try to parse captured JSON responses first
      for (const json of capturedApiResponses) {
        const raw = this.extractLadderFromJson(json)
        if (raw.length > 0) {
          const entries = this.normaliseEntries(raw)
          if (entries.length > 0) {
            logger.info('PlayHQPlaywright: parsed ladder from JSON intercept', { entries: entries.length })
            return this.makeResult(entries, 'json-intercept')
          }
        }
      }

      // 2. Fall back to DOM scraping
      logger.info('PlayHQPlaywright: JSON intercept yielded no data, falling back to DOM')
      const domEntries = await this.scrapeDom(page)
      return this.makeResult(domEntries, 'dom')

    } finally {
      await browser.close()
    }
  }

  // ─── DOM fallback — header-driven column mapping ────────────────────────────
  // Reads the ladder table's header row to map column NAMES → indices, so it
  // works regardless of PlayHQ's column order or which stats are shown.
  // PlayHQ netball ladders vary: some show P|W|L|D|For|Against|%|Pts, others
  // show P|Pts|%|W|L|D with no goals columns (e.g. Gippsland League).

  private async scrapeDom(page: import('playwright').Page): Promise<RawLadderEntry[]> {
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
      // Goals for / against (only present on some ladders)
      else if (label === 'FOR' || label === 'GF' || label === 'PF' || label.includes('FOR')) map.goalsFor = i
      else if (label === 'AGAINST' || label === 'GA' || label === 'PA' || label.includes('AGAINST')) map.goalsAgainst = i
    })
    return map
  }

  // ─── JSON response parser ───────────────────────────────────────────────────

  private extractLadderFromJson(json: PlayHQApiResponse): PlayHQApiLadderEntry[] {
    // Try multiple known PlayHQ response shapes
    if (Array.isArray(json)) {
      const arr = json as PlayHQApiLadderEntry[]
      if (arr.length > 0 && arr[0].team) return arr
    }

    const candidates = [
      json.ladder,
      json.standings,
      json.data?.ladder,
      json.data?.standings,
      json.data?.teams,
    ]

    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0 && (c[0] as PlayHQApiLadderEntry).team) {
        return c as PlayHQApiLadderEntry[]
      }
    }

    return []
  }

  // ─── Normalise PlayHQ API entries → RawLadderEntry ─────────────────────────

  private normaliseEntries(raw: PlayHQApiLadderEntry[]): RawLadderEntry[] {
    return raw
      .map((e, i) => {
        const gf = e.goalsFor ?? e.pointsFor ?? 0
        const ga = e.goalsAgainst ?? e.pointsAgainst ?? 0
        const pct = e.percentage ?? (ga > 0 ? parseFloat(((gf / ga) * 100).toFixed(1)) : 0)
        return {
          rank:         e.rank ?? e.position ?? i + 1,
          teamRaw:      e.team?.name ?? '',
          played:       e.played ?? e.gamesPlayed ?? 0,
          wins:         e.wins    ?? 0,
          losses:       e.losses  ?? 0,
          draws:        e.draws   ?? 0,
          goalsFor:     gf,
          goalsAgainst: ga,
          percentage:   pct,
          points:       e.points  ?? e.totalPoints ?? 0,
        }
      })
      .filter(e => e.teamRaw.length > 0)
      .sort((a, b) => a.rank - b.rank)
  }

  /** Extract team badge/logo URLs from captured responses */
  extractTeamLogos(raw: PlayHQApiLadderEntry[]): Map<string, string> {
    const logos = new Map<string, string>()
    for (const e of raw) {
      const name = e.team?.name
      if (!name) continue
      const url = e.team.logo?.url ?? e.team.logo?.sizes?.[0]?.url
      if (url) logos.set(name, url)
    }
    return logos
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
