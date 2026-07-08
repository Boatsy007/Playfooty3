/**
 * Leagues API Routes
 * GET /api/leagues         — all leagues with latest club counts
 * GET /api/leagues/:id     — single league detail
 */

import { Router }          from 'express'
import { prisma }          from '../../db/client.js'
import { cachePublic }     from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// GET /api/leagues
router.get('/', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const { state } = req.query as Record<string, string>

    const leagues = await prisma.league.findMany({
      where: {
        sport: 'FOOTBALL',
        isActive: true,
        archivedAt: null,
        ...(state ? { state: { code: state } } : {}),
      },
      select: {
        id: true, name: true, strengthScore: true, lastSyncedAt: true,
        state:   { select: { code: true, name: true } },
        sources: { where: { isActive: true }, select: { sourceType: true } },
        _count:  { select: { clubSeasons: true } },
      },
      orderBy: [{ state: { name: 'asc' } }, { name: 'asc' }],
    })

    res.json({
      data: leagues.map(l => ({
        id:             l.id,
        name:           l.name,
        state:          l.state.code,
        stateName:      l.state.name,
        strengthScore:  l.strengthScore,
        sourceTypes:    l.sources.map(s => s.sourceType),
        clubCount:      l._count.clubSeasons,
        lastSyncedAt:   l.lastSyncedAt,
      })),
      meta: { total: leagues.length },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/leagues/:id
router.get('/:id', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const league = await prisma.league.findFirst({
      where: {
        id: req.params.id,
        sport: 'FOOTBALL',
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true, name: true, strengthScore: true, strengthTier: true, strengthConfidence: true,
        strengthReasoning: true, strengthCalculatedAt: true, regionName: true, currentSeason: true,
        lastSyncedAt: true, logoUrl: true, primarySource: true,
        state: { select: { code: true, name: true } },
        sources: { where: { isActive: true }, select: { sourceType: true, ladderUrl: true, fixturesUrl: true, isActive: true, lastScrapedAt: true } },
        association: { select: { name: true } },
      },
    })

    if (!league) return res.status(404).json({ error: 'League not found' })

    // Latest completed run → ranked teams from this league (for the league page)
    const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
    const rankedTeams = run
      ? await prisma.rankingEntry.findMany({
          where:   { runId: run.id, leagueId: league.id, league: { sport: 'FOOTBALL', archivedAt: null } },
          orderBy: { rank: 'asc' },
          select:  { clubId: true, clubName: true, rank: true, previousRank: true, rankMovement: true, powerRating: true, state: true, recentForm: true },
        })
      : []
    // How many clubs were ranked nationally in this run (for "top X of N" context).
    const totalRanked = run ? await prisma.rankingEntry.count({ where: { runId: run.id, league: { sport: 'FOOTBALL', archivedAt: null } } }) : 0

    // League ladder from season stats (ladder position order)
    const season = run?.season
    const seasonForLadder = season ?? league.currentSeason ?? undefined
    let footballLadderRows: { clubId: string | null; clubName: string; position: number; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; percentage: number; premiershipPoints: number }[] = []
    if (seasonForLadder) {
      try {
        footballLadderRows = await prisma.footballLadderEntry.findMany({
          where:   { leagueId: league.id, season: seasonForLadder },
          orderBy: [{ position: 'asc' }, { premiershipPoints: 'desc' }],
          select:  { clubId: true, clubName: true, position: true, played: true, wins: true, losses: true, draws: true, pointsFor: true, pointsAgainst: true, percentage: true, premiershipPoints: true },
        })
      } catch {
        footballLadderRows = []
      }
    }
    const ladderRows = footballLadderRows.length === 0
      ? await prisma.clubLeagueSeason.findMany({
          where:   { leagueId: league.id, isActive: true, ...(seasonForLadder ? { season: seasonForLadder } : {}) },
          orderBy: [{ season: 'desc' }, { position: 'asc' }, { points: 'desc' }],
          select:  { clubId: true, played: true, wins: true, losses: true, draws: true, goalsFor: true, goalsAgainst: true, percentage: true, points: true, position: true },
        })
      : []
    const clubNames = new Map((await prisma.club.findMany({ where: { id: { in: ladderRows.map(r => r.clubId) } }, select: { id: true, name: true } })).map(c => [c.id, c.name]))

    res.json({
      data: {
        id:            league.id,
        name:          league.name,
        state:         league.state.code,
        stateName:     league.state.name,
        association:   league.association?.name,
        strengthScore: league.strengthScore,
        strengthTier:  league.strengthTier,
        strengthConfidence:   league.strengthConfidence,
        strengthReasoning:    league.strengthReasoning,
        strengthCalculatedAt: league.strengthCalculatedAt,
        regionName:    league.regionName,
        currentSeason: league.currentSeason,
        lastSyncedAt:  league.lastSyncedAt,
        logoUrl:       league.logoUrl,
        primarySource: league.primarySource,
        weekLabel:     run?.weekLabel ?? null,
        totalRanked,
        rankedTeams:   rankedTeams.map(t => {
          let recentForm: string[] = []
          try { recentForm = JSON.parse(t.recentForm || '[]') } catch { /* keep [] */ }
          return { clubId: t.clubId, clubName: t.clubName, rank: t.rank, previousRank: t.previousRank, rankMovement: t.rankMovement, powerRating: t.powerRating, state: t.state, recentForm, qualified: t.rank <= 32 }
        }),
        ladder:        footballLadderRows.length > 0
          ? footballLadderRows.map(r => ({
              clubId: r.clubId ?? '', clubName: r.clubName,
              position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws,
              goalsFor: r.pointsFor, goalsAgainst: r.pointsAgainst, percentage: r.percentage, points: r.premiershipPoints,
            }))
          : ladderRows.map(r => ({
              clubId: r.clubId, clubName: clubNames.get(r.clubId) ?? 'Unknown',
              position: r.position, played: r.played, wins: r.wins, losses: r.losses, draws: r.draws,
              goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, percentage: r.percentage, points: r.points,
            })),
        sources:       league.sources.map(s => ({
          sourceType:  s.sourceType,
          ladderUrl:   s.ladderUrl,
          fixturesUrl: s.fixturesUrl,
          isActive:    s.isActive,
          lastScraped: s.lastScrapedAt,
        })),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/leagues/search/global?q=…  → teams + leagues matching the query.
router.get('/search/global', publicRateLimit, cachePublic(120), async (req, res) => {
  try {
    const q = String((req.query as Record<string, string>).q ?? '').trim()
    if (q.length < 2) return res.json({ data: { teams: [], leagues: [] } })

    const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
    const teams = run
      ? await prisma.rankingEntry.findMany({
          where:   { runId: run.id, clubName: { contains: q, mode: 'insensitive' as const }, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true } },
          orderBy: { rank: 'asc' },
          take:    12,
          select:  { clubId: true, clubName: true, leagueName: true, state: true, rank: true },
        })
      : []

    const leagues = await prisma.league.findMany({
      where:   { sport: 'FOOTBALL', isActive: true, archivedAt: null, name: { contains: q, mode: 'insensitive' as const } },
      orderBy: { strengthScore: 'desc' },
      take:    12,
      select:  { id: true, name: true, strengthScore: true, state: { select: { code: true } } },
    })

    res.json({
      data: {
        teams:   teams.map(t => ({ clubId: t.clubId, clubName: t.clubName, leagueName: t.leagueName, state: t.state, rank: t.rank })),
        leagues: leagues.map(l => ({ id: l.id, name: l.name, strengthScore: l.strengthScore, state: l.state.code })),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as leaguesRouter }
