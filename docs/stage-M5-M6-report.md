# Stage M5 & M6 Report: Taste Dimension & Recognition Engine (Phase 10I)

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-M5-M6-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->



**Date:** 2026-11-21  
**Branch:** `main` (synchronized with `origin/main`)  
**Commit Milestone:** `stage-M5-M6-complete`  
**Prerequisites:** Stage M4 (Phase 10H: Insights Engine — Statistics Only)  
**Status:** **COMPLETE (8/8 Tasks Delivered, 100% Monorepo Verification)**

---

## 1. Executive Summary

Phase 10I (Stage M5 & M6) delivers the **Taste Dimension & Recognition Engine**, introducing pairwise subject agreement synchronization for active Orbits, community creator recognition badges, on-demand Satori achievement cards, and a curated public "Meme of the Week" showcase surface without competitive leaderboards.

The implementation strictly satisfies:
- **`rules.md` Rule 19 (Orbit Subject-Sync Amendment):** Inside an active Orbit, the system displays aggregate agreement percentages across shared Drop questions grouped by subject tag. To protect secret picks, a strict threshold of $k \ge 5$ shared answers per tag is enforced. If fewer than 5 mutual questions have been answered, the dimension remains locked and reveals zero counts or percentages. Individual question choices and pick vectors are **strictly hidden and never exposed**.
- **`rules.md` Zero Public Leaderboard Rule:** Recognition is modeled purely on milestone achievements and curator curation. There are **zero public rankings, zero competitive leaderboards, and zero score walls**.
- **`rules.md` Rule 14 (No Sensitive Inference) & Rule 15 (No Profiling):** Achievement cards expose only a coarse pseudonym (`Twin #XXXX`) and macro-region. Macro-regions are included on shareable cards only when regional cohorts satisfy $k \ge 20$ anonymity guards.
- **`AGENTS.md` Permanent Design System Rule:** Tactile sticker metaphor on warm cream desk (`#FFF8F0`), ink outlines (`2.5px solid #14123A`), hard offset shadows (`4px 4px 0 #14123A` with zero blur), strict `@oddly/ui-tokens` imports, and touch targets $\ge 44 \times 44\text{ px}$.

---

## 2. Deliverables & Verification Matrix

| Task ID | Deliverable | Spec Reference | Status | Verification |
|---|---|---|---|---|
| `P10I.01` | Orbit Subject Sync API: `GET /v1/orbits/:id/subject-sync` | Rule 19, `orbits.ts`, `orbits.repo.ts` | **DONE** | Aggregates mutual Drop answers per active tag with `min_shared = 5` threshold. Tested in `recognition-invariants.integration.test.ts`. |
| `P10I.02` | Orbit Subject Sync UI: `SubjectSyncCard.tsx` in Orbit detail page | Section 12B.7, `apps/web` | **DONE** | Responsive sticker card with progress tracks, unlocked agreement pills (`80% Sync`), locked state microcopy, and touch targets $\ge 44\text{px}$. |
| `P10I.03` | Database migrations: `badge_definitions`, `creator_badges`, `featured_memes` | Addendum A8, Migration 009 | **DONE** | Authored and applied `009_recognition_engine.sql`. Updated `packages/shared/prisma/schema.prisma` and generated Prisma Client. |
| `P10I.04` | Creator badge award worker: evaluate Wilson scores and rater benchmarks | `creator-badge.job.ts` | **DONE** | Idempotently evaluates `certified_wit` (500+ raters, 70%+ Funny, Wilson lb $\ge 0.65$), `absurd_instinct` (200+ raters, Wilson lb $\ge 0.75$), and `prolific_creator` (10+ approved memes). Tested in `creator-badge.test.ts` (4/4 passing). |
| `P10I.05` | Build achievement card renderer: Satori 3D flip card with alias + macro-region ($k \ge 20$) | `share-cards.ts`, `cards.ts` | **DONE** | Front/back 3D flip sticker cards with QR code verification, cream/paper/ink token palette, and $k \ge 20$ macro-region privacy guard. Tested in `recognition-invariants.integration.test.ts`. |
| `P10I.06` | Build featured meme showcase surface: `/featured` & `GET /v1/memes/featured` | Section 12B, `apps/web/src/app/featured` | **DONE** | Curated "Meme of the Week" showcase with archive of past selections. No competition or leaderboard mechanics. Tested in `recognition-invariants.integration.test.ts`. |
| `P10I.07` | Opt-in achievement sharing sheet & creator deletion revocation flow | Rule 18, `memes.ts` | **DONE** | Self-service author delete flow (`DELETE /v1/memes/:id`) automatically purges associated `featured_memes` showcase records. Tested in `recognition-invariants.integration.test.ts`. |
| `P10I.08` | Invariant integration tests: zero raw pick leakage & zero public rankings | Rules 14, 15, 19 | **DONE** | Real PostgreSQL 16 & Redis 7 suite: `recognition-invariants.integration.test.ts` (6/6 passing). |

