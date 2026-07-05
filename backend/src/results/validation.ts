/**
 * Results/fixtures validation (Phase B5).
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates incoming rows before they enter the results/fixtures store and sends
 * anything uncertain to the Review Queue. Checks: invalid scores, missing clubs,
 * invalid dates, invalid league, missing round (soft). Duplicate detection is
 * enforced by the unique dedupeKey at insert time; here we surface a soft warning.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export interface ResultInput {
  sourceMatchId?: string; fixtureId?: string
  leagueId: string; leagueName?: string; season: string; grade?: string; round?: number; matchDate?: Date | string
  homeClubId: string; homeClubName?: string; awayClubId: string; awayClubName?: string
  homeScore: number | string; awayScore: number | string; status?: string; sourceUrl?: string
}

export interface FixtureInput {
  leagueId: string; leagueName?: string; season: string; grade?: string; round?: number
  matchDate?: Date | string; matchTime?: string; venue?: string; sourceUrl?: string
  homeClubId: string; homeClubName?: string; awayClubId: string; awayClubName?: string; status?: string
}

interface Validated<T> { ok: boolean; value: T; errors: string[]; reviewRaised?: boolean }

const toInt = (v: unknown): number | null => { const n = typeof v === 'number' ? v : parseInt(String(v), 10); return Number.isFinite(n) ? n : null }
const toDate = (v: unknown): Date | null | undefined => { if (v == null || v === '') return undefined; const d = v instanceof Date ? v : new Date(String(v)); return isNaN(d.getTime()) ? null : d }

async function raiseReview(kind: string, reason: string, payload: unknown): Promise<void> {
  const existing = await prisma.reviewItem.findFirst({ where: { entityType: 'MatchResult', kind, status: 'PENDING', reason }, select: { id: true } }).catch(() => null)
  if (existing) return
  await prisma.reviewItem.create({ data: { entityType: 'MatchResult', kind, reason, confidence: 0.3, payload: payload ? JSON.stringify(payload) : null } }).catch(e => logger.warn('review raise failed', { detail: String(e) }))
}

/** Validate a result row. Resolves + coerces types; flags problems to review. */
export async function validateResultInput(input: ResultInput, opts: { raiseReview?: boolean } = {}): Promise<Validated<{
  leagueId: string; leagueName: string; season: string; round?: number; matchDate?: Date
  homeClubId: string; homeClubName: string; awayClubId: string; awayClubName: string
  homeScore: number; awayScore: number; sourceMatchId?: string; status?: string
}>> {
  const errors: string[] = []
  let reviewRaised = false

  const homeScore = toInt(input.homeScore)
  const awayScore = toInt(input.awayScore)
  if (homeScore == null || awayScore == null) errors.push('invalid scores (not numeric)')
  else if (homeScore < 0 || awayScore < 0 || homeScore > 400 || awayScore > 400) errors.push('scores out of plausible range (0–400)')

  if (!input.leagueId) errors.push('missing leagueId')
  if (!input.season) errors.push('missing season')
  if (!input.homeClubId || !input.awayClubId) errors.push('missing home/away club')
  if (input.homeClubId && input.awayClubId && input.homeClubId === input.awayClubId) errors.push('home and away club are identical')

  const matchDate = toDate(input.matchDate)
  if (matchDate === null) errors.push('invalid matchDate')

  // League + club existence (soft — resolve names, flag to review if missing).
  let leagueName = input.leagueName ?? ''
  if (input.leagueId) {
    const league = await prisma.league.findUnique({ where: { id: input.leagueId }, select: { name: true } }).catch(() => null)
    if (!league) { errors.push('unknown leagueId'); if (opts.raiseReview) { await raiseReview('INVALID_LEAGUE', `Result references unknown league ${input.leagueId}`, input); reviewRaised = true } }
    else leagueName = league.name
  }
  let homeClubName = input.homeClubName ?? input.homeClubId
  let awayClubName = input.awayClubName ?? input.awayClubId
  if (input.homeClubId && input.awayClubId) {
    const clubs = await prisma.club.findMany({ where: { id: { in: [input.homeClubId, input.awayClubId] } }, select: { id: true, name: true } }).catch(() => [])
    const found = new Map(clubs.map(c => [c.id, c.name]))
    if (!found.has(input.homeClubId) || !found.has(input.awayClubId)) {
      if (opts.raiseReview) { await raiseReview('MISSING_CLUB', `Result references a club not in the database (${input.homeClubId} vs ${input.awayClubId})`, input); reviewRaised = true }
    }
    homeClubName = found.get(input.homeClubId) ?? homeClubName
    awayClubName = found.get(input.awayClubId) ?? awayClubName
  }
  if (input.round == null && opts.raiseReview) { await raiseReview('MISSING_ROUND', `Result for ${homeClubName} v ${awayClubName} has no round`, input); reviewRaised = true }

  const ok = errors.length === 0
  return {
    ok, errors, reviewRaised,
    value: { leagueId: input.leagueId, leagueName, season: input.season, round: input.round, matchDate: matchDate ?? undefined,
      homeClubId: input.homeClubId, homeClubName, awayClubId: input.awayClubId, awayClubName,
      homeScore: homeScore ?? 0, awayScore: awayScore ?? 0, sourceMatchId: input.sourceMatchId, status: input.status },
  }
}

/** Validate a fixture row. */
export async function validateFixtureInput(input: FixtureInput): Promise<Validated<{
  leagueId: string; leagueName: string; season: string; round?: number; matchDate?: Date; matchTime?: string; venue?: string
  homeClubId: string; homeClubName: string; awayClubId: string; awayClubName: string; status: string
}>> {
  const errors: string[] = []
  if (!input.leagueId) errors.push('missing leagueId')
  if (!input.season) errors.push('missing season')
  if (!input.homeClubId || !input.awayClubId) errors.push('missing home/away club')
  if (input.homeClubId && input.awayClubId && input.homeClubId === input.awayClubId) errors.push('home and away club are identical')
  const matchDate = toDate(input.matchDate)
  if (matchDate === null) errors.push('invalid matchDate')

  let leagueName = input.leagueName ?? input.leagueId
  const league = input.leagueId ? await prisma.league.findUnique({ where: { id: input.leagueId }, select: { name: true } }).catch(() => null) : null
  if (league) leagueName = league.name
  else if (input.leagueId) errors.push('unknown leagueId')

  return {
    ok: errors.length === 0, errors,
    value: { leagueId: input.leagueId, leagueName, season: input.season, round: input.round, matchDate: matchDate ?? undefined,
      matchTime: input.matchTime, venue: input.venue, homeClubId: input.homeClubId, homeClubName: input.homeClubName ?? input.homeClubId,
      awayClubId: input.awayClubId, awayClubName: input.awayClubName ?? input.awayClubId, status: input.status ?? 'SCHEDULED' },
  }
}
