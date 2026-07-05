/**
 * Claim workflow service (Phase B2).
 * ─────────────────────────────────────────────────────────────────────────────
 * Club & League claiming, with:
 *   • email validation
 *   • duplicate-claim prevention (one PENDING claim per club+email)
 *   • duplicate-owner prevention (unique ClubMembership per club+user)
 *   • notifications on submit / approve / reject
 *   • status flow  PENDING → VERIFIED | REJECTED
 *
 * Nothing here touches the clubs/leagues/ranking tables — a "verified" claim is
 * recorded on the claim + the new ClubProfile/LeagueProfile, and (for clubs) an
 * OWNER membership is granted to the applicant's PlatformUser.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email)
}

export interface ClaimInput {
  clubId?: string
  leagueId?: string
  name: string
  applicantName?: string
  applicantEmail?: string
  email?: string
  phone?: string
  role: string
  reason: string
}

export interface ClaimResult {
  ok: boolean
  status: number
  claimId?: string
  error?: string
}

/** Find-or-create a PlatformUser by email (soft-deleted users are revived). */
async function ensureUser(email: string, name?: string): Promise<string> {
  const existing = await prisma.platformUser.findUnique({ where: { email } })
  if (existing) {
    if (existing.deletedAt) await prisma.platformUser.update({ where: { id: existing.id }, data: { deletedAt: null } })
    return existing.id
  }
  const u = await prisma.platformUser.create({ data: { email, name: name ?? null } })
  return u.id
}

async function notify(userId: string | null, type: string, title: string, entityType: string, entityId: string) {
  try { await prisma.platformNotification.create({ data: { userId, type, title, entityType, entityId } }) }
  catch (e) { logger.warn('notification create failed', { detail: String(e) }) }
}

// ── Club claims ───────────────────────────────────────────────────────────────

export async function submitClubClaim(input: ClaimInput): Promise<ClaimResult> {
  const email = (input.applicantEmail ?? input.email ?? '').trim().toLowerCase()
  if (!input.clubId) return { ok: false, status: 400, error: 'clubId required' }
  if (!isValidEmail(email)) return { ok: false, status: 400, error: 'valid email required' }
  if (!input.applicantName && !input.name) return { ok: false, status: 400, error: 'applicant name required' }
  if (!input.role || !input.reason) return { ok: false, status: 400, error: 'role and reason required' }

  // Duplicate-claim guard: one PENDING claim per club+email.
  const dup = await prisma.clubClaim.findFirst({ where: { clubId: input.clubId, email, status: 'PENDING', deletedAt: null } })
  if (dup) return { ok: false, status: 409, error: 'a pending claim for this club already exists for this email' }

  // Already verified by someone?
  const verified = await prisma.clubClaim.findFirst({ where: { clubId: input.clubId, status: 'VERIFIED', deletedAt: null } })
  if (verified) return { ok: false, status: 409, error: 'this club has already been claimed' }

  const club = await prisma.club.findUnique({ where: { id: input.clubId }, select: { name: true } })
  const claim = await prisma.clubClaim.create({
    data: {
      clubId: input.clubId,
      clubName: club?.name ?? input.name ?? 'Unknown club',
      applicantName: input.applicantName ?? input.name!,
      email, phone: input.phone ?? null,
      role: input.role, reason: input.reason,
      status: 'PENDING',
    },
  })
  await notify(null, 'CLUB_CLAIMED', `Club claim submitted: ${claim.clubName}`, 'ClubClaim', claim.id)
  return { ok: true, status: 201, claimId: claim.id }
}

