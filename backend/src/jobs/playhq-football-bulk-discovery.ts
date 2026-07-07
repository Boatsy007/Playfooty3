/**
 * Controlled PlayHQ football ladder discovery/import.
 *
 * Safe first-run defaults are intentionally small:
 *   state=VIC, limit=5, dryRun=true, source=PLAYHQ_SCRAPER,
 *   season=2026, grade=Senior Football.
 *
 * Discovery is URL-based and browser-backed: seed PlayHQ football URLs are
 * opened, candidate ladder links are collected, and every discovered league is
 * processed independently so one failure becomes a review/report entry instead
 * of crashing the whole run.
 */

import { createHash } from 'node:crypto'
import { prisma } from '../db/client.js'
import { parsePlayHQUrl } from '../discovery/playhq-url.js'
import { fetchPage, parseLadder, parseResults, parseFixtures, type FetchedPage, type LadderRow, type ResultRow, type FixtureRow } from '../football/url-ingest.js'
import { logger } from '../utils/logger.js'

const VALID_STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const
type StateCode = typeof VALID_STATES[number]

const DEFAULT_SEEDS: Record<StateCode, string[]> = {
  VIC: [
    'https://www.playhq.com/afl/org/gippsland-league/gippsland-league-2026/seniors/0c3e608b',
    'https://www.playhq.com/afl/org/north-gippsland-football-netball-league/north-gippsland-football-netball-league-2026/1a4dae95',
  ],
  NSW: [], QLD: [], SA: [], WA: [], TAS: [], NT: [], ACT: [],
}

interface Options {
  state: StateCode
  limit: number
  dryRun: boolean
  source: 'PLAYHQ_SCRAPER'
  season: string
  grade: string
  seedUrls: string[]
  roundLimit: number
  createdBy: string
}
interface DiscoveredLeague { ladderUrl: string; sourceUrl: string; name: string; orgSlug: string | null; gradeId: string | null; competitionSlug: string | null; gradeSlug: string | null }
interface LeagueReport {
  name: string
  sourceUrl: string
  ladderUrl: string
  status: 'SUCCESS' | 'DRY_RUN' | 'SKIPPED' | 'FAILED'
  leagueId?: string
  createdLeague: boolean
  clubsParsed: number
  clubsCreated: number
  ladderRowsParsed: number
  ladderRowsImported: number
  fixturesParsed: number
  fixturesImported: number
  resultsParsed: number
  resultsImported: number
  reviews: number
  warnings: string[]
  error?: string
}
interface RunReport {
  options: Options
  discovered: number
  processed: number
  skipped: number
  succeeded: number
  failed: number
  dryRun: boolean
  ranking: { attempted: boolean; success: boolean; clubsRanked: number; error?: string }
  leagues: LeagueReport[]
}

type BrowserPage = import('playwright').Page

const stableHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex')
const clean = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
const title = (s: string | null | undefined) => clean(s ?? '').replace(/\b\w/g, c => c.toUpperCase())
const asInt = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback
const isState = (s: string): s is StateCode => (VALID_STATES as readonly string[]).includes(s)

