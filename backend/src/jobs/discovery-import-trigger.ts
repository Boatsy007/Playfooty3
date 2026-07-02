/**
 * CLI trigger for the discovery import (crawl → import → rank).
 * Requires the Phase-4 additive migration to have been applied.
 *
 * Usage:
 *   tsx src/jobs/discovery-import-trigger.ts --max-associations=5
 */

import { runDiscoveryImport } from './discovery-import.js'

const maxAssoc = parseInt(process.argv.find(a => a.startsWith('--max-associations='))?.split('=')[1] ?? '', 10)
const weekArg  = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]
const filterArg = process.argv.find(a => a.startsWith('--assoc-filter='))?.split('=')[1]
const assocFilter = filterArg ? filterArg.split('|').map(s => s.trim()).filter(Boolean) : undefined

runDiscoveryImport({ maxAssociations: Number.isFinite(maxAssoc) ? maxAssoc : undefined, weekLabel: weekArg, assocFilter })
  .then(r => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(r.status === 'SUCCESS' ? 0 : 1)
  })
  .catch(err => { console.error('Discovery import failed:', err); process.exit(1) })
