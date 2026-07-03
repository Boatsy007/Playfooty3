/**
 * PlayHQ coverage diagnostic (read-only, no DB writes)
 * ─────────────────────────────────────────────────────────────────────────────
 * Crawls the association directory and, for a sample of associations, records
 * WHERE the A-Grade resolve funnel loses coverage (season → grades → women's
 * senior → A-grade match → ladder). Prints an outcome histogram and per-assoc
 * detail so we can target the biggest lever before rewriting the resolver.
 *
 * Usage: tsx src/discovery/discovery-diagnostic.ts [--max=40] [--filter=hampden,ballarat]
 */
import { diagnoseAssociations } from './playhq-discovery.js'

async function main() {
  const maxArg    = parseInt(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] ?? '', 10)
  const filterArg = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1]
  const maxAssociations = Number.isFinite(maxArg) ? maxArg : 40
  const assocFilter = filterArg ? filterArg.split(',').map(s => s.trim()).filter(Boolean) : undefined

  console.log(`\n═══ PLAYHQ COVERAGE DIAGNOSTIC (sample of ${maxAssociations}) ═══`)
  const diags = await diagnoseAssociations({ maxAssociations, assocFilter })

  const hist = new Map<string, number>()
  for (const d of diags) hist.set(d.outcome, (hist.get(d.outcome) ?? 0) + 1)
  console.log(`\nAssociations diagnosed: ${diags.length}`)
  console.log('\n── OUTCOME HISTOGRAM ──')
  for (const [k, n] of [...hist.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`)

  const imported = hist.get('IMPORTED') ?? 0
  console.log(`\nResolvable A-Grade coverage in sample: ${imported}/${diags.length} (${((imported / Math.max(1, diags.length)) * 100).toFixed(1)}%)`)

  // Detail for the failures — this is what tells us what to fix.
  const groups = ['NO_SEASON', 'NO_GRADES', 'NO_WOMENS_SENIOR', 'NO_AGRADE_MATCH', 'LADDER_UNRESOLVED', 'ERROR']
  for (const g of groups) {
    const rows = diags.filter(d => d.outcome === g)
    if (rows.length === 0) continue
    console.log(`\n── ${g} (${rows.length}) ──`)
    for (const d of rows.slice(0, 40)) {
      console.log(`  • ${d.association}`)
      console.log(`      seasons=[${d.seasonOptions.join(', ') || '—'}] picked=${d.seasonPicked ?? '—'} grades=${d.gradeCount} womensSenior=${d.womensSenior} aGradeMatch=${d.aGradeMatches}`)
      if (d.gradeSample.length) console.log(`      gradeSample: ${d.gradeSample.join(' | ')}`)
    }
  }

  // Winners (sanity check the matcher is picking sensible grades)
  const wins = diags.filter(d => d.outcome === 'IMPORTED')
  if (wins.length) {
    console.log(`\n── IMPORTED (${wins.length}) — SELECTED GRADE (audit) ──`)
    for (const d of wins.slice(0, 60)) console.log(`  ✓ ${d.association.padEnd(38)} → "${d.selectedGrade}"  [${d.matchedRule}]  ${d.ladderTeams} teams  (${d.seasonPicked})`)
  }
  console.log('\n═══ END DIAGNOSTIC ═══')
  process.exit(0)
}
main().catch(e => { console.error('Diagnostic failed:', e); process.exit(1) })
