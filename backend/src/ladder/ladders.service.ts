/**
 * Ladder store service (Ladder Import V2).
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD for stored ladders (uploaded OCR/CSV/manual OR generated), publishing
 * (set current + supersede others), comparison, row editing and a safe ranking
 * input hook (sync a published ladder's stats into ClubLeagueSeason so the
 * existing ranking engine can consume them — the formula itself is untouched).
 * Manual/uploaded ladders are protected; soft-delete only; every action audited.
 */

import { prisma } from '../db/client.js'
import { safePercentage } from './generate.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export interface UploadRowInput {
  position?: number; clubId?: string; clubName: string
  played?: number; wins?: number; losses?: number; draws?: number
  goalsFor?: number; goalsAgainst?: number; goalDiff?: number; percentage?: number; points?: number
  last5?: string[]; currentStreak?: number; sourceNotes?: string
}
export interface UploadLadderInput {
  leagueId: string; season: string; grade?: string; source?: 'OCR' | 'CSV' | 'MANUAL' | 'PLAYHQ'
  rows: UploadRowInput[]; notes?: string; setCurrent?: boolean; createdBy?: string
}

async function resolveClubId(clubId: string | undefined, clubName: string): Promise<string | null> {
  if (clubId) return clubId
  const c = await prisma.club.findFirst({ where: { name: { equals: clubName, mode: 'insensitive' }, archivedAt: null }, select: { id: true } }).catch(() => null)
  return c?.id ?? null
}

/** Create an uploaded/edited ladder. Missing fields are allowed (default 0). */
export async function createUploadedLadder(input: UploadLadderInput): Promise<{ ok: boolean; ladderId?: string; error?: string }> {
  if (!input.leagueId || !input.season || !Array.isArray(input.rows) || input.rows.length === 0) return { ok: false, error: 'leagueId, season and rows[] required' }
  const grade = input.grade ?? 'A Grade'
  const league = await prisma.league.findUnique({ where: { id: input.leagueId }, select: { name: true } }).catch(() => null)
  const source = input.source ?? 'MANUAL'

  const rowData = await Promise.all(input.rows.map(async (r) => {
    const gf = r.goalsFor ?? 0, ga = r.goalsAgainst ?? 0
    return {
      position: r.position ?? null, clubId: await resolveClubId(r.clubId, r.clubName), clubName: r.clubName,
      played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0,
      goalsFor: gf, goalsAgainst: ga, goalDiff: r.goalDiff ?? (gf - ga), percentage: r.percentage ?? safePercentage(gf, ga),
      points: r.points ?? 0, last5: r.last5 ? JSON.stringify(r.last5) : null, currentStreak: r.currentStreak ?? 0, sourceNotes: r.sourceNotes ?? null,
    }
  }))

  if (input.setCurrent) await prisma.ladder.updateMany({ where: { leagueId: input.leagueId, season: input.season, grade, isCurrent: true, deletedAt: null }, data: { isCurrent: false, status: 'SUPERSEDED' } })

  const ladder = await prisma.ladder.create({
    data: {
      leagueId: input.leagueId, leagueName: league?.name ?? null, season: input.season, grade, source,
      status: input.setCurrent ? 'CURRENT' : 'DRAFT', isCurrent: !!input.setCurrent, manualOverride: true, notes: input.notes ?? null,
      createdBy: input.createdBy ?? 'admin', rows: { create: rowData },
    },
  })
  await logQualityAction('UPLOAD_LADDER', 'Ladder', ladder.id, { leagueId: input.leagueId, season: input.season, grade, source, rows: rowData.length }, { reason: 'uploaded/edited ladder', performedBy: input.createdBy })
  return { ok: true, ladderId: ladder.id }
}

export async function getLadder(id: string) {
  return prisma.ladder.findFirst({ where: { id, deletedAt: null }, include: { rows: { orderBy: [{ position: 'asc' }, { points: 'desc' }] } } })
}

export async function getCurrentLadder(leagueId: string, opts: { season?: string; grade?: string } = {}) {
  return prisma.ladder.findFirst({ where: { leagueId, isCurrent: true, deletedAt: null, ...(opts.season ? { season: opts.season } : {}), ...(opts.grade ? { grade: opts.grade } : {}) }, include: { rows: { orderBy: [{ position: 'asc' }, { points: 'desc' }] } }, orderBy: { updatedAt: 'desc' } })
}

export async function listLadders(leagueId: string, opts: { season?: string; grade?: string } = {}) {
  return prisma.ladder.findMany({ where: { leagueId, deletedAt: null, ...(opts.season ? { season: opts.season } : {}), ...(opts.grade ? { grade: opts.grade } : {}) }, orderBy: { createdAt: 'desc' }, select: { id: true, source: true, status: true, isCurrent: true, manualOverride: true, season: true, grade: true, roundFrom: true, roundTo: true, resultsIncluded: true, confidence: true, generatedAt: true, createdAt: true } })
}

