/**
 * PlayHQ External API — TypeScript interfaces generated from the official
 * OpenAPI specification (Phase F2). SINGLE SOURCE OF TRUTH.
 * ─────────────────────────────────────────────────────────────────────────────
 * These mirror the documented response shapes. Only the fields the football
 * ingestion needs are typed strictly; unknown extras are permitted. Player
 * registrations / payments / private data are intentionally NOT modelled — the
 * ingestion never reads them.
 */

// ── Envelopes / pagination ────────────────────────────────────────────────────
/** Modern v1/v2 cursor pagination: metadata.hasMore + metadata.nextCursor. */
export interface CursorMeta { hasMore?: boolean; nextCursor?: string | null }
/** Deprecated page pagination: metadata.page / totalPages / totalRecords. */
export interface PageMeta { page?: number; totalPages?: number; totalRecords?: number }

export interface JwtResponse { access_token: string; exp: number }

// ── Common ────────────────────────────────────────────────────────────────────
export interface PhqAddress { line1?: string | null; suburb?: string | null; postcode?: string | number | null; state?: string | null; country?: string | null; latitude?: string | number | null; longitude?: string | number | null }
export interface PhqRef { id: string; name: string; url?: string }

// ── Organisations (deprecated list, JWT) ──────────────────────────────────────
export interface PhqOrganisation {
  id: string; name: string; nickname?: string; logoName?: string; type?: string // CLUB | ASSOCIATION | ADMINISTRATIVE_BODY
  taxStatus?: string; visible?: boolean; routingCode?: string; createdAt?: string; updatedAt?: string
  address?: PhqAddress; contact?: Record<string, unknown>
}

// ── Competitions (deprecated list, JWT) ───────────────────────────────────────
export interface PhqCompetition { id: string; name: string; type?: string; visible?: boolean; routingCode?: string; organisationId?: string; createdAt?: string; updatedAt?: string }

// ── Seasons (public, /v1/organisations/{id}/seasons) ──────────────────────────
export interface PhqSeason {
  id: string; name: string; status?: string // ACTIVE | …
  association?: PhqRef; competition?: PhqRef; logo?: unknown
  createdAt?: string; updatedAt?: string
}

// ── Grades (public, /v1/seasons/{id}/grades) ──────────────────────────────────
export interface PhqGrade { id: string; name: string; url?: string; createdAt?: string; updatedAt?: string }

// ── Teams (public, /v1/seasons/{id}/teams) ────────────────────────────────────
export interface PhqTeam { id: string; name: string; club?: PhqRef; grade?: PhqRef; createdAt?: string; updatedAt?: string }

// ── Games / fixtures (public v2, /v2/grades/{id}/games) ───────────────────────
export interface PhqPlayingSurface { id: string; name: string; abbreviatedName?: string; surfaceType?: string; longitude?: number; latitude?: number; venue?: PhqVenue }
export interface PhqVenue { id: string; name: string; abbreviatedName?: string; timezone?: string; address?: PhqAddress; contact?: Record<string, unknown>; playingSurfaces?: PhqPlayingSurface[]; createdAt?: string; updatedAt?: string }
export interface PhqScheduleEntry { day?: number | null; dateTime?: string | null; playingSurfaceId?: string | null }
export interface PhqGameTeamRef { id: string; isHomeTeam?: boolean; outcome?: string | null } // WON | LOST | DRAW | WON_BY_* …
export interface PhqFixtureGame {
  id: string; status?: string; type?: string; url?: string; createdAt?: string; updatedAt?: string
  pool?: PhqRef | null
  schedule?: PhqScheduleEntry[]
  teams?: PhqGameTeamRef[]
  periods?: unknown
  match?: unknown
}
export interface PhqRound { id: string; name?: string; abbreviatedName?: string; isFinalRound?: boolean; byes?: { teamID: string }[]; games?: PhqFixtureGame[] }
export interface PhqGradeFixture { rounds?: PhqRound[]; teams?: PhqRef[]; playingSurfaces?: PhqPlayingSurface[] }

// ── Ladder (public v2, /v2/grades/{id}/ladder) — dynamic columns ──────────────
export interface PhqLadderHeader { key: string; name?: string; shortName?: string }
export interface PhqLadderStanding { team: PhqRef; values: (number | string | null)[] }
export interface PhqLadderPool { headers: PhqLadderHeader[]; pool?: PhqRef | null; standings: PhqLadderStanding[]; type?: string }
export interface PhqGradeLadder { gradeId?: string; ladders: PhqLadderPool[] }

// ── Game summary (public v1, /v1/games/{id}/summary) — AFL scoring ────────────
export interface PhqScoreSubTotal { type: string; value: number } // TOTAL_GOALS | TOTAL_BEHINDS | 6_POINT_SCORE | 1_POINT_SCORE
export interface PhqSummaryTeam {
  id?: string; name?: string; isHomeTeam?: boolean; outcome?: string | null
  scoreTotal?: number | null
  scoreSubTotal?: PhqScoreSubTotal[]
  club?: PhqRef
}
export interface PhqGameSummary {
  id?: string; status?: string; type?: string
  matchDayNumber?: { name?: string; sequenceNo?: string }
  teams?: PhqSummaryTeam[]
  periods?: unknown
  venue?: PhqVenue
  playingSurface?: PhqPlayingSurface
  createdAt?: string; updatedAt?: string
}

/** Extract an AFL team's goals/behinds/total from a summary team block. */
export function aflScore(team: PhqSummaryTeam | undefined): { goals: number | null; behinds: number | null; total: number | null } {
  if (!team) return { goals: null, behinds: null, total: null }
  const sub = team.scoreSubTotal ?? []
  const find = (t: string) => { const v = sub.find(s => s.type === t)?.value; return typeof v === 'number' ? v : null }
  return { goals: find('TOTAL_GOALS'), behinds: find('TOTAL_BEHINDS'), total: typeof team.scoreTotal === 'number' ? team.scoreTotal : null }
}
