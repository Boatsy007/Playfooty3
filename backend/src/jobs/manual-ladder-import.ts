/**
 * Manual ladder import (from transcribed images) + re-rank
 * ─────────────────────────────────────────────────────────────────────────────
 * For leagues with no scrapable online ladder, the operator pastes a screenshot
 * of the A-Grade ladder in chat; Claude transcribes it to a JSON file (below)
 * after the operator confirms the parsed table. This job imports those ladders
 * exactly like a scraped source (MANUAL_IMAGE), with the SAME gap-fill dedup so
 * a team can never be double-counted against PlayHQ / Country Footy.
 *
 * Input file (default data/manual-ladders.json), array of:
 *   {
 *     "league": "Sunraysia",            // public league name (association-style)
 *     "state": "VIC",                   // optional, defaults VIC
 *     "grade": "A Grade",               // must be the premier senior women's grade
 *     "season": "2026",                 // optional label, defaults current year
 *     "entries": [
 *       { "team": "Mildura", "played": 7, "wins": 6, "losses": 1, "draws": 0,
 *         "goalsFor": 320, "goalsAgainst": 210, "points": 24 }
 *     ]
 *   }
 *
 * Usage: tsx src/jobs/manual-ladder-import.ts [--file=data/manual-ladders.json]
 */

import { readFile }      from 'fs/promises'
import { prisma }        from '../db/client.js'
import { rankAndStore }  from './playhq-scrape.js'
import { computeAutomaticStrength, finalStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import { canonLeague }   from './countryfooty-import.js'
import { isIneligibleDivision } from '../scrapers/countryfooty.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }        from '../utils/logger.js'

const SEASON = '2026'
const GRADE  = 'A Grade'

interface ManualEntry { team: string; played?: number; wins?: number; losses?: number; draws?: number; goalsFor?: number; goalsAgainst?: number; points?: number; percentage?: number }
interface ManualLadder { league: string; state?: string; grade?: string; season?: string; entries: ManualEntry[] }

export async function runManualLadderImport(file: string): Promise<void> {
  const raw = await readFile(file, 'utf8')
  const ladders = JSON.parse(raw) as ManualLadder[]
  if (!Array.isArray(ladders)) throw new Error('Manual ladders file must be a JSON array')

  // Gap-fill: never import over an existing active league.
  const existing = await prisma.league.findMany({ where: { isActive: true, enabled: true }, include: { association: { select: { name: true } } } })
  const covered = new Set(existing.map(l => canonLeague(l.association?.name ?? l.name)))

  const imported: { league: string; teams: number }[] = []
  const skipped: string[] = []

  for (const l of ladders) {
    const grade = l.grade ?? 'A Grade'
    if (isIneligibleDivision(grade)) { skipped.push(`${l.league} (ineligible grade "${grade}")`); continue }
    const key = canonLeague(l.league)
    if (covered.has(key)) { skipped.push(`${l.league} (overlaps existing league)`); continue }
    if (!Array.isArray(l.entries) || l.entries.length < 4) { skipped.push(`${l.league} (need ≥4 teams)`); continue }

    const teams = await importManualLeague(l)
    if (teams > 0) { imported.push({ league: l.league, teams }); covered.add(key) }
  }

  const { clubsRanked } = await rankAndStore(getISOWeekLabel())

  console.log('\n═══ MANUAL LADDER IMPORT ═══')
  console.log(`Imported : ${imported.length}`)
  for (const x of imported) console.log(`  ✓ ${x.league} — ${x.teams} teams`)
  if (skipped.length) { console.log('Skipped  :'); for (const s of skipped) console.log(`  ✗ ${s}`) }
  console.log(`Clubs ranked: ${clubsRanked}`)
}

async function importManualLeague(l: ManualLadder): Promise<number> {
  const code = (l.state ?? 'VIC').toUpperCase()
  const state = await prisma.state.upsert({ where: { code }, create: { code, name: code }, update: {} })
  const slug = `img-${canonLeague(l.league)}`

  const association = await prisma.association.upsert({
    where:  { playhqOrgSlug: slug },
    create: { name: l.league, playhqOrgSlug: slug, stateCode: code, active: true, lastDiscoveredAt: new Date() },
    update: { name: l.league, lastDiscoveredAt: new Date() },
  })

  let league = await prisma.league.findFirst({ where: { playhqOrgSlug: slug } })
  if (!league) {
    league = await prisma.league.create({
      data: { name: l.league, shortName: l.league, stateId: state.id, associationId: association.id, isActive: true, enabled: true,
        autoDiscovered: false, needsStrengthReview: false, strengthScore: 60, strengthTier: 3, automaticStrengthRating: 3.0, finalStrengthRating: 3.0, strengthConfidence: 0.3,
        strengthNotes: 'Manual image import — strength from ladder.', playhqOrgSlug: slug, playhqGradeName: l.grade ?? GRADE, currentSeason: `Winter ${l.season ?? new Date().getFullYear()}`, lastSyncedAt: new Date() },
    })
  } else if (!league.enabled) { logger.info('Manual: league disabled, skipping', { league: league.name }); return 0 }

  const entries = l.entries.map((e, i) => {
    const gf = e.goalsFor ?? 0, ga = e.goalsAgainst ?? 0
    return { rank: i + 1, teamRaw: e.team, played: e.played ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0, draws: e.draws ?? 0,
      goalsFor: gf, goalsAgainst: ga, percentage: e.percentage ?? (ga > 0 ? parseFloat(((gf / ga) * 100).toFixed(2)) : 100), points: e.points ?? 0 }
  })

  const auto = computeAutomaticStrength(entries, 1)
  const final = finalStrength(auto.rating, league.manualStrengthOverride)
  await prisma.league.update({ where: { id: league.id }, data: { automaticStrengthRating: auto.rating, finalStrengthRating: final, strengthConfidence: auto.confidence, strengthScore: strengthScoreFromRating(final), strengthTier: Math.max(1, Math.min(5, Math.round(final))) } })

  const src = await prisma.leagueSource.findFirst({ where: { leagueId: league.id, season: SEASON, sourceType: 'MANUAL_IMAGE' } })
  if (!src) await prisma.leagueSource.create({ data: { leagueId: league.id, sourceType: 'MANUAL_IMAGE', season: SEASON, isActive: true, notes: 'Imported from operator-supplied ladder image.', lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
  else await prisma.leagueSource.update({ where: { id: src.id }, data: { isActive: true, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })

  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + slug
  const clubIds: string[] = []
  for (const e of entries) {
    const club = await prisma.club.upsert({ where: { slug: slugify(e.teamRaw) }, create: { name: e.teamRaw, slug: slugify(e.teamRaw), shortName: e.teamRaw, stateId: state.id, region: l.league, isActive: true }, update: {}, select: { id: true } })
    clubIds.push(club.id)
    await prisma.clubLeagueSeason.upsert({
      where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE } },
      create: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true, position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
      update: { position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
    })
  }
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: league.id, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } } })
  logger.info('Manual: league imported', { league: league.name, teams: clubIds.length })
  return clubIds.length
}

const file = process.argv.find(a => a.startsWith('--file='))?.split('=')[1] ?? 'data/manual-ladders.json'
runManualLadderImport(file)
  .then(() => prisma.$disconnect())
  .catch(async e => { console.error('Manual import failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
