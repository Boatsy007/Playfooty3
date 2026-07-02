/**
 * NGFNL 2026 Pilot Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds North Gippsland Football Netball League A Grade Netball 2026 data
 * into Supabase and runs the ranking engine against it.
 *
 * Data source: MANUAL_ENTRY (CSV fallback)
 * PlayHQ URL:  https://www.playhq.com/afl/org/north-gippsland-football-netball-league/
 *              north-gippsland-football-netball-league-2026/1a4dae95
 *
 * Why manual seed instead of live scrape:
 * PlayHQ is a JavaScript-rendered (Next.js) application. Its ladder data is
 * loaded via internal XHR/GraphQL after page hydration — standard fetch/Cheerio
 * HTML scraping returns only the shell page with no ladder content. A Playwright
 * (headless browser) adapter is needed for live scraping and is planned for the
 * next iteration. This seed uses representative 2026 mid-season data to validate
 * the full pipeline end-to-end.
 *
 * Data as at Round 12, 2026 season.
 */

import { prisma }        from '../db/client.js'
import { RankingEngine } from '../engine/ranking.engine.js'
import { getISOWeekLabel } from '../utils/week-label.js'
import { logger }          from '../utils/logger.js'
import type { ClubRankingInput, MatchResult } from '../types/index.js'

// Minimal shape we need from Club after upsert
interface DbClub { id: string; slug: string; name: string }

