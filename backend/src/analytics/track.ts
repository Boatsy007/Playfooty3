/**
 * Event tracking (Phase B11).
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight, privacy-conscious ingest. Events are validated, stripped of PII
 * and written (single or batched). Search events also log a SearchQuery row.
 * Writes are best-effort and must never slow or break a page request — callers
 * ignore the promise or catch errors.
 */

import { prisma } from '../db/client.js'
import { VALID_EVENTS, ENTITY_TYPES, deviceType, browserFamily, anonVisitorId, referrerHost, normalizeTerm } from './types.js'
import { logger } from '../utils/logger.js'

export interface RawEventInput {
  eventType: string
  entityType?: string
  entityId?: string
  sessionId?: string
  visitorId?: string        // client-supplied anonymous id
  referrer?: string
  path?: string
  term?: string             // for search events
  scope?: string
  resultCount?: number
  meta?: Record<string, unknown>
}

export interface RequestContext { ip?: string; userAgent?: string }

// Keys we will NEVER persist into meta (defence-in-depth against PII).
const META_BLOCKLIST = new Set(['password', 'pass', 'token', 'apikey', 'api_key', 'adminkey', 'admin_key', 'authorization', 'auth', 'email', 'phone', 'ip', 'name', 'secret'])

function sanitizeMeta(meta?: Record<string, unknown>): string | null {
  if (!meta || typeof meta !== 'object') return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (META_BLOCKLIST.has(k.toLowerCase())) continue
    if (typeof v === 'string' && v.length > 200) continue
    if (typeof v === 'object' && v !== null) continue // only shallow scalars
    out[k] = v
  }
  const s = JSON.stringify(out)
  return s === '{}' ? null : s.slice(0, 1000)
}

function buildRow(input: RawEventInput, ctx: RequestContext) {
  const visitorId = anonVisitorId(input.visitorId, ctx.ip, ctx.userAgent)
  return {
    eventType: input.eventType,
    entityType: input.entityType && (ENTITY_TYPES as readonly string[]).includes(input.entityType) ? input.entityType : (input.entityType ?? null),
    entityId: input.entityId ?? null,
    sessionId: input.sessionId?.slice(0, 64) ?? null,
    visitorId,
    referrer: referrerHost(input.referrer),
    path: input.path?.slice(0, 200) ?? null,
    deviceType: deviceType(ctx.userAgent),
    browser: browserFamily(ctx.userAgent),
    country: null as string | null, // future
    state: null as string | null,   // future
    meta: sanitizeMeta(input.meta),
  }
}

/** Record a single event (+ a SearchQuery row for search events). */
export async function recordEvent(input: RawEventInput, ctx: RequestContext = {}): Promise<{ ok: boolean; error?: string }> {
  if (!VALID_EVENTS.has(input.eventType)) return { ok: false, error: `unknown eventType ${input.eventType}` }
  try {
    const row = buildRow(input, ctx)
    await prisma.analyticsEvent.create({ data: row })
    if (input.eventType === 'SEARCH' || input.eventType === 'CLUB_SEARCH' || input.eventType === 'LEAGUE_SEARCH') {
      const term = (input.term ?? '').trim()
      if (term) {
        await prisma.searchQuery.create({
          data: {
            term: term.slice(0, 120), normalizedTerm: normalizeTerm(term).slice(0, 120),
            scope: input.scope ?? (input.eventType === 'CLUB_SEARCH' ? 'CLUB' : input.eventType === 'LEAGUE_SEARCH' ? 'LEAGUE' : 'ALL'),
            resultCount: input.resultCount ?? 0, zeroResult: (input.resultCount ?? 0) === 0,
            sessionId: row.sessionId, visitorId: row.visitorId,
          },
        })
      }
    }
    return { ok: true }
  } catch (e) { logger.warn('analytics event failed', { detail: String(e) }); return { ok: false, error: 'write failed' } }
}

/** Batch ingest (returns per-batch counts). Invalid rows are skipped, not fatal. */
export async function recordEvents(inputs: RawEventInput[], ctx: RequestContext = {}): Promise<{ accepted: number; rejected: number }> {
  const valid = inputs.filter(i => VALID_EVENTS.has(i.eventType))
  const rows = valid.map(i => buildRow(i, ctx))
  let accepted = 0
  try {
    if (rows.length) { const r = await prisma.analyticsEvent.createMany({ data: rows }); accepted = r.count }
    // Search rows (one-by-one to keep it simple + safe).
    for (const i of valid) {
      if ((i.eventType === 'SEARCH' || i.eventType === 'CLUB_SEARCH' || i.eventType === 'LEAGUE_SEARCH') && (i.term ?? '').trim()) {
        const term = i.term!.trim()
        await prisma.searchQuery.create({ data: { term: term.slice(0, 120), normalizedTerm: normalizeTerm(term).slice(0, 120), scope: i.scope ?? 'ALL', resultCount: i.resultCount ?? 0, zeroResult: (i.resultCount ?? 0) === 0, sessionId: i.sessionId?.slice(0, 64) ?? null, visitorId: anonVisitorId(i.visitorId, ctx.ip, ctx.userAgent) } }).catch(() => {})
      }
    }
  } catch (e) { logger.warn('analytics batch failed', { detail: String(e) }) }
  return { accepted, rejected: inputs.length - accepted }
}
