/**
 * Admin Platform API — dashboard, national recalculation, review queue, backups.
 * Password-guarded. Mounted at /admin/platform.
 */

import { Router }          from 'express'
import { createHash }      from 'node:crypto'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { recalculateNational } from '../jobs/recompute-strength.js'
import { parsePlayHQUrl }   from '../discovery/playhq-url.js'
import { dispatchWorkflow, listRuns, getRun, githubConfig } from '../integrations/github-dispatch.js'
import { previewCsv, commitCsv, type CsvEntity, type PreviewRow } from '../jobs/csv-import.js'
import { createBackup } from '../jobs/backup.js'
import { sweepDataQuality } from '../jobs/data-quality.js'
import { generateWeeklyDrafts } from '../jobs/generate-articles.js'
import { smartIngestFootballUrl, type SmartDataType } from './smart-ingest.js'
import { logger }          from '../utils/logger.js'

// Workflow files (the browser-backed execution engine on GitHub Actions).
const WF_URL_IMPORT = 'playhq-url-import.yml'
const WF_DISCOVER   = 'discover-import.yml'

const router = Router()
router.use(requireAdminKey)

const FOOTBALL_SOURCES = ['PLAYHQ_API', 'PLAYHQ_SCRAPER', 'CSV_UPLOAD', 'OCR_UPLOAD', 'MANUAL_ENTRY'] as const
const FOOTBALL_DATA_TYPES = ['FIXTURES', 'RESULTS', 'LADDER', 'TEAMS', 'GRADES', 'ROUNDS'] as const
type FootballSource = typeof FOOTBALL_SOURCES[number]
type FootballDataType = typeof FOOTBALL_DATA_TYPES[number]
type FootballRow = Record<string, unknown>

const isFootballSource = (v: unknown): v is FootballSource => typeof v === 'string' && (FOOTBALL_SOURCES as readonly string[]).includes(v)
const isFootballDataType = (v: unknown): v is FootballDataType => typeof v === 'string' && (FOOTBALL_DATA_TYPES as readonly string[]).includes(v)
const stableHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex')
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback
const str = (v: unknown, fallback = '') => typeof v === 'string' && v.trim() ? v.trim() : fallback
const footballPoints = (goals: unknown, behinds: unknown, total?: unknown) => Number.isFinite(Number(total)) ? Number(total) : (num(goals) * 6) + num(behinds)
const slugify = (v: string) => v.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'club'

function sourceFlags(primary?: string | null, fallbacks?: string[]) {
  const set = new Set([primary, ...(fallbacks ?? [])].filter(Boolean))
  return {
    apiEnabled: set.has('PLAYHQ_API'),
    scrapeEnabled: set.has('PLAYHQ_SCRAPER'),
    manualEntryEnabled: set.has('MANUAL_ENTRY') || set.has('CSV_UPLOAD') || set.has('OCR_UPLOAD'),
  }
}

async function createFootballReview(leagueId: string, kind: string, reason: string, payload: unknown, confidence = 0.5) {
  await prisma.reviewItem.create({
    data: { entityType: 'FootballData', entityId: leagueId, kind, reason, confidence, payload: JSON.stringify(payload) },
  }).catch(e => logger.warn('football review item failed', { detail: String(e) }))
}

function generateFootballLadder(rows: { homeName: string; awayName: string; homePoints: number; awayPoints: number }[]) {
  const table = new Map<string, { clubName: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; premiershipPoints: number }>()
  const ensure = (clubName: string) => {
    if (!table.has(clubName)) table.set(clubName, { clubName, played: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, premiershipPoints: 0 })
    return table.get(clubName)!
  }
  for (const r of rows) {
    const h = ensure(r.homeName), a = ensure(r.awayName)
    h.played++; a.played++
    h.pointsFor += r.homePoints; h.pointsAgainst += r.awayPoints
    a.pointsFor += r.awayPoints; a.pointsAgainst += r.homePoints
    if (r.homePoints > r.awayPoints) { h.wins++; a.losses++; h.premiershipPoints += 4 }
    else if (r.homePoints < r.awayPoints) { a.wins++; h.losses++; a.premiershipPoints += 4 }
    else { h.draws++; a.draws++; h.premiershipPoints += 2; a.premiershipPoints += 2 }
  }
  return [...table.values()]
    .map(r => ({ ...r, percentage: r.pointsAgainst > 0 ? (r.pointsFor / r.pointsAgainst) * 100 : r.pointsFor > 0 ? 100 : 0 }))
    .sort((a, b) => b.premiershipPoints - a.premiershipPoints || b.percentage - a.percentage || b.pointsFor - a.pointsFor)
    .map((r, i) => ({ ...r, position: i + 1 }))
}

