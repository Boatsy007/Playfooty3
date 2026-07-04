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
  archivedAt?: string | null; approvalStatus?: string; leagueType?: string | null; reviewReason?: string | null
}
export interface AdminClub {
  id: string; name: string; shortName: string | null; region: string | null
  logoUrl: string | null; websiteUrl: string | null; primaryColour: string | null
  secondaryColour: string | null; notes: string | null; source: string | null
  bestRank: number | null; isActive: boolean; state?: { code: string } | null
  archivedAt?: string | null; approvalStatus?: string; townName?: string | null
}

export interface DashboardData {
  counts: { leaguesActive: number; leaguesArchived: number; clubs: number; clubsArchived: number; teams: number; pendingReviews: number; ocrImports: number }
  lastRun: { weekLabel: string; completedAt: string; clubCount: number } | null
  lastScrape: { lastScrapedAt: string; sourceType: string } | null
  warnings: number
  recentLeagues: { id: string; name: string; lastManualUpdateAt: string; status: string }[]
  recentClubs: { id: string; name: string; updatedAt: string }[]
  flaggedLeagues: { id: string; name: string; syncError: string | null; needsStrengthReview: boolean; strengthConfidence: number }[]
}
export interface ReviewItem {
  id: string; entityType: string; entityId: string | null; kind: string; reason: string
  confidence: number | null; payload: string | null; status: string; createdAt: string; resolvedAt: string | null
}
export interface BackupRow { id: string; label: string; kind: string; counts: string; createdAt: string }
export interface AuditRow {
  id: string; action: string; entityType: string; entityId: string | null; source: string | null
  reason: string | null; before: string | null; after: string | null; createdAt: string
  user?: { email: string; name: string | null } | null
}
export interface SettingRow { key: string; value: string }
export interface ParsedUrl {
  ok: boolean; kind: string; tenant: string | null; orgSlug: string | null
  competitionSlug: string | null; gradeSlug: string | null; gradeId: string | null
  isLadder: boolean; associationUrl: string | null; ladderUrl: string | null; warnings: string[]
}
export interface ImportReport {
  status: 'SUCCESS' | 'NO_DATA' | 'FAILED'; url?: string; kind?: string; league?: string; leagueId?: string
  isNew?: boolean; clubsAdded: number; clubsUpdated: number; ladderRows: number; ladderUpdated: boolean
  rankingRecalculated: boolean; clubsRanked: number; confidence: number; warnings: string[]; reviewsRaised: number; error?: string
}
export interface EngineInfo { repo: string; ref: string; configured: boolean }
export interface WorkflowRun {
  id: number; status: string; conclusion: string | null; htmlUrl: string; createdAt: string; name: string; event: string
}
export interface DispatchResult { dispatched: true; run: WorkflowRun | null; htmlUrl: string; kind?: string }
export type CsvEntity = 'leagues' | 'clubs' | 'teams' | 'ladders' | 'mappings' | 'rankings'
export interface CsvPreviewRow { index: number; data: Record<string, string>; status: 'ok' | 'warn' | 'error'; messages: string[] }
export interface CsvPreview {
  entity: CsvEntity; headers: string[]; required: string[]; total: number
  okCount: number; warnCount: number; errorCount: number; rows: CsvPreviewRow[]
}
export interface CsvCommitResult { entity: CsvEntity; created: number; updated: number; skipped: number; warnings: string[] }
export interface RecalcReport {
  leagues: { name: string; before: number; after: number; conf: number; review: boolean }[]
  clubsRanked: number
  top: { rank: number; clubName: string; leagueName: string | null; powerRating: number }[]
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
  restoreLeague: (id: string) => req<{ note?: string }>('POST', `/admin/manage/leagues/${id}/restore`),
  approveLeague: (id: string) => req<{ note?: string }>('POST', `/admin/manage/leagues/${id}/approve`),
  rejectLeague:  (id: string, reason?: string) => req<{ note?: string }>('POST', `/admin/manage/leagues/${id}/reject`, { reason }),
  setStrength:  (id: string, override: number | null) => req<{ note?: string }>('POST', `/admin/manage/leagues/${id}/strength`, { override }),
  toggleScrape: (id: string, enabled: boolean) => req('POST', `/admin/manage/leagues/${id}/scraping`, { enabled }),
  mergeLeagues: (keepId: string, mergeId: string) => req<{ note?: string }>('POST', '/admin/manage/leagues/merge', { keepId, mergeId }),
  editLadder:   (id: string, entries: unknown[]) => req<{ note?: string }>('PUT', `/admin/manage/leagues/${id}/ladder`, { entries }),
  // Clubs
  listClubs:    (leagueId?: string) => req<{ data: AdminClub[] }>('GET', `/admin/manage/clubs${leagueId ? `?leagueId=${leagueId}` : ''}`).then(r => r.data),
  createClub:   (b: Record<string, unknown>) => req<{ data: AdminClub }>('POST', '/admin/manage/clubs', b).then(r => r.data),
  editClub:     (id: string, b: Record<string, unknown>) => req<{ data: AdminClub }>('PATCH', `/admin/manage/clubs/${id}`, b),
  deleteClub:   (id: string) => req<{ note?: string }>('DELETE', `/admin/manage/clubs/${id}`),
  restoreClub:  (id: string) => req<{ note?: string }>('POST', `/admin/manage/clubs/${id}/restore`),
  moveClub:     (id: string, toLeagueId: string) => req<{ note?: string }>('POST', `/admin/manage/clubs/${id}/move`, { toLeagueId }),
  mergeClubs:   (keepId: string, mergeId: string) => req<{ note?: string }>('POST', '/admin/manage/clubs/merge', { keepId, mergeId }),
  // Rankings
  rerank:  () => req<{ data: { clubsRanked: number } }>('POST', '/admin/manage/rankings/rerank'),
  lock:    () => req('POST', '/admin/manage/rankings/lock'),
  unlock:  () => req('POST', '/admin/manage/rankings/unlock'),
  // OCR
  ocrParse:  (image: string, leagueId?: string) => req<{ data: OcrPreview }>('POST', '/admin/ocr/parse', { image, leagueId }).then(r => r.data),
  ocrCommit: (leagueId: string, entries: unknown[]) => req<{ data: { league: string; teams: number }; note?: string }>('POST', '/admin/ocr/commit', { leagueId, entries }),
  // Platform — dashboard, recalc, reviews, backups, audit, settings
  dashboard:   () => req<{ data: DashboardData }>('GET', '/admin/platform/dashboard').then(r => r.data),
  recalculate: () => req<{ data: RecalcReport }>('POST', '/admin/platform/recalculate').then(r => r.data),
  listReviews: (status = 'PENDING') => req<{ data: ReviewItem[] }>('GET', `/admin/platform/reviews?status=${status}`).then(r => r.data),
  resolveReview: (id: string, action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => req<{ data: ReviewItem }>('POST', `/admin/platform/reviews/${id}/resolve`, { action }),
  listBackups: () => req<{ data: BackupRow[] }>('GET', '/admin/platform/backups').then(r => r.data),
  createBackup: (label?: string) => req<{ data: { id: string; counts: Record<string, number> } }>('POST', '/admin/platform/backups', { label }),
  restoreBackup: (id: string) => req<{ data: { restored: boolean; from: string } }>('POST', `/admin/platform/backups/${id}/restore`),
  listAudit: (entityType?: string) => req<{ data: AuditRow[] }>('GET', `/admin/platform/audit${entityType ? `?entityType=${entityType}` : ''}`).then(r => r.data),
  listSettings: () => req<{ data: SettingRow[] }>('GET', '/admin/platform/settings').then(r => r.data),
  setSetting: (key: string, value: string) => req<{ data: SettingRow }>('POST', '/admin/platform/settings', { key, value }),
  // PlayHQ URL import (Phase 1) + League sync (Phase 10) — dispatched to GitHub Actions
  classifyUrl: (url: string) => req<{ data: ParsedUrl }>('POST', '/admin/platform/playhq/classify', { url }).then(r => r.data),
  importUrl:   (url: string) => req<{ data: DispatchResult }>('POST', '/admin/platform/playhq/import', { url }).then(r => r.data),
  syncLeague:  (id: string) => req<{ data: DispatchResult }>('POST', `/admin/platform/leagues/${id}/sync`).then(r => r.data),
  syncAll:     () => req<{ data: DispatchResult }>('POST', '/admin/platform/playhq/sync-all').then(r => r.data),
  discover:    (b: { assocFilter?: string; maxAssociations?: string }) => req<{ data: DispatchResult }>('POST', '/admin/platform/playhq/discover', b).then(r => r.data),
  // Execution engine (GitHub Actions) status
  engineInfo:  () => req<{ data: EngineInfo }>('GET', '/admin/platform/engine').then(r => r.data),
  engineRuns:  (workflow?: string) => req<{ data: WorkflowRun[] }>('GET', `/admin/platform/engine/runs${workflow ? `?workflow=${workflow}` : ''}`).then(r => r.data),
  engineRun:   (id: number) => req<{ data: WorkflowRun }>('GET', `/admin/platform/engine/runs/${id}`).then(r => r.data),
  // CSV import (Phase 4)
  csvPreview:  (entity: CsvEntity, csv: string) => req<{ data: CsvPreview }>('POST', '/admin/platform/csv/preview', { entity, csv }).then(r => r.data),
  csvCommit:   (entity: CsvEntity, rows: CsvPreviewRow[]) => req<{ data: CsvCommitResult }>('POST', '/admin/platform/csv/commit', { entity, rows }).then(r => r.data),
}
