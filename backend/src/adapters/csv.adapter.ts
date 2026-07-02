/**
 * CSV Import Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts ladder data from associations that submit CSV files.
 * This is the immediate path to get data into the system before scrapers
 * are fully configured for every league.
 *
 * Expected CSV format (ladder):
 * Rank,Team,Played,Wins,Losses,Draws,Goals For,Goals Against,Percentage,Points
 *
 * Expected CSV format (matches):
 * Date,Home Team,Home Goals,Away Goals,Away Team,Round,Venue
 */

import { BaseAdapter } from './base.adapter.js'
import type {
  LeagueSourceUrl, RawLadder, RawLadderEntry,
  RawMatch, AdapterResult, AdapterError,
} from '../types/index.js'
import { logger } from '../utils/logger.js'

export interface CSVImportOptions {
  leagueId:   string
  leagueName: string
  state:      string
  season:     string
  sourceUrl?: string
}

export class CSVAdapter extends BaseAdapter {
  readonly name        = 'CSV Import'
  readonly sourceType  = 'CSV_IMPORT' as const
  readonly description = 'Imports ladder and match data from CSV files submitted by associations'

  async ping(): Promise<boolean> { return true }   // always available

  /** Parse CSV ladder content directly (no URL fetch required). */
  parseLadderCSV(
    csvContent: string,
    options: CSVImportOptions,
  ): AdapterResult<RawLadder[]> {
    const start  = Date.now()
    const errors: AdapterError[] = []

    const lines   = csvContent.trim().split('\n').filter(Boolean)
    const header  = lines[0].toLowerCase()

    if (!header.includes('team') || !header.includes('wins')) {
      return this.makeResult([], [this.makeError('CSV header does not match expected format', false)], start)
    }

    const cols = header.split(',').map(h => h.trim())
    const idx  = {
      rank:    cols.findIndex(c => c === 'rank'),
      team:    cols.findIndex(c => ['team', 'club', 'name'].includes(c)),
      played:  cols.findIndex(c => ['played', 'p', 'gp'].includes(c)),
      wins:    cols.findIndex(c => ['wins', 'w'].includes(c)),
      losses:  cols.findIndex(c => ['losses', 'loss', 'l'].includes(c)),
      draws:   cols.findIndex(c => ['draws', 'd'].includes(c)),
      gf:      cols.findIndex(c => ['goals for', 'gf', 'goals_for'].includes(c)),
      ga:      cols.findIndex(c => ['goals against', 'ga', 'goals_against'].includes(c)),
      pct:     cols.findIndex(c => ['percentage', 'pct', '%'].includes(c)),
      points:  cols.findIndex(c => ['points', 'pts'].includes(c)),
    }

    const entries: RawLadderEntry[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))

      try {
        entries.push({
          rank:         idx.rank   >= 0 ? parseInt(cells[idx.rank],   10) : i,
          teamRaw:      idx.team   >= 0 ? cells[idx.team] : '',
          played:       idx.played >= 0 ? parseInt(cells[idx.played], 10) : 0,
          wins:         idx.wins   >= 0 ? parseInt(cells[idx.wins],   10) : 0,
          losses:       idx.losses >= 0 ? parseInt(cells[idx.losses], 10) : 0,
          draws:        idx.draws  >= 0 ? parseInt(cells[idx.draws],  10) : 0,
          goalsFor:     idx.gf     >= 0 ? parseInt(cells[idx.gf],     10) : 0,
          goalsAgainst: idx.ga     >= 0 ? parseInt(cells[idx.ga],     10) : 0,
          percentage:   idx.pct    >= 0 ? parseFloat(cells[idx.pct])       : 0,
          points:       idx.points >= 0 ? parseInt(cells[idx.points], 10) : 0,
        })
      } catch {
        errors.push(this.makeError(`Failed to parse row ${i + 1}: "${lines[i]}"`, false))
      }
    }

    logger.info('CSVAdapter: parsed ladder', { league: options.leagueName, entries: entries.length })

    const ladder: RawLadder = {
      leagueRaw:  options.leagueName,
      stateRaw:   options.state,
      season:     options.season,
      entries,
      sourceType: this.sourceType,
      sourceUrl:  options.sourceUrl,
      scrapedAt:  new Date().toISOString(),
    }

    return this.makeResult([ladder], errors, start)
  }

  /** Parse CSV match results. */
  parseMatchesCSV(csvContent: string, options: CSVImportOptions): AdapterResult<RawMatch[]> {
    const start  = Date.now()
    const errors: AdapterError[] = []
    const lines  = csvContent.trim().split('\n').filter(Boolean)

    const cols = lines[0].toLowerCase().split(',').map(c => c.trim())
    const idx  = {
      date:     cols.findIndex(c => ['date'].includes(c)),
      home:     cols.findIndex(c => ['home team', 'home', 'home_team'].includes(c)),
      homeGoals: cols.findIndex(c => ['home goals', 'home score', 'hg'].includes(c)),
      awayGoals: cols.findIndex(c => ['away goals', 'away score', 'ag'].includes(c)),
      away:     cols.findIndex(c => ['away team', 'away', 'away_team'].includes(c)),
      round:    cols.findIndex(c => ['round', 'r'].includes(c)),
      venue:    cols.findIndex(c => ['venue', 'ground'].includes(c)),
    }

    const matches: RawMatch[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      try {
        const homeGoals = parseInt(cells[idx.homeGoals] ?? '0', 10)
        const awayGoals = parseInt(cells[idx.awayGoals] ?? '0', 10)

        if (isNaN(homeGoals) || isNaN(awayGoals)) {
          errors.push(this.makeError(`Row ${i + 1}: invalid score values`, false))
          continue
        }

        matches.push({
          homeTeamRaw:  cells[idx.home]  ?? '',
          awayTeamRaw:  cells[idx.away]  ?? '',
          homeGoals,
          awayGoals,
          date:         idx.date >= 0 ? cells[idx.date] : new Date().toISOString(),
          round:        idx.round >= 0 ? parseInt(cells[idx.round], 10) : undefined,
          venue:        idx.venue >= 0 ? cells[idx.venue] : undefined,
          leagueRaw:    options.leagueName,
          stateRaw:     options.state,
          season:       options.season,
          sourceType:   this.sourceType,
          sourceUrl:    options.sourceUrl,
          scrapedAt:    new Date().toISOString(),
        })
      } catch {
        errors.push(this.makeError(`Failed to parse row ${i + 1}`, false))
      }
    }

    return this.makeResult(matches, errors, start)
  }

  // Required by BaseAdapter — CSVAdapter doesn't fetch URLs
  async collectLadders(_leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>> {
    return this.makeResult([], [], Date.now())
  }

  async collectMatches(_leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawMatch[]>> {
    return this.makeResult([], [], Date.now())
  }
}
