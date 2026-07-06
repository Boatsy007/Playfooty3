/**
 * Optional PlayFooty football league seed helper.
 *
 * Dry-run by default: prints proposed empty football league shells only.
 * Confirmed mode creates leagues with sport=FOOTBALL and MANUAL_ENTRY primary
 * source, but imports no teams, fixtures, results, ladders or rankings.
 */
import { prisma } from '../db/client.js'

const args = new Set(process.argv.slice(2))
const confirm = args.has('--confirm') && args.has('--yes-i-understand')
const season = process.env.PLAYFOOTY_SEED_SEASON || '2026'
const leagues = [
  ['Gippsland League', 'VIC'],
  ['Ovens & Murray', 'VIC'],
  ['Goulburn Valley', 'VIC'],
  ['Ballarat', 'VIC'],
  ['Bendigo', 'VIC'],
  ['Geelong', 'VIC'],
  ['Hampden', 'VIC'],
  ['Mornington Peninsula', 'VIC'],
  ['Western Region', 'VIC'],
  ['Murray', 'VIC'],
] as const

async function main() {
  const proposal = leagues.map(([name, state]) => ({ name: `${name} - Senior Football`, state, sport: 'FOOTBALL', primaryDataSource: 'MANUAL_ENTRY', currentSeason: season }))
  console.log(JSON.stringify({ mode: confirm ? 'confirm' : 'dry-run', insertsFixturesResultsOrLadders: false, proposal }, null, 2))
  if (!confirm) return
  if (!process.env.DATABASE_URL) {
    console.log(JSON.stringify({ completed: false, reason: 'DATABASE_URL is not configured in this environment.', productionDataModified: false }, null, 2))
    return
  }
  let created = 0, existing = 0
  for (const row of proposal) {
    const state = await prisma.state.upsert({ where: { code: row.state }, create: { code: row.state, name: row.state }, update: {} })
    const found = await prisma.league.findFirst({ where: { name: row.name, sport: 'FOOTBALL' }, select: { id: true } })
    if (found) { existing++; continue }
    await prisma.league.create({ data: { name: row.name, shortName: row.name, stateId: state.id, sport: 'FOOTBALL', dataConfidence: 0.75, primarySource: 'MANUAL_ENTRY', importType: 'MANUAL', manualOverride: true, currentSeason: season } })
    created++
  }
  console.log(JSON.stringify({ completed: true, created, existing }, null, 2))
}

main().finally(() => prisma.$disconnect())
