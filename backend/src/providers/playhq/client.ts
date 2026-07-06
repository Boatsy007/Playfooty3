/**
 * PlayHQ API HTTP client (Phase F1).
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin authenticated GET client for the PlayHQ public/external API. Sends the
 * documented headers (x-api-key, x-phq-tenant) and follows cursor pagination.
 * Never throws on missing credentials at construction — callers check
 * isConfigured() / catch ProviderDisabledError. Only public data is requested;
 * this client never posts, and it never logs the API key.
 */

import { getPlayhqConfig, PLAYHQ_CREDENTIALS_MISSING } from './config.js'
import { ProviderDisabledError } from '../competition-provider.js'
import { logger } from '../../utils/logger.js'

export interface PlayhqPage<T> { data: T[]; nextCursor?: string | null }

export class PlayhqClient {
  private readonly timeoutMs = 20000

  isConfigured(): boolean { return getPlayhqConfig() != null }

  private cfg() {
    const c = getPlayhqConfig()
    if (!c) throw new ProviderDisabledError(PLAYHQ_CREDENTIALS_MISSING)
    return c
  }

  private headers(): Record<string, string> {
    const c = this.cfg()
    const h: Record<string, string> = {
      'x-api-key': c.apiKey,
      'Accept': 'application/json',
      'User-Agent': 'PlayFooty/1.0 (+https://gonetty.com.au)',
    }
    if (c.tenant) h['x-phq-tenant'] = c.tenant
    return h
  }

  /** GET a single JSON resource. Returns null on 404. Throws on other errors. */
  async get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T | null> {
    const c = this.cfg()
    const url = new URL(path.startsWith('http') ? path : `${c.baseUrl}/${path.replace(/^\/+/, '')}`)
    for (const [k, v] of Object.entries(query)) if (v != null && v !== '') url.searchParams.set(k, String(v))
    const res = await fetch(url.toString(), { headers: this.headers(), signal: AbortSignal.timeout(this.timeoutMs) })
    if (res.status === 404) return null
    if (res.status === 401 || res.status === 403) throw new ProviderDisabledError('PlayHQ API rejected the credentials (unauthorised).')
    if (!res.ok) throw new Error(`PlayHQ API ${res.status} for ${path}`)
    return (await res.json()) as T
  }

  /**
   * GET a paginated collection, following PlayHQ's `metadata.nextCursor`.
   * Tolerant of a few response envelope shapes; returns a flat array.
   */
  async getAll<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const out: T[] = []
    let cursor: string | undefined
    let guard = 0
    do {
      const body = await this.get<Record<string, unknown>>(path, { ...query, ...(cursor ? { cursor } : {}) })
      if (!body) break
      const data = (body.data ?? body.items ?? body.results ?? []) as T[]
      if (Array.isArray(data)) out.push(...data)
      const meta = (body.metadata ?? body.meta ?? {}) as Record<string, unknown>
      cursor = (meta.nextCursor ?? meta.next ?? body.nextCursor) as string | undefined
    } while (cursor && ++guard < 100)
    if (guard >= 100) logger.warn('PlayHQ pagination guard hit', { path })
    return out
  }
}
