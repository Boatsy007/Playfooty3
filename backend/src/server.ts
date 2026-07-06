/**
 * PlayFooty Rankings API Server
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
app.use(express.json({ limit: '1mb' }))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/rankings',  rankingsRouter)   // /api/rankings, /api/rankings/top10, /api/rankings/top25 …
app.use('/api/clubs',     clubsRouter)      // /api/clubs, /api/clubs/:id, /api/clubs/history/:clubId
app.use('/api/leagues',   leaguesRouter)    // /api/leagues, /api/leagues/:id
app.use('/api/directory', directoryRouter)  // /api/directory — clubs by state → league
app.use('/api/news',      newsRouter)       // /api/news, /api/news/:slug — published articles

// ── Shortcut aliases (public API surface expected by consumers) ───────────────
// Mount rankingsRouter at /api as well so /api/top10, /api/top25, /api/top100,
// /api/rankings all resolve without the /rankings prefix.
app.use('/api', rankingsRouter)

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
    logger.info(`PlayFooty Rankings API listening on port ${PORT}`)
  })
}

export default app
