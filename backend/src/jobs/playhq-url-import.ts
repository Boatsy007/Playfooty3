/**
 * PlayHQ URL Import + League Sync (Phase 1 + Phase 10)
 * ─────────────────────────────────────────────────────────────────────────────
 * Paste ANY PlayHQ URL → the importer classifies it (association / competition /
 * season / grade / ladder), resolves the A-Grade Senior Women's ladder, scrapes
 * it, and upserts the league + clubs + ladder — then re-ranks nationally.
 *
 * The PlayHQ URL is stored PERMANENTLY on the league (playhqOrgSlug / gradeId /
 * ladderUrl / sourceUrl), so the weekly workflow is just "Sync League": re-scrape
 * the stored URL, refresh the ladder + rankings, and leave every manual edit,
 * manual override, logo and piece of league metadata untouched.
 *
 * Builds on the existing proven pieces — it does NOT replace them:
 *   • parsePlayHQUrl        (deterministic URL classifier)
 *   • resolveAGradeLeagues  (association → A-Grade ladder resolver, Playwright)
 *   • PlayHQPlaywrightAdapter.scrapeLadder (ladder scraper w/ __NEXT_DATA__ fast path)
 *   • validateClubIdentity  (real-town / anonymous-name guard)
 *   • rankAndStore          (the untouched ranking engine)
 *
 * Every import/sync returns a validation report (clubs added/updated, ladder
 * updated, ranking recalculated, confidence, warnings). Nothing uncertain is
 * published silently — anonymous/ambiguous clubs raise ReviewItems.
 */

import { prisma }                  from '../db/client.js'
import { PlayHQPlaywrightAdapter } from '../adapters/playhq-playwright.adapter.js'
import { rankAndStore }            from './playhq-scrape.js'
import { parsePlayHQUrl }          from '../discovery/playhq-url.js'
import { resolveAGradeLeagues, type DiscoveredLeague, type DiscoveredAssociation } from '../discovery/playhq-discovery.js'
import { validateClubIdentity, canonicalClubKey } from '../validation/club-identity.js'
import { computeAutomaticStrength, finalStrength, strengthScoreFromRating } from '../config/league-strength-auto.js'
import { overrideForLeague }       from '../config/league-overrides.js'
import { getISOWeekLabel }         from '../utils/week-label.js'
import { logger }                  from '../utils/logger.js'

const GRADE  = 'A Grade'
const SEASON = '2026'

export interface ImportReport {
  status:       'SUCCESS' | 'NO_DATA' | 'FAILED'
  url?:         string
  kind?:        string
  league?:      string
  leagueId?:    string
  isNew?:       boolean
  clubsAdded:   number
  clubsUpdated: number
  ladderRows:   number
  ladderUpdated: boolean
  rankingRecalculated: boolean
  clubsRanked:  number
  confidence:   number
  warnings:     string[]
  reviewsRaised: number
  error?:       string
}

function emptyReport(status: ImportReport['status']): ImportReport {
  return { status, clubsAdded: 0, clubsUpdated: 0, ladderRows: 0, ladderUpdated: false, rankingRecalculated: false, clubsRanked: 0, confidence: 0, warnings: [], reviewsRaised: 0 }
}

// ─── Public: import from a pasted PlayHQ URL ──────────────────────────────────

