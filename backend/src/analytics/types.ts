/**
 * Analytics types + privacy helpers (Phase B11).
 * ─────────────────────────────────────────────────────────────────────────────
 * Event catalogue + coarse device/browser detection + anonymous visitor id
 * derivation. NO PII is derived or stored: the visitor id is either a
 * client-supplied anonymous token or a daily-salted hash of IP+UA (the raw IP
 * is never persisted, and the salt rotates daily so ids are not long-lived).
 */

import { createHash } from 'crypto'

export const EVENT_TYPES = [
  'CLUB_VIEW', 'LEAGUE_VIEW', 'ARTICLE_VIEW', 'RANKINGS_VIEW', 'STATISTICS_VIEW', 'CHAMPIONSHIP_VIEW',
  'SEARCH', 'CLUB_SEARCH', 'LEAGUE_SEARCH',
  'SPONSOR_IMPRESSION', 'SPONSOR_CLICK', 'EXTERNAL_LINK_CLICK',
  'CLAIM_CLUB_CTA', 'CLAIM_LEAGUE_CTA',
] as const
export type EventType = typeof EVENT_TYPES[number]
export const VALID_EVENTS = new Set<string>(EVENT_TYPES)

export const ENTITY_TYPES = ['CLUB', 'LEAGUE', 'ARTICLE', 'SPONSOR', 'RANKINGS', 'CHAMPIONSHIP', 'STATISTICS'] as const

/** Coarse device class from a user-agent (no fingerprinting). */
export function deviceType(ua = ''): string {
  const s = ua.toLowerCase()
  if (!s) return 'UNKNOWN'
  if (/bot|crawl|spider|slurp|bingpreview/.test(s)) return 'BOT'
  if (/ipad|tablet|playbook|silk/.test(s)) return 'TABLET'
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return 'MOBILE'
  return 'DESKTOP'
}

/** Coarse browser family (no version — avoids fingerprinting). */
export function browserFamily(ua = ''): string {
  const s = ua.toLowerCase()
  if (/edg\//.test(s)) return 'Edge'
  if (/opr\/|opera/.test(s)) return 'Opera'
  if (/chrome|crios/.test(s)) return 'Chrome'
  if (/firefox|fxios/.test(s)) return 'Firefox'
  if (/safari/.test(s)) return 'Safari'
  return 'Other'
}

const DAY = () => new Date().toISOString().slice(0, 10)

/**
 * Derive an anonymous visitor id. Prefers a client-supplied token; otherwise a
 * daily-salted hash of IP+UA. The raw IP is never returned or stored.
 */
export function anonVisitorId(clientId: string | undefined, ip: string | undefined, ua: string | undefined): string | null {
  if (clientId && clientId.trim()) return clientId.trim().slice(0, 64)
  if (!ip && !ua) return null
  const salt = process.env.ANALYTICS_SALT ?? 'gonetty'
  return 'anon_' + createHash('sha256').update(`${salt}:${DAY()}:${ip ?? ''}:${ua ?? ''}`).digest('hex').slice(0, 24)
}

/** Referrer host only (strip query/path to avoid leaking anything sensitive). */
export function referrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null
  try { return new URL(referrer).host || null } catch { return referrer.slice(0, 120) }
}

export const normalizeTerm = (s: string) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
