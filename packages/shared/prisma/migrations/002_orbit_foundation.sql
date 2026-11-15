-- ============================================================================
-- Oddly Stage F1 (Phase 10A): Orbit Foundation Migration
-- 002_orbit_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Range-partition twin_keeps and orbit_expressions by drop_date
-- Regular table orbits with lexicographical constraint (player_a_id < player_b_id)
-- ============================================================================

BEGIN;

-- 1. Enums / Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KeepStatus') THEN
    CREATE TYPE "KeepStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrbitStatus') THEN
    CREATE TYPE "OrbitStatus" AS ENUM ('active', 'ended');
  END IF;
END $$;

-- 2. Partitioned Table: twin_keeps
CREATE TABLE IF NOT EXISTS twin_keeps (
  id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  from_player_id TEXT NOT NULL,
  to_player_id TEXT NOT NULL,
  status "KeepStatus" NOT NULL DEFAULT 'pending',
  similarity_snapshot DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  CONSTRAINT twin_keeps_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT twin_keeps_single_per_drop UNIQUE (drop_date, from_player_id)
) PARTITION BY RANGE (drop_date);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'twin_keeps' AND column_name = 'status' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE twin_keeps ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE twin_keeps ALTER COLUMN status TYPE "KeepStatus" USING (status::text::"KeepStatus");
    ALTER TABLE twin_keeps ALTER COLUMN status SET DEFAULT 'pending'::"KeepStatus";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_twin_keeps_drop_date ON twin_keeps(drop_date);
CREATE INDEX IF NOT EXISTS idx_twin_keeps_to_player ON twin_keeps(to_player_id, status);
CREATE INDEX IF NOT EXISTS idx_twin_keeps_from_player ON twin_keeps(from_player_id, drop_date);

-- Default partition for twin_keeps (catches any missing pre-created partition)
CREATE TABLE IF NOT EXISTS twin_keeps_default PARTITION OF twin_keeps DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_twin_keeps_default_alert'
  ) THEN
    CREATE TRIGGER trg_twin_keeps_default_alert
    BEFORE INSERT ON twin_keeps_default
    FOR EACH ROW EXECUTE FUNCTION notify_default_partition();
  END IF;
END $$;

-- 3. Regular Table: orbits
DROP INDEX IF EXISTS idx_orbits_active_pair;

CREATE TABLE IF NOT EXISTS orbits (
  id TEXT PRIMARY KEY,
  player_a_id TEXT NOT NULL,
  player_b_id TEXT NOT NULL,
  status "OrbitStatus" NOT NULL DEFAULT 'active',
  started_on DATE NOT NULL,
  ended_on DATE,
  co_streak_current INT NOT NULL DEFAULT 0,
  co_streak_best INT NOT NULL DEFAULT 0,
  last_co_date DATE,
  ended_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orbits_lexicographical_order CHECK (player_a_id < player_b_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orbits' AND column_name = 'status' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE orbits ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE orbits ALTER COLUMN status TYPE "OrbitStatus" USING (status::text::"OrbitStatus");
    ALTER TABLE orbits ALTER COLUMN status SET DEFAULT 'active'::"OrbitStatus";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orbits_active_pair ON orbits (player_a_id, player_b_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_orbits_player_a ON orbits(player_a_id, status);
CREATE INDEX IF NOT EXISTS idx_orbits_player_b ON orbits(player_b_id, status);

-- 4. Partitioned Table: orbit_expressions
CREATE TABLE IF NOT EXISTS orbit_expressions (
  id TEXT NOT NULL,
  orbit_id TEXT NOT NULL,
  from_player_id TEXT NOT NULL,
  drop_date DATE NOT NULL,
  expression_key VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orbit_expressions_pk PRIMARY KEY (id, drop_date),
  CONSTRAINT orbit_expressions_daily_uniq UNIQUE (orbit_id, from_player_id, drop_date)
) PARTITION BY RANGE (drop_date);

CREATE INDEX IF NOT EXISTS idx_orbit_expressions_drop_date ON orbit_expressions(drop_date);
CREATE INDEX IF NOT EXISTS idx_orbit_expressions_orbit ON orbit_expressions(orbit_id, drop_date);

-- Default partition for orbit_expressions
CREATE TABLE IF NOT EXISTS orbit_expressions_default PARTITION OF orbit_expressions DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orbit_expressions_default_alert'
  ) THEN
    CREATE TRIGGER trg_orbit_expressions_default_alert
    BEFORE INSERT ON orbit_expressions_default
    FOR EACH ROW EXECUTE FUNCTION notify_default_partition();
  END IF;
END $$;

COMMIT;
