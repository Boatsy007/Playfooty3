#!/usr/bin/env node
/**
 * Repair PlayHQ AFL imports that were classified as NETBALL by legacy import code.
 *
 * Safe/idempotent: only rows connected to PlayHQ `/afl/` source URLs are updated,
 * and only sport/visibility/provenance fields are changed. No data is deleted.
 *
 * Usage:
 *   cd backend
 *   DATABASE_URL="$DATABASE_URL" node scripts/repair-playhq-afl-import-sport.mjs
 *   DATABASE_URL="$DATABASE_URL" node scripts/repair-playhq-afl-import-sport.mjs --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function hasAflUrl(value) {
  return typeof value === 'string' && /\/afl\/org\//i.test(value)
}

async function main() {
  const leagueSources = await prisma.leagueSource.findMany({
    where: {
      OR: [
        { ladderUrl: { contains: '/afl/org/' } },
        { fixturesUrl: { contains: '/afl/org/' } },
        { resultsUrl: { contains: '/afl/org/' } },
      ],
    },
    select: { leagueId: true },
  })
  const footballImports = await prisma.footballDataImport.findMany({
    where: { sourceUrl: { contains: '/afl/org/' } },
    select: { leagueId: true },
  })
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { sourceUrl: { contains: '/afl/org/' } },
        { ladderUrl: { contains: '/afl/org/' } },
        { playhqOrgSlug: { not: null } },
        { id: { in: [...leagueSources, ...footballImports].map((row) => row.leagueId) } },
      ],
    },
    select: { id: true, name: true, sport: true, sourceUrl: true, ladderUrl: true, playhqOrgSlug: true },
  })

  const affectedLeagues = leagues.filter((league) =>
    hasAflUrl(league.sourceUrl) ||
    hasAflUrl(league.ladderUrl) ||
    leagueSources.some((row) => row.leagueId === league.id) ||
    footballImports.some((row) => row.leagueId === league.id),
  )
  const leagueIds = [...new Set(affectedLeagues.map((league) => league.id))]

  const memberships = leagueIds.length
    ? await prisma.clubLeagueSeason.findMany({ where: { leagueId: { in: leagueIds } }, select: { clubId: true } })
    : []
  const clubIds = [...new Set(memberships.map((row) => row.clubId))]

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    affectedLeagueCount: leagueIds.length,
    affectedClubCount: clubIds.length,
    affectedLeagues: affectedLeagues.map((league) => ({ id: league.id, name: league.name, currentSport: league.sport, sourceUrl: league.sourceUrl, ladderUrl: league.ladderUrl })),
  }
  console.log(JSON.stringify(summary, null, 2))

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update affected PlayHQ AFL imports to FOOTBALL.')
    return
  }
  if (leagueIds.length === 0) return

  const [leagueUpdate, clubUpdate, membershipUpdate] = await prisma.$transaction([
    prisma.league.updateMany({
      where: { id: { in: leagueIds } },
      data: {
        sport: 'FOOTBALL',
        isActive: true,
        enabled: true,
        hidden: false,
        archivedAt: null,
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        primaryDataSource: 'PLAYHQ_SCRAPER',
        scrapeEnabled: true,
      },
    }),
    prisma.club.updateMany({
      where: { id: { in: clubIds } },
      data: { sport: 'FOOTBALL', isActive: true, archivedAt: null, approvalStatus: 'APPROVED' },
    }),
    prisma.clubLeagueSeason.updateMany({
      where: { leagueId: { in: leagueIds } },
      data: { sport: 'FOOTBALL', isActive: true },
    }),
  ])

  console.log(JSON.stringify({ repaired: true, leaguesUpdated: leagueUpdate.count, clubsUpdated: clubUpdate.count, membershipsUpdated: membershipUpdate.count }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
