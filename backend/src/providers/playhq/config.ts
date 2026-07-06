/**
 * PlayHQ API configuration (Phase F1) — environment only, never committed.
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads credentials from env vars and reports whether the PlayHQ integration is
 * usable. If credentials are missing the integration is DISABLED and every call
 * fails gracefully with a clear admin message — the rest of the app is never
 * blocked. No secret value is ever logged or returned to a client.
 */

export const PLAYHQ_CREDENTIALS_MISSING = 'PlayHQ credentials not configured.'
const DEFAULT_BASE_URL = 'https://api.playhq.com/v1'

export interface PlayhqConfig {
  apiKey: string
  baseUrl: string
  tenant: string | null
  organisationId: string | null
  enabled: boolean
}

/** True only when an API key exists and the integration is not explicitly disabled. */
export function isPlayhqConfigured(): boolean {
  const key = (process.env.PLAYHQ_API_KEY ?? '').trim()
  const enabledFlag = (process.env.PLAYHQ_API_ENABLED ?? '').trim().toLowerCase()
  const disabled = enabledFlag === 'false' || enabledFlag === '0' || enabledFlag === 'off'
  return key.length > 0 && !disabled
}

/** Resolve config from env. Returns null when the integration is not usable. */
export function getPlayhqConfig(): PlayhqConfig | null {
  if (!isPlayhqConfigured()) return null
  return {
    apiKey: (process.env.PLAYHQ_API_KEY ?? '').trim(),
    baseUrl: (process.env.PLAYHQ_API_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
    tenant: (process.env.PLAYHQ_TENANT ?? '').trim() || null,
    organisationId: (process.env.PLAYHQ_ORGANISATION_ID ?? '').trim() || null,
    enabled: true,
  }
}

/** Non-secret status for admin/status — never exposes the API key. */
export function playhqPublicStatus() {
  const configured = isPlayhqConfigured()
  return {
    configured,
    enabled: configured,
    message: configured ? 'PlayHQ integration configured.' : PLAYHQ_CREDENTIALS_MISSING,
    tenant: (process.env.PLAYHQ_TENANT ?? '').trim() || null,
    organisationId: (process.env.PLAYHQ_ORGANISATION_ID ?? '').trim() || null,
    baseUrl: (process.env.PLAYHQ_API_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
  }
}
