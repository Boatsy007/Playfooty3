/**
 * CLI trigger for the data audit + cleanup. Prints the full engineering report
 * and exits non-zero if validation fails.
 *
 * Usage: tsx src/jobs/data-audit-trigger.ts
 */
import { runDataAudit } from './data-audit.js'
import { prisma } from '../db/client.js'

function h(t: string) { console.log(`\n═══ ${t} ═══`) }

async function main() {
  const r = await runDataAudit()

  h('RENAMED LEAGUES → ASSOCIATION NAMES')
  console.log(`${r.renamed.length} renamed`)
  for (const x of r.renamed.slice(0, 60)) console.log(`  "${x.from}"  →  "${x.to}"`)

  h('DEACTIVATED — INELIGIBLE COMPETITIONS')
  console.log(`${r.deactivatedIneligible.length} deactivated`)
  for (const x of r.deactivatedIneligible.slice(0, 80)) console.log(`  ✗ ${x.league} — ${x.reason}`)

  h('EXCLUDED — METROPOLITAN ASSOCIATIONS')
  console.log(`${r.deactivatedMetro.length} excluded`)
  for (const x of r.deactivatedMetro) console.log(`  ✗ ${x}`)

  h('DEACTIVATED — DUPLICATE PER ASSOCIATION')
  console.log(`${r.deactivatedDuplicate.length} associations deduped`)
  for (const x of r.deactivatedDuplicate) console.log(`  • ${x.association}: kept "${x.kept}", dropped ${x.dropped.map(d => `"${d}"`).join(', ')}`)

  h('ASSOCIATION REGISTRY')
  const byStatus = new Map<string, number>()
  for (const x of r.registry) byStatus.set(x.status, (byStatus.get(x.status) ?? 0) + 1)
  for (const [s, n] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${s}`)
  console.log('  — needing review / no eligible comp —')
  for (const x of r.registry.filter(x => x.status !== 'Imported').slice(0, 80)) console.log(`    ⚠ ${x.association} [${x.state ?? '?'}] — ${x.status}`)

  h('LEAGUE STRENGTH (active, premier only)')
  const strengths = await prisma.league.findMany({
    where: { isActive: true, enabled: true },
    select: { name: true, playhqGradeName: true, automaticStrengthRating: true, manualStrengthOverride: true, finalStrengthRating: true, strengthConfidence: true, strengthScore: true, needsStrengthReview: true },
    orderBy: { strengthScore: 'desc' },
  })
  console.log('  auto  ovr   final conf  score  association (competition)')
  for (const l of strengths) {
    const ov = l.manualStrengthOverride == null ? '  -  ' : l.manualStrengthOverride.toFixed(1)
    console.log(`  ${l.automaticStrengthRating.toFixed(1)}   ${ov}   ${l.finalStrengthRating.toFixed(1)}  ${l.strengthConfidence.toFixed(2)}  ${String(Math.round(l.strengthScore)).padStart(3)}   ${l.name}${l.playhqGradeName ? ` (${l.playhqGradeName})` : ''}`)
  }

  h('LOW CONFIDENCE / REVIEW')
  const low = strengths.filter(l => l.needsStrengthReview || l.strengthConfidence < 0.4)
  console.log(`${low.length} leagues`)
  for (const l of low) console.log(`  • ${l.name} — conf ${l.strengthConfidence.toFixed(2)}`)

  h('COVERAGE')
  const total = r.registry.length
  const imported = r.registry.filter(x => x.status === 'Imported').length
  console.log(`  Associations scanned : ${total}`)
  console.log(`  Associations imported: ${imported}`)
  console.log(`  Coverage             : ${total ? ((imported / total) * 100).toFixed(1) : '0'}%`)
  console.log(`  Active A Grade leagues: ${r.activeLeagues}`)
  console.log(`  Clubs ranked          : ${r.clubsRanked}`)
  console.log(`  Orphan clubs removed  : ${r.orphanClubsRemoved}`)
  console.log(`  Strength recomputed   : ${r.strengthRecomputed}`)
  console.log(`  Club states corrected : ${r.statesFixed}`)
  const byState = new Map<string, number>()
  for (const x of r.registry) byState.set(x.state ?? '?', (byState.get(x.state ?? '?') ?? 0) + 1)
  console.log(`  Associations by state : ${[...byState.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}:${n}`).join('  ')}`)

  h('TOP 100 NATIONAL RANKINGS')
  const run = await prisma.rankingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } })
  if (run) {
    const top = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' }, take: 100, select: { rank: true, clubName: true, leagueName: true, state: true, powerRating: true } })
    for (const e of top) console.log(`  ${String(e.rank).padStart(3)}. ${e.clubName.padEnd(26)} ${(e.leagueName ?? '').padEnd(38)} ${(e.state ?? '').padEnd(4)} ${e.powerRating.toFixed(2)}`)
  }

  h('VALIDATION')
  if (r.validation.passed) console.log('✅ PASS — no ineligible/mis-named active leagues.')
  else { console.log('❌ FAIL:'); for (const p of r.validation.problems.slice(0, 60)) console.log(`   - ${p}`) }

  await prisma.$disconnect()
  process.exit(r.validation.passed ? 0 : 2)
}

main().catch(async e => { console.error('Data audit failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
