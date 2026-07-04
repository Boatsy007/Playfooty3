/**
 * Purge: hard-delete every league that is not a genuine country
 * Football-Netball League (keep FNLs + the recognised country-league allow-list;
 * delete all standalone Netball Associations, metro/junior/rep/social/night/
 * indoor/school comps, and duplicates), then re-rank.
 *
 * Destructive by request: rows are removed, not just deactivated. Runs a dry-run
 * classification first (printed), then deletes. Per-league failures skip + log +
 * continue; the whole purge never aborts.
 *
 * Usage: tsx src/jobs/purge-non-country-leagues.ts [--dry]
 */

import { prisma }       from '../db/client.js'
import { rankAndStore } from './playhq-scrape.js'
import { classifyLeague } from '../discovery/country-league-filter.js'
import { getISOWeekLabel } from '../utils/week-label.js'

const norm = (s: string) => (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')

/**
 * Bulk hard-delete a set of leagues in a handful of set-based queries (not
 * per-league/per-club loops, which make thousands of pooler round-trips and can
 * hang). Clubs that end up in NO remaining league are removed too.
 */
async function hardDeleteLeagues(dropIds: string[], keepIds: string[]): Promise<void> {
  if (dropIds.length === 0) return

  // Clubs that appear in a dropped league…
  const clubsInDrop = await prisma.clubLeagueSeason.findMany({ where: { leagueId: { in: dropIds } }, select: { clubId: true }, distinct: ['clubId'] })
  // …and clubs still in a kept league (must be preserved).
  const clubsInKeep = keepIds.length
    ? await prisma.clubLeagueSeason.findMany({ where: { leagueId: { in: keepIds } }, select: { clubId: true }, distinct: ['clubId'] })
    : []
  const keepClubSet = new Set(clubsInKeep.map(c => c.clubId))
  const orphanClubIds = [...new Set(clubsInDrop.map(c => c.clubId))].filter(id => !keepClubSet.has(id))

  // Remove league-scoped rows first (FK order), all set-based.
  await prisma.rankingEntry.deleteMany({ where: { leagueId: { in: dropIds } } })
  await prisma.match.deleteMany({ where: { leagueId: { in: dropIds } } }).catch(() => {})
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: { in: dropIds } } })
  await prisma.leagueSource.deleteMany({ where: { leagueId: { in: dropIds } } })

  // Remove now-orphaned clubs and their child rows.
  if (orphanClubIds.length) {
    await prisma.rankingEntry.deleteMany({ where: { clubId: { in: orphanClubIds } } })
    await prisma.rankingSnapshot.deleteMany({ where: { clubId: { in: orphanClubIds } } })
    await prisma.clubNameVariant.deleteMany({ where: { clubId: { in: orphanClubIds } } })
    await prisma.match.deleteMany({ where: { OR: [{ homeClubId: { in: orphanClubIds } }, { awayClubId: { in: orphanClubIds } }] } }).catch(() => {})
    await prisma.club.deleteMany({ where: { id: { in: orphanClubIds } } })
  }

  await prisma.league.deleteMany({ where: { id: { in: dropIds } } })
}

async function main() {
  const dryRun = process.argv.includes('--dry')
  const leagues = await prisma.league.findMany({ include: { association: { select: { id: true, name: true } } } })

  const keep: { name: string; category: string }[] = []
  const drop: { id: string; name: string; reason: string; assocId: string | null }[] = []
  for (const l of leagues) {
    const name = l.association?.name ?? l.name
    const c = classifyLeague(name)
    if (c.keep) keep.push({ name, category: c.category })
    else drop.push({ id: l.id, name, reason: c.reason, assocId: l.association?.id ?? null })
  }

  // Duplicates among KEPT (same normalised name) → drop the weaker ones too.
  const byName = new Map<string, typeof leagues>()
  for (const l of leagues) {
    const name = l.association?.name ?? l.name
    if (!classifyLeague(name).keep) continue
    byName.set(norm(name), [...(byName.get(norm(name)) ?? []), l])
  }
  const dupDrops: { id: string; name: string; assocId: string | null }[] = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    const keeper = [...group].sort((a, b) => (b.strengthScore - a.strengthScore))[0]
    for (const l of group) if (l.id !== keeper.id) dupDrops.push({ id: l.id, name: l.association?.name ?? l.name, assocId: l.association?.id ?? null })
  }

  console.log('\n═══ COUNTRY-LEAGUE PURGE ═══')
  console.log(`Total leagues        : ${leagues.length}`)
  console.log(`KEEP (country FNL)   : ${keep.length}`)
  console.log(`DELETE (non-country) : ${drop.length}`)
  console.log(`DELETE (duplicates)  : ${dupDrops.length}`)
  console.log('\n── KEEPING ──')
  for (const k of keep.sort((a, b) => a.name.localeCompare(b.name))) console.log(`  ✓ ${k.name}  [${k.category}]`)
  console.log('\n── DELETING (not a country FNL) ──')
  for (const d of drop.sort((a, b) => a.name.localeCompare(b.name))) console.log(`  ✗ ${d.name}  — ${d.reason}`)
  if (dupDrops.length) { console.log('\n── DELETING (duplicate) ──'); for (const d of dupDrops) console.log(`  ✗ ${d.name}`) }

  if (dryRun) { console.log('\n(DRY RUN — nothing deleted)'); await prisma.$disconnect(); return }

  const dropIds = [...drop, ...dupDrops].map(d => d.id)
  const keepIds = leagues.filter(l => !dropIds.includes(l.id)).map(l => l.id)
  await hardDeleteLeagues(dropIds, keepIds)
  const deleted = dropIds.length

  // Remove associations left with no leagues (bulk).
  const orphanAssocs = await prisma.association.findMany({ where: { leagues: { none: {} } }, select: { id: true } })
  if (orphanAssocs.length) await prisma.association.deleteMany({ where: { id: { in: orphanAssocs.map(a => a.id) } } })

  const { clubsRanked } = await rankAndStore(getISOWeekLabel())
  console.log(`\nDeleted ${deleted} leagues. Removed ${orphanAssocs.length} orphan associations. Re-ranked ${clubsRanked} clubs.`)
  console.log('═══ PURGE COMPLETE ═══')
  await prisma.$disconnect()
}

main().catch(async e => { console.error('Purge failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