---

## 3. Core Architectural Invariants Proven

### 1. Rule 19: Orbit Subject Sync Zero Pick Vector Leakage
- Verified in `recognition-invariants.integration.test.ts`:
  - Player A and Player B have an active Orbit.
  - They answer 5 mutual questions under tag `humour_test` (4 matching answers, 1 differing) and 2 mutual questions under `food_test`.
  - When querying `GET /v1/orbits/:id/subject-sync`:
    - `humour_test` has status `"unlocked"`, `agreement_count: 4`, `shared_questions: 5`, and `agreement_percentage: 80`.
    - `food_test` has status `"locked"`, `agreement_count: null`, `agreement_percentage: null`, and `lock_reason: "Play more drops together to unlock Food sync."`.
    - The raw JSON response contains zero question IDs, zero answer payloads, and zero option choices (`opt_1`, `opt_2`). Secret picks remain 100% hidden.
  - Unauthorized outsiders receive HTTP 404.

### 2. Zero Public Leaderboards Invariant
- Verified in `recognition-invariants.integration.test.ts`:
  - `GET /v1/memes/featured` returns the curated Meme of the Week and chronological archive.
  - The payload contains no ranking ordinal (`rank`, `position`, `leaderboard_index`), no user profiling vectors, and no internal user IDs.
  - Recognition is strictly celebrated as a community showcase.

### 3. Creator Deletion Revocation Flow
- Verified in `recognition-invariants.integration.test.ts`:
  - When an author deletes their meme via `DELETE /v1/memes/:id`, the meme is marked `"retired"`.
  - Concurrently, all associated `featured_memes` showcase records are deleted via database transaction.
  - Immediate subsequent query to `GET /v1/memes/featured` confirms the meme is completely excluded.

---

## 4. Test Suite Execution & Monorepo Health

```
pnpm typecheck: 6/6 packages passing (clean)
pnpm lint:      6/6 packages passing (clean, 0 warnings)
pnpm build:     3/3 applications passing (Next.js 14 optimized static /featured)

Worker Tests:
✓ src/creator-badge.test.ts (4 tests) 315ms
✓ src/wilson-scoring.test.ts (3 tests) 377ms
✓ src/notification-timing.test.ts (2 tests) 404ms
✓ src/signals.aggregation.test.ts (2 tests) 454ms
✓ src/player-taste.test.ts (6 tests) 661ms
✓ src/partition.test.ts (7 tests) 925ms
✓ src/pipeline.test.ts (15 tests) 72ms
✓ src/provisional.test.ts (3 tests) 479ms
✓ src/push.test.ts (18 tests) 13ms

API Integration Tests:
✓ src/recognition-invariants.integration.test.ts (6 tests) 1381ms
  - Rule 19 zero pick leakage (PASSED)
  - Subject sync auth guard (PASSED)
  - Zero public leaderboards (PASSED)
  - GET /v1/badges/mine (PASSED)
  - GET /v1/cards/achievement/:badgeId with Satori PNG (PASSED)
  - Creator delete revocation flow (PASSED)
```

