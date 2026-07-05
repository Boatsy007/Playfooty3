/**
 * Weekly Update Engine (Backend Phase B1)
 * ─────────────────────────────────────────────────────────────────────────────
 * The single backend orchestrator that powers the Monday weekly update. It
 * composes the existing, proven building blocks in a safe, additive order and
 * returns one structured report:
 *
 *   1. (optional) Pre-run backup           — createBackup('NIGHTLY')
 *   2. (optional) Sync ladders from PlayHQ  — syncLeague(id) per target league
 *   3. Recalculate national rankings        — recalculateNational()
 *   4. Data-quality sweep → review queue    — sweepDataQuality()
 *   5. Article DRAFTS from real data only    — generateWeeklyDrafts()
 *   6. Audit log of the whole run            — AuditLog
 *
 * Safety guarantees (all inherited from the composed jobs, restated here):
 *   • Manual overrides always win. syncLeague runs in syncOnly mode and never
 *     touches league metadata / logo / strength override; recalculateNational
 *     respects manualStrengthOverride; generateWeeklyDrafts never overwrites an
 *     APPROVED/PUBLISHED article.
 *   • Never invents data. Every step reads real ladder / ranking rows; empty
 *     scrapes bail without mutating.
 *   • Never auto-publishes. Articles are created as DRAFT only.
 *   • Low-confidence / ambiguous data goes to the review queue (ReviewItem),
 *     it is not applied silently.
 *   • dryRun mode runs nothing destructive — it reports the plan only.
 *
 * The heavy ladder sync needs a browser (Playwright/Chromium), so it only runs
 * inside GitHub Actions via the CLI trigger + weekly-update.yml workflow. The
 * serverless admin endpoint runs the browser-free steps (recalc → sweep →
 * drafts) and can dispatch the workflow for the full browser-backed run.
 */

import { prisma }               from '../db/client.js'
import { syncLeague }           from './playhq-url-import.js'
import { recalculateNational, type RecalcReport } from './recompute-strength.js'
import { sweepDataQuality, type SweepReport }     from './data-quality.js'
import { generateWeeklyDrafts, type GenerateReport } from './generate-articles.js'
import { createBackup }         from './backup.js'
import { getISOWeekLabel }      from '../utils/week-label.js'
import { logger }               from '../utils/logger.js'

export interface WeeklyUpdateOptions {
  /** Sync a single league by id. Omit + sync:true → sync all eligible leagues. */
  leagueId?: string
  /** Re-scrape ladders from PlayHQ (browser-backed). Default false (serverless-safe). */
  sync?: boolean
  /** Take a restore-point backup before mutating anything. Default true. */
  backupFirst?: boolean
  /** Recalculate national rankings + league strength. Default true. */
  recalculate?: boolean
  /** Run the data-quality sweep (populates the review queue). Default true. */
  sweep?: boolean
  /** Generate article DRAFTS from the fresh ranking data. Default true. */
  generateDrafts?: boolean
  /** Plan only — run nothing that writes. Default false. */
  dryRun?: boolean
  /** Where the run was triggered from (audit metadata). */
  source?: string
}

export interface SyncOutcome {
  leagueId: string
  league:   string
  status:   'SUCCESS' | 'NO_DATA' | 'FAILED' | 'SKIPPED'
  clubsAdded?:    number
  clubsUpdated?:  number
  ladderRows?:    number
  reviewsRaised?: number
  error?:         string
}

export interface WeeklyUpdateReport {
  weekLabel:   string
  startedAt:   string
  finishedAt:  string
  durationMs:  number
  dryRun:      boolean
  steps:       { name: string; ran: boolean; ok: boolean; detail?: string }[]
  backup?:     { id: string; counts: Record<string, number> } | null
  sync?:       { attempted: number; ok: number; failed: number; leagues: SyncOutcome[] } | null
  recalc?:     Pick<RecalcReport, 'clubsRanked'> & { leagues: number } | null
  quality?:    SweepReport | null
  articles?:   GenerateReport | null
  warnings:    string[]
}

