# Stage B0: Preflight Audit & Baseline

**Date:** 2026-11-24  
**Branch:** `stage-B0-build`  
**Base Commit:** `a3b7b8f` (main)

---

## 1. Baseline & CI Verification (Section 3.1)

- **Branches & Tags Audit:**
  - Code line and docs line are unified on `main` at commit `a3b7b8f` (`feat(memes): complete Phase 10O Memes Lane Launch (Stage L4)`).
  - Tag `stage-L0-fix3-complete` is an ancestor of `HEAD` (`git merge-base --is-ancestor stage-L0-fix3-complete HEAD` exited with code 0).
  - All recent docs stages (`stage-L0-lanes-docs`, `stage-L0-fix-docs`, `stage-L0-fix2-docs`, `stage-L0-fix3-complete`) are already fully merged.
- **CI Configuration & pnpm Pinned Version:**
  - `pnpm` is pinned to `9.15.4` in root `package.json` (`packageManager: "pnpm@9.15.4"`).
  - `.npmrc` is empty; no invalid string `only-built-dependencies` present.
  - Root `package.json` has `"pnpm": { "onlyBuiltDependencies": ["esbuild", "msgpackr-extract", "prisma", "@prisma/client", "@prisma/engines"] }` as a proper array.
  - `pnpm-workspace.yaml` contains no pnpm 10 `allowBuilds` map.
  - CI workflow `.github/workflows/ci.yml` runs with `pnpm/action-setup@v4` with `run_install: false` and Node 20 LTS caching.

---

## 2. Schema Audit (Section 3.2)

Audit performed against `packages/shared/prisma/schema.prisma` (57 total models):

| Entity / Concept | Model Name | Real Table Name | Primary Key / ID Type | `lane_id` Present? | Notes |
|---|---|---|---|---|---|
| Player | `Player` | `players` | `id String @id @default(uuid())` (UUID) | No (device/account) | Table is `players`, not `users`. |
| Drop | `Drop` | `drops` | `id String @id @default(uuid())` (UUID) | Yes (`lane_id String?`) | `@@unique([lane_id, drop_date])` composite constraint active. |
| Question | `Question` | `questions` | `id String @id @default(uuid())` (UUID) | Yes (`lane_id String?`) | Has `format QuestionFormat @default(pick1)` and `render_variant String?`. |
| Submission | `Submission` | `submissions` | `id String @default(uuid())` (UUID) | Yes (`lane_id String?`) | Partitioned table on `(id, drop_date)`. |
| Twin Result / Match | `Match` | `matches` | `id String @default(uuid())` (UUID) | Yes (`lane_id String?`) | Has `tie_group_size`, `is_mutual`, `tie_break_reason`, `questions_compared`, `history_days`. `twin_results` view exists. |
| Lane | `Lane` | `lanes` | `id String @id @default(uuid())` (UUID) | N/A | Has `slug`, `name`, `status`, `accent`, `icon_key`, `min_pool_size`, `daily_drop_time_utc`. |
| Lane Interest | `LaneInterest` | `lane_interest` | `id String @id @default(uuid())` (UUID) | Yes (`lane_id String`) | Aggregated "Tell me when it opens" counts. |
| Player Lane Pref | `PlayerLanePref` | `player_lane_prefs`| `id String @id @default(uuid())` (UUID) | Yes (`lane_id String`) | User preferences per lane. |
| Lane History Sig | `LaneHistorySignature` | `lane_history_signatures` | `id String @id @default(uuid())` (UUID) | Yes (`lane_id String`) | 32-byte `BYTEA` BitMinHash signature. |
| Twin Keep | `TwinKeep` | `twin_keeps` | `id String @default(uuid())` (UUID) | Yes (`lane_id String?`) | Partitioned table on `(id, drop_date)`. |
| Orbit | `Orbit` | `orbits` | `id String @id @default(uuid())` (UUID) | Yes (`lane_id String?`) | Status `active|ended`. `@@index([lane_id])`. |
| Orbit Expression | `OrbitExpression` | `orbit_expressions` | `id String @default(uuid())` (UUID) | Yes (`lane_id String?`) | Sticker expressions. |
| Telepathy Guess | `TelepathyGuess` | `telepathy_guesses` | `id String @default(uuid())` (UUID) | Yes (`lane_id String?`) | Low-cardinality question guess. |
| Anti-Twin Result | `AntiTwinResult` | `anti_twin_results` | `@@id([drop_date, player_id])` | Yes (`lane_id String?`) | Opposite player result. |
| Consents | `Consent` | `consents` | `id String @id @default(uuid())` (UUID) | No | DPDP consent storage. |
| Event Raw | `EventRaw` | `events_raw` | `id String @default(uuid())` (UUID) | No | Consent-gated telemetry. |
| Report | `Report` | `reports` | `id String @id @default(uuid())` (UUID) | No | Content & safety moderation reports. |
| App Config | `AppConfig` | `app_config` | `id String @id @default(uuid())` (UUID) | No | Dynamic key-value configuration. |
| App Content | `AppContent` | `app_content` | `id String @id @default(uuid())` (UUID) | No | Dynamic strings and copy. |
| Badges | `BadgeDefinition` | `badge_definitions` | `id String @id` (TEXT) | No | M6 Creator badges. |

### Schema Conclusion
All IDs are UUID strings (`String @default(uuid())`). The player entity is `players`. All relational entities (`drops`, `questions`, `submissions`, `matches`, `twin_keeps`, `orbits`, `telepathy_guesses`, `anti_twin_results`) natively include `lane_id`. No destructive migrations are needed; any new tables (`blocks`, `globe_arcs`, `orbit_trials`, `bonus_rounds`, `collector_badges`) will be created expand-only.

---

## 3. Measurements Before Design (Section 3.3)

- **Frontend Bundle Size Guard (`scripts/check-bundle-budget.mjs`):**
  - **Initial Play Route JS:** 152.5 KB compressed (gzip).
  - **Target:** 150.0 KB | **Approved Exception Ceiling:** 159.5 KB (PASSED, 7.0 KB headroom).
  - **First Load All Bundles:** 366.3 KB compressed (Budget: 500 KB, PASSED, 133.7 KB headroom).
- **Design Tokens Verification (`packages/ui-tokens` vs `design.md`):**
  - Desk cream: `#FFF8F0` (matches `design.md`)
  - Ink: `#14123A` (matches `design.md`)
  - Paper: `#FFFFFF` (matches `design.md`)
  - Violet: `#6C4CF1` (matches `design.md`)
  - Mint: `#3DDBB0` (matches `design.md`)
  - Coral: `#FF6B5E` (matches `design.md`)
  - Sun: `#FFD23F` (matches `design.md`)
  - Lavender: `#EEEAFE` (matches `design.md`)
  - Lilac: `#CDBFFF` (matches `design.md`)
  - Muted: `#5B5780` (matches `design.md`)
  - Error: `#D92D4B` (matches `design.md`)
  - Zero hex mismatches found.
- **Test Suite Status at Baseline:**
  - `@oddly/web`: 16/16 test files passed, 125/125 tests passed.
  - `@oddly/shared`: 229 unit tests passing across all algorithmic and pure-scoring suites.
  - Monorepo Typecheck: Clean pass (`tsc --noEmit` on `@oddly/shared`, `@oddly/api`, `@oddly/worker`, `@oddly/web` passed with 0 errors).
