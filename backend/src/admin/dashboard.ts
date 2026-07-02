/**
 * Admin Dashboard API
 * ─────────────────────────────────────────────────────────────────────────────
 * Protected endpoints for the CNCA admin dashboard.
 *
 * GET  /admin/health          — system health + adapter ping
 * GET  /admin/status          — last job run status + stats
 * POST /admin/trigger         — manually trigger a ranking update
 * GET  /admin/review-queue    — clubs flagged for name review
 * POST /admin/review-queue/:id/approve — approve a reviewed name
 * POST /admin/review-queue/:id/reject  — reject and re-queue
 */

import { Router }        from 'express'
import { prisma }        from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { adminRateLimit }  from '../api/middleware/rate-limit.js'
import { noCache }         from '../api/middleware/cache-middleware.js'
import { checkAdapterHealth } from '../scrapers/scraper.engine.js'
import { runWeeklyUpdate }    from '../jobs/weekly-update.job.js'
import { runNGFNLPilot }      from '../jobs/pilot.js'
import { runAllPlayHQScrapes } from '../jobs/playhq-scrape.js'
import { runDiscoveryImport }  from '../jobs/discovery-import.js'
import { logger }             from '../utils/logger.js'

const router = Router()
router.use(requireAdminKey, adminRateLimit, noCache)

