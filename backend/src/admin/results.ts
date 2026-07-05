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
import { computeRoundSummary, computeLeagueRoundSummaries } from '../results/rounds.js'
import { logQualityAction } from '../quality/audit.js'
import type { ResultInput, FixtureInput } from '../results/validation.js'

// Editable result/fixture fields for admin PATCH (manual corrections).
const RESULT_PATCH_FIELDS = ['homeScore', 'awayScore', 'round', 'grade', 'matchDate', 'status', 'notes', 'sourceUrl', 'fixtureId'] as const
const FIXTURE_PATCH_FIELDS = ['round', 'grade', 'matchDate', 'matchTime', 'venue', 'status', 'homeScore', 'awayScore', 'sourceUrl'] as const
function pickFields<T extends readonly string[]>(body: Record<string, unknown>, allowed: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of allowed) if (k in body && body[k] !== undefined) out[k] = (k === 'matchDate' && body[k]) ? new Date(body[k] as string) : body[k]
  return out
}

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
// ── Corrections (audited; recompute winner/margin/draw; manual data protected) ─
router.patch('/results/:id', async (req, res) => {
  const before = await prisma.matchResult.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'result not found' })
  const updates = pickFields((req.body ?? {}) as Record<string, unknown>, RESULT_PATCH_FIELDS)
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no editable fields' })
  // Recompute derived fields if scores changed.
  const homeScore = (updates.homeScore ?? before.homeScore) as number
  const awayScore = (updates.awayScore ?? before.awayScore) as number
  if ('homeScore' in updates || 'awayScore' in updates) {
    updates.isDraw = homeScore === awayScore
    updates.winnerClubId = homeScore === awayScore ? null : (homeScore > awayScore ? before.homeClubId : before.awayClubId)
    updates.margin = Math.abs(homeScore - awayScore)
  }
  // A manual admin correction sets manualOverride so auto imports never clobber it.
  updates.manualOverride = true
  updates.verified = true
  const after = await prisma.matchResult.update({ where: { id: req.params.id }, data: updates })
  await logQualityAction('CORRECT_RESULT', 'MatchResult', after.id, updates, { before, reason: 'admin result correction', performedBy: 'admin' })
  res.json({ data: after })
})

router.patch('/fixtures/:id', async (req, res) => {
  const before = await prisma.fixture.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'fixture not found' })
  const updates = pickFields((req.body ?? {}) as Record<string, unknown>, FIXTURE_PATCH_FIELDS)
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no editable fields' })
  updates.manualOverride = true
  const after = await prisma.fixture.update({ where: { id: req.params.id }, data: updates })
  await logQualityAction('CORRECT_FIXTURE', 'Fixture', after.id, updates, { before, reason: 'admin fixture correction', performedBy: 'admin' })
  res.json({ data: after })
})

// ── Round summaries ───────────────────────────────────────────────────────────
router.post('/rounds/:leagueId/:season/:round', async (req, res) => {
  const grade = (req.query.grade as string) || 'A Grade'
  const r = await computeRoundSummary(req.params.leagueId, req.params.season, parseInt(req.params.round, 10), grade)
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: r.summary } : { error: r.error })
})
router.post('/rounds/:leagueId/:season', async (req, res) => {
  res.json({ data: await computeLeagueRoundSummaries(req.params.leagueId, req.params.season, (req.query.grade as string) || 'A Grade') })
})

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
