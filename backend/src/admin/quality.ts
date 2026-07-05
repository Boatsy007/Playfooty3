/**
 * Admin data-quality endpoints (Phase B4) — mounted at /admin/quality.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected controls for the integrity engine. Additive; no existing route
 * is modified. Detection is read-only; merges are non-destructive and audited.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runQualityEngine } from '../quality/index.js'
import { detectDuplicates } from '../quality/duplicate-detection.js'
import { generateHealthReport } from '../quality/health-report.js'
import { validateLeagueEligibility, validateAllLeagues } from '../quality/league-eligibility.js'
import { resolveClubIdentity, addClubAlias } from '../quality/identity-resolver.js'
import { mergeClubs, mergeLeagues } from '../quality/merge.js'

const router = Router()
router.use(requireAdminKey)

// Full engine run.
router.post('/run', async (req, res) => {
  const b = (req.body ?? {}) as { raiseReviews?: boolean; storeHealth?: boolean }
  try { res.json({ data: await runQualityEngine({ raiseReviews: b.raiseReviews, storeHealth: b.storeHealth, performedBy: 'ADMIN' }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'quality run failed' }) }
})

// Health report (read-only; store via ?store=true).
router.get('/health', async (req, res) => {
  try { res.json({ data: await generateHealthReport({ store: req.query.store === 'true', generatedBy: 'ADMIN' }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'health report failed' }) }
})
router.get('/health/history', async (_req, res) => {
  const snaps = await prisma.dataHealthSnapshot.findMany({ orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, counts: true, createdAt: true } })
  res.json({ data: snaps })
})

// Duplicate detection (read-only unless ?raise=true).
router.get('/duplicates', async (req, res) => {
  try { res.json({ data: await detectDuplicates({ raiseReviews: req.query.raise === 'true' }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'duplicate detection failed' }) }
})

// League eligibility.
router.post('/eligibility/run', async (_req, res) => {
  try { res.json({ data: await validateAllLeagues({ raiseReview: true }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'eligibility run failed' }) }
})
router.post('/eligibility/:leagueId', async (req, res) => {
  const r = await validateLeagueEligibility(req.params.leagueId, { raiseReview: true })
  if (!r) return res.status(404).json({ error: 'league not found' })
  res.json({ data: r })
})
router.get('/eligibility', async (req, res) => {
  const verdict = req.query.verdict as string | undefined
  const items = await prisma.leagueEligibility.findMany({ where: verdict ? { verdict } : {}, orderBy: { checkedAt: 'desc' }, take: 500 })
  res.json({ data: items })
})

// Identity resolver.
router.get('/identity/resolve', async (req, res) => {
  const name = (req.query.name as string) ?? ''
  if (!name.trim()) return res.status(400).json({ error: 'name required' })
  res.json({ data: await resolveClubIdentity(name) })
})
router.post('/aliases', async (req, res) => {
  const { alias, clubId, source, confidence } = (req.body ?? {}) as { alias?: string; clubId?: string; source?: string; confidence?: number }
  if (!alias || !clubId) return res.status(400).json({ error: 'alias and clubId required' })
  const r = await addClubAlias(alias, clubId, source, confidence)
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: { alias, clubId } } : { error: r.error })
})
router.get('/aliases', async (_req, res) => {
  res.json({ data: await prisma.clubAlias.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }) })
})

// Safe merges (non-destructive, audited).
router.post('/clubs/merge', async (req, res) => {
  const { sourceId, targetId, reason, force } = (req.body ?? {}) as { sourceId?: string; targetId?: string; reason?: string; force?: boolean }
  if (!sourceId || !targetId) return res.status(400).json({ error: 'sourceId and targetId required' })
  const r = await mergeClubs(sourceId, targetId, { reason, force, performedBy: 'admin' })
  res.status(r.status).json(r.ok ? { data: { mergeRecordId: r.mergeRecordId, movedCounts: r.movedCounts } } : { error: r.error })
})
router.post('/leagues/merge', async (req, res) => {
  const { sourceId, targetId, reason, force } = (req.body ?? {}) as { sourceId?: string; targetId?: string; reason?: string; force?: boolean }
  if (!sourceId || !targetId) return res.status(400).json({ error: 'sourceId and targetId required' })
  const r = await mergeLeagues(sourceId, targetId, { reason, force, performedBy: 'admin' })
  res.status(r.status).json(r.ok ? { data: { mergeRecordId: r.mergeRecordId, movedCounts: r.movedCounts } } : { error: r.error })
})
router.get('/merges', async (_req, res) => {
  res.json({ data: await prisma.mergeRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }) })
})

export { router as adminQualityRouter }
