#!/usr/bin/env node
/**
 * Verify whether a football league's imported clubs are visible in /api/rankings.
 *
 * Usage:
 *   cd backend
 *   DATABASE_URL="$DATABASE_URL" node scripts/verify-football-rankings.mjs "Afl Barwon Fnl"
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const leagueName = process.argv.slice(2).join(' ') || 'Afl Barwon Fnl'

const publicLeagueWhere = { sport: 'FOOTBALL', archivedAt: null, isActive: true }
const publicClubWhere = { sport: 'FOOTBALL', archivedAt: null, isActive: true, approvalStatus: 'APPROVED' }

async function latestPublicRun(season) {
  const runs = await prisma.rankingRun.findMany({
    where: { status: 'COMPLETED', ...(season ? { season } : {}) },
    orderBy: { completedAt: 'desc' },
    take: 25,
  })
  for (const run of runs) {
    const publicEntries = await prisma.rankingEntry.count({
      where: { runId: run.id, league: publicLeagueWhere, club: publicClubWhere },
    })
    if (publicEntries > 0) return { run, publicEntries }
  }
  return { run: null, publicEntries: 0 }
}

function blockersForLeague(league) {
  const blockers = []
  if (!league) return ['league not found']
  if (league.sport !== 'FOOTBALL') blockers.push(`league.sport=${league.sport}`)
  if (league.archivedAt) blockers.push(`league.archivedAt=${league.archivedAt.toISOString()}`)
  if (!league.isActive) blockers.push('league.isActive=false')
  return blockers
}

function blockersForClub(club) {
  const blockers = []
  if (club.sport !== 'FOOTBALL') blockers.push(`club.sport=${club.sport}`)
  if (club.archivedAt) blockers.push(`club.archivedAt=${club.archivedAt.toISOString()}`)
  if (!club.isActive) blockers.push('club.isActive=false')
  if (club.approvalStatus !== 'APPROVED') blockers.push(`club.approvalStatus=${club.approvalStatus}`)
  return blockers
}

async function main() {
  const league = await prisma.league.findFirst({
    where: { name: { equals: leagueName, mode: 'insensitive' } },
    select: { id: true, name: true, sport: true, isActive: true, archivedAt: true, approvalStatus: true, sourceUrl: true, ladderUrl: true, currentSeason: true },
  })

  const leagueBlockers = blockersForLeague(league)
  const memberships = league
    ? await prisma.clubLeagueSeason.findMany({
        where: { leagueId: league.id, season: league.currentSeason ?? undefined },
        include: { club: true },
      })
    : []
  const clubBlockers = memberships.map((membership) => ({
    clubId: membership.clubId,
    clubName: membership.club.name,
    membershipSport: membership.sport,
    membershipActive: membership.isActive,
    blockers: [
      ...(membership.sport !== 'FOOTBALL' ? [`membership.sport=${membership.sport}`] : []),
      ...(!membership.isActive ? ['membership.isActive=false'] : []),
      ...blockersForClub(membership.club),
    ],
  })).filter((row) => row.blockers.length > 0)

  const { run, publicEntries } = await latestPublicRun(league?.currentSeason ?? undefined)
  const leagueRankingRows = league && run
    ? await prisma.rankingEntry.findMany({
        where: { runId: run.id, leagueId: league.id },
        select: { clubId: true, clubName: true, leagueId: true, leagueName: true, rank: true, state: true },
        orderBy: { rank: 'asc' },
      })
    : []
  const publicLeagueRankingRows = league && run
    ? await prisma.rankingEntry.findMany({
        where: { runId: run.id, leagueId: league.id, league: publicLeagueWhere, club: publicClubWhere },
        select: { clubId: true, clubName: true, rank: true, state: true },
        orderBy: { rank: 'asc' },
      })
    : []

  const report = {
    leagueName,
    league,
    clubsCount: memberships.length,
    footballMembershipsCount: memberships.filter((membership) => membership.sport === 'FOOTBALL' && membership.isActive).length,
    latestWeekLabel: run?.weekLabel ?? null,
    latestRunId: run?.id ?? null,
    latestRunPublicRows: publicEntries,
    rankingRowsCount: leagueRankingRows.length,
    publicRankingsRowsForLeague: publicLeagueRankingRows.length,
    publicRankingsWouldShowImportedClubs: publicLeagueRankingRows.length > 0 && publicLeagueRankingRows.length === memberships.length,
    excludedBecause: [...leagueBlockers, ...clubBlockers.map((row) => `${row.clubName}: ${row.blockers.join(', ')}`)],
    rankingRows: leagueRankingRows,
  }

  console.log(JSON.stringify(report, null, 2))
  if (!league || report.excludedBecause.length > 0 || publicLeagueRankingRows.length === 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
