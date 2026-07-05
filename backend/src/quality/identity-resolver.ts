/**
 * Club identity resolver (Phase B4).
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolves a raw team name to a canonical club identity using:
 *   • the persistent ClubAlias table (abbreviations / merged names → clubId)
 *   • the pure validateClubIdentity heuristics (aliases, real-club signal,
 *     anonymous/generic detection)
 *   • town-based matching against the real towns already in the database
 *   • manual-override awareness (a manualOverride club is never re-pointed)
 *
 * Read-only against clubs (except addAlias, which only writes the alias table).
 */

import { prisma } from '../db/client.js'
import { validateClubIdentity, canonicalClubKey, type ClubIdentityResult } from '../validation/club-identity.js'
import { logQualityAction } from './audit.js'

const normalize = (s: string) => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '')

export interface ResolveResult extends ClubIdentityResult {
  matchedClubId: string | null
  matchedClubName: string | null
  matchedVia: 'alias' | 'town' | 'canonical' | null
  isGeneric: boolean
}

let townCache: { at: number; towns: { town: string; clubId: string; clubName: string }[] } | null = null

async function knownTowns() {
  if (townCache && Date.now() - townCache.at < 5 * 60_000) return townCache.towns
  const clubs = await prisma.club.findMany({ where: { isActive: true, archivedAt: null, townName: { not: null } }, select: { id: true, name: true, townName: true } })
  const towns = clubs.filter(c => c.townName).map(c => ({ town: normalize(c.townName as string), clubId: c.id, clubName: c.name }))
  townCache = { at: Date.now(), towns }
  return towns
}

/** Load the persistent alias table as a { normalizedAlias: canonicalName } map. */
async function runtimeAliasMap(): Promise<{ byName: Record<string, string>; byId: Map<string, string> }> {
  const aliases = await prisma.clubAlias.findMany({ select: { alias: true, normalizedAlias: true, clubId: true } })
  const clubIds = [...new Set(aliases.map(a => a.clubId))]
  const clubs = clubIds.length ? await prisma.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, name: true } }) : []
  const nameById = new Map(clubs.map(c => [c.id, c.name]))
  const byName: Record<string, string> = {}
  const byId = new Map<string, string>() // normalizedAlias → clubId
  for (const a of aliases) { const nm = nameById.get(a.clubId); if (nm) byName[a.alias] = nm; byId.set(a.normalizedAlias, a.clubId) }
  return { byName, byId }
}

/** Resolve a raw name to a club identity (+ a matched clubId where confident). */
export async function resolveClubIdentity(raw: string): Promise<ResolveResult> {
  const { byName, byId } = await runtimeAliasMap()
  const base = validateClubIdentity(raw, byName)
  const norm = normalize(raw)

  let matchedClubId: string | null = null
  let matchedClubName: string | null = null
  let matchedVia: ResolveResult['matchedVia'] = null

  // 1) Direct alias hit → clubId
  if (byId.has(norm)) { matchedClubId = byId.get(norm)!; matchedVia = 'alias' }

  // 2) Canonical-key match against existing active clubs
  if (!matchedClubId) {
    const key = canonicalClubKey(raw)
    if (key) {
      const clubs = await prisma.club.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true } })
      const hit = clubs.find(c => canonicalClubKey(c.name) === key)
      if (hit) { matchedClubId = hit.id; matchedClubName = hit.name; matchedVia = 'canonical' }
    }
  }

  // 3) Town-based matching (only if still unmatched and the name isn't generic)
  if (!matchedClubId && base.verdict !== 'ANONYMOUS') {
    const towns = await knownTowns()
    const hit = towns.find(t => t.town.length >= 4 && norm.includes(t.town))
    if (hit) { matchedClubId = hit.clubId; matchedClubName = hit.clubName; matchedVia = 'town' }
  }

  if (matchedClubId && !matchedClubName) {
    const c = await prisma.club.findUnique({ where: { id: matchedClubId }, select: { name: true } })
    matchedClubName = c?.name ?? null
  }

  return { ...base, matchedClubId, matchedClubName, matchedVia, isGeneric: base.isAnonymous }
}

/** Add / update a persistent alias. Never re-points a manualOverride club. */
export async function addClubAlias(alias: string, clubId: string, source = 'MANUAL', confidence = 1): Promise<{ ok: boolean; error?: string }> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true, manualOverride: true } })
  if (!club) return { ok: false, error: 'club not found' }
  const normalizedAlias = normalize(alias)
  if (!normalizedAlias) return { ok: false, error: 'alias is empty after normalisation' }
  await prisma.clubAlias.upsert({
    where:  { normalizedAlias },
    create: { alias, normalizedAlias, clubId, source, confidence },
    update: { alias, clubId, source, confidence },
  })
  await logQualityAction('ADD_CLUB_ALIAS', 'Club', clubId, { alias, source }, { reason: `alias "${alias}" → ${club.name}` })
  return { ok: true }
}

/** Quick real-club vs generic-team check for a name. */
export function isGenericTeamName(raw: string): boolean {
  return validateClubIdentity(raw).isAnonymous
}
