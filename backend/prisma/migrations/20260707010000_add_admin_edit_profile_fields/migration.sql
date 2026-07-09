-- Safe additive fields for admin league/club profile editing.
-- No destructive operations; existing data is preserved.

ALTER TABLE "leagues"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "featuredLeague" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "clubs"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "featuredClub" BOOLEAN NOT NULL DEFAULT false;
