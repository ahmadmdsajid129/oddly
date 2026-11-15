-- ============================================================================
-- Oddly Stage F3 (Phase 10C): Telepathy Foundation Migration
-- 003_telepathy_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds telepathy_question_id to drops table
-- Range-partitioned table telepathy_guesses by drop_date with 90-day retention
-- ============================================================================

BEGIN;

-- 1. Extend drops table with telepathy_question_id
ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS telepathy_question_id TEXT REFERENCES questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drops_telepathy_question_id ON drops(telepathy_question_id);

-- 2. Partitioned Table: telepathy_guesses
CREATE TABLE IF NOT EXISTS telepathy_guesses (
  id TEXT NOT NULL,
  orbit_id TEXT NOT NULL REFERENCES orbits(id) ON DELETE CASCADE,
  drop_date DATE NOT NULL,
  guesser_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  guessed_option_key TEXT NOT NULL,
  partner_option_key TEXT,
  hit BOOLEAN,
  baseline_p DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telepathy_guesses_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT telepathy_guesses_single_guess_per_orbit_day UNIQUE (orbit_id, drop_date, guesser_player_id)
) PARTITION BY RANGE (drop_date);

CREATE INDEX IF NOT EXISTS idx_telepathy_guesses_drop_date ON telepathy_guesses(drop_date);
CREATE INDEX IF NOT EXISTS idx_telepathy_guesses_orbit ON telepathy_guesses(orbit_id, drop_date);
CREATE INDEX IF NOT EXISTS idx_telepathy_guesses_guesser ON telepathy_guesses(guesser_player_id, drop_date);

-- 3. Default partition for telepathy_guesses (catches any missing pre-created partition)
CREATE TABLE IF NOT EXISTS telepathy_guesses_default PARTITION OF telepathy_guesses DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_telepathy_guesses_default_alert'
  ) THEN
    CREATE TRIGGER trg_telepathy_guesses_default_alert
    BEFORE INSERT ON telepathy_guesses_default
    FOR EACH ROW EXECUTE FUNCTION notify_default_partition();
  END IF;
END $$;

COMMIT;