export async function importFromUrl(rawUrl: string, opts: { rerank?: boolean } = {}): Promise<ImportReport> {
  const parsed = parsePlayHQUrl(rawUrl)
  if (!parsed.ok || !parsed.orgSlug) {
    return { ...emptyReport('FAILED'), url: rawUrl, error: parsed.warnings.join('; ') || 'Could not parse PlayHQ URL' }
  }
  logger.info('URLImport: parsed', { kind: parsed.kind, orgSlug: parsed.orgSlug, gradeId: parsed.gradeId })

  const adapter = new PlayHQPlaywrightAdapter()
  const warnings = [...parsed.warnings]

  // A discovered-league shape to persist. For a direct ladder URL we can scrape
  // immediately; otherwise we resolve the association's A-Grade ladder(s).
  let discovered: DiscoveredLeague[] = []

  if (parsed.kind === 'LADDER' && parsed.ladderUrl) {
    // Direct ladder — derive a minimal DiscoveredLeague; league/association name
    // is refined from the org slug (title-cased) until the ladder tells us more.
    discovered = [{
      associationName: titleFromSlug(parsed.orgSlug),
      associationSlug: parsed.orgSlug,
      state:           null,
      leagueName:      titleFromSlug(parsed.orgSlug),
      gradeName:       parsed.gradeSlug ? titleFromSlug(parsed.gradeSlug) : 'A Grade',
      gradeId:         parsed.gradeId ?? '',
      season:          `Winter ${SEASON}`,
      ladderUrl:       parsed.ladderUrl,
      teams:           0,
    }]
  } else {
    // Association / competition / grade page → resolve A-Grade ladder(s) with a browser.
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] })
    try {
      const ctx  = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })
      const page = await ctx.newPage()
      const assoc: DiscoveredAssociation = {
        name: titleFromSlug(parsed.orgSlug), url: parsed.associationUrl ?? `https://www.playhq.com/netball-australia/org/${parsed.orgSlug}`,
        slug: parsed.orgSlug, logo: null, state: null, region: null,
      }
      discovered = await resolveAGradeLeagues(page, assoc)
    } finally {
      await browser.close()
    }
    if (discovered.length === 0) {
      return { ...emptyReport('NO_DATA'), url: rawUrl, kind: parsed.kind, warnings: [...warnings, 'No Senior Women\'s A Grade ladder resolved for this association/competition.'] }
    }
  }

  // Persist the first resolved league (URL import targets one competition).
  const dl = discovered[0]
  const report = await persistLeagueLadder(adapter, dl, rawUrl)
  report.kind = parsed.kind
  report.warnings.push(...warnings)

  // Re-rank nationally unless caller defers it (batch imports).
  if (opts.rerank !== false && report.status === 'SUCCESS') {
    const { clubsRanked } = await rankAndStore(getISOWeekLabel())
    report.rankingRecalculated = true
    report.clubsRanked = clubsRanked
  }
  return report
}

// ─── Public: sync an already-imported league (weekly workflow) ────────────────

export async function syncLeague(leagueId: string, opts: { rerank?: boolean } = {}): Promise<ImportReport> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) return { ...emptyReport('FAILED'), error: 'League not found' }

  const ladderUrl = league.ladderUrlOverride || league.ladderUrl || league.sourceUrl
  if (!ladderUrl) return { ...emptyReport('FAILED'), leagueId, league: league.name, error: 'No stored PlayHQ URL on this league — import it once by URL first.' }

  const dl: DiscoveredLeague = {
    associationName: league.name, associationSlug: league.playhqOrgSlug ?? '', state: null,
    leagueName: league.name, gradeName: league.playhqGradeName ?? 'A Grade', gradeId: league.playhqGradeId ?? '',
    season: league.currentSeason ?? `Winter ${SEASON}`, ladderUrl, teams: 0,
  }
  const adapter = new PlayHQPlaywrightAdapter()
  const report = await persistLeagueLadder(adapter, dl, ladderUrl, { syncOnly: true, existingLeagueId: league.id })

  if (opts.rerank !== false && report.status === 'SUCCESS') {
    const { clubsRanked } = await rankAndStore(getISOWeekLabel())
    report.rankingRecalculated = true
    report.clubsRanked = clubsRanked
  }
  return report
}

// ─── Shared persistence: scrape a ladder → upsert league/clubs/ladder ─────────
// Mirrors discovery-import.importLeague but adds club-identity validation, review
// queue population, and permanent URL storage. Respects manual overrides and, in
// syncOnly mode, never touches league metadata/logo/strength override.