// GET /admin/health
router.get('/health', async (_req, res) => {
  try {
    const [adapterHealth, dbCheck] = await Promise.allSettled([
      checkAdapterHealth(),
      prisma.$queryRaw`SELECT 1`,
    ])

    res.json({
      status:   'ok',
      database: dbCheck.status === 'fulfilled' ? 'connected' : 'error',
      adapters: adapterHealth.status === 'fulfilled' ? adapterHealth.value : {},
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(500).json({ status: 'error' })
  }
})

// GET /admin/status
router.get('/status', async (_req, res) => {
  try {
    const lastRun = await prisma.rankingRun.findFirst({
      orderBy: { completedAt: 'desc' },
      select: {
        weekLabel:   true,
        season:      true,
        status:      true,
        clubCount:   true,
        completedAt: true,
      },
    })

    const totalLeagues = await prisma.league.count({ where: { isActive: true } })
    const totalClubs   = await prisma.club.count()
    const pendingReview = await prisma.reviewQueue.count({ where: { status: 'PENDING' } })

    res.json({
      lastRun,
      totals: { leagues: totalLeagues, clubs: totalClubs, pendingReview },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /admin/trigger
router.post('/trigger', async (_req, res) => {
  try {
    logger.info('AdminDashboard: manual ranking update triggered')

    // Run async — respond immediately with 202 Accepted
    res.status(202).json({ message: 'Ranking update started', startedAt: new Date().toISOString() })

    runWeeklyUpdate().catch(err => {
      logger.error('AdminDashboard: manual trigger failed', { error: err instanceof Error ? err.message : err })
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /admin/review-queue
router.get('/review-queue', async (_req, res) => {
  try {
    const items = await prisma.reviewQueue.findMany({
      where:   { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take:    50,
    })

    res.json({ data: items, meta: { total: items.length } })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /admin/review-queue/:id/approve
router.post('/review-queue/:id/approve', async (req, res) => {
  try {
    const { canonicalName } = req.body as { canonicalName?: string }

    await prisma.reviewQueue.update({
      where: { id: req.params.id },
      data:  { status: 'APPROVED', resolvedAt: new Date(), resolvedCanonical: canonicalName ?? null },
    })

    res.json({ message: 'Approved' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /admin/review-queue/:id/reject
router.post('/review-queue/:id/reject', async (req, res) => {
  try {
    await prisma.reviewQueue.update({
      where: { id: req.params.id },
      data:  { status: 'REJECTED', resolvedAt: new Date() },
    })

    res.json({ message: 'Rejected' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /admin/pilot
// Seeds NGFNL 2026 A Grade Netball data and generates a ranking run.
// Safe to call multiple times — upserts reference data idempotently.
router.post('/pilot', async (req, res) => {
  try {
    const { weekLabel } = req.body as { weekLabel?: string }
    logger.info('AdminDashboard: NGFNL pilot triggered', { weekLabel })

    const result = await runNGFNLPilot(weekLabel)

    if (result.status === 'FAILED') {
      res.status(500).json({ error: 'Pilot failed', detail: result.error })
      return
    }

    res.json({
      message:     'NGFNL pilot complete',
      runId:       result.runId,
      weekLabel:   result.weekLabel,
      season:      result.season,
      clubsRanked: result.clubsRanked,
      leagueId:    result.leagueId,
      next:        'GET /api/top10 to see ranked clubs',
    })
  } catch (err) {
    logger.error('AdminDashboard: pilot endpoint error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// POST /admin/scrape
// Scrapes every configured PlayHQ league's A Grade Netball ladder, stores the
// data, and re-runs the ranking engine across all of them. Ladder URLs come
// from each league's config (playhq-scrape.ts) or its env var override.
router.post('/scrape', async (req, res) => {
  try {
    const { weekLabel } = req.body as { weekLabel?: string }
    logger.info('AdminDashboard: PlayHQ scrape triggered', { weekLabel })

    // Respond immediately with 202 — scraping multiple leagues via Playwright
    // can take a minute or two.
    res.status(202).json({
      message:   'PlayHQ multi-league scrape started',
      startedAt: new Date().toISOString(),
      note:      'Check /admin/status for the latest ranking run once complete.',
    })

    runAllPlayHQScrapes({ weekLabel }).catch(err => {
      logger.error('AdminDashboard: PlayHQ scrape failed', { error: String(err) })
    })

  } catch (err) {
    logger.error('AdminDashboard: scrape endpoint error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// ─── Discovery admin (Phase 4) ────────────────────────────────────────────────

// POST /admin/discover — crawl PlayHQ, import A-Grade leagues, re-rank.
router.post('/discover', async (req, res) => {
  try {
    const { maxAssociations } = req.body as { maxAssociations?: number }
    logger.info('AdminDashboard: discovery import triggered', { maxAssociations })
    res.status(202).json({ message: 'Discovery import started', startedAt: new Date().toISOString(), note: 'Check /admin/leagues for results once complete.' })
    runDiscoveryImport({ maxAssociations }).catch(err => logger.error('AdminDashboard: discovery import failed', { error: String(err) }))
  } catch (err) {
    logger.error('AdminDashboard: discover endpoint error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /admin/associations — discovered associations
router.get('/associations', async (_req, res) => {
  try {
    const associations = await prisma.association.findMany({
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, playhqOrgSlug: true, playhqUrl: true, stateCode: true, active: true, lastDiscoveredAt: true, _count: { select: { leagues: true } } },
    })
    res.json({ data: associations, meta: { total: associations.length } })
  } catch (err) {
    logger.error('AdminDashboard: associations error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// GET /admin/leagues — leagues with discovery metadata + strength
router.get('/leagues', async (_req, res) => {
  try {
    const leagues = await prisma.league.findMany({
      orderBy: [{ needsStrengthReview: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, shortName: true, strengthScore: true, strengthTier: true,
        automaticStrengthRating: true, manualStrengthOverride: true, finalStrengthRating: true, strengthConfidence: true,
        enabled: true, autoDiscovered: true, needsStrengthReview: true, currentSeason: true,
        playhqGradeName: true, ladderUrl: true, ladderUrlOverride: true, gradeOverride: true,
        lastSyncedAt: true, syncError: true, association: { select: { name: true } },
        _count: { select: { clubSeasons: true } },
      },
    })
    res.json({ data: leagues, meta: { total: leagues.length } })
  } catch (err) {
    logger.error('AdminDashboard: leagues error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

// PATCH /admin/leagues/:id — set/clear the manual strength OVERRIDE (0–5),
// enable/disable, or set grade/ladder overrides. When the override changes we
// recompute finalStrengthRating and the derived strengthScore the engine reads.
// Pass manualStrengthOverride: null to clear it and fall back to automatic.
router.patch('/leagues/:id', async (req, res) => {
  try {
    const body = req.body as Partial<{ manualStrengthOverride: number | null; strengthNotes: string; enabled: boolean; gradeOverride: string; ladderUrlOverride: string }>

    const current = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!current) { res.status(404).json({ error: 'League not found' }); return }

    const data: Record<string, unknown> = {}
    if ('manualStrengthOverride' in body) {
      const override = body.manualStrengthOverride
      const final = override != null ? override : current.automaticStrengthRating
      data.manualStrengthOverride = override
      data.finalStrengthRating    = final
      data.strengthScore          = Math.max(0, Math.min(100, final * 20))
      data.strengthTier           = Math.max(1, Math.min(5, Math.round(final)))
      data.needsStrengthReview    = false
    }
    if (body.strengthNotes     !== undefined) data.strengthNotes = body.strengthNotes
    if (body.enabled           !== undefined) data.enabled = body.enabled
    if (body.gradeOverride     !== undefined) data.gradeOverride = body.gradeOverride || null
    if (body.ladderUrlOverride !== undefined) data.ladderUrlOverride = body.ladderUrlOverride || null

    const league = await prisma.league.update({ where: { id: req.params.id }, data })
    res.json({
      message: 'League updated',
      league: {
        id: league.id, name: league.name, enabled: league.enabled,
        automaticStrengthRating: league.automaticStrengthRating,
        manualStrengthOverride:  league.manualStrengthOverride,
        finalStrengthRating:     league.finalStrengthRating,
        strengthConfidence:      league.strengthConfidence,
      },
    })
  } catch (err) {
    logger.error('AdminDashboard: league patch error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

export { router as adminDashboardRouter }
