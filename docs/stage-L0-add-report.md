# Stage L0-ADD Report: Bonus Rounds (F40) and Badges (F41) Specification

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-L0-add-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->

> **Stage Milestone:** Stage L0-ADD (Bonus Rounds & Badges Addendum Specification — Docs Only, No Code)  
> **Status:** COMPLETE  
> **Date:** 2026-11-22  
> **Branch:** `stage-L0-add-docs`  
> **Tag:** `stage-L0-add-complete`  
> **Author:** System Architecture & Matching Team  
> **Reviewer:** Founder  

---

## 1. Executive Summary & Assigned Items

Stage L0-ADD incorporates full end-to-end specifications for **F40 Bonus Rounds (Stage L9)** and **F41 Badges (Stage L10)** into the Oddly documentation suite. The work was completed strictly as a documentation exercise with zero changes to production code, database migrations, seeds, or package dependencies.

### Item 1: `rules.md` (Rules B1–B7 & Rule 12 Clarification)
- **Status:** DONE (Commit `977c738`)
- **Rule 12 Clarification:** Amended with explicit "previous text / amended text" clarifying that evergreen pool questions for bonus rounds (Rule B1) are stored in `bonus_pool_questions` and never mixed with daily drop schedules or answers.
- **Rules B1–B7 Added:** Numbered 29 to 35 in Section 1 with category emojis:
  - `Rule B1 (29)`: Bonus Questions Are Not Drop Questions (`🛤️`). Evergreen pool isolation; cannot appear in daily Drops.
  - `Rule B2 (30)`: Bonus Honesty (`🔒`). Deterministic scoring against exact same question set; never fake narrowing.
  - `Rule B3 (31)`: No Side Effects for Bonus Answers (`🗄️`). Answers stored in `bonus_answers`; deleted after `bonus.retention_days`; never update `user_lane_answers`, drop statistics, or global history tiebreaker weights.
  - `Rule B4 (32)`: Bonus Lane Isolation (`🛤️`). Ties broken only within same lane; cross-lane bonus rounds strictly prohibited.
  - `Rule B5 (33)`: Badges Are Private and Unranked (`🔒`). Unlocked badges visible only to user (`/me/badges`); no public profiles, no counts in share cards, no leaderboards.
  - `Rule B6 (34)`: Badges Cannot Be Bought or Rushed (`💸`). Free, non-commercial, cannot be accelerated via payment or streak shields.
  - `Rule B7 (35)`: Badges Are Honest and Evidenced (`🔒`). Deterministically computed with tamper-evident cryptographic hashes in `user_badges`; never speculative.
- **Section 9.4 Architectural Reminders:** Added 14 new canonical config keys (`bonus.*`, `badge.*`, `feature.*`).
- **Section 11 Change Log:** Appended 2026-11-22 Stage L0-ADD entry.

### Item 2: `product.md` (Features F40 & F41, Glossary, Section 9.6)
- **Status:** DONE (Commit `e0774e5`)
- **Section 5.4 Vocabulary:** Added definitions for `Bonus Round`, `Lane Twin`, `Collector`, and `Super Twin Badge`.
- **Section 9.6 Matching Recap:** Added post-recap tie-breaking cross-reference sentence pointing to F40.
- **Section 11C Feature Cards:**
  - Added **F40 Bonus Rounds (Post-Recap Narrowing)** specification card with complete player journey, copy keys, states, privacy invariants, degradation ladders, flags, metrics, and out-of-scope boundaries.
  - Added **F41 Badges (Cross-Lane Twin Milestones)** specification card with complete player journey, copy keys, 6 core badge types (First Twin, Lane Explorer, Polymath, Lane Twin, Super Twin, Evergreen Scholar), privacy invariants, degradation, flags, metrics, and out-of-scope boundaries.
- **Section 16 Change Log:** Appended 2026-11-22 Stage L0-ADD entry.

### Item 3: `architecture.md` (Relational Schema, Routes, ADRs 051 & 052)
- **Status:** DONE (Commit `cf600f5`)
- **Section 18.2.4 Master Config Table:** Added all 14 canonical config keys with types, defaults, and descriptions.
- **Section 18.9 Policy Table:** Added 4 new route policies:
  - `GET /v1/bonus/:dropId` (User, cached 60s, 30 req/min)
  - `POST /v1/bonus/:roundId/answers` (User, idempotent, 10 req/min)
  - `GET /v1/bonus/:roundId/result` (User, cached 30s, 30 req/min)
  - `GET /v1/me/badges` (User, cached 120s, 60 req/min)
