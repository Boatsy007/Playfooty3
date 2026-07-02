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
import { adminDashboardRouter } from './admin/dashboard.js'
import { adminSettingsRouter }  from './admin/settings.js'
import { logger }              from './utils/logger.js'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// ── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))
app.use(express.json({ limit: '1mb' }))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/rankings',  rankingsRouter)
app.use('/api/clubs',     clubsRouter)
app.use('/api/leagues',   leaguesRouter)

// ── Admin routes (key-protected) ─────────────────────────────────────────────
app.use('/admin',          adminDashboardRouter)
app.use('/admin/settings', adminSettingsRouter)

// ── Health check (public, unauthenticated) ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version ?? '1.0.0' })
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
