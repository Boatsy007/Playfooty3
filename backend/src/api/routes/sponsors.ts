/**
 * Sponsorship & commercial public API (Phase B8) — additive.
 * ─────────────────────────────────────────────────────────────────────────────
 * /api/sponsors (sponsor businesses) + /api/commercial (deals, inventory, tiers,
 * premium, reports) + club/league sponsor sub-routers appended to /api/clubs and
 * /api/leagues. GETs are public; writes are admin-gated via attachActor +
 * requireAdminActor (permission-ready for future commercial-manager roles).
 */

import { Router } from 'express'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { cachePublic } from '../middleware/cache-middleware.js'
import { attachActor, requireAdminActor } from '../middleware/permissions.js'
import { listSponsors, getSponsor, createSponsor, updateSponsor, softDeleteSponsor } from '../../commercial/sponsors.service.js'
import { createSponsorship, transition, softDeleteSponsorship, getClubSponsorships, getLeagueSponsorships, type SponsorshipStatus } from '../../commercial/sponsorships.service.js'
import { listInventory, createInventory, bookInventory, releaseInventory } from '../../commercial/inventory.service.js'
import { listTiers, addCustomTier } from '../../commercial/tiers.service.js'
import { setPremium, getPremium, listPremium } from '../../commercial/premium.service.js'
import { commercialReports } from '../../commercial/reports.service.js'
import { runCommercialSweep } from '../../commercial/index.js'
import { logger } from '../../utils/logger.js'

// ── /api/sponsors ─────────────────────────────────────────────────────────────
const sponsors = Router()
sponsors.use(attachActor)
sponsors.get('/', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await listSponsors({ state: req.query.state as string | undefined, industry: req.query.industry as string | undefined, status: req.query.status as string | undefined }) })
})
sponsors.get('/:id', publicRateLimit, cachePublic(300), async (req, res) => {
  const s = await getSponsor(String(req.params.id))
  if (!s) return res.status(404).json({ error: 'sponsor not found' })
  res.json({ data: s })
})
sponsors.post('/', requireAdminActor, async (req, res) => {
  const r = await createSponsor((req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: r.sponsor } : { error: r.error })
})
sponsors.patch('/:id', requireAdminActor, async (req, res) => {
  const r = await updateSponsor(String(req.params.id), (req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 200 : 400).json(r.ok ? { data: r.sponsor } : { error: r.error })
})
sponsors.delete('/:id', requireAdminActor, async (req, res) => {
  const r = await softDeleteSponsor(String(req.params.id), 'admin')
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: { archived: true } } : { error: r.error })
})

// ── /api/commercial ───────────────────────────────────────────────────────────
const commercial = Router()
commercial.use(attachActor)

// Reports (admin — includes revenue placeholder).
commercial.get('/reports', requireAdminActor, async (_req, res) => { res.json({ data: await commercialReports() }) })

// Sponsorship deals.
commercial.post('/sponsorships', requireAdminActor, async (req, res) => {
  const r = await createSponsorship((req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: r.sponsorship } : { error: r.error })
})
commercial.patch('/sponsorships/:id', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { status?: SponsorshipStatus; note?: string }
  if (!b.status) return res.status(400).json({ error: 'status required' })
  const r = await transition(String(req.params.id), b.status, { note: b.note, performedBy: 'admin' })
  res.status(r.status).json(r.ok ? { data: r.sponsorship } : { error: r.error })
})
commercial.delete('/sponsorships/:id', requireAdminActor, async (req, res) => {
  const r = await softDeleteSponsorship(String(req.params.id), 'admin')
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: { archived: true } } : { error: r.error })
})

// Inventory.
commercial.get('/inventory', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await listInventory({ placement: req.query.placement as string | undefined, availableOnly: req.query.available === 'true' }) })
})
commercial.post('/inventory', requireAdminActor, async (req, res) => {
  const r = await createInventory((req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: r.inventory } : { error: r.error })
})
commercial.post('/inventory/:id/book', requireAdminActor, async (req, res) => {
  const b = (req.body ?? {}) as { sponsorshipId?: string; start?: string; end?: string }
  if (!b.sponsorshipId) return res.status(400).json({ error: 'sponsorshipId required' })
  const r = await bookInventory(String(req.params.id), b.sponsorshipId, { start: b.start, end: b.end, performedBy: 'admin' })
  res.status(r.ok ? 200 : 400).json(r.ok ? { data: r.inventory } : { error: r.error })
})
commercial.post('/inventory/:id/release', requireAdminActor, async (req, res) => {
  const r = await releaseInventory(String(req.params.id), 'admin')
  res.status(r.ok ? 200 : 404).json(r.ok ? { data: r.inventory } : { error: r.error })
})

// Tiers.
commercial.get('/tiers', publicRateLimit, cachePublic(3600), async (_req, res) => { res.json({ data: await listTiers() }) })
commercial.post('/tiers', requireAdminActor, async (req, res) => {
  const r = await addCustomTier((req.body ?? {}) as Record<string, unknown>, 'admin')
  res.status(r.ok ? 201 : 400).json(r.ok ? { data: r.tier } : { error: r.error })
})

// Premium.
commercial.get('/premium', requireAdminActor, async (req, res) => {
  res.json({ data: await listPremium({ scope: req.query.scope as 'CLUB' | 'LEAGUE' | undefined, status: req.query.status as string | undefined }) })
})
commercial.get('/premium/:scope/:entityId', publicRateLimit, cachePublic(300), async (req, res) => {
  const scope = String(req.params.scope).toUpperCase()
  if (scope !== 'CLUB' && scope !== 'LEAGUE') return res.status(400).json({ error: 'scope must be club|league' })
  res.json({ data: await getPremium(scope, String(req.params.entityId)) })
})
commercial.post('/premium/:scope/:entityId', requireAdminActor, async (req, res) => {
  const scope = String(req.params.scope).toUpperCase()
  if (scope !== 'CLUB' && scope !== 'LEAGUE') return res.status(400).json({ error: 'scope must be club|league' })
  res.json({ data: await setPremium(scope, String(req.params.entityId), (req.body ?? {}) as Record<string, unknown>, 'admin') })
})

// Maintenance sweep.
commercial.post('/sweep', requireAdminActor, async (req, res) => {
  try { res.json({ data: await runCommercialSweep({ seed: (req.body as { seed?: boolean })?.seed, performedBy: 'admin' }) }) }
  catch (err) { logger.error('commercial sweep', { detail: String(err) }); res.status(500).json({ error: 'sweep failed' }) }
})

// ── Club / league sponsor sub-routers (appended to /api/clubs, /api/leagues) ──
const commercialClub = Router()
commercialClub.get('/:id/sponsors', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getClubSponsorships(String(req.params.id), req.query.all !== 'true') })
})
const commercialLeague = Router()
commercialLeague.get('/:id/sponsors', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getLeagueSponsorships(String(req.params.id), req.query.all !== 'true') })
})

export { sponsors as sponsorsRouter, commercial as commercialRouter, commercialClub as commercialClubRouter, commercialLeague as commercialLeagueRouter }
