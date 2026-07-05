/**
 * CNCA Rankings API Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Express server exposing the rankings data API and admin endpoints.
 * Deployed as a Vercel serverless function (api/index.ts re-exports this).
 */

import express                 from 'express'
import cors                    from 'cors'
import { rankingsRouter }      from './api/routes/rankings.js'
import { clubsRouter }         from './api/routes/clubs.js'
import { leaguesRouter }       from './api/routes/leagues.js'
import { directoryRouter }     from './api/routes/directory.js'
import { newsRouter }          from './api/routes/news.js'
import { adminDashboardRouter } from './admin/dashboard.js'
import { adminSettingsRouter }  from './admin/settings.js'
import { adminManageRouter }    from './admin/manage.js'
import { adminOcrRouter }       from './admin/ocr.js'
import { adminPlatformRouter }  from './admin/platform.js'
import { adminClaimingRouter }  from './admin/claiming.js'
import { adminNewsroomRouter }  from './admin/newsroom.js'
import { adminQualityRouter }   from './admin/quality.js'
import { adminResultsRouter }   from './admin/results.js'
import { adminHistoryRouter }   from './admin/history.js'
import { adminChampionshipsRouter } from './admin/championships.js'
import { adminCommercialRouter } from './admin/commercial.js'
import { adminNotificationsRouter } from './admin/notifications.js'
import { adminAnalyticsRouter } from './admin/analytics.js'
import { adminLadderRouter } from './admin/ladder.js'
import { adminSeasonRouter } from './admin/season.js'
import { resultsRouter, fixturesRouter, clubMatchRouter, leagueMatchRouter } from './api/routes/results.js'
import { historyRouter }        from './api/routes/history.js'
import { championshipsRouter }  from './api/routes/championships.js'
import { sponsorsRouter, commercialRouter, commercialClubRouter, commercialLeagueRouter } from './api/routes/sponsors.js'
import { notificationsRouter } from './api/routes/notifications.js'
import { analyticsRouter } from './api/routes/analytics.js'
import { claimsRouter }         from './api/routes/claims.js'
import { portalRouter }         from './api/routes/portal.js'
import { logger }              from './utils/logger.js'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))
// Ladder images are large — give the OCR route a bigger JSON limit. Registered
// before the global 1mb parser so it wins for /admin/ocr and everything else
// stays capped at 1mb.
app.use('/admin/ocr', express.json({ limit: '20mb' }))
// CSV imports (ladders) can be large too.
app.use('/admin/platform/csv', express.json({ limit: '20mb' }))
// Full-season imports (many rounds / multiple OCR/CSV payloads) can be large.
app.use('/admin/season', express.json({ limit: '25mb' }))
app.use(express.json({ limit: '1mb' }))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/rankings',  rankingsRouter)   // /api/rankings, /api/rankings/top10, /api/rankings/top25 …
app.use('/api/clubs',     clubsRouter)      // /api/clubs, /api/clubs/:id, /api/clubs/history/:clubId
app.use('/api/leagues',   leaguesRouter)    // /api/leagues, /api/leagues/:id
app.use('/api/directory', directoryRouter)  // /api/directory — clubs by state → league
app.use('/api/news',      newsRouter)       // /api/news, /api/news/:slug — published articles

// Phase B2 — claiming platform (additive; nothing exposed in the UI yet)
app.use('/api/claims',    claimsRouter)     // POST /club, /league; GET /; PATCH /:id
app.use('/api/portal',    portalRouter)     // /api/portal/clubs/:id/{claim,invite,audit,media,sponsors,members}

// Phase B5 — results & fixtures (additive, read-only public surface)
app.use('/api/results',   resultsRouter)    // /api/results, /api/results/:id, /club/:id, /league/:id, /leaderboards, /insights
app.use('/api/fixtures',  fixturesRouter)   // /api/fixtures, /api/fixtures/:id, /club/:id, /league/:id
// Append match sub-routes to clubs/leagues WITHOUT touching the existing routers
// (they only match /:id/results and /:id/fixtures, which the originals 404).
app.use('/api/clubs',     clubMatchRouter)
app.use('/api/leagues',   leagueMatchRouter)