/** Publish a ladder as current (supersede siblings) + resolve conflict reviews. */
export async function publishLadder(ladderId: string, opts: { applyToRankings?: boolean; performedBy?: string } = {}): Promise<{ ok: boolean; error?: string }> {
  const ladder = await prisma.ladder.findFirst({ where: { id: ladderId, deletedAt: null }, include: { rows: true } })
  if (!ladder) return { ok: false, error: 'ladder not found' }
  await prisma.ladder.updateMany({ where: { leagueId: ladder.leagueId, season: ladder.season, grade: ladder.grade, isCurrent: true, deletedAt: null, NOT: { id: ladderId } }, data: { isCurrent: false, status: 'SUPERSEDED' } })
  await prisma.ladder.update({ where: { id: ladderId }, data: { isCurrent: true, status: 'CURRENT', manualOverride: ladder.source !== 'GENERATED_FROM_RESULTS' ? true : ladder.manualOverride } })
  // Resolve any pending ladder-conflict review for this league.
  await prisma.reviewItem.updateMany({ where: { entityType: 'Ladder', entityId: ladder.leagueId, kind: 'LADDER_CONFLICT', status: 'PENDING' }, data: { status: 'APPROVED', resolvedAt: new Date(), resolvedBy: opts.performedBy ?? 'admin' } }).catch(() => {})
  if (opts.applyToRankings) await applyLadderToClubSeasons(ladderId).catch(e => logger.warn('applyLadderToClubSeasons failed', { detail: String(e) }))
  await logQualityAction('PUBLISH_LADDER', 'Ladder', ladderId, { leagueId: ladder.leagueId, season: ladder.season, grade: ladder.grade, source: ladder.source }, { reason: 'ladder published as current', performedBy: opts.performedBy })
  return { ok: true }
}

/** Compare the current uploaded/manual ladder with the latest generated one. */
export async function compareLadders(leagueId: string, season: string, grade = 'A Grade') {
  const [manual, generated] = await Promise.all([
    prisma.ladder.findFirst({ where: { leagueId, season, grade, deletedAt: null, source: { not: 'GENERATED_FROM_RESULTS' } }, include: { rows: { orderBy: { position: 'asc' } } }, orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }] }),
    prisma.ladder.findFirst({ where: { leagueId, season, grade, deletedAt: null, source: 'GENERATED_FROM_RESULTS' }, include: { rows: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
  ])
  const diffs: { clubName: string; uploadedPos: number | null; generatedPos: number | null }[] = []
  if (manual && generated) {
    const genByClub = new Map(generated.rows.map(r => [r.clubName.toLowerCase(), r.position]))
    for (const m of manual.rows) diffs.push({ clubName: m.clubName, uploadedPos: m.position, generatedPos: genByClub.get(m.clubName.toLowerCase()) ?? null })
  }
  return { uploaded: manual, generated, diffs, agree: diffs.length > 0 && diffs.every(d => d.uploadedPos === d.generatedPos) }
}

export async function editLadderRow(rowId: string, fields: Partial<UploadRowInput>, performedBy = 'admin') {
  const data: Record<string, unknown> = {}
  for (const k of ['position', 'clubName', 'played', 'wins', 'losses', 'draws', 'goalsFor', 'goalsAgainst', 'goalDiff', 'percentage', 'points', 'currentStreak', 'sourceNotes'] as const) if (k in fields) data[k] = (fields as Record<string, unknown>)[k]
  if ('last5' in fields) data.last5 = fields.last5 ? JSON.stringify(fields.last5) : null
  if (Object.keys(data).length === 0) return { ok: false as const, error: 'no editable fields' }
  const before = await prisma.ladderRow.findUnique({ where: { id: rowId } })
  const row = await prisma.ladderRow.update({ where: { id: rowId }, data })
  await logQualityAction('EDIT_LADDER_ROW', 'LadderRow', rowId, data, { before, reason: 'ladder row edit', performedBy })
  return { ok: true as const, row }
}

export async function softDeleteLadder(id: string, performedBy = 'admin') {
  const l = await prisma.ladder.findUnique({ where: { id } })
  if (!l) return { ok: false as const, error: 'ladder not found' }
  await prisma.ladder.update({ where: { id }, data: { deletedAt: new Date(), isCurrent: false, status: 'SUPERSEDED' } })
  await logQualityAction('ARCHIVE_LADDER', 'Ladder', id, { archived: true }, { performedBy })
  return { ok: true as const }
}

/**
 * Safe ranking input hook: sync a published ladder's per-club stats into
 * ClubLeagueSeason so the existing ranking engine (which reads that table) can
 * use them. Does NOT change any ranking formula.
 */
export async function applyLadderToClubSeasons(ladderId: string): Promise<{ synced: number }> {
  const ladder = await prisma.ladder.findUnique({ where: { id: ladderId }, include: { rows: true } })
  if (!ladder) return { synced: 0 }
  let synced = 0
  for (const r of ladder.rows) {
    if (!r.clubId) continue
    await prisma.clubLeagueSeason.upsert({
      where: { clubId_leagueId_season_grade: { clubId: r.clubId, leagueId: ladder.leagueId, season: ladder.season, grade: ladder.grade } },
      create: { clubId: r.clubId, leagueId: ladder.leagueId, season: ladder.season, grade: ladder.grade, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, percentage: r.percentage, points: r.points, position: r.position ?? null },
      update: { played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, percentage: r.percentage, points: r.points, position: r.position ?? null },
    }).catch(() => {})
    synced++
  }
  await logQualityAction('SYNC_LADDER_TO_SEASONS', 'Ladder', ladderId, { synced }, { reason: 'ladder → club_league_seasons (ranking input hook)' })
  return { synced }
}
