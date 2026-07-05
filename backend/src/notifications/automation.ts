/**
 * Automation scanner (Phase B9).
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads existing data (rankings, articles, claims, sponsors, championship
 * invitations, review queue, league syncs) READ-ONLY and emits deduplicated
 * notifications for the important things that happened. It modifies no existing
 * engine — it only observes their outputs. Every emit carries a stable dedupeKey
 * so repeated scans never double-alert. An AutomationRun row audits each scan.
 */

import { prisma } from '../db/client.js'
import { notify } from './notify.js'
import { logger } from '../utils/logger.js'

const MOVE_THRESHOLD = 3   // only alert on rank moves of 3+ to avoid noise
const THRESHOLDS = [10, 25, 50, 100]

export interface ScanReport { scanKey: string; created: number; deduped: number; bySection: Record<string, number>; warnings: string[] }

async function emit(input: Parameters<typeof notify>[0], r: ScanReport, section: string) {
  const res = await notify(input)
  if (res.created) { r.created++; r.bySection[section] = (r.bySection[section] ?? 0) + 1 }
  else r.deduped++
}

export async function runAutomationScan(opts: { sections?: string[] } = {}): Promise<ScanReport> {
  const report: ScanReport = { scanKey: opts.sections?.length ? opts.sections.join('+') : 'FULL', created: 0, deduped: 0, bySection: {}, warnings: [] }
  const want = (s: string) => !opts.sections?.length || opts.sections.includes(s)

  // ── Rankings + club movements + crossings + new #1 ──────────────────────────
  if (want('RANKINGS')) {
    try {
      const runs = await prisma.rankingRun.findMany({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 2 })
      const run = runs[0]
      if (run) {
        await emit({ type: 'RANKINGS_UPDATED', title: `National rankings updated — ${run.weekLabel}`, body: `A new ranking run completed for ${run.weekLabel}.`, entityType: 'RankingRun', entityId: run.id, dedupeKey: `rankings-updated:${run.id}` }, report, 'RANKINGS')

        const entries = await prisma.rankingEntry.findMany({ where: { runId: run.id }, orderBy: { rank: 'asc' } })
        for (const e of entries) {
          // Movements
          if (e.previousRank != null && e.rankMovement >= MOVE_THRESHOLD) {
            await emit({ type: 'CLUB_MOVED_UP', recipientScope: 'CLUB', recipientId: e.clubId, title: `${e.clubName} climbed ${e.rankMovement} to #${e.rank}`, entityType: 'Club', entityId: e.clubId, data: { rank: e.rank, previousRank: e.previousRank }, dedupeKey: `club-move-up:${run.id}:${e.clubId}` }, report, 'RANKINGS')
          } else if (e.previousRank != null && e.rankMovement <= -MOVE_THRESHOLD) {
            await emit({ type: 'CLUB_MOVED_DOWN', recipientScope: 'CLUB', recipientId: e.clubId, title: `${e.clubName} slipped ${Math.abs(e.rankMovement)} to #${e.rank}`, entityType: 'Club', entityId: e.clubId, data: { rank: e.rank, previousRank: e.previousRank }, dedupeKey: `club-move-down:${run.id}:${e.clubId}` }, report, 'RANKINGS')
          }
          // Threshold crossings
          if (e.previousRank != null) {
            for (const t of THRESHOLDS) {
              if (e.rank <= t && e.previousRank > t) {
                await emit({ type: `CLUB_ENTERED_TOP_${t}`, recipientScope: 'CLUB', recipientId: e.clubId, title: `${e.clubName} entered the national Top ${t}`, entityType: 'Club', entityId: e.clubId, data: { rank: e.rank, threshold: t }, dedupeKey: `cross-in:${run.id}:${e.clubId}:${t}` }, report, 'RANKINGS')
              }
            }
            if (e.rank > 100 && e.previousRank <= 100) {
              await emit({ type: 'CLUB_LEFT_TOP_100', recipientScope: 'CLUB', recipientId: e.clubId, title: `${e.clubName} dropped out of the national Top 100`, entityType: 'Club', entityId: e.clubId, data: { rank: e.rank }, dedupeKey: `cross-out:${run.id}:${e.clubId}:100` }, report, 'RANKINGS')
            }
          }
        }

        // New number one
        const leader = entries[0]
        const prevRun = runs[1]
        if (leader && prevRun) {
          const prevLeader = await prisma.rankingEntry.findFirst({ where: { runId: prevRun.id, rank: 1 }, select: { clubId: true } })
          if (prevLeader && prevLeader.clubId !== leader.clubId) {
            await emit({ type: 'CLUB_NEW_NUMBER_ONE', title: `${leader.clubName} are the new national number one`, entityType: 'Club', entityId: leader.clubId, dedupeKey: `new-no1:${run.id}:${leader.clubId}` }, report, 'RANKINGS')
          }
        }
      }
    } catch (e) { report.warnings.push(`rankings: ${String(e)}`) }
  }

  // ── Article published ───────────────────────────────────────────────────────
  if (want('CONTENT')) {
    try {
      const published = await prisma.generatedArticle.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 100, select: { id: true, title: true, slug: true } })
      for (const a of published) await emit({ type: 'ARTICLE_PUBLISHED', title: `Published: ${a.title}`, entityType: 'GeneratedArticle', entityId: a.id, data: { slug: a.slug }, dedupeKey: `article-published:${a.id}` }, report, 'CONTENT')
    } catch (e) { report.warnings.push(`content: ${String(e)}`) }
  }

  // ── Claims ──────────────────────────────────────────────────────────────────
  if (want('CLAIMS')) {
    try {
      const clubClaims = await prisma.clubClaim.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 300 })
      for (const c of clubClaims) {
        if (c.status === 'PENDING') await emit({ type: 'CLAIM_SUBMITTED', title: `New claim: ${c.clubName}`, entityType: 'ClubClaim', entityId: c.id, dedupeKey: `claim-submitted:${c.id}` }, report, 'CLAIMS')
        else if (c.status === 'VERIFIED') await emit({ type: 'CLAIM_APPROVED', recipientScope: 'USER', title: `Your claim for ${c.clubName} was approved`, entityType: 'ClubClaim', entityId: c.id, dedupeKey: `claim-approved:${c.id}` }, report, 'CLAIMS')
        else if (c.status === 'REJECTED') await emit({ type: 'CLAIM_REJECTED', recipientScope: 'USER', title: `Your claim for ${c.clubName} was declined`, entityType: 'ClubClaim', entityId: c.id, dedupeKey: `claim-rejected:${c.id}` }, report, 'CLAIMS')
      }
    } catch (e) { report.warnings.push(`claims: ${String(e)}`) }
  }

  // ── Sponsor expiry ──────────────────────────────────────────────────────────
  if (want('COMMERCIAL')) {
    try {
      const deals = await prisma.sponsorship.findMany({ where: { deletedAt: null, status: { in: ['RENEWAL_DUE', 'EXPIRED'] } }, orderBy: { updatedAt: 'desc' }, take: 300 })
      for (const d of deals) {
        if (d.status === 'RENEWAL_DUE') await emit({ type: 'SPONSOR_EXPIRING', title: `Sponsorship renewal due`, entityType: 'Sponsorship', entityId: d.id, data: { endDate: d.endDate }, dedupeKey: `sponsor-expiring:${d.id}` }, report, 'COMMERCIAL')
        else await emit({ type: 'SPONSOR_EXPIRED', title: `Sponsorship expired`, entityType: 'Sponsorship', entityId: d.id, dedupeKey: `sponsor-expired:${d.id}` }, report, 'COMMERCIAL')
      }
    } catch (e) { report.warnings.push(`commercial: ${String(e)}`) }
  }

  // ── Championship invitations ────────────────────────────────────────────────
  if (want('CHAMPIONSHIP')) {
    try {
      const invites = await prisma.championshipInvitation.findMany({ where: { status: 'PENDING' }, orderBy: { invitedAt: 'desc' }, take: 300 })
      for (const inv of invites) await emit({ type: 'CHAMPIONSHIP_INVITATION', recipientScope: 'CLUB', recipientId: inv.clubId, title: `${inv.clubName} invited to a championship`, entityType: 'ChampionshipInvitation', entityId: inv.id, dedupeKey: `champ-invite:${inv.id}` }, report, 'CHAMPIONSHIP')
    } catch (e) { report.warnings.push(`championship: ${String(e)}`) }
  }

  // ── Data quality (daily summary) ────────────────────────────────────────────
  if (want('QUALITY')) {
    try {
      const pending = await prisma.reviewItem.count({ where: { status: 'PENDING' } })
      if (pending > 0) {
        const day = new Date().toISOString().slice(0, 10)
        await emit({ type: 'REVIEW_REQUIRED', title: `${pending} item${pending === 1 ? '' : 's'} awaiting review`, data: { pending }, dedupeKey: `review-required:${day}` }, report, 'QUALITY')
      }
    } catch (e) { report.warnings.push(`quality: ${String(e)}`) }
  }

  // ── Failed syncs ────────────────────────────────────────────────────────────
  if (want('SYSTEM')) {
    try {
      const failed = await prisma.league.findMany({ where: { isActive: true, archivedAt: null, syncError: { not: null } }, select: { id: true, name: true, syncError: true, lastSyncedAt: true } })
      for (const l of failed) {
        const stamp = l.lastSyncedAt ? l.lastSyncedAt.toISOString().slice(0, 10) : 'x'
        await emit({ type: 'SYNC_FAILED', title: `Sync failed: ${l.name}`, body: l.syncError ?? undefined, entityType: 'League', entityId: l.id, dedupeKey: `failed-sync:${l.id}:${stamp}` }, report, 'SYSTEM')
      }
    } catch (e) { report.warnings.push(`system: ${String(e)}`) }
  }

  await prisma.automationRun.create({ data: { scanKey: report.scanKey, status: report.warnings.length ? 'PARTIAL' : 'SUCCESS', created: report.created, deduped: report.deduped, detail: JSON.stringify({ bySection: report.bySection, warnings: report.warnings }) } }).catch(() => {})
  logger.info('Automation scan complete', { created: report.created, deduped: report.deduped })
  return report
}
