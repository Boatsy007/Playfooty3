/**
 * PlayHQ Football ingestion pipeline (Phase F1).
 * ─────────────────────────────────────────────────────────────────────────────
 * Source-agnostic ingestion built on the CompetitionDataProvider. Discovers and
 * imports organisations → competitions → seasons → grades → clubs/teams →
 * fixtures → results → ladders into the SHARED platform models with
 * sport=FOOTBALL. Netball is untouched. Idempotent via PlayhqEntityMap; uncertain
 * rows raise review items; every operation is logged (PlayhqSyncLog) and audited.
 *
 * Fails gracefully when credentials are absent: each entrypoint returns a clear
 * "PlayHQ credentials not configured." result and writes a DISABLED sync log —
 * nothing throws into the caller and the rest of the app is unaffected.
 */

import { prisma } from '../db/client.js'
import { getPlayhqProvider } from '../providers/registry.js'
import { PLAYHQ_CREDENTIALS_MISSING, playhqPublicStatus } from '../providers/playhq/config.js'
import type { RawGame, RawGrade } from '../providers/competition-provider.js'
import { mapUpsert, getMappedInternalId, getMapping, logSync, slugify, resolveStateId } from './mapping.js'
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
  return logSync({ operation, status: 'DISABLED', message: PLAYHQ_CREDENTIALS_MISSING, createdBy })
    .then(() => ({ ok: false, message: PLAYHQ_CREDENTIALS_MISSING }))
}

async function raiseReview(kind: string, reason: string, payload: unknown, confidence = 0.3) {
  await prisma.reviewItem.create({ data: { entityType: 'League', kind, reason, confidence, payload: JSON.stringify(payload) } }).catch(() => {})
}

// ── Status / logs ─────────────────────────────────────────────────────────────
export function getFootballStatus() {
  const p = provider()
  return { provider: p.name, sport: p.sport, ...playhqPublicStatus() }
}
export async function getSyncLogs(limit = 50) {
  return prisma.playhqSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) })
}

