/**
 * Validation script for the Phase B3 newsroom.
 *
 * Pure checks (no DB writes): the trigger engine produces correct, deduped
 * signals from a synthetic analysis, and the Prisma client exposes every new
 * model. Safe to run anywhere — the assertions below never touch the database.
 *
 * Usage: tsx src/jobs/_test-newsroom.ts
 */

import { prisma } from '../db/client.js'
import { detectSignals } from '../newsroom/detector.js'
import type { WeeklyAnalysis } from '../newsroom/analysis.js'

function synthetic(): WeeklyAnalysis {
  const club = (id: string, name: string, rank: number, prev: number | null) => ({
    clubId: id, clubName: name, leagueId: 'L1', leagueName: 'Test League - A Grade', state: 'VIC',
    rank, previousRank: prev, rankMovement: prev == null ? 0 : prev - rank, powerRating: 90 - rank,
    form: ['W', 'W', 'L', 'W'], wins: 3, played: 4,
  })
  return {
    weekLabel: '2026-W10', season: '2026', runId: 'RUN1', previousRunId: 'RUN0', hasHistory: true, totalRanked: 3,
    leader: club('c1', 'Alpha NC', 1, 2), previousLeader: { clubId: 'c9', clubName: 'Old Leader' }, newNumberOne: true,
    // risers sorted by rankMovement desc, as analyseWeek produces
    risers: [club('c2', 'Beta NC', 5, 12), club('c1', 'Alpha NC', 1, 2)],
    fallers: [club('c3', 'Gamma NC', 20, 8)],
    crossings: [{ clubId: 'c2', clubName: 'Beta NC', leagueName: 'Test League', state: 'VIC', rank: 5, previousRank: 12, threshold: 10, direction: 'ENTER' }],
    newEntrants: [],
    historicBests: [{ clubId: 'c1', clubName: 'Alpha NC', rank: 1, previousBest: 3, weeksTracked: 8 }],
    undefeated: [{ clubId: 'c1', clubName: 'Alpha NC', leagueId: 'L1', leagueName: 'Test League', played: 6, wins: 6, losses: 0, draws: 0, goalsFor: 300, goalsAgainst: 180, percentage: 166, points: 24, position: 1, isPremier: false }],
    highestScoring: [{ clubId: 'c1', clubName: 'Alpha NC', leagueId: 'L1', leagueName: 'Test League', played: 6, wins: 6, losses: 0, draws: 0, goalsFor: 300, goalsAgainst: 180, percentage: 166, points: 24, position: 1, isPremier: false }],
    bestDefence: [{ clubId: 'c3', clubName: 'Gamma NC', leagueId: 'L1', leagueName: 'Test League', played: 6, wins: 2, losses: 4, draws: 0, goalsFor: 150, goalsAgainst: 120, percentage: 125, points: 8, position: 6, isPremier: false }],
    woodenSpoon: [],
    closestRace: [{ leagueId: 'L1', leagueName: 'Test League', topTwoPointGap: 2, leader: 'Alpha NC', chaser: 'Beta NC' }],
    leagueStrength: [{ leagueId: 'L1', leagueName: 'Test League', state: 'VIC', strengthScore: 80, strengthTier: 4, rankedClubs: 3, previousScore: 70, delta: 10, highestEver: true }],
    largestMargins: [{ leagueId: 'L1', leagueName: 'Test League', round: 5, homeClub: 'Alpha NC', awayClub: 'Gamma NC', homeGoals: 70, awayGoals: 30, margin: 40 }],
    lowestScoringRounds: [],
  }
}

async function main() {
  const checks: [string, boolean][] = []
  const a = synthetic()
  const signals = detectSignals(a)
  const kinds = new Set(signals.map(s => s.kind))

  checks.push(['detects NEW_NUMBER_ONE', kinds.has('NEW_NUMBER_ONE')])
  checks.push(['detects BIGGEST_RISE', kinds.has('BIGGEST_RISE')])
  checks.push(['detects TOP10_ENTRY', kinds.has('TOP10_ENTRY')])
  checks.push(['detects HISTORIC_BEST', kinds.has('HISTORIC_BEST')])
  checks.push(['detects UNDEFEATED', kinds.has('UNDEFEATED')])
  checks.push(['detects MOST_IMPROVED_LEAGUE', kinds.has('MOST_IMPROVED_LEAGUE')])
  checks.push(['detects CLOSEST_RACE', kinds.has('CLOSEST_RACE')])
  checks.push(['detects LARGEST_MARGIN', kinds.has('LARGEST_MARGIN')])
  checks.push(['all signals have dedupeKey', signals.every(s => s.dedupeKey.length > 0)])
  checks.push(['dedupeKeys unique', new Set(signals.map(s => s.dedupeKey)).size === signals.length])
  checks.push(['all signals carry sourceData', signals.every(s => s.sourceData !== undefined)])

  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['newsSignal', 'leagueStrengthSnapshot', 'clubTrend', 'editorialCalendarSlot', 'articleLink', 'searchDoc']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B3 newsroom validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log(`\nAll checks passed. (${signals.length} signals detected from synthetic analysis)`)
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
