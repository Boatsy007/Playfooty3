-- CNCA Rankings Engine — Initial Migration
-- Generated from prisma/schema.prisma
-- Applied via: psql $DATABASE_URL -f this_file.sql

-- ─── States ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "states" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "code"      TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "states_code_key" ON "states"("code");

-- ─── Associations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "associations" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"         TEXT        NOT NULL,
  "shortName"    TEXT,
  "stateId"      TEXT,
  "websiteUrl"   TEXT,
  "contactEmail" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- ─── Leagues ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "leagues" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"             TEXT        NOT NULL,
  "shortName"        TEXT,
  "stateId"          TEXT        NOT NULL,
  "associationId"    TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT true,
  "strengthScore"    FLOAT8      NOT NULL DEFAULT 50,
  "strengthTier"     INTEGER     NOT NULL DEFAULT 3,
  "strengthNotes"    TEXT,
  "avgGoalsPerGame"  FLOAT8,
  "avgMarginPerGame" FLOAT8,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- ─── League Sources ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "league_sources" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId"      TEXT        NOT NULL,
  "sourceType"    TEXT        NOT NULL,
  "ladderUrl"     TEXT,
  "fixturesUrl"   TEXT,
  "resultsUrl"    TEXT,
  "apiKey"        TEXT,
  "season"        TEXT        NOT NULL,
  "isActive"      BOOLEAN     NOT NULL DEFAULT true,
  "lastScrapedAt" TIMESTAMPTZ,
  "lastStatus"    TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "league_sources_pkey" PRIMARY KEY ("id")
);

-- ─── Clubs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "clubs" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"             TEXT        NOT NULL,
  "slug"             TEXT        NOT NULL,
  "shortName"        TEXT,
  "stateId"          TEXT        NOT NULL,
  "region"           TEXT,
  "latitude"         FLOAT8,
  "longitude"        FLOAT8,
  "logoUrl"          TEXT,
  "primaryColour"    TEXT,
  "secondaryColour"  TEXT,
  "websiteUrl"       TEXT,
  "facebookUrl"      TEXT,
  "instagramUrl"     TEXT,
  "cncaQualified"    BOOLEAN     NOT NULL DEFAULT false,
  "invitationStatus" TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT true,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "clubs_slug_key" ON "clubs"("slug");

-- ─── Club Name Variants ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "club_name_variants" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "clubId"     TEXT        NOT NULL,
  "rawName"    TEXT        NOT NULL,
  "sourceType" TEXT        NOT NULL,
  "confidence" FLOAT8      NOT NULL DEFAULT 1.0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "club_name_variants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_name_variants_rawName_sourceType_key"
  ON "club_name_variants"("rawName", "sourceType");

-- ─── Club League Seasons ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "club_league_seasons" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "clubId"       TEXT        NOT NULL,
  "leagueId"     TEXT        NOT NULL,
  "season"       TEXT        NOT NULL,
  "grade"        TEXT        NOT NULL DEFAULT 'A Grade',
  "isActive"     BOOLEAN     NOT NULL DEFAULT true,
  "played"       INTEGER     NOT NULL DEFAULT 0,
  "wins"         INTEGER     NOT NULL DEFAULT 0,
  "losses"       INTEGER     NOT NULL DEFAULT 0,
  "draws"        INTEGER     NOT NULL DEFAULT 0,
  "goalsFor"     INTEGER     NOT NULL DEFAULT 0,
  "goalsAgainst" INTEGER     NOT NULL DEFAULT 0,
  "percentage"   FLOAT8      NOT NULL DEFAULT 0,
  "points"       INTEGER     NOT NULL DEFAULT 0,
  "finalsWins"   INTEGER     NOT NULL DEFAULT 0,
  "finalsLosses" INTEGER     NOT NULL DEFAULT 0,
  "isPremier"    BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "club_league_seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_league_seasons_clubId_leagueId_season_grade_key"
  ON "club_league_seasons"("clubId", "leagueId", "season", "grade");

-- ─── Matches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "matches" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId"   TEXT        NOT NULL,
  "homeClubId" TEXT        NOT NULL,
  "awayClubId" TEXT        NOT NULL,
  "season"     TEXT        NOT NULL,
  "round"      INTEGER,
  "matchDate"  TIMESTAMPTZ,
  "venue"      TEXT,
  "homeGoals"  INTEGER     NOT NULL,
  "awayGoals"  INTEGER     NOT NULL,
  "isFinal"    BOOLEAN     NOT NULL DEFAULT false,
  "finalRound" TEXT,
  "verified"   BOOLEAN     NOT NULL DEFAULT false,
  "sourceType" TEXT        NOT NULL,
  "sourceUrl"  TEXT,
  "scrapedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- ─── Ranking Configs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ranking_configs" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "label"     TEXT        NOT NULL DEFAULT 'Default',
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "weights"   TEXT        NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_configs_pkey" PRIMARY KEY ("id")
);

-- ─── Ranking Runs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ranking_runs" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "weekLabel"   TEXT        NOT NULL,
  "season"      TEXT        NOT NULL,
  "configId"    TEXT,
  "status"      TEXT        NOT NULL,
  "clubCount"   INTEGER     NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMPTZ,
  "errorLog"    TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ranking_runs_season_weekLabel_idx" ON "ranking_runs"("season", "weekLabel");

-- ─── Ranking Entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ranking_entries" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "runId"           TEXT        NOT NULL,
  "clubId"          TEXT        NOT NULL,
  "clubName"        TEXT        NOT NULL,
  "leagueId"        TEXT        NOT NULL,
  "leagueName"      TEXT        NOT NULL,
  "state"           TEXT        NOT NULL,
  "rank"            INTEGER     NOT NULL,
  "previousRank"    INTEGER,
  "rankMovement"    INTEGER     NOT NULL DEFAULT 0,
  "powerRating"     FLOAT8      NOT NULL,
  "componentScores" TEXT        NOT NULL,
  "recentForm"      TEXT        NOT NULL,
  "calculatedAt"    TEXT        NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_entries_runId_clubId_key" ON "ranking_entries"("runId", "clubId");
