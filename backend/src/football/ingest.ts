/**
 * PlayHQ Football ingestion pipeline (Phase F2) — spec-accurate.
 * ─────────────────────────────────────────────────────────────────────────────
 * Source-agnostic ingestion over the CompetitionDataProvider, following the real
 * PlayHQ resource graph: organisation → seasons (competition/association) →
 * grades/teams → games (fixtures) → per-game AFL summary (results) → ladder.
 * Writes the SHARED platform models with sport=FOOTBALL; netball untouched.
 * Idempotent via PlayhqEntityMap + playhqGameId; uncertain rows raise review
 * items; every operation is logged (PlayhqSyncLog) and audited. Fails gracefully
 * with "PlayHQ credentials not configured." when no credentials are present.
 */

import { prisma } from '../db/client.js'
import { getPlayhqProvider } from '../providers/registry.js'
import { PLAYHQ_CREDENTIALS_MISSING, playhqPublicStatus } from '../providers/playhq/config.js'
import type { RawGame, RawGrade, RawVenue } from '../providers/competition-provider.js'
import { mapUpsert, getMappedInternalId, logSync, slugify, resolveStateId } from './mapping.js'
import { resolveScore } from './scoring.js'
import { createUploadedLadder } from '../ladder/ladders.service.js'
import { resultDedupeKey } from '../results/results.service.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

const SPORT = 'FOOTBALL'
const provider = () => getPlayhqProvider()

interface Ctx { leagueId: string; leagueName: string; season: string; grade: string; seasonId?: string; tenant?: string | null; organisationId?: string | null; createdBy?: string }
export interface FootballResult { ok: boolean; message?: string; counts?: Record<string, number>; warnings?: string[]; data?: unknown }

function disabled(operation: string, createdBy?: string): Promise<FootballResult> {
  return logSync({ operation, status: 'DISABLED', message: PLAYHQ_CREDENTIALS_MISSING, createdBy }).then(() => ({ ok: false, message: PLAYHQ_CREDENTIALS_MISSING }))
}
async function raiseReview(kind: string, reason: string, payload: unknown, confidence = 0.3) {
  await prisma.reviewItem.create({ data: { entityType: 'League', kind, reason, confidence, payload: JSON.stringify(payload) } }).catch(() => {})
}

// ── Status / logs / health ──────────────────────────────────────────────────
export function getFootballStatus() {
  const p = provider()
  return { provider: p.name, sport: p.sport, ...playhqPublicStatus() }
}
export async function getHealth() {
  const p = provider()
  const st = playhqPublicStatus()
  if (!p.isConfigured()) return { ok: false, ...st }
  // Cheapest authenticated probe: refresh auth (JWT) or confirm public config.
  let reachable = true, detail: string | undefined
  try { if (st.partnerApi) await p.refreshAuth() } catch (e) { reachable = false; detail = String(e) }
  return { ok: reachable, reachable, detail, ...st }
}
export async function getSyncLogs(limit = 50) {
  return prisma.playhqSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) })
}
export async function refreshAuth(createdBy?: string): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('REFRESH', createdBy)
  try { const r = await p.refreshAuth(); await logSync({ operation: 'REFRESH', status: 'OK', message: r.refreshed ? 'JWT refreshed' : 'no JWT auth configured', createdBy }); return { ok: true, data: r } }
  catch (e) { await logSync({ operation: 'REFRESH', status: 'ERROR', message: String(e), createdBy }); return { ok: false, message: String(e) } }
}

// ── Venues ────────────────────────────────────────────────────────────────────
async function importVenues(venues: RawVenue[], ctx?: { tenant?: string | null; organisationId?: string | null }) {
  for (const v of venues) {
    await mapUpsert('VENUE', v.id, { name: v.name, internalType: 'Venue', sport: SPORT, tenant: ctx?.tenant, organisationId: ctx?.organisationId, payload: v })
    for (const su of v.surfaces) await mapUpsert('SURFACE', su.id, { name: su.name, parentPlayhqId: v.id, internalType: 'Surface', sport: SPORT })
  }
}

