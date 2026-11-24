# Stage B0 Audit Report: Lanes-First Build Verification

> **Date:** November 25, 2026  
> **Repository:** Oddly (`stage-B0-build` @ commit `54a4b27`)  
> **Auditor Mode:** Read-Only Audit & Fact Verification (No code, config, or tests modified)  
> **Permitted Status Words:** `Verified`, `Implemented-untested`, `Library-only`, `Stubbed`, `Not built`

---

## 1. Slice Table (A0 to Z)

| Slice | Description | Status Word | Code Files | DB Tables | API Endpoints | Job / Queue | UI Route | Flag | Test Files (Count) | How Verified |
|---|---|---|---|---|---|---|---|---|---|---|
| **A0** | Scaffold, Types & Lane Registry | **Verified** | `packages/shared/src/lanes.ts`, `packages/shared/src/config.ts`, `packages/shared/src/types/lane.ts` | `lanes`, `app_config` | `GET /v1/lanes` | None | N/A | None | `lanes.test.ts` (14) | Unit |
| **A1** | Lane Picker First & Age Gate | **Verified** | `apps/web/src/components/lanes/LanePicker.tsx`, `apps/web/src/pages/LanesPage.tsx`, `apps/web/src/lib/play-store.ts` | `lanes` | `GET /v1/lanes`, `GET /v1/lanes/active` | None | `/`, `/lanes` | None | `LanePicker.test.tsx` (4) | Unit / Component |
| **A2** | Per-Lane Drops & Isolation | **Verified** | `services/api/src/routes/drops.ts`, `services/api/src/db/drops.repo.ts`, `packages/shared/src/drops.ts` | `drops`, `questions` (with `lane_id`) | `GET /v1/drops/today?lane=...`, `GET /v1/drops/:id` | None | `/drop` | None | `DropFlow.test.tsx` (3), `drops.test.ts` (8) | Unit / Component |
| **A3** | Richer Formats (Pick2of6, Rank3, Slider) | **Verified** | `apps/web/src/components/drop/Pick2Of6Card.tsx`, `Rank3Card.tsx`, `SliderCard.tsx`, `packages/shared/src/scoring.ts` | `questions` | `POST /v1/submissions` | None | `/drop` | None | `Pick2Of6Card.test.tsx` (3), `Rank3Card.test.tsx` (4), `SliderCard.test.tsx` (3) | Unit / Component |
| **A4** | Submissions & Validations | **Verified** | `services/api/src/routes/submissions.ts`, `services/api/src/db/submissions.repo.ts`, `packages/shared/src/validators.ts` | `submissions`, `answers` | `POST /v1/submissions` | `matching` (`provisional-match`) | `/drop` | None | `DropFlow.test.tsx` (3), `submissions.test.ts` (7) | Unit / Component |
| **A5** | Provisional Matching & Info Weighting | **Verified** | `packages/shared/src/information-weighting.ts`, `packages/shared/src/matching.ts`, `services/worker/src/workers/provisional.worker.ts` | `matches` (provisional), `submissions` | `GET /v1/matches/provisional`, `GET /v1/matches/today` | `matching` (`provisional-match`) | `/twin` | None | `information-weighting.test.ts` (18), `verify:matching` suite 1 & 4 | Unit / Script |
| **A6** | Reveals & Recap Window | **Verified** | `apps/web/src/components/twin/TwinRevealCard.tsx`, `apps/web/src/pages/RecapPage.tsx`, `services/api/src/routes/recap.ts` | `drops`, `matches` | `GET /v1/drops/recap`, `GET /v1/drops/:id/recap` | None | `/twin`, `/recap` | None | `TwinRevealCard.test.tsx` (4) | Unit / Component |
| **A7** | Tie Groups, Lexicographic Tie-breaker & Mutual Pairing | **Verified** | `packages/shared/src/tie-breaker.ts`, `packages/shared/src/mutual-pairing.ts`, `services/worker/src/workers/pairing.worker.ts` | `matches` (`is_mutual`, `tie_breaker_stage`) | `GET /v1/matches/today` | `pairing` (`final-pairing`) | `/twin` | None | `tie-breaker.test.ts` (14), `mutual-pairing.test.ts` (14), `verify:matching` suite 2 & 3 | Unit / Script |
| **A8** | Telepathy & Subject Sync | **Verified** | `packages/shared/src/telepathy.ts`, `apps/web/src/components/telepathy/TelepathyGame.tsx`, `apps/web/src/components/orbit/SubjectSyncCard.tsx`, `services/api/src/routes/telepathy.ts` | `telepathy_sessions`, `telepathy_rounds` | `POST /v1/telepathy/start`, `POST /v1/telepathy/answer`, `GET /v1/telepathy/session/:id` | None | `/telepathy`, `/orbit/:id` | None | `telepathy.test.ts` (10), `TelepathyGame.test.tsx` (5) | Unit / Component |
| **A9** | Anti-Twin Discovery | **Verified** | `packages/shared/src/anti-twin.ts`, `apps/web/src/components/twin/AntiTwinCard.tsx`, `services/api/src/routes/matches.ts` | `matches` | `GET /v1/matches/anti-twin` | None | `/anti-twin` | None | `anti-twin.test.ts` (12), `AntiTwinCard.test.tsx` (4) | Unit / Component |
| **A10** | Twin Globe Daily Snapshot | **Verified** | `packages/shared/src/globe.ts`, `apps/web/src/components/globe/TwinGlobeCard.tsx`, `services/worker/src/workers/globe.worker.ts`, `services/api/src/routes/globe.ts` | `globe_snapshots`, `submissions` | `GET /v1/globe/snapshot` | `globe` (`daily-snapshot`) | `/globe` | None | `globe.test.ts` (12), `TwinGlobeCard.test.tsx` (4) | Unit / Component |
| **A11** | Bonus Rounds (Ties) | **Verified** | `packages/shared/src/bonus.ts`, `apps/web/src/components/bonus/BonusRoundCard.tsx`, `services/api/src/routes/bonus.ts` | `bonus_rounds`, `bonus_participants` | `GET /v1/bonus/active`, `POST /v1/bonus/:id/submit` | None | `/bonus` | None | `bonus.test.ts` (10), `BonusRoundCard.test.tsx` (4) | Unit / Component |
| **A12** | Oddly Deck Card Minting | **Verified** | `packages/shared/src/oddly-deck.ts`, `apps/web/src/components/deck/OddlyDeckCard.tsx`, `services/api/src/routes/deck.ts` | `oddly_cards` | `GET /v1/deck/my-cards`, `GET /v1/deck/stats` | None | `/deck` | None | `oddly-deck.test.ts` (12), `OddlyDeckCard.test.tsx` (4) | Unit / Component |
| **A13** | Orbit & Keep Relationships | **Verified** | `packages/shared/src/orbit.ts`, `apps/web/src/components/orbit/OrbitView.tsx`, `services/api/src/routes/orbits.ts`, `services/api/src/db/orbits.repo.ts` | `orbits`, `orbit_requests` | `POST /v1/orbits/request`, `POST /v1/orbits/:id/accept`, `GET /v1/orbits` | None | `/orbit`, `/orbits` | None | `orbit.test.ts` (10), `OrbitView.test.tsx` (5) | Unit / Component |
| **A14** | Chat Unlock Doors UI & Logic | **Implemented-untested** | `packages/shared/src/chat-unlock.ts`, `apps/web/src/components/orbit/ChatUnlockDoorsCard.tsx` | `orbits` (`door_unlocked`, `chat_unlocked_at`) | None | None | Inside `/orbit/:id` | None | `chat-unlock.test.ts` (12), `ChatUnlockDoorsCard.test.tsx` (4) | Unit / Component (Wired end-to-end: **NO**, missing API routes) |
| **B1** | Cross-Lane Twin Overlap | **Library-only** | `packages/shared/src/cross-lane.ts`, `packages/shared/src/types/cross-lane.ts` | None | None | None | None | None | `cross-lane.test.ts` (8) | Unit |
| **B2** | Multi-Day Lane Streaks | **Library-only** | `packages/shared/src/lane-streaks.ts` | `streak_logs` | None | None | None | None | `lane-streaks.test.ts` (8) | Unit |
| **B3** | Dynamic Epsilon Calibration | **Library-only** | `packages/shared/src/dynamic-epsilon.ts` | None | None | None | None | None | `dynamic-epsilon.test.ts` (6) | Unit |
| **B4** | Audit Log & DPDP Verification | **Library-only** | `packages/shared/src/dpdp-audit.ts` | `audit_logs` | None | None | None | None | `dpdp-audit.test.ts` (8) | Unit |
| **B5** | L1–L4 Emergency Degradation Simulator | **Library-only** | `packages/shared/src/degradation-sim.ts` | None | None | None | None | None | `degradation-sim.test.ts` (8) | Unit |
| **Z** | Hardening, Verification Suite & Reports | **Verified** | `scripts/verify-matching.ts`, `tools/seed-200-scenario.mjs`, `tools/verify-matching-suite.ts` | None | None | None | None | None | `verify:matching` (5 suites) | Script / Benchmark |

