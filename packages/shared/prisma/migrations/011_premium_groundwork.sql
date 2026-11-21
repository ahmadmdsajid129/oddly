-- ============================================================================
-- Oddly Stage M8 (Phase 10K): Premium Groundwork & Guardrail Engine
-- 011_premium_groundwork.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds plans, entitlements, subscriptions, paywall_events
-- ============================================================================

BEGIN;

-- 1. Subscription Plans Table (Catalogue of Provider-Agnostic Plans)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'oddly_plus_monthly'
  name_i18n JSONB NOT NULL,
  description_i18n JSONB NOT NULL,
  price_inr_cents INT NOT NULL DEFAULT 7900, -- ₹79.00
  duration_days INT NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'retired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_key ON plans(key);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);

-- 2. Entitlements Table (Feature Gates Gated by Plan)
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL, -- 'streak_freeze', 'historical_archive', 'bespoke_themes'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_entitlements_plan_feature UNIQUE (plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_plan ON entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_feature ON entitlements(feature_key);

-- 3. Subscriptions Table (Player Subscription State)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'expired' | 'past_due'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  provider VARCHAR(30) NOT NULL DEFAULT 'mock', -- 'mock', 'razorpay', 'stripe'
  provider_subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_player ON subscriptions(player_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- 4. Paywall Events Table (Offer Impressions & Dismissals for Frequency Capping)
CREATE TABLE IF NOT EXISTS paywall_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  surface VARCHAR(50) NOT NULL, -- 'me_settings', 'archive_view', 'recap_perks'
  event_type VARCHAR(20) NOT NULL, -- 'offer_shown', 'dismissed', 'converted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_player ON paywall_events(player_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_type ON paywall_events(event_type);
CREATE INDEX IF NOT EXISTS idx_paywall_events_created ON paywall_events(created_at);

-- 5. Seed Core Configuration for Premium Groundwork
INSERT INTO app_config (id, key, value, updated_at) VALUES
  (gen_random_uuid()::text, 'feature.premium', 'false', NOW()),
  (gen_random_uuid()::text, 'premium.offer_cooldown_days', '14', NOW()),
  (gen_random_uuid()::text, 'premium.dismiss_halt_days', '90', NOW())
ON CONFLICT (key) DO NOTHING;

-- 6. Seed Default "Oddly Plus" Plan & Entitlements
INSERT INTO plans (id, key, name_i18n, description_i18n, price_inr_cents, duration_days, status) VALUES
  (
    '00000000-0000-5000-a000-000000000001',
    'oddly_plus_monthly',
    '{"en": "Oddly Plus", "hi": "ऑडली प्लस", "gu": "ઓડલી પ્લસ"}'::jsonb,
    '{"en": "2 monthly streak freezes, full historical archive, bespoke share cards", "hi": "2 मासिक स्ट्रीक फ्रीज, ऐतिहासिक पुरालेख, कस्टम शेयर कार्ड", "gu": "2 માસિક સ્ટ્રીક ફ્રીઝ, ઐતિહાસિક સંગ્રહ, કસ્ટમ શેર કાર્ડ"}'::jsonb,
    7900,
    30,
    'active'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO entitlements (plan_id, feature_key, config) VALUES
  ('00000000-0000-5000-a000-000000000001', 'streak_freeze', '{"monthly_freezes": 2}'::jsonb),
  ('00000000-0000-5000-a000-000000000001', 'historical_archive', '{"full_access": true}'::jsonb),
  ('00000000-0000-5000-a000-000000000001', 'bespoke_themes', '{"colorways": ["holo_night", "midnight_sun"]}'::jsonb)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

COMMIT;

