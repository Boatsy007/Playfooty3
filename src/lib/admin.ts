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
  strengthReasoning?: string | null; strengthCalculatedAt?: string | null
}
export interface FootballLeague extends AdminLeague {
  sport: string; primaryDataSource: string | null; fallbackDataSources: string | null; sourceUrl: string | null
  currentSeason: string | null
  playhqOrganisationId: string | null; playhqCompetitionId: string | null; playhqSeasonId: string | null; playhqGradeId: string | null
  scrapeEnabled: boolean; apiEnabled: boolean; manualEntryEnabled: boolean
  lastSyncAt: string | null; lastSuccessfulSyncAt: string | null; syncStatus: string; dataSourceSyncError: string | null
  _count?: AdminLeague['_count'] & { footballFixtures?: number; footballResults?: number; footballLadderEntries?: number; footballImports?: number }
}
export interface FootballImportResult {
  importId: string; status: string; recordsFound?: number; recordsImported?: number; dryRun?: boolean; note?: string
}

export interface FootballImportRow {
  id: string; sourceType: string; dataType: string; sourceUrl: string | null; dryRun: boolean; status: string
  recordsFound: number; recordsImported: number; conflictsFound: number; confidence: number; error: string | null
  scrapedAt: string | null; createdAt: string; publishedAt: string | null
}
export interface FootballFixtureRow {
  id: string; round: string | null; homeName: string; awayName: string; matchDate: string | null; venue: string | null; sourceType: string; sourceUrl: string | null; verified: boolean
}
export interface FootballResultRow extends FootballFixtureRow {
  homeGoals: number; homeBehinds: number; homePoints: number; awayGoals: number; awayBehinds: number; awayPoints: number; published: boolean
}
export interface RoundImportReport {
  round: string; resultsFound: number; resultsImported: number; fixturesFound: number; fixturesImported: number
  clubsCreated: number; conflicts: number; reviews: number; ladderRows: number; strategies: string[]; warnings: string[]
}
export interface SeasonImportTotals {
  rounds: number; resultsImported: number; fixturesImported: number; clubsCreated: number; conflicts: number; reviews: number; ladderRows: number
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
export interface ArticleRow {
  id: string; slug: string; kind: string; category: string; title: string; subtitle: string | null
  summary: string; status: string; weekLabel: string | null; updatedAt: string; publishedAt: string | null
}
export interface ArticleFull extends ArticleRow { body: string; heroSeed: string; tags: string | null; seoTitle: string | null; seoDescription: string | null; author: string }
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
  leagues: { name: string; before: number; after: number; conf: number; review: boolean; reasoning: string }[]
  clubsRanked: number
  top: { rank: number; clubId?: string; clubName: string; leagueName: string | null; powerRating: number }[]
}
export interface ClubExplanation {
  clubId: string; clubName: string; rank: number; powerRating: number; weekLabel: string
  reasoning: string; componentScores: Record<string, number>
  league: { name: string; strength: number; confidence: number; reasoning: string | null; calculatedAt: string | null } | null
}

