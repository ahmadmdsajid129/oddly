# Stage L0-FIX2 Report: Bonus Rounds & Badges Documentation Corrections

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-L0-fix2-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->

> **Stage Milestone:** Stage L0-FIX2 (L0-ADD Documentation Corrections — Docs Only, No Code)  
> **Status:** COMPLETE  
> **Date:** 2026-11-22  
> **Branch:** `stage-L0-fix2-docs` (started from `stage-L0-add-docs`)  
> **Tag:** `stage-L0-fix2-complete`  
> **Author:** System Architecture & Matching Team  
> **Reviewer:** Founder  

---

## 1. What Changed Per Item

### Item 1: Badge Table and API Route Collision Fix
- **Problem:** Stage M6 shipped table `badge_definitions`, `creator_badges`, and API route `GET /v1/badges/mine` (alongside `/v1/me/badges` in Section 7.1). Stage L0-ADD introduced a colliding `badge_definitions` table and `/v1/me/badges` route.
- **Fix:** Renamed all Stage L10 badge database objects and API routes:
  - `badge_definitions` (L10) -> `collector_badge_definitions`
  - `user_badges` -> `collector_badges`
  - `idx_user_badges_user` -> `idx_collector_badges_user`
  - Column `badge_key` -> `collector_badge_key`
  - Route `GET /v1/me/badges` (L10) -> `GET /v1/me/collector-badges`
- **UI Screen Route:** Screen route `/me/badges` is retained as a unified UI showcase displaying two distinct sections: creator badges (M6, via `GET /v1/badges/mine`) and collector badges (L10, via `GET /v1/me/collector-badges`).
- **Files Updated:** `architecture.md` (18.9, 18.10 ADR 052, 18.11.1, 18.11.2), `product.md` (F41), `task.md` (P10U.01, P10U.03, P10U.05, P11.50, checklist), `docs/bonus-rounds-and-badges.md`, `docs/event-dictionary.md`, `docs/admin-panel-spec.md` (C.3, P11.49, P11.50), `design.md` (12D.5).
- **Added Subsection:** `architecture.md` 18.11.1 now includes a dedicated "Relation to M6 creator badges" paragraph.
- **Commit:** `c096f1b` (`docs(badges): rename L10 collector badge tables, columns and route to prevent collision with M6`).

### Item 2: Additive Bonus Results (Never Rewrite Locked Twin)
- **Problem:** `bonus.close_and_rematch` was previously specified to update `twin_results` 24 hours later, which broke locked mutual pairings, invalidated Keeps, Orbits, Telepathy, and share cards created during the 07:05 IST final batch.
- **Fix:** Redesigned bonus outcome evaluation to be strictly **additive**:
  1. `twin_results` retains its locked `twin` and `is_mutual` state forever. Bonus rounds never update or overwrite `twin_results`.
  2. Created additive table `bonus_results`: `id`, `round_id` (FK to `bonus_rounds`), `user_id`, `closest_user_id` (nullable), `questions_matched` (INT, 0 to 3), `participants` (INT), `is_mutual` (BOOLEAN), `computed_at`. Unique `(round_id, user_id)`.
  3. Removed `ALTER TABLE twin_results ADD COLUMN bonus_round_count` and removed plan to set `tie_break_reason = 'bonus'` on `twin_results` (details in Section 4).
  4. Greedy mutual pairing re-evaluates exclusively among active bonus participants and writes strictly to `bonus_results`.
  5. UI displays narrowed match as an extra line, "Closest in your group", beneath the unchanged locked twin using existing copy keys (`bonus.result.narrowed`, `bonus.result.alone`, `bonus.closed`).
  6. Keeps, Orbits, Telepathy, share cards, and the Globe remain strictly anchored to the locked twin.
- **Files Updated:** `architecture.md` (18.10 ADR 051, 18.11.1, 18.11.2), `product.md` (F40), `design.md` (12D.3), `docs/connection-features.md`, `docs/bonus-rounds-and-badges.md`, `task.md` (P10T.01, P10T.05, P10T.07).
- **Commit:** `5f2c553` (`docs(bonus): make bonus result additive without rewriting locked twin`).

