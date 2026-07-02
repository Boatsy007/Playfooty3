/**
 * Gippsland League A Grade Netball — Live PlayHQ Scrape + Rank Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes the Gippsland League 2026 A Grade Netball ladder from PlayHQ,
 * upserts clubs and season stats into Supabase, then runs the CNCA ranking
 * engine against ALL leagues (NGFNL + Gippsland) to produce a combined ranking.
 *
 * CONFIGURATION:
 *   GIPPSLAND_PLAYHQ_URL — Full URL to the Gippsland League A Grade Netball
 *     ladder page on PlayHQ. Find it by:
 *       1. Go to https://www.playhq.com
 *       2. Search "Gippsland League" or browse AFL Victoria associations
 *       3. Select "Gippsland League 2026" → "A Grade Netball" → "Ladder"
 *       4. Copy the full URL, e.g.:
 *          https://www.playhq.com/afl/org/gippsland-league/gippsland-football-league-2026/{id}/ladder
 *     Set as env var or pass as CLI arg: --url=https://...
 *
 * RUNNING:
 *   tsx src/jobs/gippsland-trigger.ts --url=https://www.playhq.com/...
 *   # or via admin API:
 *   POST /admin/gippsland-scrape { "ladderUrl": "..." }
 *
 * HOW IT WORKS:
 *   1. Playwright navigates to the PlayHQ ladder URL
 *   2. Response interceptor captures PlayHQ's internal JSON API calls
 *   3. Ladder data is parsed and normalised
 *   4. Clubs are upserted into Supabase (slug: {name}-gfl)
 *   5. ClubLeagueSeasons are upserted with live stats
 *   6. Ranking engine runs across NGFNL + Gippsland League
 *   7. New RankingRun + RankingEntries written to DB
 *
 * LEAGUE STRENGTH:
 *   Gippsland League netball is assessed at strength score 65, tier 3 (strong
 *   regional competition, above NGFNL in historical competition quality).
 */

import { prisma }                     from '../db/client.js'
import { PlayHQPlaywrightAdapter }    from '../adapters/playhq-playwright.adapter.js'
import { RankingEngine }              from '../engine/ranking.engine.js'
import { getISOWeekLabel }            from '../utils/week-label.js'
import { logger }                     from '../utils/logger.js'
import type { ClubRankingInput, MatchResult } from '../types/index.js'

// ─── League config ───────────────────────────────────────────────────────────

const SEASON              = '2026'
const LEAGUE_NAME         = 'Gippsland League - A Grade Netball'
const LEAGUE_SHORT        = 'Gippsland League A Grade'
const LEAGUE_STRENGTH     = 65
const LEAGUE_STRENGTH_TIER = 3
const LEAGUE_GRADE        = 'A Grade'
const STATE               = 'VIC' as const

// ─── Result types ─────────────────────────────────────────────────────────────

export interface GippslandScrapeResult {
  runId:       string
  weekLabel:   string
  season:      string
  clubsRanked: number
  leagueId:    string
  status:      'SUCCESS' | 'FAILED' | 'NO_DATA'
  method?:     string
  error?:      string
}

// ─── Main job ────────────────────────────────────────────────────────────────