async function persistLeagueLadder(
  adapter: PlayHQPlaywrightAdapter,
  dl: DiscoveredLeague,
  sourceUrl: string,
  opts: { syncOnly?: boolean; existingLeagueId?: string } = {},
): Promise<ImportReport> {
  const report = emptyReport('SUCCESS')
  report.url = sourceUrl

  // Scrape first — if the ladder is empty we bail without mutating anything.
  const scraped = await adapter.scrapeLadder(dl.ladderUrl)
  if (scraped.entries.length === 0) {
    if (opts.existingLeagueId) await prisma.league.update({ where: { id: opts.existingLeagueId }, data: { syncError: 'Ladder scrape returned 0 entries', lastSyncedAt: new Date() } })
    return { ...report, status: 'NO_DATA', warnings: ['Ladder scrape returned 0 entries — page structure may have changed, or wrong URL.'] }
  }
  report.ladderRows = scraped.entries.length

  // State + association
  const stateCode = dl.state ?? 'VIC'
  const state = await prisma.state.upsert({ where: { code: stateCode }, create: { code: stateCode, name: stateCode }, update: {} })
  const association = dl.associationSlug
    ? await prisma.association.upsert({
        where:  { playhqOrgSlug: dl.associationSlug },
        create: { name: dl.associationName, playhqOrgSlug: dl.associationSlug, playhqUrl: `https://www.playhq.com/netball-australia/org/${dl.associationSlug}`, stateCode: dl.state, active: true, lastDiscoveredAt: new Date() },
        update: { lastDiscoveredAt: new Date() },
      })
    : null

  // Locate the league. Prefer an explicit id (sync), then PlayHQ keys, then name.
  let league =
    (opts.existingLeagueId ? await prisma.league.findUnique({ where: { id: opts.existingLeagueId } }) : null) ||
    (dl.associationSlug ? await prisma.league.findFirst({ where: { playhqOrgSlug: dl.associationSlug } }) : null) ||
    (await prisma.league.findFirst({ where: { name: dl.associationName } }))
  const isNew = !league
  report.isNew = isNew

  if (!league) {
    league = await prisma.league.create({
      data: {
        name: dl.associationName, shortName: dl.associationName, stateId: state.id, associationId: association?.id ?? null,
        isActive: true, enabled: true, autoDiscovered: true, needsStrengthReview: false,
        strengthScore: 60, strengthTier: 3, automaticStrengthRating: 3.0, finalStrengthRating: 3.0, strengthConfidence: 0.3,
        strengthNotes: 'Imported by PlayHQ URL — strength calculated from ladder data.',
        playhqOrgSlug: dl.associationSlug || null, playhqGradeId: dl.gradeId || null, playhqGradeName: dl.gradeName,
        ladderUrl: dl.ladderUrl, sourceUrl, currentSeason: dl.season, lastSyncedAt: new Date(),
      },
    })
  } else if (opts.syncOnly) {
    // Sync: refresh ONLY the sync-related fields; leave name/logo/metadata/strength override untouched.
    league = await prisma.league.update({ where: { id: league.id }, data: { lastSyncedAt: new Date(), syncError: null, lastManualUpdateAt: league.lastManualUpdateAt } })
  } else {
    if (league.manualOverride && !opts.existingLeagueId) {
      report.warnings.push('League is manual-override protected — ladder refreshed but metadata preserved.')
    }
    // Attach/refresh PlayHQ ownership + store the URL permanently (metadata preserved).
    league = await prisma.league.update({
      where: { id: league.id },
      data: {
        associationId: association?.id ?? league.associationId, autoDiscovered: true, isActive: true,
        playhqOrgSlug: dl.associationSlug || league.playhqOrgSlug, playhqGradeId: dl.gradeId || league.playhqGradeId,
        playhqGradeName: dl.gradeName || league.playhqGradeName, ladderUrl: dl.ladderUrl, sourceUrl,
        currentSeason: dl.season, lastSyncedAt: new Date(), syncError: null,
      },
    })
  }
  report.league = league.name
  report.leagueId = league.id

  // ── Strength (respect manual override; never recompute override in syncOnly) ──
  const auto = computeAutomaticStrength(scraped.entries, 1)
  report.confidence = auto.confidence
  const override = league.manualStrengthOverride ?? (opts.syncOnly ? null : overrideForLeague(league.name, dl.leagueName))
  const final = finalStrength(auto.rating, override)
  await prisma.league.update({
    where: { id: league.id },
    data: {
      automaticStrengthRating: auto.rating,
      ...(opts.syncOnly ? {} : { manualStrengthOverride: override }),
      finalStrengthRating: final, strengthConfidence: auto.confidence,
      strengthScore: strengthScoreFromRating(final), strengthTier: Math.max(1, Math.min(5, Math.round(final))),
    },
  })

  // ── League source (PLAYHQ) so the ranking engine includes this league ──
  const existingSource = await prisma.leagueSource.findFirst({ where: { leagueId: league.id, season: SEASON, sourceType: 'PLAYHQ' } })
  if (!existingSource) await prisma.leagueSource.create({ data: { leagueId: league.id, sourceType: 'PLAYHQ', season: SEASON, isActive: true, ladderUrl: dl.ladderUrl, notes: `Imported by URL (${scraped.method}).`, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })
  else await prisma.leagueSource.update({ where: { id: existingSource.id }, data: { ladderUrl: dl.ladderUrl, isActive: true, lastStatus: 'SUCCESS', lastScrapedAt: new Date() } })

  // ── Clubs + ladder, with real-town / anonymous-name validation ──
  const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (dl.associationSlug || 'league')
  const clubIds: string[] = []
  for (const e of scraped.entries) {
    const verdict = validateClubIdentity(e.teamRaw)
    const displayName = verdict.canonical ?? e.teamRaw
    const slug = slugify(displayName)

    const existing = await prisma.club.findUnique({ where: { slug }, select: { id: true } })
    const club = await prisma.club.upsert({
      where:  { slug },
      create: { name: displayName, slug, shortName: e.teamRaw, stateId: state.id, region: dl.leagueName, townName: verdict.isAnonymous ? null : displayName, isActive: true, source: 'PLAYHQ_URL', approvalStatus: verdict.verdict === 'VALID' ? 'APPROVED' : 'PENDING' },
      update: {},   // never overwrite manual club edits
      select: { id: true },
    })
    if (existing) report.clubsUpdated++; else report.clubsAdded++
    clubIds.push(club.id)

    // Record the raw name as an alias/variant for future duplicate detection.
    await prisma.clubNameVariant.upsert({
      where:  { rawName_sourceType: { rawName: e.teamRaw, sourceType: 'PLAYHQ' } },
      create: { clubId: club.id, rawName: e.teamRaw, sourceType: 'PLAYHQ', confidence: verdict.confidence },
      update: {},
    }).catch(() => {})

    // Anything not clearly a real club → review queue (never blocks the import).
    if (verdict.verdict !== 'VALID') {
      await prisma.reviewItem.create({ data: {
        entityType: 'Club', entityId: club.id, kind: verdict.isAnonymous ? 'ANONYMOUS_CLUB' : 'UNCERTAIN_CLUB',
        reason: `${verdict.reason} — "${e.teamRaw}" in ${league.name}`, confidence: verdict.confidence,
        payload: JSON.stringify({ raw: e.teamRaw, leagueId: league.id, canonicalKey: canonicalClubKey(e.teamRaw) }),
      } }).catch(() => {})
      report.reviewsRaised++
    }

    await prisma.clubLeagueSeason.upsert({
      where:  { clubId_leagueId_season_grade: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE } },
      create: { clubId: club.id, leagueId: league.id, season: SEASON, grade: GRADE, isActive: true, position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
      update: { position: e.rank, played: e.played, wins: e.wins, losses: e.losses, draws: e.draws, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, percentage: e.percentage, points: e.points },
    })
  }
  // Prune teams no longer on the ladder (keeps the season accurate).
  await prisma.clubLeagueSeason.deleteMany({ where: { leagueId: league.id, season: SEASON, grade: GRADE, clubId: { notIn: clubIds } } })
  report.ladderUpdated = true

  logger.info('URLImport: league persisted', { league: league.name, teams: clubIds.length, added: report.clubsAdded, updated: report.clubsUpdated, reviews: report.reviewsRaised })
  return report
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}
