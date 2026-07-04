/**
 * Admin Management API (Phase 3)
 * ─────────────────────────────────────────────────────────────────────────────
 * Password-guarded (Bearer ADMIN_API_KEY) write endpoints for the admin panel.
 * Every write is audit-logged, stamps lastManualUpdateAt + manualOverride so
 * automated imports never clobber operator edits, and re-ranks automatically
 * where the standings are affected (unless rankings are locked).
 *
 * Mounted at /admin/manage.
 *
 *  Leagues:  GET /leagues · POST /leagues · PATCH /leagues/:id · DELETE /leagues/:id
 *            POST /leagues/:id/strength · POST /leagues/:id/scraping
 *            POST /leagues/:id/flag · PUT /leagues/:id/ladder · POST /leagues/merge
 *  Clubs:    GET /clubs · POST /clubs · PATCH /clubs/:id · DELETE /clubs/:id
 *            POST /clubs/:id/move · POST /clubs/merge · POST /clubs/:id/flag
 *  Rankings: POST /rankings/rerank · POST /rankings/lock · POST /rankings/unlock
 */

import { Router }          from 'express'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { rankAndStore }    from '../jobs/playhq-scrape.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }          from '../utils/logger.js'

const router = Router()
router.use(requireAdminKey)

const SEASON = '2026'
const GRADE  = 'A Grade'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function adminUserId(): Promise<string> {
  const u = await prisma.adminUser.upsert({
    where:  { email: 'admin@cnca.local' },
    update: { lastLoginAt: new Date() },
    create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN', lastLoginAt: new Date() },
  })
  return u.id
}

async function audit(action: string, entityType: string, entityId: string | null, before: unknown, after: unknown) {
  try {
    await prisma.auditLog.create({ data: { userId: await adminUserId(), action, entityType, entityId, before: before ? JSON.stringify(before) : null, after: after ? JSON.stringify(after) : null } })
  } catch (e) { logger.warn('Audit log failed', { action, detail: String(e) }) }
}

async function rankingsLocked(): Promise<boolean> {
  const s = await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null)
  return s?.value === 'true'
}

/** Re-rank unless locked. Returns a note for the response. */
async function rerank(): Promise<string> {
  if (await rankingsLocked()) return 'rankings locked — not re-ranked'
  const { clubsRanked } = await rankAndStore(getISOWeekLabel())
  return `re-ranked ${clubsRanked} clubs`
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
async function stateId(code: string): Promise<string> {
  const c = (code || 'VIC').toUpperCase()
  const s = await prisma.state.upsert({ where: { code: c }, create: { code: c, name: c }, update: {} })
  return s.id
}

// ─── LEAGUES ──────────────────────────────────────────────────────────────────

router.get('/leagues', async (_req, res) => {
  const leagues = await prisma.league.findMany({
    include: { state: { select: { code: true } }, association: { select: { name: true } }, _count: { select: { clubSeasons: true } } },
    orderBy: [{ strengthScore: 'desc' }],
  })
  res.json({ data: leagues })
})

// Create a manual league that doesn't exist on PlayHQ.
router.post('/leagues', async (req, res) => {
  const b = req.body as { name?: string; state?: string; region?: string; strength?: number; website?: string; facebook?: string; logo?: string; season?: string; source?: string; hidden?: boolean }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const sid = await stateId(b.state ?? 'VIC')
  const override = typeof b.strength === 'number' ? Math.max(0, Math.min(5, b.strength)) : null
  const league = await prisma.league.create({
    data: {
      name: b.name, shortName: b.name, stateId: sid, isActive: true, enabled: true,
      primarySource: b.source ?? 'MANUAL', importType: 'MANUAL', manualOverride: true, hidden: !!b.hidden,
      regionName: b.region ?? null, websiteUrl: b.website ?? null, facebookUrl: b.facebook ?? null, logoUrl: b.logo ?? null,
      currentSeason: `Winter ${b.season ?? SEASON}`, lastManualUpdateAt: new Date(),
      manualStrengthOverride: override, finalStrengthRating: override ?? 3.0, strengthScore: (override ?? 3.0) * 20,
      strengthTier: Math.round(override ?? 3), needsStrengthReview: override == null, status: 'ACTIVE',
    },
  })
  await audit('CREATE_LEAGUE', 'League', league.id, null, league)
  res.status(201).json({ data: league })
})

// Edit any league metadata (rename, state, region, links, hidden, status…).
router.patch('/leagues/:id', async (req, res) => {
  const before = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'not found' })
  const b = req.body as Record<string, unknown>
  const data: Record<string, unknown> = { lastManualUpdateAt: new Date(), manualOverride: true }
  for (const k of ['name', 'shortName', 'regionName', 'websiteUrl', 'facebookUrl', 'logoUrl', 'status', 'hidden', 'enabled', 'isActive', 'currentSeason', 'primarySource', 'sourceUrl'])
    if (k in b) data[k] = b[k]
  if ('state' in b) data.stateId = await stateId(String(b.state))
  const updated = await prisma.league.update({ where: { id: req.params.id }, data })
  await audit('UPDATE_LEAGUE', 'League', updated.id, before, updated)
  res.json({ data: updated, note: await rerank() })
})

