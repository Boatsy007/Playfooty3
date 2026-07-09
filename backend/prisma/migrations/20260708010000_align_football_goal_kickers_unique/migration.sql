-- Align goal kicker de-duplication with the public ladder identity.
ALTER TABLE "football_goal_kickers" ALTER COLUMN "sourceType" SET DEFAULT 'PLAYHQ';

CREATE UNIQUE INDEX IF NOT EXISTS "football_goal_kickers_season_grade_player_club_league_key"
  ON "football_goal_kickers"("season", "grade", "playerName", "clubName", "leagueName");
