-- ============================================================================
-- Oddly Stage M7 (Phase 10J): ML Ranker for Optional Surfaces
-- 010_ml_ranker.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds ml_models, ml_shadow_predictions, and ml_ranker config seeds
-- ============================================================================

BEGIN;

-- 1. ML Models Table (Catalog of Explainable Ranker Models)
CREATE TABLE IF NOT EXISTS ml_models (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  version VARCHAR(50) UNIQUE NOT NULL,
  algorithm VARCHAR(50) NOT NULL DEFAULT 'logistic_regression',
  weights JSONB NOT NULL,
  metrics JSONB NOT NULL,
  training_pairs_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'shadow', -- 'shadow' | 'active' | 'retired' | 'killed'
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_version ON ml_models(version);

-- 2. ML Shadow Predictions Table (Non-Drop Shadow Inferences for Drift & Audit)
CREATE TABLE IF NOT EXISTS ml_shadow_predictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  model_id TEXT NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES meme_submissions(id) ON DELETE CASCADE,
  wilson_lb DOUBLE PRECISION NOT NULL,
  shadow_score DOUBLE PRECISION NOT NULL,
  wilson_rank INT NOT NULL,
  shadow_rank INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_shadow_predictions_model ON ml_shadow_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_shadow_predictions_submission ON ml_shadow_predictions(submission_id);
CREATE INDEX IF NOT EXISTS idx_ml_shadow_predictions_created ON ml_shadow_predictions(created_at);

-- 3. Initial ML Ranker Configuration Seeds
INSERT INTO app_config (id, key, value, updated_at) VALUES
  (gen_random_uuid()::text, 'feature.ml_ranker', 'false', NOW()),
  (gen_random_uuid()::text, 'ml_ranker.mode', '"shadow"', NOW()),
  (gen_random_uuid()::text, 'ml_ranker.min_training_pairs', '100', NOW()),
  (gen_random_uuid()::text, 'ml_ranker.max_psi_threshold', '0.25', NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
