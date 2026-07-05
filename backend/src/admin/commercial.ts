/**
 * Admin commercial endpoints (Phase B8) — mounted at /admin/commercial.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected maintenance + reporting for the commercial platform. Additive;
 * no existing route modified. The full commercial CRUD lives on the permission-
 * gated /api/commercial + /api/sponsors surface — this adds seed/sweep/audit.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { runCommercialSweep } from '../commercial/index.js'
import { commercialReports } from '../commercial/reports.service.js'

const router = Router()
router.use(requireAdminKey)

router.post('/seed', async (_req, res) => { res.json({ data: await runCommercialSweep({ seed: true, performedBy: 'admin' }) }) })
router.post('/sweep', async (_req, res) => { res.json({ data: await runCommercialSweep({ seed: false, performedBy: 'admin' }) }) })
router.get('/reports', async (_req, res) => { res.json({ data: await commercialReports() }) })

// Commercial audit trail (from the shared AuditLog, source = COMMERCIAL).
router.get('/audit', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ where: { source: 'COMMERCIAL' }, orderBy: { createdAt: 'desc' }, take: 300 })
  res.json({ data: logs })
})

// Sponsorship workflow event ledger for one deal.
router.get('/sponsorships/:id/events', async (req, res) => {
  res.json({ data: await prisma.sponsorshipEvent.findMany({ where: { sponsorshipId: req.params.id }, orderBy: { createdAt: 'asc' } }) })
})

export { router as adminCommercialRouter }
