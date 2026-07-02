/**
 * Discovery Validation Report
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only post-import audit. Writes NOTHING. Runs in CI after an import to
 * confirm data integrity, then prints the summary the operator asked for:
 *   - counts (associations / leagues / teams / clubs)
 *   - integrity checks (duplicate clubs, missing ladder stats, failed strength,
 *     failed ladders, broken rankings)
 *   - top 20 national rankings
 *   - league strength ratings (auto / override / final / confidence)
 *   - leagues needing review
 *
 * Exit code 2 => a hard integrity failure the operator should look at before
 * proceeding to the full run.
 *
 * Usage: tsx src/jobs/discovery-report.ts
 */

import { prisma } from '../db/client.js'

const SEASON = '2026'
const GRADE  = 'A Grade'

function line(label: string, value: unknown) { console.log(`${label.padEnd(28)} ${value}`) }

async function main() {
  console.log('\n═══ DISCOVERY VALIDATION REPORT ═══\n')

  // ── Counts ────────────────────────────────────────────────────────────────
  const associations = await prisma.association.count()
  const associationsWithLeagues = await prisma.association.count({ where: { leagues: { some: {} } } })
  const leagues = await prisma.league.findMany({
    where: { autoDiscovered: true },
    select: {
      id: true, name: true, needsStrengthReview: true, syncError: true,
      automaticStrengthRating: true, manualStrengthOverride: true,
      finalStrengthRating: true, strengthConfidence: true, strengthScore: true,
      _count: { select: { clubSeasons: true } },
    },
  })
  const clubs = await prisma.club.count()
  const clubSeasons = await prisma.clubLeagueSeason.count({ where: { season: SEASON, grade: GRADE } })

  line('Associations scanned', associations)
  line('Associations imported', associationsWithLeagues)
  line('Leagues imported (auto)', leagues.length)
  line('Team rows (club-seasons)', clubSeasons)
  line('Clubs total', clubs)

  // ── Integrity checks ───────────────────────────────────────────────────────
  const problems: string[] = []

  // Duplicate clubs — same normalised name mapping to >1 club id
  const allClubs = await prisma.club.findMany({ select: { id: true, name: true, slug: true } })
  const byName = new Map<string, string[]>()
  for (const c of allClubs) {
    const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
    byName.set(key, [...(byName.get(key) ?? []), c.slug])
  }
  const dupes = [...byName.entries()].filter(([, ids]) => ids.length > 1)
  line('Duplicate club risks', dupes.length)
  for (const [name, slugs] of dupes.slice(0, 20)) console.log(`   ⚠ "${name}": ${slugs.join(', ')}`)
  if (dupes.length > 0) problems.push(`${dupes.length} duplicate-club risks`)

  // Missing ladder stats — club-seasons with no games played
  const emptyStats = await prisma.clubLeagueSeason.count({ where: { season: SEASON, grade: GRADE, played: 0 } })
  line('Club-seasons w/ 0 played', emptyStats)

  // Missing goal data — goalsFor and goalsAgainst both zero despite games played
  const noGoals = await prisma.clubLeagueSeason.count({ where: { season: SEASON, grade: GRADE, played: { gt: 0 }, goalsFor: 0, goalsAgainst: 0 } })
  line('Club-seasons missing goals', noGoals)

  // Failed ladders — auto leagues that recorded a sync error or have no teams
  const failedLadders = leagues.filter(l => l.syncError || l._count.clubSeasons === 0)
  line('Failed ladders', failedLadders.length)
  for (const l of failedLadders) console.log(`   ⚠ ${l.name}: ${l.syncError ?? 'no teams on ladder'}`)
  if (failedLadders.length > 0) problems.push(`${failedLadders.length} failed ladders`)

  // Failed strength calcs — non-finite / out-of-range final rating
  const badStrength = leagues.filter(l =>
    !Number.isFinite(l.finalStrengthRating) || l.finalStrengthRating < 1 || l.finalStrengthRating > 5 ||
    !Number.isFinite(l.strengthConfidence) || l.strengthConfidence < 0 || l.strengthConfidence > 1)
  line('Failed strength calcs', badStrength.length)
  for (const l of badStrength) console.log(`   ⚠ ${l.name}: final=${l.finalStrengthRating} conf=${l.strengthConfidence}`)
  if (badStrength.length > 0) problems.push(`${badStrength.length} bad strength calcs`)

  // ── Rankings ────────────────────────────────────────────────────────────────
  const lastRun = await prisma.rankingRun.findFirst({ orderBy: { createdAt: 'desc' } })
  if (!lastRun) {
    problems.push('no ranking run found')
    line('Last ranking run', 'NONE')
  } else {
    line('Last ranking run', `${lastRun.weekLabel} (${lastRun.status}, ${lastRun.clubCount} clubs)`)
    if (lastRun.status !== 'COMPLETED') problems.push(`ranking run status ${lastRun.status}`)

    const entries = await prisma.rankingEntry.findMany({
      where: { runId: lastRun.id }, orderBy: { rank: 'asc' }, take: 20,
      select: { rank: true, clubName: true, leagueName: true, state: true, powerRating: true },
    })
    // Broken rankings — duplicate ranks or non-contiguous top block
    const allRanks = await prisma.rankingEntry.findMany({ where: { runId: lastRun.id }, select: { rank: true }, orderBy: { rank: 'asc' } })
    const rankSet = new Set(allRanks.map(r => r.rank))
    if (rankSet.size !== allRanks.length) problems.push('duplicate ranks in ranking run')
    line('Ranked clubs', allRanks.length)

    console.log('\n─── TOP 20 NATIONAL RANKINGS ───')
    for (const e of entries) {
      console.log(`  ${String(e.rank).padStart(2)}. ${e.clubName.padEnd(28)} ${(e.leagueName ?? '').padEnd(30)} ${e.state.padEnd(4)} ${e.powerRating.toFixed(2)}`)
    }
  }

  // ── League strength ratings ─────────────────────────────────────────────────
  console.log('\n─── LEAGUE STRENGTH RATINGS ───')
  console.log('  auto  override  final  conf   score   league')
  for (const l of [...leagues].sort((a, b) => b.finalStrengthRating - a.finalStrengthRating)) {
    const ov = l.manualStrengthOverride == null ? '  -  ' : l.manualStrengthOverride.toFixed(1)
    console.log(`  ${l.automaticStrengthRating.toFixed(1)}   ${ov}    ${l.finalStrengthRating.toFixed(1)}   ${l.strengthConfidence.toFixed(2)}  ${l.strengthScore.toFixed(0).padStart(3)}    ${l.name}`)
  }

  // ── Needs review ─────────────────────────────────────────────────────────────
  const review = leagues.filter(l => l.needsStrengthReview || l.strengthConfidence < 0.4)
  console.log('\n─── LEAGUES NEEDING REVIEW ───')
  if (review.length === 0) console.log('  (none)')
  for (const l of review) console.log(`  • ${l.name} — conf ${l.strengthConfidence.toFixed(2)}${l.needsStrengthReview ? ' [flagged]' : ' [low confidence]'}`)

  // ── Verdict ──────────────────────────────────────────────────────────────────
  console.log('\n═══ VERDICT ═══')
  if (problems.length === 0) {
    console.log('✅ PASS — no hard integrity failures detected.')
    process.exit(0)
  } else {
    console.log('❌ ISSUES DETECTED:')
    for (const p of problems) console.log(`   - ${p}`)
    process.exit(2)
  }
}

main().catch(err => { console.error('Report failed:', err); process.exit(1) })
