/**
 * Manual Entry Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * For associations with no digital footprint, an admin can enter data
 * directly via the admin dashboard or via this adapter's structured JSON API.
 *
 * This ensures 100% league coverage even before scrapers are configured.
 * Priority: CSV > Manual > Scraper (manual is lowest trust; flags for review)
 */

import { BaseAdapter } from './base.adapter.js'
import type {
  LeagueSourceUrl, RawLadder, RawLadderEntry,
  RawMatch, AdapterResult,
} from '../types/index.js'

export interface ManualLadderInput {
  leagueName: string
  state: string
  season: string
  entries: Omit<RawLadderEntry, 'percentage'> & { percentage?: number }[]
}

export class ManualAdapter extends BaseAdapter {
  readonly name        = 'Manual Entry'
  readonly sourceType  = 'MANUAL_ENTRY' as const
  readonly description = 'Data entered manually by PlayFooty administrators via dashboard or structured JSON'

  async ping(): Promise<boolean> { return true }

  ingestLadder(input: ManualLadderInput): AdapterResult<RawLadder[]> {
    const start = Date.now()

    const entries: RawLadderEntry[] = input.entries.map((e, i) => ({
      ...e,
      rank:       e.rank ?? i + 1,
      percentage: e.percentage ?? (
        e.goalsAgainst > 0
          ? parseFloat(((e.goalsFor / e.goalsAgainst) * 100).toFixed(2))
          : 100
      ),
    }))

    const ladder: RawLadder = {
      leagueRaw:  input.leagueName,
      stateRaw:   input.state,
      season:     input.season,
      entries,
      sourceType: this.sourceType,
      scrapedAt:  new Date().toISOString(),
    }

    return this.makeResult([ladder], [], start)
  }

  async collectLadders(_leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>> {
    return this.makeResult([], [], Date.now())
  }

  async collectMatches(_leagues: LeagueSourceUrl[]): Promise<AdapterResult<RawMatch[]>> {
    return this.makeResult([], [], Date.now())
  }
}