async function audit(action: string, entityType: string, entityId: string | null, after: unknown, source = 'ADMIN') {
  try {
    const u = await prisma.adminUser.upsert({ where: { email: 'admin@cnca.local' }, update: {}, create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' } })
    await prisma.auditLog.create({ data: { userId: u.id, action, entityType, entityId, after: after ? JSON.stringify(after) : null, source } })
  } catch (e) { logger.warn('platform audit failed', { detail: String(e) }) }
}

async function ensureFootballClubMembership(league: { id: string; stateId: string; regionName?: string | null; name: string }, clubName: string, season: string, grade: string, source: string) {
  const name = clubName.trim()
  if (!name) return null
  const base = slugify(name)
  let slug = base
  let i = 2
  while (true) {
    const existing = await prisma.club.findUnique({ where: { slug } })
    if (!existing || existing.name.toLowerCase() === name.toLowerCase()) break
    slug = `${base}-${i++}`
  }
  const club = await prisma.club.upsert({
    where: { slug },
    create: { name, slug, shortName: name, stateId: league.stateId, region: league.regionName ?? league.name, townName: name, source, approvalStatus: 'APPROVED' },
    update: { isActive: true, archivedAt: null },
  })
  await prisma.clubLeagueSeason.upsert({
    where: { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season, grade } },
    create: { clubId: club.id, leagueId: league.id, season, grade, isActive: true },
    update: { isActive: true },
  })
  return club
}

async function commitFootballRows(league: { id: string; stateId: string; regionName?: string | null; name: string; sourceUrl?: string | null }, source: string, dataType: SmartDataType | FootballDataType, rows: FootballRow[], dryRun: boolean, sourceUrl?: string, confidence?: number, payloadHash?: string) {
  const hashValue = payloadHash ?? stableHash({ source, dataType, rows })
  const imp = await prisma.footballDataImport.upsert({
    where: { leagueId_sourceType_dataType_payloadHash: { leagueId: league.id, sourceType: source, dataType, payloadHash: hashValue } },
    create: { leagueId: league.id, sourceType: source, dataType, sourceUrl: sourceUrl || league.sourceUrl, payloadHash: hashValue, dryRun, status: dryRun ? 'PREVIEWED' : 'COMMITTED', recordsFound: rows.length, confidence: confidence ?? (source === 'MANUAL_ENTRY' ? 0.9 : 0.65), payload: JSON.stringify(rows), scrapedAt: source.startsWith('PLAYHQ') ? new Date() : null },
    update: { dryRun, status: dryRun ? 'PREVIEWED' : 'COMMITTED', recordsFound: rows.length, payload: JSON.stringify(rows), scrapedAt: source.startsWith('PLAYHQ') ? new Date() : undefined },
  })
  if (dryRun) return { importId: imp.id, status: imp.status, recordsFound: rows.length, recordsImported: 0 }

  let imported = 0
  if (dataType === 'FIXTURES') {
    for (const r of rows) {
      const season = str(r.season, '2026'), grade = str(r.grade, 'Senior Football')
      const homeName = str(r.homeName ?? r.home), awayName = str(r.awayName ?? r.away)
      const homeClub = await ensureFootballClubMembership(league, homeName, season, grade, source)
      const awayClub = await ensureFootballClubMembership(league, awayName, season, grade, source)
      await prisma.footballFixture.upsert({
        where: { leagueId_season_grade_round_homeName_awayName: { leagueId: league.id, season, grade, round: str(r.round, 'Round TBC'), homeName, awayName } },
        create: { leagueId: league.id, season, grade, round: str(r.round, 'Round TBC'), homeClubId: homeClub?.id ?? null, awayClubId: awayClub?.id ?? null, homeName, awayName, matchDate: r.matchDate ? new Date(String(r.matchDate)) : null, venue: str(r.venue, ''), sourceType: source, sourceUrl: sourceUrl || league.sourceUrl, verified: source === 'MANUAL_ENTRY' },
        update: { homeClubId: homeClub?.id ?? null, awayClubId: awayClub?.id ?? null, matchDate: r.matchDate ? new Date(String(r.matchDate)) : null, venue: str(r.venue, ''), sourceType: source, verified: source === 'MANUAL_ENTRY' },
      }); imported++
    }
  } else if (dataType === 'RESULTS') {
    for (const r of rows) {
      const season = str(r.season, '2026'), grade = str(r.grade, 'Senior Football')
      const homeName = str(r.homeName ?? r.home), awayName = str(r.awayName ?? r.away)
      const homeClub = await ensureFootballClubMembership(league, homeName, season, grade, source)
      const awayClub = await ensureFootballClubMembership(league, awayName, season, grade, source)
      const homeGoals = num(r.homeGoals), homeBehinds = num(r.homeBehinds), awayGoals = num(r.awayGoals), awayBehinds = num(r.awayBehinds)
      await prisma.footballResult.upsert({
        where: { leagueId_season_grade_round_homeName_awayName: { leagueId: league.id, season, grade, round: str(r.round, 'Round TBC'), homeName, awayName } },
        create: { leagueId: league.id, season, grade, round: str(r.round, 'Round TBC'), homeClubId: homeClub?.id ?? null, awayClubId: awayClub?.id ?? null, homeName, awayName, homeGoals, homeBehinds, homePoints: footballPoints(homeGoals, homeBehinds, r.homePoints), awayGoals, awayBehinds, awayPoints: footballPoints(awayGoals, awayBehinds, r.awayPoints), matchDate: r.matchDate ? new Date(String(r.matchDate)) : null, venue: str(r.venue, ''), sourceType: source, sourceUrl: sourceUrl || league.sourceUrl, verified: source === 'MANUAL_ENTRY', published: false },
        update: { homeClubId: homeClub?.id ?? null, awayClubId: awayClub?.id ?? null, homeGoals, homeBehinds, homePoints: footballPoints(homeGoals, homeBehinds, r.homePoints), awayGoals, awayBehinds, awayPoints: footballPoints(awayGoals, awayBehinds, r.awayPoints), sourceType: source, verified: source === 'MANUAL_ENTRY' },
      }); imported++
    }
  } else if (dataType === 'LADDER') {
    for (const r of rows) {
      const season = str(r.season, '2026'), grade = str(r.grade, 'Senior Football'), clubName = str(r.clubName ?? r.club)
      const club = await ensureFootballClubMembership(league, clubName, season, grade, source)
      await prisma.footballLadderEntry.upsert({
        where: { leagueId_season_grade_clubName: { leagueId: league.id, season, grade, clubName } },
        create: { leagueId: league.id, season, grade, clubId: club?.id ?? null, clubName, position: num(r.position, imported + 1), played: num(r.played), wins: num(r.wins), losses: num(r.losses), draws: num(r.draws), pointsFor: num(r.pointsFor), pointsAgainst: num(r.pointsAgainst), percentage: num(r.percentage), premiershipPoints: num(r.premiershipPoints ?? r.points), sourceType: source, verified: source === 'MANUAL_ENTRY', published: false },
        update: { clubId: club?.id ?? null, position: num(r.position, imported + 1), played: num(r.played), wins: num(r.wins), losses: num(r.losses), draws: num(r.draws), pointsFor: num(r.pointsFor), pointsAgainst: num(r.pointsAgainst), percentage: num(r.percentage), premiershipPoints: num(r.premiershipPoints ?? r.points), sourceType: source, verified: source === 'MANUAL_ENTRY' },
      }); imported++
    }
  }
  await prisma.footballDataImport.update({ where: { id: imp.id }, data: { recordsImported: imported } })
  return { importId: imp.id, status: 'COMMITTED', recordsFound: rows.length, recordsImported: imported }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (_req, res) => {
  const [leaguesActive, leaguesArchived, clubs, clubsArchived, teams, pendingReviews, ocrImports, lastRun, recentLeagues, recentClubs, flaggedLeagues] = await Promise.all([
    prisma.league.count({ where: { isActive: true, archivedAt: null } }),
    prisma.league.count({ where: { archivedAt: { not: null } } }),
    prisma.club.count({ where: { archivedAt: null } }),
    prisma.club.count({ where: { archivedAt: { not: null } } }),
    prisma.clubLeagueSeason.count({ where: { isActive: true } }),
    prisma.reviewItem.count({ where: { status: 'PENDING' } }),
    prisma.ocrImport.count(),
    prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, select: { weekLabel: true, completedAt: true, clubCount: true } }),
    prisma.league.findMany({ where: { lastManualUpdateAt: { not: null } }, orderBy: { lastManualUpdateAt: 'desc' }, take: 8, select: { id: true, name: true, lastManualUpdateAt: true, status: true } }),
    prisma.club.findMany({ orderBy: { updatedAt: 'desc' }, take: 8, select: { id: true, name: true, updatedAt: true } }),
    prisma.league.findMany({ where: { OR: [{ needsStrengthReview: true }, { syncError: { not: null } }], isActive: true }, select: { id: true, name: true, syncError: true, needsStrengthReview: true, strengthConfidence: true } }),
  ])
  const lastScrape = await prisma.leagueSource.findFirst({ where: { lastScrapedAt: { not: null } }, orderBy: { lastScrapedAt: 'desc' }, select: { lastScrapedAt: true, sourceType: true } })
  res.json({ data: {
    counts: { leaguesActive, leaguesArchived, clubs, clubsArchived, teams, pendingReviews, ocrImports },
    lastRun, lastScrape,
    warnings: flaggedLeagues.length,
    recentLeagues, recentClubs, flaggedLeagues,
  } })
})

