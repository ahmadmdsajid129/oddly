-- ============================================================================
-- Oddly Stage M3 (Phase 10G): Meme Lab (User Captions & Moderation Queue)
-- 007_meme_lab.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds meme_submissions, meme_ratings, meme_stats, meme_exposures, moderation_actions
-- ============================================================================

BEGIN;

-- 1. Meme Submissions Table (Rule 18 Scoped Free-Text Exception <= 100 chars)
CREATE TABLE IF NOT EXISTS meme_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES meme_templates(id) ON DELETE CASCADE,
  caption_text VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- 'queued', 'approved', 'rejected', 'retired'
  turnstile_verified BOOLEAN NOT NULL DEFAULT true,
  originality_attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderation_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meme_submissions_author ON meme_submissions(author_player_id);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_status ON meme_submissions(status);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_template ON meme_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_meme_submissions_created ON meme_submissions(created_at);

-- 2. Meme Ratings Table (Post-Drop Meme Corner Ratings)
CREATE TABLE IF NOT EXISTS meme_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES meme_submissions(id) ON DELETE CASCADE,
  rater_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rating VARCHAR(20) NOT NULL, -- 'funny', 'not_for_me'
  drop_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meme_ratings_submission_rater UNIQUE (submission_id, rater_player_id)
);

CREATE INDEX IF NOT EXISTS idx_meme_ratings_submission ON meme_ratings(submission_id);
CREATE INDEX IF NOT EXISTS idx_meme_ratings_rater ON meme_ratings(rater_player_id);
CREATE INDEX IF NOT EXISTS idx_meme_ratings_drop_date ON meme_ratings(drop_date);

-- 3. Meme Stats Table (Aggregated Ratings and Wilson Score Lower Bound)
CREATE TABLE IF NOT EXISTS meme_stats (
  submission_id TEXT PRIMARY KEY REFERENCES meme_submissions(id) ON DELETE CASCADE,
  impressions INT NOT NULL DEFAULT 0,
  raters INT NOT NULL DEFAULT 0,
  funny_count INT NOT NULL DEFAULT 0,
  not_for_me_count INT NOT NULL DEFAULT 0,
  wilson_lb DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  last_shown_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meme_stats_wilson ON meme_stats(wilson_lb DESC);

-- 4. Meme Exposures Table (Impression Tracking for Exploration/Exploitation & Diversity)
CREATE TABLE IF NOT EXISTS meme_exposures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES meme_submissions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  drop_date DATE NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meme_exposures_sub_player_drop UNIQUE (submission_id, player_id, drop_date)
);

CREATE INDEX IF NOT EXISTS idx_meme_exposures_player_date ON meme_exposures(player_id, drop_date);
CREATE INDEX IF NOT EXISTS idx_meme_exposures_submission ON meme_exposures(submission_id);

-- 5. Moderation Actions Table (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES meme_submissions(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL, -- 'approve', 'reject', 'retire', 'takedown'
  reason TEXT NOT NULL,
  note TEXT,
  admin_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_submission ON moderation_actions(submission_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin ON moderation_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at);

-- 6. Seed App Config Runtime Keys for Stage M3
INSERT INTO app_config (id, key, value, updated_at)
VALUES 
  (gen_random_uuid()::text, 'memes.max_caption_len', '100'::jsonb, NOW()),
  (gen_random_uuid()::text, 'memes.daily_submission_cap', '2'::jsonb, NOW()),
  (gen_random_uuid()::text, 'memes.min_raters_wilson', '200'::jsonb, NOW()),
  (gen_random_uuid()::text, 'memes.exploration_pct', '0.20'::jsonb, NOW()),
  (gen_random_uuid()::text, 'memes.freshness_days', '14'::jsonb, NOW()),
  (gen_random_uuid()::text, 'feature.meme_lab', 'true'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

COMMIT;
