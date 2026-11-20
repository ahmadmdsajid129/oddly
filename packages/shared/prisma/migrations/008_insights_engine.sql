-- ============================================================================
-- Oddly Stage M4 (Phase 10H): Insights Engine (Statistics Only)
-- 008_insights_engine.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds player_taste, notification_timing_stats, editor_suggestions
-- ============================================================================

BEGIN;

-- 1. Player Taste Table (Consented, Smoothed Tag Affinity Scores)
-- Invariant: Derived only with active 'personalisation' consent; hard-deleted upon withdrawal
CREATE TABLE IF NOT EXISTS player_taste (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  affinity_score DOUBLE PRECISION NOT NULL DEFAULT 0.50,
  sample_size INT NOT NULL DEFAULT 0,
  last_engaged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_player_taste_player ON player_taste(player_id);
CREATE INDEX IF NOT EXISTS idx_player_taste_tag ON player_taste(tag_id);
CREATE INDEX IF NOT EXISTS idx_player_taste_affinity ON player_taste(affinity_score DESC);

-- 2. Notification Timing Stats Table (Cohort-Level Aggregate Send Hour Optimisation)
-- Invariant: No individual user profiling; hourly open buckets by cohort
CREATE TABLE IF NOT EXISTS notification_timing_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cohort_key VARCHAR(50) NOT NULL, -- e.g. "IN_18-24", "US_25-34", "GLOBAL"
  hour_of_day_utc SMALLINT NOT NULL, -- 0-23
  open_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  samples_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_timing_cohort_hour UNIQUE (cohort_key, hour_of_day_utc)
);

CREATE INDEX IF NOT EXISTS idx_notification_timing_cohort ON notification_timing_stats(cohort_key);

-- 3. Editor Suggestions Table (Drop Planning Advisory & Fatigue Lint)
CREATE TABLE IF NOT EXISTS editor_suggestions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  target_drop_date DATE NOT NULL,
  suggestion_type VARCHAR(50) NOT NULL, -- 'underused_tag', 'high_share_weekend', 'fatigue_warning'
  tag_id TEXT REFERENCES tags(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_suggestions_target_date ON editor_suggestions(target_drop_date);
CREATE INDEX IF NOT EXISTS idx_editor_suggestions_type ON editor_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_editor_suggestions_severity ON editor_suggestions(severity);

-- 4. App Config seeds for Insights Engine
INSERT INTO app_config (id, key, value, updated_at) VALUES
  (gen_random_uuid()::text, 'insights.min_taste_samples', '20', NOW()),
  (gen_random_uuid()::text, 'insights.fatigue_days_window', '4', NOW()),
  (gen_random_uuid()::text, 'insights.fatigue_max_occurrences', '2', NOW()),
  (gen_random_uuid()::text, 'feature.insights_engine', 'true', NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;

