/**
 * PlayFooty safe netball data cleanup.
 *
 * Default mode is DRY RUN. It reports scraped Go Netty/CNCA/netball data that
 * would be archived/deleted so operators can review before touching production.
 * Confirmed execution requires: --confirm --yes-i-understand
 *
 * Preserves schema, admin users, settings, OCR/CSV/manual import systems,
 * PlayHQ provider code, football tables and generic platform records.
 */
import { prisma } from '../db/client.js'

type Mode = 'dry-run' | 'confirm'
const args = new Set(process.argv.slice(2))
const mode: Mode = args.has('--confirm') ? 'confirm' : 'dry-run'
const confirmed = args.has('--yes-i-understand')
const hardDelete = args.has('--hard-delete')
const sampleTake = Math.min(Number(process.env.CLEANUP_SAMPLE_LIMIT || 12), 50)

async function main() {
  if (mode === 'confirm' && !confirmed) throw new Error('Confirmed cleanup requires --confirm --yes-i-understand')
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({
      mode,
      dryRunUnavailable: true,
      reason: 'DATABASE_URL is not configured in this environment.',
      productionDataModified: false,
      dryRunCommand: 'npm --prefix backend run playfooty:cleanup-netball -- --dry-run',
      confirmedRunCommand: 'npm --prefix backend run playfooty:cleanup-netball -- --confirm --yes-i-understand',
    }, null, 2))
    return
  }

  const netballLeagueWhere = {
    OR: [
      { sport: 'NETBALL' },
      { primarySource: { contains: 'NETBALL', mode: 'insensitive' as const } },
      { primarySource: { contains: 'PLAYHQ', mode: 'insensitive' as const } },
      { sourceUrl: { contains: 'netball', mode: 'insensitive' as const } },
      { name: { contains: 'Netball', mode: 'insensitive' as const } },
      { name: { contains: 'Football Netball', mode: 'insensitive' as const } },
    ],
  }

  const netballLeagues = await prisma.league.findMany({ where: netballLeagueWhere, select: { id: true, name: true, sport: true, primarySource: true, sourceUrl: true, archivedAt: true }, take: 10000 })
  const leagueIds = netballLeagues.map(l => l.id)
  const clubSeasonRows = leagueIds.length ? await prisma.clubLeagueSeason.findMany({ where: { leagueId: { in: leagueIds } }, select: { id: true, clubId: true, leagueId: true } }) : []
  const clubIds = [...new Set(clubSeasonRows.map(r => r.clubId))]
  const rankingRunIds = (await prisma.rankingEntry.findMany({ where: { OR: [{ leagueId: { in: leagueIds } }, { clubId: { in: clubIds } }] }, select: { runId: true } })).map(r => r.runId)
  const uniqueRunIds = [...new Set(rankingRunIds)]
  const articles = await prisma.generatedArticle.findMany({
    where: {
      OR: [
        { title: { contains: 'netball', mode: 'insensitive' as const } },
        { summary: { contains: 'netball', mode: 'insensitive' as const } },
        { body: { contains: 'netball', mode: 'insensitive' as const } },
        { tags: { contains: 'netball', mode: 'insensitive' as const } },
        { author: { contains: 'Got Netty', mode: 'insensitive' as const } },
        { author: { contains: 'Go Netty', mode: 'insensitive' as const } },
        { author: { contains: 'CNCA', mode: 'insensitive' as const } },
      ],
    },
    select: { id: true, title: true, status: true, tags: true },
  })
  const sourceIds = leagueIds.length ? (await prisma.leagueSource.findMany({ where: { OR: [{ leagueId: { in: leagueIds } }, { sourceType: { contains: 'NETBALL', mode: 'insensitive' as const } }] }, select: { id: true } })).map(s => s.id) : []

  const report = {
    mode,
    hardDelete,
    counts: {
      leagues: netballLeagues.length,
      clubs: clubIds.length,
      clubLeagueSeasons: clubSeasonRows.length,
      rankingEntries: await prisma.rankingEntry.count({ where: { OR: [{ leagueId: { in: leagueIds } }, { clubId: { in: clubIds } }] } }),
      rankingSnapshots: await prisma.rankingSnapshot.count({ where: { clubId: { in: clubIds } } }),
      rankingRunsTouched: uniqueRunIds.length,
      matches: await prisma.match.count({ where: { OR: [{ leagueId: { in: leagueIds } }, { homeClubId: { in: clubIds } }, { awayClubId: { in: clubIds } }] } }),
      leagueSources: sourceIds.length,
      scrapeLogs: await prisma.scrapeLog.count({ where: { leagueSourceId: { in: sourceIds } } }),
      generatedArticles: articles.length,
    },
    samples: {
      leagues: netballLeagues.slice(0, sampleTake),
      clubs: await prisma.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, name: true, slug: true, source: true, archivedAt: true }, take: sampleTake }),
      articles: articles.slice(0, sampleTake),
    },
    targetedTables: ['leagues', 'clubs', 'club_league_seasons', 'ranking_entries', 'ranking_snapshots', 'matches', 'league_sources', 'scrape_logs', 'generated_articles'],
    preserved: ['admin_users', 'audit_logs', 'settings', 'backups', 'ocr_imports', 'review_items', 'football_data_imports', 'football_data_conflicts', 'football_fixtures', 'football_results', 'football_ladder_entries', 'schema/migrations', 'PlayHQ provider code', 'CSV/OCR/manual systems', 'ranking engine code'],
  }

  console.log(JSON.stringify(report, null, 2))
  if (mode === 'dry-run') return

  await prisma.$transaction(async tx => {
    await tx.generatedArticle.updateMany({ where: { id: { in: articles.map(a => a.id) } }, data: { status: 'ARCHIVED' } })
    await tx.leagueSource.updateMany({ where: { id: { in: sourceIds } }, data: { isActive: false, lastStatus: 'ARCHIVED_NETBALL_CLEANUP' } })
    await tx.league.updateMany({ where: { id: { in: leagueIds } }, data: { archivedAt: new Date(), isActive: false, enabled: false, hidden: true, status: 'ARCHIVED', syncError: 'Archived by PlayFooty netball cleanup' } })
    await tx.club.updateMany({ where: { id: { in: clubIds } }, data: { archivedAt: new Date(), isActive: false, approvalStatus: 'ARCHIVED', notes: 'Archived by PlayFooty netball cleanup' } })
    if (hardDelete) {
      await tx.rankingSnapshot.deleteMany({ where: { clubId: { in: clubIds } } })
      await tx.rankingEntry.deleteMany({ where: { OR: [{ leagueId: { in: leagueIds } }, { clubId: { in: clubIds } }] } })
      await tx.match.deleteMany({ where: { OR: [{ leagueId: { in: leagueIds } }, { homeClubId: { in: clubIds } }, { awayClubId: { in: clubIds } }] } })
      await tx.clubLeagueSeason.deleteMany({ where: { id: { in: clubSeasonRows.map(r => r.id) } } })
    } else {
      await tx.clubLeagueSeason.updateMany({ where: { id: { in: clubSeasonRows.map(r => r.id) } }, data: { isActive: false } })
    }
  })

  console.log(JSON.stringify({ completed: true, mode, hardDelete, productionDataModified: true }, null, 2))
}

main().finally(() => prisma.$disconnect())
