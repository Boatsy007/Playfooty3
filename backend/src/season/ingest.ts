/**
 * Full Season Ingestion Engine (Phase B10.5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates importing an entire season (Round 1 → finals) in one operation
 * from OCR/CSV/manual/PlayHQ. Results are the canonical source of truth: after a
 * commit the season is reconstructed from committed results — per-round ladders,
 * round summaries and per-club timelines. Every batch is tracked (SeasonImport)
 * with per-row provenance + content fingerprints (SeasonImportRow) so re-imports
 * are idempotent and fully auditable. Builds on the existing bulk-import,
 * ladder-generation and round-summary services; nothing is overwritten silently.
 */

import { createHash } from 'crypto'
import { prisma } from '../db/client.js'
import { previewBulk, commitBulk, parseCsv, type BulkRowInput, type BulkOptions } from '../ladder/bulk-import.js'
import { generatePerRoundLadders } from '../ladder/generate.js'
import { computeLeagueRoundSummaries } from '../results/rounds.js'
import { buildClubSeasonTimeline } from './timeline.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Stable content fingerprint for a parsed row (idempotency + provenance). */
function fingerprintRow(r: { leagueId?: string; league?: string; season?: string; grade?: string; round?: number | string | null; homeClub?: string; homeClubName?: string; awayClub?: string; awayClubName?: string; homeScore?: number | string | null; awayScore?: number | string | null }): string {
  const league = norm(String(r.leagueId ?? r.league ?? ''))
  const home = norm(String(r.homeClub ?? r.homeClubName ?? ''))
  const away = norm(String(r.awayClub ?? r.awayClubName ?? ''))
  const pair = [home, away].sort().join('~')
  const parts = [league, norm(String(r.season ?? '')), norm(String(r.grade ?? '')), String(r.round ?? ''), pair, String(r.homeScore ?? ''), String(r.awayScore ?? '')]
  return createHash('sha1').update(parts.join('|')).digest('hex')
}

export interface SeasonInput { rows?: BulkRowInput[]; csv?: string; csvFiles?: string[]; text?: string }
export interface SeasonIngestOptions extends BulkOptions { fileName?: string; batchLabel?: string; createdBy?: string }

/** Flatten every supported input form into a single BulkRowInput[]. */
function collectRows(input: SeasonInput): BulkRowInput[] {
  const rows: BulkRowInput[] = [...(input.rows ?? [])]
  for (const csv of input.csvFiles ?? []) rows.push(...parseCsv(csv))
  if (input.csv) rows.push(...parseCsv(input.csv))
  if (input.text) rows.push(...parseCsv(input.text))
  return rows
}

/** Distinct (leagueId|season|grade) groups from a preview's round breakdown. */
function touchedGroups(rounds: { leagueId: string; season: string; grade: string }[]): { leagueId: string; season: string; grade: string }[] {
  const seen = new Map<string, { leagueId: string; season: string; grade: string }>()
  for (const r of rounds) { if (!r.leagueId || !r.season) continue; const k = `${r.leagueId}|${r.season}|${r.grade}`; if (!seen.has(k)) seen.set(k, { leagueId: r.leagueId, season: r.season, grade: r.grade }) }
  return [...seen.values()]
}

/** Preview only — parse/validate/group + generated-ladder preview. No writes. */
export async function previewSeason(input: SeasonInput, opts: SeasonIngestOptions = {}) {
  const rows = collectRows(input)
  return previewBulk({ rows }, opts)
}

/**
 * Stage an import: persist a SeasonImport(status=STAGED) with the parsed rows and
 * per-row provenance so it can be committed later. Returns the import id + preview.
 */
export async function stageSeasonImport(input: SeasonInput, opts: SeasonIngestOptions = {}) {
  const rows = collectRows(input)
  const preview = await previewBulk({ rows }, opts)
  const groups = touchedGroups(preview.rounds)
  const primary = groups[0]
  const league = primary?.leagueId ? await prisma.league.findUnique({ where: { id: primary.leagueId }, select: { name: true } }).catch(() => null) : null

  const imp = await prisma.seasonImport.create({
    data: {
      leagueId: primary?.leagueId ?? opts.leagueId ?? null, leagueName: league?.name ?? null,
      season: primary?.season ?? opts.season ?? null, grade: primary?.grade ?? opts.grade ?? null,
      source: (opts.source as string) ?? 'MIXED', status: 'STAGED', fileName: opts.fileName ?? null, batchLabel: opts.batchLabel ?? null,
      totalRows: preview.totalRows, reviewRaised: preview.review,
      warnings: preview.unknownClubs.length ? JSON.stringify(preview.unknownClubs.map(c => `unknown club: ${c}`)) : null,
      stagedRows: JSON.stringify(rows), report: JSON.stringify({ ...preview, rows: undefined }),
      createdBy: opts.createdBy ?? 'admin',
    },
  })
  // Per-row provenance + fingerprints.
  await prisma.seasonImportRow.createMany({
    data: preview.rows.map(r => ({
      importId: imp.id, rowIndex: r.idx, sourceFile: opts.fileName ?? null,
      fingerprint: fingerprintRow({ leagueId: r.leagueId, season: r.season, grade: r.grade, round: r.round, homeClubName: r.homeClubName, awayClubName: r.awayClubName, homeScore: r.homeScore, awayScore: r.awayScore }),
      dedupeKey: r.dedupeKey ?? null, leagueId: r.leagueId || null, season: r.season || null, grade: r.grade || null, round: r.round,
      homeClubName: r.homeClubName || null, awayClubName: r.awayClubName || null, homeScore: r.homeScore, awayScore: r.awayScore,
      status: r.status, issues: r.issues.length ? JSON.stringify(r.issues) : null,
    })),
  }).catch(e => logger.warn('season import rows insert failed', { detail: String(e) }))

  await logQualityAction('SEASON_IMPORT_STAGED', 'SeasonImport', imp.id, { totalRows: preview.totalRows, valid: preview.valid, review: preview.review }, { reason: 'season import staged', performedBy: opts.createdBy })
  return { importId: imp.id, preview }
}