export async function reviewClubClaim(
  claimId: string, action: 'VERIFIED' | 'REJECTED', reviewedBy: string | null, reviewNotes?: string,
): Promise<ClaimResult> {
  const claim = await prisma.clubClaim.findUnique({ where: { id: claimId } })
  if (!claim || claim.deletedAt) return { ok: false, status: 404, error: 'claim not found' }
  if (claim.status !== 'PENDING') return { ok: false, status: 409, error: `claim already ${claim.status}` }

  const updated = await prisma.clubClaim.update({
    where: { id: claimId },
    data: { status: action, reviewedBy, reviewNotes: reviewNotes ?? null, approvedAt: action === 'VERIFIED' ? new Date() : null },
  })

  if (action === 'VERIFIED') {
    const userId = await ensureUser(claim.email, claim.applicantName)
    // Grant OWNER membership — duplicate-owner-safe via unique(clubId,userId).
    await prisma.clubMembership.upsert({
      where:  { clubId_userId: { clubId: claim.clubId, userId } },
      create: { clubId: claim.clubId, userId, role: 'OWNER', status: 'ACTIVE' },
      update: { role: 'OWNER', status: 'ACTIVE', deletedAt: null },
    })
    // Ensure a profile row exists + mark verified (never touches clubs table).
    await prisma.clubProfile.upsert({
      where:  { clubId: claim.clubId },
      create: { clubId: claim.clubId, verified: true, verifiedAt: new Date(), verifiedBy: reviewedBy },
      update: { verified: true, verifiedAt: new Date(), verifiedBy: reviewedBy },
    })
    await notify(userId, 'CLAIM_APPROVED', `Your claim for ${claim.clubName} was approved`, 'ClubClaim', claim.id)
  } else {
    const user = await prisma.platformUser.findUnique({ where: { email: claim.email } })
    await notify(user?.id ?? null, 'CLAIM_REJECTED', `Your claim for ${claim.clubName} was declined`, 'ClubClaim', claim.id)
  }
  return { ok: true, status: 200, claimId: updated.id }
}

// ── League claims (mirror) ─────────────────────────────────────────────────────

export async function submitLeagueClaim(input: ClaimInput): Promise<ClaimResult> {
  const email = (input.applicantEmail ?? input.email ?? '').trim().toLowerCase()
  if (!input.leagueId) return { ok: false, status: 400, error: 'leagueId required' }
  if (!isValidEmail(email)) return { ok: false, status: 400, error: 'valid email required' }
  if (!input.applicantName && !input.name) return { ok: false, status: 400, error: 'applicant name required' }
  if (!input.role || !input.reason) return { ok: false, status: 400, error: 'role and reason required' }

  const dup = await prisma.leagueClaim.findFirst({ where: { leagueId: input.leagueId, email, status: 'PENDING', deletedAt: null } })
  if (dup) return { ok: false, status: 409, error: 'a pending claim for this league already exists for this email' }
  const verified = await prisma.leagueClaim.findFirst({ where: { leagueId: input.leagueId, status: 'VERIFIED', deletedAt: null } })
  if (verified) return { ok: false, status: 409, error: 'this league has already been claimed' }

  const league = await prisma.league.findUnique({ where: { id: input.leagueId }, select: { name: true } })
  const claim = await prisma.leagueClaim.create({
    data: {
      leagueId: input.leagueId,
      leagueName: league?.name ?? input.name ?? 'Unknown league',
      applicantName: input.applicantName ?? input.name!,
      email, phone: input.phone ?? null,
      role: input.role, reason: input.reason,
      status: 'PENDING',
    },
  })
  await notify(null, 'LEAGUE_CLAIMED', `League claim submitted: ${claim.leagueName}`, 'LeagueClaim', claim.id)
  return { ok: true, status: 201, claimId: claim.id }
}

export async function reviewLeagueClaim(
  claimId: string, action: 'VERIFIED' | 'REJECTED', reviewedBy: string | null, reviewNotes?: string,
): Promise<ClaimResult> {
  const claim = await prisma.leagueClaim.findUnique({ where: { id: claimId } })
  if (!claim || claim.deletedAt) return { ok: false, status: 404, error: 'claim not found' }
  if (claim.status !== 'PENDING') return { ok: false, status: 409, error: `claim already ${claim.status}` }

  const updated = await prisma.leagueClaim.update({
    where: { id: claimId },
    data: { status: action, reviewedBy, reviewNotes: reviewNotes ?? null, approvedAt: action === 'VERIFIED' ? new Date() : null },
  })

  if (action === 'VERIFIED') {
    const userId = await ensureUser(claim.email, claim.applicantName)
    await prisma.leagueProfile.upsert({
      where:  { leagueId: claim.leagueId },
      create: { leagueId: claim.leagueId, verified: true, verifiedAt: new Date(), verifiedBy: reviewedBy },
      update: { verified: true, verifiedAt: new Date(), verifiedBy: reviewedBy },
    })
    await notify(userId, 'CLAIM_APPROVED', `Your claim for ${claim.leagueName} was approved`, 'LeagueClaim', claim.id)
  } else {
    const user = await prisma.platformUser.findUnique({ where: { email: claim.email } })
    await notify(user?.id ?? null, 'CLAIM_REJECTED', `Your claim for ${claim.leagueName} was declined`, 'LeagueClaim', claim.id)
  }
  return { ok: true, status: 200, claimId: updated.id }
}
