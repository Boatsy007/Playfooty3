/**
 * Data Quality & Integrity Engine orchestrator (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the full suite: the existing data-quality sweep, duplicate detection,
 * league-eligibility validation and the data-health report. Everything is
 * additive and read-mostly — the only writes are ReviewItems, LeagueEligibility,
 * DataHealthSnapshot and audit logs. No data is mutated or deleted.
 */

import { sweepDataQuality, type SweepReport } from '../jobs/data-quality.js'
import { detectDuplicates, type DuplicateReport } from './duplicate-detection.js'
import { validateAllLeagues, type EligibilitySweepReport } from './league-eligibility.js'
import { generateHealthReport, type HealthReport } from './health-report.js'
import { logQualityAction } from './audit.js'
import { logger } from '../utils/logger.js'

export interface QualityRunOptions {
  raiseReviews?: boolean  // populate the review queue (default true)
  storeHealth?: boolean   // persist a DataHealthSnapshot (default true)
  performedBy?: string
}

export interface QualityRunReport {
  ranAt: string
  sweep: SweepReport
  duplicates: Pick<DuplicateReport, 'raised' | 'skippedExisting'> & { duplicateClubs: number; sameClubMultiLeague: number; duplicateLeagues: number; duplicateLeagueSources: number }
  eligibility: Pick<EligibilitySweepReport, 'checked' | 'eligible' | 'review' | 'ineligible'>
  health: HealthReport['counts']
}

export async function runQualityEngine(opts: QualityRunOptions = {}): Promise<QualityRunReport> {
  const { raiseReviews = true, storeHealth = true, performedBy = 'SYSTEM' } = opts

  const sweep = await sweepDataQuality()
  const dup = await detectDuplicates({ raiseReviews })
  const elig = await validateAllLeagues({ raiseReview: raiseReviews })
  const health = await generateHealthReport({ store: storeHealth, generatedBy: performedBy })

  const report: QualityRunReport = {
    ranAt: new Date().toISOString(),
    sweep,
    duplicates: {
      raised: dup.raised, skippedExisting: dup.skippedExisting,
      duplicateClubs: dup.duplicateClubs.length, sameClubMultiLeague: dup.sameClubMultiLeague.length,
      duplicateLeagues: dup.duplicateLeagues.length, duplicateLeagueSources: dup.duplicateLeagueSources.length,
    },
    eligibility: { checked: elig.checked, eligible: elig.eligible, review: elig.review, ineligible: elig.ineligible },
    health: health.counts,
  }

  await logQualityAction('RUN_QUALITY_ENGINE', 'System', null, report.duplicates, { reason: 'full quality engine run', performedBy })
  logger.info('Quality engine run complete', { duplicates: report.duplicates, eligibility: report.eligibility })
  return report
}
