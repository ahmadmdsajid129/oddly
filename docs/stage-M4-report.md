# Stage M4 Report: Insights Engine — Statistics Only (Phase 10H)

**Date:** 2026-11-21  
**Branch:** `main` (synchronized with `origin/main`)  
**Commit Milestone:** `stage-M4-complete`  
**Prerequisites:** Stage M3 (Phase 10G: Meme Lab & Exposure Pipeline)  
**Status:** **COMPLETE (9/9 Tasks Delivered, 100% Monorepo Verification)**

---

## 1. Executive Summary

Phase 10H (Stage M4) delivers the **Insights Engine**, providing consented behavioral statistics, category performance analytics, automated question quality flags, cohort notification timing optimization, and Drop planning advisory tooling for Oddly v1.

The implementation strictly satisfies:
- **`rules.md` Rule 12 (Identical Drop Rule):** The 5 questions of a Drop are 100% identical globally for all players. Daily questions are **never personalized**. Personalization applies strictly to non-Drop surfaces (optional Post-Drop Meme Corner cards, notification send-hour cohorts, and suggested share card themes).
- **`rules.md` Rule 13 (Consent Rule & DPDP Section 12):** Explicit consent is required before computing or storing `player_taste`. Consent default is OFF. When a player withdraws `'personalisation'` consent, an instant hard deletion hook purges all `player_taste` rows immediately.
- **`rules.md` Rule 14 (No Sensitive Inference):** The subject taxonomy consists exclusively of neutral lifestyle and humor topics. Automated tests verify zero overlap with Section 9.1 forbidden topics (religion, politics, caste, health, income, etc.).
- **`rules.md` Rule 15 (No Identity-Joined Profiling):** Question quality drill-downs enforce $k \ge 20$ group reporting. Zero individual user vectors are ever stored or exposed.
- **`docs/admin-panel-spec.md` Addendum A2 & A3:** Real aggregate telemetry analytics replacing guesswork: dwell time medians ($p_{50}, p_{90}$), option toggle/back rates, drop-off abandonment rates, automated question friction flags, and Drop planning advisory with a 4-day fatigue lint.

---

## 2. Deliverables & Verification Matrix

| Task ID | Deliverable | Spec Reference | Status | Verification |
|---|---|---|---|---|
| `P10H.01` | Database migrations: `player_taste`, `notification_timing_stats`, `editor_suggestions`, and `app_config` seeds | Addendum A8, Migration 008 | **DONE** | Migration `008_insights_engine.sql` applied to PostgreSQL 16; Prisma Client models generated and typechecked across monorepo. |
| `P10H.02` | Nightly worker job: compute smoothed `player_taste` affinity scores with recency weighting (min 20 ratings) | Rule 13, `player-taste.job.ts` | **DONE** | 30-day half-life exponential recency decay, Laplace Bayesian smoothing, and strict $n \ge 20$ sample size guard. Tested in `player-taste.test.ts` (6/6 passing). |
| `P10H.03` | Instant hard deletion hook for `player_taste` upon `'personalisation'` consent withdrawal | Rule 13, `events.ts`, `me.ts` | **DONE** | `PUT /v1/consents` with `granted: false` immediately hard-deletes all `player_taste` records. Tested in `consent-taste.integration.test.ts` (1/1 passing). |
| `P10H.04` | Category performance analytics calculation (completion, viral share lift, dwell by subject tag) | Addendum A3.1, `insights.service.ts` | **DONE** | Trailing 14-day completion rate index, viral share lift relative to baseline, and dwell medians exposed via `GET /v1/admin/insights/tags/performance`. |
| `P10H.05` | Question quality flagging engine (detect high dwell, high option changes, high abandon rate) | Addendum A2.1, `insights.service.ts` | **DONE** | Automated flags: `HIGH_FRICTION` ($p_{50} > 12\text{s}$ or toggle $> 35\%$), `HIGH_ABANDONMENT` ($> 3.0\%$), `LOPSIDED_SPLIT`, and report spikes ($\ge 3$). Tested in `insights-invariants.integration.test.ts`. |
| `P10H.06` | Cohort notification timing optimization model (hourly open bucket clustering) | Rule 15, `notification-timing.job.ts` | **DONE** | Clusters UTC open distributions (0–23 UTC) strictly by macro-cohort (`region_ageband`). Falls back to `GLOBAL` cohort if local samples $< 50$. Tested in `notification-timing.test.ts` (2/2 passing). |
| `P10H.07` | Drop planning advisory engine: generate `editor_suggestions` for Mission Control with fatigue warnings | Addendum A3.2, `insights.service.ts` | **DONE** | Generates suggestions for underused tags ($> 14$ days absent), weekend viral boosters, and warns if a tag is scheduled $> 2$ times in 4 consecutive days. Tested in `insights-invariants.integration.test.ts`. |
| `P10H.08` | Personalised ranking for optional Meme Corner card and suggested share card themes | Non-Drop Surfaces, `memes.repo.ts` | **DONE** | Evaluates matching tag affinity for consented users ($n \ge 20$) during exploitation branch. Drop questions remain 100% identical. Tested in `insights-invariants.integration.test.ts`. |
| `P10H.09` | Unit and integration tests with synthetic fixtures proving zero sensitive inference and zero Drop variation | Rules 12 & 14, `insights-invariants.integration.test.ts` | **DONE** | Verified: 1) Drop questions for users with opposite tastes are 100% identical; 2) Zero forbidden topic overlap in taxonomy; 3) Category analytics; 4) Question quality flags; 5) Fatigue linting; 6) Meme Corner taste boosting. |

