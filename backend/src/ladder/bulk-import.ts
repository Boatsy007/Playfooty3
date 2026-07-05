/**
 * Bulk results import + season backfill (Ladder Import V2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Upload many rounds at once (structured rows, CSV text, or pasted lines). The
 * backend parses, groups by league/season/grade/round, resolves clubs, detects
 * unknown/duplicate/impossible/inconsistent rows, raises review items for the
 * uncertain, then (on commit) writes valid rows via the existing idempotent
 * result upsert and builds generated ladders. Idempotent: re-uploading the same
 * result never duplicates it; a changed score is flagged for review unless an
 * admin explicitly approves replacing it.
 */

import { prisma } from '../db/client.js'
import { upsertResult, resultDedupeKey } from '../results/results.service.js'
import { clubsBelongToLeague, isValidRound } from '../results/rounds.js'
import { computeStandings, ladderPoints, generatePerRoundLadders } from './generate.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export interface BulkRowInput {
  leagueId?: string; league?: string; season?: string; grade?: string; round?: number | string
  date?: string; homeClubId?: string; homeClub?: string; awayClubId?: string; awayClub?: string
  homeScore?: number | string; awayScore?: number | string; venue?: string; source?: string
}

export interface BulkOptions { leagueId?: string; season?: string; grade?: string; source?: string; approveReplace?: boolean; setCurrent?: boolean; performedBy?: string }

interface NormRow {
  idx: number; leagueId: string; season: string; grade: string; round: number | null; date: Date | null
  homeClubId: string | null; homeClubName: string; awayClubId: string | null; awayClubName: string
  homeScore: number | null; awayScore: number | null; venue: string | null; source: string
  issues: string[]; dedupeKey?: string; status: 'VALID' | 'REVIEW' | 'INVALID' | 'DUPLICATE' | 'CORRECTION'
}

const toInt = (v: unknown): number | null => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseInt(String(v), 10); return Number.isFinite(n) ? n : null }
const toDate = (v: unknown): Date | null => { if (!v) return null; const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d }
const normName = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Parse a CSV / pasted-text blob into rows. Flexible headers; comma or tab. */
export function parseCsv(text: string): BulkRowInput[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sep = lines[0].includes('\t') ? '\t' : ','
  const header = lines[0].split(sep).map(h => normName(h))
  const col = (names: string[]) => header.findIndex(h => names.includes(h))
  const idx = {
    league: col(['league', 'competition']), season: col(['season', 'year']), grade: col(['grade', 'division']), round: col(['round', 'rnd']),
    date: col(['date', 'matchdate']), home: col(['home', 'homeclub', 'hometeam']), away: col(['away', 'awayclub', 'awayteam']),
    hs: col(['homescore', 'homegoals', 'hs']), as: col(['awayscore', 'awaygoals', 'as']), venue: col(['venue', 'ground']),
  }
  const out: BulkRowInput[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(sep).map(s => s.trim())
    const g = (k: number) => (k >= 0 ? c[k] : undefined)
    if (!g(idx.home) && !g(idx.away)) continue
    out.push({ league: g(idx.league), season: g(idx.season), grade: g(idx.grade), round: g(idx.round), date: g(idx.date), homeClub: g(idx.home), awayClub: g(idx.away), homeScore: g(idx.hs), awayScore: g(idx.as), venue: g(idx.venue) })
  }
  return out
}

async function resolveLeague(row: BulkRowInput, opts: BulkOptions): Promise<{ id: string; name: string } | null> {
  const id = row.leagueId ?? opts.leagueId
  if (id) { const l = await prisma.league.findUnique({ where: { id }, select: { id: true, name: true } }).catch(() => null); if (l) return l }
  const name = row.league
  if (name) { const l = await prisma.league.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true, name: true } }).catch(() => null); if (l) return l }
  return null
}

async function resolveClub(nameOrId: string | undefined, id: string | undefined): Promise<{ clubId: string | null; clubName: string }> {
  if (id) { const c = await prisma.club.findUnique({ where: { id }, select: { id: true, name: true } }).catch(() => null); if (c) return { clubId: c.id, clubName: c.name } }
  const name = (nameOrId ?? '').trim()
  if (!name) return { clubId: null, clubName: '' }
  const byName = await prisma.club.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, archivedAt: null }, select: { id: true, name: true } }).catch(() => null)
  if (byName) return { clubId: byName.id, clubName: byName.name }
  const alias = await prisma.clubAlias.findUnique({ where: { normalizedAlias: normName(name) }, select: { clubId: true } }).catch(() => null)
  if (alias) { const c = await prisma.club.findUnique({ where: { id: alias.clubId }, select: { id: true, name: true } }).catch(() => null); if (c) return { clubId: c.id, clubName: c.name } }
  return { clubId: null, clubName: name } // unknown club — keep name for review
}

