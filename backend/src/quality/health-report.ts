/**
 * Data-health report (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only aggregation of the database's cleanliness. Produces headline counts
 * plus small sample lists for each problem class, and stores a DataHealthSnapshot
 * so the trend of data quality over time is visible. It mutates nothing.
 */

import { prisma } from '../db/client.js'
import { detectDuplicates } from './duplicate-detection.js'
import { logger } from '../utils/logger.js'

const STALE_DAYS = 21
const AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'])

export interface HealthReport {
  generatedAt: string
  counts: Record<string, number>
  samples: Record<string, { id: string; name: string }[]>
}

const sample = <T extends { id: string; name: string }>(rows: T[], n = 10) => rows.slice(0, n).map(r => ({ id: r.id, name: r.name }))

export async function generateHealthReport(opts: { store?: boolean; generatedBy?: string } = {}): Promise<HealthReport> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

  const [
    missingLogos, orphanClubs, staleLeagues, failedSyncs, lowConfidenceLeagues, needsManualReview, leaguesWithState, leaguesNeedingStrength,
  ] = await Promise.all([
    prisma.club.findMany({ where: { isActive: true, archivedAt: null, approvalStatus: 'APPROVED', OR: [{ logoUrl: null }, { logoUrl: '' }] }, select: { id: true, name: true } }),
    prisma.club.findMany({ where: { isActive: true, archivedAt: null, leagueSeasons: { none: {} } }, select: { id: true, name: true } }),
    prisma.league.findMany({ where: { isActive: true, enabled: true, archivedAt: null, AND: [{ OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] }, { OR: [{ lastManualUpdateAt: null }, { lastManualUpdateAt: { lt: cutoff } }] }] }, select: { id: true, name: true } }),
    prisma.league.findMany({ where: { isActive: true, archivedAt: null, syncError: { not: null } }, select: { id: true, name: true } }),
    prisma.league.findMany({ where: { isActive: true, archivedAt: null, dataConfidence: { lt: 0.4 } }, select: { id: true, name: true } }),
    prisma.league.findMany({ where: { isActive: true, archivedAt: null, OR: [{ needsStrengthReview: true }, { status: 'NEEDS_REVIEW' }, { approvalStatus: 'PENDING' }] }, select: { id: true, name: true } }),
    prisma.league.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true, state: { select: { code: true } } } }),
    prisma.club.findMany({ where: { isActive: true, archivedAt: null, approvalStatus: 'PENDING' }, select: { id: true, name: true } }),
  ])

  // Missing / invalid league state (placeholder state code that isn't a real AU state).
  const missingLeagueState = leaguesWithState.filter(l => !l.state || !AU_STATES.has(l.state.code))

  // Clubs with no league (same as orphans, but reported explicitly per the brief).
  const missingClubLeague = orphanClubs

  // Ineligible / review leagues already validated (if the validator has run).
  const eligibilityFlags = await prisma.leagueEligibility.findMany({ where: { verdict: { not: 'ELIGIBLE' } }, select: { leagueId: true, leagueName: true } })

  // Duplicate risk (read-only detection; does not touch the review queue here).
  const dupes = await detectDuplicates({ raiseReviews: false })
  const duplicateRisks = dupes.duplicateClubs.length + dupes.duplicateLeagues.length + dupes.duplicateLeagueSources.length

  const pendingReviews = await prisma.reviewItem.count({ where: { status: 'PENDING' } })

  const report: HealthReport = {
    generatedAt: new Date().toISOString(),
    counts: {
      missingLogos: missingLogos.length,
      missingLeagueState: missingLeagueState.length,
      missingClubLeague: missingClubLeague.length,
      orphanTeams: orphanClubs.length,
      staleLeagues: staleLeagues.length,
      failedSyncs: failedSyncs.length,
      lowConfidenceImports: lowConfidenceLeagues.length,
      duplicateRisks,
      leaguesNeedingManualReview: needsManualReview.length,
      eligibilityFlagged: eligibilityFlags.length,
      clubsPendingApproval: leaguesNeedingStrength.length,
      pendingReviewItems: pendingReviews,
    },
    samples: {
      missingLogos: sample(missingLogos),
      missingLeagueState: missingLeagueState.map(l => ({ id: l.id, name: l.name })).slice(0, 10),
      orphanTeams: sample(orphanClubs),
      staleLeagues: sample(staleLeagues),
      failedSyncs: sample(failedSyncs),
      lowConfidenceImports: sample(lowConfidenceLeagues),
      leaguesNeedingManualReview: sample(needsManualReview),
      eligibilityFlagged: eligibilityFlags.map(e => ({ id: e.leagueId, name: e.leagueName })).slice(0, 10),
    },
  }

  if (opts.store) {
    await prisma.dataHealthSnapshot.create({ data: { counts: JSON.stringify(report.counts), report: JSON.stringify(report), generatedBy: opts.generatedBy ?? 'SYSTEM' } })
  }
  logger.info('Data health report generated', report.counts)
  return report
}
