# Oddly — Stage M1 Report: Meme Questions & Themed Drops (Phase 10E)

**Date:** 2026-11-15  
**Branch:** `stage-M1-meme-questions`  
**Status:** Complete (100% of P10E.01 to P10E.09)  
**Governing Standard:** `rules.md` Rule 1, Rule 9.1, Rule 9.2, Rule 12, Rule 14, ADR-041, `product.md` F24 (Section 11B), and `architecture.md` Table 6.  

---

## 1. What Changed Per Document and Package

| Document / Package | Key Changes Applied |
|---|---|
| `packages/shared/prisma/migrations/005_meme_questions_foundation.sql` (P10E.01) | Authored expand migration: created `tags`, `meme_templates`, `question_tags` join table, added `render_variant` and `template_id` to `questions`, added `theme_key` to `drops`, and inserted `feature.meme_questions` flag in `app_config`. Applied directly to PostgreSQL. |
| `packages/shared/prisma/schema.prisma` (P10E.01) | Extended Prisma schema with `Tag`, `MemeTemplate`, `QuestionTag` models and relations to `Question` and `Drop`. Regenerated Prisma Client (`prisma generate`). |
| `packages/shared/src/taxonomy.ts` (P10E.02, P10E.08) | Defined 14 neutral subject tags (`SEED_NEUTRAL_TAGS`) across 6 categories (daily habits, food, social, etc.) and comprehensive forbidden topics terms (`FORBIDDEN_TOPIC_TERMS`) strictly auditing against Section 9.1 (religion, politics, caste, sexuality, health, body image, living individuals, commercial brands). |
| `packages/shared/scripts/seed-meme-taxonomy.ts` (P10E.02) | Seeded 14 neutral tags and 8 curated in-house CC0 vector meme templates into PostgreSQL database. |
| `packages/shared/src/schemas.ts` (P10E.03) | Extended Zod schemas: added `RenderVariantSchema` (`standard` \| `meme`), updated `QuestionResponseSchema` and `DropResponseSchema` with `render_variant`, `template_key`, `template_id`, `tags`, and `theme_key`. Created `MemeQuestionSchema` requiring $\ge 1$ tag and valid template key. |
| `packages/shared/src/types.ts` (P10E.03) | Added `RenderVariant` type and extended `QuestionResponse` and `DropResponse` interfaces. |
| `packages/shared/src/batch-importer.ts` (P10E.04) | Created JSON batch importer: implements `validateBatch` with dry-run support, Section 9.1 forbidden topic checking, consecutive slot-type repetition warning, and `importBatchJson` database upsert engine. |
| `packages/shared/prisma/seed/batch_meme_sample.json` (P10E.06) | Authored verified sample batch containing 15 language-light, universally relatable meme questions across 3 drops adhering to the Original-to-Oddly authoring policy. |
| `packages/shared/src/batch-importer.test.ts` (P10E.04) | Authored unit tests verifying clean validation of seed batch, rejection of missing template keys, rejection of empty tags, build-fail on forbidden topic tags, and repetition warnings (6/6 passed). |
| `packages/shared/src/meme-parity.test.ts` (P10E.07) | Authored automated mathematical parity regression tests proving 100% invariant identity between standard and meme questions for Dice similarity, answer hashes, Shannon entropy, Oddness scores, tier classification, and Anti-Twin candidate ranking (4/4 passed). |
| `packages/shared/src/taxonomy.test.ts` (P10E.08) | Authored build-fail linter verifying zero tag keys match Section 9.1 forbidden topics (3/3 passed). |
| `apps/web/src/components/play/QuestionScreen.tsx` (P10E.05, P10E.09) | Implemented `meme` render variant in polymorphic question renderer: renders "Meme Pick" badge and subject tag, renders vector template illustration frame from `illustrationsRegistry`, and preserves live DOM text prompt with token typography and $\ge 44\text{px}$ touch targets. |
| `apps/web/src/app/page.tsx` (P10E.05) | Added Drop theme badge alongside live player counter when `theme_key` is present on the Daily Drop. |
| `apps/web/src/meme-questions.test.ts` (P10E.05, P10E.09) | Authored test suite verifying polymorphic QuestionData contract, template key mapping, tag sanity, and $\ge 44\text{px}$ touch target compliance (4/4 passed). |
| `task.md` | Marked tasks `P10E.01` through `P10E.09` as `DONE`. Progress: 100% of Phase 10E. |
| `memory.md` | Documented Stage M1 completion in Section 25. |

