/**
 * PlayHQ Data Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * PlayHQ is the primary competition management platform used by Netball
 * Australia affiliated associations. This adapter targets the PlayHQ public
 * website (https://www.playhq.com) as no official public API exists.
 *
 * Implementation strategy (current — HTML fallback):
 * • fetch() + regex to parse any static ladder content
 * • Cache responses for 6 hours, 1.5 s between requests
 * • Marks league PENDING_REVIEW if zero entries parsed
 *
 * ⚠️  KNOWN LIMITATION — PlayHQ is Next.js (JavaScript-rendered):
 * Ladder data is loaded via internal XHR after page hydration. A raw
 * fetch() of the page HTML returns only the shell — no ladder rows.
 * The regex parser will return 0 entries and flag PENDING_REVIEW.
 *
 * NEXT ITERATION: Replace with a Playwright (headless Chromium) adapter:
 *   await page.goto(ladderUrl)
 *   await page.waitForSelector('[data-testid="ladder-row"]')
 *   const rows = await page.$$eval('[data-testid="ladder-row"]', ...)
 *
 * Alternatively, inspect the Network tab on the PlayHQ ladder page and
 * target the XHR/GraphQL endpoint directly (no browser required).
 *
 * IMPORTANT: Review PlayHQ's Terms of Service before deploying at scale.
 * Replace with an official API integration if/when one becomes available.
 */

import { BaseAdapter } from './base.adapter.js'
import type { LeagueSourceUrl, RawLadder, RawMatch, AdapterResult, AdapterError } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { TTLCache } from '../utils/cache.js'

const PAGE_CACHE = new TTLCache<string>(6 * 60 * 60 * 1000)  // 6 hr

export class PlayHQAdapter extends BaseAdapter {
  readonly name = 'PlayHQ'
  readonly sourceType = 'PLAYHQ' as const
  readonly description = 'Scrapes ladder and results data from the PlayHQ competition management platform'

  constructor() {
    super({ requestDelayMs: 1500, maxRetries: 3, timeoutMs: 20000 })
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch('https://www.playhq.com', {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'PlayFooty-Rankings/1.0 (hello@playfooty.com.au)' },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async collectLadders(leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>> {
    const start  = Date.now()
    const errors: AdapterError[] = []
    const ladders: RawLadder[]   = []

    for (const league of leagues) {
      if (!league.ladderUrl) {
        errors.push(this.makeError('No ladder URL configured', false, { leagueId: league.leagueId }))
        continue
      }

      try {
        const html    = await this.fetchPage(league.ladderUrl)
        const entries = this.parseLadder(html)

        if (entries.length === 0) {
          // Page structure may have changed — flag for human review
          errors.push(this.makeError(
            'Zero entries parsed — page structure may have changed. Marked for review.',
            false,
            { leagueId: league.leagueId, sourceUrl: league.ladderUrl },
          ))
          continue
        }

        ladders.push({
          leagueRaw:  league.leagueName,
          stateRaw:   league.state,
          season:     league.season,
          entries,
          sourceType: this.sourceType,
          sourceUrl:  league.ladderUrl,
          scrapedAt:  new Date().toISOString(),
        })

        logger.info(`PlayHQ: scraped ladder for ${league.leagueName}`, { entries: entries.length })
        await this.delay(this.requestDelayMs)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(this.makeError(msg, true, { leagueId: league.leagueId, sourceUrl: league.ladderUrl }))
        logger.warn(`PlayHQ: failed to scrape ${league.leagueName}`, { error: msg })
      }
    }

    return this.makeResult(ladders, errors, start)
  }

  async collectMatches(leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawMatch[]>> {
    const start   = Date.now()
    const errors: AdapterError[] = []
    const matches: RawMatch[]    = []

    for (const league of leagues) {
      if (!league.fixturesUrl) {
        errors.push(this.makeError('No fixtures URL configured', false, { leagueId: league.leagueId }))
        continue
      }

      try {
        const html   = await this.fetchPage(league.fixturesUrl)
        const parsed = this.parseMatches(html, league)
        matches.push(...parsed)

        logger.info(`PlayHQ: scraped matches for ${league.leagueName}`, { count: parsed.length })
        await this.delay(this.requestDelayMs)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(this.makeError(msg, true, { leagueId: league.leagueId, sourceUrl: league.fixturesUrl }))
      }
    }

    return this.makeResult(matches, errors, start)
  }

  // ─── Private parsing helpers ───────────────────────────────────────────────

  private async fetchPage(url: string): Promise<string> {
    const cached = PAGE_CACHE.get(url)
    if (cached) return cached

    const html = await this.withRetry(async () => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'User-Agent': 'PlayFooty-Rankings/1.0 (hello@playfooty.com.au)',
          'Accept':     'text/html,application/xhtml+xml',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res.text()
    }, url)

    PAGE_CACHE.set(url, html)
    return html
  }

  /**
   * Parse a PlayHQ ladder page.
   * NOTE: PlayHQ page structure as of 2025. Will need updating if PlayHQ
   * redesigns their site. The scrape log will flag PENDING_REVIEW entries.
   *
   * This is a best-effort parser — in production, pair with Playwright
   * for JavaScript-rendered pages.
   */
  private parseLadder(html: string) {
    // Pattern targets PlayHQ's standard ladder table rows
    // Real implementation should use cheerio or similar HTML parser
    const rows: { teamRaw: string; played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; percentage: number; points: number; rank: number }[] = []

    // Extract table rows — PlayHQ uses data-testid attributes
    const rowPattern = /data-testid="ladder-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
    const cellPattern = /data-testid="ladder-cell[^"]*"[^>]*>([^<]*)<\/td>/gi

    let rowMatch: RegExpExecArray | null
    let rank = 1

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const rowHtml = rowMatch[1]
      const cells: string[] = []
      let cellMatch: RegExpExecArray | null
      while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].trim())
      }

      if (cells.length >= 7) {
        rows.push({
          rank:         rank++,
          teamRaw:      cells[0]  || '',
          played:       parseInt(cells[1]  || '0', 10),
          wins:         parseInt(cells[2]  || '0', 10),
          losses:       parseInt(cells[3]  || '0', 10),
          draws:        parseInt(cells[4]  || '0', 10),
          goalsFor:     parseInt(cells[5]  || '0', 10),
          goalsAgainst: parseInt(cells[6]  || '0', 10),
          percentage:   parseFloat(cells[7] || '0'),
          points:       parseInt(cells[8]  || '0', 10),
        })
      }
    }

    return rows
  }

  private parseMatches(html: string, league: LeagueSourceUrl): RawMatch[] {
    const matches: RawMatch[] = []

    // PlayHQ result cards — again a pattern-match; in production use cheerio
    const resultPattern = /class="[^"]*result-card[^"]*"[\s\S]*?home[^>]*>([^<]+)<[\s\S]*?(\d+)[\s\S]*?(\d+)[\s\S]*?away[^>]*>([^<]+)</gi
    let m: RegExpExecArray | null

    while ((m = resultPattern.exec(html)) !== null) {
      const homeGoals = parseInt(m[2], 10)
      const awayGoals = parseInt(m[3], 10)

      if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
        matches.push({
          homeTeamRaw:  m[1].trim(),
          awayTeamRaw:  m[4].trim(),
          homeGoals,
          awayGoals,
          date:         new Date().toISOString(),  // parse from page in full impl
          leagueRaw:    league.leagueName,
          stateRaw:     league.state,
          season:       league.season,
          sourceType:   this.sourceType,
          sourceUrl:    league.fixturesUrl,
          scrapedAt:    new Date().toISOString(),
        })
      }
    }

    return matches
  }
}
