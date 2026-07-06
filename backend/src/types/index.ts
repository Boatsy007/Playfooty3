/**
 * PlayFooty Rankings Engine — Shared Type Definitions
 * ─────────────────────────────────────────────────────────────────────────────
 * All types shared across adapters, engine, API and jobs live here.
 * Never import domain types from individual modules — always from this barrel.
 */

// ─── Core domain enums ───────────────────────────────────────────────────────

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT'

export type MatchResult = 'W' | 'L' | 'D'

export type DataSourceType =
  | 'PLAYHQ'
  | 'NETBALL_CONNECT'
  | 'CSV_IMPORT'
  | 'MANUAL_ENTRY'
  | 'WEB_SCRAPE'
  | 'FUTURE_API'

export type AdapterStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED' | 'PENDING_REVIEW'

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export type ClubNameVariant = {
  raw: string
  normalised: string
  source: DataSourceType
}

// ─── Raw data structures returned by all adapters ────────────────────────────
// Every adapter — regardless of source — must return these shapes.

export interface RawMatch {
  homeTeamRaw: string        // e.g. "Dubbo NC", "Wagga", "Mount Gambier Aces"
  awayTeamRaw: string
  homeGoals: number
  awayGoals: number
  date: string               // ISO 8601
  round?: number
  venue?: string
  leagueRaw: string          // e.g. "Western Plains Netball Association"
  stateRaw: string
  season: string             // e.g. "2025"
  sourceType: DataSourceType
  sourceUrl?: string
  scrapedAt: string          // ISO 8601
}

export interface RawLadder {
  leagueRaw: string
  stateRaw: string
  season: string
  entries: RawLadderEntry[]
  sourceType: DataSourceType
  sourceUrl?: string
  scrapedAt: string
}

export interface RawLadderEntry {
  teamRaw: string
  played: number
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  percentage: number
  points: number
  rank: number
}

// ─── Normalised structures (post-cleaning) ───────────────────────────────────

export interface NormalisedClubRecord {
  clubId: string             // UUID from DB or generated
  clubName: string           // canonical name
  leagueId: string
  season: string
  played: number
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  percentage: number
  recentForm: MatchResult[]  // last 5, most recent last
}

// ─── Ranking engine input / output ───────────────────────────────────────────

export interface RankingWeights {
  winPercentage: number       // 0–1, sum of all weights = 1
  goalsFor: number
  goalsAgainst: number
  percentage: number
  leagueStrength: number
  recentForm: number
  finalsSuccess: number
  strengthOfOpposition: number
  consistency: number
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  winPercentage:        0.25,
  goalsFor:             0.10,
  goalsAgainst:         0.10,
  percentage:           0.15,
  leagueStrength:       0.20,
  recentForm:           0.10,
  finalsSuccess:        0.05,
  strengthOfOpposition: 0.05,
  consistency:          0.10,
}

export interface ClubRankingInput {
  clubId: string
  clubName: string
  leagueId: string
  leagueName: string
  state: AustralianState
  season: string
  played: number
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  percentage: number
  recentForm: MatchResult[]
  leagueStrengthScore: number   // 0–100
  finalsWins: number
  finalsLosses: number
  oppositionRatings: number[]   // power ratings of all defeated opponents
}

export interface ClubRankingOutput {
  clubId: string
  clubName: string
  leagueId: string
  leagueName: string
  state: AustralianState
  powerRating: number           // 0–100
  componentScores: {
    winPercentage: number
    goalsFor: number
    goalsAgainst: number
    percentage: number
    leagueStrength: number
    recentForm: number
    finalsSuccess: number
    strengthOfOpposition: number
    consistency: number
  }
  rank: number
  previousRank: number | null
  rankMovement: number          // positive = moved up
  recentForm: MatchResult[]
  calculatedAt: string          // ISO 8601
  weekLabel: string             // e.g. "2025-W27"
}

// ─── Adapter interface — every data provider must implement this ──────────────

export interface DataAdapter {
  readonly name: string
  readonly sourceType: DataSourceType
  readonly description: string

  /**
   * Test whether this adapter can currently reach its data source.
   */
  ping(): Promise<boolean>

  /**
   * Collect ladder data for all tracked leagues.
   */
  collectLadders(leagueSourceUrls: LeagueSourceUrl[]): Promise<AdapterResult<RawLadder[]>>

  /**
   * Collect individual match results for all tracked leagues.
   */
  collectMatches(leagueSourceUrls: LeagueSourceUrl[]): Promise<AdapterResult<RawMatch[]>>
}

export interface LeagueSourceUrl {
  leagueId: string
  leagueName: string
  state: AustralianState
  sourceType: DataSourceType
  ladderUrl?: string
  fixturesUrl?: string
  season: string
}

export interface AdapterResult<T> {
  status: AdapterStatus
  data: T
  errors: AdapterError[]
  processedAt: string
  sourceType: DataSourceType
  durationMs: number
}

export interface AdapterError {
  leagueId?: string
  sourceUrl?: string
  message: string
  retryable: boolean
  occurredAt: string
}

// ─── Job types ───────────────────────────────────────────────────────────────

export interface WeeklyUpdateJob {
  jobId: string
  triggeredBy: 'CRON' | 'MANUAL' | 'API'
  weekLabel: string
  season: string
  status: JobStatus
  startedAt: string
  completedAt?: string
  stats: {
    leaguesAttempted: number
    leaguesSucceeded: number
    leaguesFailed: number
    clubsProcessed: number
    matchesProcessed: number
    rankingsCalculated: number
    snapshotStored: boolean
  }
  errors: string[]
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiRankingEntry {
  rank: number
  previousRank: number | null
  movement: number
  clubId: string
  clubName: string
  league: string
  state: AustralianState
  powerRating: number
  record: { wins: number; losses: number; draws: number; played: number }
  goalsFor: number
  goalsAgainst: number
  percentage: number
  recentForm: MatchResult[]
  leagueStrength: number    // 1–5 normalised for display
  weekLabel: string
}

export interface ApiRankingsResponse {
  weekLabel: string
  updatedAt: string
  totalClubs: number
  rankings: ApiRankingEntry[]
}

export interface ApiClubProfile {
  clubId: string
  clubName: string
  slug: string
  league: string
  state: AustralianState
  region: string
  logoUrl?: string
  websiteUrl?: string
  currentRank: number
  currentRating: number
  ratingHistory: { weekLabel: string; rank: number; rating: number }[]
  seasonRecord: { wins: number; losses: number; draws: number; played: number }
  goalsFor: number
  goalsAgainst: number
  percentage: number
  recentForm: MatchResult[]
  leagueStrength: number
  cnca: { qualified: boolean; invitationStatus: string | null }
}

export interface ApiLeagueProfile {
  leagueId: string
  leagueName: string
  association: string
  state: AustralianState
  strengthScore: number     // 0–100
  strengthTier: 1 | 2 | 3 | 4 | 5
  currentClubs: number
  averageGoalsPerGame: number
  season: string
}

export interface ApiHistoryResponse {
  clubId: string
  clubName: string
  history: {
    weekLabel: string
    rank: number
    rating: number
    movement: number
  }[]
}