// ─── Audit log ───────────────────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 200, 500)
  const entity = req.query.entityType as string | undefined
  const logs = await prisma.auditLog.findMany({
    where: entity ? { entityType: entity } : {},
    orderBy: { createdAt: 'desc' }, take,
    select: { id: true, action: true, entityType: true, entityId: true, source: true, reason: true, before: true, after: true, createdAt: true, user: { select: { email: true, name: true } } },
  })
  res.json({ data: logs })
})

// ─── Settings (key/value) ────────────────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
  res.json({ data: rows })
})
router.post('/settings', async (req, res) => {
  const { key, value } = req.body as { key?: string; value?: string }
  if (!key) return res.status(400).json({ error: 'key required' })
  const row = await prisma.setting.upsert({ where: { key }, update: { value: value ?? '' }, create: { key, value: value ?? '' } })
  await audit('SET_SETTING', 'Setting', key, { value })
  res.json({ data: row })
})

// ─── Execution engine status ──────────────────────────────────────────────────
// The admin panel dispatches browser-backed work to GitHub Actions (Playwright
// cannot run inside Vercel). These endpoints expose config + run status so the
// UI can stay one-click and poll results.
router.get('/engine', async (_req, res) => {
  const cfg = githubConfig()
  res.json({ data: { repo: cfg.repo, ref: cfg.ref, configured: cfg.hasToken } })
})
router.get('/engine/runs', async (req, res) => {
  const file = (req.query.workflow as string) || WF_URL_IMPORT
  try { res.json({ data: await listRuns(file, Math.min(Number(req.query.limit) || 10, 30)) }) }
  catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'failed to list runs' }) }
})
router.get('/engine/runs/:id', async (req, res) => {
  try { res.json({ data: await getRun(Number(req.params.id)) }) }
  catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'failed to get run' }) }
})

