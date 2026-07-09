import { prisma } from '../db/client.js'
import { fetchPlayHqStatisticsPage, parseGoalKickers, type GoalKickerRow } from './url-ingest.js'

const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback
const str = (v: unknown, fallback = '') => typeof v === 'string' && v.trim() ? v.trim() : fallback

export interface GoalKickerImportResult {
  imported: number
  skipped: number
  errors: number
  sourceUrl: string | null
  note: string
  strategy: string
  warnings: string[]
  diagnostics?: unknown
}

export async function importGoalKickers(input: { sourceUrl?: string; rows?: GoalKickerRow[]; persistSource?: boolean }): Promise<{ data: GoalKickerImportResult; errors: Array<{ row: GoalKickerRow; error: string }> }> {
  const sourceUrl = str(input.sourceUrl, '')
  let rows = input.rows ?? []
  let strategy = rows.length ? 'provided-rows' : 'none'
  let warnings: string[] = []
  let diagnostics: unknown = null

  if (!rows.length && sourceUrl) {
    const page = await fetchPlayHqStatisticsPage(sourceUrl, 30000)
    const parsed = parseGoalKickers(page)
    rows = parsed.rows
    strategy = ((page.diagnostics as Record<string, unknown> | undefined)?.fetchStrategy === 'playwright-render') ? 'playwright-render' : parsed.strategy
    warnings = parsed.warnings
    diagnostics = page.diagnostics ?? null
  }

  if (!rows.length) {
    return { data: { imported: 0, skipped: 0, errors: 0, sourceUrl: sourceUrl || null, note: 'No goal kicker rows could be parsed from this PlayHQ page.', strategy, warnings, diagnostics }, errors: [] }
  }

  let imported = 0
  let skipped = 0
  const errors: Array<{ row: GoalKickerRow; error: string }> = []
  const defaultSeason = new Date().getFullYear().toString()
  let firstLeagueId: string | null = null

  for (const row of rows) {
    try {
      const playerName = str(row.playerName)
      const clubName = str(row.clubName)
      const leagueName = str(row.leagueName)
      const season = str(row.season, defaultSeason)
      const grade = str(row.grade, 'Senior Football')
      const goals = num(row.goals)
      if (!playerName || !clubName || !leagueName || goals < 0) { skipped++; continue }

      const league = await prisma.league.findFirst({
        where: { sport: 'FOOTBALL', archivedAt: null, OR: [{ name: { equals: leagueName, mode: 'insensitive' } }, ...(sourceUrl ? [{ sourceUrl }, { ladderUrl: sourceUrl }] : [])] },
        select: { id: true, name: true },
      })
      const club = await prisma.club.findFirst({ where: { name: { equals: clubName, mode: 'insensitive' }, sport: 'FOOTBALL', archivedAt: null }, select: { id: true } })
      const storedLeagueName = league?.name ?? leagueName
      if (league?.id && !firstLeagueId) firstLeagueId = league.id

      await prisma.footballGoalKicker.upsert({
        where: { season_grade_playerName_clubName_leagueName: { season, grade, playerName, clubName, leagueName: storedLeagueName } },
        create: { playerName, clubId: club?.id ?? null, clubName, leagueId: league?.id ?? null, leagueName: storedLeagueName, season, grade, goals, matches: row.matches == null ? null : num(row.matches), sourceUrl: row.sourceUrl ?? sourceUrl, sourceType: 'PLAYHQ', importedAt: new Date() },
        update: { clubId: club?.id ?? null, leagueId: league?.id ?? null, leagueName: storedLeagueName, goals, matches: row.matches == null ? null : num(row.matches), sourceUrl: row.sourceUrl ?? sourceUrl, sourceType: 'PLAYHQ', importedAt: new Date() },
      })
      imported++
    } catch (err) {
      errors.push({ row, error: err instanceof Error ? err.message : String(err) })
    }
  }

  if (input.persistSource && sourceUrl && firstLeagueId) {
    const source = await prisma.leagueSource.findFirst({ where: { leagueId: firstLeagueId, sourceType: 'PLAYHQ', season: defaultSeason } })
    const data = { goalKickersUrl: sourceUrl, isActive: true, lastScrapedAt: new Date(), lastStatus: imported > 0 ? 'SUCCESS' : 'FAILED', notes: `PlayHQ goal kickers import. Imported: ${imported}.` }
    if (source) await prisma.leagueSource.update({ where: { id: source.id }, data })
    else await prisma.leagueSource.create({ data: { leagueId: firstLeagueId, sourceType: 'PLAYHQ', season: defaultSeason, ...data } })
  }

  return { data: { imported, skipped, errors: errors.length, sourceUrl: sourceUrl || null, note: `Imported ${imported} goal kicker${imported === 1 ? '' : 's'}.`, strategy, warnings, diagnostics }, errors }
}

export async function syncStoredGoalKickers(): Promise<{ sources: number; imported: number; skipped: number; errors: number; warnings: string[] }> {
  const sources = await prisma.leagueSource.findMany({ where: { sourceType: 'PLAYHQ', isActive: true, goalKickersUrl: { not: null } }, select: { goalKickersUrl: true } })
  let imported = 0, skipped = 0, errors = 0
  const warnings: string[] = []
  for (const source of sources) {
    const result = await importGoalKickers({ sourceUrl: source.goalKickersUrl ?? undefined, persistSource: false })
    imported += result.data.imported; skipped += result.data.skipped; errors += result.data.errors
    warnings.push(...result.data.warnings)
  }
  return { sources: sources.length, imported, skipped, errors, warnings }
}
