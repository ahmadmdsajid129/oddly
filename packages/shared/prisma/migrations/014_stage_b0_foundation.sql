-- Stage B0: Foundation Migration
-- Expand-only schema additions for Stage B0 (Slices A0-A14, B1, B3)

-- 1. Synthetic data flag for demo isolation
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT false;

-- 2. Orbit Chat Unlock & State Machine Columns
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS unlock_state VARCHAR(20) DEFAULT 'locked';
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS unlocked_by VARCHAR(20);
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS chat_state VARCHAR(20) DEFAULT 'closed';
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS consent_player_id TEXT;
ALTER TABLE orbits ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- 3. Safety: Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    blocker_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blocker_blocked UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- 4. Twin Globe Arcs
CREATE TABLE IF NOT EXISTS globe_arcs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lane_id TEXT,
    region_a VARCHAR(10) NOT NULL,
    region_b VARCHAR(10) NOT NULL,
    bucket_time TIMESTAMPTZ NOT NULL,
    count INT NOT NULL DEFAULT 1,
    is_synthetic BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_globe_arcs_bucket ON globe_arcs(bucket_time);
CREATE INDEX IF NOT EXISTS idx_globe_arcs_lane_bucket ON globe_arcs(lane_id, bucket_time);

-- 5. Sync By Subject
CREATE TABLE IF NOT EXISTS orbit_subject_sync (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    orbit_id TEXT NOT NULL REFERENCES orbits(id) ON DELETE CASCADE,
    tag_slug VARCHAR(50) NOT NULL,
    agreed INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_orbit_tag_sync UNIQUE(orbit_id, tag_slug)
);
CREATE INDEX IF NOT EXISTS idx_orbit_subject_sync_orbit ON orbit_subject_sync(orbit_id);

-- 6. Duo Trial v0 (Chat Unlock Door 1)
CREATE TABLE IF NOT EXISTS trial_prompts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    prompt_text VARCHAR(300) NOT NULL,
    option_a VARCHAR(100) NOT NULL,
    option_b VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'lifestyle',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbit_trials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    orbit_id TEXT NOT NULL REFERENCES orbits(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    started_by TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    score INT,
    passed BOOLEAN,
    pass_mark INT NOT NULL DEFAULT 5,
    CONSTRAINT uq_orbit_trial_attempt UNIQUE(orbit_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_orbit_trials_orbit ON orbit_trials(orbit_id);

CREATE TABLE IF NOT EXISTS orbit_trial_answers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    trial_id TEXT NOT NULL REFERENCES orbit_trials(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    choice VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trial_player_prompt UNIQUE(trial_id, player_id, prompt_id)
);
CREATE INDEX IF NOT EXISTS idx_orbit_trial_answers_trial ON orbit_trial_answers(trial_id);

-- 7. Additive Bonus Rounds (Stage L9 / Slice B1)
CREATE TABLE IF NOT EXISTS bonus_rounds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    drop_id TEXT NOT NULL,
    lane_id TEXT NOT NULL,
    round_number INT NOT NULL DEFAULT 1,
    tie_group_hash VARCHAR(64) NOT NULL,
    question_ids JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closes_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_bonus_round UNIQUE(drop_id, tie_group_hash, round_number)
);
CREATE INDEX IF NOT EXISTS idx_bonus_rounds_drop ON bonus_rounds(drop_id);

CREATE TABLE IF NOT EXISTS bonus_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_id TEXT NOT NULL REFERENCES bonus_rounds(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bonus_participant UNIQUE(round_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_bonus_participants_round ON bonus_participants(round_id);

CREATE TABLE IF NOT EXISTS bonus_answers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_id TEXT NOT NULL REFERENCES bonus_rounds(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bonus_player_answers UNIQUE(round_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_bonus_answers_round ON bonus_answers(round_id);

CREATE TABLE IF NOT EXISTS bonus_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_id TEXT NOT NULL REFERENCES bonus_rounds(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    closest_peer_id TEXT,
    similarity_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    bonus_matches INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bonus_result UNIQUE(round_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_bonus_results_round ON bonus_results(round_id);

-- 8. Collector Badges (Stage L10 / Slice B3)
CREATE TABLE IF NOT EXISTS collector_badge_definitions (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(300) NOT NULL,
    icon_key VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collector_badges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    definition_id TEXT NOT NULL REFERENCES collector_badge_definitions(id),
    evidence_data JSONB,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    share_id VARCHAR(64) UNIQUE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT uq_player_collector_badge UNIQUE(player_id, definition_id)
);
CREATE INDEX IF NOT EXISTS idx_collector_badges_player ON collector_badges(player_id);

-- 9. Ops Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    actor VARCHAR(50) NOT NULL DEFAULT 'system',
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
