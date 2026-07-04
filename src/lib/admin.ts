/**
 * Admin API client — talks to the password-guarded /admin/manage + /admin/ocr
 * endpoints. The admin key is held in localStorage and sent as a Bearer token.
 */

const KEY = 'cnca_admin_key'
export const getKey = () => localStorage.getItem(KEY) ?? ''
export const setKey = (k: string) => localStorage.setItem(KEY, k)
export const clearKey = () => localStorage.removeItem(KEY)

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getKey()}` },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (r.status === 401) throw new Error('Unauthorized — check the admin key')
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${r.status}`)
  return json as T
}

export interface AdminLeague {
  id: string; name: string; strengthScore: number; strengthConfidence: number
  manualStrengthOverride: number | null; finalStrengthRating: number; needsStrengthReview: boolean
  status: string; hidden: boolean; enabled: boolean; isActive: boolean
  primarySource: string | null; importType: string | null; regionName: string | null
  websiteUrl: string | null; facebookUrl: string | null; logoUrl: string | null
  state?: { code: string } | null; association?: { name: string } | null
  _count?: { clubSeasons: number }
}
export interface AdminClub {
  id: string; name: string; shortName: string | null; region: string | null
  logoUrl: string | null; websiteUrl: string | null; primaryColour: string | null
  secondaryColour: string | null; notes: string | null; source: string | null
  bestRank: number | null; isActive: boolean; state?: { code: string } | null
}

export interface OcrRow {
  position?: number; team: string; played?: number; wins?: number; losses?: number
  draws?: number; goalsFor?: number; goalsAgainst?: number; percentage?: number; points?: number
  match: { clubId: string | null; matchedName: string | null; score: number; confident: boolean }
}
export interface OcrPreview {
  detectedLeague: string | null; detectedGrade?: string | null
  matchedLeagueId: string | null; rows: OcrRow[]; uncertain: number; notes: string | null
}

export const admin = {
  // Leagues
  listLeagues:  () => req<{ data: AdminLeague[] }>('GET', '/admin/manage/leagues').then(r => r.data),
  createLeague: (b: Record<string, unknown>) => req<{ data: AdminLeague }>('POST', '/admin/manage/leagues', b).then(r => r.data),
  editLeague:   (id: string, b: Record<string, unknown>) => req<{ data: AdminLeague; note?: string }>('PATCH', `/admin/manage/leagues/${id}`, b),
  deleteLeague: (id: string) => req<{ note?: string }>('DELETE', `/admin/manage/leagues/${id}`),
  setStrength:  (id: string, override: number | null) => req<{ note?: string }>('POST', `/admin/manage/leagues/${id}/strength`, { override }),
  toggleScrape: (id: string, enabled: boolean) => req('POST', `/admin/manage/leagues/${id}/scraping`, { enabled }),
  mergeLeagues: (keepId: string, mergeId: string) => req<{ note?: string }>('POST', '/admin/manage/leagues/merge', { keepId, mergeId }),
  editLadder:   (id: string, entries: unknown[]) => req<{ note?: string }>('PUT', `/admin/manage/leagues/${id}/ladder`, { entries }),
  // Clubs
  listClubs:    (leagueId?: string) => req<{ data: AdminClub[] }>('GET', `/admin/manage/clubs${leagueId ? `?leagueId=${leagueId}` : ''}`).then(r => r.data),
  createClub:   (b: Record<string, unknown>) => req<{ data: AdminClub }>('POST', '/admin/manage/clubs', b).then(r => r.data),
  editClub:     (id: string, b: Record<string, unknown>) => req<{ data: AdminClub }>('PATCH', `/admin/manage/clubs/${id}`, b),
  deleteClub:   (id: string) => req<{ note?: string }>('DELETE', `/admin/manage/clubs/${id}`),
  moveClub:     (id: string, toLeagueId: string) => req<{ note?: string }>('POST', `/admin/manage/clubs/${id}/move`, { toLeagueId }),
  mergeClubs:   (keepId: string, mergeId: string) => req<{ note?: string }>('POST', '/admin/manage/clubs/merge', { keepId, mergeId }),
  // Rankings
  rerank:  () => req<{ data: { clubsRanked: number } }>('POST', '/admin/manage/rankings/rerank'),
  lock:    () => req('POST', '/admin/manage/rankings/lock'),
  unlock:  () => req('POST', '/admin/manage/rankings/unlock'),
  // OCR
  ocrParse:  (image: string, leagueId?: string) => req<{ data: OcrPreview }>('POST', '/admin/ocr/parse', { image, leagueId }).then(r => r.data),
  ocrCommit: (leagueId: string, entries: unknown[]) => req<{ data: { league: string; teams: number }; note?: string }>('POST', '/admin/ocr/commit', { leagueId, entries }),
}
