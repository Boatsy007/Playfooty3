/**
 * Validation for Admin V3 football URL parser (pure, offline — no network).
 * Usage: tsx src/jobs/_test-url-ingest.ts
 */
import { parseResults, parseFixtures, parseLadder, type FetchedPage } from '../football/url-ingest.js'

const page = (body: string, contentType = 'text/html'): FetchedPage => ({ url: 'x', ok: true, status: 200, contentType, body })

async function main() {
  const checks: [string, boolean][] = []

  // 1) AFL score text
  const textHtml = '<div>Round 1</div><p>Geelong Amateur 12.8 (80) def Newtown &amp; Chilwell 9.10 (64)</p><p>South Barwon 15.12 (102) def Bell Post Hill 6.5 (41)</p>'
  const r1 = parseResults(page(textHtml))
  checks.push(['text: 2 results parsed', r1.rows.length === 2])
  checks.push(['text: goals/behinds/total', r1.rows[0].homeGoals === 12 && r1.rows[0].homeBehinds === 8 && r1.rows[0].homePoints === 80])
  checks.push(['text: away total 64', r1.rows[0].awayPoints === 64])
  checks.push(['text: names', r1.rows[0].homeName === 'Geelong Amateur' && r1.rows[0].awayName.includes('Newtown')])
  checks.push(['text: strategy html-text', r1.strategy === 'html-text'])

  // 2) __NEXT_DATA__ JSON results
  const nd = { props: { pageProps: { games: [{ homeTeam: { name: 'A FC' }, awayTeam: { name: 'B FC' }, homeScore: 90, awayScore: 60, round: 'Round 2' }] } } }
  const ndHtml = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nd)}</script></body></html>`
  const r2 = parseResults(page(ndHtml))
  checks.push(['nextdata: 1 result', r2.rows.length === 1 && r2.rows[0].homeName === 'A FC' && r2.rows[0].homePoints === 90])
  checks.push(['nextdata: strategy', r2.strategy === '__NEXT_DATA__'])

  // 3) JSON fixtures
  const jf = JSON.stringify({ data: [{ home: { name: 'C FC' }, away: { name: 'D FC' }, date: '2026-04-05T14:00:00', venue: { name: 'C Oval' } }] })
  const f1 = parseFixtures(page(jf, 'application/json'))
  checks.push(['json fixtures: 1 row + venue', f1.rows.length === 1 && f1.rows[0].venue === 'C Oval'])

  // 4) JSON ladder
  const jl = JSON.stringify({ ladder: [{ team: { name: 'A FC' }, position: 1, played: 5, wins: 5, points: 20, pointsFor: 450, pointsAgainst: 210 }] })
  const l1 = parseLadder(page(jl, 'application/json'))
  checks.push(['json ladder: 1 row', l1.rows.length === 1 && l1.rows[0].points === 20 && l1.rows[0].position === 1])

  // 5) Empty page → graceful, no fabrication
  const e1 = parseResults(page('<html><body>Loading…</body></html>'))
  checks.push(['empty: 0 rows + warning', e1.rows.length === 0 && e1.warnings.length > 0 && e1.confidence === 0])

  // 6) Failed fetch → warning
  const e2 = parseResults({ url: 'x', ok: false, status: 403, contentType: '', body: '', error: 'HTTP 403' })
  checks.push(['fetch fail: 0 rows + error warning', e2.rows.length === 0 && e2.warnings[0] === 'HTTP 403'])

  let failed = 0
  console.log('── URL ingestion (Admin V3) validation ──')
  for (const [n, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${n}`); if (!ok) failed++ }
  if (failed) { console.error(`\n${failed} failed`); process.exit(1) }
  console.log('\nAll checks passed.')
}
main().catch(e => { console.error(e); process.exit(1) })
