/**
 * Admin Platform API — dashboard, national recalculation, review queue, backups.
 * Password-guarded. Mounted at /admin/platform.
 */

import { Router }          from 'express'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { recalculateNational } from '../jobs/recompute-strength.js'
import { parsePlayHQUrl }   from '../discovery/playhq-url.js'
import { dispatchWorkflow, listRuns, getRun, githubConfig } from '../integrations/github-dispatch.js'
import { previewCsv, commitCsv, type CsvEntity, type PreviewRow } from '../jobs/csv-import.js'
import { createBackup } from '../jobs/backup.js'
import { sweepDataQuality } from '../jobs/data-quality.js'
import { generateWeeklyDrafts } from '../jobs/generate-articles.js'
import { logger }          from '../utils/logger.js'

// Workflow files (the browser-backed execution engine on GitHub Actions).
const WF_URL_IMPORT = 'playhq-url-import.yml'
const WF_DISCOVER   = 'discover-import.yml'

const router = Router()
router.use(requireAdminKey)

async function audit(action: string, entityType: string, entityId: string | null, after: unknown, source = 'ADMIN') {
  try {
    const u = await prisma.adminUser.upsert({ where: { email: 'admin@cnca.local' }, update: {}, create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' } })
    await prisma.auditLog.create({ data: { userId: u.id, action, entityType, entityId, after: after ? JSON.stringify(after) : null, source } })
  } catch (e) { logger.warn('platform audit failed', { detail: String(e) }) }
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

export { router as adminPlatformRouter }
