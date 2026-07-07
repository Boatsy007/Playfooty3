#!/usr/bin/env node
/**
 * Verifies the minimum football/admin schema required by the Vercel runtime.
 * Read-only: does not apply migrations or write data.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const requiredLeagueColumns = [
  'primaryDataSource',
  'sourceUrl',
  'sport',
  'fallbackDataSources',
  'playhqOrganisationId',
  'playhqCompetitionId',
  'playhqSeasonId',
  'playhqGradeId',
  'syncStatus',
  'archivedAt',
]

const requiredTables = [
  'football_data_imports',
  'football_fixtures',
  'football_results',
  'football_ladder_entries',
]

const migrationName = '20260707000000_align_football_league_schema'

async function rows(sql, params = []) {
  return prisma.$queryRawUnsafe(sql, ...params)
}

try {
  const columnRows = await rows(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'leagues'
        AND column_name = ANY($1::text[])`,
    [requiredLeagueColumns],
  )
  const foundColumns = new Set(columnRows.map((row) => row.column_name))
  const missingColumns = requiredLeagueColumns.filter((name) => !foundColumns.has(name))

  const tableRows = await rows(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [requiredTables],
  )
  const foundTables = new Set(tableRows.map((row) => row.table_name))
  const missingTables = requiredTables.filter((name) => !foundTables.has(name))

  const migrationRows = await rows(
    `SELECT migration_name, finished_at
       FROM _prisma_migrations
      WHERE migration_name = $1`,
    [migrationName],
  ).catch(() => [])
  const migrationApplied = migrationRows.some((row) => row.finished_at)

  if (missingColumns.length || missingTables.length || !migrationApplied) {
    console.error('Football schema verification failed.')
    if (!migrationApplied) console.error(`Missing/applied=false migration: ${migrationName}`)
    if (missingColumns.length) console.error(`Missing leagues columns: ${missingColumns.join(', ')}`)
    if (missingTables.length) console.error(`Missing tables: ${missingTables.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log('Football schema verification passed.')
    console.log(`Migration applied: ${migrationName}`)
    console.log(`League columns present: ${requiredLeagueColumns.join(', ')}`)
    console.log(`Tables present: ${requiredTables.join(', ')}`)
  }
} finally {
  await prisma.$disconnect()
}
