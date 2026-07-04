/**
 * CSV Import System (Phase 4) — validate → preview → commit
 * ─────────────────────────────────────────────────────────────────────────────
 * A fourth ingestion path alongside PlayHQ discovery, PlayHQ URL import and OCR.
 * Supports CSV for: leagues, clubs, teams, ladders, mappings, rankings.
 *
 * Two stages, always:
 *   1. previewCsv()  — parse + validate every row, return a preview with per-row
 *                      status (ok / warn / error) and messages. Writes nothing.
 *   2. commitCsv()   — apply ONLY the valid rows, respecting manual overrides and
 *                      the never-destroy rule (soft where applicable). Anonymous /
 *                      uncertain club names are flagged (warn) but still importable
 *                      by the operator's choice.
 *
 * Pure parsing + validation (no browser, no network). commit touches the DB.
 */

import { prisma } from '../db/client.js'
import { validateClubIdentity } from '../validation/club-identity.js'
import { logger } from '../utils/logger.js'

export type CsvEntity = 'leagues' | 'clubs' | 'teams' | 'ladders' | 'mappings' | 'rankings'
export type RowStatus = 'ok' | 'warn' | 'error'

export interface PreviewRow {
  index:   number                 // 1-based data row number
  data:    Record<string, string> // normalised column → value
  status:  RowStatus
  messages: string[]
}
export interface CsvPreview {
  entity:   CsvEntity
  headers:  string[]
  required: string[]
  total:    number
  okCount:  number
  warnCount: number
  errorCount: number
  rows:     PreviewRow[]
}

// ─── CSV parsing (RFC-4180-ish: quoted fields, escaped quotes, commas in quotes) ─
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = []
  let field = '', row: string[] = [], inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); records.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row) }
  const nonEmpty = records.filter(r => r.some(c => c.trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }
  const headers = nonEmpty[0].map(h => h.trim())
  return { headers, rows: nonEmpty.slice(1) }
}

const norm = (s: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

// Column aliases per entity: canonical field → accepted header names.
const SCHEMAS: Record<CsvEntity, { required: string[]; fields: Record<string, string[]> }> = {
  leagues: {
    required: ['name'],
    fields: { name: ['name', 'league', 'leaguename'], state: ['state', 'st'], region: ['region'], strength: ['strength', 'rating'], website: ['website', 'url'], facebook: ['facebook', 'fb'] },
  },
  clubs: {
    required: ['name'],
    fields: { name: ['name', 'club', 'clubname'], state: ['state', 'st'], town: ['town', 'townname'], league: ['league', 'leaguename', 'leagueid'], logo: ['logo', 'logourl'], website: ['website', 'url'] },
  },
  teams: {
    required: ['club', 'league'],
    fields: { club: ['club', 'clubname', 'team', 'name'], league: ['league', 'leaguename', 'leagueid'], season: ['season'], grade: ['grade'] },
  },
  ladders: {
    required: ['league', 'team'],
    fields: { league: ['league', 'leaguename', 'leagueid'], team: ['team', 'club', 'name'], position: ['position', 'rank', 'pos'], played: ['played', 'p', 'gp'], wins: ['wins', 'w'], losses: ['losses', 'loss', 'l'], draws: ['draws', 'd'], goalsFor: ['goalsfor', 'gf', 'for', 'f'], goalsAgainst: ['goalsagainst', 'ga', 'against', 'a'], percentage: ['percentage', 'pct', 'percent'], points: ['points', 'pts'], season: ['season'], grade: ['grade'] },
  },
  mappings: {
    required: ['alias', 'canonical'],
    fields: { alias: ['alias', 'rawname', 'variant', 'from'], canonical: ['canonical', 'club', 'clubname', 'to'], source: ['source', 'sourcetype'] },
  },
  rankings: {
    required: ['club'],
    fields: { club: ['club', 'clubname', 'name'], bestRank: ['bestrank', 'rank', 'nationalrank'] },
  },
}

function buildColumnMap(headers: string[], entity: CsvEntity): Record<string, number> {
  const schema = SCHEMAS[entity]
  const nh = headers.map(norm)
  const map: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(schema.fields)) {
    const idx = nh.findIndex(h => aliases.map(norm).includes(h))
    if (idx >= 0) map[field] = idx
  }
  return map
}

const isNum = (s: string) => { const c = (s ?? '').replace(/[^\d.-]/g, ''); return c !== '' && !isNaN(Number(c)) }