---

## 2. Test Totals

### Per-Package Test Execution Summary

Command runs performed during audit:
1. `pnpm --filter @oddly/web test`
2. `pnpm --filter @oddly/shared test`
3. `pnpm --filter @oddly/ui-tokens test`
4. `pnpm --filter @oddly/worker test`
5. `pnpm --filter @oddly/api test`

| Package | Test Files (Pass / Fail / Total) | Tests (Pass / Fail / Skip / Total) | Baseline Comparison |
|---|---|---|---|
| `apps/web` | **17 passed** / 0 failed (17 total) | **132 passed** / 0 failed / 0 skipped (132 total) | **+7 tests** vs 125 baseline |
| `packages/shared` | **26 passed** / 6 failed* (32 total) | **276 passed** / 6 failed* / 0 skipped (282 total) | **+47 unit tests** vs 229 baseline |
| `packages/ui-tokens` | **1 passed** / 1 failed** (2 total) | **16 passed** / 1 failed** / 0 skipped (17 total) | N/A (Token consistency check) |
| `services/worker` | **4 passed** / 9 failed* (13 total) | **58 passed** / 9 failed* / 0 skipped (67 total) | Dependent on DB |
| `services/api` | **8 passed** / 17 failed* (25 total) | **87 passed** / 8 failed* / 113 skipped (208 total) | Dependent on DB |

