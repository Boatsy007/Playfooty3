/**
 * Netball Connect Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Netball Connect is the competition management system used by many
 * state netball associations (particularly NSW, QLD, VIC affiliates).
 * Targets the public-facing results/ladder pages.
 *
 * NOTE: Netball Connect's page structure is more consistent than PlayHQ,
 * making regex extraction more reliable. Still — monitor for breakage.
 *
 * IMPORTANT: Review Netball Connect's Terms before deploying at scale.
 */

import { BaseAdapter } from './base.adapter.js'
import type { LeagueSourceUrl, RawLadder, RawLadderEntry, RawMatch, AdapterResult, AdapterError } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { TTLCache } from '../utils/cache.js'

const PAGE_CACHE = new TTLCache<string>(6 * 60 * 60 * 1000)

export class NetballConnectAdapter extends BaseAdapter {
  readonly name        = 'Netball Connect'
  readonly sourceType  = 'NETBALL_CONNECT' as const
  readonly description = 'Scrapes ladder and results from the Netball Connect competition management platform'

  constructor() {
    super({ requestDelayMs: 1200, maxRetries: 3, timeoutMs: 20000 })
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch('https://netballconnect.com', {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'CNCA-Rankings/1.0 (contact@cnca.com.au)' },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async collectLadders(leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>> {
    const start   = Date.now()
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

        logger.info(`NetballConnect: scraped ladder for ${league.leagueName}`, { entries: entries.length })
        await this.delay(this.requestDelayMs)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(this.makeError(msg, true, { leagueId: league.leagueId, sourceUrl: league.ladderUrl }))
        logger.warn(`NetballConnect: failed to scrape ${league.leagueName}`, { error: msg })
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

        logger.info(`NetballConnect: scraped matches for ${league.leagueName}`, { count: parsed.length })
        await this.delay(this.requestDelayMs)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(this.makeError(msg, true, { leagueId: league.leagueId, sourceUrl: league.fixturesUrl }))
      }
    }

    return this.makeResult(matches, errors, start)
  }

  private async fetchPage(url: string): Promise<string> {
    const cached = PAGE_CACHE.get(url)
    if (cached) return cached

    const html = await this.withRetry(async () => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'User-Agent': 'CNCA-Rankings/1.0 (contact@cnca.com.au)',
          'Accept':     'text/html,application/xhtml+xml',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res.text()
    }, url)

    PAGE_CACHE.set(url, html)
    return html
  }

  private parseLadder(html: string): RawLadderEntry[] {
    const entries: RawLadderEntry[] = []

    // Netball Connect ladder tables use class="ladder-table" or similar
    const rowPattern = /class="[^"]*ladder[^"]*row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
    const cellPattern = /<td[^>]*>\s*([^<]+?)\s*<\/td>/gi

    let rowMatch: RegExpExecArray | null
    let rank = 1

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const rowHtml = rowMatch[1]
      const cells: string[] = []
      let cellMatch: RegExpExecArray | null
      while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].trim())
      }

      if (cells.length >= 6 && cells[0]) {
        const goalsFor     = parseInt(cells[5] ?? '0', 10)
        const goalsAgainst = parseInt(cells[6] ?? '0', 10)
        entries.push({
          rank:         rank++,
          teamRaw:      cells[0] ?? '',
          played:       parseInt(cells[1] ?? '0', 10),
          wins:         parseInt(cells[2] ?? '0', 10),
          losses:       parseInt(cells[3] ?? '0', 10),
          draws:        parseInt(cells[4] ?? '0', 10),
          goalsFor,
          goalsAgainst,
          percentage:   goalsAgainst > 0
            ? parseFloat(((goalsFor / goalsAgainst) * 100).toFixed(2))
            : 100,
          points:       parseInt(cells[7] ?? '0', 10),
        })
      }
    }

    return entries
  }

  private parseMatches(html: string, league: LeagueSourceUrl): RawMatch[] {
    const matches: RawMatch[] = []

    // Netball Connect result rows
    const rowPattern = /class="[^"]*(?:result|fixture)[^"]*"[^>]*>([\s\S]*?)<\/(?:tr|div)>/gi
    const scorePattern = /(\d+)\s*[-–]\s*(\d+)/

    let m: RegExpExecArray | null
    while ((m = rowPattern.exec(html)) !== null) {
      const row = m[1]

      const teamPattern = /class="[^"]*team[^"]*"[^>]*>([^<]+)</gi
      const teams: string[] = []
      let tm: RegExpExecArray | null
      while ((tm = teamPattern.exec(row)) !== null) teams.push(tm[1].trim())

      const scoreMatch = scorePattern.exec(row)
      if (teams.length >= 2 && scoreMatch) {
        const homeGoals = parseInt(scoreMatch[1], 10)
        const awayGoals = parseInt(scoreMatch[2], 10)
        if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
          matches.push({
            homeTeamRaw: teams[0] ?? '',
            awayTeamRaw: teams[1] ?? '',
            homeGoals,
            awayGoals,
            date:        new Date().toISOString(),
            leagueRaw:   league.leagueName,
            stateRaw:    league.state,
            season:      league.season,
            sourceType:  this.sourceType,
            sourceUrl:   league.fixturesUrl,
            scrapedAt:   new Date().toISOString(),
          })
        }
      }
    }

    return matches
  }
}
