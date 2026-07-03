/**
 * CLI trigger for the Country Footy gap-fill import.
 * Usage: tsx src/jobs/countryfooty-import-trigger.ts [--leagues=hampden,ballarat] [--max=5]
 */
import { runCountryFootyImport } from './countryfooty-import.js'
import { prisma } from '../db/client.js'

async function main() {
  const leaguesArg = process.argv.find(a => a.startsWith('--leagues='))?.split('=')[1]
  const maxArg     = parseInt(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] ?? '', 10)
  const leagueFilter = leaguesArg ? leaguesArg.split(',').map(s => s.trim()).filter(Boolean) : undefined
  const maxLeagues   = Number.isFinite(maxArg) ? maxArg : undefined

  const r = await runCountryFootyImport({ leagueFilter, maxLeagues })

  console.log('\n═══ COUNTRY FOOTY IMPORT ═══')
  console.log(`Status            : ${r.status}`)
  console.log(`Leagues scraped   : ${r.scraped}`)
  console.log(`Leagues imported  : ${r.imported}`)
  console.log(`Skipped (overlap) : ${r.skippedOverlap.length}${r.skippedOverlap.length ? ' — ' + r.skippedOverlap.join(', ') : ''}`)
  console.log(`Clubs ranked      : ${r.clubsRanked}`)
  if (r.error) console.log(`Error             : ${r.error}`)
  console.log('\nImported A-Grade ladders:')
  for (const x of r.imported_) console.log(`  ✓ ${x.league.padEnd(24)} [${x.division}]  ${x.teams} teams`)

  await prisma.$disconnect()
  process.exit(r.status === 'FAILED' ? 1 : 0)
}
main().catch(async e => { console.error('CF import failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