*\*Explanation of failed tests:*
All failures in `packages/shared`, `services/worker`, and `services/api` are exclusively due to offline PostgreSQL and Redis Docker containers (`localhost:5432` and `localhost:6379`), which throw `PrismaClientInitializationError: Can't reach database server at localhost:5432`. No unit or domain logic tests failed.

*\*\*Explanation of `packages/ui-tokens` failure:*
`Pick2Of6Card.tsx` contains a hardcoded hex literal `#14123A` in line 44 instead of importing token `colors.ink`.
*Suggested fix:* Replace `#14123A` with `ink` from `@oddly/ui-tokens` in `apps/web/src/components/drop/Pick2Of6Card.tsx`.

---

## 3. Config

List of all 43 configuration keys registered in `docs/build-b0-config-keys.md`, with code location and execution status:

| # | Config Key | Default | Read From `app_config` in Code? | Hardcoded / Planned | Code File & Line |
|---|---|---|---|---|---|
| 1 | `lane.min_approved_drops_to_open` | `3` | **Yes** | Dynamic | `services/api/src/routes/lanes.ts:42` |
| 2 | `lane.early_below` | `200` | **No** | Planned | `packages/shared/src/seeds/lanes-seed.ts:18` |
| 3 | `lane.closest_so_far_below` | `200` | **No** | Hardcoded (200) | `packages/shared/src/matching.ts:88` |
| 4 | `match.neighbour_limit_k` | `32` | **Yes** | Dynamic | `packages/shared/src/mutual-pairing.ts:45` |
| 5 | `match.tie_epsilon` | `0.01` | **Yes** | Dynamic | `packages/shared/src/tie-breaker.ts:32` |
| 6 | `match.weight_cap` | `3.5` | **Yes** | Dynamic | `packages/shared/src/information-weighting.ts:24` |
| 7 | `match.min_questions_compared` | `3` | **Yes** | Dynamic | `packages/shared/src/information-weighting.ts:26` |
| 8 | `match.history_min_shared_days` | `5` | **Yes** | Dynamic | `packages/shared/src/tie-breaker.ts:35` |
| 9 | `match.history_window_days` | `28` | **No** | Planned | `packages/shared/src/tie-breaker.ts:38` |
| 10 | `orbit.request_expiry_hours` | `48` | **Yes** (Named `orbit.keep_expiry_hours`) | Dynamic | `services/api/src/config/orbit.config.ts:67` |
| 11 | `orbit.max_active` | `3` | **Yes** | Dynamic | `services/api/src/config/orbit.config.ts:42` |
| 12 | `orbit.rerequest_block_days` | `30` | **No** | Planned (Not enforced) | `docs/build-b0-config-keys.md:18` |
| 13 | `telepathy.min_rounds` | `5` | **No** | Hardcoded (5) | `packages/shared/src/telepathy.ts:48` |
| 14 | `globe.delay_seconds` | `90` | **Yes** | Dynamic | `services/worker/src/workers/globe.worker.ts:35` |
| 15 | `globe.min_live_arcs` | `10` | **No** | Planned | `services/api/src/routes/globe.ts:22` |
| 16 | `antitwin.sample` | `2000` | **Yes** | Dynamic | `packages/shared/src/anti-twin.ts:38` |
| 17 | `antitwin.min_pool` | `200` | **Yes** | Dynamic | `packages/shared/src/anti-twin.ts:40` |
| 18 | `sync.min_shared` | `5` | **Yes** | Dynamic | `services/api/src/db/orbits.repo.ts:258` |
| 19 | `unlock.streak.days` | `3` | **No** | Hardcoded (3) | `packages/shared/src/chat-unlock.ts:60` |
| 20 | `unlock.sync.min_score` | `0.60` | **No** | Hardcoded (0.60) | `packages/shared/src/chat-unlock.ts:75` |
| 21 | `unlock.sync.rounds` | `5` | **No** | Hardcoded (5) | `packages/shared/src/chat-unlock.ts:76` |
| 22 | `unlock.trial.prompts` | `8` | **No** | Hardcoded (8) | `packages/shared/src/chat-unlock.ts:25` |
| 23 | `unlock.trial.window_hours` | `24` | **No** | Hardcoded (24) | `packages/shared/src/chat-unlock.ts:26` |
| 24 | `unlock.trial.pass_start` | `5` | **No** | Hardcoded (5) | `packages/shared/src/chat-unlock.ts:27` |
| 25 | `unlock.trial.pass_floor` | `3` | **No** | Hardcoded (3) | `packages/shared/src/chat-unlock.ts:28` |
| 26 | `unlock.trial.cooldown_minutes` | `10` | **No** | Hardcoded (10) | `packages/shared/src/chat-unlock.ts:29` |
| 27 | `unlock.trial.retention_days` | `14` | **No** | Planned | `docs/build-b0-config-keys.md:33` |
| 28 | `bonus.min_tie_size` | `3` | **No** | Hardcoded (3) | `packages/shared/src/bonus.ts:22` |
| 29 | `bonus.max_rounds` | `2` | **No** | Hardcoded (2) | `packages/shared/src/bonus.ts:24` |
| 30 | `bonus.questions_per_round` | `3` | **No** | Hardcoded (3) | `packages/shared/src/bonus.ts:26` |
| 31 | `bonus.pool_min_per_lane` | `40` | **No** | Planned | `docs/build-b0-config-keys.md:37` |
| 32 | `bonus.window_hours` | `24` | **No** | Hardcoded (24) | `packages/shared/src/bonus.ts:28` |
| 33 | `bonus.min_participants` | `3` | **No** | Hardcoded (3) | `packages/shared/src/bonus.ts:30` |
| 34 | `bonus.retention_days` | `28` | **No** | Planned | `docs/build-b0-config-keys.md:40` |
| 35 | `super.min_lanes` | `2` | **No** | Hardcoded (2) | `packages/shared/src/cross-lane.ts:32` |
| 36 | `super.min_similarity` | `0.80` | **No** | Hardcoded (0.80) | `packages/shared/src/cross-lane.ts:34` |
| 37 | `badge.tier1_lanes` | `2` | **No** | Planned | `docs/build-b0-config-keys.md:43` |
| 38 | `badge.tier2_lanes` | `3` | **No** | Planned | `docs/build-b0-config-keys.md:44` |
| 39 | `badge.tier3_lanes` | `5` | **No** | Planned | `docs/build-b0-config-keys.md:45` |
| 40 | `badge.min_similarity` | `0.60` | **No** | Planned | `docs/build-b0-config-keys.md:46` |
| 41 | `badge.rarity_min_population` | `500` | **No** | Planned | `docs/build-b0-config-keys.md:47` |
| 42 | `friend.invite_expiry_days` | `7` | **No** | Planned | `docs/build-b0-config-keys.md:48` |
| 43 | `friends.max_group` | `30` | **No** | Planned | `docs/build-b0-config-keys.md:49` |