// ─── PlayHQ URL import (Phase 1) — dispatched to GitHub Actions ───────────────
// Preview: classify a pasted URL without importing (instant, local, no browser).
router.post('/playhq/classify', async (req, res) => {
  const { url } = req.body as { url?: string }
  if (!url) return res.status(400).json({ error: 'url required' })
  res.json({ data: parsePlayHQUrl(url) })
})
// Import: dispatch the browser-backed import workflow with the pasted URL.
router.post('/playhq/import', async (req, res) => {
  const { url } = req.body as { url?: string }
  if (!url) return res.status(400).json({ error: 'url required' })
  const parsed = parsePlayHQUrl(url)
  if (!parsed.ok || !parsed.orgSlug) return res.status(400).json({ error: parsed.warnings.join('; ') || 'Could not parse PlayHQ URL' })
  try {
    const out = await dispatchWorkflow(WF_URL_IMPORT, { url })
    await audit('PLAYHQ_URL_IMPORT_DISPATCH', 'League', null, { url, runId: out.run?.id ?? null }, 'PLAYHQ_URL')
    res.status(202).json({ data: { ...out, kind: parsed.kind } })
  } catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'dispatch failed' }) }
})

// ─── League sync (Phase 10) — dispatched to GitHub Actions ────────────────────
router.post('/leagues/:id/sync', async (req, res) => {
  try {
    const out = await dispatchWorkflow(WF_URL_IMPORT, { sync_league_id: req.params.id })
    await audit('SYNC_LEAGUE_DISPATCH', 'League', req.params.id, { runId: out.run?.id ?? null }, 'PLAYHQ_SYNC')
    res.status(202).json({ data: out })
  } catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'dispatch failed' }) }
})
// Sync every league that has a stored PlayHQ URL (weekly refresh).
router.post('/playhq/sync-all', async (_req, res) => {
  try {
    const out = await dispatchWorkflow(WF_URL_IMPORT, { sync_all: 'true' })
    await audit('SYNC_ALL_DISPATCH', 'League', null, { runId: out.run?.id ?? null }, 'PLAYHQ_SYNC')
    res.status(202).json({ data: out })
  } catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'dispatch failed' }) }
})
// Discovery scrape (crawl PlayHQ + import discovered A-Grade leagues).
router.post('/playhq/discover', async (req, res) => {
  const { assocFilter, maxAssociations } = req.body as { assocFilter?: string; maxAssociations?: string }
  try {
    const inputs: Record<string, string> = {}
    if (assocFilter) inputs.assoc_filter = assocFilter
    if (maxAssociations) inputs.max_associations = String(maxAssociations)
    const out = await dispatchWorkflow(WF_DISCOVER, inputs)
    await audit('DISCOVERY_DISPATCH', 'League', null, { runId: out.run?.id ?? null, assocFilter, maxAssociations }, 'PLAYHQ_DISCOVERY')
    res.status(202).json({ data: out })
  } catch (err) { res.status(502).json({ error: err instanceof Error ? err.message : 'dispatch failed' }) }
})

// ─── CSV import (Phase 4) — validate → preview → commit ──────────────────────
const CSV_ENTITIES: CsvEntity[] = ['leagues', 'clubs', 'teams', 'ladders', 'mappings', 'rankings']
router.post('/csv/preview', async (req, res) => {
  const { entity, csv } = req.body as { entity?: string; csv?: string }
  if (!entity || !CSV_ENTITIES.includes(entity as CsvEntity)) return res.status(400).json({ error: `entity must be one of ${CSV_ENTITIES.join(', ')}` })
  if (!csv) return res.status(400).json({ error: 'csv required' })
  res.json({ data: previewCsv(entity as CsvEntity, csv) })
})
router.post('/csv/commit', async (req, res) => {
  const { entity, rows } = req.body as { entity?: string; rows?: PreviewRow[] }
  if (!entity || !CSV_ENTITIES.includes(entity as CsvEntity)) return res.status(400).json({ error: 'invalid entity' })
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows required' })
  try {
    const result = await commitCsv(entity as CsvEntity, rows)
    await audit('CSV_IMPORT', entity, null, { created: result.created, updated: result.updated, skipped: result.skipped }, 'CSV')
    res.json({ data: result })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'commit failed' }) }
})