export interface OcrRow {
  position?: number; team: string; played?: number; wins?: number; losses?: number
  draws?: number; goalsFor?: number; goalsAgainst?: number; percentage?: number; points?: number
  match: { clubId: string | null; matchedName: string | null; score: number; confident: boolean }
}
export interface OcrPreview {
  importId?: string | null; detectedLeague: string | null; detectedGrade?: string | null
  matchedLeagueId: string | null; rows: OcrRow[]; uncertain: number; confidence?: number | null; notes: string | null
}
export interface OcrHistoryRow {
  id: string; leagueId: string | null; leagueName: string | null; detectedLeague: string | null
  detectedGrade: string | null; rowCount: number; uncertainCount: number; confidence: number | null
  status: string; notes: string | null; createdBy: string; createdAt: string; committedAt: string | null
}
export interface OcrHistoryDetail extends OcrHistoryRow { image: string; rows: string | null; committedRows: string | null }

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
  ocrCommit: (leagueId: string, entries: unknown[], importId?: string | null) => req<{ data: { league: string; teams: number }; note?: string }>('POST', '/admin/ocr/commit', { leagueId, entries, importId }),
  ocrHistory: () => req<{ data: OcrHistoryRow[] }>('GET', '/admin/ocr/history').then(r => r.data),
  ocrHistoryDetail: (id: string) => req<{ data: OcrHistoryDetail }>('GET', `/admin/ocr/history/${id}`).then(r => r.data),
  ocrDiscard: (id: string) => req<{ data: { id: string; status: string } }>('POST', `/admin/ocr/history/${id}/discard`),
  // Platform — dashboard, recalc, reviews, backups, audit, settings
  dashboard:   () => req<{ data: DashboardData }>('GET', '/admin/platform/dashboard').then(r => r.data),
  recalculate: () => req<{ data: RecalcReport }>('POST', '/admin/platform/recalculate').then(r => r.data),
  listReviews: (status = 'PENDING', kind?: string) => req<{ data: ReviewItem[]; meta?: { kinds: { kind: string; count: number }[] } }>('GET', `/admin/platform/reviews?status=${status}${kind ? `&kind=${kind}` : ''}`),
  resolveReview: (id: string, action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => req<{ data: ReviewItem }>('POST', `/admin/platform/reviews/${id}/resolve`, { action }),
  resolveReviewsBulk: (ids: string[], action: 'APPROVED' | 'REJECTED' | 'MERGED' | 'IGNORED') => req<{ data: { resolved: number } }>('POST', '/admin/platform/reviews/bulk', { ids, action }),
  qualitySweep: () => req<{ data: { duplicateClubs: number; missingLogos: number; orphanClubs: number; staleLeagues: number; raised: number; skippedExisting: number } }>('POST', '/admin/platform/quality/sweep').then(r => r.data),
  // AI Publishing (Phase 4)
  genArticles: () => req<{ data: { weekLabel: string | null; created: number; updated: number; skipped: number; drafts: { kind: string; title: string; slug: string }[] } }>('POST', '/admin/platform/articles/generate').then(r => r.data),
  listArticles: (status = 'ALL') => req<{ data: ArticleRow[]; meta: { counts: { status: string; count: number }[] } }>('GET', `/admin/platform/articles?status=${status}`),
  getArticle: (id: string) => req<{ data: ArticleFull }>('GET', `/admin/platform/articles/${id}`).then(r => r.data),
  editArticle: (id: string, b: Partial<{ title: string; subtitle: string; summary: string; body: unknown; category: string; seoTitle: string; seoDescription: string }>) => req<{ data: ArticleFull }>('PATCH', `/admin/platform/articles/${id}`, b).then(r => r.data),
  setArticleStatus: (id: string, status: string) => req<{ data: { id: string; status: string } }>('POST', `/admin/platform/articles/${id}/status`, { status }).then(r => r.data),
  bulkArticles: (ids: string[], status: string) => req<{ data: { updated: number } }>('POST', '/admin/platform/articles/bulk', { ids, status }).then(r => r.data),
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
  // PlayFooty football data-source control centre
  listFootballLeagues: () => req<{ data: FootballLeague[] }>('GET', '/admin/platform/football/leagues').then(r => r.data),
  createFootballLeague: (b: Record<string, unknown>) => req<{ data: FootballLeague }>('POST', '/admin/platform/football/leagues', b).then(r => r.data),
  setFootballSource: (id: string, b: Record<string, unknown>) => req<{ data: FootballLeague }>('PATCH', `/admin/platform/football/leagues/${id}/source`, b).then(r => r.data),
  syncFootballLeague: (id: string, b: { sourceType?: string; dryRun?: boolean }) => req<{ data: FootballImportResult }>('POST', `/admin/platform/football/leagues/${id}/sync`, b).then(r => r.data),
  importFootballRows: (id: string, b: { sourceType: string; dataType: string; rows: unknown[]; dryRun?: boolean; sourceUrl?: string }) => req<{ data: FootballImportResult }>('POST', `/admin/platform/football/leagues/${id}/import`, b).then(r => r.data),
  generateFootballLadder: (id: string, b: { season?: string; grade?: string; dryRun?: boolean }) => req<{ data: { season: string; grade: string; rows?: number; ladder?: unknown[] } }>('POST', `/admin/platform/football/leagues/${id}/generate-ladder`, b).then(r => r.data),
  compareFootballLadder: (id: string, season = '2026', grade = 'Senior Football') => req<{ data: { generatedRows: number; storedRows: number; conflictCount: number; diffs: unknown[] } }>('GET', `/admin/platform/football/leagues/${id}/compare-ladder?season=${encodeURIComponent(season)}&grade=${encodeURIComponent(grade)}`).then(r => r.data),
  publishFootballLeague: (id: string, b: { season?: string; grade?: string; recalculate?: boolean }) => req<{ data: { publishedResults: number; publishedLadderRows: number; recalc: unknown } }>('POST', `/admin/platform/football/leagues/${id}/publish`, b).then(r => r.data),
  listFootballImports: (id: string) => req<{ data: FootballImportRow[] }>('GET', `/admin/platform/football/leagues/${id}/imports`).then(r => r.data),
  listFootballFixtures: (id: string, season = '2026', grade = 'Senior Football') => req<{ data: FootballFixtureRow[] }>('GET', `/admin/platform/football/leagues/${id}/fixtures?season=${encodeURIComponent(season)}&grade=${encodeURIComponent(grade)}`).then(r => r.data),
  listFootballResults: (id: string, season = '2026', grade = 'Senior Football') => req<{ data: FootballResultRow[] }>('GET', `/admin/platform/football/leagues/${id}/results?season=${encodeURIComponent(season)}&grade=${encodeURIComponent(grade)}`).then(r => r.data),
  // Admin V3 — TRUE URL ingestion (paste URLs, backend fetches + parses + imports)
  importFootballUrl: (id: string, b: { round: string; season?: string; grade?: string; resultsUrl?: string; fixtureUrl?: string; source?: string; generateLadder?: boolean; dryRun?: boolean }) => req<{ data: RoundImportReport }>('POST', `/admin/platform/football/leagues/${id}/import-url`, b).then(r => r.data),
  importFootballSeason: (id: string, b: { season?: string; grade?: string; source?: string; generateLadder?: boolean; dryRun?: boolean; rounds: { round: string; resultsUrl?: string; fixtureUrl?: string }[] }) => req<{ data: { season: string; grade: string; totals: SeasonImportTotals; rounds: RoundImportReport[] } }>('POST', `/admin/platform/football/leagues/${id}/import-season`, b).then(r => r.data),
  importFootballLadderUrl: (id: string, b: { season?: string; grade?: string; ladderUrl: string }) => req<{ data: { importedRows: number; generatedRows: number; conflictCount: number; strategy: string; warnings: string[]; diffs: { clubName: string; generatedPosition: number | null; importedPosition: number | null; differs: boolean }[] } }>('POST', `/admin/platform/football/leagues/${id}/import-ladder-url`, b).then(r => r.data),
  // Ranking explainability (Phase 6) — public endpoint, but handy in admin too
  explainClub: (clubId: string) => req<{ data: ClubExplanation }>('GET', `/api/rankings/explain/${clubId}`).then(r => r.data),
}