export interface SeasonCommitResult {
  importId?: string
  committed: number; skipped: number; reviewRaised: number
  laddersGenerated: number; roundsReconstructed: number; timelinesBuilt: number
  leagues: string[]; groups: { leagueId: string; season: string; grade: string }[]
}

/**
 * Commit a staged import (by id) or an inline payload. Commits valid/approved
 * rows via the idempotent bulk importer, then reconstructs the season from the
 * committed results (per-round ladders + round summaries + club timelines).
 */
export async function commitSeason(input: SeasonInput & { importId?: string }, opts: SeasonIngestOptions = {}): Promise<SeasonCommitResult> {
  let rows: BulkRowInput[]
  let imp: Awaited<ReturnType<typeof prisma.seasonImport.findUnique>> | null = null
  if (input.importId) {
    imp = await prisma.seasonImport.findFirst({ where: { id: input.importId, deletedAt: null } })
    if (!imp) throw new Error('season import not found')
    if (imp.status === 'COMMITTED') throw new Error('import already committed')
    rows = JSON.parse(imp.stagedRows ?? '[]') as BulkRowInput[]
  } else {
    rows = collectRows(input)
  }

  const preview = await previewBulk({ rows }, opts)
  const groups = touchedGroups(preview.rounds)
  const commit = await commitBulk({ rows }, opts)

  // Reconstruct each touched league/season/grade from committed results.
  // (commitBulk already built the per-round ladders; here we add the round
  // summaries and per-club timelines that complete the reconstruction.)
  let roundsReconstructed = 0, timelinesBuilt = 0
  for (const g of groups) {
    try {
      const rs = await computeLeagueRoundSummaries(g.leagueId, g.season, g.grade)
      roundsReconstructed += rs.rounds
      const tl = await buildClubSeasonTimeline(g.leagueId, g.season, g.grade, opts.createdBy ?? 'admin')
      timelinesBuilt += tl.clubs
    } catch (e) { logger.warn('season reconstruct failed', { detail: String(e), group: g }) }
  }

  const result: SeasonCommitResult = {
    importId: imp?.id, committed: commit.committed, skipped: commit.skipped, reviewRaised: commit.reviewRaised,
    laddersGenerated: commit.laddersGenerated, roundsReconstructed, timelinesBuilt, leagues: commit.leagues, groups,
  }

  if (imp) {
    await prisma.seasonImport.update({
      where: { id: imp.id },
      data: { status: commit.reviewRaised > 0 ? 'PARTIAL' : 'COMMITTED', committed: commit.committed, skipped: commit.skipped, reviewRaised: commit.reviewRaised, laddersGenerated: commit.laddersGenerated, roundsReconstructed, report: JSON.stringify(result) },
    }).catch(() => {})
  }

  await logQualityAction('SEASON_IMPORT_COMMITTED', 'SeasonImport', imp?.id ?? null, result, { reason: 'season import committed + reconstructed', performedBy: opts.createdBy })
  logger.info('Season import committed', { ...result })
  return result
}

/** Rebuild ladders/summaries/timeline for one league/season/grade from results. */
export async function rebuildSeason(leagueId: string, season: string, grade = 'A Grade', createdBy = 'admin') {
  const ladders = await generatePerRoundLadders(leagueId, season, grade, createdBy)
  const summaries = await computeLeagueRoundSummaries(leagueId, season, grade)
  const timeline = await buildClubSeasonTimeline(leagueId, season, grade, createdBy)
  await logQualityAction('SEASON_REBUILD', 'League', leagueId, { season, grade, ladders: ladders.rounds, summaries: summaries.rounds, timelineClubs: timeline.clubs }, { reason: 'season rebuilt from results', performedBy: createdBy })
  return { ladders, summaries, timeline }
}

export async function getImportStatus(id: string) {
  const imp = await prisma.seasonImport.findFirst({ where: { id, deletedAt: null } })
  if (!imp) return null
  const rowCounts = await prisma.seasonImportRow.groupBy({ by: ['status'], where: { importId: id }, _count: { _all: true } }).catch(() => [])
  return { ...imp, warnings: imp.warnings ? JSON.parse(imp.warnings) : [], rowStatusCounts: Object.fromEntries(rowCounts.map(c => [c.status, c._count._all])) }
}

export async function getImportPreview(id: string) {
  const imp = await prisma.seasonImport.findFirst({ where: { id, deletedAt: null }, select: { report: true } })
  if (!imp) return null
  return imp.report ? JSON.parse(imp.report) : null
}

export async function listImports(opts: { leagueId?: string; season?: string; limit?: number } = {}) {
  return prisma.seasonImport.findMany({
    where: { deletedAt: null, ...(opts.leagueId ? { leagueId: opts.leagueId } : {}), ...(opts.season ? { season: opts.season } : {}) },
    orderBy: { createdAt: 'desc' }, take: opts.limit ?? 50,
    select: { id: true, leagueId: true, leagueName: true, season: true, grade: true, source: true, status: true, fileName: true, batchLabel: true, totalRows: true, committed: true, skipped: true, reviewRaised: true, roundsReconstructed: true, createdAt: true },
  })
}