// ─── AI Publishing (Phase 4) ──────────────────────────────────────────────────
// Generate weekly drafts from the latest ranking run (real data, templated).
router.post('/articles/generate', async (_req, res) => {
  try {
    const report = await generateWeeklyDrafts()
    await audit('GENERATE_ARTICLES', 'GeneratedArticle', null, { created: report.created, updated: report.updated, week: report.weekLabel }, 'SYSTEM')
    res.json({ data: report })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'generation failed' }) }
})
// List drafts/articles by status.
router.get('/articles', async (req, res) => {
  const status = (req.query.status as string) || 'ALL'
  const items = await prisma.generatedArticle.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 200,
    select: { id: true, slug: true, kind: true, category: true, title: true, subtitle: true, summary: true, status: true, weekLabel: true, updatedAt: true, publishedAt: true },
  })
  const counts = await prisma.generatedArticle.groupBy({ by: ['status'], _count: { status: true } })
  res.json({ data: items, meta: { counts: counts.map(c => ({ status: c.status, count: c._count.status })) } })
})
router.get('/articles/:id', async (req, res) => {
  const a = await prisma.generatedArticle.findUnique({ where: { id: req.params.id } })
  if (!a) return res.status(404).json({ error: 'not found' })
  res.json({ data: a })
})
// Edit any field (operator polish before publish).
router.patch('/articles/:id', async (req, res) => {
  const b = req.body as Partial<{ title: string; subtitle: string; summary: string; body: unknown; category: string; seoTitle: string; seoDescription: string; heroSeed: string }>
  const data: Record<string, unknown> = {}
  for (const k of ['title', 'subtitle', 'summary', 'category', 'seoTitle', 'seoDescription', 'heroSeed'] as const) if (b[k] != null) data[k] = b[k]
  if (b.body != null) data.body = typeof b.body === 'string' ? b.body : JSON.stringify(b.body)
  const a = await prisma.generatedArticle.update({ where: { id: req.params.id }, data })
  await audit('EDIT_ARTICLE', 'GeneratedArticle', a.id, { title: a.title })
  res.json({ data: a })
})
// Approve / publish / unpublish / archive.
router.post('/articles/:id/status', async (req, res) => {
  const { status } = req.body as { status: 'DRAFT' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED' }
  if (!['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'].includes(status)) return res.status(400).json({ error: 'invalid status' })
  const a = await prisma.generatedArticle.update({
    where: { id: req.params.id },
    data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : undefined },
  })
  await audit(`ARTICLE_${status}`, 'GeneratedArticle', a.id, { title: a.title })
  res.json({ data: { id: a.id, status: a.status, publishedAt: a.publishedAt } })
})
// Bulk publish/approve.
router.post('/articles/bulk', async (req, res) => {
  const { ids, status } = req.body as { ids?: string[]; status?: string }
  if (!Array.isArray(ids) || ids.length === 0 || !['APPROVED', 'PUBLISHED', 'ARCHIVED', 'DRAFT'].includes(status ?? '')) return res.status(400).json({ error: 'ids and valid status required' })
  const r = await prisma.generatedArticle.updateMany({ where: { id: { in: ids } }, data: { status: status!, publishedAt: status === 'PUBLISHED' ? new Date() : undefined } })
  await audit('ARTICLES_BULK', 'GeneratedArticle', null, { status, count: r.count })
  res.json({ data: { updated: r.count, status } })
})

// ─── National recalculation ──────────────────────────────────────────────────
router.post('/recalculate', async (_req, res) => {
  const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
  if (locked) return res.status(423).json({ error: 'rankings are locked' })
  try {
    const report = await recalculateNational()
    await audit('RECALCULATE_NATIONAL', 'Ranking', null, { clubsRanked: report.clubsRanked, leagues: report.leagues.length }, 'SYSTEM')
    res.json({ data: report })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'recalc failed' }) }
})