export interface PilotResult {
  runId:       string
  weekLabel:   string
  season:      string
  clubsRanked: number
  leagueId:    string
  status:      'SUCCESS' | 'FAILED'
  error?:      string
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEASON     = '2026'
const LEAGUE_NAME = 'North Gippsland FNL - A Grade Netball'
const LEAGUE_SHORT = 'NGFNL A Grade'
// League strength: competitive country/regional — above average for rural VIC
const LEAGUE_STRENGTH_SCORE = 58
const LEAGUE_STRENGTH_TIER  = 3

// PlayHQ season URL — used for reference/future live scraping
const PLAYHQ_SEASON_URL = 'https://www.playhq.com/afl/org/north-gippsland-football-netball-league/north-gippsland-football-netball-league-2026/1a4dae95'

interface ClubSeed {
  slug:        string
  name:        string
  shortName:   string
  region:      string
}

const CLUBS: ClubSeed[] = [
  { slug: 'heyfield-nc',   name: 'Heyfield',             shortName: 'Heyfield',  region: 'Heyfield' },
  { slug: 'rosedale-nc',   name: 'Rosedale',              shortName: 'Rosedale',  region: 'Rosedale' },
  { slug: 'yarram-nc',     name: 'Yarram',                shortName: 'Yarram',    region: 'Yarram' },
  { slug: 'churchill-nc',  name: 'Churchill',             shortName: 'Churchill', region: 'Latrobe Valley' },
  { slug: 'sale-city-nc',  name: 'Sale City',             shortName: 'Sale City', region: 'Sale' },
  { slug: 'woodside-nc',   name: 'Woodside',              shortName: 'Woodside',  region: 'Woodside' },
  { slug: 'gormandale-nc', name: 'Gormandale',            shortName: 'Gormandale', region: 'Gormandale' },
  { slug: 'ttu-nc',        name: 'Traralgon Tyers United', shortName: 'TTU',      region: 'Traralgon' },
]

interface LadderEntry {
  slug:        string
  played:      number
  wins:        number
  losses:      number
  draws:       number
  goalsFor:    number
  goalsAgainst: number
  percentage:  number
  points:      number
  recentForm:  MatchResult[]  // oldest → newest
}

// Representative Round 12 standings, 2026 season
const LADDER: LadderEntry[] = [
  { slug: 'heyfield-nc',   played: 12, wins: 11, losses: 1,  draws: 0, goalsFor: 624, goalsAgainst: 398, percentage: 156.8, points: 44, recentForm: ['W','W','W','W','W'] },
  { slug: 'rosedale-nc',   played: 12, wins: 9,  losses: 3,  draws: 0, goalsFor: 578, goalsAgainst: 432, percentage: 133.8, points: 36, recentForm: ['W','W','W','L','W'] },
  { slug: 'yarram-nc',     played: 12, wins: 8,  losses: 4,  draws: 0, goalsFor: 551, goalsAgainst: 462, percentage: 119.3, points: 32, recentForm: ['W','L','W','W','L'] },
  { slug: 'churchill-nc',  played: 12, wins: 7,  losses: 5,  draws: 0, goalsFor: 519, goalsAgainst: 481, percentage: 107.9, points: 28, recentForm: ['W','W','L','W','L'] },
  { slug: 'sale-city-nc',  played: 12, wins: 6,  losses: 6,  draws: 0, goalsFor: 492, goalsAgainst: 492, percentage: 100.0, points: 24, recentForm: ['L','W','L','W','L'] },
  { slug: 'woodside-nc',   played: 12, wins: 4,  losses: 8,  draws: 0, goalsFor: 447, goalsAgainst: 535, percentage:  83.5, points: 16, recentForm: ['L','L','W','L','L'] },
  { slug: 'gormandale-nc', played: 12, wins: 3,  losses: 9,  draws: 0, goalsFor: 403, goalsAgainst: 571, percentage:  70.6, points: 12, recentForm: ['L','W','L','L','L'] },
  { slug: 'ttu-nc',        played: 12, wins: 0,  losses: 12, draws: 0, goalsFor: 350, goalsAgainst: 593, percentage:  59.0, points: 0,  recentForm: ['L','L','L','L','L'] },
]

// ─── Main pilot function ──────────────────────────────────────────────────────

export async function runNGFNLPilot(weekLabel?: string): Promise<PilotResult> {
  const label  = weekLabel ?? getISOWeekLabel()
  const season = SEASON

  logger.info('NGFNLPilot: starting', { weekLabel: label, season })

  try {
    // ── 1. Upsert VIC state ────────────────────────────────────────────────────
    const vicState = await prisma.state.upsert({
      where:  { code: 'VIC' },
      create: { code: 'VIC', name: 'Victoria' },
      update: {},
    })
    logger.info('NGFNLPilot: VIC state ready', { id: vicState.id })

    // ── 2. Upsert league ───────────────────────────────────────────────────────
    let league = await prisma.league.findFirst({
      where: { shortName: LEAGUE_SHORT, stateId: vicState.id },
    })
    if (!league) {
      league = await prisma.league.create({
        data: {
          name:           LEAGUE_NAME,
          shortName:      LEAGUE_SHORT,
          stateId:        vicState.id,
          isActive:       true,
          strengthScore:  LEAGUE_STRENGTH_SCORE,
          strengthTier:   LEAGUE_STRENGTH_TIER,
          strengthNotes:  'North Gippsland region, competitive A Grade. Tier 3 country regional.',
        },
      })
    }
    logger.info('NGFNLPilot: league ready', { id: league.id, name: league.name })

    // ── 3. Upsert league source (manual entry for pilot; PlayHQ URL documented) ─
    let leagueSource = await prisma.leagueSource.findFirst({
      where: { leagueId: league.id, season, sourceType: 'MANUAL_ENTRY' },
    })
    if (!leagueSource) {
      leagueSource = await prisma.leagueSource.create({
        data: {
          leagueId:   league.id,
          sourceType: 'MANUAL_ENTRY',
          season,
          isActive:   true,
          ladderUrl:  PLAYHQ_SEASON_URL,   // retained for future live scraping
          notes:      `PlayHQ season page: ${PLAYHQ_SEASON_URL}. ` +
                      'Live scraping requires Playwright (JS-rendered). Using manual seed for pilot.',
          lastStatus: 'SUCCESS',
          lastScrapedAt: new Date(),
        },
      })
    }
    logger.info('NGFNLPilot: league source ready', { id: leagueSource.id })

    // ── 4. Upsert clubs ────────────────────────────────────────────────────────
    const dbClubs: DbClub[] = await Promise.all(
      CLUBS.map(c =>
        prisma.club.upsert({
          where:  { slug: c.slug },
          create: {
            name:      c.name,
            slug:      c.slug,
            shortName: c.shortName,
            stateId:   vicState.id,
            region:    c.region,
            isActive:  true,
          },
          update: {},
          select: { id: true, slug: true, name: true },
        }),
      ),
    )
    logger.info('NGFNLPilot: clubs upserted', { count: dbClubs.length })

    // ── 5. Upsert ClubLeagueSeasons ───────────────────────────────────────────
    const slugToDbClub = new Map<string, DbClub>(dbClubs.map(c => [c.slug, c]))

    await Promise.all(
      LADDER.map(entry => {
        const club = slugToDbClub.get(entry.slug)!
        return prisma.clubLeagueSeason.upsert({
          where: {
            clubId_leagueId_season_grade: {
              clubId:   club.id,
              leagueId: league!.id,
              season,
              grade:    'A Grade',
            },
          },
          create: {
            clubId:       club.id,
            leagueId:     league!.id,
            season,
            grade:        'A Grade',
            isActive:     true,
            played:       entry.played,
            wins:         entry.wins,
            losses:       entry.losses,
            draws:        entry.draws,
            goalsFor:     entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            percentage:   entry.percentage,
            points:       entry.points,
          },
          update: {
            played:       entry.played,
            wins:         entry.wins,
            losses:       entry.losses,
            draws:        entry.draws,
            goalsFor:     entry.goalsFor,
            goalsAgainst: entry.goalsAgainst,
            percentage:   entry.percentage,
            points:       entry.points,
          },
        })
      }),
    )
    logger.info('NGFNLPilot: club-league-seasons upserted')

    // ── 6. Build ClubRankingInput[] ───────────────────────────────────────────
    const inputs: ClubRankingInput[] = LADDER.map(entry => {
      const club = slugToDbClub.get(entry.slug)!
      return {
        clubId:              club.id,
        clubName:            club.name,
        leagueId:            league!.id,
        leagueName:          LEAGUE_NAME,
        state:               'VIC',
        season,
        played:              entry.played,
        wins:                entry.wins,
        losses:              entry.losses,
        draws:               entry.draws,
        goalsFor:            entry.goalsFor,
        goalsAgainst:        entry.goalsAgainst,
        percentage:          entry.percentage,
        recentForm:          entry.recentForm,
        leagueStrengthScore: LEAGUE_STRENGTH_SCORE,
        finalsWins:          0,
        finalsLosses:        0,
        oppositionRatings:   [],
      }
    })

    // ── 7. Run ranking engine ─────────────────────────────────────────────────
    const engine   = new RankingEngine()
    const rankings = engine.rankCohort(inputs, new Map(), label, season)

    // ── 8. Persist RankingRun + RankingEntries ────────────────────────────────
    const run = await prisma.rankingRun.create({
      data: {
        weekLabel:   label,
        season,
        status:      'COMPLETED',
        clubCount:   rankings.length,
        completedAt: new Date(),
        notes:       `NGFNL pilot — manual seed. ${PLAYHQ_SEASON_URL}`,
        entries: {
          create: rankings.map(r => ({
            clubId:          r.clubId,
            clubName:        r.clubName,
            leagueId:        r.leagueId,
            leagueName:      r.leagueName,
            state:           r.state,
            rank:            r.rank,
            previousRank:    r.previousRank ?? null,
            rankMovement:    r.rankMovement,
            powerRating:     r.powerRating,
            componentScores: JSON.stringify(r.componentScores),
            recentForm:      JSON.stringify(r.recentForm),
            calculatedAt:    r.calculatedAt,
          })),
        },
      },
    })

    logger.info('NGFNLPilot: complete', {
      runId:       run.id,
      clubsRanked: rankings.length,
      top3:        rankings.slice(0, 3).map(r => `${r.rank}. ${r.clubName} (${r.powerRating})`),
    })

    return {
      runId:       run.id,
      weekLabel:   label,
      season,
      clubsRanked: rankings.length,
      leagueId:    league.id,
      status:      'SUCCESS',
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('NGFNLPilot: failed', { error: msg })
    return { runId: '', weekLabel: label, season, clubsRanked: 0, leagueId: '', status: 'FAILED', error: msg }
  }
}
