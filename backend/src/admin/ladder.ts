/**
 * Admin ladder + bulk-import workflow (Ladder Import V2) — /admin/ladder.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected admin workflow: upload/edit ladders (OCR/CSV/manual), generate a
 * ladder from results, bulk season backfill (preview + commit), compare
 * uploaded vs generated, publish, and (post-approval) trigger a ranking recalc.
 * Additive; no existing route modified. Every action is audited by the services.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { createUploadedLadder, getLadder, getCurrentLadder, listLadders, publishLadder, compareLadders, editLadderRow, softDeleteLadder, applyLadderToClubSeasons } from '../ladder/ladders.service.js'
import { generateLadderFromResults, generatePerRoundLadders } from '../ladder/generate.js'
import { previewBulk, commitBulk } from '../ladder/bulk-import.js'
import { recalculateNational } from '../jobs/recompute-strength.js'
import { logQualityAction } from '../quality/audit.js'

const router = Router()
router.use(requireAdminKey)

// ── Uploaded / edited ladders (OCR review fields, missing allowed) ────────────
router.post('/upload', async (req, res) => {
  const r = await createUploadedLadder({ ...(req.body ?? {}), createdBy: 'admin' })
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: { ladderId: r.ladderId } } : { error: r.error })
})
router.patch('/rows/:rowId', async (req, res) => {
  const r = await editLadderRow(req.params.rowId, (req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 200 : 400).json(r.ok ? { data: r.row } : { error: r.error })
})

// ── Generate ladder from results ──────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const b = (req.body ?? {}) as { leagueId?: string; season?: string; grade?: string; roundFrom?: number; roundTo?: number; setCurrent?: boolean }
  if (!b.leagueId || !b.season) return res.status(400).json({ error: 'leagueId and season required' })
  res.json({ data: await generateLadderFromResults(b.leagueId, b.season, b.grade ?? 'A Grade', { roundFrom: b.roundFrom, roundTo: b.roundTo, setCurrent: b.setCurrent, createdBy: 'admin' }) })
})
router.post('/generate-all', async (req, res) => {
  const b = (req.body ?? {}) as { leagueId?: string; season?: string; grade?: string }
  if (!b.leagueId || !b.season) return res.status(400).json({ error: 'leagueId and season required' })
  res.json({ data: await generatePerRoundLadders(b.leagueId, b.season, b.grade ?? 'A Grade', 'admin') })
})

// ── Bulk season backfill ──────────────────────────────────────────────────────
router.post('/bulk/preview', async (req, res) => {
  const b = (req.body ?? {}) as { rows?: unknown[]; csv?: string; leagueId?: string; season?: string; grade?: string; source?: string; approveReplace?: boolean }
  res.json({ data: await previewBulk({ rows: b.rows as never, csv: b.csv }, { leagueId: b.leagueId, season: b.season, grade: b.grade, source: b.source, approveReplace: b.approveReplace }) })
})
router.post('/bulk/commit', async (req, res) => {
  const b = (req.body ?? {}) as { rows?: unknown[]; csv?: string; leagueId?: string; season?: string; grade?: string; source?: string; approveReplace?: boolean; recalculate?: boolean }
  const report = await commitBulk({ rows: b.rows as never, csv: b.csv }, { leagueId: b.leagueId, season: b.season, grade: b.grade, source: b.source, approveReplace: b.approveReplace, performedBy: 'admin' })
  if (b.recalculate) { try { const rr = await recalculateNational(); await logQualityAction('RECALCULATE_AFTER_IMPORT', 'Ranking', null, { clubsRanked: rr.clubsRanked }, { performedBy: 'admin' }) } catch { /* non-fatal */ } }
  res.json({ data: report })
})

// ── Compare / publish / list ──────────────────────────────────────────────────
router.get('/:leagueId/list', async (req, res) => { res.json({ data: await listLadders(req.params.leagueId, { season: req.query.season as string | undefined, grade: req.query.grade as string | undefined }) }) })
router.get('/:leagueId/current', async (req, res) => {
  const l = await getCurrentLadder(req.params.leagueId, { season: req.query.season as string | undefined, grade: req.query.grade as string | undefined })
  if (!l) return res.status(404).json({ error: 'no current ladder' })
  res.json({ data: l })
})
router.get('/:leagueId/compare', async (req, res) => {
  res.json({ data: await compareLadders(req.params.leagueId, (req.query.season as string) || '', (req.query.grade as string) || 'A Grade') })
})
router.get('/view/:ladderId', async (req, res) => {
  const l = await getLadder(req.params.ladderId)
  if (!l) return res.status(404).json({ error: 'ladder not found' })
  res.json({ data: l })
})
router.post('/:ladderId/publish', async (req, res) => {
  const r = await publishLadder(req.params.ladderId, { applyToRankings: (req.body as { applyToRankings?: boolean })?.applyToRankings, performedBy: 'admin' })
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: { published: true } } : { error: r.error })
})
router.post('/:ladderId/apply-rankings', async (req, res) => { res.json({ data: await applyLadderToClubSeasons(req.params.ladderId) }) })
router.delete('/:ladderId', async (req, res) => {
  const r = await softDeleteLadder(req.params.ladderId, 'admin')
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: { archived: true } } : { error: r.error })
})

// Trigger a ranking recalculation (existing engine; formula unchanged).
router.post('/recalculate', async (_req, res) => {
  const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
  if (locked) return res.status(423).json({ error: 'rankings are locked' })
  try { const r = await recalculateNational(); res.json({ data: { clubsRanked: r.clubsRanked, leagues: r.leagues.length } }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'recalc failed' }) }
})

export { router as adminLadderRouter }
