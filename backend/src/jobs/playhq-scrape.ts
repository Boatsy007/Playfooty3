/**
 * PlayHQ Multi-League Scrape + Rank Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes each configured league's A Grade Netball ladder from PlayHQ, upserts
 * clubs and season stats into Supabase, then runs the CNCA ranking engine ONCE
 * across every PlayHQ-sourced league to produce a single combined ranking.
 *
 * ADDING A LEAGUE:
 *   Add an entry to LEAGUE_CONFIGS below with its PlayHQ A Grade Netball ladder
 *   URL and ★ rating. Ladder URLs are public, so they can live here directly;
 *   an env var override is supported for flexibility (e.g. per-season updates).
 *
 * RUNNING:
 *   tsx src/jobs/playhq-trigger.ts
 *   # or via admin API: POST /admin/scrape
 *
 * Ranking spans all PlayHQ leagues: within a league, record decides order;
 * across leagues, the league-strength score (from the ★ scale) lifts stronger
 * competitions above weaker ones at equivalent records.
 */

import { prisma }                     from '../db/client.js'
import { PlayHQPlaywrightAdapter }    from '../adapters/playhq-playwright.adapter.js'
import { RankingEngine }              from '../engine/ranking.engine.js'
import { getISOWeekLabel }            from '../utils/week-label.js'
import { logger }                     from '../utils/logger.js'
import { strengthForStars }           from '../config/league-strength.js'
import { computeAutomaticStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import type { ClubRankingInput, MatchResult, AustralianState } from '../types/index.js'

const SEASON = '2026'
const GRADE  = 'A Grade'

// ─── League registry ──────────────────────────────────────────────────────────

export interface LeagueConfig {
  name:       string            // full league name (stored + displayed)
  shortName:  string            // stable key used to find the DB league row
  state:      AustralianState
  region:     string
  slugSuffix: string            // keeps club slugs unique per league (e.g. 'gfl')
  stars:      number            // ★ rating → league-strength score
  urlEnvVar:  string            // env var that can override the ladder URL
  defaultUrl?: string           // public PlayHQ ladder URL (used if env unset)
}

export const LEAGUE_CONFIGS: LeagueConfig[] = [
  {
    name:       'Gippsland League - A Grade Netball',
    shortName:  'Gippsland League A Grade',
    state:      'VIC',
    region:     'Gippsland',
    slugSuffix: 'gfl',
    stars:      4.0,
    urlEnvVar:  'GIPPSLAND_PLAYHQ_URL',
  },
  {
    name:       'Geelong & District FNL - A Grade Netball',
    shortName:  'GDFNL A Grade',
    state:      'VIC',
    region:     'Geelong',
    slugSuffix: 'gdfnl',
    stars:      4.0,
    urlEnvVar:  'GDFNL_PLAYHQ_URL',
    defaultUrl: 'https://www.playhq.com/netball-australia/org/geelong-and-district-football-netball-league/gdfnl-netball-winter-competition-2026/a-grade-buckleys-cup/74c225ef/ladder',
  },
  {
    name:       'Bellarine FNL - A Grade Netball',
    shortName:  'Bellarine FNL A Grade',
    state:      'VIC',
    region:     'Bellarine',
    slugSuffix: 'bfnl',
    stars:      5.0,
    urlEnvVar:  'BELLARINE_PLAYHQ_URL',
    defaultUrl: 'https://www.playhq.com/netball-australia/org/geelong-amateur/ada7613a/afl-barwon-fnl-winter-2026/teams/geelong-amateur-a-grade/76aa95bb/ladder',
  },
]

// ─── Result types ─────────────────────────────────────────────────────────────

export interface LeagueScrapeOutcome {
  league:  string
  status:  'SUCCESS' | 'NO_DATA' | 'FAILED'
  teams:   number
  method?: string
  error?:  string
}

export interface PlayHQScrapeResult {
  runId:       string
  weekLabel:   string
  season:      string
  clubsRanked: number
  leagues:     LeagueScrapeOutcome[]
  status:      'SUCCESS' | 'FAILED'
  error?:      string
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runAllPlayHQScrapes(options: { weekLabel?: string } = {}): Promise<PlayHQScrapeResult> {
  const label = options.weekLabel ?? getISOWeekLabel()
  logger.info('PlayHQScrape: starting', { weekLabel: label, leagues: LEAGUE_CONFIGS.length })

  const outcomes: LeagueScrapeOutcome[] = []

  for (const cfg of LEAGUE_CONFIGS) {
    const url = process.env[cfg.urlEnvVar] || cfg.defaultUrl
    if (!url) {
      logger.warn('PlayHQScrape: no URL for league, skipping', { league: cfg.name, envVar: cfg.urlEnvVar })
      outcomes.push({ league: cfg.name, status: 'FAILED', teams: 0, error: `No ladder URL (set ${cfg.urlEnvVar})` })
      continue
    }
    outcomes.push(await scrapeLeagueData(cfg, url))
  }

  const anyData = outcomes.some(o => o.status === 'SUCCESS')
  if (!anyData) {
    logger.error('PlayHQScrape: no league produced data — skipping ranking')
    return { runId: '', weekLabel: label, season: SEASON, clubsRanked: 0, leagues: outcomes, status: 'FAILED', error: 'No league produced ladder data' }
  }

  // Single ranking run across every PlayHQ-sourced league
  try {
    const { runId, clubsRanked } = await rankAndStore(label)
    logger.info('PlayHQScrape: complete', { runId, clubsRanked, leagues: outcomes.map(o => `${o.league}:${o.status}(${o.teams})`) })
    return { runId, weekLabel: label, season: SEASON, clubsRanked, leagues: outcomes, status: 'SUCCESS' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('PlayHQScrape: ranking failed', { error: msg })
    return { runId: '', weekLabel: label, season: SEASON, clubsRanked: 0, leagues: outcomes, status: 'FAILED', error: msg }
  }
}

// ─── Per-league scrape (no ranking) ───────────────────────────────────────────

async function scrapeLeagueData(cfg: LeagueConfig, ladderUrl: string): Promise<LeagueScrapeOutcome> {
  logger.info('PlayHQScrape: scraping league', { league: cfg.name, url: ladderUrl })

  try {
    const adapter = new PlayHQPlaywrightAdapter()
    const scraped = await adapter.scrapeLadder(ladderUrl)

    if (scraped.entries.length === 0) {
      logger.warn('PlayHQScrape: 0 entries', { league: cfg.name, method: scraped.method })
      return { league: cfg.name, status: 'NO_DATA', teams: 0, method: scraped.method, error: 'Scraper returned 0 ladder entries' }
    }

    // State
    const state = await prisma.state.upsert({
      where:  { code: cfg.state },
      create: { code: cfg.state, name: cfg.state },
      update: {},
    })

    // League strength: these configured leagues carry a manual override (the
    // ★ rating you set). Automatic strength is also computed from the ladder;
    // finalStrengthRating = override (present here) and drives strengthScore.
    const auto = computeAutomaticStrength(scraped.entries, 1)
    const finalRating = cfg.stars   // manual override wins for configured leagues
    const strengthNotes = `Manual override ${cfg.stars}★ (auto ${auto.rating}★, confidence ${auto.confidence.toFixed(2)}).`
    const strengthData = {
      automaticStrengthRating: auto.rating,
      manualStrengthOverride:  cfg.stars,
      finalStrengthRating:     finalRating,
      strengthConfidence:      auto.confidence,
      strengthScore:           strengthScoreFromRating(finalRating),
      strengthTier:            Math.max(1, Math.min(5, Math.round(finalRating))),
      strengthNotes,
    }
    let league = await prisma.league.findFirst({ where: { shortName: cfg.shortName, stateId: state.id } })
    if (!league) {
      league = await prisma.league.create({
        data: { name: cfg.name, shortName: cfg.shortName, stateId: state.id, isActive: true, ...strengthData },
      })
    } else {
      league = await prisma.league.update({
        where: { id: league.id },
        data:  strengthData,
      })
    }

    // League source
    const existingSource = await prisma.leagueSource.findFirst({ where: { leagueId: league.id, season: SEASON, sourceType: 'PLAYHQ' } })
    if (!existingSource) {
      await prisma.leagueSource.create({
        data: { leagueId: league.id, sourceType: 'PLAYHQ', season: SEASON, isActive: true, ladderUrl, notes: `Live PlayHQ scrape (${scraped.method}).`, lastStatus: 'SUCCESS', lastScrapedAt: new Date() },
      })
    } else {
      await prisma.leagueSource.update({
        where: { id: existingSource.id },
        data:  { ladderUrl, lastStatus: 'SUCCESS', lastScrapedAt: new Date(), notes: `Live PlayHQ scrape (${scraped.method}). Entries: ${scraped.entries.length}.` },
      })
    }

    // Clubs
    const slugify = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + cfg.slugSuffix

    const clubIds: string[] = []
    for (const entry of scraped.entries) {
      const slug = slugify(entry.teamRaw)
      const club = await prisma.club.upsert({
        where:  { slug },
        create: { name: entry.teamRaw, slug, shortName: entry.teamRaw, stateId: state.id, region: cfg.region, isActive: true },
        update: {},
        select: { id: true },
      })
      clubIds.push(club.id)

      await prisma.clubLeagueSeason.upsert({
        where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE } },
        create: {
          clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true,
          played: entry.played, wins: entry.wins, losses: entry.losses, draws: entry.draws,
          goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst, percentage: entry.percentage, points: entry.points,
        },
        update: {
          played: entry.played, wins: entry.wins, losses: entry.losses, draws: entry.draws,
          goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst, percentage: entry.percentage, points: entry.points,
        },
      })
    }

    // Prune teams no longer on this league's ladder
    const removed = await prisma.clubLeagueSeason.deleteMany({
      where: { leagueId: league.id, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } },
    })

    logger.info('PlayHQScrape: league stored', { league: cfg.name, teams: clubIds.length, pruned: removed.count, method: scraped.method })
    return { league: cfg.name, status: 'SUCCESS', teams: clubIds.length, method: scraped.method }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('PlayHQScrape: league failed', { league: cfg.name, error: msg })
    return { league: cfg.name, status: 'FAILED', teams: 0, error: msg }
  }
}

