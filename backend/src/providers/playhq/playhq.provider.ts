/**
 * PlayHQProvider (Phase F1) — CompetitionDataProvider over the PlayHQ API.
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the source-agnostic provider contract against PlayHQ's public/
 * external API. Endpoint paths follow PlayHQ's documented resource layout; each
 * method normalises the raw payload into the neutral Raw* shapes the ingestion
 * engine consumes. Football-first, but the interface stays sport-neutral.
 *
 * All methods delegate to PlayhqClient, which throws ProviderDisabledError when
 * credentials are absent — so a missing key degrades to a clear admin error
 * rather than a crash.
 */

import { PlayhqClient } from './client.js'
import { getPlayhqConfig, playhqPublicStatus, PLAYHQ_CREDENTIALS_MISSING } from './config.js'
import type {
  CompetitionDataProvider, ProviderStatus, RawOrganisation, RawAssociation, RawCompetition,
  RawSeason, RawGrade, RawClub, RawTeam, RawGame, RawLadder, RawLadderRow,
} from '../competition-provider.js'

const str = (v: unknown): string | undefined => (v == null ? undefined : String(v))
const num = (v: unknown): number | null => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null }

export class PlayHQProvider implements CompetitionDataProvider {
  readonly name = 'PlayHQ'
  readonly sport = 'FOOTBALL' as const
  private readonly client = new PlayhqClient()

  isConfigured(): boolean { return this.client.isConfigured() }

  status(): ProviderStatus {
    const s = playhqPublicStatus()
    return { name: this.name, configured: s.configured, enabled: s.enabled, message: s.configured ? s.message : PLAYHQ_CREDENTIALS_MISSING, tenant: s.tenant, organisationId: s.organisationId, baseUrl: s.baseUrl }
  }

  async listOrganisations(): Promise<RawOrganisation[]> {
    const cfg = getPlayhqConfig()
    // If a single org is pinned by env, return just that org (multi-org ready).
    if (cfg?.organisationId) {
      const one = await this.getOrganisation(cfg.organisationId)
      return one ? [one] : []
    }
    const rows = await this.client.getAll<Record<string, unknown>>('organisations')
    return rows.map(o => ({ id: String(o.id), name: String(o.name ?? ''), sport: str(o.sport), tenant: str(o.tenant), updatedAt: str(o.updatedAt) }))
  }

  async getOrganisation(orgId: string): Promise<RawOrganisation | null> {
    const o = await this.client.get<Record<string, unknown>>(`organisations/${orgId}`)
    if (!o) return null
    return { id: String(o.id ?? orgId), name: String(o.name ?? ''), sport: str(o.sport), tenant: str(o.tenant), updatedAt: str(o.updatedAt) }
  }

  async listAssociations(orgId: string): Promise<RawAssociation[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`organisations/${orgId}/associations`)
    return rows.map(a => ({ id: String(a.id), name: String(a.name ?? ''), organisationId: orgId, updatedAt: str(a.updatedAt) }))
  }

  async listCompetitions(orgId: string): Promise<RawCompetition[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`organisations/${orgId}/competitions`)
    return rows.map(c => ({ id: String(c.id), name: String(c.name ?? ''), sport: str(c.sport), associationId: str(c.associationId), organisationId: orgId, season: str(c.season), updatedAt: str(c.updatedAt) }))
  }

  async listSeasons(competitionId: string): Promise<RawSeason[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`competitions/${competitionId}/seasons`)
    return rows.map(s => ({ id: String(s.id), name: String(s.name ?? ''), competitionId, status: str(s.status), updatedAt: str(s.updatedAt) }))
  }

  async listGrades(seasonId: string): Promise<RawGrade[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`seasons/${seasonId}/grades`)
    return rows.map(g => ({ id: String(g.id), name: String(g.name ?? ''), seasonId, competitionId: str(g.competitionId), updatedAt: str(g.updatedAt) }))
  }

  async listClubs(orgId: string): Promise<RawClub[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`organisations/${orgId}/clubs`)
    return rows.map(c => ({ id: String(c.id), name: String(c.name ?? ''), organisationId: orgId, state: str(c.state), updatedAt: str(c.updatedAt) }))
  }

  async listTeams(gradeId: string): Promise<RawTeam[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`grades/${gradeId}/teams`)
    return rows.map(t => ({ id: String(t.id), name: String(t.name ?? ''), clubId: str(t.clubId), gradeId, updatedAt: str(t.updatedAt) }))
  }

  async listGames(gradeId: string, opts: { seasonId?: string } = {}): Promise<RawGame[]> {
    const rows = await this.client.getAll<Record<string, unknown>>(`grades/${gradeId}/games`, { seasonId: opts.seasonId })
    return rows.map(g => this.normaliseGame(g, gradeId, opts.seasonId))
  }

  async getLadder(gradeId: string, opts: { seasonId?: string } = {}): Promise<RawLadder | null> {
    const body = await this.client.get<Record<string, unknown>>(`grades/${gradeId}/ladder`, { seasonId: opts.seasonId })
    if (!body) return null
    const raw = (body.data ?? body.ladder ?? body.rows ?? []) as Record<string, unknown>[]
    const rows: RawLadderRow[] = (Array.isArray(raw) ? raw : []).map(r => ({
      teamId: str(r.teamId) ?? null, teamName: String(r.teamName ?? r.name ?? ''), position: num(r.position ?? r.rank),
      played: num(r.played), wins: num(r.wins), losses: num(r.losses), draws: num(r.draws),
      pointsFor: num(r.pointsFor ?? r.for), pointsAgainst: num(r.pointsAgainst ?? r.against),
      percentage: num(r.percentage), points: num(r.points ?? r.competitionPoints),
    }))
    return { gradeId, seasonId: opts.seasonId, rows, updatedAt: str(body.updatedAt) }
  }

  private normaliseGame(g: Record<string, unknown>, gradeId: string, seasonId?: string): RawGame {
    const home = (g.home ?? g.homeTeam ?? {}) as Record<string, unknown>
    const away = (g.away ?? g.awayTeam ?? {}) as Record<string, unknown>
    const umps = Array.isArray(g.umpires) ? (g.umpires as unknown[]).map(u => (typeof u === 'string' ? u : String((u as Record<string, unknown>)?.name ?? ''))).filter(Boolean) : null
    return {
      id: String(g.id), gradeId, seasonId, round: num(g.round), roundName: str(g.roundName) ?? null,
      date: str(g.date ?? g.startDate) ?? null, time: str(g.time) ?? null,
      venue: str(typeof g.venue === 'object' && g.venue ? (g.venue as Record<string, unknown>).name : g.venue) ?? null, ground: str(g.ground) ?? null,
      status: str(g.status) ?? null,
      homeTeamId: str(home.id ?? g.homeTeamId) ?? null, homeTeamName: str(home.name ?? g.homeTeamName) ?? null,
      awayTeamId: str(away.id ?? g.awayTeamId) ?? null, awayTeamName: str(away.name ?? g.awayTeamName) ?? null,
      homeGoals: num(home.goals ?? g.homeGoals), homeBehinds: num(home.behinds ?? g.homeBehinds), homeScore: num(home.score ?? g.homeScore),
      awayGoals: num(away.goals ?? g.awayGoals), awayBehinds: num(away.behinds ?? g.awayBehinds), awayScore: num(away.score ?? g.awayScore),
      umpires: umps, updatedAt: str(g.updatedAt) ?? null,
    }
  }
}
