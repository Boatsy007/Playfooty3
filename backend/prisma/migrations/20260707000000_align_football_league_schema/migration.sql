-- Align production database with football/admin league schema.
-- Safe additive migration only: adds missing nullable/defaulted columns and tables.
-- No data is dropped, reset, or rewritten.

-- League metadata added after the initial schema.
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "automaticStrengthRating" DOUBLE PRECISION NOT NULL DEFAULT 3.0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "manualStrengthOverride" DOUBLE PRECISION;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "finalStrengthRating" DOUBLE PRECISION NOT NULL DEFAULT 3.0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "strengthConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "strengthReasoning" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "strengthCalculatedAt" TIMESTAMPTZ;

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqOrgSlug" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqGradeId" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqGradeName" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "ladderUrl" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "currentSeason" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "autoDiscovered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "needsStrengthReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "gradeOverride" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "ladderUrlOverride" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "syncError" TEXT;

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "primarySource" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "importType" TEXT DEFAULT 'AUTO';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "lastSuccessAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "lastManualUpdateAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "dataConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "failureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "manualOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "regionName" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT 'NETBALL';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "primaryDataSource" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "fallbackDataSources" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqOrganisationId" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqCompetitionId" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "playhqSeasonId" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "scrapeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "apiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "manualEntryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "lastSuccessfulSyncAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "dataSourceSyncError" TEXT;

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "leagueType" TEXT;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "reviewReason" TEXT;

CREATE INDEX IF NOT EXISTS "leagues_sport_archivedAt_idx" ON "leagues"("sport", "archivedAt");

-- Football import/control-centre tables used by current Prisma schema and admin counts.
CREATE TABLE IF NOT EXISTS "football_data_imports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "dataType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "payloadHash" TEXT NOT NULL,
  "dryRun" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "recordsFound" INTEGER NOT NULL DEFAULT 0,
  "recordsImported" INTEGER NOT NULL DEFAULT 0,
  "conflictsFound" INTEGER NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "error" TEXT,
  "payload" TEXT,
  "scrapedAt" TIMESTAMPTZ,
  "createdBy" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "publishedAt" TIMESTAMPTZ,
  CONSTRAINT "football_data_imports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "football_data_imports_leagueId_sourceType_dataType_payloadHash_key" ON "football_data_imports"("leagueId", "sourceType", "dataType", "payloadHash");
CREATE INDEX IF NOT EXISTS "football_data_imports_leagueId_dataType_status_idx" ON "football_data_imports"("leagueId", "dataType", "status");

CREATE TABLE IF NOT EXISTS "football_data_conflicts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "importId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityKey" TEXT NOT NULL,
  "existing" TEXT,
  "incoming" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMPTZ,
  "resolvedBy" TEXT,
  CONSTRAINT "football_data_conflicts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "football_data_conflicts_leagueId_status_idx" ON "football_data_conflicts"("leagueId", "status");

CREATE TABLE IF NOT EXISTS "football_fixtures" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "grade" TEXT NOT NULL DEFAULT 'Senior Football',
  "round" TEXT,
  "homeClubId" TEXT,
  "awayClubId" TEXT,
  "homeName" TEXT NOT NULL,
  "awayName" TEXT NOT NULL,
  "matchDate" TIMESTAMPTZ,
  "venue" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "externalId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "football_fixtures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "football_fixtures_leagueId_season_grade_round_homeName_awayName_key" ON "football_fixtures"("leagueId", "season", "grade", "round", "homeName", "awayName");
CREATE INDEX IF NOT EXISTS "football_fixtures_leagueId_season_grade_idx" ON "football_fixtures"("leagueId", "season", "grade");

CREATE TABLE IF NOT EXISTS "football_results" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "grade" TEXT NOT NULL DEFAULT 'Senior Football',
  "round" TEXT,
  "homeClubId" TEXT,
  "awayClubId" TEXT,
  "homeName" TEXT NOT NULL,
  "awayName" TEXT NOT NULL,
  "homeGoals" INTEGER NOT NULL DEFAULT 0,
  "homeBehinds" INTEGER NOT NULL DEFAULT 0,
  "homePoints" INTEGER NOT NULL DEFAULT 0,
  "awayGoals" INTEGER NOT NULL DEFAULT 0,
  "awayBehinds" INTEGER NOT NULL DEFAULT 0,
  "awayPoints" INTEGER NOT NULL DEFAULT 0,
  "matchDate" TIMESTAMPTZ,
  "venue" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "externalId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "football_results_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "football_results_leagueId_season_grade_round_homeName_awayName_key" ON "football_results"("leagueId", "season", "grade", "round", "homeName", "awayName");
CREATE INDEX IF NOT EXISTS "football_results_leagueId_season_grade_published_idx" ON "football_results"("leagueId", "season", "grade", "published");

CREATE TABLE IF NOT EXISTS "football_ladder_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "grade" TEXT NOT NULL DEFAULT 'Senior Football',
  "position" INTEGER NOT NULL,
  "clubId" TEXT,
  "clubName" TEXT NOT NULL,
  "played" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "pointsFor" INTEGER NOT NULL DEFAULT 0,
  "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "premiershipPoints" INTEGER NOT NULL DEFAULT 0,
  "sourceType" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "football_ladder_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "football_ladder_entries_leagueId_season_grade_clubName_key" ON "football_ladder_entries"("leagueId", "season", "grade", "clubName");
CREATE INDEX IF NOT EXISTS "football_ladder_entries_leagueId_season_grade_published_idx" ON "football_ladder_entries"("leagueId", "season", "grade", "published");

-- Add FKs only if absent; safe for databases where tables already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_data_imports_leagueId_fkey') THEN
    ALTER TABLE "football_data_imports" ADD CONSTRAINT "football_data_imports_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_data_conflicts_importId_fkey') THEN
    ALTER TABLE "football_data_conflicts" ADD CONSTRAINT "football_data_conflicts_importId_fkey" FOREIGN KEY ("importId") REFERENCES "football_data_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_fixtures_leagueId_fkey') THEN
    ALTER TABLE "football_fixtures" ADD CONSTRAINT "football_fixtures_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_results_leagueId_fkey') THEN
    ALTER TABLE "football_results" ADD CONSTRAINT "football_results_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_ladder_entries_leagueId_fkey') THEN
    ALTER TABLE "football_ladder_entries" ADD CONSTRAINT "football_ladder_entries_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
