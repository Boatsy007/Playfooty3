/**
 * PlayHQProvider (Phase F2) — CompetitionDataProvider over the PlayHQ API,
 * implemented directly from the official OpenAPI specification.
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint map (from the spec):
 *   public  GET /v1/organisations/{id}/seasons     → seasons (competition+assoc)
 *   public  GET /v1/seasons/{id}/grades            → grades
 *   public  GET /v1/seasons/{id}/teams             → teams
 *   public  GET /v2/grades/{id}/games              → rounds/games/venues/surfaces
 *   public  GET /v1/games/{id}/summary             → AFL goals/behinds/total
 *   public  GET /v2/grades/{id}/ladder             → dynamic headers/standings
 *   partner GET /organisations | /competitions | /venues (deprecated, JWT)
 * Public endpoints use cursor pagination; deprecated use page pagination.
 */

import { PlayhqClient } from './client.js'
import { playhqPublicStatus, PLAYHQ_CREDENTIALS_MISSING } from './config.js'
import { aflScore, type PhqOrganisation, type PhqCompetition, type PhqSeason, type PhqGrade, type PhqTeam, type PhqVenue, type PhqGradeFixture, type PhqFixtureGame, type PhqGameSummary, type PhqGradeLadder, type PhqLadderPool } from './types.js'
import type {
  CompetitionDataProvider, ProviderStatus, RawOrganisation, RawCompetition, RawSeason, RawGrade,
  RawTeam, RawVenue, RawGame, RawGameSummary, RawLadder, RawLadderRow, RawSurface,
} from '../competition-provider.js'

const s = (v: unknown): string | undefined => (v == null ? undefined : String(v))
const roundNumber = (name?: string | null): number | null => { const m = /(\d+)/.exec(name ?? ''); return m ? parseInt(m[1], 10) : null }

export class PlayHQProvider implements CompetitionDataProvider {
  readonly name = 'PlayHQ'
  readonly sport = 'FOOTBALL' as const
  private readonly client = new PlayhqClient()

  isConfigured(): boolean { return this.client.isConfigured() }
  refreshAuth() { return this.client.refreshAuth() }

  status(): ProviderStatus {
    const p = playhqPublicStatus()
    return { name: this.name, configured: p.configured, enabled: p.enabled, message: p.configured ? p.message : PLAYHQ_CREDENTIALS_MISSING, publicApi: p.publicApi, partnerApi: p.partnerApi, tenant: p.tenant, organisationId: p.organisationId, baseUrl: p.baseUrl }
  }

  // ── Deprecated global lists (partner / JWT, page pagination) ────────────────
  async listOrganisations(opts: { changedSince?: string } = {}): Promise<RawOrganisation[]> {
    const rows = await this.client.getAllPaged<PhqOrganisation>('organisations', b => (((b.data as Record<string, unknown>)?.organisations ?? []) as PhqOrganisation[]), { mode: 'partner', query: { changedSince: opts.changedSince } })
    return rows.map(o => ({ id: o.id, name: o.name, type: o.type, updatedAt: o.updatedAt }))
  }
  async listCompetitions(opts: { changedSince?: string } = {}): Promise<RawCompetition[]> {
    const rows = await this.client.getAllPaged<PhqCompetition>('competitions', b => (((b.data as Record<string, unknown>)?.competitions ?? []) as PhqCompetition[]), { mode: 'partner', query: { changedSince: opts.changedSince } })
    return rows.map(c => ({ id: c.id, name: c.name, type: c.type, organisationId: c.organisationId, updatedAt: c.updatedAt }))
  }
  async listVenues(opts: { changedSince?: string } = {}): Promise<RawVenue[]> {
    const rows = await this.client.getAllPaged<PhqVenue>('venues', b => (((b.data as Record<string, unknown>)?.venues ?? []) as PhqVenue[]), { mode: 'partner', query: { changedSince: opts.changedSince } })
    return rows.map(v => this.venue(v))
  }

  // ── Public resource graph (x-api-key, cursor pagination) ────────────────────
  async listSeasons(organisationId: string): Promise<RawSeason[]> {
    const rows = await this.client.getAllCursor<PhqSeason>(`v1/organisations/${organisationId}/seasons`, b => ((b.data ?? []) as PhqSeason[]))
    return rows.map(x => ({ id: x.id, name: x.name, status: x.status, competitionId: x.competition?.id, competitionName: x.competition?.name, associationId: x.association?.id, associationName: x.association?.name, updatedAt: x.updatedAt }))
  }
  async listGrades(seasonId: string): Promise<RawGrade[]> {
    const rows = await this.client.getAllCursor<PhqGrade>(`v1/seasons/${seasonId}/grades`, b => ((b.data ?? []) as PhqGrade[]))
    return rows.map(g => ({ id: g.id, name: g.name, url: g.url, updatedAt: g.updatedAt }))
  }
  async listTeams(seasonId: string): Promise<RawTeam[]> {
    const rows = await this.client.getAllCursor<PhqTeam>(`v1/seasons/${seasonId}/teams`, b => ((b.data ?? []) as PhqTeam[]))
    return rows.map(t => ({ id: t.id, name: t.name, clubId: t.club?.id, clubName: t.club?.name, gradeId: t.grade?.id, updatedAt: t.updatedAt }))
  }