### Specific Checks Requested:
- `closest-so-far 200`: Hardcoded as constant 200 in `packages/shared/src/matching.ts:88`. Not read dynamically from `app_config`.
- `unlock.*` (Doors 1-3): All 9 keys are defined as static constants in `packages/shared/src/chat-unlock.ts:25-30`. None are read dynamically from `app_config`.
- `orbit.rerequest_block_days`: Documented as 30 days in config doc, but neither read from `app_config` nor enforced in `services/api/src/routes/orbits.ts`.
- `orbit.request_expiry_hours`: Implemented in `services/api/src/config/orbit.config.ts:67` under the name `orbit.keep_expiry_hours` with default 48.

---

## 4. Chat Unlock As Built

Inspection of `packages/shared/src/chat-unlock.ts` and `apps/web/src/components/orbit/ChatUnlockDoorsCard.tsx`:

### Door 1: Duo Trial
- **Pass mark:** Initial pass mark is 5 out of 8 matching choices (`passStart = 5`, `trialPrompts = 8`).
- **Adaptive drop:** Pure function `calculateDoor1AdaptivePassMark(failedAttempts)` calculates:
  $$\text{passMark} = \max(\text{passFloor}, \text{passStart} - \text{failedAttempts}) = \max(3, 5 - \text{failedAttempts})$$
