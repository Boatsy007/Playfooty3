-- ─────────────────────────────────────────────────────────────────────────────
-- CNCA Rankings — NGFNL 2026 Pilot Seed  (v2 — DELETE + INSERT, no ON CONFLICT)
-- North Gippsland Football Netball League, A Grade Netball, 2026 Season
-- Round 12 standings (mid-season snapshot)
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste entire file → Run
--
-- Safe to re-run: deletes NGFNL pilot rows first, then inserts fresh.
-- Does NOT touch other leagues, states, or data.
--
-- Power ratings pre-calculated using the CNCA ranking engine weights:
--   winPercentage=0.25  goalsFor=0.10  goalsAgainst=0.10  percentage=0.15
--   leagueStrength=0.20  recentForm=0.10  finalsSuccess=0.05
--   strengthOfOpposition=0.05  consistency=0.10
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Step 1: Delete existing NGFNL pilot data (most-dependent first) ───────────

-- ranking_entries reference ranking_runs, clubs, leagues
DELETE FROM ranking_entries
WHERE "clubId" IN (
  SELECT id FROM clubs
  WHERE slug IN (
    'heyfield-nc','rosedale-nc','yarram-nc','churchill-nc',
    'sale-city-nc','woodside-nc','gormandale-nc','ttu-nc'
  )
);

-- ranking_snapshots reference clubs
DELETE FROM ranking_snapshots
WHERE "clubId" IN (
  SELECT id FROM clubs
  WHERE slug IN (
    'heyfield-nc','rosedale-nc','yarram-nc','churchill-nc',
    'sale-city-nc','woodside-nc','gormandale-nc','ttu-nc'
  )
);

-- ranking_runs that belong to the NGFNL pilot
DELETE FROM ranking_runs
WHERE notes LIKE '%NGFNL pilot%';

-- club_league_seasons reference clubs and leagues
DELETE FROM club_league_seasons
WHERE "clubId" IN (
  SELECT id FROM clubs
  WHERE slug IN (
    'heyfield-nc','rosedale-nc','yarram-nc','churchill-nc',
    'sale-city-nc','woodside-nc','gormandale-nc','ttu-nc'
  )
);

-- club_name_variants reference clubs
DELETE FROM club_name_variants
WHERE "clubId" IN (
  SELECT id FROM clubs
  WHERE slug IN (
    'heyfield-nc','rosedale-nc','yarram-nc','churchill-nc',
    'sale-city-nc','woodside-nc','gormandale-nc','ttu-nc'
  )
);

-- league_sources reference leagues
DELETE FROM league_sources
WHERE "leagueId" IN (
  SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade'
);

-- clubs
DELETE FROM clubs
WHERE slug IN (
  'heyfield-nc','rosedale-nc','yarram-nc','churchill-nc',
  'sale-city-nc','woodside-nc','gormandale-nc','ttu-nc'
);

-- league
DELETE FROM leagues WHERE "shortName" = 'NGFNL A Grade';

-- ── Step 2: VIC state (insert only if missing — other data may use it) ────────

INSERT INTO states (id, code, name, "createdAt")
VALUES (gen_random_uuid()::text, 'VIC', 'Victoria', now())
ON CONFLICT (code) DO NOTHING;

-- ── Step 3: League ────────────────────────────────────────────────────────────

