/**
 * Backup snapshots — shared by the admin one-click backup, restore safety
 * snapshots, and the automatic nightly job. Dumps the core tables to JSON.
 * Backups are never deleted; kinds: MANUAL | NIGHTLY | PRE_RESTORE.
 */

import { prisma } from '../db/client.js'
import { logger } from '../utils/logger.js'

export async function snapshot(): Promise<{ counts: Record<string, number>; data: string }> {
  const [states, associations, leagues, clubs, leagueSources, clubLeagueSeasons] = await Promise.all([
    prisma.state.findMany(), prisma.association.findMany(), prisma.league.findMany(),
    prisma.club.findMany(), prisma.leagueSource.findMany(), prisma.clubLeagueSeason.findMany(),
  ])
  const counts = { states: states.length, associations: associations.length, leagues: leagues.length, clubs: clubs.length, leagueSources: leagueSources.length, clubLeagueSeasons: clubLeagueSeasons.length }
  return { counts, data: JSON.stringify({ states, associations, leagues, clubs, leagueSources, clubLeagueSeasons }) }
}

export async function createBackup(kind: 'MANUAL' | 'NIGHTLY' | 'PRE_RESTORE', label?: string): Promise<{ id: string; counts: Record<string, number> }> {
  const snap = await snapshot()
  const backup = await prisma.backup.create({
    data: { label: label ?? `${kind === 'NIGHTLY' ? 'Nightly' : kind === 'PRE_RESTORE' ? 'Pre-restore' : 'Backup'} ${new Date().toISOString()}`, kind, counts: JSON.stringify(snap.counts), data: snap.data },
  })
  logger.info('Backup created', { id: backup.id, kind, counts: snap.counts })
  return { id: backup.id, counts: snap.counts }
}