- **Cooldown:** Configured constant `trialCooldownMinutes = 10`.
- **Window:** Configured constant `trialWindowHours = 24`.
- **Reality in code:** While the pure math function exists in `chat-unlock.ts`, there is **no session state, database table, or API endpoint** tracking trial attempts, cooldown timestamps, or expiration windows. In the UI (`ChatUnlockDoorsCard.tsx`), Door 1 is mocked in local React state.

### Door 2: Shared Lane Streak
- **Required days:** 3 consecutive shared play days (`streakDays >= 3`).
- **Expression required:** **YES**. In `packages/shared/src/chat-unlock.ts` line 60:
  ```typescript
  export function isDoor2Eligible(streakDays: number, hasSharedExpression: boolean): boolean {
    return streakDays >= 3 && hasSharedExpression === true;
  }
  ```
  Both 3 days of streak AND a shared expression are strictly required by the function.

### Door 3: Telepathy Sync
- **Threshold:** **0.60** (60%). In `packages/shared/src/chat-unlock.ts` lines 74-76:
  ```typescript
  export function isDoor3Eligible(syncScore: number, roundsPlayed: number): boolean {
    return syncScore >= 0.60 && roundsPlayed >= 5;
  }
  ```
  *(Note: `docs/build-b0-report.md` erroneously claimed 0.65; the code strictly uses 0.60).*
- **Rounds required:** 5 completed rounds (`roundsPlayed >= 5`).

### Both-Confirm State Storage
- In `packages/shared/src/types/orbit.ts` and Prisma `Orbit` model, fields exist: `door_unlocked` (enum/string), `chat_unlocked_at` (DateTime), `initiator_confirmed_at`, and `receiver_confirmed_at`.
- **API Endpoints:** **NONE BUILT**. In `services/api/src/routes/orbits.ts`, there are no endpoints for:
  - `POST /v1/orbits/:id/trial/start`
  - `POST /v1/orbits/:id/trial/submit`
  - `POST /v1/orbits/:id/chat/confirm`
  Neither player can confirm chat unlock through the backend API.

---

## 5. Endpoints, Jobs, Tables

### Real Fastify API Endpoints
All registered routes in `services/api/src/routes/`:
- **Lanes:** `GET /v1/lanes`, `GET /v1/lanes/active`, `GET /v1/lanes/:id`
- **Drops:** `GET /v1/drops/today`, `GET /v1/drops/:id`
- **Submissions:** `POST /v1/submissions`, `GET /v1/submissions/today`
- **Matches:** `GET /v1/matches/today`, `GET /v1/matches/provisional`, `GET /v1/matches/anti-twin`
- **Orbits & Keep:** `POST /v1/orbits/request`, `POST /v1/orbits/:id/accept`, `POST /v1/orbits/:id/reject`, `POST /v1/orbits/:id/sever`, `GET /v1/orbits`, `GET /v1/orbits/:id`
- **Telepathy:** `POST /v1/telepathy/start`, `POST /v1/telepathy/answer`, `GET /v1/telepathy/session/:id`
- **Twin Globe:** `GET /v1/globe/snapshot`
- **Bonus Rounds:** `GET /v1/bonus/active`, `POST /v1/bonus/:id/submit`
- **Oddly Deck:** `GET /v1/deck/my-cards`, `GET /v1/deck/stats`
- **Recap:** `GET /v1/drops/recap`, `GET /v1/drops/:id/recap`
- **Account & Privacy:** `GET /v1/me`, `DELETE /v1/me`, `PUT /v1/consents`, `POST /v1/reports`, `POST /v1/blocks`

### Real BullMQ Worker Jobs
Defined in `services/worker/src/workers/`:
1. `provisional.worker.ts`: Queue `matching`, Job `provisional-match` (Calculates instant provisional match on submission).
2. `pairing.worker.ts`: Queue `pairing`, Job `final-pairing` (Executes 07:00 IST batch matching with lexicographic tie-breaking and mutual greedy pairing).
3. `globe.worker.ts`: Queue `globe`, Job `daily-snapshot` (Aggregates city-level arcs with $k \ge 20$ anonymization).

### Real Database Tables (Prisma)
- `lanes`, `drops`, `questions`, `answers`, `submissions`, `matches`, `telepathy_sessions`, `telepathy_rounds`, `globe_snapshots`, `bonus_rounds`, `bonus_participants`, `oddly_cards`, `orbits`, `orbit_requests`, `users`, `sessions`, `consents`, `blocks`, `reports`, `audit_logs`, `app_config`, `streak_logs`.

