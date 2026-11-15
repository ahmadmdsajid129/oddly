-- ============================================================================
-- Oddly Stage F4 (Phase 10D): Anti-Twin Foundation Migration
-- 004_antitwin_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Creates anti_twin_results table with 7-day rolling retention index
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS anti_twin_results (
  drop_date DATE NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opposite_submission_ref TEXT NOT NULL,
  differed_count INT NOT NULL,
  sample_size INT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT anti_twin_results_pk PRIMARY KEY (drop_date, player_id)
);

CREATE INDEX IF NOT EXISTS idx_anti_twin_results_drop_date ON anti_twin_results(drop_date);
CREATE INDEX IF NOT EXISTS idx_anti_twin_results_player ON anti_twin_results(player_id);

-- Insert default app_config entries if missing
INSERT INTO app_config (id, key, value, updated_at)
VALUES 
  (gen_random_uuid(), 'antitwin.candidate_sample_size', '2000'::jsonb, NOW()),
  (gen_random_uuid(), 'antitwin.min_pool_size', '200'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