/** Normalise + validate every row (no writes). Detects in-batch + DB duplicates. */
async function normalizeAndValidate(rows: BulkRowInput[], opts: BulkOptions): Promise<NormRow[]> {
  const out: NormRow[] = []
  const seen = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const issues: string[] = []
    const league = await resolveLeague(r, opts)
    const season = (r.season ?? opts.season ?? '').trim()
    const grade = (r.grade ?? opts.grade ?? 'A Grade').trim()
    const round = toInt(r.round)
    const home = await resolveClub(r.homeClub, r.homeClubId)
    const away = await resolveClub(r.awayClub, r.awayClubId)
    const hs = toInt(r.homeScore); const as = toInt(r.awayScore)

    if (!league) issues.push('unknown league')
    if (!season) issues.push('missing season')
    if (!isValidRound(round)) issues.push('invalid round')
    if (round == null) issues.push('missing round')
    if (!home.clubId) issues.push(`unknown home club "${home.clubName}"`)
    if (!away.clubId) issues.push(`unknown away club "${away.clubName}"`)
    if (home.clubId && away.clubId && home.clubId === away.clubId) issues.push('home and away are the same club')
    if (hs == null || as == null) issues.push('missing/invalid scores')
    else if (hs < 0 || as < 0 || hs > 400 || as > 400) issues.push('impossible score (out of 0–400)')
    if (league && home.clubId && away.clubId) {
      const belong = await clubsBelongToLeague(league.id, home.clubId, away.clubId)
      if (!belong.ok) issues.push(`club(s) not in league: ${belong.missing.join(', ')}`)
    }

    let dedupeKey: string | undefined
    let status: NormRow['status'] = issues.length ? (issues.some(x => x.includes('unknown') || x.includes('not in league')) ? 'REVIEW' : 'INVALID') : 'VALID'
    if (league && home.clubId && away.clubId && season) {
      dedupeKey = resultDedupeKey(league.id, season, round, home.clubId, away.clubId)
      if (seen.has(dedupeKey)) { status = 'DUPLICATE'; issues.push('duplicate within this batch') }
      else {
        seen.add(dedupeKey)
        const existing = await prisma.matchResult.findUnique({ where: { dedupeKey }, select: { homeScore: true, awayScore: true, manualOverride: true } })
        if (existing) {
          if (hs != null && as != null && (existing.homeScore !== hs || existing.awayScore !== as)) {
            status = opts.approveReplace ? 'CORRECTION' : 'REVIEW'
            issues.push(opts.approveReplace ? 'score correction (approved)' : 'score differs from existing result — needs approval to replace')
          } else { status = 'DUPLICATE'; issues.push('already imported (idempotent skip)') }
        }
      }
    }

    out.push({ idx: i, leagueId: league?.id ?? '', season, grade, round, date: toDate(r.date), homeClubId: home.clubId, homeClubName: home.clubName, awayClubId: away.clubId, awayClubName: away.clubName, homeScore: hs, awayScore: as, venue: r.venue ?? null, source: r.source ?? opts.source ?? 'CSV', issues, dedupeKey, status })
  }
  return out
}

function group(rows: NormRow[]) {
  const g = new Map<string, NormRow[]>()
  for (const r of rows) { const k = `${r.leagueId}|${r.season}|${r.grade}|${r.round ?? 'x'}`; const a = g.get(k) ?? []; a.push(r); g.set(k, a) }
  return g
}

export interface BulkPreview {
  totalRows: number
  valid: number; review: number; invalid: number; duplicate: number; corrections: number
  unknownClubs: string[]
  rounds: { leagueId: string; season: string; grade: string; round: number | null; matches: number; valid: number; issues: number }[]
  generatedLadderPreview: ReturnType<typeof computeStandings>
  rows: NormRow[]
}

