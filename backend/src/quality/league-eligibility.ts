/**
 * League eligibility validator (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Go Netty ranks COUNTRY, senior, A-Grade netball. This flags competitions that
 * probably do not belong — metro, junior, social, indoor, lower-division — or
 * whose teams are non-town / generic ("Vixens", "Team 1"). It only FLAGS: it
 * never disables a league (manual overrides always win), and it writes its
 * result to LeagueEligibility + optionally the review queue.
 */

import { prisma } from '../db/client.js'
import { validateClubIdentity } from '../validation/club-identity.js'
import { logQualityAction } from './audit.js'
import { logger } from '../utils/logger.js'

const RX = {
  metro:   /\b(metro|metropolitan|city)\b/i,
  junior:  /\b(junior|juniors|under[\s-]?\d{1,2}|u\/?\d{1,2}|net[\s-]?set[\s-]?go|netsetgo|primary|schoolgirls?)\b/i,
  social:  /\b(social|mixed|come[\s-]?and[\s-]?try|twilight|recreational|\brec\b|friday night)\b/i,
  indoor:  /\b(indoor|fast[\s-]?5|fast5|stadium)\b/i,
  lower:   /\b(b grade|c grade|d grade|division [2-9]|div [2-9]|section [2-9]|reserves?|2nd|second)\b/i,
}

export interface EligibilityResult {
  leagueId: string; leagueName: string
  verdict: 'ELIGIBLE' | 'REVIEW' | 'INELIGIBLE'
  isMetro: boolean; isJunior: boolean; isSocial: boolean; isIndoor: boolean
  isLowerDivision: boolean; isNonTown: boolean; hasGenericTeams: boolean
  reasons: string[]; confidence: number
}

/** Validate one league by id (or a name string). Persists the result. */
export async function validateLeagueEligibility(leagueId: string, opts: { raiseReview?: boolean } = {}): Promise<EligibilityResult | null> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, name: true, manualOverride: true } })
  if (!league) return null

  const clubs = await prisma.clubLeagueSeason.findMany({
    where: { leagueId, isActive: true, club: { isActive: true, archivedAt: null } },
    select: { club: { select: { name: true, townName: true } } },
  })
  const clubNames = clubs.map(c => c.club.name)
  const identities = clubNames.map(n => validateClubIdentity(n))
  const genericCount = identities.filter(i => i.isAnonymous).length
  const withTown = clubs.filter(c => c.club.townName).length

  const name = league.name
  const reasons: string[] = []
  const isMetro = RX.metro.test(name); if (isMetro) reasons.push('name suggests a metro/city competition')
  const isJunior = RX.junior.test(name); if (isJunior) reasons.push('name suggests a junior competition')
  const isSocial = RX.social.test(name); if (isSocial) reasons.push('name suggests a social/mixed competition')
  const isIndoor = RX.indoor.test(name); if (isIndoor) reasons.push('name suggests an indoor/Fast5 competition')
  const isLowerDivision = RX.lower.test(name); if (isLowerDivision) reasons.push('name suggests a lower division / reserves')
  const hasGenericTeams = clubNames.length > 0 && genericCount / clubNames.length >= 0.4
  if (hasGenericTeams) reasons.push(`${genericCount}/${clubNames.length} teams have generic/anonymous names`)
  const isNonTown = clubNames.length >= 4 && withTown / clubNames.length < 0.25
  if (isNonTown) reasons.push('few teams map to a real town')

  let verdict: EligibilityResult['verdict'] = 'ELIGIBLE'
  if (isMetro || isJunior || isSocial || isIndoor) verdict = 'INELIGIBLE'
  else if (isLowerDivision || isNonTown || hasGenericTeams) verdict = 'REVIEW'

  const confidence = verdict === 'ELIGIBLE' ? 0.6 : Math.min(0.95, 0.55 + reasons.length * 0.12)
  const result: EligibilityResult = { leagueId: league.id, leagueName: name, verdict, isMetro, isJunior, isSocial, isIndoor, isLowerDivision, isNonTown, hasGenericTeams, reasons, confidence }

  await prisma.leagueEligibility.upsert({
    where:  { leagueId: league.id },
    create: { leagueId: league.id, leagueName: name, verdict, isMetro, isJunior, isSocial, isIndoor, isLowerDivision, isNonTown, hasGenericTeams, reasons: JSON.stringify(reasons), confidence, checkedAt: new Date() },
    update: { leagueName: name, verdict, isMetro, isJunior, isSocial, isIndoor, isLowerDivision, isNonTown, hasGenericTeams, reasons: JSON.stringify(reasons), confidence, checkedAt: new Date() },
  })
  await logQualityAction('VALIDATE_LEAGUE_ELIGIBILITY', 'League', league.id, { verdict, reasons }, { reason: verdict })

  // Flag for review — but never for a manually-overridden league (admin owns it).
  if (opts.raiseReview && verdict !== 'ELIGIBLE' && !league.manualOverride) {
    const existing = await prisma.reviewItem.findFirst({ where: { entityType: 'League', entityId: league.id, kind: 'LEAGUE_ELIGIBILITY', status: 'PENDING' }, select: { id: true } })
    if (!existing) {
      await prisma.reviewItem.create({ data: { entityType: 'League', entityId: league.id, kind: 'LEAGUE_ELIGIBILITY', reason: `${name}: ${verdict} — ${reasons.join('; ')}`, confidence, payload: JSON.stringify(result) } })
    }
  }
  return result
}

export interface EligibilitySweepReport { checked: number; eligible: number; review: number; ineligible: number; flagged: EligibilityResult[] }

/** Validate every active league. */
export async function validateAllLeagues(opts: { raiseReview?: boolean } = {}): Promise<EligibilitySweepReport> {
  const leagues = await prisma.league.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true } })
  const report: EligibilitySweepReport = { checked: 0, eligible: 0, review: 0, ineligible: 0, flagged: [] }
  for (const l of leagues) {
    const r = await validateLeagueEligibility(l.id, opts)
    if (!r) continue
    report.checked++
    if (r.verdict === 'ELIGIBLE') report.eligible++
    else { r.verdict === 'REVIEW' ? report.review++ : report.ineligible++; report.flagged.push(r) }
  }
  logger.info('League eligibility sweep complete', { checked: report.checked, review: report.review, ineligible: report.ineligible })
  return report
}
