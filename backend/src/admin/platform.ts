/**
 * Admin Platform API — dashboard, national recalculation, review queue, backups.
 * Password-guarded. Mounted at /admin/platform.
 */

import { Router }          from 'express'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { recalculateNational } from '../jobs/recompute-strength.js'
import { logger }          from '../utils/logger.js'

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
    prisma.leagueSource.count({ where: { sourceType: 'MANUAL_IMAGE' } }),
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
  const items = await prisma.reviewItem.findMany({ where: status === 'ALL' ? {} : { status }, orderBy: { createdAt: 'desc' }, take: 200 })
  res.json({ data: items })
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

// ─── Backups / restore points ─────────────────────────────────────────────────
async function snapshot(): Promise<{ counts: Record<string, number>; data: string }> {
  const [states, associations, leagues, clubs, leagueSources, clubLeagueSeasons] = await Promise.all([
    prisma.state.findMany(), prisma.association.findMany(), prisma.league.findMany(),
    prisma.club.findMany(), prisma.leagueSource.findMany(), prisma.clubLeagueSeason.findMany(),
  ])
  const counts = { states: states.length, associations: associations.length, leagues: leagues.length, clubs: clubs.length, leagueSources: leagueSources.length, clubLeagueSeasons: clubLeagueSeasons.length }
  return { counts, data: JSON.stringify({ states, associations, leagues, clubs, leagueSources, clubLeagueSeasons }) }
}

router.get('/backups', async (_req, res) => {
  const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, label: true, kind: true, counts: true, createdAt: true } })
  res.json({ data: backups })
})
router.post('/backups', async (req, res) => {
  const { label } = req.body as { label?: string }
  const snap = await snapshot()
  const backup = await prisma.backup.create({ data: { label: label ?? `Backup ${new Date().toISOString()}`, kind: 'MANUAL', counts: JSON.stringify(snap.counts), data: snap.data } })
  await audit('CREATE_BACKUP', 'Backup', backup.id, snap.counts)
  res.status(201).json({ data: { id: backup.id, counts: snap.counts } })
})
// Restore reseeds core tables from a backup (upsert; takes a safety snapshot first).
router.post('/backups/:id/restore', async (req, res) => {
  const backup = await prisma.backup.findUnique({ where: { id: req.params.id } })
  if (!backup) return res.status(404).json({ error: 'not found' })
  // Safety snapshot before restore.
  const pre = await snapshot()
  await prisma.backup.create({ data: { label: `Pre-restore ${new Date().toISOString()}`, kind: 'PRE_RESTORE', counts: JSON.stringify(pre.counts), data: pre.data } })

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