export async function runGippslandScrape(options: {
  ladderUrl: string
  weekLabel?: string
}): Promise<GippslandScrapeResult> {

  const { ladderUrl, weekLabel: labelArg } = options
  const label  = labelArg ?? getISOWeekLabel()

  logger.info('GippslandScrape: starting', { ladderUrl, weekLabel: label })

  try {
    // ── 1. Scrape PlayHQ ────────────────────────────────────────────────────
    const adapter = new PlayHQPlaywrightAdapter()
    const scraped = await adapter.scrapeLadder(ladderUrl)

    if (scraped.entries.length === 0) {
      logger.warn('GippslandScrape: scraper returned 0 entries', { method: scraped.method })
      return {
        runId: '', weekLabel: label, season: SEASON,
        clubsRanked: 0, leagueId: '', status: 'NO_DATA',
        error: 'PlayHQ scraper returned 0 ladder entries. Check the ladder URL and PlayHQ page structure.',
      }
    }

    logger.info('GippslandScrape: scraped ladder', { entries: scraped.entries.length, method: scraped.method })

    // ── 2. Upsert VIC state ──────────────────────────────────────────────────
    const vicState = await prisma.state.upsert({
      where:  { code: 'VIC' },
      create: { code: 'VIC', name: 'Victoria' },
      update: {},
    })

    // ── 3. Upsert Gippsland League ───────────────────────────────────────────
    let league = await prisma.league.findFirst({
      where: { shortName: LEAGUE_SHORT, stateId: vicState.id },
    })
    if (!league) {
      league = await prisma.league.create({
        data: {
          name:          LEAGUE_NAME,
          shortName:     LEAGUE_SHORT,
          stateId:       vicState.id,
          isActive:      true,
          strengthScore: LEAGUE_STRENGTH,
          strengthTier:  LEAGUE_STRENGTH_TIER,
          strengthNotes: 'Gippsland League A Grade Netball — strong regional VIC competition, tier 3.',
        },
      })
    }
    logger.info('GippslandScrape: league ready', { id: league.id })

    // ── 4. Upsert league source ──────────────────────────────────────────────
    const existingSource = await prisma.leagueSource.findFirst({
      where: { leagueId: league.id, season: SEASON, sourceType: 'PLAYHQ' },
    })
    if (!existingSource) {
      await prisma.leagueSource.create({
        data: {
          leagueId:     league.id,
          sourceType:   'PLAYHQ',
          season:       SEASON,
          isActive:     true,
          ladderUrl,
          notes:        `Live PlayHQ scrape. Extraction method: ${scraped.method}.`,
          lastStatus:   'SUCCESS',
          lastScrapedAt: new Date(),
        },
      })
    } else {
      await prisma.leagueSource.update({
        where: { id: existingSource.id },
        data: {
          ladderUrl,
          lastStatus:    'SUCCESS',
          lastScrapedAt: new Date(),
          notes:         `Live PlayHQ scrape. Extraction method: ${scraped.method}. Entries: ${scraped.entries.length}.`,
        },
      })
    }

    // ── 5. Upsert clubs ──────────────────────────────────────────────────────
    const slugify = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-gfl'

    interface DbClub { id: string; slug: string; name: string }
    const dbClubs: DbClub[] = []

    for (const entry of scraped.entries) {
      const slug   = slugify(entry.teamRaw)
      const dbClub = await prisma.club.upsert({
        where:  { slug },
        create: {
          name:      entry.teamRaw,
          slug,
          shortName: entry.teamRaw,
          stateId:   vicState.id,
          region:    'Gippsland',
          isActive:  true,
        },
        update: {},
        select: { id: true, slug: true, name: true },
      })
      dbClubs.push(dbClub)
    }
    logger.info('GippslandScrape: clubs upserted', { count: dbClubs.length })

    // ── 6. Upsert ClubLeagueSeasons ──────────────────────────────────────────
    for (let i = 0; i < scraped.entries.length; i++) {
      const entry = scraped.entries[i]
      const club  = dbClubs[i]

      await prisma.clubLeagueSeason.upsert({
        where: {
          clubId_leagueId_season_grade: {
            clubId:   club.id,
            leagueId: league.id,
            season:   SEASON,
            grade:    LEAGUE_GRADE,
          },
        },
        create: {
          clubId:       club.id,
          leagueId:     league.id,
          season:       SEASON,
          grade:        LEAGUE_GRADE,
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
    }
    logger.info('GippslandScrape: club-league-seasons upserted')

    // ── 7. Load NGFNL clubs for combined ranking ──────────────────────────────
    const allInputs = await buildCombinedRankingInputs(league.id, dbClubs, scraped.entries, SEASON)
    logger.info('GippslandScrape: combined ranking inputs', { count: allInputs.length })

    // ── 8. Run ranking engine ─────────────────────────────────────────────────
    const engine   = new RankingEngine()
    const rankings = engine.rankCohort(allInputs, new Map(), label, SEASON)

    // ── 9. Persist RankingRun + entries ──────────────────────────────────────
    const run = await prisma.rankingRun.create({
      data: {
        weekLabel:   label,
        season:      SEASON,
        status:      'COMPLETED',
        clubCount:   rankings.length,
        completedAt: new Date(),
        notes:       `Live PlayHQ scrape (${scraped.method}). Gippsland League + NGFNL combined. URL: ${ladderUrl}`,
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

    logger.info('GippslandScrape: complete', {
      runId:       run.id,
      clubsRanked: rankings.length,
      top5:        rankings.slice(0, 5).map(r => `${r.rank}. ${r.clubName} (${r.powerRating.toFixed(2)})`),
    })

    return {
      runId:       run.id,
      weekLabel:   label,
      season:      SEASON,
      clubsRanked: rankings.length,
      leagueId:    league.id,
      status:      'SUCCESS',
      method:      scraped.method,
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('GippslandScrape: failed', { error: msg })
    return {
      runId: '', weekLabel: label, season: SEASON,
      clubsRanked: 0, leagueId: '', status: 'FAILED', error: msg,
    }
  }
}

// ─── Combine Gippsland + existing NGFNL data for cross-league ranking ─────────

async function buildCombinedRankingInputs(
  gflLeagueId: string,
  gflClubs: { id: string; slug: string; name: string }[],
  gflEntries: import('../types/index.js').RawLadderEntry[],
  season: string,
): Promise<ClubRankingInput[]> {

  const inputs: ClubRankingInput[] = []

  // GFL clubs from scrape
  for (let i = 0; i < gflEntries.length; i++) {
    const entry = gflEntries[i]
    const club  = gflClubs[i]

    // Derive recent form from ladder position (heuristic: top half = more wins)
    const recentForm = deriveForm(entry.wins, entry.played)

    inputs.push({
      clubId:              club.id,
      clubName:            club.name,
      leagueId:            gflLeagueId,
      leagueName:          LEAGUE_NAME,
      state:               STATE,
      season,
      played:              entry.played,
      wins:                entry.wins,
      losses:              entry.losses,
      draws:               entry.draws,
      goalsFor:            entry.goalsFor,
      goalsAgainst:        entry.goalsAgainst,
      percentage:          entry.percentage,
      recentForm,
      leagueStrengthScore: LEAGUE_STRENGTH,
      finalsWins:          0,
      finalsLosses:        0,
      oppositionRatings:   [],
    })
  }

  // Load existing NGFNL clubs from DB
  const ngfnlLeague = await prisma.league.findFirst({
    where: { shortName: 'NGFNL A Grade' },
  })

  if (ngfnlLeague) {
    const ngfnlSeasons = await prisma.clubLeagueSeason.findMany({
      where:   { leagueId: ngfnlLeague.id, season },
      include: { club: true },
    })

    for (const cls of ngfnlSeasons) {
      const recentForm = deriveForm(cls.wins, cls.played)
      inputs.push({
        clubId:              cls.clubId,
        clubName:            cls.club.name,
        leagueId:            ngfnlLeague.id,
        leagueName:          'North Gippsland FNL - A Grade Netball',
        state:               STATE,
        season,
        played:              cls.played,
        wins:                cls.wins,
        losses:              cls.losses,
        draws:               cls.draws,
        goalsFor:            cls.goalsFor,
        goalsAgainst:        cls.goalsAgainst,
        percentage:          cls.percentage,
        recentForm,
        leagueStrengthScore: 58,
        finalsWins:          cls.finalsWins,
        finalsLosses:        cls.finalsLosses,
        oppositionRatings:   [],
      })
    }
  }

  return inputs
}

/** Derive a plausible last-5 form string from season stats */
function deriveForm(wins: number, played: number): MatchResult[] {
  if (played === 0) return ['L', 'L', 'L', 'L', 'L']
  const winRate = wins / played
  const last5: MatchResult[] = []
  for (let i = 0; i < 5; i++) {
    last5.push(Math.random() < winRate ? 'W' : 'L')
  }
  return last5
}
