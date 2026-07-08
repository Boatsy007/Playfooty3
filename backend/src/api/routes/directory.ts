/**
 * Directory API
 * GET /api/directory — every tracked club, grouped by state → league, with
 * current-season record, ladder position, power rank, and any known links.
 * Powers the public /directory page.
 */

import { Router }          from 'express'
import { prisma }          from '../../db/client.js'
import { cachePublic }     from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'
import { logger }          from '../../utils/logger.js'

const router = Router()

// GET /api/directory
router.get('/', publicRateLimit, cachePublic(600), async (_req, res) => {
  try {
    // Latest season present in the season table
    const latest = await prisma.clubLeagueSeason.findFirst({
      where: { league: { sport: 'FOOTBALL', archivedAt: null, isActive: true }, isActive: true },
      orderBy: { season: 'desc' },
      select:  { season: true },
    })

    const season = latest?.season ?? null

    // Only football leagues are public in the PlayFooty app. Leagues may be
    // manually managed while PlayHQ access is pending, so do not require an
    // active legacy PlayHQ LeagueSource row.
    const footballLeagues = await prisma.league.findMany({
      where:  { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      select: { id: true },
    })
    const leagueIds = [...new Set(footballLeagues.map(s => s.id))]
    if (leagueIds.length === 0) { res.json({ season, states: [], meta: { totalClubs: 0, totalLeagues: 0 } }); return }

    // All club-season rows for the latest season when available. Only select
    // stable fields needed to render the directory; profile/logo/social fields
    // are deliberately not required for public visibility.
    const rows = await prisma.clubLeagueSeason.findMany({
      where:   { ...(season ? { season } : {}), isActive: true, leagueId: { in: leagueIds } },
      select: {
        clubId: true, leagueId: true, played: true, wins: true, losses: true, draws: true, percentage: true, points: true,
        club: {
          select: {
            name: true,
            state: { select: { code: true, name: true } },
          },
        },
        league: { select: { name: true, shortName: true, strengthTier: true, strengthScore: true } },
      },
    })

    // Latest ranking entries → clubId → { rank, powerRating }
    const run = await prisma.rankingRun.findFirst({
      where:   { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    })
    const rankByClub = new Map<string, { rank: number; powerRating: number }>()
    if (run) {
      const entries = await prisma.rankingEntry.findMany({
        where:  { runId: run.id, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true } },
        select: { clubId: true, rank: true, powerRating: true },
      })
      for (const e of entries) rankByClub.set(e.clubId, { rank: e.rank, powerRating: e.powerRating })
    }

    // Group: state → league → clubs
    type ClubOut = ReturnType<typeof shapeClub>
    function shapeClub(r: (typeof rows)[number]) {
      const rk = rankByClub.get(r.clubId)
      return {
        clubId:       r.clubId,
        name:         r.club.name,
        slug:         null,
        region:       null,
        websiteUrl:   null,
        facebookUrl:  null,
        instagramUrl: null,
        played:       r.played,
        wins:         r.wins,
        losses:       r.losses,
        draws:        r.draws,
        percentage:   r.percentage,
        points:       r.points,
        rank:         rk?.rank ?? null,
        powerRating:  rk?.powerRating ?? null,
      }
    }

    interface LeagueGroup {
      leagueId: string; name: string; shortName: string | null
      strengthTier: number; strengthScore: number; clubs: ClubOut[]
    }
    interface StateGroup { code: string; name: string; leagues: LeagueGroup[] }

    const states = new Map<string, StateGroup>()

    for (const r of rows) {
      const stateCode = r.club.state?.code ?? 'VIC'
      const stateName = r.club.state?.name ?? stateCode
      let sg = states.get(stateCode)
      if (!sg) { sg = { code: stateCode, name: stateName, leagues: [] }; states.set(stateCode, sg) }

      let lg = sg.leagues.find(l => l.leagueId === r.leagueId)
      if (!lg) {
        lg = {
          leagueId: r.leagueId, name: r.league.name, shortName: r.league.shortName ?? null,
          strengthTier: r.league.strengthTier, strengthScore: r.league.strengthScore, clubs: [],
        }
        sg.leagues.push(lg)
      }
      lg.clubs.push(shapeClub(r))
    }

    // Order: clubs by ladder (points desc, then percentage desc); leagues by
    // strength desc; states alphabetically.
    let totalClubs = 0
    const statesOut = [...states.values()].sort((a, b) => a.code.localeCompare(b.code))
    for (const sg of statesOut) {
      sg.leagues.sort((a, b) => b.strengthScore - a.strengthScore || a.name.localeCompare(b.name))
      for (const lg of sg.leagues) {
        lg.clubs.sort((a, b) => b.points - a.points || b.percentage - a.percentage)
        totalClubs += lg.clubs.length
      }
    }
    const totalLeagues = statesOut.reduce((n, s) => n + s.leagues.length, 0)

    res.json({ season, states: statesOut, meta: { totalClubs, totalLeagues } })
  } catch (err) {
    logger.error('GET /directory error', { detail: String(err) })
    res.status(500).json({ error: 'Internal server error', detail: String(err) })
  }
})

export { router as directoryRouter }