---

## 3. Core Architectural Invariants Proven

### 1. Rule 12: Identical Drop Invariant
- Tested in `insights-invariants.integration.test.ts`:
  - Player 1 has 0.95 affinity for `humour` and 0.05 for `quirks`.
  - Player 2 has 0.05 affinity for `humour` and 0.95 for `quirks`.
  - Both players invoke `GET /v1/drop/:date`.
  - **Result:** The returned questions, positions, option IDs, labels, and payloads are **100% byte-for-byte identical**. Drop questions are immune to taste personalization.

### 2. Rule 13: DPDP Consent & Instant Hard Deletion
- Tested in `consent-taste.integration.test.ts`:
  - When `'personalisation'` consent is active, smoothed affinities are persisted.
  - As soon as the user toggles consent OFF via `PUT /v1/consents` (`granted: false`), `prisma.playerTaste.deleteMany` executes synchronously in the same database transaction.
  - Immediate verification confirms 0 residual rows in `player_taste`.
  - Account deletion (`DELETE /v1/me`) cascades and deletes any remaining taste entries.

### 3. Rule 14: Zero Sensitive Inferences
- Tested in `insights-invariants.integration.test.ts`:
  - System audits all tag keys, categories, and localized multilingual label maps against the Section 9.1 Forbidden Topic List (religion, political entities/leaders, caste, medical diagnoses, wealth/income).
  - **Result:** 0 forbidden keywords found in active taxonomy.

### 4. Recency Weighting & Bayesian Smoothing Formulation
- In `PlayerTasteJob`:
  - Ratings receive exponential decay weights:
    $$w_i = \exp\left(-\lambda \cdot \Delta t\right), \quad \lambda = \frac{\ln 2}{30 \times 86400 \times 1000}$$
  - Laplace / Bayesian smoothing with neutral prior (+1 positive, +2 total pseudo-observations):
    $$\text{Affinity Score} = \frac{\sum w_i \cdot \mathbb{I}(\text{funny}) + 1.0}{\sum w_i + 2.0}$$
  - Guard: If total ratings $n < 20$, the score is skipped and not used.

### 5. Addendum A3.2 Fatigue Lint
- When planning Drops on the Drops Calendar, the engine scans the trailing and forward 4-day window.
- If the same subject tag is scheduled $> 2$ times within 4 consecutive days, Mission Control generates a `fatigue_warning` suggestion with severity `warning` (or `critical` if $> 3$), advising the editor to diversify topics.

---

## 4. Test Suite Summary

- `@oddly/worker`:
  - `src/player-taste.test.ts`: 6/6 passed.
  - `src/notification-timing.test.ts`: 2/2 passed.
  - `src/wilson-scoring.test.ts`: 3/3 passed.
  - `src/signals.aggregation.test.ts`: 2/2 passed.
  - `src/partition.test.ts`: 7/7 passed.
  - `src/provisional.test.ts`: 3/3 passed.
  - `src/pipeline.test.ts`: 15/15 passed.
  - `src/push.test.ts`: 18/18 passed.
  - **Total Worker Tests: 56/56 passed (100%).**

- `@oddly/api`:
  - `src/insights-invariants.integration.test.ts`: 6/6 passed.
  - `src/consent-taste.integration.test.ts`: 1/1 passed.
  - `src/memes-abuse.integration.test.ts`: 11/11 passed.
  - `src/memes-candidate.integration.test.ts`: 7/7 passed.
  - `src/memes-takedown.integration.test.ts`: 7/7 passed.
  - `src/memes-exposure.integration.test.ts`: 7/7 passed.
  - `src/memes.integration.test.ts`: 17/17 passed.
  - **Total Insights & Meme API Tests: 56/56 passed (100%).**

- Monorepo Quality:
  - `turbo run typecheck`: 6/6 packages clean.
  - `turbo run lint`: 6/6 packages clean, 0 warnings.