// ─── Preview ──────────────────────────────────────────────────────────────────
export function previewCsv(entity: CsvEntity, text: string): CsvPreview {
  const { headers, rows } = parseCsv(text)
  const schema = SCHEMAS[entity]
  const colMap = buildColumnMap(headers, entity)
  const missingRequired = schema.required.filter(r => colMap[r] == null)

  const previewRows: PreviewRow[] = rows.map((cells, i) => {
    const data: Record<string, string> = {}
    for (const [field, idx] of Object.entries(colMap)) data[field] = (cells[idx] ?? '').trim()
    const messages: string[] = []
    let status: RowStatus = 'ok'

    // Missing header columns → every row errors (reported once via header note too)
    if (missingRequired.length) { status = 'error'; messages.push(`Missing required column(s): ${missingRequired.join(', ')}`) }

    for (const r of schema.required) {
      if (colMap[r] != null && !data[r]) { status = 'error'; messages.push(`Empty required field: ${r}`) }
    }

    // Numeric sanity for ladders/rankings
    if (entity === 'ladders') {
      for (const n of ['played', 'wins', 'losses', 'draws', 'goalsFor', 'goalsAgainst', 'points', 'position']) {
        if (data[n] && !isNum(data[n])) { status = status === 'error' ? 'error' : 'warn'; messages.push(`Non-numeric ${n}: "${data[n]}"`) }
      }
    }
    if (entity === 'clubs' || entity === 'ladders' || entity === 'teams' || entity === 'mappings') {
      const nameField = entity === 'ladders' ? 'team' : entity === 'teams' ? 'club' : entity === 'mappings' ? 'canonical' : 'name'
      const name = data[nameField]
      if (name) {
        const v = validateClubIdentity(name)
        if (v.verdict === 'ANONYMOUS') { status = status === 'error' ? 'error' : 'warn'; messages.push(`Anonymous name "${name}" — verify it belongs to a real town/club`) }
        else if (v.verdict === 'REVIEW') { status = status === 'error' ? 'error' : 'warn'; messages.push(`Ambiguous club identity "${name}"`) }
        if (v.canonical && v.canonical !== name) messages.push(`Alias → ${v.canonical}`)
      }
    }
    if (entity === 'leagues' && data.strength && (!isNum(data.strength) || Number(data.strength) < 0 || Number(data.strength) > 5)) {
      status = status === 'error' ? 'error' : 'warn'; messages.push('Strength should be 0–5')
    }
    if (status === 'ok') messages.push('OK')
    return { index: i + 1, data, status, messages }
  })

  return {
    entity, headers, required: schema.required, total: previewRows.length,
    okCount: previewRows.filter(r => r.status === 'ok').length,
    warnCount: previewRows.filter(r => r.status === 'warn').length,
    errorCount: previewRows.filter(r => r.status === 'error').length,
    rows: previewRows,
  }
}

// ─── Commit ───────────────────────────────────────────────────────────────────
export interface CommitResult { entity: CsvEntity; created: number; updated: number; skipped: number; warnings: string[] }

async function stateId(code: string): Promise<string> {
  const s = await prisma.state.upsert({ where: { code: code || 'VIC' }, create: { code: code || 'VIC', name: code || 'VIC' }, update: {} })
  return s.id
}
async function findLeague(ref: string) {
  if (!ref) return null
  return (await prisma.league.findUnique({ where: { id: ref } }).catch(() => null))
    ?? (await prisma.league.findFirst({ where: { name: ref } }))
}