// ─── Ranking across all PlayHQ leagues ────────────────────────────────────────

export async function rankAndStore(label: string): Promise<{ runId: string; clubsRanked: number }> {
  const inputs = await buildPlayHQRankingInputs(SEASON)
  logger.info('PlayHQScrape: ranking inputs', { count: inputs.length })

  const engine   = new RankingEngine()
  const rankings = engine.rankCohort(inputs, new Map(), label, SEASON)

  const run = await prisma.rankingRun.create({
    data: {
      weekLabel: label, season: SEASON, status: 'COMPLETED', clubCount: rankings.length, completedAt: new Date(),
      notes: 'Live PlayHQ scrape — all PlayHQ-sourced leagues.',
      entries: {
        create: rankings.map(r => ({
          clubId: r.clubId, clubName: r.clubName, leagueId: r.leagueId, leagueName: r.leagueName, state: r.state,
          rank: r.rank, previousRank: r.previousRank ?? null, rankMovement: r.rankMovement, powerRating: r.powerRating,
          componentScores: JSON.stringify(r.componentScores), recentForm: JSON.stringify(r.recentForm), calculatedAt: r.calculatedAt,
        })),
      },
    },
  })

  return { runId: run.id, clubsRanked: rankings.length }
}

/** Build ranking inputs from every league with a live PlayHQ source. */
async function buildPlayHQRankingInputs(season: string): Promise<ClubRankingInput[]> {
  const playhqSources = await prisma.leagueSource.findMany({
    where:  { sourceType: 'PLAYHQ', season, isActive: true },
    select: { leagueId: true },
  })
  const leagueIds = [...new Set(playhqSources.map(s => s.leagueId))]
  if (leagueIds.length === 0) return []

  const seasons = await prisma.clubLeagueSeason.findMany({
    where:   { leagueId: { in: leagueIds }, season },
    include: { club: { include: { state: true } }, league: true },
  })

  return seasons.map(cls => ({
    clubId:              cls.clubId,
    clubName:            cls.club.name,
    leagueId:            cls.leagueId,
    leagueName:          cls.league.name,
    state:               (cls.club.state?.code ?? 'VIC') as AustralianState,
    season,
    played:              cls.played,
    wins:                cls.wins,
    losses:              cls.losses,
    draws:               cls.draws,
    goalsFor:            cls.goalsFor,
    goalsAgainst:        cls.goalsAgainst,
    percentage:          cls.percentage,
    recentForm:          deriveForm(cls.wins, cls.played),
    leagueStrengthScore: cls.league.strengthScore ?? strengthForStars(3.0).score,
    finalsWins:          cls.finalsWins,
    finalsLosses:        cls.finalsLosses,
    oppositionRatings:   [],
  }))
}

/** Derive a plausible last-5 form string from season stats (PlayHQ ladders don't publish form). */
function deriveForm(wins: number, played: number): MatchResult[] {
  if (played === 0) return ['L', 'L', 'L', 'L', 'L']
  const winRate = wins / played
  const last5: MatchResult[] = []
  for (let i = 0; i < 5; i++) last5.push(Math.random() < winRate ? 'W' : 'L')
  return last5
}
