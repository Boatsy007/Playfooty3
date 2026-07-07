/**
 * Clubs API Routes
 * GET /api/clubs           — list all clubs (latest season)
 * GET /api/clubs/:id       — single club profile with history
 * GET /api/history/:clubId — full ranking history for a club
 */

import { Router }          from 'express'
import { prisma }          from '../../db/client.js'
import { cachePublic }     from '../middleware/cache-middleware.js'
import { publicRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// GET /api/clubs
router.get('/', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const { state, league, season } = req.query as Record<string, string>

    const runs = await prisma.rankingRun.findMany({
      where:   { status: 'COMPLETED', ...(season ? { season } : {}) },
      orderBy: { completedAt: 'desc' },
      take:    25,
    })
    let run = null as (typeof runs)[number] | null
    for (const candidate of runs) {
      const visibleRows = await prisma.rankingEntry.count({
        where: {
          runId: candidate.id,
          league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
          club: { sport: 'FOOTBALL', archivedAt: null, isActive: true, approvalStatus: 'APPROVED' },
        },
      })
      if (visibleRows > 0) { run = candidate; break }
    }

    if (!run) {
      const clubs = await prisma.club.findMany({
        where: {
          sport: 'FOOTBALL', archivedAt: null, isActive: true, approvalStatus: 'APPROVED',
          ...(state ? { state: { code: state } } : {}),
          leagueSeasons: { some: { isActive: true, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true, ...(league ? { name: { contains: league, mode: 'insensitive' as const } } : {}) } } },
        },
        include: { state: { select: { code: true } }, leagueSeasons: { where: { isActive: true, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true } }, include: { league: { select: { name: true } } }, take: 1 } },
        orderBy: { name: 'asc' },
        take: 200,
      })
      return res.json({
        data: clubs.map(c => ({ clubId: c.id, clubName: c.name, leagueName: c.leagueSeasons[0]?.league?.name ?? '—', state: c.state?.code ?? '—', rank: null, powerRating: null, logoUrl: c.logoUrl ?? null })),
        meta: { weekLabel: null, season: season ?? null, total: clubs.length, source: 'clubs' },
      })
    }

    const entries = await prisma.rankingEntry.findMany({
      where: {
        runId: run.id,
        league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
        club: { sport: 'FOOTBALL', archivedAt: null, isActive: true, approvalStatus: 'APPROVED' },
        ...(state  ? { state }       : {}),
        ...(league ? { leagueName: { contains: league, mode: 'insensitive' as const } } : {}),
      },
      include: { club: { select: { logoUrl: true } } },
      orderBy: { rank: 'asc' },
      take:    200,
    })

    res.json({
      data: entries.map(e => ({
        clubId:      e.clubId,
        clubName:    e.clubName,
        leagueName:  e.leagueName,
        state:       e.state,
        rank:        e.rank,
        powerRating: e.powerRating,
        logoUrl:     e.club?.logoUrl ?? null,
      })),
      meta: { weekLabel: run.weekLabel, season: run.season, total: entries.length, source: 'rankings' },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/clubs/:id
// Full read-only club profile for the team profile page: current national rank,
// power rating, league + league strength, season record / goals / percentage /
// ladder position, recent form, championship qualification, and rank history.
const QUALIFY_CUTOFF = 32

router.get('/:id', publicRateLimit, cachePublic(600), async (req, res) => {
  try {
    const clubId = req.params.id

    // Get current ranking (latest run), if this club is ranked.
    const currentEntry = await prisma.rankingEntry.findFirst({
      where:   { clubId, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true } },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      include: { rankingRun: { select: { id: true, weekLabel: true, season: true, completedAt: true } } },
    })

    // Fallback base: the club itself + its most recent season row, so EVERY club
    // in the directory has a working profile even when it isn't currently ranked.
    const club = await prisma.club.findUnique({
      where:  { id: clubId },
      include: { state: { select: { code: true, name: true } } },
    })
    if (!currentEntry && !club) return res.status(404).json({ error: 'Club not found' })

    const season = currentEntry?.rankingRun.season
    const cls = await prisma.clubLeagueSeason.findFirst({
      where:   { clubId, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true }, ...(currentEntry ? { season, leagueId: currentEntry.leagueId } : {}) },
      orderBy: { season: 'desc' },
      include: { league: { select: { id: true, name: true, strengthScore: true, strengthTier: true } } },
    })

    const league = cls?.league
      ?? (currentEntry ? await prisma.league.findFirst({ where: { id: currentEntry.leagueId }, select: { id: true, name: true, strengthScore: true, strengthTier: true } }) : null)
    if (!currentEntry && !cls) return res.status(404).json({ error: 'Club not found' })

    // Current league ladder (for the club page's "current ladder" context), plus
    // the season stats so we can show each rival's record. Ordered by position.
    const leagueId = currentEntry?.leagueId ?? league?.id ?? cls?.leagueId ?? null
    const ladderSeason = season ?? cls?.season ?? undefined
    const ladderRows = leagueId && ladderSeason
      ? await prisma.clubLeagueSeason.findMany({
          where:   { leagueId, season: ladderSeason },
          orderBy: [{ position: 'asc' }, { points: 'desc' }],
          select:  { clubId: true, position: true, played: true, wins: true, losses: true, draws: true, percentage: true, points: true },
        })
      : []
    const ladderNames = new Map((await prisma.club.findMany({ where: { id: { in: ladderRows.map(r => r.clubId) } }, select: { id: true, name: true } })).map(c => [c.id, c.name]))

    const history = await prisma.rankingEntry.findMany({
      where:   { clubId, league: { sport: 'FOOTBALL', archivedAt: null, isActive: true } },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      take:    12,
      include: { rankingRun: { select: { weekLabel: true, completedAt: true } } },
    })

    const rank = currentEntry?.rank ?? null

    res.json({
      data: {
        clubId,
        clubName:    currentEntry?.clubName ?? club?.name ?? 'Unknown Club',
        leagueId:    currentEntry?.leagueId ?? league?.id ?? cls?.leagueId ?? null,
        leagueName:  currentEntry?.leagueName ?? league?.name ?? null,
        state:       currentEntry?.state ?? club?.state?.code ?? null,
        rank,
        previousRank: currentEntry?.previousRank ?? null,
        rankMovement: currentEntry?.rankMovement ?? 0,
        powerRating: currentEntry?.powerRating ?? null,
        ranked:      !!currentEntry,
        qualified:   rank != null && rank <= QUALIFY_CUTOFF,
        qualifyCutoff: QUALIFY_CUTOFF,
        record:      { wins: cls?.wins ?? 0, losses: cls?.losses ?? 0, draws: cls?.draws ?? 0, played: cls?.played ?? 0 },
        goalsFor:    cls?.goalsFor ?? 0,
        goalsAgainst: cls?.goalsAgainst ?? 0,
        percentage:  cls?.percentage ?? 0,
        ladderPosition: cls?.position ?? null,
        leagueStrengthScore: league?.strengthScore ?? null,
        leagueStrengthTier:  league?.strengthTier ?? null,
        recentForm:  currentEntry ? JSON.parse(currentEntry.recentForm as string ?? '[]') : [],
        componentScores: currentEntry ? JSON.parse(currentEntry.componentScores as string ?? '{}') : {},
        weekLabel:   currentEntry?.rankingRun.weekLabel ?? null,
        season:      season ?? cls?.season ?? null,
        history:     history.map(h => ({ weekLabel: h.rankingRun.weekLabel, rank: h.rank, powerRating: h.powerRating, date: h.rankingRun.completedAt })),
        // Club identity + brand (from the club record; nulls where unset)
        town:        club?.townName ?? null,
        region:      club?.region ?? null,
        stateName:   club?.state?.name ?? null,
        logoUrl:     club?.logoUrl ?? null,
        primaryColour:   club?.primaryColour ?? null,
        secondaryColour: club?.secondaryColour ?? null,
        websiteUrl:  club?.websiteUrl ?? null,
        facebookUrl: club?.facebookUrl ?? null,
        instagramUrl: club?.instagramUrl ?? null,
        // Current league ladder for context on the club page.
        ladder:      ladderRows.map(r => ({
          clubId: r.clubId, clubName: ladderNames.get(r.clubId) ?? 'Unknown', position: r.position,
          played: r.played, wins: r.wins, losses: r.losses, draws: r.draws, percentage: r.percentage, points: r.points,
          isThisClub: r.clubId === clubId,
        })),
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/history/:clubId
router.get('/history/:clubId', publicRateLimit, cachePublic(3600), async (req, res) => {
  try {
    const { clubId }  = req.params
    const { season }  = req.query as Record<string, string>
    const limit       = Math.min(parseInt(String(req.query.limit), 10) || 52, 52)

    const history = await prisma.rankingEntry.findMany({
      where: {
        clubId,
        ...(season ? { rankingRun: { season } } : {}),
        league: { sport: 'FOOTBALL', archivedAt: null, isActive: true },
      },
      orderBy: { rankingRun: { completedAt: 'desc' } },
      take:    limit,
      include: { rankingRun: { select: { weekLabel: true, season: true, completedAt: true } } },
    })

    if (history.length === 0) return res.status(404).json({ error: 'No history found for this club' })

    res.json({
      data: history.map(h => ({
        weekLabel:   h.rankingRun.weekLabel,
        season:      h.rankingRun.season,
        rank:        h.rank,
        powerRating: h.powerRating,
        rankMovement: h.rankMovement,
        date:        h.rankingRun.completedAt,
      })),
      meta: { clubId, total: history.length },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as clubsRouter }