/** Apply the valid rows of a preview. Skips error rows; warn rows import (operator confirmed). */
export async function commitCsv(entity: CsvEntity, rows: PreviewRow[]): Promise<CommitResult> {
  const result: CommitResult = { entity, created: 0, updated: 0, skipped: 0, warnings: [] }
  const importable = rows.filter(r => r.status !== 'error')
  const slugify = (name: string, suffix = '') => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (suffix ? `-${suffix}` : '')

  for (const row of importable) {
    const d = row.data
    try {
      if (entity === 'leagues') {
        const existing = await prisma.league.findFirst({ where: { name: d.name } })
        const override = d.strength && isNum(d.strength) ? Math.max(0, Math.min(5, Number(d.strength))) : null
        if (existing) {
          if (existing.manualOverride) { result.skipped++; result.warnings.push(`League "${d.name}" is manual-override protected — skipped`); continue }
          await prisma.league.update({ where: { id: existing.id }, data: { regionName: d.region || existing.regionName, websiteUrl: d.website || existing.websiteUrl, facebookUrl: d.facebook || existing.facebookUrl, ...(override != null ? { manualStrengthOverride: override } : {}), lastManualUpdateAt: new Date() } })
          result.updated++
        } else {
          const sid = await stateId(d.state)
          await prisma.league.create({ data: { name: d.name, shortName: d.name, stateId: sid, isActive: true, enabled: true, primarySource: 'CSV', importType: 'CSV', regionName: d.region || null, websiteUrl: d.website || null, facebookUrl: d.facebook || null, currentSeason: 'Winter 2026', manualStrengthOverride: override, finalStrengthRating: override ?? 3, strengthScore: (override ?? 3) * 20, strengthTier: Math.round(override ?? 3), needsStrengthReview: override == null, status: 'ACTIVE' } })
          result.created++
        }
      } else if (entity === 'clubs') {
        const v = validateClubIdentity(d.name)
        const name = v.canonical ?? d.name
        const league = d.league ? await findLeague(d.league) : null
        const sid = await stateId(d.state)
        const slug = slugify(name, league?.playhqOrgSlug ?? '')
        const existing = await prisma.club.findUnique({ where: { slug } })
        if (existing) {
          if (existing.manualOverride) { result.skipped++; continue }
          await prisma.club.update({ where: { id: existing.id }, data: { townName: d.town || existing.townName, logoUrl: d.logo || existing.logoUrl, websiteUrl: d.website || existing.websiteUrl } })
          result.updated++
        } else {
          await prisma.club.create({ data: { name, slug, shortName: d.name, stateId: sid, region: league?.name ?? null, townName: d.town || (v.isAnonymous ? null : name), logoUrl: d.logo || null, websiteUrl: d.website || null, source: 'CSV', approvalStatus: v.verdict === 'VALID' ? 'APPROVED' : 'PENDING', isActive: true } })
          result.created++
        }
      } else if (entity === 'mappings') {
        // alias → canonical club (records a ClubNameVariant on the canonical club)
        const club = await prisma.club.findFirst({ where: { name: d.canonical } })
        if (!club) { result.skipped++; result.warnings.push(`No club named "${d.canonical}" for alias "${d.alias}"`); continue }
        await prisma.clubNameVariant.upsert({ where: { rawName_sourceType: { rawName: d.alias, sourceType: d.source || 'CSV' } }, create: { clubId: club.id, rawName: d.alias, sourceType: d.source || 'CSV', confidence: 1 }, update: { clubId: club.id } })
        result.created++
      } else if (entity === 'rankings') {
        const club = await prisma.club.findFirst({ where: { name: d.club } })
        if (!club) { result.skipped++; continue }
        await prisma.club.update({ where: { id: club.id }, data: { bestRank: d.bestRank && isNum(d.bestRank) ? Number(d.bestRank) : club.bestRank } })
        result.updated++
      } else if (entity === 'teams' || entity === 'ladders') {
        const league = await findLeague(d.league)
        if (!league) { result.skipped++; result.warnings.push(`Unknown league "${d.league}"`); continue }
        const teamName = entity === 'ladders' ? d.team : d.club
        const v = validateClubIdentity(teamName)
        const name = v.canonical ?? teamName
        const sid = league.stateId
        const slug = slugify(name, league.playhqOrgSlug ?? '')
        const club = await prisma.club.upsert({ where: { slug }, create: { name, slug, shortName: teamName, stateId: sid, region: league.name, townName: v.isAnonymous ? null : name, source: 'CSV', approvalStatus: v.verdict === 'VALID' ? 'APPROVED' : 'PENDING', isActive: true }, update: {}, select: { id: true } })
        const season = d.season || '2026'
        const grade = d.grade || 'A Grade'
        const num = (s: string) => s && isNum(s) ? Math.round(Number(s.replace(/[^\d.-]/g, ''))) : 0
        const flt = (s: string) => s && isNum(s) ? Number(s.replace(/[^\d.-]/g, '')) : 0
        await prisma.clubLeagueSeason.upsert({
          where: { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season, grade } },
          create: { clubId: club.id, leagueId: league.id, season, grade, isActive: true, position: num(d.position), played: num(d.played), wins: num(d.wins), losses: num(d.losses), draws: num(d.draws), goalsFor: num(d.goalsFor), goalsAgainst: num(d.goalsAgainst), percentage: flt(d.percentage), points: num(d.points) },
          update: entity === 'ladders' ? { position: num(d.position), played: num(d.played), wins: num(d.wins), losses: num(d.losses), draws: num(d.draws), goalsFor: num(d.goalsFor), goalsAgainst: num(d.goalsAgainst), percentage: flt(d.percentage), points: num(d.points) } : { isActive: true },
        })
        result.updated++
      }
    } catch (e) {
      result.skipped++
      result.warnings.push(`Row ${row.index}: ${String(e).slice(0, 120)}`)
    }
  }
  logger.info('CSVImport: committed', { ...result, warnings: result.warnings.length })
  return result
}
