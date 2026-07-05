/**
 * Admin results/fixtures endpoints (Phase B5) — mounted at /admin/results.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected import + engine controls. Additive; no existing route modified.
 * All four import sources (PlayHQ bridge, OCR, CSV, manual) feed the same
 * MatchResult model via the results service.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { importResults, bridgeFromMatches, upsertResult } from '../results/results.service.js'
import { importFixtures } from '../results/fixtures.service.js'
import { computeClubStats, getStatLeaderboards } from '../results/statistics.js'
import { computeMatchInsights } from '../results/intelligence.js'
import { generateMatchArticles } from '../results/match-articles.js'
import { runResultsEngine } from '../results/index.js'
import { logQualityAction } from '../quality/audit.js'
import type { ResultInput, FixtureInput } from '../results/validation.js'

const router = Router()
router.use(requireAdminKey)

// Full engine run (bridge + stats + insights + articles).
router.post('/run', async (req, res) => {
  const b = (req.body ?? {}) as { season?: string; bridge?: boolean; generateArticles?: boolean }
  try {
    const report = await runResultsEngine({ season: b.season, bridge: b.bridge, generateArticles: b.generateArticles })
    await logQualityAction('RUN_RESULTS_ENGINE', 'System', null, report, { reason: 'results engine run', performedBy: 'ADMIN' })
    res.json({ data: report })
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'engine run failed' }) }
})

// ── Imports (OCR / CSV / manual all share the results model) ──────────────────
router.post('/import', async (req, res) => {
  const b = (req.body ?? {}) as { source?: 'OCR' | 'CSV' | 'MANUAL'; rows?: ResultInput[] }
  if (!Array.isArray(b.rows)) return res.status(400).json({ error: 'rows[] required' })
  const source = (b.source ?? 'MANUAL')
  const report = await importResults(b.rows, source, { raiseReview: true })
  await logQualityAction('IMPORT_RESULTS', 'MatchResult', null, { source, created: report.created, invalid: report.invalid }, { performedBy: 'ADMIN' })
  res.json({ data: report })
})

// Single manual result entry (verified by default).
router.post('/manual', async (req, res) => {
  const r = await upsertResult((req.body ?? {}) as ResultInput, 'MANUAL', { raiseReview: false })
  res.status(r.ok ? (r.status === 'created' ? 201 : 200) : 400).json(r.ok ? { data: { id: r.id, status: r.status } } : { error: r.errors })
})

// Bridge legacy scraped matches (PlayHQ) into the results store.
router.post('/bridge', async (req, res) => {
  const b = (req.body ?? {}) as { season?: string; limit?: number }
  const report = await bridgeFromMatches({ season: b.season, limit: b.limit })
  await logQualityAction('BRIDGE_MATCHES', 'MatchResult', null, { created: report.created }, { performedBy: 'ADMIN' })
  res.json({ data: report })
})

// Fixtures import.
router.post('/fixtures/import', async (req, res) => {
  const b = (req.body ?? {}) as { source?: 'PLAYHQ' | 'OCR' | 'CSV' | 'MANUAL'; rows?: FixtureInput[] }
  if (!Array.isArray(b.rows)) return res.status(400).json({ error: 'rows[] required' })
  res.json({ data: await importFixtures(b.rows, b.source ?? 'MANUAL') })
})

// ── Derivations (idempotent) ──────────────────────────────────────────────────
router.post('/stats/:season', async (req, res) => { res.json({ data: await computeClubStats(req.params.season) }) })
router.get('/stats/:season', async (req, res) => { res.json({ data: await getStatLeaderboards(req.params.season) }) })
router.post('/insights/:season', async (req, res) => { res.json({ data: await computeMatchInsights(req.params.season) }) })
router.post('/articles/:season', async (req, res) => { res.json({ data: await generateMatchArticles(req.params.season) }) })

// Listings.
router.get('/', async (req, res) => {
  const { season, league } = req.query as Record<string, string>
  const data = await prisma.matchResult.findMany({ where: { ...(season ? { season } : {}), ...(league ? { leagueId: league } : {}) }, orderBy: { updatedAt: 'desc' }, take: 300 })
  res.json({ data })
})

export { router as adminResultsRouter }