/** Resolve which leagues to sync (single id, or every league with a stored URL). */
async function resolveSyncTargets(leagueId?: string): Promise<{ id: string; name: string }[]> {
  if (leagueId) {
    const l = await prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true } })
    return l ? [l] : []
  }
  return prisma.league.findMany({
    where: {
      isActive: true, enabled: true, archivedAt: null,
      OR: [{ ladderUrl: { not: null } }, { sourceUrl: { not: null } }, { ladderUrlOverride: { not: null } }],
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

/** Write a single audit row summarising the whole run. Best-effort, never throws. */
async function auditRun(report: WeeklyUpdateReport, source: string) {
  try {
    const u = await prisma.adminUser.upsert({
      where:  { email: 'admin@cnca.local' },
      create: { email: 'admin@cnca.local', name: 'Admin', role: 'SUPERADMIN' },
      update: {},
    })
    await prisma.auditLog.create({
      data: {
        userId: u.id,
        action: 'WEEKLY_UPDATE',
        entityType: 'System',
        entityId: null,
        after: JSON.stringify({
          weekLabel: report.weekLabel, dryRun: report.dryRun, durationMs: report.durationMs,
          steps: report.steps, sync: report.sync ? { attempted: report.sync.attempted, ok: report.sync.ok, failed: report.sync.failed } : null,
          clubsRanked: report.recalc?.clubsRanked ?? null,
          reviews: report.quality ? (report.quality as unknown as { created?: number }).created ?? null : null,
          articles: report.articles ? { created: report.articles.created, updated: report.articles.updated } : null,
          warnings: report.warnings,
        }),
        source,
      },
    })
  } catch (e) { logger.warn('weekly-update audit failed', { detail: String(e) }) }
}

/**
 * Run the weekly update. Composable and idempotent — safe to re-run. Every step
 * is individually toggleable and failures are captured per-step rather than
 * aborting the whole run, so a flaky sync never blocks the recalc/draft steps.
 */
export async function runWeeklyUpdate(opts: WeeklyUpdateOptions = {}): Promise<WeeklyUpdateReport> {
  const {
    leagueId, sync = false, backupFirst = true,
    recalculate = true, sweep = true, generateDrafts = true,
    dryRun = false, source = 'WEEKLY_ENGINE',
  } = opts

  const startedAt = new Date()
  const weekLabel = getISOWeekLabel()
  const report: WeeklyUpdateReport = {
    weekLabel, startedAt: startedAt.toISOString(), finishedAt: startedAt.toISOString(),
    durationMs: 0, dryRun, steps: [], warnings: [],
    backup: null, sync: null, recalc: null, quality: null, articles: null,
  }

  logger.info('WeeklyUpdate: start', { weekLabel, sync, recalculate, sweep, generateDrafts, dryRun, leagueId: leagueId ?? null })

  // ── Dry run: report the plan without writing anything ──────────────────────
  if (dryRun) {
    const targets = sync ? await resolveSyncTargets(leagueId) : []
    report.steps.push({ name: 'backup', ran: false, ok: true, detail: backupFirst ? 'would take NIGHTLY backup' : 'skipped' })
    report.steps.push({ name: 'sync', ran: false, ok: true, detail: sync ? `would sync ${targets.length} league(s)` : 'skipped' })
    report.steps.push({ name: 'recalculate', ran: false, ok: true, detail: recalculate ? 'would recalculate national rankings' : 'skipped' })
    report.steps.push({ name: 'sweep', ran: false, ok: true, detail: sweep ? 'would sweep data quality → review queue' : 'skipped' })
    report.steps.push({ name: 'generateDrafts', ran: false, ok: true, detail: generateDrafts ? 'would generate article DRAFTS' : 'skipped' })
    if (sync) report.sync = { attempted: targets.length, ok: 0, failed: 0, leagues: targets.map(t => ({ leagueId: t.id, league: t.name, status: 'SKIPPED' as const })) }
    report.finishedAt = new Date().toISOString()
    report.durationMs = Date.now() - startedAt.getTime()
    return report
  }

  // ── 1. Pre-run backup (restore point) ──────────────────────────────────────
  if (backupFirst) {
    try {
      const b = await createBackup('NIGHTLY', `weekly-update ${weekLabel}`)
      report.backup = { id: b.id, counts: b.counts }
      report.steps.push({ name: 'backup', ran: true, ok: true, detail: `backup ${b.id}` })
    } catch (e) {
      report.steps.push({ name: 'backup', ran: true, ok: false, detail: String(e) })
      report.warnings.push(`backup failed: ${String(e)}`)
    }
  }

  // ── 2. Sync ladders from PlayHQ (browser-backed — only runs in Actions) ─────
  if (sync) {
    const targets = await resolveSyncTargets(leagueId)
    const leagues: SyncOutcome[] = []
    let ok = 0, failed = 0
    for (const t of targets) {
      try {
        // Defer per-league rerank — we rank once below via recalculateNational.
        const r = await syncLeague(t.id, { rerank: false })
        if (r.status === 'SUCCESS') {
          ok++
          leagues.push({ leagueId: t.id, league: t.name, status: 'SUCCESS', clubsAdded: r.clubsAdded, clubsUpdated: r.clubsUpdated, ladderRows: r.ladderRows, reviewsRaised: r.reviewsRaised })
        } else {
          failed++
          leagues.push({ leagueId: t.id, league: t.name, status: r.status, error: r.error ?? r.warnings.join('; ') })
          report.warnings.push(`sync ${t.name}: ${r.status} ${r.error ?? ''}`.trim())
        }
      } catch (e) {
        failed++
        leagues.push({ leagueId: t.id, league: t.name, status: 'FAILED', error: String(e) })
        report.warnings.push(`sync ${t.name}: ${String(e)}`)
      }
    }
    report.sync = { attempted: targets.length, ok, failed, leagues }
    report.steps.push({ name: 'sync', ran: true, ok: failed === 0, detail: `${ok}/${targets.length} synced` })
  }

  // ── 3. Recalculate national rankings + league strength ─────────────────────
  if (recalculate) {
    const locked = (await prisma.setting.findUnique({ where: { key: 'rankingsLocked' } }).catch(() => null))?.value === 'true'
    if (locked) {
      report.steps.push({ name: 'recalculate', ran: false, ok: true, detail: 'skipped — rankings locked' })
      report.warnings.push('rankings are locked — recalculation skipped')
    } else {
      try {
        const r = await recalculateNational()
        report.recalc = { clubsRanked: r.clubsRanked, leagues: r.leagues.length }
        report.steps.push({ name: 'recalculate', ran: true, ok: true, detail: `${r.clubsRanked} clubs ranked` })
      } catch (e) {
        report.steps.push({ name: 'recalculate', ran: true, ok: false, detail: String(e) })
        report.warnings.push(`recalculate failed: ${String(e)}`)
      }
    }
  }

  // ── 4. Data-quality sweep → review queue ───────────────────────────────────
  if (sweep) {
    try {
      const r = await sweepDataQuality()
      report.quality = r
      report.steps.push({ name: 'sweep', ran: true, ok: true })
    } catch (e) {
      report.steps.push({ name: 'sweep', ran: true, ok: false, detail: String(e) })
      report.warnings.push(`sweep failed: ${String(e)}`)
    }
  }

  // ── 5. Article DRAFTS from real data only (never published, never overwrites APPROVED/PUBLISHED) ─
  if (generateDrafts) {
    try {
      const r = await generateWeeklyDrafts()
      report.articles = r
      report.steps.push({ name: 'generateDrafts', ran: true, ok: true, detail: `${r.created} new, ${r.updated} updated, ${r.skipped} skipped` })
    } catch (e) {
      report.steps.push({ name: 'generateDrafts', ran: true, ok: false, detail: String(e) })
      report.warnings.push(`generateDrafts failed: ${String(e)}`)
    }
  }

  report.finishedAt = new Date().toISOString()
  report.durationMs = Date.now() - startedAt.getTime()

  // ── 6. Audit the run ───────────────────────────────────────────────────────
  await auditRun(report, source)

  logger.info('WeeklyUpdate: done', { weekLabel, durationMs: report.durationMs, warnings: report.warnings.length })
  return report
}