---

## 2. Invariant & Mathematical Parity Verification

### 2.1 ADR-041 & Rule 12 Invariant
* **Meme questions are strictly a presentation variant:** `render_variant = "meme"`.
* **Underlying Data Invariant:** Pure Type 1 (2–4 text options) or Type 4 (image options) underlying payload format.
* **Scoring Invariant:** Zero modification to vector generation, dice coefficient, Shannon entropy, or Oddness calculation. Identical inputs yield bit-for-bit identical outputs.
* **Drop Invariant:** All Drop questions remain 100% identical globally for all players on a given calendar day. Zero personalization of questions.

### 2.2 Section 9.1 & Rule 14 Safety Invariant
* **Strict Neutral Taxonomy:** Only the 14 approved neutral tags are permitted.
* **Build-Fail Protection:** `isForbiddenTag` actively scans tag keys and labels for any mention of religion, politics, caste, sexuality, health, body image, living individuals, or commercial brands. Any match fails build immediately.
* **Zero Sensitive Inference:** Tag affinities are strictly forbidden from inferring sensitive characteristics.

---

## 3. Test & Build Results

### 3.1 Shared Tests:
```
 ✓ src/scoring.test.ts (43 tests)
 ✓ src/dates.test.ts (14 tests)
 ✓ src/degradation.test.ts (7 tests)
 ✓ src/telepathy.test.ts (13 tests)
 ✓ src/privacy.test.ts (11 tests)
 ✓ src/antitwin.test.ts (6 tests)
 ✓ src/taxonomy.test.ts (3 tests)
 ✓ src/batch-importer.test.ts (6 tests)
 ✓ src/meme-parity.test.ts (4 tests)
 ✓ src/share-cards.test.ts (7 tests)
 ✓ src/share-cards-tokens.test.ts (4 tests)
 ✓ src/share-cards-antitwin.test.ts (4 tests)
 ✓ src/matching.test.ts (13 tests)
 ✓ src/redis/redis.test.ts (10 tests)
 ✓ src/accuracy-clamping.test.ts (17 tests)

Test Files: 16 passed (16)
Tests:      164 passed (164)
```

### 3.2 Web App Tests:
```
 ✓ src/recap.test.ts (1 test)
 ✓ src/meme-questions.test.ts (4 tests)
 ✓ src/pwa.test.ts (10 tests)
 ✓ src/antitwin.test.ts (4 tests)
 ✓ src/orbit-globe.test.ts (11 tests)
 ✓ src/me-settings.test.ts (7 tests)
 ✓ src/telepathy.test.ts (6 tests)
 ✓ src/reveal-oddness.test.ts (6 tests)
 ✓ src/share-challenge.test.ts (4 tests)
 ✓ src/play-flow.test.ts (16 tests)

Test Files: 10 passed (10)
Tests:      69 passed (69)
```

### 3.3 Next.js Production Build:
```
 ✓ Compiled successfully
 ✓ Linting and checking validity of types ...
 ✓ Generating static pages (18/18)
 Route (app)               Size     First Load JS
 ┌ ○ /                     12.5 kB  161 kB (gzip ~45 kB <= 159.5 kB budget)
 └ ○ /anti-twin            6.38 kB  124 kB
```

---

## 4. Operational Invariant & Next Stage Note

Per `rules.md` Rule 1, Stage M1 is complete in full and verified. The agent will STOP here and await Founder command before proceeding to Phase 10F (Stage M2: Signals Foundation).
