/**
 * CompetitionDataProvider — a source-agnostic competition data contract (F2).
 * ─────────────────────────────────────────────────────────────────────────────
 * The ingestion engine talks to this interface, never to a specific vendor. The
 * PlayHQ External API is the first implementation (PlayHQProvider); future
 * sources implement the same interface and plug into the registry without
 * touching the ingestion pipeline.
 *
 * Method shapes mirror the PlayHQ resource graph documented in the OpenAPI spec:
 * organisation → seasons → grades/teams → games/ladder, plus per-game summaries
 * (AFL scoring) and venues. Raw* types are the NEUTRAL shapes a provider emits
 * after normalising its own payload; ids are the provider's own ids, mapped to
 * internal records by the ingestion layer.
 */

export type Sport = 'FOOTBALL' | 'NETBALL'

export interface ProviderStatus {
  name: string; configured: boolean; enabled: boolean; message: string
  publicApi?: boolean; partnerApi?: boolean
  tenant?: string | null; organisationId?: string | null; baseUrl?: string | null
}

export interface RawOrganisation { id: string; name: string; type?: string; sport?: string; updatedAt?: string }
export interface RawCompetition  { id: string; name: string; type?: string; organisationId?: string; updatedAt?: string }
export interface RawSeason {
  id: string; name: string; status?: string
  competitionId?: string; competitionName?: string
  associationId?: string; associationName?: string
  updatedAt?: string
}
export interface RawGrade { id: string; name: string; url?: string; updatedAt?: string }
export interface RawTeam  { id: string; name: string; clubId?: string; clubName?: string; gradeId?: string; updatedAt?: string }

export interface RawSurface { id: string; name: string; surfaceType?: string; venueId?: string }
export interface RawVenue {
  id: string; name: string; timezone?: string | null
  state?: string | null; suburb?: string | null
  surfaces: RawSurface[]; updatedAt?: string
}

export interface RawGame {
  id: string; gradeId: string
  roundId?: string | null; roundName?: string | null; round?: number | null; isFinal?: boolean
  poolId?: string | null; poolName?: string | null
  date?: string | null; time?: string | null; timezone?: string | null
  venueId?: string | null; venueName?: string | null; surfaceId?: string | null
  status?: string | null                       // PENDING | FINAL | …
  homeTeamId?: string | null; homeTeamName?: string | null; homeOutcome?: string | null
  awayTeamId?: string | null; awayTeamName?: string | null; awayOutcome?: string | null
  updatedAt?: string | null
}

/** AFL score breakdown for one game (from the v1 game summary). */
export interface RawGameSummary {
  id: string; status?: string | null
  homeGoals: number | null; homeBehinds: number | null; homeTotal: number | null
  awayGoals: number | null; awayBehinds: number | null; awayTotal: number | null
  updatedAt?: string | null
}

export interface RawLadderRow {
  teamId?: string | null; teamName: string; position?: number | null
  played?: number | null; wins?: number | null; losses?: number | null; draws?: number | null
  pointsFor?: number | null; pointsAgainst?: number | null; percentage?: number | null; points?: number | null
}
export interface RawLadder { gradeId: string; poolName?: string | null; rows: RawLadderRow[]; updatedAt?: string }

export interface CompetitionDataProvider {
  readonly name: string
  readonly sport: Sport

  status(): ProviderStatus
  isConfigured(): boolean
  refreshAuth(): Promise<{ refreshed: boolean }>

  // Deprecated global lists (partner/JWT).
  listOrganisations(opts?: { changedSince?: string }): Promise<RawOrganisation[]>
  listCompetitions(opts?: { changedSince?: string }): Promise<RawCompetition[]>
  listVenues(opts?: { changedSince?: string }): Promise<RawVenue[]>

  // Public resource graph (x-api-key + x-phq-tenant).
  listSeasons(organisationId: string): Promise<RawSeason[]>
  listGrades(seasonId: string): Promise<RawGrade[]>
  listTeams(seasonId: string): Promise<RawTeam[]>
  listGamesForGrade(gradeId: string): Promise<{ games: RawGame[]; venues: RawVenue[] }>
  getGameSummary(gameId: string): Promise<RawGameSummary | null>
  getLadders(gradeId: string): Promise<RawLadder[]>
}

/** Thrown by a provider when it is called without valid credentials. */
export class ProviderDisabledError extends Error {
  readonly code = 'PROVIDER_DISABLED'
  constructor(message: string) { super(message); this.name = 'ProviderDisabledError' }
}