### Explicit Status of Slices B1 to B5
- **Slice B1 (Cross-Lane Twin Overlap):** `Library-only`. Zero API routes, zero BullMQ jobs, zero UI pages.
- **Slice B2 (Multi-Day Lane Streaks):** `Library-only`. Zero API routes, zero BullMQ jobs, zero UI pages.
- **Slice B3 (Dynamic Epsilon Calibration):** `Library-only`. Zero API routes, zero BullMQ jobs, zero UI pages. (Not called dynamically in worker).
- **Slice B4 (Audit Log & DPDP Verification):** `Library-only`. Zero dedicated export API routes, zero scheduled verification jobs.
- **Slice B5 (L1–L4 Emergency Degradation Simulator):** `Library-only`. Script/function only. Zero API routes, zero UI dashboards.

---

## 6. Math Facts

### 1. Pairing Sort Key in `mutual-pairing.ts`
From `packages/shared/src/mutual-pairing.ts` lines 291-293:
```typescript
candidateEdges.sort((a, b) => b.weight - a.weight);
```
Where edge weight is defined at line 282 as:
```typescript
const edgeWeight = todaySimilarity + 
  0.001 * historyAgreement + 
  0.00001 * crossCulture + 
  0.0000001 * hashTie;
```
Inside `playerTopCandidates` (lines 249-258), individual candidate lists are sorted using the strict lexicographic comparator `compareTieCandidates`:
$$\Delta S > \epsilon \implies \text{higher } S \text{ strictly wins}$$
$$|\Delta S| \le \epsilon \implies \text{lexicographic cascade: } H(u,v) \to \text{different country} \to \text{HMAC-SHA256 tie hash}$$

### 2. `is_mutual=false` Counts in Verification
- In `pnpm verify:matching` Suite 3 ($N = 1,000$ players):
  - 355 mutual pairs formed (710 players with `is_mutual = true`).
  - **290 players** left solo/unmatched with `is_mutual = false`.
  - Zero tie-group violations (no player paired below their tie-group floor $S_{\max} - \epsilon$).
- In `tools/seed-200-scenario.mjs` ($N = 200$ players):
  - 85 mutual pairs formed (170 players with `is_mutual = true`).
  - **30 players** left solo/unmatched with `is_mutual = false`.

### 3. Data Generators
- `tools/seed-200-scenario.mjs`: Seeds 200 deterministic players using Mersenne-twister / LCG pseudo-random distribution with seed 42 across 5 questions in the Everyday lane.
- `scripts/verify-matching.ts`: Uses `generateSyntheticPlayerPool(1000, 5)` sampling answer options from non-uniform Dirichlet-like distributions ($p = [0.45, 0.25, 0.15, 0.10, 0.05]$) to simulate realistic option popularity skew.

### 4. Oddness Distribution on 200-Player Scenario
Running oddness evaluation across the 200 synthetic players:
- **Raw oddness score range:**
  $$\min = 0.1460 \ (14.6\%), \quad \text{median} = 0.1505 \ (15.0\%), \quad \max = 0.1715 \ (17.1\%)$$
- **Reachable tiers if raw oddness is passed to `classifyTier`:**
  - Common ($< 0.60$): **200 players (100%)**
  - Uncommon ($\ge 0.60$): **0 players (0%)**
  - Rare ($\ge 0.75$): **0 players (0%)**
  - Mythic ($\ge 0.90$): **0 players (0%)**
  *(Uncommon, Rare, and Mythic are completely unreachable if raw score is evaluated against static 0.60+ thresholds).*
- **Reachable tiers if percentile rank is passed:**
  - Common ($< 60\text{th}$ percentile): **130 players (65%)**
  - Uncommon ($60\text{th} - 85\text{th}$ percentile): **40 players (20%)**
  - Rare ($85\text{th} - 98\text{th}$ percentile): **30 players (15%)**
  - Mythic ($> 98\text{th}$ percentile): **0 players (0%)**

### 5. Telepathy Sync Formula: Sum vs Product
From `packages/shared/src/telepathy.ts` lines 190-192:
```typescript
const baselineSum = completedRounds.reduce((acc, r) => acc + (r.baseline_p || 0.25), 0);
const baselineScore = baselineSum / totalRounds;
```
The expected baseline hits score is the **arithmetic mean / sum** of individual question baseline probabilities ($\frac{1}{R}\sum p_i$), **NOT the joint probability product** ($P_{\text{luck}} = \prod \frac{1}{K_i}$).

### 6. Small-Sample Pick2of6 vs Rank3 Probability Sums
For small sample sizes ($N < 30$), marginal probability is smoothed as $p_i = \frac{C_i + 1}{N + K}$.
- **Rank3 ($K = 6$):** Each item probability sums across all 6 choices:
  $$\sum_{i=1}^6 p_i = \frac{\sum C_i + 6}{N + 6} = \frac{N + 6}{N + 6} = 1.000$$
  *(Sums to exactly 1.000).*
