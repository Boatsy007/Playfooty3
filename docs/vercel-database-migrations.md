# Vercel database migrations

Vercel deploys the API code, but it does **not** automatically apply Prisma
migrations to the connected Supabase/Postgres database. If a deployment starts
using new Prisma fields before the database is migrated, Vercel functions can
fail with errors such as:

```text
PrismaClientKnownRequestError: The column `leagues.primaryDataSource` does not exist in the current database.
```

## Required step for football league admin fixes

Before using the football league admin routes in preview or production, apply the
Prisma migrations to the same database that the Vercel app queries:

```bash
cd backend
DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npm run db:migrate
```

This runs `prisma migrate deploy`, which applies pending migrations only. Do not
run reset commands against preview or production.

You can also run the manual GitHub Actions workflow:

```text
Apply Prisma migrations (preview/production database)
```

That workflow installs backend dependencies, runs `prisma generate`, applies
pending migrations, and verifies the required football/admin schema.

## Verify the connected database

After migration, verify the required football/admin schema:

```bash
cd backend
DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npm run db:verify:football-schema
```

The verification checks that migration
`20260707000000_align_football_league_schema` is recorded as applied and that the
runtime database contains at minimum:

- `leagues.primaryDataSource`
- `leagues.sourceUrl`
- `leagues.sport`
- `leagues.fallbackDataSources`
- `leagues.playhqOrganisationId`
- `leagues.playhqCompetitionId`
- `leagues.playhqSeasonId`
- `leagues.playhqGradeId`
- `leagues.syncStatus`
- `leagues.archivedAt`
- `football_data_imports`
- `football_fixtures`
- `football_results`
- `football_ladder_entries`

## Environment requirements

- `DATABASE_URL` is the runtime connection string used by the Vercel API.
- `DIRECT_URL` is the direct database connection used by Prisma migrations.
- `DATABASE_URL` and `DIRECT_URL` must point to the same Supabase/Postgres
  project/database. They may use different hosts/ports (for example pooler vs
  direct), but they must not point to different projects.
- `GITHUB_DISPATCH_TOKEN` is separate. It is only required for PlayHQ scraping
  dispatch through GitHub Actions and is not required to apply database
  migrations.
