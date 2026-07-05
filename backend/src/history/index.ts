/**
 * Historical Rankings & Records Engine orchestrator (Phase B6).
 * ─────────────────────────────────────────────────────────────────────────────
 * Archives the latest ranking run (immutable), then rebuilds the derived club/
 * league histories and the record book. Archiving never overwrites; the derived
 * caches are safe to recompute. The only writes are into the B6 tables.
 */

import { archiveRankingRun, type ArchiveReport } from './archive.js'
import { computeClubHistories } from './club-history.js'
import { computeLeagueHistories } from './league-history.js'
import { computeRecordBook } from './records.js'
import { logQualityAction } from '../quality/audit.js'
import { logger } from '../utils/logger.js'

export interface HistoryEngineReport {
  archive: ArchiveReport
  clubHistories: number
  leagueHistories: number
  records: number
  warnings: string[]
}

export async function runHistoryEngine(opts: { runId?: string } = {}): Promise<HistoryEngineReport> {
  const report: HistoryEngineReport = { archive: { weekLabel: null, season: null, clubsArchived: 0, leaguesArchived: 0, skipped: false }, clubHistories: 0, leagueHistories: 0, records: 0, warnings: [] }

  try { report.archive = await archiveRankingRun(opts.runId) } catch (e) { report.warnings.push(`archive failed: ${String(e)}`) }
  try { report.clubHistories = (await computeClubHistories()).clubs } catch (e) { report.warnings.push(`club histories failed: ${String(e)}`) }
  try { report.leagueHistories = (await computeLeagueHistories()).leagues } catch (e) { report.warnings.push(`league histories failed: ${String(e)}`) }
  try { report.records = (await computeRecordBook()).records } catch (e) { report.warnings.push(`record book failed: ${String(e)}`) }

  await logQualityAction('RUN_HISTORY_ENGINE', 'System', null, { week: report.archive.weekLabel, archived: report.archive.clubsArchived, records: report.records }, { reason: 'history engine run', performedBy: 'SYSTEM' })
  logger.info('History engine run complete', { week: report.archive.weekLabel, records: report.records })
  return report
}
