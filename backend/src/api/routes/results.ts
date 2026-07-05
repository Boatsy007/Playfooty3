/**
 * Results & Fixtures public API (Phase B5) — additive read-only endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/results and /api/fixtures, plus club/league sub-routers that
 * add /:id/results and /:id/fixtures WITHOUT modifying the existing clubs/leagues
 * routers (they are appended, so they only handle paths the originals 404).
 */

import { Router } from 'express'
import { prisma } from '../../db/client.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { cachePublic } from '../middleware/cache-middleware.js'
import { getClubResults, getLeagueResults, getClubMatchHistory } from '../../results/results.service.js'
import { getClubFixtures, getLeagueFixtures } from '../../results/fixtures.service.js'
import { getStatLeaderboards } from '../../results/statistics.js'
import { getRoundSummary } from '../../results/rounds.js'
import { getCurrentLadder } from '../../ladder/ladders.service.js'
import { clubUpNext } from '../../ladder/up-next.js'
import { logger } from '../../utils/logger.js'

// ── /api/results ──────────────────────────────────────────────────────────────
const results = Router()
results.get('/', publicRateLimit, cachePublic(300), async (req, res) => {
  const { league, season, round, limit } = req.query as Record<string, string>
  const where = { ...(league ? { leagueId: league } : {}), ...(season ? { season } : {}), ...(round ? { round: parseInt(round, 10) } : {}) }
  const data = await prisma.matchResult.findMany({ where, orderBy: [{ matchDate: 'desc' }, { round: 'desc' }], take: Math.min(parseInt(limit ?? '200', 10) || 200, 1000) })
  res.json({ data, meta: { total: data.length } })
})
results.get('/leaderboards', publicRateLimit, cachePublic(600), async (req, res) => {
  const season = (req.query.season as string) || (await prisma.setting.findUnique({ where: { key: 'currentSeason' } }).catch(() => null))?.value
  if (!season) return res.json({ data: null })
  res.json({ data: await getStatLeaderboards(season) })
})
results.get('/insights', publicRateLimit, cachePublic(300), async (req, res) => {
  const { season, kind, round } = req.query as Record<string, string>
  const where = { ...(season ? { season } : {}), ...(kind ? { kind } : {}), ...(round ? { round: parseInt(round, 10) } : {}) }
  res.json({ data: await prisma.matchInsight.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }) })
})
results.get('/club/:clubId', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getClubResults(String(req.params.clubId), { season: req.query.season as string | undefined }) })
})
results.get('/club/:clubId/history', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getClubMatchHistory(String(req.params.clubId), req.query.season as string | undefined) })
})
results.get('/league/:leagueId', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getLeagueResults(String(req.params.leagueId), { season: req.query.season as string | undefined, round: req.query.round ? parseInt(String(req.query.round), 10) : undefined }) })
})
results.get('/:id', publicRateLimit, cachePublic(300), async (req, res) => {
  const r = await prisma.matchResult.findUnique({ where: { id: String(req.params.id) } })
  if (!r) return res.status(404).json({ error: 'result not found' })
  res.json({ data: r })
})

// ── /api/fixtures ─────────────────────────────────────────────────────────────
const fixtures = Router()
fixtures.get('/', publicRateLimit, cachePublic(300), async (req, res) => {
  const { league, season, round, status } = req.query as Record<string, string>
  const where = { ...(league ? { leagueId: league } : {}), ...(season ? { season } : {}), ...(round ? { round: parseInt(round, 10) } : {}), ...(status ? { status } : {}) }
  const data = await prisma.fixture.findMany({ where, orderBy: [{ matchDate: 'asc' }, { round: 'asc' }], take: 500 })
  res.json({ data, meta: { total: data.length } })
})
fixtures.get('/club/:clubId', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getClubFixtures(String(req.params.clubId), { season: req.query.season as string | undefined, upcomingOnly: req.query.upcoming === 'true' }) })
})
fixtures.get('/league/:leagueId', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getLeagueFixtures(String(req.params.leagueId), { season: req.query.season as string | undefined, round: req.query.round ? parseInt(String(req.query.round), 10) : undefined }) })
})
fixtures.get('/:id', publicRateLimit, cachePublic(300), async (req, res) => {
  const f = await prisma.fixture.findUnique({ where: { id: String(req.params.id) } })
  if (!f) return res.status(404).json({ error: 'fixture not found' })
  res.json({ data: f })
})

// ── Club/league sub-routers (append to /api/clubs and /api/leagues) ───────────
// These only handle /:id/results and /:id/fixtures — paths the existing routers
// do not define — so they never shadow or break an existing endpoint.
const clubMatch = Router()
clubMatch.get('/:id/results', publicRateLimit, cachePublic(300), async (req, res) => {
  try { res.json({ data: await getClubResults(String(req.params.id), { season: req.query.season as string | undefined }) }) }
  catch (err) { logger.error('GET /clubs/:id/results', { detail: String(err) }); res.status(500).json({ error: 'failed' }) }
})
clubMatch.get('/:id/fixtures', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getClubFixtures(String(req.params.id), { season: req.query.season as string | undefined, upcomingOnly: req.query.upcoming === 'true' }) })
})
// Ladder V2 — GET /api/clubs/:id/up-next (next fixture + upcoming)
clubMatch.get('/:id/up-next', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await clubUpNext(String(req.params.id), { season: req.query.season as string | undefined }) })
})

const leagueMatch = Router()
leagueMatch.get('/:id/results', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getLeagueResults(String(req.params.id), { season: req.query.season as string | undefined, round: req.query.round ? parseInt(String(req.query.round), 10) : undefined }) })
})
leagueMatch.get('/:id/fixtures', publicRateLimit, cachePublic(300), async (req, res) => {
  res.json({ data: await getLeagueFixtures(String(req.params.id), { season: req.query.season as string | undefined, round: req.query.round ? parseInt(String(req.query.round), 10) : undefined }) })
})
// B10 — GET /api/leagues/:id/rounds/:round/summary
leagueMatch.get('/:id/rounds/:round/summary', publicRateLimit, cachePublic(600), async (req, res) => {
  const summary = await getRoundSummary(String(req.params.id), parseInt(String(req.params.round), 10), { season: req.query.season as string | undefined, grade: req.query.grade as string | undefined })
  if (!summary) return res.status(404).json({ error: 'no summary for this round' })
  res.json({ data: summary })
})
// Ladder V2 — GET /api/leagues/:id/ladder (current ladder, uploaded or generated)
leagueMatch.get('/:id/ladder', publicRateLimit, cachePublic(300), async (req, res) => {
  const ladder = await getCurrentLadder(String(req.params.id), { season: req.query.season as string | undefined, grade: req.query.grade as string | undefined })
  if (!ladder) return res.status(404).json({ error: 'no current ladder' })
  res.json({ data: ladder })
})

export { results as resultsRouter, fixtures as fixturesRouter, clubMatch as clubMatchRouter, leagueMatch as leagueMatchRouter }
