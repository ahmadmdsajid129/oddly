-- ============================================================================
-- Oddly Stage L1 (Phase 10L): Lanes Plumbing Foundation Migration
-- 012_lanes_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds lanes, lane_interest, player_lane_prefs, and expands lane_id columns
-- ============================================================================

BEGIN;

-- 1. lanes — Subject Drop Catalog & Configuration
CREATE TABLE IF NOT EXISTS lanes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'everyday', 'memes', 'gaming', etc.
  name_key VARCHAR(100) NOT NULL,
  description_key VARCHAR(150) NOT NULL,
  accent_token VARCHAR(50) NOT NULL, -- e.g. 'violet', 'sun', 'mint', 'coral', 'lilac', 'ink'
  icon_key VARCHAR(50) NOT NULL,     -- e.g. 'sparkles', 'laugh', 'utensils', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'planned', -- 'planned', 'preview', 'open', 'resting', 'retired'
  sort_order INT NOT NULL DEFAULT 100,
  age_rating VARCHAR(10) NOT NULL DEFAULT '18+',
  locale_set JSONB NOT NULL DEFAULT '["en", "hi"]'::jsonb,
  formats_allowed JSONB NOT NULL DEFAULT '["pick1", "pick2of6", "slider7"]'::jsonb,
  text_enabled BOOLEAN NOT NULL DEFAULT false,
  super_twin_enabled BOOLEAN NOT NULL DEFAULT true,
  gate_notes TEXT,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lanes_status ON lanes(status);
CREATE INDEX IF NOT EXISTS idx_lanes_slug ON lanes(slug);
CREATE INDEX IF NOT EXISTS idx_lanes_sort ON lanes(sort_order);

