/**
 * Admin OCR image-import API (Phase 4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Password-guarded. Preview-first:
 *   POST /admin/ocr/parse   { image, leagueId? }  → OCR the ladder, fuzzy-match
 *                                                    clubs, return a PREVIEW
 *                                                    (no DB writes).
 *   POST /admin/ocr/commit  { leagueId, entries }  → apply the confirmed ladder
 *                                                    (source MANUAL_IMAGE) + rerank.
 *
 * The operator reviews the preview (uncertain rows are flagged) and confirms
 * before anything is written — nothing hits the rankings unreviewed.
 */

import { Router }          from 'express'
import { prisma }          from '../db/client.js'
import { requireAdminKey } from '../api/middleware/auth.js'
import { rankAndStore }    from '../jobs/playhq-scrape.js'
import { parseLadderImage } from '../ocr/parse-ladder-image.js'
import { fuzzyMatchClub, similarity } from '../ocr/fuzzy-match.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }          from '../utils/logger.js'

const router = Router()
router.use(requireAdminKey)

const SEASON = '2026'
const GRADE  = 'A Grade'
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function audit(action: string, entityId: string | null, after: unknown) {
  try {
    const u = await prisma.adminUser.upsert({ where: { email: 'admin@cnca.local' }, update: {}, create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' } })
    await prisma.auditLog.create({ data: { userId: u.id, action, entityType: 'League', entityId, after: after ? JSON.stringify(after) : null } })
  } catch (e) { logger.warn('OCR audit failed', { detail: String(e) }) }
}

/** POST /admin/ocr/parse — OCR + fuzzy match, returns a preview (no writes). */
router.post('/parse', async (req, res) => {
  try {
    const { image, leagueId } = req.body as { image?: string; leagueId?: string }
    if (!image) return res.status(400).json({ error: 'image (base64 or data URL) required' })

    const ocr = await parseLadderImage(image)
    if (ocr.rows.length === 0) return res.json({ data: { detectedLeague: ocr.league, matchedLeagueId: null, rows: [], notes: ocr.notes ?? 'no ladder rows detected' } })

    // Resolve the target league: explicit id, else fuzzy-match the detected name.
    const leagues = await prisma.league.findMany({ where: { isActive: true }, include: { association: { select: { name: true } } } })
    let matchedLeagueId = leagueId ?? null
    if (!matchedLeagueId && ocr.league) {
      let best: { id: string; s: number } | null = null
      for (const l of leagues) { const s = similarity(ocr.league, l.association?.name ?? l.name); if (!best || s > best.s) best = { id: l.id, s } }
      if (best && best.s >= 0.6) matchedLeagueId = best.id
    }

    // Candidate clubs to match against: the target league's clubs, else all.
    const candidates = matchedLeagueId
      ? (await prisma.club.findMany({ where: { leagueSeasons: { some: { leagueId: matchedLeagueId } } }, select: { id: true, name: true } }))
      : (await prisma.club.findMany({ select: { id: true, name: true }, take: 2000 }))

    const rows = ocr.rows.map(r => ({ ...r, match: fuzzyMatchClub(r.team, candidates) }))
    const uncertain = rows.filter(r => !r.match.confident).length
    res.json({ data: { detectedLeague: ocr.league, detectedGrade: ocr.grade, matchedLeagueId, rows, uncertain, notes: ocr.notes } })
  } catch (err) {
    logger.warn('OCR parse failed', { detail: String(err) })
    res.status(500).json({ error: err instanceof Error ? err.message : 'OCR failed' })
  }
})

/** POST /admin/ocr/commit — apply the confirmed ladder + rerank. */
router.post('/commit', async (req, res) => {
  try {
    const { leagueId, entries } = req.body as { leagueId?: string; entries?: { team: string; clubId?: string | null; position?: number; played?: number; wins?: number; losses?: number; draws?: number; goalsFor?: number; goalsAgainst?: number; points?: number }[] }
    if (!leagueId) return res.status(400).json({ error: 'leagueId required' })
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'entries required' })
    const league = await prisma.league.findUnique({ where: { id: leagueId } })
    if (!league) return res.status(404).json({ error: 'league not found' })

    const clubIds: string[] = []
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      let clubId = e.clubId ?? null
      if (!clubId) {
        // Operator accepted a new club (no fuzzy match) → create it, league-scoped.
        const slug = `${slugify(e.team)}-${league.id.slice(0, 8)}`
        const club = await prisma.club.upsert({ where: { slug }, create: { name: e.team, slug, shortName: e.team, stateId: league.stateId, region: league.name, isActive: true, source: 'MANUAL_IMAGE' }, update: {}, select: { id: true } })
        clubId = club.id
      }
      const gf = e.goalsFor ?? 0, ga = e.goalsAgainst ?? 0
      await prisma.clubLeagueSeason.upsert({
        where:  { clubId_leagueId_season_grade: { clubId, leagueId, season: SEASON, grade: GRADE } },
        create: { clubId, leagueId, season: SEASON, grade: GRADE, isActive: true, position: e.position ?? i + 1, played: e.played ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0, draws: e.draws ?? 0, goalsFor: gf, goalsAgainst: ga, percentage: ga > 0 ? (gf / ga) * 100 : 100, points: e.points ?? 0 },
        update: { position: e.position ?? i + 1, played: e.played ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0, draws: e.draws ?? 0, goalsFor: gf, goalsAgainst: ga, percentage: ga > 0 ? (gf / ga) * 100 : 100, points: e.points ?? 0 },
      })
      clubIds.push(clubId)
    }
    // Prune teams no longer on the ladder.
    await prisma.clubLeagueSeason.deleteMany({ where: { leagueId, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } } })

    // Record provenance: this league is now image-sourced + operator-owned.
    await prisma.league.update({ where: { id: leagueId }, data: { primarySource: 'MANUAL_IMAGE', importType: 'IMAGE', manualOverride: true, lastManualUpdateAt: new Date(), status: 'ACTIVE' } })
    const src = await prisma.leagueSource.findFirst({ where: { leagueId, season: SEASON, sourceType: 'MANUAL_IMAGE' } })
    if (!src) await prisma.leagueSource.create({ data: { leagueId, sourceType: 'MANUAL_IMAGE', season: SEASON, isActive: true, notes: 'Imported from ladder image', lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
    else await prisma.leagueSource.update({ where: { id: src.id }, data: { isActive: true, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })

    await audit('IMAGE_IMPORT', leagueId, { teams: clubIds.length })

    const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
    const note = locked ? 'rankings locked — not re-ranked' : `re-ranked ${(await rankAndStore(getISOWeekLabel())).clubsRanked} clubs`
    res.json({ data: { league: league.name, teams: clubIds.length }, note })
  } catch (err) {
    logger.warn('OCR commit failed', { detail: String(err) })
    res.status(500).json({ error: err instanceof Error ? err.message : 'commit failed' })
  }
})

export { router as adminOcrRouter }