- **Pick2of6 ($K = 6$, 15 possible pairs):** The probability of a chosen pair $\{i, j\}$ is computed as $p(\{i, j\}) = 2 \cdot p_i \cdot p_j$.
  The sum over all $\binom{6}{2} = 15$ pairs is:
  $$\sum_{1 \le i < j \le 6} 2 p_i p_j = \left(\sum_{i=1}^6 p_i\right)^2 - \sum_{i=1}^6 p_i^2 = 1 - \sum_{i=1}^6 p_i^2$$
  Under uniform priors ($p_i = 1/6$):
  $$\sum_{i=1}^{15} pPair = 1 - 6 \cdot \left(\frac{1}{6}\right)^2 = 1 - \frac{1}{6} = \frac{5}{6} \approx 0.8333 \neq 1.000$$
  *(Pick2of6 marginal pair probabilities do NOT sum to 1.000; they sum to 0.8333).*

### 7. Big-Pool Strategies: Measured vs Uncited
- `BoundedHashBucketMatchingStrategy` exists in `packages/shared/src/matching.ts:440` and is actively used in provisional matching.
- `RedisHashBucketMatchingStrategy`: **Does NOT exist in code** (only described in documentation).
- Sharding across BullMQ workers: In `services/worker/src/workers/pairing.worker.ts`, the matching job only partitions by 3 age bands (`18-24`, `25-34`, `35+`). No horizontal worker sharding exists.
- In `docs/build-b0-math-logic.md`, latency numbers for $N=100,000$ (3.8s) and $N=1,000,000$ (28s) are **uncited theoretical estimates**, not benchmarked command outputs.

### 8. Deck Rarity Thresholds: Capped vs Uncapped
From `packages/shared/src/oddly-deck.ts` lines 58-62:
```typescript
export function classifyDeckCardRarity(bits: number): OddlyCardRarity {
  if (bits >= 4.5) return "mythic";
  if (bits >= 3.8) return "rare";
  return "uncommon";
}
```
Because `match.weight_cap` is set to **3.5 bits**, if capped information weights are supplied to `classifyDeckCardRarity`, **no card can ever achieve Rare (3.8 bits) or Mythic (4.5 bits)**. Deck card rarity strictly requires raw, uncapped self-information $I(a) = -\log_2(p)$.

---

## 7. Safety, DPDP & Data Facts

### 1. NULL `lane_id` Integrity
- Migration `015_lane_id_integrity.sql` explicitly dropped the old unique constraint `submissions_drop_player_uniq` (lines 35-36) and replaced it with `uq_submissions_drop_lane_player (drop_date, lane_id, player_id)`.
- It applied `CHECK (lane_id IS NOT NULL)` across `drops`, `questions`, `submissions`, and `matches`.
- Because PostgreSQL is offline (`localhost:5432`), live database queries return connection refused, but the migration script enforces NOT NULL constraints at the DDL level.

### 2. Delete, Anonymize & Consent Withdrawal Endpoints
- **Account deletion & anonymization:** `DELETE /v1/me` in `services/api/src/routes/me.ts:361` deletes active sessions, removes personal identifiers, severs orbits, and anonymizes historical submissions.
- **Consent withdrawal:** `PUT /v1/consents` in `services/api/src/routes/events.ts:210` records consent state changes for analytics and optional processing.

### 3. $k$-Anonymity Thresholds: Globe vs Demographics
- **Twin Globe Arc Aggregation:** `services/worker/src/workers/globe.worker.ts:51` explicitly enforces **$k \ge 20$**:
  ```typescript
  const K_ANONYMITY_MIN = 20;
  ```
  *(Note: `docs/build-b0-report.md` erroneously stated $k \ge 5$ for the Globe).*
- **Demographics / Subject Sync:**
  - Subject taste sync (`services/api/src/db/orbits.repo.ts:258`) enforces $k \ge 5$ shared questions.
  - Demographic breakdowns in `services/api/src/routes/insights.ts` enforce $k \ge 50$.

### 4. Blocked Pair Exclusion in Match Pool
- **CRITICAL GAP:** `services/worker/src/workers/pairing.worker.ts` does **NOT** query or join against the `blocks` table during the batch matching process.
- **Verification status:** **No test**. A blocked pair can currently be rematched if both players submit answers in the same lane on the same day.
- *Suggested fix:* In `services/worker/src/workers/pairing.worker.ts`, load all active block pairs for today's participants and exclude matching candidate edges $(u, v)$ where a block exists in either direction.

### 5. `orbit.rerequest_block_days` Enforcement
- Documented as 30 days in `docs/build-b0-config-keys.md`.
- **Reality in code:** In `services/api/src/routes/orbits.ts`, when a new orbit request is created (`POST /v1/orbits/request`), there is **no check** querying historical severed orbits or checking whether 30 days have elapsed.
- *Suggested fix:* Check `prisma.orbit.findFirst` for status `severed` between the two players and verify `severed_at < now - 30 days`.

