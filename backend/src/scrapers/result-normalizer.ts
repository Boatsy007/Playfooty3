/**
 * Result Normalizer
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts raw adapter output (RawLadder / RawMatch) into NormalisedClubRecord
 * objects ready for the ranking engine.
 *
 * Normalisation steps:
 * 1. Deduplicate club names across leagues (Jaccard similarity)
 * 2. Merge multi-league entries for the same canonical club
 * 3. Derive recentForm from match history (newest first)
 * 4. Attach leagueStrengthScore from the league configuration
 */

import type {
  RawLadder,
  RawMatch,
  NormalisedClubRecord,
  MatchResult,
  AustralianState,
} from '../types/index.js'
import { normaliseClubName } from '../utils/club-normalizer.js'
import { logger } from '../utils/logger.js'

interface LeagueStrengthMap {
  [leagueRaw: string]: number   // 0–100
}

export interface NormaliserInput {
  ladders:        RawLadder[]
  matches:        RawMatch[]
  leagueStrength: LeagueStrengthMap
  season:         string
}

export function normaliseResults(input: NormaliserInput): NormalisedClubRecord[] {
  const { ladders, matches, leagueStrength, season } = input

  // Build a lookup: canonical clubId → aggregated record
  const clubMap = new Map<string, NormalisedClubRecord>()

  // ── Step 1: process ladder entries ──────────────────────────────────────────
  for (const ladder of ladders) {
    const strengthScore = leagueStrength[ladder.leagueRaw] ?? 50

    for (const entry of ladder.entries) {
      const { canonical, needsReview } = normaliseClubName(entry.teamRaw)
      const clubId = slugify(canonical)

      if (needsReview) {
        logger.warn('Normaliser: club name needs review', {
          raw: entry.teamRaw,
          canonical,
          league: ladder.leagueRaw,
        })
      }

      if (clubMap.has(clubId)) {
        // Club exists in another league — keep the entry from the stronger league
        const existing = clubMap.get(clubId)!
        if (strengthScore > existing.leagueStrengthScore) {
          clubMap.set(clubId, buildRecord(clubId, canonical, entry, ladder, strengthScore, season, []))
        }
      } else {
        clubMap.set(clubId, buildRecord(clubId, canonical, entry, ladder, strengthScore, season, []))
      }
    }
  }

  // ── Step 2: derive recentForm from matches ───────────────────────────────────
  for (const match of matches) {
    attachFormResult(clubMap, match)
  }

  // ── Step 3: finalise recentForm arrays (cap at 5, newest first) ─────────────
  const records = Array.from(clubMap.values()).map(record => ({
    ...record,
    recentForm: record.recentForm.slice(-5),
  }))

  logger.info('Normaliser: completed', {
    ladders:  ladders.length,
    matches:  matches.length,
    clubs:    records.length,
  })

  return records
}

// ─────────────────────────────────────────────────────────────────────────────

function buildRecord(
  clubId: string,
  clubName: string,
  entry: RawLadder['entries'][number],
  ladder: RawLadder,
  leagueStrengthScore: number,
  season: string,
  recentForm: MatchResult[],
): NormalisedClubRecord {
  return {
    clubId,
    clubName,
    leagueId:   slugify(ladder.leagueRaw),
    leagueName: ladder.leagueRaw,
    state:      (ladder.stateRaw as AustralianState) ?? 'NSW',
    season,
    wins:        entry.wins,
    losses:      entry.losses,
    draws:       entry.draws,
    played:      entry.played,
    goalsFor:    entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    percentage:  entry.percentage,
    points:      entry.points,
    leagueStrengthScore,
    recentForm,
    finalsWins:   0,
    finalsLosses: 0,
    oppositionRatings: [],
    sourceType:  ladder.sourceType,
    lastUpdated: ladder.scrapedAt,
  }
}

function attachFormResult(
  clubMap: Map<string, NormalisedClubRecord>,
  match: RawMatch,
): void {
  const homeId = slugify(normaliseClubName(match.homeTeamRaw).canonical)
  const awayId = slugify(normaliseClubName(match.awayTeamRaw).canonical)

  const homeRecord = clubMap.get(homeId)
  const awayRecord = clubMap.get(awayId)

  if (match.homeGoals === match.awayGoals) {
    if (homeRecord) homeRecord.recentForm.push('D')
    if (awayRecord) awayRecord.recentForm.push('D')
  } else if (match.homeGoals > match.awayGoals) {
    if (homeRecord) homeRecord.recentForm.push('W')
    if (awayRecord) awayRecord.recentForm.push('L')
  } else {
    if (homeRecord) homeRecord.recentForm.push('L')
    if (awayRecord) awayRecord.recentForm.push('W')
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
