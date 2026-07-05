/**
 * Admin history endpoints (Phase B6) — mounted at /admin/history.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected controls for the historical engine. Additive; no existing route
 * modified. Archiving is immutable; corrections are recorded as NEW rows in the
 * correction ledger (history is never rewritten) and logged to the audit trail.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runHistoryEngine } from '../history/index.js'
import { archiveRankingRun } from '../history/archive.js'
import { computeRecordBook } from '../history/records.js'
import { logQualityAction } from '../quality/audit.js'

const router = Router()
router.use(requireAdminKey)

// Full engine run: archive latest run + rebuild histories + record book.
router.post('/run', async (req, res) => {
  const b = (req.body ?? {}) as { runId?: string }
  try { res.json({ data: await runHistoryEngine({ runId: b.runId }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'history run failed' }) }
})

// Archive a specific (or the latest) run only.
router.post('/archive', async (req, res) => {
  const b = (req.body ?? {}) as { runId?: string }
  res.json({ data: await archiveRankingRun(b.runId) })
})

router.post('/records/rebuild', async (_req, res) => { res.json({ data: await computeRecordBook() }) })

router.get('/records', async (_req, res) => { res.json({ data: await prisma.recordBookEntry.findMany({ orderBy: { title: 'asc' } }) }) })
router.get('/corrections', async (_req, res) => { res.json({ data: await prisma.historyCorrection.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }) }) })

// Record a correction — history is IMMUTABLE, so this creates a NEW ledger row
// documenting the change; the archived row itself is never rewritten.
router.post('/corrections', async (req, res) => {
  const b = (req.body ?? {}) as { weekLabel?: string; entityType?: 'CLUB' | 'LEAGUE'; entityId?: string; field?: string; oldValue?: string; newValue?: string; reason?: string }
  if (!b.weekLabel || !b.entityType || !b.entityId || !b.field) return res.status(400).json({ error: 'weekLabel, entityType, entityId, field required' })
  const row = await prisma.historyCorrection.create({ data: { weekLabel: b.weekLabel, entityType: b.entityType, entityId: b.entityId, field: b.field, oldValue: b.oldValue ?? null, newValue: b.newValue ?? null, reason: b.reason ?? null, performedBy: 'admin' } })
  await logQualityAction('HISTORY_CORRECTION', b.entityType, b.entityId, { field: b.field, oldValue: b.oldValue, newValue: b.newValue }, { reason: b.reason ?? 'history correction', performedBy: 'admin' })
  res.status(201).json({ data: row })
})

export { router as adminHistoryRouter }