// ── Discovery ─────────────────────────────────────────────────────────────────
export async function discover(opts: { organisationId?: string; createdBy?: string } = {}): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('DISCOVER', opts.createdBy)
  const started = Date.now()
  const counts = { organisations: 0, competitions: 0, seasons: 0, grades: 0 }
  try {
    const orgs = opts.organisationId ? [await p.getOrganisation(opts.organisationId)].filter(Boolean) as NonNullable<Awaited<ReturnType<typeof p.getOrganisation>>>[] : await p.listOrganisations()
    const tree: unknown[] = []
    for (const org of orgs) {
      counts.organisations++
      await mapUpsert('ORGANISATION', org.id, { name: org.name, organisationId: org.id, tenant: org.tenant, sport: SPORT, payload: org })
      const comps = await p.listCompetitions(org.id)
      const compNodes: unknown[] = []
      for (const c of comps) {
        counts.competitions++
        await mapUpsert('COMPETITION', c.id, { name: c.name, organisationId: org.id, parentPlayhqId: org.id, sport: SPORT, payload: c })
        const seasons = await p.listSeasons(c.id)
        const seasonNodes: unknown[] = []
        for (const s of seasons) {
          counts.seasons++
          await mapUpsert('SEASON', s.id, { name: s.name, organisationId: org.id, parentPlayhqId: c.id, sport: SPORT, payload: s })
          const grades = await p.listGrades(s.id)
          for (const g of grades) { counts.grades++; await mapUpsert('GRADE', g.id, { name: g.name, organisationId: org.id, parentPlayhqId: s.id, sport: SPORT, payload: g }) }
          seasonNodes.push({ id: s.id, name: s.name, grades: grades.map(g => ({ id: g.id, name: g.name })) })
        }
        compNodes.push({ id: c.id, name: c.name, sport: c.sport, seasons: seasonNodes })
      }
      tree.push({ id: org.id, name: org.name, competitions: compNodes })
    }
    await logSync({ operation: 'DISCOVER', status: 'OK', organisationId: opts.organisationId, counts, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts, data: tree }
  } catch (e) {
    await logSync({ operation: 'DISCOVER', status: 'ERROR', message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

export async function importOrganisation(organisationId: string, createdBy?: string): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('IMPORT_ORGANISATION', createdBy)
  const org = await p.getOrganisation(organisationId)
  if (!org) { await logSync({ operation: 'IMPORT_ORGANISATION', status: 'SKIPPED', playhqId: organisationId, message: 'organisation not found', createdBy }); return { ok: false, message: 'organisation not found' } }
  await mapUpsert('ORGANISATION', org.id, { name: org.name, organisationId: org.id, tenant: org.tenant, sport: SPORT, payload: org })
  await logSync({ operation: 'IMPORT_ORGANISATION', status: 'OK', playhqId: org.id, createdBy })
  return { ok: true, data: { id: org.id, name: org.name } }
}

// ── League (grade → internal League) ──────────────────────────────────────────
/** Create/update an internal League for a PlayHQ grade. Idempotent via mapping. */
async function importGradeAsLeague(grade: RawGrade, gradeName: string, seasonName: string, meta: { organisationId?: string | null; competitionId?: string | null; seasonId?: string | null; tenant?: string | null; stateId?: string | null; createdBy?: string }): Promise<{ leagueId: string; leagueName: string } | { needsReview: true }> {
  const existingId = await getMappedInternalId('GRADE', grade.id)
  const leagueName = grade.name || gradeName
  if (existingId) {
    await prisma.league.update({ where: { id: existingId }, data: { name: leagueName, sport: SPORT, playhqGradeId: grade.id, playhqGradeName: leagueName, playhqSeasonId: meta.seasonId ?? null, playhqCompetitionId: meta.competitionId ?? null, playhqOrganisationId: meta.organisationId ?? null, currentSeason: seasonName, lastSyncedAt: new Date() } }).catch(() => {})
    return { leagueId: existingId, leagueName }
  }
  const stateId = await resolveStateId(meta.stateId)
  if (!stateId) { await raiseReview('UNSUPPORTED_GRADE', `No state available to place football league "${leagueName}"`, { gradeId: grade.id, leagueName }, 0.2); return { needsReview: true } }
  const league = await prisma.league.create({ data: {
    name: leagueName, stateId, sport: SPORT, isActive: true, primarySource: 'PLAYHQ', importType: 'AUTO', autoDiscovered: true,
    playhqGradeId: grade.id, playhqGradeName: leagueName, playhqSeasonId: meta.seasonId ?? null, playhqCompetitionId: meta.competitionId ?? null, playhqOrganisationId: meta.organisationId ?? null, currentSeason: seasonName, lastSyncedAt: new Date(),
  } })
  await mapUpsert('GRADE', grade.id, { name: leagueName, organisationId: meta.organisationId, parentPlayhqId: meta.seasonId, internalId: league.id, internalType: 'League', sport: SPORT, tenant: meta.tenant })
  await logQualityAction('PLAYHQ_IMPORT_LEAGUE', 'League', league.id, { playhqGradeId: grade.id, leagueName }, { reason: 'football league imported from PlayHQ', performedBy: meta.createdBy })
  return { leagueId: league.id, leagueName }
}

/** Resolve (idempotently) a PlayHQ team to an internal football Club + membership. */
async function ensureFootballClub(teamId: string | null, teamName: string, ctx: Ctx): Promise<string | null> {
  if (!teamName) return null
  // 1. Existing TEAM mapping.
  if (teamId) { const mapped = await getMappedInternalId('TEAM', teamId); if (mapped) { await ensureMembership(mapped, ctx); return mapped } }
  // 2. Existing club by exact name + football sport.
  let club = await prisma.club.findFirst({ where: { name: { equals: teamName, mode: 'insensitive' }, sport: SPORT, archivedAt: null }, select: { id: true } }).catch(() => null)
  if (!club) {
    const stateId = await resolveStateId(null)
    if (!stateId) { await raiseReview('UNKNOWN_CLUB', `No state available to create football club "${teamName}"`, { teamName }, 0.2); return null }
    // Unique slug (football clubs may share a name with netball clubs).
    let slug = slugify(teamName); let n = 1
    while (await prisma.club.findUnique({ where: { slug }, select: { id: true } }).catch(() => null)) { slug = `${slugify(teamName)}-afl${n > 1 ? n : ''}`; n++; if (n > 50) break }
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

// ── Fixtures + results (from games) ───────────────────────────────────────────
function isPlayed(g: RawGame): boolean {
  const s = (g.status ?? '').toUpperCase()
  const home = resolveScore(g.homeScore, g.homeGoals, g.homeBehinds)
  const away = resolveScore(g.awayScore, g.awayGoals, g.awayBehinds)
  return (s.includes('FINAL') || s.includes('COMPLETE')) || (home != null && away != null)
}

async function importGame(g: RawGame, ctx: Ctx, counts: { fixtures: number; results: number; reviews: number }) {
  const homeId = await ensureFootballClub(g.homeTeamId ?? null, g.homeTeamName ?? '', ctx)
  const awayId = await ensureFootballClub(g.awayTeamId ?? null, g.awayTeamName ?? '', ctx)
  if (!homeId || !awayId) { counts.reviews++; await raiseReview('AMBIGUOUS_TEAM', `Could not resolve both clubs for PlayHQ game ${g.id}`, { game: g }, 0.3); return }
  const round = g.round ?? null
  const matchDate = g.date ? new Date(g.date) : null
  const umpires = g.umpires?.length ? JSON.stringify(g.umpires) : null
  const sourceUpdatedAt = g.updatedAt ? new Date(g.updatedAt) : null
  const fixtureDedupe = `fb:${ctx.leagueId}:${ctx.season}:g:${g.id}`

  // Fixture (always upsert; idempotent on playhqGameId via dedupeKey).
  await prisma.fixture.upsert({
    where: { dedupeKey: fixtureDedupe },
    create: { leagueId: ctx.leagueId, leagueName: ctx.leagueName, season: ctx.season, grade: ctx.grade, sport: SPORT, round, matchDate, matchTime: g.time ?? null, venue: g.venue ?? null, ground: g.ground ?? null, umpires, homeClubId: homeId, homeClubName: g.homeTeamName ?? '', awayClubId: awayId, awayClubName: g.awayTeamName ?? '', status: (g.status ?? 'SCHEDULED').toUpperCase(), importSource: 'PLAYHQ_API', playhqGameId: g.id, sourceUpdatedAt, dedupeKey: fixtureDedupe },
    update: { round, matchDate, matchTime: g.time ?? null, venue: g.venue ?? null, ground: g.ground ?? null, umpires, homeClubName: g.homeTeamName ?? '', awayClubName: g.awayTeamName ?? '', status: (g.status ?? 'SCHEDULED').toUpperCase(), sourceUpdatedAt },
  }).catch(e => logger.warn('fixture upsert failed', { detail: String(e), game: g.id }))
  counts.fixtures++
  await mapUpsert('FIXTURE', g.id, { name: `${g.homeTeamName} v ${g.awayTeamName}`, internalType: 'Fixture', parentPlayhqId: ctx.leagueId, sport: SPORT, sourceUpdatedAt })

  if (!isPlayed(g)) return
  const home = resolveScore(g.homeScore, g.homeGoals, g.homeBehinds)
  const away = resolveScore(g.awayScore, g.awayGoals, g.awayBehinds)
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
    homeGoals: g.homeGoals ?? null, homeBehinds: g.homeBehinds ?? null, awayGoals: g.awayGoals ?? null, awayBehinds: g.awayBehinds ?? null,
    ground: g.ground ?? null, umpires, matchStatus: g.status ?? null, status: 'FINAL', importSource: 'PLAYHQ_API', playhqGameId: g.id, sourceUpdatedAt, importedAt: new Date(),
  }
  const saved = await prisma.matchResult.upsert({ where: { dedupeKey }, create: { ...data, dedupeKey, verified: false }, update: data }).catch(e => { logger.warn('result upsert failed', { detail: String(e), game: g.id }); return null })
  if (saved) { counts.results++; await mapUpsert('RESULT', g.id, { internalId: saved.id, internalType: 'MatchResult', parentPlayhqId: ctx.leagueId, sport: SPORT, sourceUpdatedAt }) }
}

export async function importFixturesAndResults(gradeId: string, ctx: Ctx): Promise<{ fixtures: number; results: number; reviews: number }> {
  const counts = { fixtures: 0, results: 0, reviews: 0 }
  const games = await provider().listGames(gradeId, { seasonId: ctx.seasonId })
  for (const g of games) await importGame(g, ctx, counts)
  return counts
}

// ── Ladder (import PlayHQ ladder as authoritative source) ──────────────────────
export async function importLadder(gradeId: string, ctx: Ctx): Promise<{ rows: number } | { skipped: true }> {
  const ladder = await provider().getLadder(gradeId, { seasonId: ctx.seasonId })
  if (!ladder || ladder.rows.length === 0) { await raiseReview('SUSPICIOUS_LADDER', `PlayHQ returned no ladder for grade ${gradeId}`, { gradeId }, 0.3); return { skipped: true } }
  const rows = await Promise.all(ladder.rows.map(async r => ({
    position: r.position ?? undefined, clubId: (r.teamId ? await getMappedInternalId('TEAM', r.teamId) : null) ?? undefined, clubName: r.teamName,
    played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0,
    goalsFor: r.pointsFor ?? 0, goalsAgainst: r.pointsAgainst ?? 0, percentage: r.percentage ?? undefined, points: r.points ?? 0,
  })))
  const res = await createUploadedLadder({ leagueId: ctx.leagueId, season: ctx.season, grade: ctx.grade, source: 'PLAYHQ', rows, notes: 'Imported from PlayHQ API', setCurrent: true, createdBy: ctx.createdBy })
  return res.ok ? { rows: rows.length } : { skipped: true }
}

// ── Orchestration ─────────────────────────────────────────────────────────────
export interface SyncLeagueOpts { gradeId: string; seasonId?: string; season?: string; gradeName?: string; competitionId?: string; organisationId?: string; tenant?: string; stateId?: string; createdBy?: string }

export async function syncLeague(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider()
  if (!p.isConfigured()) return disabled('SYNC_LEAGUE', opts.createdBy)
  const started = Date.now()
  try {
    const seasonName = opts.season ?? String(new Date().getFullYear())
    const gradeRaw: RawGrade = { id: opts.gradeId, name: opts.gradeName ?? 'Seniors', seasonId: opts.seasonId, competitionId: opts.competitionId }
    const league = await importGradeAsLeague(gradeRaw, gradeRaw.name, seasonName, { organisationId: opts.organisationId, competitionId: opts.competitionId, seasonId: opts.seasonId, tenant: opts.tenant, stateId: opts.stateId, createdBy: opts.createdBy })
    if ('needsReview' in league) { await logSync({ operation: 'SYNC_LEAGUE', status: 'SKIPPED', playhqId: opts.gradeId, message: 'league needs review (no state)', createdBy: opts.createdBy }); return { ok: false, message: 'league needs review' } }
    const ctx: Ctx = { leagueId: league.leagueId, leagueName: league.leagueName, season: seasonName, grade: opts.gradeName ?? 'Seniors', seasonId: opts.seasonId, tenant: opts.tenant, organisationId: opts.organisationId, createdBy: opts.createdBy }
    const gc = await importFixturesAndResults(opts.gradeId, ctx)
    const lad = await importLadder(opts.gradeId, ctx)
    const counts = { fixtures: gc.fixtures, results: gc.results, reviews: gc.reviews, ladderRows: 'rows' in lad ? lad.rows : 0 }
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
    const grades = await p.listGrades(opts.seasonId)
    const totals = { grades: 0, fixtures: 0, results: 0, reviews: 0, ladderRows: 0 }
    for (const g of grades) {
      const r = await syncLeague({ gradeId: g.id, seasonId: opts.seasonId, season: opts.season, gradeName: g.name, competitionId: opts.competitionId, organisationId: opts.organisationId, tenant: opts.tenant, stateId: opts.stateId, createdBy: opts.createdBy })
      totals.grades++
      if (r.counts) { totals.fixtures += r.counts.fixtures ?? 0; totals.results += r.counts.results ?? 0; totals.reviews += r.counts.reviews ?? 0; totals.ladderRows += r.counts.ladderRows ?? 0 }
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
  try {
    const orgs = opts.organisationId ? [opts.organisationId] : (await p.listOrganisations()).map(o => o.id)
    const totals = { organisations: 0, competitions: 0, seasons: 0, grades: 0, fixtures: 0, results: 0, reviews: 0, ladderRows: 0 }
    for (const orgId of orgs) {
      totals.organisations++
      const comps = await p.listCompetitions(orgId)
      for (const c of comps) {
        if (c.sport && !/foot|afl|aussie/i.test(c.sport)) { await raiseReview('LEAGUE_NOT_FOOTBALL', `Competition "${c.name}" is not Australian football (sport=${c.sport})`, { competition: c }, 0.4); continue }
        totals.competitions++
        const seasons = await p.listSeasons(c.id)
        for (const s of seasons) {
          totals.seasons++
          const r = await syncSeason({ seasonId: s.id, season: opts.season ?? s.name, competitionId: c.id, organisationId: orgId, stateId: opts.stateId, createdBy: opts.createdBy })
          if (r.counts) { totals.grades += r.counts.grades ?? 0; totals.fixtures += r.counts.fixtures ?? 0; totals.results += r.counts.results ?? 0; totals.reviews += r.counts.reviews ?? 0; totals.ladderRows += r.counts.ladderRows ?? 0 }
        }
      }
    }
    await logSync({ operation: 'SYNC_ALL', status: 'OK', organisationId: opts.organisationId, counts: totals, durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: true, counts: totals }
  } catch (e) {
    await logSync({ operation: 'SYNC_ALL', status: 'ERROR', message: String(e), durationMs: Date.now() - started, createdBy: opts.createdBy })
    return { ok: false, message: String(e) }
  }
}

// Thin wrappers so each pipeline stage has a callable admin entrypoint.
export async function importLeague(opts: SyncLeagueOpts) { return syncLeague(opts) }
export async function importSeason(opts: Parameters<typeof syncSeason>[0]) { return syncSeason(opts) }
export async function importFixturesOnly(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_FIXTURES', opts.createdBy)
  return syncLeague(opts) // fixtures + results + ladder are imported together per grade
}
export async function importResultsOnly(opts: SyncLeagueOpts): Promise<FootballResult> {
  const p = provider(); if (!p.isConfigured()) return disabled('IMPORT_RESULTS', opts.createdBy)
  return syncLeague(opts)
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

void getMapping // reserved for future mapping lookups in admin views
