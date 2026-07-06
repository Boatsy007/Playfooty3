/**
 * PlayHQ API HTTP client (Phase F2) — built from the official OpenAPI spec.
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles both documented auth models (never mixed):
 *   • PUBLIC  requests → x-api-key + x-phq-tenant
 *   • PARTNER requests → Authorization: Bearer <JWT>, JWT fetched from POST /auth
 *     with clientId/clientSecret and cached until shortly before `exp`.
 * Supports both pagination styles: cursor (metadata.nextCursor, v1/v2) and page
 * (metadata.totalPages, deprecated). Adds retry with backoff on 429/5xx and a
 * minimum inter-request delay. Never logs secrets; only requests public data.
 */

import { getPlayhqConfig, PLAYHQ_CREDENTIALS_MISSING } from './config.js'
import { ProviderDisabledError } from '../competition-provider.js'
import type { JwtResponse } from './types.js'
import { logger } from '../../utils/logger.js'

export type AuthMode = 'public' | 'partner'

export class PlayhqClient {
  private readonly timeoutMs = 20000
  private readonly maxRetries = 3
  private readonly minDelayMs = 250
  private lastRequestAt = 0
  private jwt: { token: string; expEpoch: number } | null = null

  isConfigured(): boolean { return getPlayhqConfig() != null }

  private cfg() {
    const c = getPlayhqConfig()
    if (!c) throw new ProviderDisabledError(PLAYHQ_CREDENTIALS_MISSING)
    return c
  }

  // ── JWT (partner) ─────────────────────────────────────────────────────────
  /** Fetch/refresh a partner JWT via POST /auth. Cached until ~60s before exp. */
  private async getJwt(): Promise<string> {
    const c = this.cfg()
    if (!c.partnerEnabled || !c.clientId || !c.clientSecret) throw new ProviderDisabledError('PlayHQ partner (JWT) credentials not configured.')
    const now = Math.floor(Date.now() / 1000)
    if (this.jwt && this.jwt.expEpoch - 60 > now) return this.jwt.token
    const res = await fetch(`${c.baseUrl}/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ clientId: c.clientId, clientSecret: c.clientSecret }), signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!res.ok) throw new Error(`PlayHQ /auth failed (${res.status})`)
    const body = (await res.json()) as JwtResponse
    this.jwt = { token: body.access_token, expEpoch: body.exp }
    logger.info('PlayHQ JWT refreshed')
    return body.access_token
  }

  /** Force a fresh JWT (admin refresh). No-op for public-only setups. */
  async refreshAuth(): Promise<{ refreshed: boolean }> {
    const c = getPlayhqConfig()
    if (!c?.partnerEnabled) return { refreshed: false }
    this.jwt = null
    await this.getJwt()
    return { refreshed: true }
  }

  private async headers(mode: AuthMode): Promise<Record<string, string>> {
    const c = this.cfg()
    const h: Record<string, string> = { 'Accept': 'application/json', 'User-Agent': 'PlayFooty/1.0 (+https://gonetty.com.au)' }
    if (mode === 'public') {
      if (!c.publicEnabled || !c.apiKey) throw new ProviderDisabledError('PlayHQ public (x-api-key) credentials not configured.')
      h['x-api-key'] = c.apiKey
      if (c.tenant) h['x-phq-tenant'] = c.tenant
    } else {
      h['Authorization'] = `Bearer ${await this.getJwt()}`
    }
    return h
  }

  private async throttle() {
    const wait = this.minDelayMs - (Date.now() - this.lastRequestAt)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    this.lastRequestAt = Date.now()
  }

  /** GET a single JSON resource. Returns null on 404. Retries 429/5xx. */
  async get<T>(path: string, opts: { mode?: AuthMode; query?: Record<string, string | number | undefined> } = {}): Promise<T | null> {
    const mode = opts.mode ?? 'public'
    const c = this.cfg()
    const url = new URL(path.startsWith('http') ? path : `${c.baseUrl}/${path.replace(/^\/+/, '')}`)
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v != null && v !== '') url.searchParams.set(k, String(v))

    let attempt = 0
    for (;;) {
      await this.throttle()
      let res: Response
      try {
        res = await fetch(url.toString(), { headers: await this.headers(mode), signal: AbortSignal.timeout(this.timeoutMs) })
      } catch (e) {
        if (attempt++ < this.maxRetries) { await this.backoff(attempt); continue }
        throw e
      }
      if (res.status === 404) return null
      if (res.status === 401 || res.status === 403) throw new ProviderDisabledError('PlayHQ API rejected the credentials (unauthorised).')
      if ((res.status === 429 || res.status >= 500) && attempt++ < this.maxRetries) { await this.backoff(attempt, res); continue }
      if (!res.ok) throw new Error(`PlayHQ API ${res.status} for ${path}`)
      return (await res.json()) as T
    }
  }

  private async backoff(attempt: number, res?: Response) {
    const retryAfter = res?.headers.get('retry-after')
    const ms = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(8000, 2 ** attempt * 500)
    await new Promise(r => setTimeout(r, ms))
  }

  /**
   * Follow modern cursor pagination (metadata.hasMore / metadata.nextCursor).
   * `pick` extracts the array from the envelope (shape differs per endpoint).
   */
  async getAllCursor<T>(path: string, pick: (body: Record<string, unknown>) => T[], opts: { mode?: AuthMode; query?: Record<string, string | number | undefined> } = {}): Promise<T[]> {
    const out: T[] = []
    let cursor: string | undefined
    let guard = 0
    do {
      const body = await this.get<Record<string, unknown>>(path, { mode: opts.mode, query: { ...opts.query, ...(cursor ? { cursor } : {}) } })
      if (!body) break
      out.push(...pick(body))
      const meta = (body.metadata ?? {}) as Record<string, unknown>
      cursor = meta.hasMore ? ((meta.nextCursor as string) ?? undefined) : undefined
    } while (cursor && ++guard < 200)
    if (guard >= 200) logger.warn('PlayHQ cursor pagination guard hit', { path })
    return out
  }

  /** Follow deprecated page pagination (metadata.totalPages), partner/JWT only. */
  async getAllPaged<T>(path: string, pick: (body: Record<string, unknown>) => T[], opts: { mode?: AuthMode; query?: Record<string, string | number | undefined>; limit?: number } = {}): Promise<T[]> {
    const out: T[] = []
    const limit = opts.limit ?? 100
    let page = 1
    let totalPages = 1
    do {
      const body = await this.get<Record<string, unknown>>(path, { mode: opts.mode ?? 'partner', query: { ...opts.query, page, limit } })
      if (!body) break
      out.push(...pick(body))
      const meta = (body.metadata ?? {}) as Record<string, unknown>
      totalPages = Number(meta.totalPages ?? 1)
      page++
    } while (page <= totalPages && page < 500)
    return out
  }
}
