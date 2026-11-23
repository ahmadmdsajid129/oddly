-- ============================================================================
-- Oddly Stage L3 (Phase 10N): Twin Depth & Mutual Pairing Migration
-- 013_twin_depth_and_mutual_pairing.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds lane_history_signatures, ensures matches columns, and adds twin_results view
-- ============================================================================

BEGIN;

-- 1. lane_history_signatures — Compact 32-Byte BitMinHash Signatures (ADR-047 / P10N.02)
CREATE TABLE IF NOT EXISTS lane_history_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  signature BYTEA NOT NULL, -- 32 bytes (256 bits)
  days_active INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lane_history_signatures UNIQUE (player_id, lane_id)
);

CREATE INDEX IF NOT EXISTS idx_lane_history_sig_player ON lane_history_signatures(player_id);
CREATE INDEX IF NOT EXISTS idx_lane_history_sig_lane ON lane_history_signatures(lane_id);

-- 2. Ensure matches columns for Stage L3 Twin Depth & Mutual Pairing
ALTER TABLE matches ADD COLUMN IF NOT EXISTS lane_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tie_group_size INT DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_mutual BOOLEAN DEFAULT true;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tie_break_reason VARCHAR(30) DEFAULT 'similarity';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS questions_compared INT DEFAULT 5;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS history_days INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_matches_lane_drop_date ON matches(drop_date, lane_id);
CREATE INDEX IF NOT EXISTS idx_matches_tie_group_size ON matches(tie_group_size);

-- 3. Compatibility View: twin_results aliasing matches table (P10N.01)
CREATE OR REPLACE VIEW twin_results AS SELECT * FROM matches;

COMMIT;

