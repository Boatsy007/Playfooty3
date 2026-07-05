/**
 * Championship history (Phase B7) — permanent, immutable outcomes.
 * ─────────────────────────────────────────────────────────────────────────────
 * Records a completed championship's champion / runner-up / placings / awards +
 * a frozen snapshot of who qualified. Never overwrites an existing record — a
 * championship's history is written once (immutability). Corrections must be a
 * new championship or an explicit admin-logged action, not a silent rewrite.
 */

import { prisma } from '../db/client.js'
import { logQualityAction } from '../quality/audit.js'

export interface OutcomeInput {
  championClubId?: string; championName?: string
  runnerUpClubId?: string; runnerUpName?: string
  thirdClubId?: string; thirdName?: string
  finalRankings?: unknown; awards?: unknown
}

export async function recordChampionshipOutcome(championshipId: string, outcome: OutcomeInput, opts: { performedBy?: string } = {}): Promise<{ ok: boolean; status: number; error?: string; id?: string }> {
  const champ = await prisma.championship.findUnique({ where: { id: championshipId } })
  if (!champ) return { ok: false, status: 404, error: 'championship not found' }

  const existing = await prisma.championshipHistory.findUnique({ where: { championshipId } })
  if (existing) return { ok: false, status: 409, error: 'championship history already recorded — history is immutable' }

  const qualified = await prisma.qualifiedClub.findMany({ where: { championshipId, status: { in: ['QUALIFIED', 'REPLACEMENT'] } }, orderBy: { order: 'asc' } })
  const row = await prisma.championshipHistory.create({
    data: {
      championshipId, championshipName: champ.name, year: champ.year,
      championClubId: outcome.championClubId ?? null, championName: outcome.championName ?? null,
      runnerUpClubId: outcome.runnerUpClubId ?? null, runnerUpName: outcome.runnerUpName ?? null,
      thirdClubId: outcome.thirdClubId ?? null, thirdName: outcome.thirdName ?? null,
      finalRankings: outcome.finalRankings ? JSON.stringify(outcome.finalRankings) : null,
      awards: outcome.awards ? JSON.stringify(outcome.awards) : null,
      qualifiedClubs: JSON.stringify(qualified.map(q => ({ clubId: q.clubId, clubName: q.clubName, method: q.method, snapshotRank: q.snapshotRank }))),
    },
  })
  // Mark the championship complete (status change is allowed; history row is immutable).
  await prisma.championship.update({ where: { id: championshipId }, data: { status: 'COMPLETE' } })
  await logQualityAction('RECORD_CHAMPIONSHIP_OUTCOME', 'Championship', championshipId, { champion: outcome.championName, runnerUp: outcome.runnerUpName }, { reason: 'championship outcome recorded', performedBy: opts.performedBy })
  return { ok: true, status: 201, id: row.id }
}
