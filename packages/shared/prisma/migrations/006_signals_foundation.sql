-- ============================================================================
-- Oddly Stage M2 (Phase 10F): Signals Foundation
-- 006_signals_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds consents, analytics_ids, events_raw (partitioned), question_stats_daily, tag_stats_daily
-- ============================================================================

BEGIN;

-- 1. Consents Table (DPDP Default OFF)
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  purpose VARCHAR(30) NOT NULL, -- 'analytics' or 'personalisation'
  policy_version INT NOT NULL DEFAULT 1,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consents_player_purpose UNIQUE (player_id, purpose)
);

CREATE INDEX IF NOT EXISTS idx_consents_player_id ON consents(player_id);
CREATE INDEX IF NOT EXISTS idx_consents_purpose ON consents(purpose);

-- 2. Analytics IDs Table (1:1 Pseudonymous Identity Severance)
CREATE TABLE IF NOT EXISTS analytics_ids (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  analytics_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_ids_analytics_id ON analytics_ids(analytics_id);

-- 3. Consented Events Raw Table (Range-Partitioned by drop_date, 90-day retention)
CREATE TABLE IF NOT EXISTS events_raw (
  id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  event_name VARCHAR(50) NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_raw_pk PRIMARY KEY (drop_date, id)
) PARTITION BY RANGE (drop_date);

CREATE TABLE IF NOT EXISTS events_raw_default PARTITION OF events_raw DEFAULT;

CREATE INDEX IF NOT EXISTS idx_events_raw_analytics_id ON events_raw(analytics_id);
CREATE INDEX IF NOT EXISTS idx_events_raw_event_name ON events_raw(event_name);

-- 4. Question Stats Daily Table (Aggregated Metrics)
CREATE TABLE IF NOT EXISTS question_stats_daily (
  drop_date DATE NOT NULL,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  shown_count INT NOT NULL DEFAULT 0,
  answered_count INT NOT NULL DEFAULT 0,
  dwell_p50_ms INT NOT NULL DEFAULT 0,
  dwell_p90_ms INT NOT NULL DEFAULT 0,
  change_rate FLOAT NOT NULL DEFAULT 0.0,
  back_rate FLOAT NOT NULL DEFAULT 0.0,
  abandon_rate FLOAT NOT NULL DEFAULT 0.0,
  report_rate FLOAT NOT NULL DEFAULT 0.0,
  entropy FLOAT NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_stats_daily_pk PRIMARY KEY (drop_date, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_stats_daily_question ON question_stats_daily(question_id);

-- 5. Tag Stats Daily Table (Aggregated Subject Performance)
CREATE TABLE IF NOT EXISTS tag_stats_daily (
  drop_date DATE NOT NULL,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  completions INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  dwell_p50_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tag_stats_daily_pk PRIMARY KEY (drop_date, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_stats_daily_tag ON tag_stats_daily(tag_id);

-- 6. Insert Runtime Config and Feature Flags
INSERT INTO app_config (id, key, value, updated_at)
VALUES
  (gen_random_uuid(), 'feature.signals', 'true'::jsonb, NOW()),
  (gen_random_uuid(), 'signals.events_retention_days', '90'::jsonb, NOW()),
  (gen_random_uuid(), 'signals.sample_rate_l1', '0.50'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

COMMIT;