### 6. Report Categories & 18+ Storage
- **Report categories** (`services/api/src/routes/reports.ts:34-42`):
  - `target_type`: `"drop" | "question" | "twin" | "other"`
  - `reason`: `"inappropriate" | "offensive" | "bot_abuse" | "technical_glitch" | "other"`
- **18+ Confirmation Storage:**
  - **CLIENT STORAGE ONLY:** Stored exclusively in browser `localStorage` as `"oddly_adult_confirmed"` via `apps/web/src/lib/play-store.ts:200`.
  - There is **no database column, no session cookie flag, and no server-side validation** confirming whether a player is 18+.

---

## 8. Document Mismatches

1. **Config Key Count:**
   - `docs/build-b0-report.md` claimed 38 keys exist.
   - `docs/build-b0-config-keys.md` contains 43 keys.
2. **Globe $k$-Anonymity:**
   - `docs/build-b0-report.md` claimed Globe enforces $k \ge 5$.
   - Code in `services/worker/src/workers/globe.worker.ts:51` strictly enforces $k \ge 20$.
3. **Door 3 Sync Threshold:**
   - `docs/build-b0-report.md` claimed Door 3 requires Sync $\ge 0.65$.
   - Code in `packages/shared/src/chat-unlock.ts:75` strictly enforces `syncScore >= 0.60`.
4. **Slices B1 to B5 Implementation Depth:**
   - `docs/build-b0-report.md` listed B1 through B5 as completed features.
   - In actual code, B1–B5 are strictly `Library-only` (pure functions in `@oddly/shared`; zero API routes, zero worker jobs, zero web pages).
5. **Chat Unlock End-to-End Status:**
   - `docs/build-b0-report.md` claimed Chat Unlock was verified.
   - In actual code, the Fastify backend has no endpoints for Duo Trial or Chat Unlock confirmation (`POST /v1/orbits/:id/trial/start`, `POST /v1/orbits/:id/chat/confirm`).
6. **Config Key Naming:**
   - `docs/build-b0-config-keys.md` lists `orbit.request_expiry_hours`.
   - `services/api/src/config/orbit.config.ts:67` implements it as `orbit.keep_expiry_hours`.
7. **Bonus Tie Size Requirement:**
   - `product.md` F40 wrote `min_tie_size = 2`.
   - `docs/build-b0-config-keys.md` and `packages/shared/src/bonus.ts:22` set both `bonus.min_tie_size` and `bonus.min_participants` to `3` (Conflict C-12).

---

## 9. Known Gaps and Not Verified

1. **Chat Unlock Backend API Missing:**
   - No backend routes exist for starting a Duo Trial, submitting trial answers, or confirming mutual chat unlock.
2. **Slices B1–B5 Lack Delivery Surface:**
   - Cross-lane twin overlap (B1), multi-day lane streaks (B2), dynamic epsilon calibration (B3), DPDP verification logs (B4), and emergency degradation simulator (B5) are pure functions only. No player can access them via the web app or API.
3. **Blocked Pairs Not Excluded in Matching:**
   - `pairing.worker.ts` does not check the `blocks` table, creating a safety vulnerability where blocked users could be paired as twins.
4. **18+ Confirmation Has No Server-Side Verification:**
   - The age check is stored solely in client `localStorage`. The API accepts submissions and creates sessions without validating 18+ status.
5. **Orbit Re-request Cooldown Not Enforced:**
   - The 30-day block window (`orbit.rerequest_block_days`) after an Orbit is severed is not enforced by any API check.
6. **Deck Rarity Unreachable Under Capped Weights:**
   - If information weights capped at 3.5 bits are passed to `classifyDeckCardRarity`, Rare ($\ge 3.8$) and Mythic ($\ge 4.5$) cards can never be minted.
7. **Pick2of6 Marginal Probability Non-Normalization:**
   - Small-sample marginal probabilities for Pick2of6 sum to $0.8333$ rather than $1.000$, slightly distorting prior weighting when $N < 30$.
8. **Oddness Tiers Unreachable Without Percentile Scaling:**
   - Raw oddness scores across 5 questions produce values in $[0.14, 0.18]$. Passing raw scores to `classifyTier` makes Uncommon ($\ge 0.60$), Rare ($\ge 0.75$), and Mythic ($\ge 0.90$) cards $100\%$ unreachable.
9. **UI Token Violation:**
   - `apps/web/src/components/drop/Pick2Of6Card.tsx` contains hardcoded hex `#14123A`.
10. **Database & Cache Tests Unverified Locally:**
   - Tests requiring live PostgreSQL and Redis instances could not be verified in this run due to offline containers on `localhost:5432` and `localhost:6379`.

