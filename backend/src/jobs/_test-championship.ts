/**
 * Validation script for the Phase B7 championship engine.
 *
 * Pure checks (no DB writes): qualification selection logic (top-ranking +
 * league-champion + dedupe + qualified/reserve split) behaves correctly on a
 * synthetic ranked list, and the Prisma client exposes every new model.
 *
 * Usage: tsx src/jobs/_test-championship.ts
 */

import { prisma } from '../db/client.js'

interface R { clubId: string; leagueId: string; rank: number }

// Mirror the core selection used by qualification.ts.
function select(ranked: R[], rules: { method: string; quota?: number }[], maxTeams: number) {
  const picked = new Map<string, string>()
  for (const rule of rules) {
    let pool: R[] = []
    if (rule.method === 'TOP_RANKING') pool = ranked.filter(r => !picked.has(r.clubId))
    else if (rule.method === 'LEAGUE_CHAMPION') {
      const best = new Map<string, R>()
      for (const r of ranked) { const c = best.get(r.leagueId); if (!c || r.rank < c.rank) best.set(r.leagueId, r) }
      pool = [...best.values()].filter(r => !picked.has(r.clubId)).sort((a, b) => a.rank - b.rank)
    }
    const quota = rule.quota ?? pool.length
    for (const r of pool.slice(0, quota)) picked.set(r.clubId, rule.method)
  }
  const ordered = [...picked.keys()].map(id => ranked.find(r => r.clubId === id)!).sort((a, b) => a.rank - b.rank)
  return { qualified: ordered.slice(0, maxTeams), reserves: ordered.slice(maxTeams), byMethod: picked }
}

async function main() {
  const checks: [string, boolean][] = []

  const ranked: R[] = [
    { clubId: 'a', leagueId: 'L1', rank: 1 }, { clubId: 'b', leagueId: 'L1', rank: 2 },
    { clubId: 'c', leagueId: 'L2', rank: 3 }, { clubId: 'd', leagueId: 'L2', rank: 4 },
    { clubId: 'e', leagueId: 'L3', rank: 5 }, { clubId: 'f', leagueId: 'L3', rank: 6 },
  ]

  // League champions only: one per league = a, c, e
  const lc = select(ranked, [{ method: 'LEAGUE_CHAMPION' }], 16)
  checks.push(['league champions = 3', lc.qualified.length === 3])
  checks.push(['league champs are a,c,e', lc.qualified.map(r => r.clubId).sort().join('') === 'ace'])

  // League champion (quota 2) then top ranking fills the rest to maxTeams 4
  const mixed = select(ranked, [{ method: 'LEAGUE_CHAMPION', quota: 2 }, { method: 'TOP_RANKING' }], 4)
  checks.push(['no duplicate picks', new Set(mixed.qualified.concat(mixed.reserves).map(r => r.clubId)).size === mixed.qualified.length + mixed.reserves.length])
  checks.push(['qualified capped at maxTeams', mixed.qualified.length === 4])
  checks.push(['qualified ordered by rank', mixed.qualified[0].rank <= mixed.qualified[1].rank])

  // Top ranking only, maxTeams 4 → 4 qualified, 2 reserve
  const top = select(ranked, [{ method: 'TOP_RANKING' }], 4)
  checks.push(['top-ranking qualified 4', top.qualified.length === 4])
  checks.push(['top-ranking reserves 2', top.reserves.length === 2])

  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['championship', 'qualificationRule', 'qualificationSnapshot', 'qualifiedClub', 'championshipInvitation', 'venue', 'championshipTeam', 'championshipPool', 'championshipFixture', 'championshipLadder', 'championshipHistory']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B7 championship validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