### Item 3: Bonus Timing Collision Fix
- **Problem:** Scheduling `bonus.close_and_rematch` "24 hours post-open" landed at 07:05 IST, colliding with the next day's final batch.
- **Fix:**
  - Round opens at 07:05 IST (after recap) and closes at 06:59:59 IST the next morning (end of that Drop's play window).
  - Renamed worker job to `bonus.close_and_compute`. Scheduled at 07:01 IST the next morning, safely ahead of the 07:05 IST final batch (pausable under Degradation Level L2+).
  - Maintained `bonus.window_hours = 24` as the operational cap, clarifying that the effective window is "until the next Drop opens".
- **Files Updated:** `architecture.md` (18.11.2), `product.md` (F40), `task.md` (P10T.05), `docs/bonus-rounds-and-badges.md` (2.1, 2.3).
- **Commit:** `3437164` (`docs(bonus): reschedule bonus evaluation to 07:01 IST and rename job to close_and_compute`).

### Item 4: Question Pool Exhaustion & Majority Rule
- **Problem:** Universal exclusion of any question answered by any tie-group member in their 28-day history would empty a pool of 40 questions for groups of 300+ players.
- **Fix:**
  1. Round 2 never repeats a question from Round 1 of the same tie group on the same Drop.
  2. Exclude a question if a **majority (50% or more)** of current tie-group members answered it as a bonus question within `bonus.retention_days` (28 days).
  3. Sort remaining eligible pool by Shannon entropy, select using HMAC seed `HMAC_SHA256(drop_id || tie_group_id || round_number)`.
  4. If fewer than `bonus.questions_per_round` (3) questions remain, suppress the round (honest hide, Rule B2). Never reuse questions to fill gaps.
  5. Added "Pool runway math" subsection to `docs/bonus-rounds-and-badges.md`, marking all figures "estimated, not measured".
- **Files Updated:** `product.md` (F40), `architecture.md` (ADR 051), `docs/bonus-rounds-and-badges.md` (2.2).
- **Commit:** `7da3416` (`docs(bonus): update question pool exclusion rule to majority threshold and add pool runway math`).

### Item 5: Bundle Size Budget Clarification
- **Problem:** Bundle size numbers in Section 12D.7 were unmeasured in a docs-only stage, and question renderers were incorrectly described as "already bundled" before Stage L2 exists.
- **Fix:**
  - Replaced unmeasured "154.2 KB -> 156.6 KB" text with: "Estimate: about 2 to 3 KB gzipped for the Bonus Runner and My Badges, NOT measured (docs-only stage). Must be measured when Stage L9 and L10 are built. The play route must stay at or under the approved 159.5 KB exception."
  - Updated renderer note: "Reuses the renderers that Stage L2 will provide; Stage L9 depends on L2."
  - Replaced "Verification" in heading with "Evaluation".
  - Linked task dependency: `P10T.06` depends on `P10T.04, P10M.04, P1.01` (`P10M.04` is the Stage L2 frontend renderer task).
- **Files Updated:** `design.md` (12D.7), `docs/stage-L0-add-report.md`, `task.md` (P10T.06).
- **Commit:** `8b26c5b` (`docs(design): update bundle size text to unmeasured estimate and link Stage L2 renderer dependency`).

### Item 6: UI Tokens, Task Dependencies, and Schema Verification Notes
- **Fixes Applied:**
  1. `design.md` Section 22 change log: Added v1.4 top line dated 2026-11-22 ("Added Section 12D (Bonus Rounds and Badges UI). Zero new colours."). Updated header to `Direction: **Sticker pop** (v1.4)`.
  2. `design.md` 12D.1: Corrected rule citation to `(Rule 17, Rule B6, Never Do list)`.
  3. `design.md` 12D.1: Aligned secondary button "Not now" to standard `shadow-sticker` with press-flat transition.
  4. `design.md` 12D.1 and 12D.4: Replaced `rounded-radius-m` with `rounded-m`.
  5. `task.md`: Replaced `P01.01` dependency with canonical `P1.01` in `P10U.04` and `P10T.06`. Zero `P0x.x` legacy IDs remain.
  6. `task.md` dashboard: Replaced ASCII progress bar `[███████████░░░░░░░░░] 58%` with 10-block emoji format: `🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜ 58%`.
  7. `task.md` and `architecture.md`: Updated "Last updated" date in headers to 2026-11-22.
  8. `task.md` P10L.01: Added verification note warning about checking Prisma schema for `players` vs `users` and UUID vs TEXT IDs. Added callout in `architecture.md` 18.11.1.
- **Files Updated:** `design.md`, `task.md`, `architecture.md`.
- **Commit:** `e91afe7` (`docs(design,task): fix UI tokens, dependency IDs, progress bar style, and schema verification notes`).

### Item 7: Memory Section 37 Appended
- **Action:** Appended Section 37 to `memory.md` documenting items 1 to 6, the additive-bonus decision, open Founder questions Q1 to Q9 with recommended defaults, open technical items, and Section 1 header updates.
- **Commit:** `5aeacf8` (`docs(memory): append Section 37 documenting L0-FIX2 adjustments, open Founder questions, and unresolved items`).

---

## 2. Real Verification Command Outputs

```
=== 1. TAB SCAN ===
Total tab hits: 0

=== 2. DUPLICATE HEADERS ===
rules.md duplicates: 0
product.md duplicates: 0
architecture.md duplicates: 0
design.md duplicates: 0
task.md duplicates: 0

=== 3. LEFTOVER NAMES ===
docs\stage-L0-add-report.md:32: - `Rule B7 (35)`: Badges Are Honest and Evidenced (`🔒`). Deterministically computed with tamper-evident cryptographic hashes in `user_badges`; never speculative.
docs\stage-L0-add-report.md:57: - Full relational DDL: `bonus_pool_questions`, `bonus_rounds`, `bonus_answers` (monthly range partitioned), `twin_results` (altered with `narrowed_twin_user_id`, `bonus_round_id`, `is_narrowed`), `badge_definitions`, `user_badges` (with SHA-256 tamper-evident evidence hash).
docs\stage-L0-add-report.md:58: - Worker jobs: `bonus.open_rounds`, `bonus.close_and_rematch`, `badges.evaluate`.
(Note: All 3 hits reside strictly inside the historical deliverable report docs/stage-L0-add-report.md. Zero hits in all active system documentation.)

=== 4. BADGE_DEFINITIONS M6 AUDIT ===
architecture.md:566: 19. **`badge_definitions` (M6 — Documented):** Recognition badge catalogue.
architecture.md:569: - Columns: `id` (UUID, PK), `player_id` (UUID, NOT NULL, FK to `users`), `badge_id` (UUID, NOT NULL, FK to `badge_definitions`), `meme_id` (UUID, nullable, FK to `meme_submissions`), `awarded_at` (TIMESTAMPTZ, NOT NULL).
architecture.md:1206: 1. *Worker Evaluation:* `badges.evaluate` job executes post-final recap, scanning final verified `twin_results` against `collector_badge_definitions`.
architecture.md:1274: Creator badges (M6) are earned by caption quality and have their own table (`badge_definitions`, `creator_badges`) and API route (`GET /v1/badges/mine` / `/v1/me/badges`); collector badges (L10) are earned by lane twins and live in `collector_badge_definitions` and `collector_badges` accessed via `GET /v1/me/collector-badges`. They share only the `/me/badges` UI page. They never share tables or a unified score.
architecture.md:1276: -- 4. collector_badge_definitions — Master Collector Badge Registry
architecture.md:1277: CREATE TABLE IF NOT EXISTS collector_badge_definitions (
architecture.md:1290: collector_badge_key VARCHAR(50) NOT NULL REFERENCES collector_badge_definitions(key) ON DELETE CASCADE,
docs\admin-panel-spec.md:527: - **Badge Catalogue Editor:** Create and edit badge definitions (`badge_definitions`), benchmark rules (e.g. raters $\ge 500$, funny $\ge 70\%$), and SVG icon assets.
docs\admin-panel-spec.md:544: - Reads: `tags`, `meme_templates`, `question_stats_daily`, `tag_stats_daily`, `events_raw`, `consents`, `meme_submissions`, `meme_ratings`, `meme_stats`, `badge_definitions`, `creator_badges`, `featured_memes`.
docs\admin-panel-spec.md:545: - Writes: `tags`, `meme_templates`, `moderation_actions`, `editor_suggestions`, `featured_memes`, `badge_definitions`.
docs\admin-panel-spec.md:733: - **Badge Registry Editor:** Interface for managing `collector_badge_definitions` (thresholds, tier names, copy keys in `app_content`, and rule versions).
docs\bonus-rounds-and-badges.md:143: CREATE TABLE IF NOT EXISTS collector_badge_definitions (
docs\bonus-rounds-and-badges.md:155: collector_badge_key VARCHAR(50) NOT NULL REFERENCES collector_badge_definitions(key) ON DELETE CASCADE,
docs\stage-L0-add-report.md:57: - Full relational DDL: ... `badge_definitions`, `user_badges` ...
docs\stage-M0-report.md:23: ... `badge_definitions`, `creator_badges`, `featured_memes` ...
docs\stage-M5-M6-report.md:36: | `P10I.03` | Database migrations: `badge_definitions`, `creator_badges`, `featured_memes` ...
memory.md:57: - Applied `009_recognition_engine.sql` adding `badge_definitions`, `creator_badges`, `featured_memes` ...
memory.md:1489: - **Item 1 (Badge Table & Route Collision):** Renamed L10 badge database objects to `collector_badge_definitions` ...
product.md:858: - **Data Touched:** `badge_definitions`, `creator_badges`, `featured_memes`.
product.md:1261: - **Data Touched:** `collector_badge_definitions`, `collector_badges`.
task.md:508: | `[x] P10I.03` | Database migrations: `badge_definitions`, `creator_badges`, `featured_memes` ...
task.md:696: | `[ ] P10U.01` | Relational data model for badges (`collector_badge_definitions`, `collector_badges` with JSONB evidence) ...
task.md:1063: - [x] Run migrations for `badge_definitions`, `creator_badges`, `featured_memes`.
(Audit: Every occurrence of badge_definitions in active specifications refers strictly to M6 caption badges or the clarifying cross-reference in 18.11.1).

=== 5. CONFIG KEY PARITY (41 KEYS) ===
Rules count: 41, Arch count: 41
Keys in rules but not arch: []
Keys in arch but not rules: []
(Audit: 100% parity across all 41 config keys).

=== 6. TASK ARITHMETIC ===
Tasks done: 237, Tasks todo: 173, Total: 410
(Audit: Matches dashboard exactly: 237 done / 173 pending / 410 total across 38 phases = 58%).

=== 7. CODE & DEPENDENCY AUDIT ===
$ git diff main..HEAD --name-only
(Audit: Shows only .md files, docs/ files, and scripts/docs-visuals/ scripts. Zero files touched under apps/, services/, packages/, migrations, seeds, or package.json).

=== 8. DESIGN.MD 12C.9 CHECK ===
12C.9 occurrences: 1
```

---

## 3. Open Issues & Technical Debt Noted

1. **Play Bundle Budget Exception (160 kB vs 159.5 KB):** Memory Section 2 (D1) notes the play bundle sits at ~160 kB against the 159.5 KB ceiling. This is unresolved and must be measured and resolved during Stage L1/L2.
2. **Design Token Hex Divergence:** Memory D1 records lavender `#E5DEFF`, coral `#FF6B4A`, mint `#2EC4B6`, whereas `design.md` defines `#EEEAFE`, `#FF6B5E`, `#3DDBB0`. The implementation in `packages/ui-tokens` must be verified against `design.md` at Stage L1.
3. **Database Schema Entity & ID Types:** Documentation in `architecture.md` 18.2.1 and 18.11.1 mixes `players(id)` and `users(id)`, and specifies TEXT IDs while core database tables use UUID. Must be verified against the actual Prisma schema before writing Stage L1 migrations.
4. **Rules B1–B7 Labeling:** Rules B1 to B7 in `rules.md` remain labelled "Founder-approved, L0-ADD". The Founder has not yet provided answers to questions Q1 to Q7; the rules reflect recommended defaults and await formal Founder sign-off.

---

## 4. Open Founder Questions (Q1 to Q9)

| # | Question | Status | Recommended Default | Rationale |
|---|---|:---:|---|---|
| **Q1** | Should bonus round participants see who is in the tie group before answering? | **OPEN** | `false` (blind answering) | Prevents social friction, game-playing, and stalking. Protects player privacy. |
| **Q2** | Can a player opt out of bonus rounds permanently in settings? | **OPEN** | `true` (`settings.bonus_opt_out: false`) | Preserves player agency and the low-pressure ethos. |
| **Q3** | Should bonus questions use rich formats (quad, slider) or binary only? | **OPEN** | Binary only in v1 (`binary_2`) | Maximum entropy, lowest latency, zero friction. |
| **Q4** | If tie group has odd number of participants, does someone get left alone? | **OPEN** | Yes (`bonus.result.alone` copy) | Honesty rule (Rule B2): never invent a synthetic or fake twin. |
| **Q5** | Should badges be revocable if retroactive fraud or bot activity is detected? | **OPEN** | `true` (via admin audit tool P11.50) | Preserves integrity and auditability of twin records. |
| **Q6** | Can badges be shared as individual sticker cards on Instagram/WhatsApp? | **OPEN** | `false` in v1 | Avoids badge flexing; preserves private collector feeling. |
| **Q7** | Should bonus rounds count toward the daily streak? | **OPEN** | `false` | Streaks belong strictly to the 5-question daily Drop. |
| **Q8** | Should bonus results remain strictly additive without rewriting `twin_results`? | **OPEN** | `true` (additive outcome in `bonus_results`) | Prevents breaking mutual pairings, Keeps, Orbits, Telepathy, or share cards. |
| **Q8b**| May a Keep request be sent to the "closest in your group" participant? | **OPEN** | `false` in v1 | Keeps remain strictly 1 per completed Drop anchored to the primary mutual twin. |
| **Q9** | Is minimum evergreen pool of 40 questions sufficient or should it be higher (e.g. 120)? | **OPEN** | Keep 40 in v1; monitor runway alerts | 40 allows rapid catalog launch; majority rule prevents immediate reuse exhaustion. |

---

## 5. Decisions: What Was Chosen Not to Do and Why

1. **Omitted `ALTER TABLE twin_results ADD COLUMN bonus_round_count`:**
   - *Reason:* Product copy keys do not require a round count on `twin_results`. All round tracking and participant counts reside cleanly in `bonus_rounds` and `bonus_results`. Keeping `twin_results` completely un-altered preserves the principle that locked twins are immutable and untouched by bonus sessions.
2. **Did Not Prematurely Increase `bonus.pool_min_per_lane`:**
   - *Reason:* Increasing the threshold from 40 to 120 before launching lanes would create an unnecessary editorial bottleneck. With the majority exclusion rule in place, 40 provides sufficient initial cushion while admin runway alerts (P11.48) guide proactive replenishment based on real-world data.

---

## 6. Git Branch & Tag Record

- **Working Branch:** `stage-L0-fix2-docs` (branched from `stage-L0-add-docs`)
- **Commits:**
  - `c096f1b`: `docs(badges): rename L10 collector badge tables, columns and route to prevent collision with M6` (Item 1)
  - `5f2c553`: `docs(bonus): make bonus result additive without rewriting locked twin` (Item 2)
  - `3437164`: `docs(bonus): reschedule bonus evaluation to 07:01 IST and rename job to close_and_compute` (Item 3)
  - `7da3416`: `docs(bonus): update question pool exclusion rule to majority threshold and add pool runway math` (Item 4)
  - `8b26c5b`: `docs(design): update bundle size text to unmeasured estimate and link Stage L2 renderer dependency` (Item 5)
  - `e91afe7`: `docs(design,task): fix UI tokens, dependency IDs, progress bar style, and schema verification notes` (Item 6)
  - `5aeacf8`: `docs(memory): append Section 37 documenting L0-FIX2 adjustments, open Founder questions, and unresolved items` (Item 7)
  - `docs: add stage-L0-fix2-report.md`: Deliverable verification report (Item 9)
- **Tag:** `stage-L0-fix2-complete`

---

## 7. Stage L0-FIX3 Addendum (2026-11-22)

### 7.1 Corrections Applied
1. **Memory Section 38 (Founder Questions Alignment):** Appended Section 38 with Section 38.1 correcting the open Founder questions list to align strictly with Section 36.1 (Q1 to Q7: async 24h window, max 2 rounds, non-participant twin stability, 40 pool min, 0.6 similarity threshold, private badges in v1, All-Lanes defined on day earned), followed by Q8, Q8b, and Q9. All 10 questions marked OPEN.
2. **Rule B3 Clarification (`rules.md`):** Updated item 31 and change log to explicitly state: "They never change the locked twin. They produce only an additional, participant-only result stored in `bonus_results` (shown as 'Closest in your group'). Bonus answers are retained only for `bonus.retention_days` (default 28 days) and then permanently purged." Header date updated to 2026-11-22. Config keys unchanged (41 keys).
3. **Rematch Terminology Alignment:** Replaced leftover "rematch / re-match" wording with "compute bonus results" across `architecture.md` 18.2.4 (`bonus.min_participants`), `task.md` P10T.05 checklist and P10T.07 note, `docs/bonus-rounds-and-badges.md`, and `docs/admin-panel-spec.md`.

### 7.2 Verification Audit
- **Tabs:** 0.
- **Duplicate Headers:** 0.
- **Config Key Parity:** Exactly 41 keys, identical between `rules.md` 9.4 and `architecture.md` 18.2.4.
- **Scope Isolation:** `git diff main..HEAD --name-only` confirmed only `.md` and `docs/` files changed.
- **Tag:** `stage-L0-fix3-complete`.