/** Preview a bulk upload without writing anything. */
export async function previewBulk(input: { rows?: BulkRowInput[]; csv?: string }, opts: BulkOptions = {}): Promise<BulkPreview> {
  const rows = [...(input.rows ?? []), ...(input.csv ? parseCsv(input.csv) : [])]
  const norm = await normalizeAndValidate(rows, opts)
  const grouped = group(norm)
  const cfg = await ladderPoints()
  const committable = norm.filter(r => (r.status === 'VALID' || r.status === 'CORRECTION') && r.homeClubId && r.awayClubId && r.homeScore != null && r.awayScore != null)
  const ladderPreview = computeStandings(committable.map(r => ({ homeClubId: r.homeClubId!, homeClubName: r.homeClubName, awayClubId: r.awayClubId!, awayClubName: r.awayClubName, homeScore: r.homeScore!, awayScore: r.awayScore!, isDraw: r.homeScore === r.awayScore, winnerClubId: null, round: r.round, matchDate: r.date })), cfg)
  return {
    totalRows: norm.length,
    valid: norm.filter(r => r.status === 'VALID').length, review: norm.filter(r => r.status === 'REVIEW').length,
    invalid: norm.filter(r => r.status === 'INVALID').length, duplicate: norm.filter(r => r.status === 'DUPLICATE').length,
    corrections: norm.filter(r => r.status === 'CORRECTION').length,
    unknownClubs: [...new Set(norm.flatMap(r => [!r.homeClubId ? r.homeClubName : null, !r.awayClubId ? r.awayClubName : null]).filter((x): x is string => !!x))],
    rounds: [...grouped.entries()].map(([, rs]) => ({ leagueId: rs[0].leagueId, season: rs[0].season, grade: rs[0].grade, round: rs[0].round, matches: rs.length, valid: rs.filter(r => r.status === 'VALID' || r.status === 'CORRECTION').length, issues: rs.filter(r => r.status === 'REVIEW' || r.status === 'INVALID').length })),
    generatedLadderPreview: ladderPreview,
    rows: norm,
  }
}

export interface BulkCommitReport { committed: number; skipped: number; reviewRaised: number; laddersGenerated: number; leagues: string[] }

/** Commit valid/approved rows + generate ladders. Idempotent; review-safe. */
export async function commitBulk(input: { rows?: BulkRowInput[]; csv?: string }, opts: BulkOptions = {}): Promise<BulkCommitReport> {
  const rows = [...(input.rows ?? []), ...(input.csv ? parseCsv(input.csv) : [])]
  const norm = await normalizeAndValidate(rows, opts)
  const report: BulkCommitReport = { committed: 0, skipped: 0, reviewRaised: 0, laddersGenerated: 0, leagues: [] }
  const touched = new Set<string>() // leagueId|season|grade

  for (const r of norm) {
    if ((r.status === 'REVIEW' || r.status === 'INVALID' || r.status === 'DUPLICATE') && r.status !== 'DUPLICATE') {
      // Raise a review item for uncertain rows (unknown club / correction needing approval).
      if (r.status === 'REVIEW') {
        await prisma.reviewItem.create({ data: { entityType: 'MatchResult', kind: 'RESULT_IMPORT_REVIEW', reason: `Row ${r.idx}: ${r.issues.join('; ')}`, confidence: 0.3, payload: JSON.stringify(r) } }).catch(() => {})
        report.reviewRaised++
      }
      report.skipped++
      continue
    }
    if (r.status === 'DUPLICATE') { report.skipped++; continue }
    // VALID or CORRECTION → commit (CORRECTION uses MANUAL to force the update).
    const source = r.status === 'CORRECTION' ? 'MANUAL' : (r.source === 'PLAYHQ' || r.source === 'OCR' || r.source === 'CSV' || r.source === 'MANUAL' ? r.source : 'CSV')
    const res = await upsertResult({ leagueId: r.leagueId, season: r.season, grade: r.grade, round: r.round ?? undefined, matchDate: r.date ?? undefined, homeClubId: r.homeClubId!, homeClubName: r.homeClubName, awayClubId: r.awayClubId!, awayClubName: r.awayClubName, homeScore: r.homeScore!, awayScore: r.awayScore! }, source as 'PLAYHQ' | 'OCR' | 'CSV' | 'MANUAL', { raiseReview: false })
    if (res.ok && (res.status === 'created' || res.status === 'updated')) { report.committed++; touched.add(`${r.leagueId}|${r.season}|${r.grade}`) } else report.skipped++
  }

  // Build generated ladders for every league/season/grade touched.
  for (const key of touched) {
    const [leagueId, season, grade] = key.split('|')
    try { const g = await generatePerRoundLadders(leagueId, season, grade, opts.performedBy ?? 'admin'); report.laddersGenerated += g.rounds; if (!report.leagues.includes(leagueId)) report.leagues.push(leagueId) }
    catch (e) { logger.warn('ladder gen after bulk failed', { detail: String(e) }) }
  }

  await logQualityAction('BULK_IMPORT_RESULTS', 'MatchResult', null, report, { reason: 'bulk results import + ladder generation', performedBy: opts.performedBy })
  logger.info('Bulk import complete', { ...report })
  return report
}