// Set/clear the manual strength override (0–5).
router.post('/leagues/:id/strength', async (req, res) => {
  const { override } = req.body as { override: number | null }
  const before = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'not found' })
  const ov = override == null ? null : Math.max(0, Math.min(5, override))
  const final = ov ?? before.automaticStrengthRating
  const updated = await prisma.league.update({
    where: { id: req.params.id },
    data: { manualStrengthOverride: ov, finalStrengthRating: final, strengthScore: final * 20, strengthTier: Math.round(final), needsStrengthReview: ov == null && before.strengthConfidence < 0.45, lastManualUpdateAt: new Date() },
  })
  await audit('SET_LEAGUE_STRENGTH', 'League', updated.id, before, updated)
  res.json({ data: updated, note: await rerank() })
})

// Enable/disable automated scraping for a league.
router.post('/leagues/:id/scraping', async (req, res) => {
  const { enabled } = req.body as { enabled: boolean }
  await prisma.leagueSource.updateMany({ where: { leagueId: req.params.id }, data: { isActive: !!enabled } })
  const updated = await prisma.league.update({ where: { id: req.params.id }, data: { status: enabled ? 'ACTIVE' : 'DISABLED', lastManualUpdateAt: new Date() } })
  await audit('TOGGLE_SCRAPING', 'League', updated.id, null, { enabled })
  res.json({ data: updated })
})

router.post('/leagues/:id/flag', async (req, res) => {
  const { note } = req.body as { note?: string }
  const updated = await prisma.league.update({ where: { id: req.params.id }, data: { needsStrengthReview: true, syncError: note ?? 'Flagged by admin', lastManualUpdateAt: new Date() } })
  await audit('FLAG_LEAGUE', 'League', updated.id, null, { note })
  res.json({ data: updated })
})

// Replace a league's A-Grade ladder (manual edit). entries: [{team,played,wins,losses,draws,goalsFor,goalsAgainst,points}]
router.put('/leagues/:id/ladder', async (req, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } })
  if (!league) return res.status(404).json({ error: 'not found' })
  const entries = (req.body?.entries ?? []) as { team: string; played?: number; wins?: number; losses?: number; draws?: number; goalsFor?: number; goalsAgainst?: number; points?: number }[]
  if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'entries required' })

  const clubIds: string[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const gf = e.goalsFor ?? 0, ga = e.goalsAgainst ?? 0
    const club = await prisma.club.upsert({
      where:  { slug: `${slugify(e.team)}-${league.id.slice(0, 8)}` },
      create: { name: e.team, slug: `${slugify(e.team)}-${league.id.slice(0, 8)}`, shortName: e.team, stateId: league.stateId, region: league.name, isActive: true, source: 'MANUAL' },
      update: {},
      select: { id: true },
    })
    clubIds.push(club.id)
    await prisma.clubLeagueSeason.upsert({
      where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE } },
      create: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true, position: i + 1, played: e.played ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0, draws: e.draws ?? 0, goalsFor: gf, goalsAgainst: ga, percentage: ga > 0 ? (gf / ga) * 100 : 100, points: e.points ?? 0 },
      update: { position: i + 1, played: e.played ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0, draws: e.draws ?? 0, goalsFor: gf, goalsAgainst: ga, percentage: ga > 0 ? (gf / ga) * 100 : 100, points: e.points ?? 0 },
    })
  }
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: league.id, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } } })
  await prisma.league.update({ where: { id: league.id }, data: { lastManualUpdateAt: new Date(), manualOverride: true } })
  await audit('EDIT_LADDER', 'League', league.id, null, { teams: clubIds.length })
  res.json({ data: { teams: clubIds.length }, note: await rerank() })
})