- **Section 18.10 ADRs:**
  - Added `ADR 051: Bonus Evergreen Question Pool and Deterministic Tie-Group Selection`.
  - Added `ADR 052: Tamper-Evident Badge Evaluation, Storage, and Revocation Architecture`.
- **Section 18.11 Bonus Rounds & Badges Architectural Specification:**
  - Full relational DDL: `bonus_pool_questions`, `bonus_rounds`, `bonus_answers` (monthly range partitioned), `twin_results` (altered with `narrowed_twin_user_id`, `bonus_round_id`, `is_narrowed`), `badge_definitions`, `user_badges` (with SHA-256 tamper-evident evidence hash).
  - Worker jobs: `bonus.open_rounds`, `bonus.close_and_rematch`, `badges.evaluate`.
  - Redis cache keys & TTL specifications: `bonus:round:*`, `bonus:user:*`.
  - Graceful degradation: Read-only fallbacks, timeout bypasses, zero drop impact.

### Item 4: `design.md` (Section 12D UI Specifications)
- **Status:** DONE (Commit `690df79`)
- **Added Section 12D:**
  - `12D.1 Bonus Offer Card`: Physical sticker aesthetic (`bg-paper`, ink border `2.5px solid #14123A`, hard shadow `4px 4px 0 #14123A`), no countdown clocks or pressure timers.
  - `12D.2 Bonus Question Flow`: Reuses tactile binary/quad sticker buttons, progress bar with lavender fill, no skips.
  - `12D.3 Result Line & Alone State`: Single line added to recap; copy keys `bonus.result.narrowed`, `bonus.result.alone`, `bonus.closed`.
  - `12D.4 Badge Face Specification`: Sticker pop physical tokens, tier accents (Bronze, Silver, Gold, Celestial), unearned dotted outline slot (`2.5px dashed #D6D0C7`).
  - `12D.5 "My Badges" Showcase Page`: `/me/badges`, warm desk layout, private showcase, unranked, zero leaderboards.
  - `12D.6 Toasts & Reduced Motion`: Unearned badge unlocked toast with 3.5s auto-dismiss; `prefers-reduced-motion` compliance.
  - `12D.7 Bundle Size Budget Evaluation`: Bonus components + badge showcase estimated at ~2 to 3 KB gzip (not measured; play route must stay <= 159.5 KB ceiling).

### Item 5: `docs/*.md` (Lanes, Events, Admin Spec & Dedicated Guide)
- **Status:** DONE (Commit `305647e`)
- **`docs/lanes-and-matching.md` Section 8:** Shrinkage mathematics, collision probabilities, and worked expectation table for tie groups ($T \in \{20, 100, 312, 1000\}$) across $Q=3$ questions, accounting for real-world answer correlation.
- **`docs/event-dictionary.md`:** Added 5 telemetry events: `bonus_offered`, `bonus_started`, `bonus_submitted`, `badge_earned`, `badge_page_viewed`.
- **`docs/admin-panel-spec.md` Addendum C:** Added Phase 11 admin tools:
  - `P11.47 Evergreen Pool Editor`: Curate, validate, and activate bonus evergreen questions.
  - `P11.48 Runway Monitor`: Track pool depth across lanes with depletion alerts.
  - `P11.49 Round Monitor`: Inspect active bonus rounds, participation, and tie-breaking success.
  - `P11.50 Badge Definitions & Revoke Tool`: Audit and manage badge definitions with audit log for revocations.
- **`docs/connection-features.md`:** Clarified that Orbit and Globe operate on the final bonus-narrowed twin without rule disruption.
- **`docs/bonus-rounds-and-badges.md`:** Created complete dedicated specification covering architecture, mathematics, privacy invariants, and operational runbook.

