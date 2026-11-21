-- ============================================================================
-- Oddly Stage M5 & M6 (Phase 10I): Taste Dimension & Recognition Engine
-- 009_recognition_engine.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds badge_definitions, creator_badges, featured_memes
-- ============================================================================

BEGIN;

-- 1. Badge Definitions Table (Catalogue of Creator and Milestones Recognition Badges)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'certified_wit', 'absurd_instinct', 'streak_centurion'
  name_i18n JSONB NOT NULL,
  description_i18n JSONB NOT NULL,
  icon_key VARCHAR(50) NOT NULL,
  benchmark_config JSONB NOT NULL, -- e.g. {"min_raters": 500, "min_funny_pct": 70, "min_wilson_lb": 0.70}
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_definitions_key ON badge_definitions(key);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_status ON badge_definitions(status);

-- 2. Creator Badges Table (User-Earned Badge Awards)
CREATE TABLE IF NOT EXISTS creator_badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  meme_id TEXT REFERENCES meme_submissions(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_creator_badges_player_badge UNIQUE (player_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_badges_player ON creator_badges(player_id);
CREATE INDEX IF NOT EXISTS idx_creator_badges_badge ON creator_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_creator_badges_meme ON creator_badges(meme_id);

-- 3. Featured Memes Table (Curated "Meme of the Week" Showcase)
CREATE TABLE IF NOT EXISTS featured_memes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES meme_submissions(id) ON DELETE CASCADE,
  week_start_date DATE UNIQUE NOT NULL,
  curator_notes TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_memes_week ON featured_memes(week_start_date);
CREATE INDEX IF NOT EXISTS idx_featured_memes_submission ON featured_memes(submission_id);

-- 4. Initial Recognition App Config Seeds
INSERT INTO app_config (id, key, value, updated_at) VALUES
  (gen_random_uuid()::text, 'orbit.taste_sync_min_shared', '5', NOW()),
  (gen_random_uuid()::text, 'feature.recognition', 'true', NOW()),
  (gen_random_uuid()::text, 'feature.orbit_subject_sync', 'true', NOW())
ON CONFLICT (key) DO NOTHING;

-- 5. Seed Core Badge Definitions
INSERT INTO badge_definitions (id, key, name_i18n, description_i18n, icon_key, benchmark_config, status) VALUES
  (
    gen_random_uuid()::text,
    'certified_wit',
    '{"en": "Certified Wit", "hi": "प्रमाणित हास्य", "gu": "પ્રમાણિત વિનોદ"}'::jsonb,
    '{"en": "Authored a community meme rated Funny by 70%+ of at least 500 raters", "hi": "कम से कम 500 मतदाताओं द्वारा 70%+ मजेदार आंका गया मीम", "gu": "ઓછામાં ઓછા 500 મતદારો દ્વારા 70%+ રમુજી ક્રમાંકિત મીમ"}'::jsonb,
    'badge_certified_wit',
    '{"min_raters": 500, "min_funny_pct": 70, "min_wilson_lb": 0.65}'::jsonb,
    'active'
  ),
  (
    gen_random_uuid()::text,
    'absurd_instinct',
    '{"en": "Absurd Instinct", "hi": "अनोखा सहज ज्ञान", "gu": "વિચિત્ર વૃત્તિ"}'::jsonb,
    '{"en": "Achieved Wilson score >= 0.75 across at least 200 raters", "hi": "कम से कम 200 मतदाताओं में विल्सन स्कोर 0.75+ प्राप्त किया", "gu": "ઓછામાં ઓછા 200 મતદારોમાં વિલ્સન સ્કોર 0.75+ પ્રાપ્ત કર્યો"}'::jsonb,
    'badge_absurd_instinct',
    '{"min_raters": 200, "min_wilson_lb": 0.75}'::jsonb,
    'active'
  ),
  (
    gen_random_uuid()::text,
    'prolific_creator',
    '{"en": "Prolific Creator", "hi": "सक्रिय निर्माता", "gu": "સક્રિય સર્જક"}'::jsonb,
    '{"en": "Created 10 or more approved memes in Meme Lab", "hi": "मीम लैब में 10 या अधिक स्वीकृत मीम बनाए", "gu": "મીમ લેબમાં 10 કે તેથી વધુ માન્ય મીમ બનાવ્યા"}'::jsonb,
    'badge_prolific_creator',
    '{"min_approved_memes": 10}'::jsonb,
    'active'
  )
ON CONFLICT (key) DO NOTHING;

COMMIT;

