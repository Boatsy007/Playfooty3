/**
 * CLI trigger for the PlayHQ discovery preview (no DB writes).
 *
 * Usage:
 *   tsx src/discovery/discovery-trigger.ts
 *   tsx src/discovery/discovery-trigger.ts --max-pages=40 --drilldown=3
 *
 * Writes discovery-preview.json in the current directory.
 */

import { runDiscoveryPreview } from './playhq-discovery.js'

const maxPages  = parseInt(process.argv.find(a => a.startsWith('--max-pages='))?.split('=')[1] ?? '', 10)
const drilldown = parseInt(process.argv.find(a => a.startsWith('--drilldown='))?.split('=')[1] ?? '', 10)
const deepSlug  = process.argv.find(a => a.startsWith('--assoc-slug='))?.split('=')[1]

runDiscoveryPreview({
  maxPages:       Number.isFinite(maxPages)  ? maxPages  : undefined,
  drilldownLimit: Number.isFinite(drilldown) ? drilldown : undefined,
  deepSlug:       deepSlug || undefined,
})
  .then(p => {
    console.log('\n=== DISCOVERY PREVIEW ===')
    console.log(`Associations found: ${p.associationCount}`)
    console.log(`Pages crawled:      ${p.pagesCrawled}`)
    console.log('First 20 associations:')
    for (const a of p.associations.slice(0, 20)) {
      console.log(`  - ${a.name}  [${a.state ?? '?'}]  ${a.url}`)
    }
    console.log('\nDrilldown samples:')
    for (const d of p.drilldowns) {
      console.log(`  • ${d.association}`)
      console.log(`      seasons: ${d.seasonsFound.join(', ') || '(none found)'}`)
      console.log(`      A-Grade match: ${d.aGradeMatch ? `${d.aGradeMatch.name} (${d.aGradeMatch.matchedRule})` : '(none)'}`)
      console.log(`      grade names: ${d.gradeNamesFound.slice(0, 8).join(' | ') || '(none)'}`)
      console.log(`      api urls: ${d.capturedApiUrls.length}`)
    }
    console.log('\nFull preview written to discovery-preview.json')
    process.exit(0)
  })
  .catch(err => { console.error('Discovery failed:', err); process.exit(1) })
