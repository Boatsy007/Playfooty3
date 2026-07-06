/**
 * Country Footy Scores → NetballConnect (Squadi) scraper
 * ─────────────────────────────────────────────────────────────────────────────
 * countryfootyscores.com/netball-scoreboard.html is a directory of Victorian
 * country football-netball leagues. Each league page embeds a NetballConnect
 * livescore widget backed by the Squadi API (api-netball.squadi.com).
 *
 * Pipeline per league:
 *   1. Read the league page's embedded widget → organisationKey.
 *   2. Capture the widget's auth token, list the org's competitions, and pick the
 *      CURRENT-season home-and-away league competition (never a rep tournament,
 *      carnival or lightning premiership).
 *   3. List that competition's divisions and pick the PREMIER SENIOR WOMEN'S
 *      grade only (A Grade / top Open / Division 1) — rejecting juniors, age
 *      groups, mixed, men's, all-abilities, reserves and lower divisions.
 *   4. Scrape that division's rendered public ladder (full W/L/GF/GA stats).
 *
 * Returns structured leagues; writes nothing (import handled separately). Runs
 * under Playwright/Chromium on GitHub Actions.
 */

import { logger } from '../utils/logger.js'

const CF_SCOREBOARD = 'https://www.countryfootyscores.com/netball-scoreboard.html'
const REG = 'https://registration.netballconnect.com'
const API = 'https://api-netball.squadi.com'
const NAV_TIMEOUT = 45_000

export interface CFLadderEntry {
  rank: number; teamRaw: string; played: number; wins: number; losses: number; draws: number
  goalsFor: number; goalsAgainst: number; percentage: number; points: number
}
export interface CFLeague {
  leagueName: string          // Country Footy league label, e.g. "Hampden"
  cfPath: string              // /hampden-netball.html
  orgKey: string              // NetballConnect organisationKey
  competitionId: number
  competitionKey: string
  competitionName: string
  divisionId: number
  divisionName: string        // the selected premier senior women's grade
  season: string              // e.g. "2026"
  ladderUrl: string
  entries: CFLadderEntry[]
}

// ─── Grade eligibility (A Grade / premier senior women's only) ────────────────

const norm = (s: string) => (s || '').toLowerCase()

/** Reject any non-premier / non-senior-women division. */
export function isIneligibleDivision(name: string): boolean {
  const n = norm(name)
  return (
    /\b\d{1,2}\s*(?:&|and)?\s*under\b/.test(n) ||          // 13 & Under
    /\bu\/?\s*\d{1,2}\b/.test(n) || /\b\d{1,2}\s*\/\s*u\b/.test(n) || // U15, 15/U
    /\bunder\s*\d{1,2}\b/.test(n) ||
    /\bmixed\b|\bmen\b|\bmens\b|\bboys\b|\bmale\b/.test(n) ||
    /\ball abilities\b|\bwheelchair\b|\bnet ?set|\bnsg\b|\bjunior|\bprimary|\bmini/.test(n) ||
    /\breserve|\breserves\b/.test(n) ||
    /\b(?:b|c|d|e)\s*grade\b/.test(n) || /\bgrade\s*[b-e]\b/.test(n) ||
    /\bopen\s*[b-z]\b/.test(n) ||
    /\bdivision\s*(?!1\b)[2-9]\b|\bdiv\s*(?!1\b)[2-9]\b|\bsection\s*[2-9]\b/.test(n) ||
    /\bpool\s*(?!1\b)[2-9]\b/.test(n)                       // keep only Pool 1 among pools
  )
}

/** Score a division so the premier senior women's grade sorts first. Higher = better. */
function seniorScore(name: string): number {
  const n = norm(name)
  let s = 0
  if (/\ba\s*grade\b|\ba\/1\b|\bgrade\s*a\b/.test(n)) s += 100
  if (/\bdivision\s*1\b|\bdiv\s*1\b|\bsection\s*1\b/.test(n)) s += 80
  if (/\bopen\b/.test(n)) s += 60
  if (/\bsenior\b/.test(n)) s += 50
  if (/\bpremier\b/.test(n)) s += 40
  if (/\bpool\s*1\b/.test(n)) s += 20
  if (/\bwomen\b|\bladies\b|\bfemale\b/.test(n)) s += 10
  return s
}

