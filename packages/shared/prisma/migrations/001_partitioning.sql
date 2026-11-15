-- ============================================================================
-- Oddly Scale & Reliability Migration: 001_partitioning.sql
-- Range-partition submissions, submission_answers, matches, answer_stats by drop_date
-- Expand -> Migrate -> Contract Pattern
-- ============================================================================

BEGIN;

-- 1. Partition Alerts Table (records any inserts into DEFAULT partitions)
CREATE TABLE IF NOT EXISTS partition_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  drop_date DATE NOT NULL,
  row_id TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function for DEFAULT partition alerting
CREATE OR REPLACE FUNCTION notify_default_partition()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO partition_alerts (table_name, drop_date, row_id, alert_message)
  VALUES (
    TG_TABLE_NAME,
    NEW.drop_date,
    NEW.id::text,
    'Row inserted into DEFAULT partition - missing pre-created partition for drop_date: ' || NEW.drop_date::text
  );
  RAISE WARNING 'MISSING PARTITION ALERT: Table % received row for drop_date % into DEFAULT partition', TG_TABLE_NAME, NEW.drop_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing unpartitioned tables if they exist in dev (safe expand/contract)
-- Note: Dependent foreign keys are dropped first
DROP TABLE IF EXISTS share_cards CASCADE;
DROP TABLE IF EXISTS oddness_scores CASCADE;
DROP TABLE IF EXISTS submission_answers CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS answer_stats CASCADE;
DROP TABLE IF EXISTS answer_frequencies CASCADE;

-- 3. Partitioned Table: submissions
CREATE TABLE submissions (
  id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  player_id TEXT NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_bot_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT submissions_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT submissions_drop_req_uniq UNIQUE (drop_date, request_id),
  CONSTRAINT submissions_drop_player_uniq UNIQUE (drop_date, player_id)
) PARTITION BY RANGE (drop_date);

CREATE INDEX idx_submissions_drop_date ON submissions(drop_date);
CREATE INDEX idx_submissions_drop_id ON submissions(drop_date, drop_id);
CREATE INDEX idx_submissions_player_id ON submissions(drop_date, player_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- DEFAULT partition for submissions
CREATE TABLE submissions_default PARTITION OF submissions DEFAULT;
CREATE TRIGGER trg_submissions_default_alert
  AFTER INSERT ON submissions_default
  FOR EACH ROW EXECUTE FUNCTION notify_default_partition();

-- 4. Partitioned Table: submission_answers (detailed answers)
CREATE TABLE submission_answers (
  id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  player_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  value VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_answers_pk PRIMARY KEY (id, drop_date)
) PARTITION BY RANGE (drop_date);

CREATE INDEX idx_submission_answers_q_val ON submission_answers(drop_date, question_id, value);
CREATE INDEX idx_submission_answers_player ON submission_answers(drop_date, player_id);

-- DEFAULT partition for submission_answers
CREATE TABLE submission_answers_default PARTITION OF submission_answers DEFAULT;
CREATE TRIGGER trg_submission_answers_default_alert
  AFTER INSERT ON submission_answers_default
  FOR EACH ROW EXECUTE FUNCTION notify_default_partition();

-- 5. Partitioned Table: matches
CREATE TABLE matches (
  id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  player_a_id TEXT NOT NULL,
  player_b_id TEXT NOT NULL,
  submission_a_id TEXT,
  submission_b_id TEXT,
  similarity_score DOUBLE PRECISION NOT NULL,
  is_provisional BOOLEAN NOT NULL DEFAULT TRUE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  CONSTRAINT matches_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT matches_drop_player_a_uniq UNIQUE (drop_date, player_a_id),
  CONSTRAINT matches_drop_player_b_uniq UNIQUE (drop_date, player_b_id)
) PARTITION BY RANGE (drop_date);

CREATE INDEX idx_matches_drop_id ON matches(drop_date, drop_id);
CREATE INDEX idx_matches_player_a ON matches(drop_date, player_a_id);
CREATE INDEX idx_matches_player_b ON matches(drop_date, player_b_id);

-- DEFAULT partition for matches
CREATE TABLE matches_default PARTITION OF matches DEFAULT;
CREATE TRIGGER trg_matches_default_alert
  AFTER INSERT ON matches_default
  FOR EACH ROW EXECUTE FUNCTION notify_default_partition();

-- 6. Partitioned Table: answer_stats (live frequency distribution)
CREATE TABLE answer_stats (
  id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  question_id TEXT NOT NULL,
  value VARCHAR(200) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT answer_stats_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT answer_stats_drop_q_val_uniq UNIQUE (drop_date, question_id, value)
) PARTITION BY RANGE (drop_date);

CREATE INDEX idx_answer_stats_lookup ON answer_stats(drop_date, question_id);

-- DEFAULT partition for answer_stats
CREATE TABLE answer_stats_default PARTITION OF answer_stats DEFAULT;
CREATE TRIGGER trg_answer_stats_default_alert
  AFTER INSERT ON answer_stats_default
  FOR EACH ROW EXECUTE FUNCTION notify_default_partition();

-- 7. User History Summaries (compacted summaries before dropping raw 90-day answer partitions)
CREATE TABLE IF NOT EXISTS user_history_summaries (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  account_id TEXT,
  drop_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  similarity_score DOUBLE PRECISION NOT NULL,
  oddness_score DOUBLE PRECISION NOT NULL,
  percentile DOUBLE PRECISION NOT NULL,
  tier VARCHAR(32) NOT NULL,
  twin_player_id TEXT,
  twin_region VARCHAR(10),
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_history_summaries_player_date_uniq UNIQUE (player_id, drop_date)
);
CREATE INDEX IF NOT EXISTS idx_user_history_summaries_player ON user_history_summaries(player_id);
CREATE INDEX IF NOT EXISTS idx_user_history_summaries_date ON user_history_summaries(drop_date);

-- 8. Child tables with denormalised drop_date
CREATE TABLE oddness_scores (
  id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  raw_score DOUBLE PRECISION NOT NULL,
  percentile DOUBLE PRECISION NOT NULL,
  tier VARCHAR(32) NOT NULL,
  CONSTRAINT oddness_scores_pk PRIMARY KEY (id),
  CONSTRAINT oddness_scores_sub_date_uniq UNIQUE (submission_id, drop_date)
);
CREATE INDEX idx_oddness_scores_sub ON oddness_scores(submission_id);
CREATE INDEX idx_oddness_scores_tier ON oddness_scores(tier);

CREATE TABLE share_cards (
  id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  format VARCHAR(32) NOT NULL,
  storage_key TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT share_cards_pk PRIMARY KEY (id),
  CONSTRAINT share_cards_sub_format_uniq UNIQUE (submission_id, format)
);
CREATE INDEX idx_share_cards_sub ON share_cards(submission_id);

-- Backward compatibility view: answer_frequencies pointing to answer_stats
CREATE OR REPLACE VIEW answer_frequencies AS
SELECT id, question_id, value, count, probability
FROM answer_stats;

COMMIT;