// ─── Review queue ─────────────────────────────────────────────────────────────
router.get('/reviews', async (req, res) => {
  const status = (req.query.status as string) ?? 'PENDING'
  const kind = req.query.kind as string | undefined
  const items = await prisma.reviewItem.findMany({
    where: { ...(status === 'ALL' ? {} : { status }), ...(kind ? { kind } : {}) },
    orderBy: [{ confidence: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],   // least-confident first
    take: 300,
  })
  // Kind counts so the UI can render filter chips with badges.
  const kinds = await prisma.reviewItem.groupBy({ by: ['kind'], where: { status: 'PENDING' }, _count: { kind: true } })
  res.json({ data: items, meta: { kinds: kinds.map(k => ({ kind: k.kind, count: k._count.kind })) } })
})
router.post('/reviews', async (req, res) => {
  const b = req.body as { entityType: string; entityId?: string; kind: string; reason: string; confidence?: number; payload?: unknown }
  if (!b.entityType || !b.kind || !b.reason) return res.status(400).json({ error: 'entityType, kind, reason required' })
  const item = await prisma.reviewItem.create({ data: { entityType: b.entityType, entityId: b.entityId ?? null, kind: b.kind, reason: b.reason, confidence: b.confidence ?? null, payload: b.payload ? JSON.stringify(b.payload) : null } })
  res.status(201).json({ data: item })
})
router.post('/reviews/:id/resolve', async (req, res) => {
  const { action } = req.body as { action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED' }
  const item = await prisma.reviewItem.update({ where: { id: req.params.id }, data: { status: action, resolvedAt: new Date(), resolvedBy: 'admin' } })
  await audit('RESOLVE_REVIEW', 'ReviewItem', item.id, { action })
  res.json({ data: item })
})
// Bulk resolve — approve/ignore/reject many items in one click.
router.post('/reviews/bulk', async (req, res) => {
  const { ids, action } = req.body as { ids?: string[]; action?: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED' }
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' })
  if (!action || !['APPROVED', 'REJECTED', 'MERGED', 'IGNORED'].includes(action)) return res.status(400).json({ error: 'invalid action' })
  const result = await prisma.reviewItem.updateMany({ where: { id: { in: ids }, status: 'PENDING' }, data: { status: action, resolvedAt: new Date(), resolvedBy: 'admin' } })
  await audit('RESOLVE_REVIEWS_BULK', 'ReviewItem', null, { action, count: result.count })
  res.json({ data: { resolved: result.count, action } })
})

// ─── Data-quality sweep (Phase 5) ─────────────────────────────────────────────
// Scans for duplicate clubs, missing logos, orphan clubs and stale leagues, and
// raises review items (idempotent — pending items are never duplicated).
router.post('/quality/sweep', async (_req, res) => {
  try {
    const report = await sweepDataQuality()
    await audit('QUALITY_SWEEP', 'ReviewItem', null, report, 'SYSTEM')
    res.json({ data: report })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'sweep failed' }) }
})

// ─── Backups / restore points (snapshot/createBackup shared with the nightly job) ─
router.get('/backups', async (_req, res) => {
  const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, label: true, kind: true, counts: true, createdAt: true } })
  res.json({ data: backups })
})
router.post('/backups', async (req, res) => {
  const { label } = req.body as { label?: string }
  const backup = await createBackup('MANUAL', label)
  await audit('CREATE_BACKUP', 'Backup', backup.id, backup.counts)
  res.status(201).json({ data: backup })
})
// Restore reseeds core tables from a backup (upsert; takes a safety snapshot first).
router.post('/backups/:id/restore', async (req, res) => {
  const backup = await prisma.backup.findUnique({ where: { id: req.params.id } })
  if (!backup) return res.status(404).json({ error: 'not found' })
  await createBackup('PRE_RESTORE')   // safety snapshot before restore

  const d = JSON.parse(backup.data) as { states: any[]; associations: any[]; leagues: any[]; clubs: any[]; leagueSources: any[]; clubLeagueSeasons: any[] }
  let restored = 0
  for (const s of d.states)  { await prisma.state.upsert({ where: { id: s.id }, update: s, create: s }).catch(() => {}); restored++ }
  for (const a of d.associations) { await prisma.association.upsert({ where: { id: a.id }, update: a, create: a }).catch(() => {}) }
  for (const l of d.leagues) { await prisma.league.upsert({ where: { id: l.id }, update: l, create: l }).catch(() => {}) }
  for (const c of d.clubs)   { await prisma.club.upsert({ where: { id: c.id }, update: c, create: c }).catch(() => {}) }
  for (const cs of d.clubLeagueSeasons) { await prisma.clubLeagueSeason.upsert({ where: { id: cs.id }, update: cs, create: cs }).catch(() => {}) }
  await audit('RESTORE_BACKUP', 'Backup', backup.id, backup.counts, 'SYSTEM')
  res.json({ data: { restored: true, from: backup.label } })
})

// ─── PlayFooty football data-source control centre ───────────────────────────
router.get('/football/leagues', async (_req, res) => {
  const leagues = await prisma.league.findMany({
    where: { sport: 'FOOTBALL', archivedAt: null },
    include: {
      state: { select: { code: true, name: true } },
      _count: { select: { clubSeasons: true, footballFixtures: true, footballResults: true, footballLadderEntries: true, footballImports: true } },
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: 300,
  })
  res.json({ data: leagues })
})

router.post('/football/leagues', async (req, res) => {
  const b = req.body as { name?: string; state?: string; regionName?: string; sourceUrl?: string; primaryDataSource?: string; fallbackDataSources?: string[]; playhqOrganisationId?: string; playhqCompetitionId?: string; playhqSeasonId?: string; playhqGradeId?: string }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const source = isFootballSource(b.primaryDataSource) ? b.primaryDataSource : 'MANUAL_ENTRY'
  const fallbacks = Array.isArray(b.fallbackDataSources) ? b.fallbackDataSources.filter(isFootballSource) : ['CSV_UPLOAD', 'OCR_UPLOAD']
  const flags = sourceFlags(source, fallbacks)
  const stateCode = (b.state || 'VIC').toUpperCase()
  const state = await prisma.state.upsert({ where: { code: stateCode }, create: { code: stateCode, name: stateCode }, update: {} })
  const league = await prisma.league.create({
    data: {
      name: b.name,
      shortName: b.name,
      stateId: state.id,
      sport: 'FOOTBALL',
      primaryDataSource: source,
      fallbackDataSources: JSON.stringify(fallbacks),
      sourceUrl: b.sourceUrl ?? null,
      playhqOrganisationId: b.playhqOrganisationId ?? null,
      playhqCompetitionId: b.playhqCompetitionId ?? null,
      playhqSeasonId: b.playhqSeasonId ?? null,
      playhqGradeId: b.playhqGradeId ?? null,
      regionName: b.regionName ?? null,
      syncStatus: 'READY',
      dataConfidence: source === 'MANUAL_ENTRY' ? 0.75 : 0.55,
      primarySource: source,
      importType: 'MANUAL',
      manualOverride: true,
      currentSeason: '2026',
      ...flags,
    },
  })
  await audit('CREATE_FOOTBALL_LEAGUE', 'League', league.id, league)
  res.status(201).json({ data: league })
})

router.patch('/football/leagues/:id/source', async (req, res) => {
  const before = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'not found' })
  const b = req.body as Record<string, unknown>
  const source = isFootballSource(b.primaryDataSource) ? b.primaryDataSource : before.primaryDataSource
  const fallbacks = Array.isArray(b.fallbackDataSources) ? b.fallbackDataSources.filter(isFootballSource) : []
  const flags = sourceFlags(source, fallbacks)
  const updated = await prisma.league.update({
    where: { id: req.params.id },
    data: {
      sport: 'FOOTBALL',
      primaryDataSource: source,
      fallbackDataSources: JSON.stringify(fallbacks),
      sourceUrl: typeof b.sourceUrl === 'string' ? b.sourceUrl : before.sourceUrl,
      playhqOrganisationId: typeof b.playhqOrganisationId === 'string' ? b.playhqOrganisationId : before.playhqOrganisationId,
      playhqCompetitionId: typeof b.playhqCompetitionId === 'string' ? b.playhqCompetitionId : before.playhqCompetitionId,
      playhqSeasonId: typeof b.playhqSeasonId === 'string' ? b.playhqSeasonId : before.playhqSeasonId,
      playhqGradeId: typeof b.playhqGradeId === 'string' ? b.playhqGradeId : before.playhqGradeId,
      syncStatus: 'READY',
      dataSourceSyncError: null,
      syncError: null,
      lastManualUpdateAt: new Date(),
      ...flags,
    },
  })
  await audit('SET_FOOTBALL_DATA_SOURCE', 'League', updated.id, { before, after: updated })
  res.json({ data: updated })
})

