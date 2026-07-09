#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const leagueId = process.argv[2]
if (!leagueId) {
  console.error('Usage: node scripts/verify-football-league-visibility.mjs <leagueId>')
  process.exit(2)
}

const visibleReason = league => {
  if (!league) return ['league row not found']
  const reasons = []
  if (league.sport !== 'FOOTBALL') reasons.push(`sport is ${league.sport}`)
  if (!league.isActive) reasons.push('isActive is false')
  if (league.archivedAt) reasons.push(`archivedAt is ${league.archivedAt.toISOString()}`)
  if (league.hidden) reasons.push('hidden is true')
  if (league.approvalStatus !== 'APPROVED') reasons.push(`approvalStatus is ${league.approvalStatus}`)
  if (league.status !== 'ACTIVE') reasons.push(`status is ${league.status}`)
  return reasons
}

try {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      sport: true,
      status: true,
      hidden: true,
      archivedAt: true,
      approvalStatus: true,
      isActive: true,
      enabled: true,
      primaryDataSource: true,
      sourceUrl: true,
      ladderUrl: true,
      lastSuccessfulSyncAt: true,
      _count: { select: { clubSeasons: true, footballLadderEntries: true, footballFixtures: true, footballResults: true, footballImports: true } },
    },
  })

  const adminVisible = !!league && league.sport === 'FOOTBALL' && league.archivedAt == null
  const publicVisible = !!league && league.sport === 'FOOTBALL' && league.archivedAt == null && league.isActive
  const blockers = visibleReason(league)

  const [memberships, ladderRows, sources] = league
    ? await Promise.all([
        prisma.clubLeagueSeason.count({ where: { leagueId, isActive: true } }),
        prisma.footballLadderEntry.count({ where: { leagueId } }),
        prisma.leagueSource.findMany({ where: { leagueId }, select: { sourceType: true, season: true, isActive: true, ladderUrl: true } }),
      ])
    : [0, 0, []]

  console.log(JSON.stringify({
    leagueId,
    adminQuery: { where: { sport: 'FOOTBALL', archivedAt: null }, visible: adminVisible },
    publicQuery: { where: { sport: 'FOOTBALL', isActive: true, archivedAt: null }, visible: publicVisible },
    blockers,
    league,
    counts: { memberships, ladderRows, leagueSources: sources.length },
    sources,
  }, null, 2))

  if (!adminVisible || !publicVisible || blockers.length) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
