/**
 * CompetitionDataProvider — a source-agnostic competition data contract.
 * ─────────────────────────────────────────────────────────────────────────────
 * The ingestion engine talks to this interface, never to a specific vendor. The
 * PlayHQ Football API is the first implementation (PlayHQProvider); future
 * sources (another API, or manual/CSV backends) implement the same interface and
 * plug into the registry without touching the ingestion pipeline.
 *
 * Everything here is provider-neutral. Raw* types describe the external shape
 * AFTER a provider has normalised its own payload — ids are the provider's own
 * ids (e.g. PlayHQ ids), which the ingestion layer maps to internal records via
 * the PlayhqEntityMap table.
 */

export type Sport = 'FOOTBALL' | 'NETBALL'

export interface ProviderStatus {
  name: string
  configured: boolean
  enabled: boolean
  message: string          // human-readable — e.g. "PlayHQ credentials not configured."
  tenant?: string | null
  organisationId?: string | null
  baseUrl?: string | null
}

export interface RawOrganisation { id: string; name: string; sport?: string; tenant?: string; updatedAt?: string }
export interface RawAssociation  { id: string; name: string; organisationId?: string; updatedAt?: string }
export interface RawCompetition  { id: string; name: string; sport?: string; associationId?: string; organisationId?: string; season?: string; updatedAt?: string }
export interface RawSeason       { id: string; name: string; competitionId?: string; status?: string; updatedAt?: string }
export interface RawGrade        { id: string; name: string; competitionId?: string; seasonId?: string; updatedAt?: string }
export interface RawClub         { id: string; name: string; organisationId?: string; state?: string; updatedAt?: string }
export interface RawTeam         { id: string; name: string; clubId?: string; gradeId?: string; updatedAt?: string }

export interface RawGame {
  id: string
  gradeId?: string
  seasonId?: string
  round?: number | null
  roundName?: string | null
  date?: string | null
  time?: string | null
  venue?: string | null
  ground?: string | null
  status?: string | null           // UPCOMING | FINAL | …
  homeTeamId?: string | null
  homeTeamName?: string | null
  awayTeamId?: string | null
  awayTeamName?: string | null
  // Australian-football scoring (all optional — missing handled safely)
  homeGoals?: number | null
  homeBehinds?: number | null
  homeScore?: number | null        // total points if provided directly
  awayGoals?: number | null
  awayBehinds?: number | null
  awayScore?: number | null
  umpires?: string[] | null        // public data only
  updatedAt?: string | null
}

export interface RawLadderRow {
  teamId?: string | null
  teamName: string
  position?: number | null
  played?: number | null
  wins?: number | null
  losses?: number | null
  draws?: number | null
  pointsFor?: number | null
  pointsAgainst?: number | null
  percentage?: number | null
  points?: number | null           // competition/ladder points
}
export interface RawLadder { gradeId: string; seasonId?: string; rows: RawLadderRow[]; updatedAt?: string }

/**
 * Source-agnostic competition data provider. All methods must fail gracefully
 * (throw a ProviderDisabledError) when the provider is not configured — callers
 * translate that into a clear admin message and a DISABLED sync log.
 */
export interface CompetitionDataProvider {
  readonly name: string
  readonly sport: Sport

  status(): ProviderStatus
  isConfigured(): boolean

  listOrganisations(): Promise<RawOrganisation[]>
  getOrganisation(orgId: string): Promise<RawOrganisation | null>
  listAssociations(orgId: string): Promise<RawAssociation[]>
  listCompetitions(orgId: string): Promise<RawCompetition[]>
  listSeasons(competitionId: string): Promise<RawSeason[]>
  listGrades(seasonId: string): Promise<RawGrade[]>
  listClubs(orgId: string): Promise<RawClub[]>
  listTeams(gradeId: string): Promise<RawTeam[]>
  listGames(gradeId: string, opts?: { seasonId?: string }): Promise<RawGame[]>
  getLadder(gradeId: string, opts?: { seasonId?: string }): Promise<RawLadder | null>
}

/** Thrown by a provider when it is called without valid credentials. */
export class ProviderDisabledError extends Error {
  readonly code = 'PROVIDER_DISABLED'
  constructor(message: string) { super(message); this.name = 'ProviderDisabledError' }
}