/** Pick the single premier senior women's division, or null if none qualifies. */
export function pickPremierDivision(divisions: { id: number; name: string }[]): { id: number; name: string } | null {
  const eligible = divisions.filter(d => !isIneligibleDivision(d.name))
  if (eligible.length === 0) return null
  const ranked = [...eligible].sort((a, b) => seniorScore(b.name) - seniorScore(a.name) || a.name.localeCompare(b.name))
  // Require a positive senior signal so we never import an ambiguous grade.
  return seniorScore(ranked[0].name) > 0 ? ranked[0] : null
}

/** A competition is a real home-and-away league season, not a one-off event. */
function isLeagueCompetition(name: string): boolean {
  const n = norm(name)
  if (/tournament|representative|\brep\b|carnival|lightning|gala|knockout|cup only|festival|academy|trial/.test(n)) return false
  return /netball|football|league|association|fnl|fna|nfl/.test(n)
}

// ─── Squadi API (needs the widget's auth token) ───────────────────────────────

async function api<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: token, Accept: 'application/json', 'User-Agent': 'PlayFooty-Rankings/1.0 (hello@playfooty.com.au)' },
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch { return null }
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function scrapeCountryFooty(opts: { leagueFilter?: string[]; maxLeagues?: number } = {}): Promise<CFLeague[]> {
  const filter = (opts.leagueFilter ?? []).map(s => s.toLowerCase()).filter(Boolean)
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] })
  const out: CFLeague[] = []
  try {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' })
    const page = await ctx.newPage()

    // Capture the Squadi auth token the widget sends (needed for the API).
    let token = ''
    page.on('request', req => {
      if (!token && /squadi\.com/.test(req.url())) {
        const h = req.headers(); const a = h['authorization'] || h['Authorization']
        if (a && a.length > 20) token = a
      }
    })

    // 1) League directory
    let leagues = await collectLeagueLinks(page)
    if (filter.length) leagues = leagues.filter(l => filter.some(f => l.name.toLowerCase().includes(f) || l.path.toLowerCase().includes(f)))
    if (opts.maxLeagues) leagues = leagues.slice(0, opts.maxLeagues)
    logger.info('CountryFooty: leagues to process', { count: leagues.length })

    for (const lg of leagues) {
      try {
        const league = await scrapeOneLeague(page, lg, () => token)
        if (league) out.push(league)
      } catch (err) {
        logger.warn('CountryFooty: league failed', { league: lg.name, detail: String(err) })
      }
    }
    return out
  } finally {
    await browser.close()
  }
}

/** Read the scoreboard hub and return each league's label + results-page path. */
async function collectLeagueLinks(page: import('playwright').Page): Promise<{ name: string; path: string }[]> {
  try { await page.goto(CF_SCOREBOARD, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }) } catch { /* */ }
  await page.waitForTimeout(3000)
  const links = await page.$$eval('a[href$="-netball.html"], a[href*="netball"]', els =>
    els.map(a => ({ name: (a.textContent || '').replace(/\s+/g, ' ').trim(), path: a.getAttribute('href') || '' }))
       .filter(l => /-netball(-\d)?\.html$/.test(l.path) && !/scoreboard/.test(l.path)))
  const seen = new Set<string>()
  return links.filter(l => (seen.has(l.path) ? false : (seen.add(l.path), true)) && l.name.length > 1)
}

