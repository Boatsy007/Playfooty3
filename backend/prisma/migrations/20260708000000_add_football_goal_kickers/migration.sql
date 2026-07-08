-- Safe additive goal kicker storage for PlayFooty football imports.
CREATE TABLE IF NOT EXISTS "football_goal_kickers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerName" TEXT NOT NULL,
  "clubId" TEXT NULL,
  "clubName" TEXT NOT NULL,
  "leagueId" TEXT NULL,
  "leagueName" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "grade" TEXT NULL,
  "goals" INTEGER NOT NULL DEFAULT 0,
  "matches" INTEGER NULL,
  "sourceUrl" TEXT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'PLAYHQ_SCRAPER',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "football_goal_kickers_league_season_grade_player_club_key"
  ON "football_goal_kickers"("leagueId", "season", "grade", "playerName", "clubName");
CREATE INDEX IF NOT EXISTS "football_goal_kickers_season_goals_idx" ON "football_goal_kickers"("season", "goals");
CREATE INDEX IF NOT EXISTS "football_goal_kickers_league_idx" ON "football_goal_kickers"("leagueId");
CREATE INDEX IF NOT EXISTS "football_goal_kickers_club_idx" ON "football_goal_kickers"("clubId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_goal_kickers_leagueId_fkey') THEN
    ALTER TABLE "football_goal_kickers" ADD CONSTRAINT "football_goal_kickers_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'football_goal_kickers_clubId_fkey') THEN
    ALTER TABLE "football_goal_kickers" ADD CONSTRAINT "football_goal_kickers_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
