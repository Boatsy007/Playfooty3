/**
 * Admin PlayHQ Football ingestion workflow (Phase F1) — /admin/playhq.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected admin endpoints for the PlayHQ Football pipeline: discover,
 * import organisation/league/season, import fixtures/results/ladders, sync
 * league/season/all, plus status + logs. Additive; every action is logged
 * (PlayhqSyncLog) and audited. When credentials are missing every endpoint
 * returns a clear "PlayHQ credentials not configured." message (HTTP 200 with
 * ok:false) instead of crashing.
 */

import { Router } from 'express'
import { requireAdminKey } from '../api/middleware/auth.js'
import { getFootballStatus, getHealth, getSyncLogs, refreshAuth, discover, importOrganisation, importLeague, importSeason, importFixturesOnly, importResultsOnly, importVenuesOnly, importLaddersOnly, syncLeague, syncSeason, syncAll, type SyncLeagueOpts } from '../football/ingest.js'

const router = Router()
router.use(requireAdminKey)

const leagueOpts = (b: Record<string, unknown>): SyncLeagueOpts => ({
  gradeId: String(b.gradeId ?? ''), seasonId: b.seasonId as string | undefined, season: b.season as string | undefined,
  gradeName: b.gradeName as string | undefined, competitionId: b.competitionId as string | undefined,
  organisationId: b.organisationId as string | undefined, tenant: b.tenant as string | undefined,
  stateId: b.stateId as string | undefined, createdBy: 'admin',
})

// ── Status / health / logs / refresh ──────────────────────────────────────────
router.get('/status', (_req, res) => { res.json({ data: getFootballStatus() }) })
router.get('/health', async (_req, res) => { res.json({ data: await getHealth() }) })
router.get('/logs', async (req, res) => { res.json({ data: await getSyncLogs(parseInt(String(req.query.limit ?? '50'), 10) || 50) }) })
router.post('/refresh', async (_req, res) => { res.json({ data: await refreshAuth('admin') }) })
router.post('/import-venues', async (_req, res) => { res.json({ data: await importVenuesOnly({ createdBy: 'admin' }) }) })

// ── Discovery / organisation ──────────────────────────────────────────────────
router.post('/discover', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  res.json({ data: await discover({ organisationId: b.organisationId as string | undefined, createdBy: 'admin' }) })
})
router.post('/import-organisation', async (req, res) => {
  const id = String((req.body as { organisationId?: string })?.organisationId ?? '')
  if (!id) return res.status(400).json({ error: 'organisationId required' })
  res.json({ data: await importOrganisation(id, 'admin') })
})

// ── League / season imports ───────────────────────────────────────────────────
router.post('/import-league', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.gradeId) return res.status(400).json({ error: 'gradeId required' })
  res.json({ data: await importLeague(leagueOpts(b)) })
})
router.post('/import-season', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.seasonId) return res.status(400).json({ error: 'seasonId required' })
  res.json({ data: await importSeason({ seasonId: String(b.seasonId), season: b.season as string | undefined, competitionId: b.competitionId as string | undefined, organisationId: b.organisationId as string | undefined, tenant: b.tenant as string | undefined, stateId: b.stateId as string | undefined, createdBy: 'admin' }) })
})
router.post('/import-fixtures', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.gradeId) return res.status(400).json({ error: 'gradeId required' })
  res.json({ data: await importFixturesOnly(leagueOpts(b)) })
})
router.post('/import-results', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.gradeId) return res.status(400).json({ error: 'gradeId required' })
  res.json({ data: await importResultsOnly(leagueOpts(b)) })
})
router.post('/import-ladders', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.gradeId) return res.status(400).json({ error: 'gradeId required' })
  res.json({ data: await importLaddersOnly(leagueOpts(b)) })
})

// ── Sync orchestration ────────────────────────────────────────────────────────
router.post('/sync-league', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.gradeId) return res.status(400).json({ error: 'gradeId required' })
  res.json({ data: await syncLeague(leagueOpts(b)) })
})
router.post('/sync-season', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  if (!b.seasonId) return res.status(400).json({ error: 'seasonId required' })
  res.json({ data: await syncSeason({ seasonId: String(b.seasonId), season: b.season as string | undefined, competitionId: b.competitionId as string | undefined, organisationId: b.organisationId as string | undefined, tenant: b.tenant as string | undefined, stateId: b.stateId as string | undefined, createdBy: 'admin' }) })
})
router.post('/sync-all', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  res.json({ data: await syncAll({ organisationId: b.organisationId as string | undefined, season: b.season as string | undefined, stateId: b.stateId as string | undefined, createdBy: 'admin' }) })
})

export { router as adminPlayhqRouter }
