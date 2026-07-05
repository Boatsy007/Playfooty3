/**
 * Admin championship management (Phase B7) — mounted at /admin/championships.
 * ─────────────────────────────────────────────────────────────────────────────
 * Key-protected CRUD for championships, qualification rules, venues, teams and
 * outcomes. Additive; no existing route modified. Soft-delete only; championship
 * outcome history is immutable; overrides are logged to the audit trail.
 */

import { Router } from 'express'
import { prisma } from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { computeQualification } from '../championship/qualification.js'
import { recordChampionshipOutcome } from '../championship/history.js'
import { logQualityAction } from '../quality/audit.js'

const router = Router()
router.use(requireAdminKey)

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── Championships ─────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => { res.json({ data: await prisma.championship.findMany({ orderBy: [{ year: 'desc' }, { createdAt: 'desc' }] }) }) })

router.post('/', async (req, res) => {
  const b = (req.body ?? {}) as { name?: string; year?: number; division?: string; grade?: string; season?: string; maxTeams?: number; qualificationCutoff?: number; description?: string; venueId?: string; startDate?: string; endDate?: string }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const champ = await prisma.championship.create({
    data: {
      name: b.name, slug: `${slugify(b.name)}${b.year ? '-' + b.year : ''}`, year: b.year ?? null, division: b.division ?? 'OPEN',
      grade: b.grade ?? null, season: b.season ?? null, maxTeams: b.maxTeams ?? 16, qualificationCutoff: b.qualificationCutoff ?? null,
      description: b.description ?? null, venueId: b.venueId ?? null,
      startDate: b.startDate ? new Date(b.startDate) : null, endDate: b.endDate ? new Date(b.endDate) : null,
    },
  })
  await logQualityAction('CREATE_CHAMPIONSHIP', 'Championship', champ.id, { name: champ.name }, { performedBy: 'admin' })
  res.status(201).json({ data: champ })
})

router.patch('/:id', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  const allowed = ['name', 'year', 'division', 'grade', 'season', 'status', 'maxTeams', 'qualificationCutoff', 'description', 'venueId', 'startDate', 'endDate']
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in b) data[k] = (k === 'startDate' || k === 'endDate') && b[k] ? new Date(b[k] as string) : b[k]
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no editable fields' })
  const champ = await prisma.championship.update({ where: { id: req.params.id }, data })
  await logQualityAction('UPDATE_CHAMPIONSHIP', 'Championship', champ.id, data, { performedBy: 'admin' })
  res.json({ data: champ })
})

// Soft archive only.
router.delete('/:id', async (req, res) => {
  const champ = await prisma.championship.update({ where: { id: req.params.id }, data: { archivedAt: new Date() } })
  await logQualityAction('ARCHIVE_CHAMPIONSHIP', 'Championship', champ.id, { archivedAt: champ.archivedAt }, { performedBy: 'admin' })
  res.json({ data: { id: champ.id, archivedAt: champ.archivedAt } })
})

// ── Qualification rules ───────────────────────────────────────────────────────
router.get('/:id/rules', async (req, res) => { res.json({ data: await prisma.qualificationRule.findMany({ where: { championshipId: req.params.id }, orderBy: { priority: 'asc' } }) }) })
router.post('/:id/rules', async (req, res) => {
  const b = (req.body ?? {}) as { method?: string; priority?: number; quota?: number; params?: unknown }
  const METHODS = ['TOP_RANKING', 'LEAGUE_CHAMPION', 'WILDCARD', 'HOST_INVITATION', 'MANUAL_INVITATION', 'RETURNING_CHAMPION', 'ADMIN_OVERRIDE']
  if (!b.method || !METHODS.includes(b.method)) return res.status(400).json({ error: `method must be one of ${METHODS.join('|')}` })
  const rule = await prisma.qualificationRule.create({ data: { championshipId: req.params.id, method: b.method, priority: b.priority ?? 0, quota: b.quota ?? null, params: b.params ? JSON.stringify(b.params) : null } })
  res.status(201).json({ data: rule })
})

// Run qualification (freezes an immutable snapshot).
router.post('/:id/qualify', async (req, res) => {
  try { res.json({ data: await computeQualification(req.params.id, { generatedBy: 'admin' }) }) }
  catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'qualify failed' }) }
})

// ── Venues ────────────────────────────────────────────────────────────────────
router.get('/venues/all', async (_req, res) => { res.json({ data: await prisma.venue.findMany({ where: { archivedAt: null }, orderBy: { name: 'asc' } }) }) })
router.post('/venues', async (req, res) => {
  const b = (req.body ?? {}) as { name?: string; address?: string; state?: string; capacity?: number; courtCount?: number; indoorOutdoor?: string; contactName?: string; contactEmail?: string; contactPhone?: string; accommodationNotes?: string }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const venue = await prisma.venue.create({ data: { name: b.name, address: b.address ?? null, state: b.state ?? null, capacity: b.capacity ?? null, courtCount: b.courtCount ?? null, indoorOutdoor: b.indoorOutdoor ?? null, contactName: b.contactName ?? null, contactEmail: b.contactEmail ?? null, contactPhone: b.contactPhone ?? null, accommodationNotes: b.accommodationNotes ?? null } })
  res.status(201).json({ data: venue })
})

// ── Teams ─────────────────────────────────────────────────────────────────────
router.get('/:id/teams', async (req, res) => { res.json({ data: await prisma.championshipTeam.findMany({ where: { championshipId: req.params.id } }) }) })
router.post('/:id/teams', async (req, res) => {
  const b = (req.body ?? {}) as { clubId?: string; division?: string; coach?: string; manager?: string; captain?: string; colours?: string }
  if (!b.clubId) return res.status(400).json({ error: 'clubId required' })
  const club = await prisma.club.findUnique({ where: { id: b.clubId }, select: { name: true } })
  if (!club) return res.status(404).json({ error: 'club not found' })
  const team = await prisma.championshipTeam.upsert({
    where: { championshipId_clubId_division: { championshipId: req.params.id, clubId: b.clubId, division: b.division ?? '' } },
    create: { championshipId: req.params.id, clubId: b.clubId, clubName: club.name, division: b.division ?? '', coach: b.coach ?? null, manager: b.manager ?? null, captain: b.captain ?? null, colours: b.colours ?? null },
    update: { coach: b.coach ?? null, manager: b.manager ?? null, captain: b.captain ?? null, colours: b.colours ?? null },
  })
  res.status(201).json({ data: team })
})

// ── Outcome (immutable) ───────────────────────────────────────────────────────
router.post('/:id/outcome', async (req, res) => {
  const r = await recordChampionshipOutcome(req.params.id, (req.body ?? {}) as Record<string, unknown>, { performedBy: 'admin' })
  res.status(r.status).json(r.ok ? { data: { id: r.id } } : { error: r.error })
})

export { router as adminChampionshipsRouter }
