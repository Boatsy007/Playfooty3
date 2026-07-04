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
import { validateClubIdentity } from '../validation/club-identity.js'
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
    if (ocr.rows.length === 0) {
      // Keep the attempt in history too — failed reads are part of the audit trail.
      const rec = await prisma.ocrImport.create({ data: { image, detectedLeague: ocr.league, detectedGrade: ocr.grade, rowCount: 0, notes: ocr.notes ?? 'no ladder rows detected' } }).catch(() => null)
      return res.json({ data: { importId: rec?.id ?? null, detectedLeague: ocr.league, matchedLeagueId: null, rows: [], notes: ocr.notes ?? 'no ladder rows detected' } })
    }

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
    const confidence = rows.length ? rows.reduce((s, r) => s + (r.match.score ?? 0), 0) / rows.length : null

    // Persist the import — original image, extraction, confidence, timestamp.
    // Status stays PREVIEWED until the operator commits (or it is discarded).
    const rec = await prisma.ocrImport.create({ data: {
      image, leagueId: matchedLeagueId, detectedLeague: ocr.league, detectedGrade: ocr.grade,
      rowCount: rows.length, uncertainCount: uncertain, confidence,
      rows: JSON.stringify(rows), notes: ocr.notes,
    } }).catch(e => { logger.warn('OCR history save failed', { detail: String(e) }); return null })

    res.json({ data: { importId: rec?.id ?? null, detectedLeague: ocr.league, detectedGrade: ocr.grade, matchedLeagueId, rows, uncertain, confidence, notes: ocr.notes } })
  } catch (err) {
    logger.warn('OCR parse failed', { detail: String(err) })
    res.status(500).json({ error: err instanceof Error ? err.message : 'OCR failed' })
  }
})

/** POST /admin/ocr/commit — apply the confirmed ladder + rerank. */
router.post('/commit', async (req, res) => {
  try {
    const { leagueId, entries, importId } = req.body as { leagueId?: string; importId?: string; entries?: { team: string; clubId?: string | null; position?: number; played?: number; wins?: number; losses?: number; draws?: number; goalsFor?: number; goalsAgainst?: number; points?: number }[] }
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
        const verdict = validateClubIdentity(e.team)
        const name = verdict.canonical ?? e.team
        const slug = `${slugify(name)}-${league.id.slice(0, 8)}`
        const club = await prisma.club.upsert({ where: { slug }, create: { name, slug, shortName: e.team, stateId: league.stateId, region: league.name, townName: verdict.isAnonymous ? null : name, isActive: true, source: 'MANUAL_IMAGE', approvalStatus: verdict.verdict === 'VALID' ? 'APPROVED' : 'PENDING' }, update: {}, select: { id: true } })
        clubId = club.id
        // Anonymous / ambiguous names go to the review queue (import proceeds —
        // the operator confirmed it — but the identity still gets a second look).
        if (verdict.verdict !== 'VALID') {
          await prisma.reviewItem.create({ data: { entityType: 'Club', entityId: clubId, kind: verdict.isAnonymous ? 'ANONYMOUS_CLUB' : 'UNCERTAIN_CLUB', reason: `${verdict.reason} — "${e.team}" from image import into ${league.name}`, confidence: verdict.confidence, payload: JSON.stringify({ raw: e.team, leagueId }) } }).catch(() => {})
        }
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

    await audit('IMAGE_IMPORT', leagueId, { teams: clubIds.length, importId: importId ?? null })

    // Close the loop on the stored import: what was applied, where, and when.
    if (importId) {
      await prisma.ocrImport.update({ where: { id: importId }, data: {
        status: 'COMMITTED', leagueId, leagueName: league.name,
        committedRows: JSON.stringify(entries), committedAt: new Date(),
      } }).catch(e => logger.warn('OCR history commit update failed', { detail: String(e) }))
    }

    const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
    const note = locked ? 'rankings locked — not re-ranked' : `re-ranked ${(await rankAndStore(getISOWeekLabel())).clubsRanked} clubs`
    res.json({ data: { league: league.name, teams: clubIds.length }, note })
  } catch (err) {
    logger.warn('OCR commit failed', { detail: String(err) })
    res.status(500).json({ error: err instanceof Error ? err.message : 'commit failed' })
  }
})

/** GET /admin/ocr/history — every import ever made (without the image payloads). */
router.get('/history', async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 50, 200)
  const imports = await prisma.ocrImport.findMany({
    orderBy: { createdAt: 'desc' }, take,
    select: { id: true, leagueId: true, leagueName: true, detectedLeague: true, detectedGrade: true, rowCount: true, uncertainCount: true, confidence: true, status: true, notes: true, createdBy: true, createdAt: true, committedAt: true },
  })
  res.json({ data: imports })
})

/** GET /admin/ocr/history/:id — one import including the original image + rows. */
router.get('/history/:id', async (req, res) => {
  const rec = await prisma.ocrImport.findUnique({ where: { id: req.params.id } })
  if (!rec) return res.status(404).json({ error: 'not found' })
  res.json({ data: rec })
})

/** POST /admin/ocr/history/:id/discard — soft-close a preview (never deleted). */
router.post('/history/:id/discard', async (req, res) => {
  const rec = await prisma.ocrImport.findUnique({ where: { id: req.params.id } })
  if (!rec) return res.status(404).json({ error: 'not found' })
  if (rec.status === 'COMMITTED') return res.status(400).json({ error: 'already committed — cannot discard' })
  const updated = await prisma.ocrImport.update({ where: { id: rec.id }, data: { status: 'DISCARDED' } })
  res.json({ data: { id: updated.id, status: updated.status } })
})

export { router as adminOcrRouter }