### Item 6: `task.md` (Phases 10T & 10U, P11.47–P11.50, Dashboard Rebuild)
- **Status:** DONE (Commit `01ca3f8`)
- Added **Phase 10T "Bonus Rounds (Stage L9)"** (7 tasks: P10T.01–P10T.07).
- Added **Phase 10U "Badges (Stage L10)"** (6 tasks: P10U.01–P10U.06).
- Added **Phase 11 Tasks P11.47–P11.50** (4 admin tasks under Addendum C).
- Updated Phase Overview Table (Phase 10T 0/7, Phase 10U 0/6, Phase 11 0/50).
- Updated Recommended Execution Order to:
  `F1 → M0 → L0 → L0-FIX → L0-ADD → L1 → L2 → L3 → F2 → F3 → F4 → M1 → M2 → L4 → L9 → Phase 11 admin → L5 → L7 → L10 → on command: M3 to M8, L6, L8`
- Updated Master Progress Dashboard:
  - Total tasks: 410 (was 393, +17 tasks)
  - Completed: 237
  - Pending: 173
  - Phases: 38 (was 36)
  - Progress: 58% ($237 / 410 = 57.8\% \approx 58\%$)
- Added Stage L9 and Stage L10 checklists.
- Ran `node scripts/docs-visuals/build.mjs` and regenerated all SVGs to match the 410/58% arithmetic.

### Item 7: `memory.md` (Section 36 Decisions, Questions & Risk Register)
- **Status:** DONE (Commit `f384e51`)
- Appended Section 36 detailing Stage L0-ADD decisions.
- Section 36.1: Recorded all 7 Founder questions with recommended defaults and rationale.
- Section 36.2: Recorded unsoftened risk register (low async participation, badge farming fatigue, evergreen pool leaks, comparison pressure).
- Section 36.3: Recorded next actions.

---

## 2. Verification Outputs

### 2.1 Tab Scan
Zero tabs across all Markdown documentation files:
```
$ node -e "..." (tab scan)
Total tabs: 0
```

### 2.2 Bare LaTeX Scan
Zero bare LaTeX symbols (such as `\cdot`, `\Vert`, or naked LaTeX identifiers) in newly authored or amended specifications. All mathematics and configuration names are formatted in backticks.
```
Total bare LaTeX occurrences in newly added specifications: 0
```

### 2.3 Duplicate Header Scan
Zero duplicate `##` or `###` headers in any active system documentation file:
```
Total duplicate headers: 0
```

### 2.4 Config Key Parity (14 New Keys)
All 14 config keys are identical across `rules.md` (9.4), `architecture.md` (18.2.4 & 18.11), `product.md` (F40 & F41), and `docs/bonus-rounds-and-badges.md`:

| Canonical Config Key | Rules 9.4 | Arch 18.2.4 | Product F40/F41 | Default Value | Description |
|---|:---:|:---:|:---:|:---:|---|
| `bonus.min_tie_size` | YES | YES | YES | `2` | Minimum members in tie group to trigger bonus round |
| `bonus.questions_per_round` | YES | YES | YES | `3` | Questions per bonus round |
| `bonus.max_rounds` | YES | YES | YES | `2` | Maximum bonus rounds allowed per drop |
| `bonus.pool_min_per_lane` | YES | YES | YES | `40` | Minimum approved evergreen questions required in lane |
| `bonus.window_hours` | YES | YES | YES | `24` | Hours bonus round stays open after drop finalization |
| `bonus.retention_days` | YES | YES | YES | `28` | Retention period for bonus answers |
| `bonus.min_participants` | YES | YES | YES | `2` | Minimum completed participants needed to rematch |
| `feature.bonus_rounds` | YES | YES | YES | `false` | Master feature flag for bonus rounds |
| `badge.min_similarity` | YES | YES | YES | `0.60` | Minimum similarity threshold for valid twin pair |
| `badge.tier1_lanes` | YES | YES | YES | `2` | Lanes required for Tier 1 Explorer badge |
| `badge.tier2_lanes` | YES | YES | YES | `3` | Lanes required for Tier 2 Explorer badge |
| `badge.tier3_lanes` | YES | YES | YES | `5` | Lanes required for Tier 3 Explorer badge |
| `badge.super_window_days` | YES | YES | YES | `7` | Days window to find Super Twin across distinct lanes |
| `feature.badges` | YES | YES | YES | `false` | Master feature flag for badges |

