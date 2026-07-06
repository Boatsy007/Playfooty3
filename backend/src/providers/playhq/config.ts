/**
 * PlayHQ API configuration (Phase F2) — environment only, never committed.
 * ─────────────────────────────────────────────────────────────────────────────
 * Two independent auth models (never mixed):
 *   • PUBLIC   — x-api-key + x-phq-tenant  (modern v1/v2 endpoints)
 *   • PARTNER  — JWT from POST /auth via clientId/clientSecret (deprecated list
 *                + /partner/* endpoints), auto-refreshed on expiry
 * The integration is usable if EITHER an API key (public) OR client credentials
 * (partner) are present. If neither exists it is DISABLED and every call fails
 * gracefully with a clear admin message. No secret is ever logged or returned.
 */

export const PLAYHQ_CREDENTIALS_MISSING = 'PlayHQ credentials not configured.'
const DEFAULT_BASE_URL = 'https://api.playhq.com'

export interface PlayhqConfig {
  baseUrl: string
  apiKey: string | null
  tenant: string | null
  organisationId: string | null
  clientId: string | null
  clientSecret: string | null
  publicEnabled: boolean   // x-api-key auth available
  partnerEnabled: boolean  // JWT auth available
}

function readEnv(): Omit<PlayhqConfig, 'publicEnabled' | 'partnerEnabled'> & { enabledFlag: string } {
  return {
    baseUrl: (process.env.PLAYHQ_API_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_BASE_URL,
    apiKey: (process.env.PLAYHQ_API_KEY ?? '').trim() || null,
    tenant: (process.env.PLAYHQ_TENANT ?? '').trim() || null,
    organisationId: (process.env.PLAYHQ_ORGANISATION_ID ?? '').trim() || null,
    clientId: (process.env.PLAYHQ_CLIENT_ID ?? '').trim() || null,
    clientSecret: (process.env.PLAYHQ_CLIENT_SECRET ?? '').trim() || null,
    enabledFlag: (process.env.PLAYHQ_API_ENABLED ?? '').trim().toLowerCase(),
  }
}

function notDisabled(flag: string): boolean { return !(flag === 'false' || flag === '0' || flag === 'off') }

/** True if the public (x-api-key) flow is usable. */
export function isPublicConfigured(): boolean { const e = readEnv(); return !!e.apiKey && notDisabled(e.enabledFlag) }
/** True if the partner (JWT) flow is usable. */
export function isPartnerConfigured(): boolean { const e = readEnv(); return !!(e.clientId && e.clientSecret) && notDisabled(e.enabledFlag) }
/** True if EITHER auth model is usable. */
export function isPlayhqConfigured(): boolean { return isPublicConfigured() || isPartnerConfigured() }

/** Resolve config from env. Returns null when the integration is not usable. */
export function getPlayhqConfig(): PlayhqConfig | null {
  if (!isPlayhqConfigured()) return null
  const e = readEnv()
  return { baseUrl: e.baseUrl, apiKey: e.apiKey, tenant: e.tenant, organisationId: e.organisationId, clientId: e.clientId, clientSecret: e.clientSecret, publicEnabled: isPublicConfigured(), partnerEnabled: isPartnerConfigured() }
}

/** Non-secret status for admin/status + admin/health — never exposes secrets. */
export function playhqPublicStatus() {
  const e = readEnv()
  const configured = isPlayhqConfigured()
  return {
    configured,
    enabled: configured,
    publicApi: isPublicConfigured(),
    partnerApi: isPartnerConfigured(),
    message: configured ? 'PlayHQ integration configured.' : PLAYHQ_CREDENTIALS_MISSING,
    tenant: e.tenant,
    organisationId: e.organisationId,
    baseUrl: e.baseUrl,
    hasApiKey: !!e.apiKey,
    hasClientCredentials: !!(e.clientId && e.clientSecret),
  }
}
