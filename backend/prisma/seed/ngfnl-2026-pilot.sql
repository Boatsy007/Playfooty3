-- ─────────────────────────────────────────────────────────────────────────────
-- CNCA Rankings — NGFNL 2026 Pilot Seed
-- North Gippsland Football Netball League, A Grade Netball, 2026 Season
-- Round 12 standings (mid-season snapshot)
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste entire file → Run
--
-- Power ratings pre-calculated using the CNCA ranking engine weights:
--   winPercentage=0.25, goalsFor=0.10, goalsAgainst=0.10, percentage=0.15,
--   leagueStrength=0.20, recentForm=0.10, finalsSuccess=0.05,
--   strengthOfOpposition=0.05, consistency=0.10
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. VIC State ──────────────────────────────────────────────────────────────
INSERT INTO states (id, code, name, "createdAt")
VALUES (gen_random_uuid()::text, 'VIC', 'Victoria', now())
ON CONFLICT (code) DO NOTHING;

-- ── 2. League ─────────────────────────────────────────────────────────────────
WITH vic AS (SELECT id FROM states WHERE code = 'VIC')
INSERT INTO leagues (
  id, name, "shortName", "stateId", "isActive",
  "strengthScore", "strengthTier", "strengthNotes",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'North Gippsland FNL - A Grade Netball',
  'NGFNL A Grade',
  vic.id,
  true,
  58,
  3,
  'North Gippsland region, competitive A Grade. Tier 3 country regional.',
  now(), now()
FROM vic
WHERE NOT EXISTS (
  SELECT 1 FROM leagues
  WHERE "shortName" = 'NGFNL A Grade' AND "stateId" = (SELECT id FROM states WHERE code = 'VIC')
);

-- ── 3. League Source ──────────────────────────────────────────────────────────
WITH league AS (
  SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade'
)
INSERT INTO league_sources (
  id, "leagueId", "sourceType", "ladderUrl", season, "isActive",
  notes, "lastStatus", "lastScrapedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  league.id,
  'MANUAL_ENTRY',
  'https://www.playhq.com/afl/org/north-gippsland-football-netball-league/north-gippsland-football-netball-league-2026/1a4dae95',
  '2026',
  true,
  'PlayHQ season URL documented. Live scraping requires Playwright (JS-rendered). Manual seed for pilot.',
  'SUCCESS',
  now(),
  now(), now()
FROM league
WHERE NOT EXISTS (
  SELECT 1 FROM league_sources
  WHERE "leagueId" = (SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade')
  AND season = '2026' AND "sourceType" = 'MANUAL_ENTRY'
);

-- ── 4. Clubs ──────────────────────────────────────────────────────────────────
WITH vic AS (SELECT id FROM states WHERE code = 'VIC')
INSERT INTO clubs (id, name, slug, "shortName", "stateId", region, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.name, c.slug, c."shortName", vic.id, c.region, true, now(), now()
FROM vic, (VALUES
  ('Heyfield',              'heyfield-nc',   'Heyfield',   'Heyfield'),
  ('Rosedale',              'rosedale-nc',   'Rosedale',   'Rosedale'),
  ('Yarram',                'yarram-nc',     'Yarram',     'Yarram'),
  ('Churchill',             'churchill-nc',  'Churchill',  'Latrobe Valley'),
  ('Sale City',             'sale-city-nc',  'Sale City',  'Sale'),
  ('Woodside',              'woodside-nc',   'Woodside',   'Woodside'),
  ('Gormandale',            'gormandale-nc', 'Gormandale', 'Gormandale'),
  ('Traralgon Tyers United','ttu-nc',        'TTU',        'Traralgon')
) AS c(name, slug, "shortName", region)
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Club League Seasons ────────────────────────────────────────────────────
WITH league AS (SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade')
INSERT INTO club_league_seasons (
  id, "clubId", "leagueId", season, grade, "isActive",
  played, wins, losses, draws, "goalsFor", "goalsAgainst", percentage, points,
  "finalsWins", "finalsLosses", "isPremier",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  cl.id,
  league.id,
  '2026',
  'A Grade',
  true,
  s.played, s.wins, s.losses, s.draws,
  s.goals_for, s.goals_against, s.pct, s.pts,
  0, 0, false,
  now(), now()
FROM league
JOIN (VALUES
  ('heyfield-nc',   12, 11, 1,  0, 624, 398, 156.8, 44),
  ('rosedale-nc',   12,  9, 3,  0, 578, 432, 133.8, 36),
  ('yarram-nc',     12,  8, 4,  0, 551, 462, 119.3, 32),
  ('churchill-nc',  12,  7, 5,  0, 519, 481, 107.9, 28),
  ('sale-city-nc',  12,  6, 6,  0, 492, 492, 100.0, 24),
  ('woodside-nc',   12,  4, 8,  0, 447, 535,  83.5, 16),
  ('gormandale-nc', 12,  3, 9,  0, 403, 571,  70.6, 12),
  ('ttu-nc',        12,  0, 12, 0, 350, 593,  59.0,  0)
) AS s(slug, played, wins, losses, draws, goals_for, goals_against, pct, pts)
JOIN clubs cl ON cl.slug = s.slug
ON CONFLICT ("clubId", "leagueId", season, grade) DO UPDATE SET
  played        = EXCLUDED.played,
  wins          = EXCLUDED.wins,
  losses        = EXCLUDED.losses,
  draws         = EXCLUDED.draws,
  "goalsFor"    = EXCLUDED."goalsFor",
  "goalsAgainst"= EXCLUDED."goalsAgainst",
  percentage    = EXCLUDED.percentage,
  points        = EXCLUDED.points,
  "updatedAt"   = now();

-- ── 6. Ranking Run ────────────────────────────────────────────────────────────
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
-- If a completed run for this week already exists, leave it alone
ON CONFLICT DO NOTHING;

-- ── 7. Ranking Entries ────────────────────────────────────────────────────────
-- Power ratings pre-calculated from CNCA engine (cohort-normalised).
-- Weights: winPct=0.25 gf=0.10 ga=0.10 pct=0.15 ls=0.20 rf=0.10 fin=0.05 soo=0.05 con=0.10
WITH
  run    AS (SELECT id FROM ranking_runs WHERE "weekLabel" = '2026-W27' AND season = '2026' ORDER BY "createdAt" DESC LIMIT 1),
  league AS (SELECT id FROM leagues WHERE "shortName" = 'NGFNL A Grade')
INSERT INTO ranking_entries (
  id, "runId", "clubId", "clubName", "leagueId", "leagueName",
  state, rank, "previousRank", "rankMovement",
  "powerRating", "componentScores", "recentForm", "calculatedAt",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  run.id,
  cl.id,
  s."clubName",
  league.id,
  'North Gippsland FNL - A Grade Netball',
  'VIC',
  s.rank,
  NULL,
  0,
  s."powerRating",
  s."componentScores",
  s."recentForm",
  now()::text,
  now()
FROM run, league,
(VALUES
  (1, 'Heyfield',              'heyfield-nc',   87.53,
   '{"winPercentage":91.67,"goalsFor":100.0,"goalsAgainst":100.0,"percentage":78.4,"leagueStrength":58.0,"recentForm":100.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":87.55}',
   '["W","W","W","W","W"]'),
  (2, 'Rosedale',              'rosedale-nc',   75.05,
   '{"winPercentage":75.0,"goalsFor":92.63,"goalsAgainst":82.56,"percentage":66.9,"leagueStrength":58.0,"recentForm":73.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":73.11}',
   '["W","W","W","L","W"]'),
  (3, 'Yarram',                'yarram-nc',     67.09,
   '{"winPercentage":66.67,"goalsFor":88.3,"goalsAgainst":67.18,"percentage":59.65,"leagueStrength":58.0,"recentForm":53.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":64.95}',
   '["W","L","W","W","L"]'),
  (4, 'Churchill',             'churchill-nc',  61.21,
   '{"winPercentage":58.33,"goalsFor":83.17,"goalsAgainst":57.44,"percentage":53.95,"leagueStrength":58.0,"recentForm":46.67,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":57.11}',
   '["W","W","L","W","L"]'),
  (5, 'Sale City',             'sale-city-nc',  56.16,
   '{"winPercentage":50.0,"goalsFor":78.85,"goalsAgainst":51.79,"percentage":50.0,"leagueStrength":58.0,"recentForm":40.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":50.0}',
   '["L","W","L","W","L"]'),
  (6, 'Woodside',              'woodside-nc',   44.34,
   '{"winPercentage":33.33,"goalsFor":71.63,"goalsAgainst":29.74,"percentage":41.75,"leagueStrength":58.0,"recentForm":20.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":35.11}',
   '["L","L","W","L","L"]'),
  (7, 'Gormandale',            'gormandale-nc', 37.13,
   '{"winPercentage":25.0,"goalsFor":64.58,"goalsAgainst":11.28,"percentage":35.3,"leagueStrength":58.0,"recentForm":13.33,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":25.67}',
   '["L","W","L","L","L"]'),
  (8, 'Traralgon Tyers United','ttu-nc',        24.78,
   '{"winPercentage":0.0,"goalsFor":56.09,"goalsAgainst":0.0,"percentage":29.5,"leagueStrength":58.0,"recentForm":0.0,"finalsSuccess":0.0,"strengthOfOpposition":50.0,"consistency":6.5}',
   '["L","L","L","L","L"]')
) AS s(rank, "clubName", slug, "powerRating", "componentScores", "recentForm")
JOIN clubs cl ON cl.slug = s.slug
WHERE NOT EXISTS (
  SELECT 1 FROM ranking_entries re WHERE re."runId" = run.id AND re."clubId" = cl.id
);

COMMIT;

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT
  re.rank,
  re."clubName",
  re."powerRating",
  re."recentForm"
FROM ranking_entries re
JOIN ranking_runs rr ON rr.id = re."runId"
WHERE rr."weekLabel" = '2026-W27' AND rr.season = '2026'
ORDER BY re.rank;
