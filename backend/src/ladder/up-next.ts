/**
 * Club "Up Next" data (Ladder Import V2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend data so a club page can show its next fixture (opponent, date, round,
 * venue, home/away). Read-only over the Fixture store; no public UI here.
 */

import { prisma } from '../db/client.js'

function shape(clubId: string, f: Awaited<ReturnType<typeof prisma.fixture.findFirst>>) {
  if (!f) return null
  const isHome = f.homeClubId === clubId
  return {
    fixtureId: f.id, round: f.round, date: f.matchDate, time: f.matchTime, venue: f.venue,
    homeAway: isHome ? 'HOME' : 'AWAY',
    opponentId: isHome ? f.awayClubId : f.homeClubId,
    opponent: isHome ? f.awayClubName : f.homeClubName,
    leagueId: f.leagueId, leagueName: f.leagueName, status: f.status,
  }
}

/** The club's next scheduled/live fixture (+ a few upcoming). */
export async function clubUpNext(clubId: string, opts: { season?: string } = {}) {
  const base = {
    OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    status: { in: ['SCHEDULED', 'LIVE'] },
    ...(opts.season ? { season: opts.season } : {}),
  }
  // Prefer dated fixtures in the future; fall back to the earliest scheduled.
  const now = new Date()
  const next = await prisma.fixture.findFirst({ where: { ...base, matchDate: { gte: now } }, orderBy: [{ matchDate: 'asc' }, { round: 'asc' }] })
    ?? await prisma.fixture.findFirst({ where: base, orderBy: [{ round: 'asc' }, { matchDate: 'asc' }] })
  const upcoming = await prisma.fixture.findMany({ where: { ...base, matchDate: { gte: now } }, orderBy: [{ matchDate: 'asc' }, { round: 'asc' }], take: 5 })
  return { upNext: shape(clubId, next), upcoming: upcoming.map(f => shape(clubId, f)) }
}