CREATE INDEX IF NOT EXISTS "ranking_entries_state_rank_idx" ON "ranking_entries"("state", "rank");
CREATE INDEX IF NOT EXISTS "ranking_entries_clubId_idx" ON "ranking_entries"("clubId");

-- ─── Ranking Snapshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ranking_snapshots" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "runId"       TEXT        NOT NULL,
  "clubId"      TEXT        NOT NULL,
  "weekLabel"   TEXT        NOT NULL,
  "season"      TEXT        NOT NULL,
  "rank"        INTEGER     NOT NULL,
  "powerRating" FLOAT8      NOT NULL,
  "movement"    INTEGER     NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_snapshots_weekLabel_clubId_key" ON "ranking_snapshots"("weekLabel", "clubId");
CREATE INDEX IF NOT EXISTS "ranking_snapshots_clubId_weekLabel_idx" ON "ranking_snapshots"("clubId", "weekLabel");

-- ─── Scrape Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "scrape_logs" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "runId"          TEXT,
  "leagueSourceId" TEXT,
  "sourceType"     TEXT        NOT NULL,
  "sourceUrl"      TEXT,
  "status"         TEXT        NOT NULL,
  "recordsFound"   INTEGER     NOT NULL DEFAULT 0,
  "recordsStored"  INTEGER     NOT NULL DEFAULT 0,
  "durationMs"     INTEGER,
  "errorMessage"   TEXT,
  "retryCount"     INTEGER     NOT NULL DEFAULT 0,
  "scrapedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "scrape_logs_pkey" PRIMARY KEY ("id")
);

-- ─── Review Queue ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "review_queue" (
  "id"                TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "type"              TEXT        NOT NULL,
  "severity"          TEXT        NOT NULL DEFAULT 'WARNING',
  "description"       TEXT        NOT NULL,
  "rawData"           TEXT,
  "status"            TEXT        NOT NULL DEFAULT 'PENDING',
  "resolvedCanonical" TEXT,
  "resolvedBy"        TEXT,
  "resolvedAt"        TIMESTAMPTZ,
  "notes"             TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id")
);

-- ─── Admin Users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "email"       TEXT        NOT NULL,
  "name"        TEXT,
  "role"        TEXT        NOT NULL DEFAULT 'VIEWER',
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"     TEXT        NOT NULL,
  "action"     TEXT        NOT NULL,
  "entityType" TEXT,
  "entityId"   TEXT,
  "before"     TEXT,
  "after"      TEXT,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────
ALTER TABLE "leagues"
  ADD CONSTRAINT IF NOT EXISTS "leagues_stateId_fkey"
    FOREIGN KEY ("stateId") REFERENCES "states"("id"),
  ADD CONSTRAINT IF NOT EXISTS "leagues_associationId_fkey"
    FOREIGN KEY ("associationId") REFERENCES "associations"("id");

ALTER TABLE "league_sources"
  ADD CONSTRAINT IF NOT EXISTS "league_sources_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id");

ALTER TABLE "clubs"
  ADD CONSTRAINT IF NOT EXISTS "clubs_stateId_fkey"
    FOREIGN KEY ("stateId") REFERENCES "states"("id");

ALTER TABLE "club_name_variants"
  ADD CONSTRAINT IF NOT EXISTS "club_name_variants_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id");

ALTER TABLE "club_league_seasons"
  ADD CONSTRAINT IF NOT EXISTS "club_league_seasons_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "club_league_seasons_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id");

ALTER TABLE "matches"
  ADD CONSTRAINT IF NOT EXISTS "matches_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id"),
  ADD CONSTRAINT IF NOT EXISTS "matches_homeClubId_fkey"
    FOREIGN KEY ("homeClubId") REFERENCES "clubs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "matches_awayClubId_fkey"
    FOREIGN KEY ("awayClubId") REFERENCES "clubs"("id");

ALTER TABLE "ranking_runs"
  ADD CONSTRAINT IF NOT EXISTS "ranking_runs_configId_fkey"
    FOREIGN KEY ("configId") REFERENCES "ranking_configs"("id");

ALTER TABLE "ranking_entries"
  ADD CONSTRAINT IF NOT EXISTS "ranking_entries_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "ranking_runs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "ranking_entries_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "ranking_entries_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id");

ALTER TABLE "ranking_snapshots"
  ADD CONSTRAINT IF NOT EXISTS "ranking_snapshots_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "ranking_runs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "ranking_snapshots_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id");

ALTER TABLE "scrape_logs"
  ADD CONSTRAINT IF NOT EXISTS "scrape_logs_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "ranking_runs"("id"),
  ADD CONSTRAINT IF NOT EXISTS "scrape_logs_leagueSourceId_fkey"
    FOREIGN KEY ("leagueSourceId") REFERENCES "league_sources"("id");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT IF NOT EXISTS "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "admin_users"("id");

-- ─── Prisma migration tracking table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                   VARCHAR(36)  NOT NULL,
  "checksum"             VARCHAR(64)  NOT NULL,
  "finished_at"          TIMESTAMPTZ,
  "migration_name"       VARCHAR(255) NOT NULL,
  "logs"                 TEXT,
  "rolled_back_at"       TIMESTAMPTZ,
  "started_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count"  INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Record this migration as applied
INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES
  (
    gen_random_uuid()::text,
    'cnca-init-manual',
    now(),
    '20250101000000_init',
    1
  )
ON CONFLICT DO NOTHING;
