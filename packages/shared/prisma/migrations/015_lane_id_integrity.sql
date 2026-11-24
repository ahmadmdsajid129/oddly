-- ============================================================================
-- Oddly Stage B0: Data Safety & Lane ID Integrity Migration
-- 015_lane_id_integrity.sql
--
-- Guarantees:
-- 1. Drops: Prevents duplicate drops per lane per date, including NULL lane_id.
-- 2. Submissions: Replaces global (drop_date, player_id) unique constraint with
--    per-lane (drop_date, lane_id, player_id) unique constraint, enabling
--    players to participate in multiple lanes on the same day (D5).
-- 3. Invariant Checks: Adds CHECK constraints asserting lane_id IS NOT NULL
--    on core relational entities (drops, submissions, questions, matches).
-- ============================================================================

BEGIN;

-- 1. Backfill any stray NULLs to Everyday lane
UPDATE drops SET lane_id = '00000000-0000-4000-a000-000000000001' WHERE lane_id IS NULL;
UPDATE questions SET lane_id = '00000000-0000-4000-a000-000000000001' WHERE lane_id IS NULL;
UPDATE submissions SET lane_id = '00000000-0000-4000-a000-000000000001' WHERE lane_id IS NULL;
UPDATE submission_answers SET lane_id = '00000000-0000-4000-a000-000000000001' WHERE lane_id IS NULL;
UPDATE matches SET lane_id = '00000000-0000-4000-a000-000000000001' WHERE lane_id IS NULL;

-- 2. Drops integrity
ALTER TABLE drops DROP CONSTRAINT IF EXISTS chk_drops_lane_not_null;
ALTER TABLE drops ADD CONSTRAINT chk_drops_lane_not_null CHECK (lane_id IS NOT NULL);

-- Defensive partial unique index if NULL were ever permitted by expand-only migrations
CREATE UNIQUE INDEX IF NOT EXISTS uq_drops_drop_date_null ON drops(drop_date) WHERE lane_id IS NULL;

-- 3. Submissions integrity
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS chk_submissions_lane_not_null;
ALTER TABLE submissions ADD CONSTRAINT chk_submissions_lane_not_null CHECK (lane_id IS NOT NULL);

-- Drop legacy single-lane unique constraint on partitioned submissions
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_drop_player_uniq;
DROP INDEX IF EXISTS submissions_drop_player_uniq;

-- Add multi-lane partitioned unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_drop_lane_player ON submissions(drop_date, lane_id, player_id);

-- 4. Questions & Matches integrity
ALTER TABLE questions DROP CONSTRAINT IF EXISTS chk_questions_lane_not_null;
ALTER TABLE questions ADD CONSTRAINT chk_questions_lane_not_null CHECK (lane_id IS NOT NULL);

ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_matches_lane_not_null;
ALTER TABLE matches ADD CONSTRAINT chk_matches_lane_not_null CHECK (lane_id IS NOT NULL);

COMMIT;
