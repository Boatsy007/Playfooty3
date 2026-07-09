/**
 * CLI trigger for PlayHQ URL import + league sync (browser-backed).
 *
 * Usage:
 *   tsx src/jobs/playhq-url-import-trigger.ts --url="https://www.playhq.com/netball-australia/org/..."
 *   tsx src/jobs/playhq-url-import-trigger.ts --sync=<leagueId>
 *   tsx src/jobs/playhq-url-import-trigger.ts --sync-all       # sync every league with a stored URL
 */

import { prisma }        from '../db/client.js'
import { importFromUrl, syncLeague } from './playhq-url-import.js'
import { logger }        from '../utils/logger.js'

function arg(name: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : (process.argv.includes(`--${name}`) ? '' : undefined)
}

async function main() {
  const url     = arg('url')
  const syncId  = arg('sync')
  const syncAll = arg('sync-all') !== undefined

  if (url) {
    const report = await importFromUrl(url, { rerank: true })
    console.log('\n═══ PLAYHQ URL IMPORT ═══')
    console.log(JSON.stringify(report, null, 2))
  } else if (syncId) {
    const report = await syncLeague(syncId, { rerank: true })
    console.log('\n═══ LEAGUE SYNC ═══')
    console.log(JSON.stringify(report, null, 2))
  } else if (syncAll) {
    const leagues = await prisma.league.findMany({
      where: { isActive: true, enabled: true, archivedAt: null, OR: [{ ladderUrl: { not: null } }, { sourceUrl: { not: null } }, { ladderUrlOverride: { not: null } }] },
      select: { id: true, name: true },
    })
    console.log(`\n═══ SYNC ALL (${leagues.length} leagues) ═══`)
    let ok = 0, fail = 0
    for (const l of leagues) {
      try {
        // Defer per-league rerank; rank once at the end for efficiency.
        const r = await syncLeague(l.id, { rerank: false })
        if (r.status === 'SUCCESS') { ok++; console.log(`  ✓ ${l.name} — +${r.clubsAdded}/~${r.clubsUpdated}, ${r.ladderRows} rows${r.reviewsRaised ? `, ${r.reviewsRaised} to review` : ''}`) }
        else { fail++; console.log(`  ⚠ ${l.name} — ${r.status}: ${r.error ?? r.warnings.join('; ')}`) }
      } catch (e) { fail++; console.log(`  ✗ ${l.name} — ${String(e)}`) }
    }
    // One national re-rank after all syncs.
    const { rankAndStore } = await import('./playhq-scrape.js')
    const { getISOWeekLabel } = await import('../utils/week-label.js')
    const { clubsRanked } = await rankAndStore(getISOWeekLabel())
    console.log(`\nSynced ${ok} ok, ${fail} failed. Ranked ${clubsRanked} clubs.`)
  } else {
    console.log('Provide --url=<playhq url>, --sync=<leagueId>, or --sync-all')
  }

  await prisma.$disconnect()
}

main().catch(async e => { logger.error('URL import trigger failed', { detail: String(e) }); await prisma.$disconnect().catch(() => {}); process.exit(1) })
