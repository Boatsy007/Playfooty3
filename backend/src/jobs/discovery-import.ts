/**
 * Discovery Import Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the PlayHQ discovery crawler, then imports every discovered Senior
 * Women's A Grade league into the DB and re-runs the EXISTING ranking engine.
 *
 * Ranking is untouched — this only changes where the ladder data comes from.
 * New leagues are created with a default 3★ strength and flagged
 * needsStrengthReview until you set the real rating in the admin panel; existing
 * leagues keep their manual strength.
 *
 * Requires the Phase-4 additive migration to have been applied
 * (prisma/migrations/manual/2026_discovery_fields.sql).
 *
 * Usage:
 *   tsx src/jobs/discovery-import.ts --max-associations=5
 *   POST /admin/discover
 */

import { prisma }                  from '../db/client.js'
import { PlayHQPlaywrightAdapter } from '../adapters/playhq-playwright.adapter.js'
import { rankAndStore }            from './playhq-scrape.js'
import { discoverAllAGradeLeagues, type DiscoveredLeague } from '../discovery/playhq-discovery.js'
import { computeAutomaticStrength, finalStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import { getISOWeekLabel }         from '../utils/week-label.js'
import { logger }                  from '../utils/logger.js'

const GRADE  = 'A Grade'

export interface DiscoveryImportResult {
  runId:            string
  weekLabel:        string
  season:           string
  leaguesDiscovered: number
  leaguesImported:  number
  clubsRanked:      number
  status:           'SUCCESS' | 'FAILED' | 'NO_DATA'
  error?:           string
  imported:         { league: string; teams: number; isNew: boolean }[]
}

export async function runDiscoveryImport(opts: { maxAssociations?: number; weekLabel?: string } = {}): Promise<DiscoveryImportResult> {
  const label  = opts.weekLabel ?? getISOWeekLabel()
  const season = '2026'   // ranking cohort season (year); League.currentSeason keeps "Winter 2026"
  const imported: { league: string; teams: number; isNew: boolean }[] = []

  logger.info('DiscoveryImport: starting', { maxAssociations: opts.maxAssociations ?? 'all' })

  try {
    // 1) Discover every Senior Women's A Grade league (crawler)
    const discovered = await discoverAllAGradeLeagues({ maxAssociations: opts.maxAssociations })
    logger.info('DiscoveryImport: discovered leagues', { count: discovered.length })
    if (discovered.length === 0) {
      return { runId: '', weekLabel: label, season, leaguesDiscovered: 0, leaguesImported: 0, clubsRanked: 0, status: 'NO_DATA', imported, error: 'Discovery returned no leagues' }
    }

    // 2) Import each league (scrape ladder + upsert), skipping admin-disabled ones
    const adapter = new PlayHQPlaywrightAdapter()
    for (const dl of discovered) {
      try {
        const outcome = await importLeague(adapter, dl, season)
        if (outcome) imported.push(outcome)
      } catch (err) {
        logger.warn('DiscoveryImport: league import failed', { league: dl.leagueName, detail: String(err) })
      }
    }

    if (imported.length === 0) {
      return { runId: '', weekLabel: label, season, leaguesDiscovered: discovered.length, leaguesImported: 0, clubsRanked: 0, status: 'NO_DATA', imported, error: 'No leagues imported (all failed or disabled)' }
    }

    // 3) Re-run the EXISTING ranking engine across all PlayHQ-sourced leagues
    const { runId, clubsRanked } = await rankAndStore(label)
    logger.info('DiscoveryImport: complete', { runId, clubsRanked, leaguesImported: imported.length })

    return { runId, weekLabel: label, season, leaguesDiscovered: discovered.length, leaguesImported: imported.length, clubsRanked, status: 'SUCCESS', imported }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('DiscoveryImport: failed', { error: msg })
    return { runId: '', weekLabel: label, season, leaguesDiscovered: 0, leaguesImported: 0, clubsRanked: 0, status: 'FAILED', imported, error: msg }
  }
}

// ─── Import a single discovered league ────────────────────────────────────────

async function importLeague(
  adapter: PlayHQPlaywrightAdapter,
  dl: DiscoveredLeague,
  season: string,
): Promise<{ league: string; teams: number; isNew: boolean } | null> {

  // State
  const stateCode = dl.state ?? 'VIC'
  const state = await prisma.state.upsert({
    where:  { code: stateCode },
    create: { code: stateCode, name: stateCode },
    update: {},
  })

  // Association (by PlayHQ org slug)
  const association = await prisma.association.upsert({
    where:  { playhqOrgSlug: dl.associationSlug },
    create: { name: dl.associationName, playhqOrgSlug: dl.associationSlug, playhqUrl: `https://www.playhq.com/netball-australia/org/${dl.associationSlug}`, stateCode: dl.state, active: true, lastDiscoveredAt: new Date() },
    update: { name: dl.associationName, lastDiscoveredAt: new Date() },
  })

  // League — find by (playhqOrgSlug + gradeName) so we don't duplicate across runs
  const shortName = `${dl.leagueName} A Grade`
  let league = await prisma.league.findFirst({
    where: { playhqOrgSlug: dl.associationSlug, playhqGradeName: dl.gradeName },
  })
  const isNew = !league

  // Respect an admin ladder-URL override if present
  const ladderUrl = league?.ladderUrlOverride || dl.ladderUrl

  if (!league) {
    league = await prisma.league.create({
      data: {
        name: `${dl.leagueName} - A Grade Netball`, shortName, stateId: state.id, associationId: association.id,
        isActive: true, enabled: true, autoDiscovered: true, needsStrengthReview: false,
        // Strength is computed from the ladder below; these are placeholders.
        strengthScore: 60, strengthTier: 3, automaticStrengthRating: 3.0, finalStrengthRating: 3.0, strengthConfidence: 0.3,
        strengthNotes: 'Auto-discovered — strength calculated from ladder data.',
        playhqOrgSlug: dl.associationSlug, playhqGradeId: dl.gradeId, playhqGradeName: dl.gradeName,
        ladderUrl, currentSeason: dl.season, lastSyncedAt: new Date(),
      },
    })
  } else {
    if (!league.enabled) { logger.info('DiscoveryImport: league disabled, skipping', { league: league.name }); return null }
    league = await prisma.league.update({
      where: { id: league.id },
      data:  { associationId: association.id, playhqGradeId: dl.gradeId, ladderUrl, currentSeason: dl.season, lastSyncedAt: new Date(), syncError: null },
    })
  }

  // Scrape the ladder (full stats) via the proven adapter
  const scraped = await adapter.scrapeLadder(ladderUrl)
  if (scraped.entries.length === 0) {
    await prisma.league.update({ where: { id: league.id }, data: { syncError: 'Ladder scrape returned 0 entries', lastSyncedAt: new Date() } })
    return null
  }

  // ── Automatic league strength from the ladder ──────────────────────────────
  // manual override (if the admin set one) wins; otherwise use the automatic
  // rating. strengthScore (0–100) is derived so the ranking engine is untouched.
  const auto  = computeAutomaticStrength(scraped.entries, 1)
  const final = finalStrength(auto.rating, league.manualStrengthOverride)
  await prisma.league.update({
    where: { id: league.id },
    data: {
      automaticStrengthRating: auto.rating,
      finalStrengthRating:     final,
      strengthConfidence:      auto.confidence,
      strengthScore:           strengthScoreFromRating(final),
      strengthTier:            Math.max(1, Math.min(5, Math.round(final))),
    },
  })
  logger.info('DiscoveryImport: strength computed', { league: league.name, auto: auto.rating, final, confidence: auto.confidence.toFixed(2) })

  // League source (PLAYHQ) so the ranking engine includes this league
  const existingSource = await prisma.leagueSource.findFirst({ where: { leagueId: league.id, season, sourceType: 'PLAYHQ' } })
  if (!existingSource) {
    await prisma.leagueSource.create({ data: { leagueId: league.id, sourceType: 'PLAYHQ', season, isActive: true, ladderUrl, notes: `Auto-discovered (${scraped.method}).`, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
  } else {
    await prisma.leagueSource.update({ where: { id: existingSource.id }, data: { ladderUrl, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
  }

  // Clubs + season stats
  const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + dl.associationSlug
  const clubIds: string[] = []
  for (let i = 0; i < scraped.entries.length; i++) {
    const e = scraped.entries[i]
    const slug = slugify(e.teamRaw)
    const club = await prisma.club.upsert({
      where:  { slug },
      create: { name: e.teamRaw, slug, shortName: e.teamRaw, stateId: state.id, region: dl.leagueName, isActive: true },
      update: {},
      select: { id: true },
    })
    clubIds.push(club.id)
    await prisma.clubLeagueSeason.upsert({
      where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season, grade: GRADE } },
      create: { clubId: club.id, leagueId: league.id, season, grade: GRADE, isActive: true, position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
      update: { position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
    })
  }
  // Prune teams no longer on the ladder
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: league.id, season, grade: GRADE, clubId: { notIn: clubIds } } })

  logger.info('DiscoveryImport: league imported', { league: league.name, teams: clubIds.length, isNew })
  return { league: league.name, teams: clubIds.length, isNew }
}