// Merge duplicate leagues — move keeper survives, loser's clubs move over.
router.post('/leagues/merge', async (req, res) => {
  const { keepId, mergeId } = req.body as { keepId: string; mergeId: string }
  if (!keepId || !mergeId || keepId === mergeId) return res.status(400).json({ error: 'keepId and mergeId required' })
  // Move loser's club-seasons to keeper (drop conflicts).
  const rows = await prisma.clubLeagueSeason.findMany({ where: { leagueId: mergeId } })
  for (const r of rows) {
    const clash = await prisma.clubLeagueSeason.findFirst({ where: { clubId: r.clubId, leagueId: keepId, season: r.season, grade: r.grade } })
    if (clash) await prisma.clubLeagueSeason.delete({ where: { id: r.id } })
    else await prisma.clubLeagueSeason.update({ where: { id: r.id }, data: { leagueId: keepId } })
  }
  await prisma.leagueSource.deleteMany({ where: { leagueId: mergeId } })
  await prisma.rankingEntry.deleteMany({ where: { leagueId: mergeId } })
  await prisma.league.delete({ where: { id: mergeId } })
  await audit('MERGE_LEAGUES', 'League', keepId, { mergeId }, { keepId })
  res.json({ data: { keepId }, note: await rerank() })
})

router.delete('/leagues/:id', async (req, res) => {
  const clubs = await prisma.clubLeagueSeason.findMany({ where: { leagueId: req.params.id }, select: { clubId: true }, distinct: ['clubId'] })
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: req.params.id } })
  await prisma.leagueSource.deleteMany({ where: { leagueId: req.params.id } })
  await prisma.rankingEntry.deleteMany({ where: { leagueId: req.params.id } })
  const orphans = [] as string[]
  for (const c of clubs) if ((await prisma.clubLeagueSeason.count({ where: { clubId: c.clubId } })) === 0) orphans.push(c.clubId)
  if (orphans.length) {
    await prisma.rankingEntry.deleteMany({ where: { clubId: { in: orphans } } })
    await prisma.rankingSnapshot.deleteMany({ where: { clubId: { in: orphans } } })
    await prisma.clubNameVariant.deleteMany({ where: { clubId: { in: orphans } } })
    await prisma.club.deleteMany({ where: { id: { in: orphans } } })
  }
  await prisma.league.delete({ where: { id: req.params.id } })
  await audit('DELETE_LEAGUE', 'League', req.params.id, null, null)
  res.json({ data: { deleted: req.params.id }, note: await rerank() })
})

// ─── CLUBS ────────────────────────────────────────────────────────────────────

router.get('/clubs', async (req, res) => {
  const leagueId = req.query.leagueId as string | undefined
  const clubs = leagueId
    ? await prisma.club.findMany({ where: { leagueSeasons: { some: { leagueId } } }, include: { state: { select: { code: true } } } })
    : await prisma.club.findMany({ include: { state: { select: { code: true } } }, take: 500, orderBy: { name: 'asc' } })
  res.json({ data: clubs })
})

router.post('/clubs', async (req, res) => {
  const b = req.body as { name?: string; leagueId?: string; state?: string; logo?: string; website?: string; primaryColour?: string; secondaryColour?: string; region?: string; notes?: string }
  if (!b.name) return res.status(400).json({ error: 'name required' })
  const league = b.leagueId ? await prisma.league.findUnique({ where: { id: b.leagueId } }) : null
  const sid = league?.stateId ?? await stateId(b.state ?? 'VIC')
  const club = await prisma.club.create({
    data: { name: b.name, slug: `${slugify(b.name)}-${(b.leagueId ?? 'manual').slice(0, 8)}`, shortName: b.name, stateId: sid, region: b.region ?? league?.name ?? null, logoUrl: b.logo ?? null, websiteUrl: b.website ?? null, primaryColour: b.primaryColour ?? null, secondaryColour: b.secondaryColour ?? null, notes: b.notes ?? null, source: 'MANUAL', manualOverride: true, isActive: true },
  })
  if (league) await prisma.clubLeagueSeason.create({ data: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true, played: 0, wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, percentage: 0, points: 0 } })
  await audit('CREATE_CLUB', 'Club', club.id, null, club)
  res.status(201).json({ data: club })
})

