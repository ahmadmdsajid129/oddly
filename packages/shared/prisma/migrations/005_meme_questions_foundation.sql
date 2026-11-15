-- ============================================================================
-- Oddly Stage M1 (Phase 10E): Meme Questions & Themed Drops Foundation
-- 005_meme_questions_foundation.sql
-- Expand -> Migrate -> Contract Pattern
-- Adds tags, question_tags, meme_templates, questions.render_variant, questions.template_id, drops.theme_key
-- ============================================================================

BEGIN;

-- 1. Subject Taxonomy Tags Table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label_i18n JSONB NOT NULL,
  category VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(key);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- 2. Curated Vector Meme Templates Table
CREATE TABLE IF NOT EXISTS meme_templates (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  illustration_registry_key TEXT NOT NULL,
  aspect TEXT NOT NULL DEFAULT '1:1',
  alt_text_i18n JSONB NOT NULL,
  license_note TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meme_templates_key ON meme_templates(key);
CREATE INDEX IF NOT EXISTS idx_meme_templates_status ON meme_templates(status);

-- 3. Extend questions table with render_variant and template_id
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS render_variant VARCHAR(20) NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS template_id TEXT REFERENCES meme_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_render_variant ON questions(render_variant);
CREATE INDEX IF NOT EXISTS idx_questions_template_id ON questions(template_id);

-- 4. Question-to-Tag Many-to-Many Join Table
CREATE TABLE IF NOT EXISTS question_tags (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_tags_pk PRIMARY KEY (question_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_question_tags_question ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags(tag_id);

-- 5. Extend drops table with theme_key
ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS theme_key VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_drops_theme_key ON drops(theme_key);

-- 6. Insert app_config keys for meme questions if missing
INSERT INTO app_config (id, key, value, updated_at)
VALUES 
  (gen_random_uuid(), 'feature.meme_questions', 'true'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;