// ── Discovery ─────────────────────────────────────────────────────────────────
export async function discover(opts: { organisationId?: string; createdBy?: string } = {}): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('DISCOVER', opts.createdBy)
  const started = Date.now()
  const counts = { organisations: 0, seasons: 0, competitions: 0, grades: 0 }
  const orgId = opts.organisationId ?? playhqPublicStatus().organisationId ?? undefined
  if (!orgId) { await logSync({ operation: 'DISCOVER', status: 'SKIPPED', message: 'no organisationId (set PLAYHQ_ORGANISATION_ID or pass organisationId)', createdBy: opts.createdBy }); return { ok: false, message: 'organisationId required for public discovery' } }
  try {
    await mapUpsert('ORGANISATION', orgId, { organisationId: orgId, sport: SPORT })
    counts.organisations++
    const seasons = await p.listSeasons(orgId)
    const tree: unknown[] = []
    for (const s of seasons) {
      counts.seasons++
      await mapUpsert('SEASON', s.id, { name: s.name, organisationId: orgId, parentPlayhqId: s.competitionId ?? orgId, sport: SPORT, payload: s })
      if (s.competitionId) { counts.competitions++; await mapUpsert('COMPETITION', s.competitionId, { name: s.competitionName, organisationId: orgId, parentPlayhqId: orgId, sport: SPORT }) }
      const grades = await p.listGrades(s.id)
      for (const g of grades) { counts.grades++; await mapUpsert('GRADE', g.id, { name: g.name, organisationId: orgId, parentPlayhqId: s.id, sport: SPORT, payload: g }) }
      tree.push({ seasonId: s.id, name: s.name, competition: s.competitionName, association: s.associationName, grades: grades.map(g => ({ id: g.id, name: g.name })) })
    }
    await logSync({ operation: 'DISCOVER', status: 'OK', organisationId: orgId, counts, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts, data: { organisationId: orgId, seasons: tree } }
  } catch (e) {
    await logSync({ operation: 'DISCOVER', status: 'ERROR', organisationId: orgId, message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

export async function importOrganisation(organisationId: string, createdBy?: string): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('IMPORT_ORGANISATION', createdBy)
  await mapUpsert('ORGANISATION', organisationId, { organisationId, sport: SPORT })
  await logSync({ operation: 'IMPORT_ORGANISATION', status: 'OK', playhqId: organisationId, createdBy })
  return { ok: true, data: { organisationId } }
}

// ── League (grade → internal League) ──────────────────────────────────────────
async function importGradeAsLeague(grade: RawGrade, seasonName: string, meta: { organisationId?: string | null; competitionId?: string | null; seasonId?: string | null; tenant?: string | null; stateId?: string | null; createdBy?: string }): Promise<{ leagueId: string; leagueName: string } | { needsReview: true }> {
  const existingId = await getMappedInternalId('GRADE', grade.id)
  const leagueName = grade.name
  if (existingId) {
    await prisma.league.update({ where: { id: existingId }, data: { name: leagueName, sport: SPORT, playhqGradeId: grade.id, playhqGradeName: leagueName, playhqSeasonId: meta.seasonId ?? null, playhqCompetitionId: meta.competitionId ?? null, playhqOrganisationId: meta.organisationId ?? null, currentSeason: seasonName, ladderUrl: grade.url ?? null, lastSyncedAt: new Date() } }).catch(() => {})
    return { leagueId: existingId, leagueName }
  }
  const stateId = await resolveStateId(meta.stateId)
  if (!stateId) { await raiseReview('UNSUPPORTED_GRADE', `No state available to place football league "${leagueName}"`, { gradeId: grade.id, leagueName }, 0.2); return { needsReview: true } }
  const league = await prisma.league.create({ data: {
    name: leagueName, stateId, sport: SPORT, isActive: true, primarySource: 'PLAYHQ', importType: 'AUTO', autoDiscovered: true,
    playhqGradeId: grade.id, playhqGradeName: leagueName, playhqSeasonId: meta.seasonId ?? null, playhqCompetitionId: meta.competitionId ?? null, playhqOrganisationId: meta.organisationId ?? null, currentSeason: seasonName, ladderUrl: grade.url ?? null, lastSyncedAt: new Date(),
  } })
  await mapUpsert('GRADE', grade.id, { name: leagueName, organisationId: meta.organisationId, parentPlayhqId: meta.seasonId, internalId: league.id, internalType: 'League', sport: SPORT, tenant: meta.tenant })
  await logQualityAction('PLAYHQ_IMPORT_LEAGUE', 'League', league.id, { playhqGradeId: grade.id, leagueName }, { reason: 'football league imported from PlayHQ', performedBy: meta.createdBy })
  return { leagueId: league.id, leagueName }
}

async function ensureFootballClub(teamId: string | null, teamName: string, ctx: Ctx): Promise<string | null> {
  if (!teamName) return null
  if (teamId) { const mapped = await getMappedInternalId('TEAM', teamId); if (mapped) { await ensureMembership(mapped, ctx); return mapped } }
  let club = await prisma.club.findFirst({ where: { name: { equals: teamName, mode: 'insensitive' }, sport: SPORT, archivedAt: null }, select: { id: true } }).catch(() => null)
  if (!club) {
    const stateId = await resolveStateId(null)
    if (!stateId) { await raiseReview('UNKNOWN_CLUB', `No state available to create football club "${teamName}"`, { teamName }, 0.2); return null }
    let slug = slugify(teamName); let i = 1
    while (await prisma.club.findUnique({ where: { slug }, select: { id: true } }).catch(() => null)) { slug = `${slugify(teamName)}-afl${i > 1 ? i : ''}`; i++; if (i > 50) break }
    club = await prisma.club.create({ data: { name: teamName, slug, stateId, sport: SPORT, source: 'PLAYHQ', playhqClubId: teamId ?? null, isActive: true, approvalStatus: 'APPROVED' }, select: { id: true } })
    await raiseReview('DUPLICATE_CLUB', `New football club "${teamName}" created from PlayHQ — confirm it is not a duplicate.`, { clubId: club.id, teamName }, 0.5)
  }
  if (teamId) await mapUpsert('TEAM', teamId, { name: teamName, internalId: club.id, internalType: 'Club', parentPlayhqId: ctx.leagueId, sport: SPORT, tenant: ctx.tenant, organisationId: ctx.organisationId })
  await ensureMembership(club.id, ctx)
  return club.id
}

async function ensureMembership(clubId: string, ctx: Ctx) {
  await prisma.clubLeagueSeason.upsert({
    where: { clubId_leagueId_season_grade: { clubId, leagueId: ctx.leagueId, season: ctx.season, grade: ctx.grade } },
    create: { clubId, leagueId: ctx.leagueId, season: ctx.season, grade: ctx.grade, sport: SPORT, isActive: true },
    update: { sport: SPORT, isActive: true },
  }).catch(() => {})
}

// ── Games → fixtures + results ────────────────────────────────────────────────
function isPlayed(g: RawGame): boolean {
  const s = (g.status ?? '').toUpperCase()
  return s.includes('FINAL') || s.includes('COMPLETE') || !!g.homeOutcome || !!g.awayOutcome
}

async function importGame(g: RawGame, ctx: Ctx, counts: { fixtures: number; results: number; reviews: number }) {
  const homeId = await ensureFootballClub(g.homeTeamId ?? null, g.homeTeamName ?? '', ctx)
  const awayId = await ensureFootballClub(g.awayTeamId ?? null, g.awayTeamName ?? '', ctx)
  if (!homeId || !awayId) { counts.reviews++; await raiseReview('AMBIGUOUS_TEAM', `Could not resolve both clubs for PlayHQ game ${g.id}`, { game: g }, 0.3); return }
  const round = g.round ?? null
  const matchDate = g.date ? new Date(g.date) : null
  const sourceUpdatedAt = g.updatedAt ? new Date(g.updatedAt) : null
  const fixtureDedupe = `fb:${ctx.leagueId}:${ctx.season}:g:${g.id}`
  const ids = { playhqGameId: g.id, playhqVenueId: g.venueId ?? null, playhqSurfaceId: g.surfaceId ?? null, playhqRoundId: g.roundId ?? null, playhqPoolId: g.poolId ?? null }

  await prisma.fixture.upsert({
    where: { dedupeKey: fixtureDedupe },
    create: { leagueId: ctx.leagueId, leagueName: ctx.leagueName, season: ctx.season, grade: ctx.grade, sport: SPORT, round, matchDate, matchTime: g.time ?? null, venue: g.venueName ?? null, homeClubId: homeId, homeClubName: g.homeTeamName ?? '', awayClubId: awayId, awayClubName: g.awayTeamName ?? '', status: (g.status ?? 'SCHEDULED').toUpperCase(), importSource: 'PLAYHQ_API', ...ids, sourceUpdatedAt, dedupeKey: fixtureDedupe },
    update: { round, matchDate, matchTime: g.time ?? null, venue: g.venueName ?? null, homeClubName: g.homeTeamName ?? '', awayClubName: g.awayTeamName ?? '', status: (g.status ?? 'SCHEDULED').toUpperCase(), ...ids, sourceUpdatedAt },
  }).catch(e => logger.warn('fixture upsert failed', { detail: String(e), game: g.id }))
  counts.fixtures++
  await mapUpsert('FIXTURE', g.id, { name: `${g.homeTeamName} v ${g.awayTeamName}`, internalType: 'Fixture', parentPlayhqId: ctx.leagueId, sport: SPORT, sourceUpdatedAt })
  if (g.roundId) await mapUpsert('ROUND', g.roundId, { name: g.roundName, parentPlayhqId: ctx.leagueId, sport: SPORT })
  if (g.poolId) await mapUpsert('POOL', g.poolId, { name: g.poolName, parentPlayhqId: ctx.leagueId, sport: SPORT })

  if (!isPlayed(g)) return
  // AFL scores live in the v1 game summary.
  const summary = await provider().getGameSummary(g.id).catch(() => null)
  const home = summary ? resolveScore(summary.homeTotal, summary.homeGoals, summary.homeBehinds) : null
  const away = summary ? resolveScore(summary.awayTotal, summary.awayGoals, summary.awayBehinds) : null
  if (home == null || away == null) { counts.reviews++; await raiseReview('MISSING_SCORE', `PlayHQ game ${g.id} looks played but has no score`, { game: g }, 0.4); return }

  const dedupeKey = resultDedupeKey(ctx.leagueId, ctx.season, round, homeId, awayId)
  const isDraw = home === away
  const existing = await prisma.matchResult.findUnique({ where: { dedupeKey }, select: { id: true, homeScore: true, awayScore: true, verified: true, manualOverride: true } })
  if (existing && (existing.verified || existing.manualOverride) && (existing.homeScore !== home || existing.awayScore !== away)) {
    counts.reviews++; await raiseReview('CONFLICTING_RESULT', `PlayHQ result for game ${g.id} conflicts with a verified/manual result`, { game: g, existing }, 0.5); return
  }
  const data = {
    leagueId: ctx.leagueId, leagueName: ctx.leagueName, season: ctx.season, grade: ctx.grade, sport: SPORT, round, matchDate,
    homeClubId: homeId, homeClubName: g.homeTeamName ?? '', awayClubId: awayId, awayClubName: g.awayTeamName ?? '',
    homeScore: home, awayScore: away, winnerClubId: isDraw ? null : (home > away ? homeId : awayId), isDraw, margin: Math.abs(home - away),
    homeGoals: summary?.homeGoals ?? null, homeBehinds: summary?.homeBehinds ?? null, awayGoals: summary?.awayGoals ?? null, awayBehinds: summary?.awayBehinds ?? null,
    venue: g.venueName ?? null, matchStatus: g.status ?? null, status: 'FINAL', importSource: 'PLAYHQ_API', ...ids, sourceUpdatedAt, importedAt: new Date(),
  }
  const saved = await prisma.matchResult.upsert({ where: { dedupeKey }, create: { ...data, dedupeKey, verified: false }, update: data }).catch(e => { logger.warn('result upsert failed', { detail: String(e), game: g.id }); return null })
  if (saved) { counts.results++; await mapUpsert('RESULT', g.id, { internalId: saved.id, internalType: 'MatchResult', parentPlayhqId: ctx.leagueId, sport: SPORT, sourceUpdatedAt }) }
}

// ── Ladder (import PlayHQ ladder as authoritative) ─────────────────────────────
export async function importLadder(gradeId: string, ctx: Ctx): Promise<{ rows: number } | { skipped: true }> {
  const ladders = await provider().getLadders(gradeId)
  if (!ladders.length || !ladders[0].rows.length) { await raiseReview('SUSPICIOUS_LADDER', `PlayHQ returned no ladder for grade ${gradeId}`, { gradeId }, 0.3); return { skipped: true } }
  // Use the first (or only) pool as the grade ladder.
  const ladder = ladders[0]
  const rows = await Promise.all(ladder.rows.map(async r => ({
    position: r.position ?? undefined, clubId: (r.teamId ? await getMappedInternalId('TEAM', r.teamId) : null) ?? undefined, clubName: r.teamName,
    played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0,
    goalsFor: r.pointsFor ?? 0, goalsAgainst: r.pointsAgainst ?? 0, percentage: r.percentage ?? undefined, points: r.points ?? 0,
  })))
  const res = await createUploadedLadder({ leagueId: ctx.leagueId, season: ctx.season, grade: ctx.grade, source: 'PLAYHQ', rows, notes: `Imported from PlayHQ API${ladder.poolName ? ` (${ladder.poolName})` : ''}`, setCurrent: true, createdBy: ctx.createdBy })
  return res.ok ? { rows: rows.length } : { skipped: true }
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export interface SyncLeagueOpts { gradeId: string; seasonId?: string; season?: string; gradeName?: string; competitionId?: string; organisationId?: string; tenant?: string; stateId?: string; createdBy?: string }

async function resolveGrade(opts: SyncLeagueOpts): Promise<{ grade: RawGrade; seasonName: string; competitionId?: string }> {
  let grade: RawGrade = { id: opts.gradeId, name: opts.gradeName ?? 'Seniors', url: undefined }
  let seasonName = opts.season ?? String(new Date().getFullYear())
  let competitionId = opts.competitionId
  if (opts.seasonId) {
    const grades = await provider().listGrades(opts.seasonId)
    const found = grades.find(g => g.id === opts.gradeId)
    if (found) grade = found
    if (opts.organisationId) { const seasons = await provider().listSeasons(opts.organisationId); const s = seasons.find(x => x.id === opts.seasonId); if (s) { seasonName = opts.season ?? s.name; competitionId = competitionId ?? s.competitionId } }
  }
  return { grade, seasonName, competitionId }
}

export async function syncLeague(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('SYNC_LEAGUE', opts.createdBy)
  const started = Date.now()
  try {
    const { grade, seasonName, competitionId } = await resolveGrade(opts)
    const league = await importGradeAsLeague(grade, seasonName, { organisationId: opts.organisationId, competitionId, seasonId: opts.seasonId, tenant: opts.tenant, stateId: opts.stateId, createdBy: opts.createdBy })
    if ('needsReview' in league) { await logSync({ operation: 'SYNC_LEAGUE', status: 'SKIPPED', playhqId: opts.gradeId, message: 'league needs review (no state)', createdBy: opts.createdBy }); return { ok: false, message: 'league needs review' } }
    const ctx: Ctx = { leagueId: league.leagueId, leagueName: league.leagueName, season: seasonName, grade: grade.name, seasonId: opts.seasonId, tenant: opts.tenant, organisationId: opts.organisationId, createdBy: opts.createdBy }
    const { games, venues } = await p.listGamesForGrade(opts.gradeId)
    await importVenues(venues, { tenant: opts.tenant, organisationId: opts.organisationId })
    const gc = { fixtures: 0, results: 0, reviews: 0 }
    for (const g of games) await importGame(g, ctx, gc)
    const lad = await importLadder(opts.gradeId, ctx)
    const counts = { fixtures: gc.fixtures, results: gc.results, reviews: gc.reviews, venues: venues.length, ladderRows: 'rows' in lad ? lad.rows : 0 }
    await logSync({ operation: 'SYNC_LEAGUE', status: 'OK', playhqId: opts.gradeId, organisationId: opts.organisationId, tenant: opts.tenant, counts, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts, data: { leagueId: league.leagueId } }
  } catch (e) {
    await logSync({ operation: 'SYNC_LEAGUE', status: 'ERROR', playhqId: opts.gradeId, message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

export async function syncSeason(opts: { seasonId: string; season?: string; competitionId?: string; organisationId?: string; tenant?: string; stateId?: string; createdBy?: string }): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('SYNC_SEASON', opts.createdBy)
  const started = Date.now()
  try {
    // Prime team mappings for the whole season so game team ids resolve to clubs.
    const grades = await p.listGrades(opts.seasonId)
    let seasonName = opts.season
    if (!seasonName && opts.organisationId) { const seasons = await p.listSeasons(opts.organisationId); seasonName = seasons.find(s => s.id === opts.seasonId)?.name }
    const totals = { grades: 0, fixtures: 0, results: 0, reviews: 0, venues: 0, ladderRows: 0 }
    for (const g of grades) {
      const r = await syncLeague({ gradeId: g.id, seasonId: opts.seasonId, season: seasonName, gradeName: g.name, competitionId: opts.competitionId, organisationId: opts.organisationId, tenant: opts.tenant, stateId: opts.stateId, createdBy: opts.createdBy })
      totals.grades++
      if (r.counts) for (const k of ['fixtures', 'results', 'reviews', 'venues', 'ladderRows'] as const) totals[k] += r.counts[k] ?? 0
    }
    await logSync({ operation: 'SYNC_SEASON', status: 'OK', playhqId: opts.seasonId, organisationId: opts.organisationId, tenant: opts.tenant, counts: totals, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts: totals }
  } catch (e) {
    await logSync({ operation: 'SYNC_SEASON', status: 'ERROR', playhqId: opts.seasonId, message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

export async function syncAll(opts: { organisationId?: string; season?: string; stateId?: string; createdBy?: string } = {}): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('SYNC_ALL', opts.createdBy)
  const started = Date.now()
  const orgId = opts.organisationId ?? playhqPublicStatus().organisationId ?? undefined
  if (!orgId) { await logSync({ operation: 'SYNC_ALL', status: 'SKIPPED', message: 'no organisationId', createdBy: opts.createdBy }); return { ok: false, message: 'organisationId required' } }
  try {
    const seasons = await p.listSeasons(orgId)
    const totals = { seasons: 0, grades: 0, fixtures: 0, results: 0, reviews: 0, venues: 0, ladderRows: 0 }
    for (const s of seasons) {
      totals.seasons++
      const r = await syncSeason({ seasonId: s.id, season: opts.season ?? s.name, competitionId: s.competitionId, organisationId: orgId, stateId: opts.stateId, createdBy: opts.createdBy })
      if (r.counts) for (const k of ['grades', 'fixtures', 'results', 'reviews', 'venues', 'ladderRows'] as const) totals[k] += r.counts[k] ?? 0
    }
    await logSync({ operation: 'SYNC_ALL', status: 'OK', organisationId: orgId, counts: totals, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts: totals }
  } catch (e) {
    await logSync({ operation: 'SYNC_ALL', status: 'ERROR', organisationId: orgId, message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

// Thin per-stage wrappers so each pipeline stage has a callable admin entrypoint.
export async function importLeague(opts: SyncLeagueOpts) { return syncLeague(opts) }
export async function importSeason(opts: Parameters<typeof syncSeason>[0]) { return syncSeason(opts) }
export async function importFixturesOnly(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_FIXTURES', opts.createdBy)
  return syncLeague(opts)
}
export async function importResultsOnly(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_RESULTS', opts.createdBy)
  return syncLeague(opts)
}
export async function importVenuesOnly(opts: { createdBy?: string } = {}): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_VENUES', opts.createdBy)
  try { const venues = await p.listVenues(); await importVenues(venues); await logSync({ operation: 'IMPORT_VENUES', status: 'OK', counts: { venues: venues.length }, createdBy: opts.createdBy }); return { ok: true, counts: { venues: venues.length } } }
  catch (e) { await logSync({ operation: 'IMPORT_VENUES', status: 'ERROR', message: String(e), createdBy: opts.createdBy }); return { ok: false, message: String(e) } }
}
export async function importLaddersOnly(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_LADDERS', opts.createdBy)
  const started = Date.now()
  const leagueId = await getMappedInternalId('GRADE', opts.gradeId)
  if (!leagueId) return { ok: false, message: 'import the league first' }
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { name: true, currentSeason: true } })
  const ctx: Ctx = { leagueId, leagueName: league?.name ?? '', season: opts.season ?? league?.currentSeason ?? String(new Date().getFullYear()), grade: opts.gradeName ?? 'Seniors', seasonId: opts.seasonId, createdBy: opts.createdBy }
  const lad = await importLadder(opts.gradeId, ctx)
  await logSync({ operation: 'IMPORT_LADDERS', status: 'OK', playhqId: opts.gradeId, counts: { ladderRows: 'rows' in lad ? lad.rows : 0 }, durationMs: Date.now() - started, createdBy: opts.createdBy })
  return { ok: true, counts: { ladderRows: 'rows' in lad ? lad.rows : 0 } }
}