router.post('/football/leagues/:id/sync', async (req, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!league) return res.status(404).json({ error: 'not found' })
  const dryRun = req.body?.dryRun !== false
  const source = isFootballSource(req.body?.sourceType) ? req.body.sourceType : (league.primaryDataSource ?? 'PLAYHQ_SCRAPER')
  const now = new Date()
  if (source === 'PLAYHQ_API' && !league.apiEnabled) return res.status(400).json({ error: 'PLAYHQ_API is not enabled for this league' })
  if (source === 'PLAYHQ_SCRAPER' && !league.scrapeEnabled) return res.status(400).json({ error: 'PLAYHQ_SCRAPER is not enabled for this league' })
  await prisma.league.update({ where: { id: league.id }, data: { lastSyncAt: now, syncStatus: dryRun ? 'READY' : 'RUNNING', dataSourceSyncError: null, syncError: null } })
  const sourceUrl = str(req.body?.sourceUrl, league.sourceUrl ?? '')
  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl required on league or request body' })

  const smart = await smartIngestFootballUrl(sourceUrl)
  if (smart.groups.length === 0) {
    const payload = { leagueId: league.id, source, sourceUrl, smart }
    const imp = await prisma.footballDataImport.upsert({
      where: { leagueId_sourceType_dataType_payloadHash: { leagueId: league.id, sourceType: smart.source, dataType: 'ROUNDS', payloadHash: smart.payloadHash } },
      create: { leagueId: league.id, sourceType: smart.source, dataType: 'ROUNDS', sourceUrl, payloadHash: smart.payloadHash, dryRun, status: 'PREVIEWED', recordsFound: 0, confidence: smart.confidence, payload: JSON.stringify(payload), scrapedAt: smart.scrapedAt ? new Date(smart.scrapedAt) : now, error: smart.message ?? smart.warnings.join('; ') },
      update: { dryRun, status: 'PREVIEWED', payload: JSON.stringify(payload), scrapedAt: smart.scrapedAt ? new Date(smart.scrapedAt) : now, error: smart.message ?? smart.warnings.join('; ') },
    })
    await createFootballReview(league.id, 'FOOTBALL_SMART_INGEST_REVIEW', smart.message ?? 'Smart URL ingestion requires review/manual fallback.', payload, smart.confidence)
    await prisma.league.update({ where: { id: league.id }, data: { syncStatus: 'NEEDS_REVIEW', dataSourceSyncError: smart.message ?? smart.warnings.join('; '), syncError: smart.message ?? smart.warnings.join('; '), lastSyncAt: now } })
    await audit('FOOTBALL_SMART_INGEST_REVIEW', 'FootballDataImport', imp.id, payload, smart.source)
    return res.status(202).json({ data: { importId: imp.id, dryRun, status: 'NEEDS_REVIEW', source: smart.source, sourceUrl, confidence: smart.confidence, importedAt: now.toISOString(), note: smart.message ?? 'No rows imported; routed to review.', warnings: smart.warnings, workflow: smart.workflow } })
  }

  const commits = []
  for (const group of smart.groups) {
    commits.push(await commitFootballRows(league, smart.source, group.dataType, group.rows, dryRun, sourceUrl, smart.confidence, stableHash({ source: smart.source, dataType: group.dataType, sourceUrl, rows: group.rows })))
  }
  const imported = commits.reduce((sum, c) => sum + c.recordsImported, 0)
  await prisma.league.update({ where: { id: league.id }, data: { lastSuccessfulSyncAt: dryRun ? league.lastSuccessfulSyncAt : new Date(), syncStatus: dryRun ? 'READY' : 'SUCCESS', dataSourceSyncError: null, syncError: null, dataConfidence: smart.confidence, sourceUrl } })
  await audit('FOOTBALL_SMART_INGEST', 'League', league.id, { sourceUrl, source: smart.source, dryRun, commits, warnings: smart.warnings }, smart.source)
  res.status(202).json({ data: { dryRun, status: dryRun ? 'PREVIEWED' : 'COMMITTED', source: smart.source, sourceUrl, confidence: smart.confidence, importedAt: now.toISOString(), groups: smart.groups.map(g => ({ dataType: g.dataType, rows: g.rows.length })), recordsImported: imported, warnings: smart.warnings } })
})