INSERT INTO leagues (
  id, name, "shortName", "stateId", "isActive",
  "strengthScore", "strengthTier", "strengthNotes",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'North Gippsland FNL - A Grade Netball',
  'NGFNL A Grade',
  s.id,
  true,
  58,
  3,
  'North Gippsland region, competitive A Grade. Tier 3 country regional.',
  now(), now()
FROM states s
WHERE s.code = 'VIC';

-- ── Step 4: League source ─────────────────────────────────────────────────────

INSERT INTO league_sources (
  id, "leagueId", "sourceType", "ladderUrl",
  season, "isActive", notes, "lastStatus", "lastScrapedAt",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  l.id,
  'MANUAL_ENTRY',
  'https://www.playhq.com/afl/org/north-gippsland-football-netball-league/north-gippsland-football-netball-league-2026/1a4dae95',
  '2026',
  true,
  'PlayHQ season URL retained for future Playwright scraping. Manual seed for pilot.',
  'SUCCESS',
  now(), now(), now()
FROM leagues l
WHERE l."shortName" = 'NGFNL A Grade';

-- ── Step 5: Clubs ─────────────────────────────────────────────────────────────

INSERT INTO clubs (
  id, name, slug, "shortName", "stateId", region,
  "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c.club_name,
  c.slug,
  c.short_name,
  s.id,
  c.region,
  true, now(), now()
FROM states s
CROSS JOIN (VALUES
  ('Heyfield',               'heyfield-nc',   'Heyfield',   'Heyfield'),
  ('Rosedale',               'rosedale-nc',   'Rosedale',   'Rosedale'),
  ('Yarram',                 'yarram-nc',      'Yarram',     'Yarram'),
  ('Churchill',              'churchill-nc',   'Churchill',  'Latrobe Valley'),
  ('Sale City',              'sale-city-nc',   'Sale City',  'Sale'),
  ('Woodside',               'woodside-nc',    'Woodside',   'Woodside'),
  ('Gormandale',             'gormandale-nc',  'Gormandale', 'Gormandale'),
  ('Traralgon Tyers United', 'ttu-nc',         'TTU',        'Traralgon')
) AS c(club_name, slug, short_name, region)
WHERE s.code = 'VIC';

-- ── Step 6: Club league seasons ───────────────────────────────────────────────

INSERT INTO club_league_seasons (
  id, "clubId", "leagueId", season, grade, "isActive",
  played, wins, losses, draws,
  "goalsFor", "goalsAgainst", percentage, points,
  "finalsWins", "finalsLosses", "isPremier",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  cl.id,
  l.id,
  '2026',
  'A Grade',
  true,
  d.played::int,
  d.wins::int,
  d.losses::int,
  d.draws::int,
  d.gf::int,
  d.ga::int,
  d.pct::float,
  d.pts::int,
  0, 0, false,
  now(), now()
FROM leagues l
CROSS JOIN (VALUES
  ('heyfield-nc',   12, 11,  1,  0, 624, 398, 156.8, 44),
  ('rosedale-nc',   12,  9,  3,  0, 578, 432, 133.8, 36),
  ('yarram-nc',     12,  8,  4,  0, 551, 462, 119.3, 32),
  ('churchill-nc',  12,  7,  5,  0, 519, 481, 107.9, 28),
  ('sale-city-nc',  12,  6,  6,  0, 492, 492, 100.0, 24),
  ('woodside-nc',   12,  4,  8,  0, 447, 535,  83.5, 16),
  ('gormandale-nc', 12,  3,  9,  0, 403, 571,  70.6, 12),
  ('ttu-nc',        12,  0, 12,  0, 350, 593,  59.0,  0)
) AS d(slug, played, wins, losses, draws, gf, ga, pct, pts)
JOIN clubs cl ON cl.slug = d.slug
WHERE l."shortName" = 'NGFNL A Grade';

-- ── Step 7: Ranking run + entries (writable CTE links run id to entries) ──────
-- Power ratings pre-calculated from CNCA engine (cohort-normalised, 8 clubs).

WITH new_run AS (
  INSERT INTO ranking_runs (
    id, "weekLabel", season, status, "clubCount", "completedAt", notes, "createdAt"
  )
  VALUES (
    gen_random_uuid()::text,
    '2026-W27',
    '2026',
    'COMPLETED',
    8,
    now(),
    'NGFNL pilot — manual seed. https://www.playhq.com/afl/org/north-gippsland-football-netball-league/north-gippsland-football-netball-league-2026/1a4dae95',
    now()
  )
  RETURNING id
)
INSERT INTO ranking_entries (
  id, "runId", "clubId", "clubName", "leagueId", "leagueName",
  state, rank, "previousRank", "rankMovement",
  "powerRating", "componentScores", "recentForm", "calculatedAt",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  new_run.id,
  cl.id,
  d.club_name,
  l.id,
  'North Gippsland FNL - A Grade Netball',
  'VIC',
  d.rank::int,
  NULL,
  0,
  d.power_rating::float,
  d.component_scores,
  d.recent_form,
  now()::text,
  now()
FROM new_run
CROSS JOIN (VALUES
  (1, 'Heyfield',               'heyfield-nc',   87.53,
   '{"winPercentage":91.67,"goalsFor":100.0,"goalsAgainst":100.0,"percentage":78.4,"leagueStrength":58.0,"recentForm":100.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":87.55}',
   '["W","W","W","W","W"]'),
  (2, 'Rosedale',               'rosedale-nc',   75.05,
   '{"winPercentage":75.0,"goalsFor":92.63,"goalsAgainst":82.56,"percentage":66.9,"leagueStrength":58.0,"recentForm":73.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":73.11}',
   '["W","W","W","L","W"]'),
  (3, 'Yarram',                 'yarram-nc',      67.09,
   '{"winPercentage":66.67,"goalsFor":88.3,"goalsAgainst":67.18,"percentage":59.65,"leagueStrength":58.0,"recentForm":53.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":64.95}',
   '["W","L","W","W","L"]'),
  (4, 'Churchill',              'churchill-nc',   61.21,
   '{"winPercentage":58.33,"goalsFor":83.17,"goalsAgainst":57.44,"percentage":53.95,"leagueStrength":58.0,"recentForm":46.67,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":57.11}',
   '["W","W","L","W","L"]'),
  (5, 'Sale City',              'sale-city-nc',   56.16,
   '{"winPercentage":50.0,"goalsFor":78.85,"goalsAgainst":51.79,"percentage":50.0,"leagueStrength":58.0,"recentForm":40.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":50.0}',
   '["L","W","L","W","L"]'),
  (6, 'Woodside',               'woodside-nc',    44.34,
   '{"winPercentage":33.33,"goalsFor":71.63,"goalsAgainst":29.74,"percentage":41.75,"leagueStrength":58.0,"recentForm":20.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":35.11}',
   '["L","L","W","L","L"]'),
  (7, 'Gormandale',             'gormandale-nc',  37.13,
   '{"winPercentage":25.0,"goalsFor":64.58,"goalsAgainst":11.28,"percentage":35.3,"leagueStrength":58.0,"recentForm":13.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":25.67}',
   '["L","W","L","L","L"]'),
  (8, 'Traralgon Tyers United', 'ttu-nc',         24.78,
   '{"winPercentage":0.0,"goalsFor":56.09,"goalsAgainst":0.0,"percentage":29.5,"leagueStrength":58.0,"recentForm":0.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":6.5}',
   '["L","L","L","L","L"]')
) AS d(rank, club_name, slug, power_rating, component_scores, recent_form)
JOIN clubs cl ON cl.slug = d.slug
CROSS JOIN (SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade') l;

COMMIT;

-- ── Verify: should return 8 rows ordered by rank ──────────────────────────────
SELECT
  re.rank,
  re."clubName",
  re."powerRating",
  re."recentForm"
FROM ranking_entries re
JOIN ranking_runs rr ON rr.id = re."runId"
WHERE rr."weekLabel" = '2026-W27'
  AND rr.season = '2026'
ORDER BY re.rank;
