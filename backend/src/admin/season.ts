/**
 * Admin Full Season Ingestion workflow (Phase B10.5) — /admin/season.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected admin workflow to import a whole season (OCR/CSV/manual/PlayHQ)
 * in one operation: preview → stage → commit (with automatic reconstruction of
 * round-by-round ladders, round summaries and club timelines), inspect an
 * import's status/preview, rebuild a season from results, and list stored
 * ladders. Additive; every action is audited by the services it calls.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { previewSeason, stageSeasonImport, commitSeason, rebuildSeason, getImportStatus, getImportPreview, listImports, type SeasonInput, type SeasonIngestOptions } from '../season/ingest.js'
import { listLadders } from '../ladder/ladders.service.js'
import { recalculateNational } from '../jobs/recompute-strength.js'
import { logQualityAction } from '../quality/audit.js'

const router = Router()
router.use(requireAdminKey)

// Larger JSON bodies are handled by the /admin/season limit set in server.ts.

function readInput(body: unknown): { input: SeasonInput & { importId?: string }; opts: SeasonIngestOptions } {
  const b = (body ?? {}) as Record<string, unknown>
  const input: SeasonInput & { importId?: string } = {
    rows: b.rows as SeasonInput['rows'], csv: b.csv as string | undefined,
    csvFiles: b.csvFiles as string[] | undefined, text: b.text as string | undefined, importId: b.importId as string | undefined,
  }
  const opts: SeasonIngestOptions = {
    leagueId: b.leagueId as string | undefined, season: b.season as string | undefined, grade: b.grade as string | undefined,
    source: b.source as string | undefined, approveReplace: b.approveReplace as boolean | undefined,
    fileName: b.fileName as string | undefined, batchLabel: b.batchLabel as string | undefined, createdBy: 'admin',
  }
  return { input, opts }
}

// ── Preview / stage / commit ──────────────────────────────────────────────────
router.post('/preview', async (req, res) => {
  const { input, opts } = readInput(req.body)
  res.json({ data: await previewSeason(input, opts) })
})
router.post('/import', async (req, res) => {
  const { input, opts } = readInput(req.body)
  res.status(201).json({ data: await stageSeasonImport(input, opts) })
})
router.post('/commit', async (req, res) => {
  const { input, opts } = readInput(req.body)
  const result = await commitSeason(input, opts)
  if ((req.body as { recalculate?: boolean })?.recalculate) {
    const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
    if (!locked) { try { const rr = await recalculateNational(); await logQualityAction('RECALCULATE_AFTER_SEASON_IMPORT', 'Ranking', null, { clubsRanked: rr.clubsRanked }, { performedBy: 'admin' }) } catch { /* non-fatal */ } }
  }
  res.json({ data: result })
})

// ── Inspect / rebuild ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => { res.json({ data: await listImports({ leagueId: req.query.leagueId as string | undefined, season: req.query.season as string | undefined }) }) })
router.get('/:id/status', async (req, res) => {
  const s = await getImportStatus(String(req.params.id))
  if (!s) return res.status(404).json({ error: 'import not found' })
  res.json({ data: s })
})
router.get('/:id/preview', async (req, res) => {
  const p = await getImportPreview(String(req.params.id))
  if (!p) return res.status(404).json({ error: 'no preview stored' })
  res.json({ data: p })
})
router.post('/rebuild', async (req, res) => {
  const b = (req.body ?? {}) as { leagueId?: string; season?: string; grade?: string }
  if (!b.leagueId || !b.season) return res.status(400).json({ error: 'leagueId and season required' })
  res.json({ data: await rebuildSeason(b.leagueId, b.season, b.grade ?? 'A Grade', 'admin') })
})
router.post('/:id/rebuild', async (req, res) => {
  const imp = await prisma.seasonImport.findFirst({ where: { id: String(req.params.id), deletedAt: null } })
  if (!imp || !imp.leagueId || !imp.season) return res.status(404).json({ error: 'import not found or missing league/season' })
  res.json({ data: await rebuildSeason(imp.leagueId, imp.season, imp.grade ?? 'A Grade', 'admin') })
})

// Stored ladders for a league/season/grade (mirrors the example admin ladders route).
router.get('/:leagueId/:season/:grade/ladders', async (req, res) => {
  res.json({ data: await listLadders(String(req.params.leagueId), { season: String(req.params.season), grade: String(req.params.grade) }) })
})

export { router as adminSeasonRouter }
