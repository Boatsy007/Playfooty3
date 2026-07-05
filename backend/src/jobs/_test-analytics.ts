/**
 * Validation script for the Phase B11 analytics engine.
 *
 * Pure checks (no DB writes): event catalogue, privacy helpers (device/browser,
 * anonymous visitor id, referrer host, PII-safe), and that the Prisma client
 * exposes every new model.
 *
 * Usage: tsx src/jobs/_test-analytics.ts
 */

import { prisma } from '../db/client.js'
import { EVENT_TYPES, VALID_EVENTS, deviceType, browserFamily, anonVisitorId, referrerHost, normalizeTerm } from '../analytics/types.js'

async function main() {
  const checks: [string, boolean][] = []

  // Event catalogue covers the brief.
  for (const t of ['CLUB_VIEW', 'LEAGUE_VIEW', 'ARTICLE_VIEW', 'RANKINGS_VIEW', 'SEARCH', 'CLUB_SEARCH', 'LEAGUE_SEARCH', 'STATISTICS_VIEW', 'CHAMPIONSHIP_VIEW', 'SPONSOR_CLICK', 'EXTERNAL_LINK_CLICK', 'CLAIM_CLUB_CTA', 'CLAIM_LEAGUE_CTA']) {
    checks.push([`event ${t} present`, VALID_EVENTS.has(t)])
  }
  checks.push(['unknown event rejected', !VALID_EVENTS.has('PASSWORD_STOLEN')])
  checks.push(['catalogue non-empty', EVENT_TYPES.length >= 13])

  // Device / browser detection (coarse).
  checks.push(['iphone → MOBILE', deviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile') === 'MOBILE'])
  checks.push(['ipad → TABLET', deviceType('Mozilla/5.0 (iPad; CPU OS 17_0) Safari') === 'TABLET'])
  checks.push(['bot → BOT', deviceType('Googlebot/2.1') === 'BOT'])
  checks.push(['desktop chrome', deviceType('Mozilla/5.0 (Windows NT 10.0) Chrome/120') === 'DESKTOP' && browserFamily('Chrome/120') === 'Chrome'])

  // Privacy: visitor id is anonymous + never contains raw IP.
  const vid = anonVisitorId(undefined, '203.0.113.9', 'Mozilla/5.0')
  checks.push(['visitor id derived', !!vid])
  checks.push(['visitor id hides raw IP', !!vid && !vid.includes('203.0.113.9')])
  checks.push(['client id preferred', anonVisitorId('client-abc', '1.2.3.4', 'ua') === 'client-abc'])
  checks.push(['no ip/ua → null visitor', anonVisitorId(undefined, undefined, undefined) === null])

  // Referrer reduced to host only.
  checks.push(['referrer → host', referrerHost('https://google.com/search?q=secret') === 'google.com'])
  checks.push(['normalizeTerm', normalizeTerm('Dubbo  Netball!') === 'dubbo netball'])

  // Prisma models present
  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['analyticsEvent', 'searchQuery', 'entityPopularity', 'searchTermStat', 'analyticsDaily', 'analyticsRun']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B11 analytics validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