function arg(name: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
function boolArg(name: string, fallback: boolean): boolean {
  const v = arg(name)
  if (v == null) return process.argv.includes(`--${name}`) ? true : fallback
  return /^(1|true|yes)$/i.test(v)
}
function parseOptions(): Options {
  const stateRaw = (arg('state') ?? process.env.STATE ?? 'VIC').toUpperCase()
  const state = isState(stateRaw) ? stateRaw : 'VIC'
  const seedUrls = (arg('seed-url') ?? arg('seed-urls') ?? process.env.SEED_URLS ?? '')
    .split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  return {
    state,
    limit: Math.max(1, Math.min(asInt(arg('limit') ?? process.env.LIMIT, 5), 50)),
    dryRun: boolArg('dry-run', boolArg('dryRun', String(process.env.DRY_RUN ?? 'true') !== 'false')),
    source: 'PLAYHQ_SCRAPER',
    season: arg('season') ?? process.env.SEASON ?? '2026',
    grade: arg('grade') ?? process.env.GRADE ?? 'Senior Football',
    seedUrls,
    roundLimit: Math.max(0, Math.min(asInt(arg('round-limit') ?? process.env.ROUND_LIMIT, 15), 30)),
    createdBy: arg('created-by') ?? process.env.CREATED_BY ?? 'playhq-football-bulk-discovery',
  }
}

function canonicalLadderUrl(raw: string): string | null {
  try {
    const u = new URL(raw, 'https://www.playhq.com')
    if (!/(^|\.)playhq\.com$/i.test(u.hostname)) return null
    if (!/\/afl\/org\//i.test(u.pathname)) return null
    const path = u.pathname.replace(/\/$/, '')
    if (/\/ladder$/i.test(path)) return `${u.origin}${path}`
    const parsed = parsePlayHQUrl(`${u.origin}${path}`)
    if (parsed.gradeId && parsed.ladderUrl) return parsed.ladderUrl.replace(/\/$/, '')
  } catch { return null }
  return null
}
function roundUrlFromLadder(ladderUrl: string, round: number): string {
  return ladderUrl.replace(/\/ladder(?:$|[?#].*)/i, `/R${round}`)
}
function parseRoundNumber(round: string | undefined, fallback: number): string {
  return round && round.trim() ? round.trim() : `Round ${fallback}`
}

async function discoverLaddersFromSeeds(opts: Options): Promise<DiscoveredLeague[]> {
  const seeds = opts.seedUrls.length ? opts.seedUrls : DEFAULT_SEEDS[opts.state]
  const urls = new Set<string>()
  for (const seed of seeds) {
    const direct = canonicalLadderUrl(seed)
    if (direct) urls.add(direct)
  }

  if (seeds.length && urls.size < opts.limit) {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
    try {
      const page = await (await browser.newContext({ locale: 'en-AU' })).newPage()
      for (const seed of seeds) await collectLadderLinks(page, seed, urls, opts.limit)
    } finally { await browser.close() }
  }

  return [...urls].slice(0, opts.limit).map(ladderUrl => {
    const parsed = parsePlayHQUrl(ladderUrl)
    const name = title(parsed.orgSlug) || title(parsed.competitionSlug) || 'PlayHQ Football League'
    return { ladderUrl, sourceUrl: ladderUrl.replace(/\/ladder$/i, ''), name, orgSlug: parsed.orgSlug, gradeId: parsed.gradeId, competitionSlug: parsed.competitionSlug, gradeSlug: parsed.gradeSlug }
  })
}

async function collectLadderLinks(page: BrowserPage, seed: string, out: Set<string>, limit: number): Promise<void> {
  try {
    await page.goto(seed, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(2500)
    const links = await page.locator('a[href]').evaluateAll((nodes: any[]) => nodes.map(n => String(n.href ?? '')))
    for (const href of [seed, ...links]) {
      const ladder = canonicalLadderUrl(href)
      if (ladder) out.add(ladder)
      if (out.size >= limit) return
    }
    // Some PlayHQ grade cards link to grade pages first; visit a small bounded
    // set of same-org 2026 football links and look again for ladder URLs.
    const sameOrg = links.filter(h => /playhq\.com\/afl\/org\//i.test(h) && /2026/i.test(h)).slice(0, Math.max(0, limit - out.size) * 4)
    for (const href of sameOrg) {
      const ladder = canonicalLadderUrl(href)
      if (ladder) out.add(ladder)
      if (out.size >= limit) return
    }
  } catch (e) {
    logger.warn('bulk PlayHQ discovery seed failed', { seed, detail: String(e) })
  }
}

async function ensureState(code: StateCode) {
  return prisma.state.upsert({ where: { code }, create: { code, name: code }, update: {} })
}
async function ensureLeague(d: DiscoveredLeague, opts: Options, ladderRows: LadderRow[]): Promise<{ id: string; created: boolean }> {
  const state = await ensureState(opts.state)
  const whereByGrade = d.gradeId ? await prisma.league.findFirst({ where: { sport: 'FOOTBALL', playhqGradeId: d.gradeId, archivedAt: null }, select: { id: true } }) : null
  const whereByUrl = whereByGrade ?? await prisma.league.findFirst({ where: { sport: 'FOOTBALL', archivedAt: null, OR: [{ sourceUrl: d.sourceUrl }, { sourceUrl: d.ladderUrl }, { ladderUrl: d.ladderUrl }] }, select: { id: true } }).catch(() => null)
  const whereByName = whereByUrl ?? await prisma.league.findFirst({ where: { sport: 'FOOTBALL', stateId: state.id, name: { equals: d.name, mode: 'insensitive' }, archivedAt: null }, select: { id: true } }).catch(() => null)
  const updateData = {
    sport: 'FOOTBALL', primaryDataSource: opts.source, sourceUrl: d.sourceUrl, ladderUrl: d.ladderUrl,
    playhqGradeId: d.gradeId, playhqGradeName: d.gradeSlug ? title(d.gradeSlug) : opts.grade,
    playhqCompetitionId: d.competitionSlug, playhqOrganisationId: d.orgSlug, currentSeason: opts.season,
    scrapeEnabled: true, syncStatus: 'RUNNING', lastSyncAt: new Date(), dataSourceSyncError: null,
  }
  if (whereByName) {
    await prisma.league.update({ where: { id: whereByName.id }, data: updateData })
    return { id: whereByName.id, created: false }
  }
  const leagueName = d.name || ladderRows[0]?.clubName || 'PlayHQ Football League'
  const league = await prisma.league.create({ data: {
    name: leagueName, shortName: leagueName, stateId: state.id, isActive: true, enabled: true, autoDiscovered: true,
    strengthScore: 60, strengthTier: 3, automaticStrengthRating: 3, finalStrengthRating: 3, strengthConfidence: 0.35,
    ...updateData,
  }, select: { id: true } })
  return { id: league.id, created: true }
}
async function ensureLeagueSource(leagueId: string, d: DiscoveredLeague, opts: Options) {
  const existing = await prisma.leagueSource.findFirst({ where: { leagueId, sourceType: opts.source, season: opts.season }, select: { id: true } })
  const data = { ladderUrl: d.ladderUrl, fixturesUrl: d.sourceUrl, resultsUrl: d.sourceUrl, isActive: true, lastStatus: 'RUNNING', notes: 'Controlled PlayHQ football bulk discovery/import.' }
  if (existing) return prisma.leagueSource.update({ where: { id: existing.id }, data })
  return prisma.leagueSource.create({ data: { leagueId, sourceType: opts.source, season: opts.season, ...data } })
}
async function review(leagueId: string | null, kind: string, reason: string, payload: unknown) {
  await prisma.reviewItem.create({ data: { entityType: 'FootballData', entityId: leagueId, kind, reason, confidence: 0.35, payload: JSON.stringify(payload) } }).catch(() => {})
}
async function ensureClub(name: string, leagueId: string, opts: Options): Promise<{ id: string; created: boolean } | null> {
  const state = await ensureState(opts.state)
  const trimmed = name.trim()
  if (!trimmed) return null
  const found = await prisma.club.findFirst({ where: { sport: 'FOOTBALL', archivedAt: null, name: { equals: trimmed, mode: 'insensitive' } }, select: { id: true } }).catch(() => null)
  let id = found?.id
  let created = false
  if (!id) {
    let slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'football-club'
    let candidate = `${slug}-${opts.state.toLowerCase()}`; let i = 1
    while (await prisma.club.findUnique({ where: { slug: candidate }, select: { id: true } }).catch(() => null)) candidate = `${slug}-${opts.state.toLowerCase()}-${++i}`
    const club = await prisma.club.create({ data: { name: trimmed, slug: candidate, stateId: state.id, sport: 'FOOTBALL', source: opts.source, isActive: true, approvalStatus: 'APPROVED' }, select: { id: true } })
    id = club.id; created = true
  }
  await prisma.clubLeagueSeason.upsert({
    where: { clubId_leagueId_season_grade: { clubId: id, leagueId, season: opts.season, grade: opts.grade } },
    create: { clubId: id, leagueId, season: opts.season, grade: opts.grade, sport: 'FOOTBALL', isActive: true },
    update: { sport: 'FOOTBALL', isActive: true },
  })
  return { id, created }
}
async function importLadderRows(leagueId: string, rows: LadderRow[], opts: Options, sourceUrl: string): Promise<{ imported: number; clubsCreated: number }> {
  let imported = 0, clubsCreated = 0
  for (const r of rows) {
    const club = await ensureClub(r.clubName, leagueId, opts)
    if (club?.created) clubsCreated++
    await prisma.footballLadderEntry.upsert({
      where: { leagueId_season_grade_clubName: { leagueId, season: opts.season, grade: opts.grade, clubName: r.clubName } },
      create: { leagueId, season: opts.season, grade: opts.grade, clubId: club?.id ?? null, clubName: r.clubName, position: r.position ?? imported + 1, played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0, pointsFor: r.pointsFor ?? 0, pointsAgainst: r.pointsAgainst ?? 0, percentage: r.percentage ?? 0, premiershipPoints: r.points ?? 0, sourceType: opts.source, verified: false },
      update: { clubId: club?.id ?? null, position: r.position ?? imported + 1, played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0, pointsFor: r.pointsFor ?? 0, pointsAgainst: r.pointsAgainst ?? 0, percentage: r.percentage ?? 0, premiershipPoints: r.points ?? 0, sourceType: opts.source },
    })
    if (club?.id) await prisma.clubLeagueSeason.update({ where: { clubId_leagueId_season_grade: { clubId: club.id, leagueId, season: opts.season, grade: opts.grade } }, data: { position: r.position, played: r.played ?? 0, wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0, goalsFor: r.pointsFor ?? 0, goalsAgainst: r.pointsAgainst ?? 0, percentage: r.percentage ?? 0, points: r.points ?? 0, byes: r.byes ?? 0, forfeits: r.forfeits ?? 0, disqualifications: r.disqualified ?? 0, adjustments: r.adjustedPoints ?? 0 } }).catch(() => {})
    imported++
  }
  await prisma.footballDataImport.upsert({
    where: { leagueId_sourceType_dataType_payloadHash: { leagueId, sourceType: opts.source, dataType: 'LADDER', payloadHash: stableHash({ sourceUrl, rows }) } },
    create: { leagueId, sourceType: opts.source, dataType: 'LADDER', sourceUrl, payloadHash: stableHash({ sourceUrl, rows }), dryRun: false, status: 'COMMITTED', recordsFound: rows.length, recordsImported: imported, confidence: rows.length ? 0.9 : 0, payload: JSON.stringify(rows), scrapedAt: new Date(), createdBy: opts.createdBy },
    update: { status: 'COMMITTED', recordsFound: rows.length, recordsImported: imported, confidence: rows.length ? 0.9 : 0, payload: JSON.stringify(rows), scrapedAt: new Date() },
  })
  return { imported, clubsCreated }
}
async function importResults(leagueId: string, rows: ResultRow[], opts: Options, sourceUrl: string): Promise<number> {
  let imported = 0
  for (const r of rows) {
    const home = await ensureClub(r.homeName, leagueId, opts), away = await ensureClub(r.awayName, leagueId, opts)
    const round = parseRoundNumber(r.round, 0)
    await prisma.footballResult.upsert({
      where: { leagueId_season_grade_round_homeName_awayName: { leagueId, season: opts.season, grade: opts.grade, round, homeName: r.homeName, awayName: r.awayName } },
      create: { leagueId, season: opts.season, grade: opts.grade, round, homeClubId: home?.id ?? null, awayClubId: away?.id ?? null, homeName: r.homeName, awayName: r.awayName, homeGoals: r.homeGoals ?? 0, homeBehinds: r.homeBehinds ?? 0, homePoints: r.homePoints ?? 0, awayGoals: r.awayGoals ?? 0, awayBehinds: r.awayBehinds ?? 0, awayPoints: r.awayPoints ?? 0, matchDate: r.matchDate ? new Date(r.matchDate) : null, venue: r.venue ?? null, sourceType: opts.source, sourceUrl, verified: false, published: false },
      update: { homeGoals: r.homeGoals ?? 0, homeBehinds: r.homeBehinds ?? 0, homePoints: r.homePoints ?? 0, awayGoals: r.awayGoals ?? 0, awayBehinds: r.awayBehinds ?? 0, awayPoints: r.awayPoints ?? 0, matchDate: r.matchDate ? new Date(r.matchDate) : null, venue: r.venue ?? null, sourceType: opts.source, sourceUrl },
    })
    imported++
  }
  return imported
}
async function importFixtures(leagueId: string, rows: FixtureRow[], opts: Options, sourceUrl: string): Promise<number> {
  let imported = 0
  for (const r of rows) {
    const home = await ensureClub(r.homeName, leagueId, opts), away = await ensureClub(r.awayName, leagueId, opts)
    const round = parseRoundNumber(r.round, 0)
    await prisma.footballFixture.upsert({
      where: { leagueId_season_grade_round_homeName_awayName: { leagueId, season: opts.season, grade: opts.grade, round, homeName: r.homeName, awayName: r.awayName } },
      create: { leagueId, season: opts.season, grade: opts.grade, round, homeClubId: home?.id ?? null, awayClubId: away?.id ?? null, homeName: r.homeName, awayName: r.awayName, matchDate: r.matchDate ? new Date(r.matchDate) : null, venue: r.venue ?? null, sourceType: opts.source, sourceUrl, verified: false },
      update: { matchDate: r.matchDate ? new Date(r.matchDate) : null, venue: r.venue ?? null, sourceType: opts.source, sourceUrl },
    })
    imported++
  }
  return imported
}
async function recordRoundImport(leagueId: string, dataType: 'FIXTURES' | 'RESULTS', rows: FixtureRow[] | ResultRow[], opts: Options, sourceUrl: string, imported: number, dryRun: boolean) {
  const payloadHash = stableHash({ sourceUrl, dataType, rows })
  await prisma.footballDataImport.upsert({
    where: { leagueId_sourceType_dataType_payloadHash: { leagueId, sourceType: opts.source, dataType, payloadHash } },
    create: { leagueId, sourceType: opts.source, dataType, sourceUrl, payloadHash, dryRun, status: dryRun ? 'PREVIEWED' : 'COMMITTED', recordsFound: rows.length, recordsImported: imported, confidence: rows.length ? 0.85 : 0, payload: JSON.stringify(rows), scrapedAt: new Date(), createdBy: opts.createdBy },
    update: { dryRun, status: dryRun ? 'PREVIEWED' : 'COMMITTED', recordsFound: rows.length, recordsImported: imported, confidence: rows.length ? 0.85 : 0, payload: JSON.stringify(rows), scrapedAt: new Date() },
  })
}
async function processLeague(d: DiscoveredLeague, opts: Options): Promise<LeagueReport> {
  const rep: LeagueReport = { name: d.name, sourceUrl: d.sourceUrl, ladderUrl: d.ladderUrl, status: opts.dryRun ? 'DRY_RUN' : 'SUCCESS', createdLeague: false, clubsParsed: 0, clubsCreated: 0, ladderRowsParsed: 0, ladderRowsImported: 0, fixturesParsed: 0, fixturesImported: 0, resultsParsed: 0, resultsImported: 0, reviews: 0, warnings: [] }
  try {
    const page = await fetchPage(d.ladderUrl, 45_000)
    const ladder = parseLadder(page)
    rep.ladderRowsParsed = ladder.rows.length
    rep.clubsParsed = new Set(ladder.rows.map(r => r.clubName.toLowerCase())).size
    rep.warnings.push(...ladder.warnings)
    if (!ladder.rows.length) {
      rep.status = 'SKIPPED'; rep.warnings.push('No ladder rows parsed.');
      if (!opts.dryRun) await review(null, 'FOOTBALL_URL_NO_DATA', `Bulk discovery ladder had no parseable rows: ${d.ladderUrl}`, { ladderUrl: d.ladderUrl, warnings: ladder.warnings })
      return rep
    }
    if (opts.dryRun) {
      await previewRounds(d, opts, rep)
      return rep
    }
    const league = await ensureLeague(d, opts, ladder.rows)
    rep.leagueId = league.id; rep.createdLeague = league.created
    await ensureLeagueSource(league.id, d, opts)
    const imported = await importLadderRows(league.id, ladder.rows, opts, d.ladderUrl)
    rep.ladderRowsImported = imported.imported; rep.clubsCreated += imported.clubsCreated
    await importRounds(league.id, d, opts, rep, false)
    await prisma.league.update({ where: { id: league.id }, data: { syncStatus: 'SUCCESS', lastSuccessfulSyncAt: new Date(), lastSyncAt: new Date(), dataSourceSyncError: null } }).catch(() => {})
    await prisma.leagueSource.updateMany({ where: { leagueId: league.id, sourceType: opts.source, season: opts.season }, data: { lastStatus: 'SUCCESS', lastScrapedAt: new Date() } }).catch(() => {})
    return rep
  } catch (e) {
    rep.status = 'FAILED'; rep.error = String(e); rep.warnings.push(String(e))
    if (!opts.dryRun) await review(rep.leagueId ?? null, 'FOOTBALL_BULK_IMPORT_FAILED', `Bulk PlayHQ football import failed for ${d.name}`, { discovered: d, error: String(e) })
    return rep
  }
}
async function previewRounds(d: DiscoveredLeague, opts: Options, rep: LeagueReport) { await importRounds(null, d, opts, rep, true) }
async function importRounds(leagueId: string | null, d: DiscoveredLeague, opts: Options, rep: LeagueReport, dryRun: boolean) {
  for (let round = 1; round <= opts.roundLimit; round++) {
    const url = roundUrlFromLadder(d.ladderUrl, round)
    const page: FetchedPage = await fetchPage(url, 45_000)
    if (!page.ok) continue
    const results = parseResults(page), fixtures = parseFixtures(page)
    rep.resultsParsed += results.rows.length; rep.fixturesParsed += fixtures.rows.length
    if (leagueId && (results.rows.length || fixtures.rows.length)) {
      const rImported = await importResults(leagueId, results.rows, opts, url)
      const fImported = await importFixtures(leagueId, fixtures.rows, opts, url)
      rep.resultsImported += rImported; rep.fixturesImported += fImported
      await recordRoundImport(leagueId, 'RESULTS', results.rows, opts, url, rImported, dryRun)
      await recordRoundImport(leagueId, 'FIXTURES', fixtures.rows, opts, url, fImported, dryRun)
    }
  }
}

export async function runBulkFootballDiscovery(opts = parseOptions()): Promise<RunReport> {
  process.env.PLAYFOOTY_RENDER_PLAYHQ = process.env.PLAYFOOTY_RENDER_PLAYHQ ?? '1'
  const discovered = await discoverLaddersFromSeeds(opts)
  const report: RunReport = { options: opts, discovered: discovered.length, processed: 0, skipped: 0, succeeded: 0, failed: 0, dryRun: opts.dryRun, ranking: { attempted: false, success: false, clubsRanked: 0 }, leagues: [] }
  for (const d of discovered) {
    const r = await processLeague(d, opts)
    report.leagues.push(r); report.processed++
    if (r.status === 'SUCCESS' || r.status === 'DRY_RUN') report.succeeded++
    else if (r.status === 'SKIPPED') report.skipped++
    else report.failed++
  }
  const importedAny = report.leagues.some(l => l.ladderRowsImported > 0)
  if (!opts.dryRun && importedAny) {
    report.ranking.attempted = true
    try {
      const { rankAndStore } = await import('./playhq-scrape.js')
      const { getISOWeekLabel } = await import('../utils/week-label.js')
      const ranked = await rankAndStore(getISOWeekLabel())
      report.ranking.success = true; report.ranking.clubsRanked = ranked.clubsRanked
      await prisma.league.updateMany({ where: { id: { in: report.leagues.map(l => l.leagueId).filter((id): id is string => !!id) } }, data: { strengthCalculatedAt: new Date() } }).catch(() => {})
    } catch (e) { report.ranking.error = String(e) }
  }
  return report
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBulkFootballDiscovery().then(async report => {
    console.log(JSON.stringify(report, null, 2))
    await prisma.$disconnect()
    if (report.failed > 0) process.exitCode = 1
  }).catch(async e => { console.error(e); await prisma.$disconnect().catch(() => {}); process.exit(1) })
}