  async listGamesForGrade(gradeId: string): Promise<{ games: RawGame[]; venues: RawVenue[] }> {
    // v2 grade games returns a fixture object per page: { rounds, teams, playingSurfaces }.
    const pages = await this.client.getAllCursor<PhqGradeFixture>(`v2/grades/${gradeId}/games`, b => [b as unknown as PhqGradeFixture])
    const teamNames = new Map<string, string>()
    const surfaceToVenue = new Map<string, { venueId?: string; venueName?: string }>()
    const venues = new Map<string, RawVenue>()
    for (const pg of pages) {
      for (const t of pg.teams ?? []) if (t.id) teamNames.set(t.id, t.name)
      for (const ps of pg.playingSurfaces ?? []) {
        if (ps.venue) { const v = this.venue(ps.venue); venues.set(v.id, v); surfaceToVenue.set(ps.id, { venueId: v.id, venueName: v.name }) }
      }
    }
    const games: RawGame[] = []
    for (const pg of pages) for (const round of pg.rounds ?? []) for (const g of round.games ?? []) {
      games.push(this.game(g, gradeId, round, teamNames, surfaceToVenue))
    }
    return { games, venues: [...venues.values()] }
  }

  async getGameSummary(gameId: string): Promise<RawGameSummary | null> {
    // AFL scoring lives in the v1 (territory) game summary, not v2.
    const body = await this.client.get<Record<string, unknown>>(`v1/games/${gameId}/summary`)
    if (!body) return null
    const g = ((body.data ?? body) as PhqGameSummary)
    const teams = g.teams ?? []
    const home = teams.find(t => t.isHomeTeam === true)
    const away = teams.find(t => t.isHomeTeam === false)
    const h = aflScore(home), a = aflScore(away)
    return { id: gameId, status: g.status ?? null, homeGoals: h.goals, homeBehinds: h.behinds, homeTotal: h.total, awayGoals: a.goals, awayBehinds: a.behinds, awayTotal: a.total, updatedAt: g.updatedAt ?? null }
  }

  async getLadders(gradeId: string): Promise<RawLadder[]> {
    const body = await this.client.get<PhqGradeLadder>(`v2/grades/${gradeId}/ladder`)
    if (!body || !Array.isArray(body.ladders)) return []
    return body.ladders.map(pool => this.ladder(gradeId, pool))
  }

  // ── Normalisers ─────────────────────────────────────────────────────────────
  private venue(v: PhqVenue): RawVenue {
    const surfaces: RawSurface[] = (v.playingSurfaces ?? []).map(ps => ({ id: ps.id, name: ps.name, surfaceType: ps.surfaceType, venueId: v.id }))
    return { id: v.id, name: v.name, timezone: v.timezone ?? null, state: s(v.address?.state) ?? null, suburb: s(v.address?.suburb) ?? null, surfaces, updatedAt: v.updatedAt }
  }

  private game(g: PhqFixtureGame, gradeId: string, round: { id: string; name?: string; isFinalRound?: boolean }, teamNames: Map<string, string>, surfaceToVenue: Map<string, { venueId?: string; venueName?: string }>): RawGame {
    const home = g.teams?.find(t => t.isHomeTeam === true)
    const away = g.teams?.find(t => t.isHomeTeam === false)
    const sched = g.schedule?.[0]
    const surf = sched?.playingSurfaceId ? surfaceToVenue.get(sched.playingSurfaceId) : undefined
    return {
      id: g.id, gradeId, roundId: round.id, roundName: round.name ?? null, round: roundNumber(round.name), isFinal: !!round.isFinalRound,
      poolId: g.pool?.id ?? null, poolName: g.pool?.name ?? null,
      date: sched?.dateTime ?? null, time: null, timezone: null,
      venueId: surf?.venueId ?? null, venueName: surf?.venueName ?? null, surfaceId: sched?.playingSurfaceId ?? null,
      status: g.status ?? null,
      homeTeamId: home?.id ?? null, homeTeamName: home?.id ? (teamNames.get(home.id) ?? null) : null, homeOutcome: home?.outcome ?? null,
      awayTeamId: away?.id ?? null, awayTeamName: away?.id ? (teamNames.get(away.id) ?? null) : null, awayOutcome: away?.outcome ?? null,
      updatedAt: g.updatedAt ?? null,
    }
  }

  private ladder(gradeId: string, pool: PhqLadderPool): RawLadder {
    const idx = new Map<string, number>()
    pool.headers.forEach((h, i) => idx.set(h.key.toLowerCase(), i))
    const get = (row: (number | string | null)[], keys: string[]): number | null => {
      for (const k of keys) { const i = idx.get(k.toLowerCase()); if (i != null) { const v = row[i]; const num = typeof v === 'number' ? v : Number(v); if (Number.isFinite(num)) return num } }
      return null
    }
    const rows: RawLadderRow[] = pool.standings.map((st, i) => ({
      teamId: st.team?.id ?? null, teamName: st.team?.name ?? '', position: i + 1,
      played: get(st.values, ['played', 'p']),
      wins: get(st.values, ['won', 'wins', 'w']),
      losses: get(st.values, ['lost', 'losses', 'l']),
      draws: get(st.values, ['drawn', 'draws', 'd']),
      pointsFor: get(st.values, ['pointsFor', 'for', 'pf', 'scoreFor']),
      pointsAgainst: get(st.values, ['pointsAgainst', 'against', 'pa', 'scoreAgainst']),
      percentage: get(st.values, ['percentage', 'percent', '%', 'pct']),
      points: get(st.values, ['points', 'pts', 'competitionPoints', 'pointsTotal']),
    }))
    return { gradeId, poolName: pool.pool?.name ?? null, rows, updatedAt: undefined }
  }
}