### 2.5 Route Policy Table Consistency (4 Routes)
All 4 routes verified in `architecture.md` 18.9 policy table and `docs/bonus-rounds-and-badges.md`:
- `GET /v1/bonus/:dropId` -> Auth: User, Cache: 60s, Rate limit: 30/min
- `POST /v1/bonus/:roundId/answers` -> Auth: User, Cache: none (idempotent), Rate limit: 10/min
- `GET /v1/bonus/:roundId/result` -> Auth: User, Cache: 30s, Rate limit: 30/min
- `GET /v1/me/badges` -> Auth: User, Cache: 120s, Rate limit: 60/min

### 2.6 Task Arithmetic & Visual Assets Verification
- Total tasks: 410 (Sum of all 38 phases = 410)
- Completed tasks: 237 (57.8%, rounded to 58%)
- Pending tasks: 173
- `node scripts/docs-visuals/build.mjs` executed cleanly: all SVGs regenerated and verified with 0 diff.

---

## 3. Noticed, Not Changed

1. **`product.md` line 10 overview summary:** Still retains *"Every day at 07:00 IST, Oddly drops five instinct-based questions—identical for everyone on Earth. Players answer on intuition without profiles, feeds, chat, or followers."* (Left intact per Founder's decision to preserve overview brand text until dedicated copy review).
2. **`package.json` and lockfiles:** Not touched. All additions rely exclusively on existing PostgreSQL, Redis, and React primitives.
3. **Historical report files (`docs/stage-*-report.md`):** Kept as historical records without retroactive modifications.

---

## 4. Code & Dependency Isolation Confirmation

**Strict confirmation:** Zero files touched under:
- `apps/`
- `services/`
- `packages/*/src`
- `packages/*/package.json`
- `package.json` or `pnpm-lock.yaml`
- Database migrations (`packages/database/migrations/` or `services/*/migrations/`)
- Seed data scripts

Verified via `git diff main..HEAD --name-only`.

---

## 5. Summary of Founder Questions & Recommended Defaults

| # | Question | Recommended Default | Rationale |
|---|---|---|---|
| 1 | Should bonus round participants see who is in the tie group before answering? | `false` (blind answering) | Prevents social friction, game playing, and stalking. Protects privacy. |
| 2 | Can a player opt out of bonus rounds permanently in settings? | `true` (`settings.bonus_opt_out: false`) | Consistent with user agency and low pressure ethos. |
| 3 | Should bonus questions use rich formats (quad, slider) or binary only? | Binary only in v1 (`binary_2`) | Maximum entropy, lowest latency, zero friction. |
| 4 | If tie group has odd number of participants, does someone get left alone? | Yes (`bonus.result.alone` copy) | Honesty rule (Rule B2): never invent a fake twin. |
| 5 | Should badges be revocable if retroactive fraud or bot activity is detected? | `true` (via admin audit tool P11.50) | Preserves integrity and auditability of twin records. |
| 6 | Can badges be shared as individual sticker cards on Instagram/WhatsApp? | `false` in v1 | Avoids badge flexing and preserves private collector feeling. |
| 7 | Should bonus rounds count toward the daily streak? | `false` | Streaks belong strictly to the 5-question daily Drop. |

---

## 6. Git Branch & Tag Record

- **Working Branch:** `stage-L0-add-docs`
- **Commits:**
  - `977c738`: `docs(rules): add Rules B1-B7, Rule 12 clarification, and Section 9.4 config keys (L0-ADD item 1)`
  - `e0774e5`: `docs(product): add F40 Bonus Rounds, F41 Badges, glossary terms, and Section 9.6 cross-ref (L0-ADD item 2)`
  - `cf600f5`: `docs(architecture): add Section 18.11, ADR 051/052, policy routes, and 18.2.4 config keys (L0-ADD item 3)`
  - `690df79`: `docs(design): add Section 12D bonus rounds and badges UI specs and budget check (L0-ADD item 4)`
  - `305647e`: `docs: add bonus math, Addendum C, connection specs, event dictionary additions, and full bonus/badges spec (L0-ADD item 5)`
  - `01ca3f8`: `docs(task): add Phase 10T, Phase 10U, P11.47-50, updated execution order and recomputed dashboard (L0-ADD item 6)`
  - `f384e51`: `docs(memory): append Section 36 Stage L0-ADD decisions, Founder questions, and risk register (L0-ADD item 7)`
  - `docs: add stage-L0-add-report.md`: Deliverable summary report
- **Tag:** `stage-L0-add-complete`