router.post('/football/leagues/:id/import', async (req, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!league) return res.status(404).json({ error: 'not found' })
  const source = isFootballSource(req.body?.sourceType) ? req.body.sourceType : 'MANUAL_ENTRY'
  const dataType = isFootballDataType(req.body?.dataType) ? req.body.dataType : null
  const rows = Array.isArray(req.body?.rows) ? req.body.rows as FootballRow[] : []
  const dryRun = !!req.body?.dryRun
  if (!dataType) return res.status(400).json({ error: `dataType must be one of ${FOOTBALL_DATA_TYPES.join(', ')}` })
  if (rows.length === 0) return res.status(400).json({ error: 'rows required' })

  const result = await commitFootballRows(league, source, dataType, rows, dryRun, str(req.body?.sourceUrl, league.sourceUrl ?? ''))
  if (dryRun) return res.json({ data: result })
  await prisma.league.update({ where: { id: league.id }, data: { lastSuccessfulSyncAt: new Date(), syncStatus: 'SUCCESS', dataSourceSyncError: null, syncError: null, dataConfidence: source === 'MANUAL_ENTRY' ? 0.9 : 0.65 } })
  await audit('FOOTBALL_IMPORT_COMMIT', 'FootballDataImport', result.importId, { dataType, source, imported: result.recordsImported }, source)
  res.json({ data: result })
})

router.post('/football/leagues/:id/generate-ladder', async (req, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!league) return res.status(404).json({ error: 'not found' })
  const season = str(req.body?.season, '2026')
  const grade = str(req.body?.grade, 'Senior Football')
  const results = await prisma.footballResult.findMany({ where: { leagueId: league.id, season, grade } })
  if (results.length === 0) return res.status(400).json({ error: 'No football results available to generate a ladder' })
  const ladder = generateFootballLadder(results)
  if (req.body?.dryRun) return res.json({ data: { season, grade, ladder } })
  for (const r of ladder) {
    await prisma.footballLadderEntry.upsert({
      where: { leagueId_season_grade_clubName: { leagueId: league.id, season, grade, clubName: r.clubName } },
      create: { leagueId: league.id, season, grade, clubName: r.clubName, position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, pointsFor: r.pointsFor, pointsAgainst: r.pointsAgainst, percentage: r.percentage, premiershipPoints: r.premiershipPoints, sourceType: 'MANUAL_ENTRY', verified: true },
      update: { position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, pointsFor: r.pointsFor, pointsAgainst: r.pointsAgainst, percentage: r.percentage, premiershipPoints: r.premiershipPoints, sourceType: 'MANUAL_ENTRY', verified: true },
    })
  }
  await audit('FOOTBALL_GENERATE_LADDER', 'League', league.id, { season, grade, rows: ladder.length })
  res.json({ data: { season, grade, rows: ladder.length, ladder } })
})

router.get('/football/leagues/:id/compare-ladder', async (req, res) => {
  const season = str(req.query.season, '2026')
  const grade = str(req.query.grade, 'Senior Football')
  const [results, stored] = await Promise.all([
    prisma.footballResult.findMany({ where: { leagueId: req.params.id, season, grade } }),
    prisma.footballLadderEntry.findMany({ where: { leagueId: req.params.id, season, grade }, orderBy: { position: 'asc' } }),
  ])
  const generated = generateFootballLadder(results)
  const diffs = generated.map(g => {
    const s = stored.find(x => x.clubName.toLowerCase() === g.clubName.toLowerCase())
    return { clubName: g.clubName, generatedPosition: g.position, storedPosition: s?.position ?? null, generatedPoints: g.premiershipPoints, storedPoints: s?.premiershipPoints ?? null, differs: !s || s.position !== g.position || s.premiershipPoints !== g.premiershipPoints }
  })
  res.json({ data: { season, grade, generatedRows: generated.length, storedRows: stored.length, diffs, conflictCount: diffs.filter(d => d.differs).length } })
})

router.post('/football/leagues/:id/publish', async (req, res) => {
  const season = str(req.body?.season, '2026')
  const grade = str(req.body?.grade, 'Senior Football')
  const [results, ladder] = await Promise.all([
    prisma.footballResult.updateMany({ where: { leagueId: req.params.id, season, grade }, data: { published: true } }),
    prisma.footballLadderEntry.updateMany({ where: { leagueId: req.params.id, season, grade }, data: { published: true } }),
  ])
  await prisma.footballDataImport.updateMany({ where: { leagueId: req.params.id, dataType: { in: ['RESULTS', 'LADDER'] }, status: 'COMMITTED' }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  const recalc = req.body?.recalculate === true ? await recalculateNational().catch(e => ({ error: e instanceof Error ? e.message : 'recalc failed' })) : null
  await audit('FOOTBALL_PUBLISH_APPROVED', 'League', req.params.id, { season, grade, results: results.count, ladder: ladder.count, recalc })
  res.json({ data: { season, grade, publishedResults: results.count, publishedLadderRows: ladder.count, recalc } })
})

export { router as adminPlatformRouter }