/** Full pipeline for one league page → premier senior women's ladder. */
async function scrapeOneLeague(
  page: import('playwright').Page,
  lg: { name: string; path: string },
  getToken: () => string,
): Promise<CFLeague | null> {
  const url = lg.path.startsWith('http') ? lg.path : `https://www.countryfootyscores.com${lg.path}`

  // Read the embedded NetballConnect widget's org key (+ the stale embed comp).
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT }) } catch { /* */ }
  await page.waitForTimeout(5000)
  const iframeSrc = await page.$$eval('iframe', els => els.map(f => f.getAttribute('src') || '').find(s => /netballconnect|livescore/i.test(s)) || '')
  if (!iframeSrc) { logger.info('CountryFooty: no widget', { league: lg.name }); return null }
  const orgKey = new URL(iframeSrc).searchParams.get('organisationKey') || ''
  if (!orgKey) return null

  // Load the widget so it authenticates (captures the token via the request hook).
  try { await page.goto(iframeSrc, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT }) } catch { /* */ }
  await page.waitForTimeout(4000)
  const token = getToken()
  if (!token) { logger.warn('CountryFooty: no auth token captured', { league: lg.name }); return null }

  // Find the current-season home-and-away competition for this org.
  const comp = await pickCurrentCompetition(orgKey, token)
  if (!comp) { logger.info('CountryFooty: no eligible current competition', { league: lg.name }); return null }

  // Pick the premier senior women's division.
  const divisions = await api<any[]>(`/livescores/division?competitionKey=${comp.uniqueKey}`, token)
  if (!Array.isArray(divisions) || divisions.length === 0) return null
  const premier = pickPremierDivision(divisions.map(d => ({ id: d.id, name: `${d.name} ${d.divisionName ?? ''} ${d.grade ?? ''}` })))
  if (!premier) { logger.info('CountryFooty: no premier senior womens division', { league: lg.name, comp: comp.name }); return null }
  const div = divisions.find(d => d.id === premier.id)!

  // Scrape the rendered public ladder for that division.
  const ladderUrl = `${REG}/livescorePublicLadder?organisationKey=${orgKey}&competitionId=${comp.id}&yearId=${comp.yearRefId ?? ''}&competitionUniqueKey=${comp.uniqueKey}&divisionId=${div.id}`
  const entries = await scrapeLadderTable(page, ladderUrl)
  if (entries.length < 4) { logger.info('CountryFooty: ladder too small', { league: lg.name, entries: entries.length }); return null }

  const season = (comp.name.match(/20\d{2}/)?.[0]) ?? String(new Date().getFullYear())
  logger.info('CountryFooty: league scraped', { league: lg.name, comp: comp.name, division: div.name, teams: entries.length })
  return {
    leagueName: lg.name, cfPath: lg.path, orgKey,
    competitionId: comp.id, competitionKey: comp.uniqueKey, competitionName: comp.name,
    divisionId: div.id, divisionName: `${div.name}`, season, ladderUrl, entries,
  }
}

/** Choose the org's current-season home-and-away league competition. */
async function pickCurrentCompetition(orgKey: string, token: string): Promise<any | null> {
  // Years newest-first.
  const years = await api<any[]>(`/common/common/reference/year?organisationUniqueKey=${orgKey}&scope=1`, token)
  const yearIds = Array.isArray(years)
    ? years.map(y => ({ id: y.id, year: Number(y.description) })).filter(y => y.year >= 2024).sort((a, b) => b.year - a.year).map(y => y.id)
    : []
  for (const yearRefId of yearIds) {
    const comps = await api<any[]>(`/livescores/competitions/list?organisationUniqueKey=${orgKey}&yearRefId=${yearRefId}`, token)
    if (!Array.isArray(comps)) continue
    const leagueComps = comps.filter(c => isLeagueCompetition(c.name))
    // Prefer an in-progress/most-recent competition.
    const chosen = leagueComps.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]
    if (chosen) return { ...chosen, yearRefId }
  }
  return null
}

/** Navigate the rendered public-ladder page and parse its standings table. */
async function scrapeLadderTable(page: import('playwright').Page, ladderUrl: string): Promise<CFLadderEntry[]> {
  try { await page.goto(ladderUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT }) } catch { /* */ }
  await page.waitForTimeout(5000)
  const rows: string[][] = await page.$$eval('table tr', (trs: any[]) =>
    trs.map((r: any) => Array.from(r.querySelectorAll('th,td')).map((c: any) => (c.textContent || '').trim())))
  const out: CFLadderEntry[] = []
  // Header: Rank | Team | P | W | L | D | B | FW | FL | F | A | PTS | GA% | ...
  for (const cells of rows) {
    if (cells.length < 12) continue
    const rank = parseInt(cells[0], 10)
    if (!Number.isFinite(rank)) continue
    const num = (i: number) => { const v = parseInt(cells[i], 10); return Number.isFinite(v) ? v : 0 }
    const gf = num(9), ga = num(10)
    const team = cells[1]
    if (!team || /^team$/i.test(team)) continue
    out.push({
      rank, teamRaw: team, played: num(2), wins: num(3), losses: num(4), draws: num(5),
      goalsFor: gf, goalsAgainst: ga, percentage: ga > 0 ? parseFloat(((gf / ga) * 100).toFixed(2)) : 100, points: num(11),
    })
  }
  return out
}
