#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const requiredColumns = [
  'id',
  'playerName',
  'goals',
  'clubName',
  'leagueName',
  'clubId',
  'leagueId',
  'season',
  'grade',
  'matches',
  'sourceUrl',
  'sourceType',
  'importedAt',
  'createdAt',
  'updatedAt',
]

const requiredIndexes = [
  'football_goal_kickers_season_grade_player_club_league_key',
  'football_goal_kickers_season_goals_idx',
  'football_goal_kickers_league_idx',
  'football_goal_kickers_club_idx',
]

async function main() {
  const table = await prisma.$queryRaw`
    SELECT to_regclass('public.football_goal_kickers')::text AS name
  `
  const tableName = table?.[0]?.name
  if (tableName !== 'football_goal_kickers') {
    throw new Error('Missing table: public.football_goal_kickers')
  }

  const columns = await prisma.$queryRaw`
    SELECT column_name AS name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'football_goal_kickers'
  `
  const columnSet = new Set(columns.map(row => row.name))
  const missingColumns = requiredColumns.filter(column => !columnSet.has(column))
  if (missingColumns.length) {
    throw new Error(`Missing football_goal_kickers columns: ${missingColumns.join(', ')}`)
  }

  const indexes = await prisma.$queryRaw`
    SELECT indexname AS name
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'football_goal_kickers'
  `
  const indexSet = new Set(indexes.map(row => row.name))
  const missingIndexes = requiredIndexes.filter(index => !indexSet.has(index))
  if (missingIndexes.length) {
    throw new Error(`Missing football_goal_kickers indexes: ${missingIndexes.join(', ')}`)
  }

  const defaults = await prisma.$queryRaw`
    SELECT column_name AS name, column_default AS default_value
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'football_goal_kickers'
      AND column_name IN ('sourceType', 'goals')
  `
  const sourceTypeDefault = defaults.find(row => row.name === 'sourceType')?.default_value ?? ''
  const goalsDefault = defaults.find(row => row.name === 'goals')?.default_value ?? ''
  if (!String(sourceTypeDefault).includes('PLAYHQ')) {
    throw new Error(`football_goal_kickers.sourceType default is not PLAYHQ: ${sourceTypeDefault || '(none)'}`)
  }
  if (!String(goalsDefault).includes('0')) {
    throw new Error(`football_goal_kickers.goals default is not 0: ${goalsDefault || '(none)'}`)
  }

  console.log(JSON.stringify({
    ok: true,
    table: 'football_goal_kickers',
    columns: requiredColumns.length,
    indexes: requiredIndexes,
  }, null, 2))
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
