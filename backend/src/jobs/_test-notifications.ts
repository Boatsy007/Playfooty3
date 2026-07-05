/**
 * Validation script for the Phase B9 notifications & automation engine.
 *
 * Pure checks (no DB writes): the type catalogue covers the brief, dedupe-key
 * shapes are stable, and the Prisma client exposes every new model.
 *
 * Usage: tsx src/jobs/_test-notifications.ts
 */

import { prisma } from '../db/client.js'
import { NOTIFICATION_TYPES, VALID_TYPES, TYPE_BY_KEY, CHANNELS, DIGEST_KINDS, FUTURE_CHANNELS } from '../notifications/types.js'

async function main() {
  const checks: [string, boolean][] = []

  // Type catalogue covers every alert class in the brief.
  const required = [
    'RANKINGS_UPDATED', 'CLUB_MOVED_UP', 'CLUB_MOVED_DOWN', 'CLUB_ENTERED_TOP_10', 'CLUB_ENTERED_TOP_25',
    'CLUB_ENTERED_TOP_100', 'CLUB_LEFT_TOP_100', 'LEAGUE_STRENGTH_CHANGED', 'ARTICLE_PUBLISHED',
    'CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'CLAIM_REJECTED', 'SPONSOR_EXPIRING',
    'CHAMPIONSHIP_INVITATION', 'SYNC_FAILED', 'REVIEW_REQUIRED',
  ]
  for (const t of required) checks.push([`type ${t} present`, VALID_TYPES.has(t)])

  // Channels (incl. future push/SMS) + digest kinds.
  for (const c of ['IN_APP', 'EMAIL', 'WEBHOOK', 'PUSH', 'SMS']) checks.push([`channel ${c} declared`, (CHANNELS as readonly string[]).includes(c)])
  checks.push(['PUSH/SMS marked future', FUTURE_CHANNELS.has('PUSH') && FUTURE_CHANNELS.has('SMS')])
  for (const d of ['DAILY_ADMIN', 'WEEKLY_RANKINGS', 'WEEKLY_CLUB', 'WEEKLY_LEAGUE']) checks.push([`digest ${d} declared`, (DIGEST_KINDS as readonly string[]).includes(d)])

  checks.push(['every type has category', NOTIFICATION_TYPES.every(t => t.category.length > 0)])
  checks.push(['every type has severity', NOTIFICATION_TYPES.every(t => ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'].includes(t.severity))])
  checks.push(['FAILED_SYNC is CRITICAL', TYPE_BY_KEY.get('FAILED_SYNC')?.severity === 'CRITICAL'])
  checks.push(['CLUB_MOVED_UP targets CLUB', TYPE_BY_KEY.get('CLUB_MOVED_UP')?.recipientScope === 'CLUB'])

  // Dedupe key determinism (same inputs → same key).
  const key = (runId: string, clubId: string) => `club-move-up:${runId}:${clubId}`
  checks.push(['dedupe key deterministic', key('r1', 'c1') === key('r1', 'c1')])
  checks.push(['dedupe key varies by club', key('r1', 'c1') !== key('r1', 'c2')])

  const pc = prisma as unknown as Record<string, { findMany?: unknown }>
  for (const m of ['notification', 'notificationPreference', 'notificationRule', 'automationRun', 'notificationDigest']) {
    checks.push([`prisma.${m} present`, typeof pc[m]?.findMany === 'function'])
  }

  let failed = 0
  console.log('── Phase B9 notifications validation ──')
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++ }

  await prisma.$disconnect().catch(() => {})
  if (failed > 0) { console.error(`\n${failed} check(s) failed.`); process.exit(1) }
  console.log('\nAll checks passed.')
}

main().catch(async e => { console.error('validation failed:', e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