router.patch('/clubs/:id', async (req, res) => {
  const before = await prisma.club.findUnique({ where: { id: req.params.id } })
  if (!before) return res.status(404).json({ error: 'not found' })
  const b = req.body as Record<string, unknown>
  const data: Record<string, unknown> = { manualOverride: true }
  for (const k of ['name', 'shortName', 'logoUrl', 'websiteUrl', 'facebookUrl', 'primaryColour', 'secondaryColour', 'region', 'notes', 'isActive', 'bestRank'])
    if (k in b) data[k] = b[k]
  if ('state' in b) data.stateId = await stateId(String(b.state))
  const updated = await prisma.club.update({ where: { id: req.params.id }, data })
  await audit('UPDATE_CLUB', 'Club', updated.id, before, updated)
  res.json({ data: updated })
})

// Move a club to another league (reassign its current-season ladder row).
router.post('/clubs/:id/move', async (req, res) => {
  const { toLeagueId } = req.body as { toLeagueId: string }
  if (!toLeagueId) return res.status(400).json({ error: 'toLeagueId required' })
  await prisma.clubLeagueSeason.updateMany({ where: { clubId: req.params.id, season: SEASON, grade: GRADE }, data: { leagueId: toLeagueId } })
  await audit('MOVE_CLUB', 'Club', req.params.id, null, { toLeagueId })
  res.json({ data: { moved: req.params.id, toLeagueId }, note: await rerank() })
})

// Merge duplicate clubs — keeper survives, loser's history + name variant fold in.
router.post('/clubs/merge', async (req, res) => {
  const { keepId, mergeId } = req.body as { keepId: string; mergeId: string }
  if (!keepId || !mergeId || keepId === mergeId) return res.status(400).json({ error: 'keepId and mergeId required' })
  const loser = await prisma.club.findUnique({ where: { id: mergeId } })
  if (!loser) return res.status(404).json({ error: 'mergeId not found' })
  const rows = await prisma.clubLeagueSeason.findMany({ where: { clubId: mergeId } })
  for (const r of rows) {
    const clash = await prisma.clubLeagueSeason.findFirst({ where: { clubId: keepId, leagueId: r.leagueId, season: r.season, grade: r.grade } })
    if (clash) await prisma.clubLeagueSeason.delete({ where: { id: r.id } })
    else await prisma.clubLeagueSeason.update({ where: { id: r.id }, data: { clubId: keepId } })
  }
  await prisma.clubNameVariant.create({ data: { clubId: keepId, rawName: loser.name, sourceType: 'MERGE', confidence: 1 } }).catch(() => {})
  await prisma.rankingEntry.deleteMany({ where: { clubId: mergeId } })
  await prisma.rankingSnapshot.deleteMany({ where: { clubId: mergeId } })
  await prisma.clubNameVariant.deleteMany({ where: { clubId: mergeId } })
  await prisma.club.delete({ where: { id: mergeId } })
  await audit('MERGE_CLUBS', 'Club', keepId, { mergeId, mergeName: loser.name }, { keepId })
  res.json({ data: { keepId }, note: await rerank() })
})

router.delete('/clubs/:id', async (req, res) => {
  await prisma.clubLeagueSeason.deleteMany({ where: { clubId: req.params.id } })
  await prisma.rankingEntry.deleteMany({ where: { clubId: req.params.id } })
  await prisma.rankingSnapshot.deleteMany({ where: { clubId: req.params.id } })
  await prisma.clubNameVariant.deleteMany({ where: { clubId: req.params.id } })
  await prisma.club.delete({ where: { id: req.params.id } })
  await audit('DELETE_CLUB', 'Club', req.params.id, null, null)
  res.json({ data: { deleted: req.params.id }, note: await rerank() })
})

// ─── RANKINGS ─────────────────────────────────────────────────────────────────

router.post('/rankings/rerank', async (_req, res) => {
  if (await rankingsLocked()) return res.status(423).json({ error: 'rankings are locked' })
  const { runId, clubsRanked } = await rankAndStore(getISOWeekLabel())
  await audit('RERANK', 'Ranking', runId, null, { clubsRanked })
  res.json({ data: { runId, clubsRanked } })
})

router.post('/rankings/lock', async (_req, res) => {
  await prisma.setting.upsert({ where: { key: 'rankingsLocked' }, create: { key: 'rankingsLocked', value: 'true' }, update: { value: 'true' } })
  await audit('LOCK_RANKINGS', 'Ranking', null, null, null)
  res.json({ data: { locked: true } })
})

router.post('/rankings/unlock', async (_req, res) => {
  await prisma.setting.upsert({ where: { key: 'rankingsLocked' }, create: { key: 'rankingsLocked', value: 'false' }, update: { value: 'false' } })
  await audit('UNLOCK_RANKINGS', 'Ranking', null, null, null)
  res.json({ data: { locked: false } })
})

export { router as adminManageRouter }