-- 2. lane_interest — Aggregate Opt-In for Planned Lanes ("Tell me when it opens")
CREATE TABLE IF NOT EXISTS lane_interest (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  guest_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lane_interest_player UNIQUE (lane_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lane_interest_lane ON lane_interest(lane_id);
CREATE INDEX IF NOT EXISTS idx_lane_interest_guest ON lane_interest(lane_id, guest_id);

-- 3. player_lane_prefs — Notification & History Toggles per Lane
CREATE TABLE IF NOT EXISTS player_lane_prefs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT false,
  last_played_at TIMESTAMPTZ,
  plays_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_player_lane_prefs UNIQUE (player_id, lane_id)
);

CREATE INDEX IF NOT EXISTS idx_player_lane_prefs_player ON player_lane_prefs(player_id);
CREATE INDEX IF NOT EXISTS idx_player_lane_prefs_lane ON player_lane_prefs(lane_id);

-- 4. Expand Existing Tables with Nullable lane_id and Lane Attributes (Rule L1/L2)
ALTER TABLE drops ADD COLUMN IF NOT EXISTS lane_id TEXT REFERENCES lanes(id);
ALTER TABLE drops DROP CONSTRAINT IF EXISTS drops_drop_date_key;
DROP INDEX IF EXISTS drops_drop_date_key CASCADE;
ALTER TABLE drops DROP CONSTRAINT IF EXISTS drops_lane_drop_date_key;
ALTER TABLE drops ADD CONSTRAINT drops_lane_drop_date_key UNIQUE (lane_id, drop_date);
CREATE INDEX IF NOT EXISTS idx_drops_lane_id ON drops(lane_id);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS lane_id TEXT REFERENCES lanes(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'pick1';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_tags JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scene_asset_key VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS entropy_estimate FLOAT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tie_risk_estimate FLOAT;
CREATE INDEX IF NOT EXISTS idx_questions_lane_id ON questions(lane_id);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS lane_id TEXT;
CREATE INDEX IF NOT EXISTS idx_submissions_lane_date ON submissions(drop_date, lane_id);

ALTER TABLE submission_answers ADD COLUMN IF NOT EXISTS lane_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sub_answers_lane ON submission_answers(drop_date, lane_id);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS lane_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tie_group_size INT DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_mutual BOOLEAN DEFAULT true;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tie_break_reason VARCHAR(30) DEFAULT 'similarity';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS questions_compared INT DEFAULT 5;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS history_days INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_matches_lane_date ON matches(drop_date, lane_id);

ALTER TABLE oddness_scores ADD COLUMN IF NOT EXISTS lane_id TEXT REFERENCES lanes(id);
CREATE INDEX IF NOT EXISTS idx_oddness_lane ON oddness_scores(lane_id);

ALTER TABLE anti_twin_results ADD COLUMN IF NOT EXISTS lane_id TEXT REFERENCES lanes(id);
CREATE INDEX IF NOT EXISTS idx_anti_twin_lane ON anti_twin_results(lane_id);

ALTER TABLE twin_keeps ADD COLUMN IF NOT EXISTS lane_id TEXT;
CREATE INDEX IF NOT EXISTS idx_twin_keeps_lane ON twin_keeps(lane_id);

ALTER TABLE orbits ADD COLUMN IF NOT EXISTS lane_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orbits_lane ON orbits(lane_id);

ALTER TABLE orbit_expressions ADD COLUMN IF NOT EXISTS lane_id TEXT;
ALTER TABLE telepathy_guesses ADD COLUMN IF NOT EXISTS lane_id TEXT;

-- 5. Seed Core 9 Lanes (Everyday & Memes open, 7 planned)
INSERT INTO lanes (id, slug, name_key, description_key, accent_token, icon_key, status, sort_order, opened_at)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'everyday', 'lane.everyday.name', 'lane.everyday.desc', 'violet', 'sparkles', 'open', 1, NOW()),
  ('00000000-0000-4000-a000-000000000002', 'memes', 'lane.memes.name', 'lane.memes.desc', 'sun', 'laugh', 'open', 2, NOW()),
  ('00000000-0000-4000-a000-000000000003', 'food', 'lane.food.name', 'lane.food.desc', 'coral', 'utensils', 'planned', 3, NULL),
  ('00000000-0000-4000-a000-000000000004', 'gaming', 'lane.gaming.name', 'lane.gaming.desc', 'mint', 'gamepad-2', 'planned', 4, NULL),
  ('00000000-0000-4000-a000-000000000005', 'work', 'lane.work.name', 'lane.work.desc', 'violet', 'briefcase', 'planned', 5, NULL),
  ('00000000-0000-4000-a000-000000000006', 'movies', 'lane.movies.name', 'lane.movies.desc', 'sun', 'film', 'planned', 6, NULL),
  ('00000000-0000-4000-a000-000000000007', 'music', 'lane.music.name', 'lane.music.desc', 'lilac', 'music', 'planned', 7, NULL),
  ('00000000-0000-4000-a000-000000000008', 'situations', 'lane.situations.name', 'lane.situations.desc', 'coral', 'heart-handshake', 'planned', 8, NULL),
  ('00000000-0000-4000-a000-000000000009', 'deep', 'lane.deep.name', 'lane.deep.desc', 'ink', 'compass', 'planned', 9, NULL)
ON CONFLICT (slug) DO UPDATE SET
  name_key = EXCLUDED.name_key,
  description_key = EXCLUDED.description_key,
  accent_token = EXCLUDED.accent_token,
  icon_key = EXCLUDED.icon_key,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order;

-- 6. Insert Stage L1 Configuration Parameters
INSERT INTO app_config (id, key, value, updated_at)
VALUES 
  (gen_random_uuid(), 'lane.closest_so_far_below', '200'::jsonb, NOW()),
  (gen_random_uuid(), 'lane.early_below', '500'::jsonb, NOW()),
  (gen_random_uuid(), 'lane.min_approved_drops_to_open', '8'::jsonb, NOW()),
  (gen_random_uuid(), 'lane.missing_drop_alert_hours', '24'::jsonb, NOW()),
  (gen_random_uuid(), 'lane.max_legacy_formats_in_everyday', '2'::jsonb, NOW()),
  (gen_random_uuid(), 'lane.min_high_entropy_questions', '3'::jsonb, NOW()),
  (gen_random_uuid(), 'match.tie_epsilon', '0.01'::jsonb, NOW()),
  (gen_random_uuid(), 'match.neighbour_limit_k', '32'::jsonb, NOW()),
  (gen_random_uuid(), 'match.weight_cap', '3.5'::jsonb, NOW()),
  (gen_random_uuid(), 'match.weight_cap_enabled', 'true'::jsonb, NOW()),
  (gen_random_uuid(), 'match.mutual_pairing_enabled', 'true'::jsonb, NOW()),
  (gen_random_uuid(), 'match.history_tiebreak_enabled', 'true'::jsonb, NOW()),
  (gen_random_uuid(), 'match.group_size_display_cap', '1000'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