// Phase B7 — championships (public reads; admin-gated writes)
app.use('/api/championships', championshipsRouter)

// Phase B8 — sponsorship & commercial platform (public reads; admin-gated writes)
app.use('/api/sponsors',    sponsorsRouter)
app.use('/api/commercial',  commercialRouter)
app.use('/api/clubs',       commercialClubRouter)   // GET /api/clubs/:id/sponsors
app.use('/api/leagues',     commercialLeagueRouter) // GET /api/leagues/:id/sponsors

// Phase B9 — notifications & automation (public reads; admin-gated writes)
app.use('/api/notifications', notificationsRouter)

// Phase B11 — analytics (public rate-limited ingest; admin-gated reports)
app.use('/api/analytics', analyticsRouter)

// ── Shortcut aliases (public API surface expected by consumers) ───────────────
// Mount rankingsRouter at /api as well so /api/top10, /api/top25, /api/top100,
// /api/rankings all resolve without the /rankings prefix.
app.use('/api', rankingsRouter)

// Phase B6 — historical rankings & records (additive, read-only). Mounted BEFORE
// the legacy delegation below: it only handles multi-segment paths (/clubs/:id,
// /leagues/:id, /weeks, /records, /compare, /timeline/...), so a bare
// /api/history/:clubId request falls through untouched to the legacy handler.
app.use('/api/history', historyRouter)

// /api/history/:clubId → delegate to clubsRouter's /history/:clubId handler
app.use('/api/history', (req, res, next) => {
  req.url = `/history${req.url}`   // rewrite /api/history/abc → /history/abc for clubsRouter
  clubsRouter(req, res, next)
})

// ── Admin routes (key-protected) ─────────────────────────────────────────────
app.use('/admin',          adminDashboardRouter)
app.use('/admin/settings', adminSettingsRouter)
app.use('/admin/manage',   adminManageRouter)
app.use('/admin/ocr',      adminOcrRouter)
app.use('/admin/platform', adminPlatformRouter)
app.use('/admin/claiming', adminClaimingRouter)   // Phase B2 — profile mgmt + verification
app.use('/admin/newsroom', adminNewsroomRouter)   // Phase B3 — intelligence layer (backend only)
app.use('/admin/quality',  adminQualityRouter)    // Phase B4 — data quality & integrity engine
app.use('/admin/results',  adminResultsRouter)    // Phase B5 — results & fixtures engine
app.use('/admin/history',  adminHistoryRouter)    // Phase B6 — historical rankings & records engine
app.use('/admin/championships', adminChampionshipsRouter) // Phase B7 — championship engine
app.use('/admin/commercial', adminCommercialRouter)       // Phase B8 — commercial platform
app.use('/admin/notifications', adminNotificationsRouter) // Phase B9 — notifications & automation
app.use('/admin/analytics', adminAnalyticsRouter)         // Phase B11 — analytics & insights
app.use('/admin/ladder',   adminLadderRouter)             // Ladder Import V2 — ladders + bulk backfill
app.use('/admin/season',   adminSeasonRouter)             // Phase B10.5 — full season ingestion engine

// ── Health check (public, unauthenticated) ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version ?? '1.0.0' })
})

// ── Debug endpoint — shows env/DB status (remove once confirmed working) ─────
app.get('/api/debug', async (_req, res) => {
  const hasDbUrl    = !!process.env.DATABASE_URL
  const hasDirectUrl = !!process.env.DIRECT_URL
  const hasAdminKey = !!process.env.ADMIN_API_KEY
  let dbPing: string
  try {
    const { PrismaClient } = await import('@prisma/client')
    const pc = new PrismaClient()
    await pc.$queryRaw`SELECT 1`
    await pc.$disconnect()
    dbPing = 'ok'
  } catch (e) {
    dbPing = String(e)
  }
  res.json({ hasDbUrl, hasDirectUrl, hasAdminKey, dbPing })
})

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Start (skip in serverless; Vercel imports this module directly) ──────────
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`CNCA Rankings API listening on port ${PORT}`)
  })
}

export default app
