/**
 * Country Footy import (gap-fill) + re-rank
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports Country Footy → NetballConnect A-Grade (premier senior women's)
 * ladders for Victorian country leagues that PlayHQ does NOT already cover, then
 * re-runs the ranking engine. Gap-fill only: any Country Footy league whose
 * canonical name overlaps an existing active league is SKIPPED, so a team can
 * never enter the rankings from two sources. Club/league identity is scoped by
 * the NetballConnect org key, and the ranking input builder additionally dedupes
 * by (club name + state), so duplicates cannot reach the standings.
 *
 * Usage: tsx src/jobs/countryfooty-import.ts [--leagues=hampden,ballarat] [--max=5]
 */

import { prisma }        from '../db/client.js'
import { rankAndStore }  from './playhq-scrape.js'
import { scrapeCountryFooty, type CFLeague } from '../scrapers/countryfooty.js'
import { computeAutomaticStrength, finalStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }        from '../utils/logger.js'

const SEASON = '2026'   // ranking cohort season (matches the PlayHQ cohort)
const GRADE  = 'A Grade'

/** Canonical league key — strips sport/league/geography suffixes so
 *  "Geelong & District FNL" and "Geelong & District" collide. */
const STOP = new Set(['netball', 'football', 'league', 'association', 'fnl', 'fna', 'nfl', 'fnc', 'and', 'district', 'districts', 'inc', 'the', 'club', 'senior', 'womens', 'women', 'div', 'division'])
export function canonLeague(name: string): string {
  return (name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(w => w && !STOP.has(w)).join('')
}

export interface CFImportResult {
  runId: string; weekLabel: string
  scraped: number; imported: number; skippedOverlap: string[]; clubsRanked: number
  imported_: { league: string; teams: number; division: string }[]
  status: 'SUCCESS' | 'FAILED' | 'NO_DATA'; error?: string
}

export async function runCountryFootyImport(opts: { leagueFilter?: string[]; maxLeagues?: number } = {}): Promise<CFImportResult> {
  const label = getISOWeekLabel()
  const imported_: { league: string; teams: number; division: string }[] = []
  const skippedOverlap: string[] = []
  try {
    // Existing active leagues → canonical overlap set (PlayHQ is source of truth).
    const existing = await prisma.league.findMany({
      where: { isActive: true, enabled: true },
      include: { association: { select: { name: true } } },
    })
    const covered = new Set(existing.map(l => canonLeague(l.association?.name ?? l.name)))

    const leagues = await scrapeCountryFooty(opts)
    logger.info('CountryFooty: scraped', { count: leagues.length })

    for (const lg of leagues) {
      const key = canonLeague(lg.leagueName)
      if (covered.has(key)) { skippedOverlap.push(lg.leagueName); logger.info('CountryFooty: skip overlap', { league: lg.leagueName }); continue }
      try {
        const teams = await importCFLeague(lg)
        if (teams > 0) { imported_.push({ league: lg.leagueName, teams, division: lg.divisionName }); covered.add(key) }
      } catch (err) {
        logger.warn('CountryFooty: import failed', { league: lg.leagueName, detail: String(err) })
      }
    }

    const rankable = await prisma.leagueSource.count({ where: { season: SEASON, isActive: true } })
    if (rankable === 0) return { runId: '', weekLabel: label, scraped: leagues.length, imported: imported_.length, skippedOverlap, clubsRanked: 0, imported_, status: 'NO_DATA' }
    const { runId, clubsRanked } = await rankAndStore(label)
    logger.info('CountryFooty: complete', { imported: imported_.length, skipped: skippedOverlap.length, clubsRanked })
    return { runId, weekLabel: label, scraped: leagues.length, imported: imported_.length, skippedOverlap, clubsRanked, imported_, status: 'SUCCESS' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('CountryFooty: failed', { error: msg })
    return { runId: '', weekLabel: label, scraped: 0, imported: 0, skippedOverlap, clubsRanked: 0, imported_, status: 'FAILED', error: msg }
  }
}

/** Upsert one Country Footy league + its A-Grade ladder. Returns team count. */
async function importCFLeague(lg: CFLeague): Promise<number> {
  const state = await prisma.state.upsert({ where: { code: 'VIC' }, create: { code: 'VIC', name: 'Victoria' }, update: {} })
  const assocSlug = `cf-${lg.orgKey}`

  const association = await prisma.association.upsert({
    where:  { playhqOrgSlug: assocSlug },
    create: { name: lg.leagueName, playhqOrgSlug: assocSlug, playhqUrl: lg.ladderUrl, stateCode: 'VIC', active: true, lastDiscoveredAt: new Date() },
    update: { name: lg.leagueName, lastDiscoveredAt: new Date() },
  })

  // Adopt an existing CF league row or create one. Public name = league label.
  let league = await prisma.league.findFirst({ where: { playhqOrgSlug: assocSlug } })
  if (!league) {
    league = await prisma.league.create({
      data: {
        name: lg.leagueName, shortName: lg.leagueName, stateId: state.id, associationId: association.id,
        isActive: true, enabled: true, autoDiscovered: true, needsStrengthReview: false,
        strengthScore: 60, strengthTier: 3, automaticStrengthRating: 3.0, finalStrengthRating: 3.0, strengthConfidence: 0.3,
        strengthNotes: 'Country Footy / NetballConnect — strength from ladder.',
        playhqOrgSlug: assocSlug, playhqGradeName: lg.divisionName, ladderUrl: lg.ladderUrl,
        currentSeason: `Winter ${lg.season}`, lastSyncedAt: new Date(),
      },
    })
  } else {
    if (!league.enabled) { logger.info('CountryFooty: league disabled, skipping', { league: league.name }); return 0 }
    league = await prisma.league.update({
      where: { id: league.id },
      data: { associationId: association.id, isActive: true, autoDiscovered: true, playhqGradeName: lg.divisionName, ladderUrl: lg.ladderUrl, currentSeason: `Winter ${lg.season}`, lastSyncedAt: new Date(), syncError: null },
    })
  }

  // Strength from ladder.
  const auto = computeAutomaticStrength(lg.entries, 1)
  const final = finalStrength(auto.rating, league.manualStrengthOverride)
  await prisma.league.update({
    where: { id: league.id },
    data: { automaticStrengthRating: auto.rating, finalStrengthRating: final, strengthConfidence: auto.confidence,
      strengthScore: strengthScoreFromRating(final), strengthTier: Math.max(1, Math.min(5, Math.round(final))), needsStrengthReview: auto.confidence < 0.4 },
  })

  // Source (NETBALL_CONNECT) so ranking includes it.
  const src = await prisma.leagueSource.findFirst({ where: { leagueId: league.id, season: SEASON, sourceType: 'NETBALL_CONNECT' } })
  if (!src) await prisma.leagueSource.create({ data: { leagueId: league.id, sourceType: 'NETBALL_CONNECT', season: SEASON, isActive: true, ladderUrl: lg.ladderUrl, notes: `Country Footy: ${lg.competitionName} / ${lg.divisionName}`, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
  else await prisma.leagueSource.update({ where: { id: src.id }, data: { ladderUrl: lg.ladderUrl, isActive: true, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })

  // Clubs + season stats. Identity scoped by org key so CF clubs never collide
  // with PlayHQ clubs (or with other CF orgs).
  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-cf-' + lg.orgKey.slice(0, 8)
  const clubIds: string[] = []
  for (const e of lg.entries) {
    const club = await prisma.club.upsert({
      where:  { slug: slugify(e.teamRaw) },
      create: { name: e.teamRaw, slug: slugify(e.teamRaw), shortName: e.teamRaw, stateId: state.id, region: lg.leagueName, isActive: true },
      update: {},
      select: { id: true },
    })
    clubIds.push(club.id)
    await prisma.clubLeagueSeason.upsert({
      where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE } },
      create: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true, position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
      update: { position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
    })
  }
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: league.id, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } } })
  logger.info('CountryFooty: league imported', { league: league.name, division: lg.divisionName, teams: clubIds.length })
  return clubIds.length
}
