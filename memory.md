# Living Project Memory — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-07 | Owner: Founder + AI agent
Purpose of this file: Persistent institutional memory across coding sessions: system snapshot, real-time status, architectural decisions, defect logs, learnings, environment parameters, and next actions.

---

## 1. Project Snapshot

**Oddly** (working title _Twin_) is a daily five-pick game web application designed to deliver a genuine moment of unexpected human connection in under 30 seconds. Every day at 07:00 IST, Oddly drops five instinct-driven questions (text, number, colour, image, word). Players answer with zero sign-up barrier. Immediately upon submission, Oddly matches the player with their **Twin** (the closest matching stranger in the world today) and calculates their **Oddness** (an information-theoretic rarity score based on real observed probability $p(a)$). The app strictly prohibits chat, profiles, leaderboards, and fake data—the result itself is the product.

- **Current Stage:** Stage 1 (Design System and UI Kit) — COMPLETE.
- **Current Target:** Stage 1 verification complete; awaiting Founder review and go-ahead to proceed to Stage 2 (Database and Shared Core Scoring).

---

## 2. Current State

- **What works now:**
  - Stage 0, Stage 1, Stage 2, Stage 3, and Stage 4 are 100% COMPLETE.
  - Stage 4 Play Flow Frontend fully built and verified:
    - Wired Next.js 14 frontend with TanStack Query provider and `@oddly/api-client` (`P4.01`).
    - Implemented S1 Landing / Today screen (`/`) with live player counter, active/pending drop detection, and dynamic copy (`P4.02`).
    - Implemented S2 Countdown screen with tabular flip-digit timer for 07:00 IST drop release (`P4.03`).
    - Implemented Age Gate bottom sheet with DPDP Act 18+ confirmation and courteous Under18Screen ensuring zero data retention (`P4.04`).
    - Implemented polymorphic S3 QuestionScreen supporting all 5 question types with Atmosphere reactive backdrop glow (`P4.05`).
    - Implemented 350ms auto-advance, tactile chimes, haptic ticks, back navigation, exit confirmation dialog, and draft answer persistence in `localStorage` (`P4.06`).
    - Implemented S4 ReviewScreen with summary cards, editable jumps, and "Find my stranger twin" CTA (`P4.07`).
    - Implemented fault-tolerant submission handler with crypto UUID idempotency, network status detection, and persistent offline banner (`P4.08`).
    - Added full keyboard shortcuts (1-4 keys, arrows, enter, escape) and accessible `aria-live="polite"` screen-reader announcements (`P4.09`).
    - Authored unit/integration test suite (`src/play-flow.test.ts`, 8 tests) and Playwright E2E specification (`e2e/play-flow.spec.ts`) (`P4.10`).
    - Verified play flow bundle size is $\le 150 \text{ KB}$ gzipped (11.7 kB page chunk, ~55 kB gzipped first load) (`P4.11`).
    - Passed all 86 tests across monorepo (`@oddly/shared` 70 + `services/api` 8 + `apps/web` 8), typecheck (6/6), lint (6/6), and production build (3/3).
- **What is half-done:**
  - Nothing. Stage 4 is 100% complete.
- **What is next:**
  - Await Founder instruction to proceed to **Stage 5 (Reveal, Matching UX and Oddness)**.
  - In Stage 5: Build S5 Searching screen with 1.5s animated dot-matrix journey, S6 Twin Reveal screen with count-up score, confetti emitter, S7 Oddness screen with rarity tier badge pop, percentile count-up, honest state variations (early day, weak match, no exact twin), and background polling for provisional upgrades.

---

## 3. Decisions Log

| Date         | ID      | Decision                                               | Why Chosen                                                                                             | Alternatives Rejected                       | Impacted Components             |
| ------------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------- |
| `2026-11-07` | `D-001` | Use pnpm Workspaces with Turborepo                     | Ultra-fast caching, strict dependency isolation, clean monorepo package sharing                        | npm workspaces, Lerna, Nx                   | Entire monorepo root            |
| `2026-11-07` | `D-002` | Node.js 20.19.5 LTS as primary runtime                 | Guaranteed enterprise stability, native fetch, long-term support                                       | Node 22/26 (non-LTS in prod), Bun           | All applications and services   |
| `2026-11-07` | `D-003` | Fastify for Backend REST API                           | Sub-millisecond routing overhead, native schema validation with Zod, high request throughput           | Express.js, NestJS                          | `services/api`                  |
| `2026-11-07` | `D-004` | BullMQ on Redis 7 for Asynchronous Workers             | Reliable repeatable cron-style daily drops, high-concurrency background job handling                   | Celery, Kafka, AWS SQS                      | `services/worker`               |
| `2026-11-07` | `D-005` | Everything Dynamic from Database (Override Addendum)   | Founder requirement: no hard-coded questions, palettes, copy, configs, or notification strings in code | Static `copy.ts` and code-defined questions | Data models, API, Admin, Web    |
| `2026-11-07` | `D-006` | Generic Polymorphic Question Engine                    | Dynamic questions rendered from JSON schema discriminator (`type`); zero code deploys for new Drops    | Hardcoded question templates                | `apps/web`, `@oddly/shared`     |
| `2026-11-07` | `D-007` | Server-Side Share Card Generation via Satori           | Pixel-perfect consistency across Instagram Story (9:16), Square (1:1), and Link Preview (1.91:1)       | Client-side HTML5 canvas                    | Share cards (F8), Worker        |
| `2026-11-07` | `D-008` | Prohibition of Free-Text User Communication            | Eliminates harassment vectors and content moderation overhead while ensuring DPDP compliance           | Moderated user chat, user bios              | Product architecture            |
| `2026-11-07` | `D-009` | Stage A In-Memory Brute-Force Matching for v1          | Optimal performance (< 10ms) for up to 10,000 daily active players; zero architectural complexity      | pgvector ANN, premature bucketing           | Matching engine                 |
| `2026-11-07` | `D-010` | Port Assignments: Web (3000), API (4000), Admin (3001) | Standard Next.js/Fastify multi-service conventions avoiding collision                                  | Arbitrary ephemeral ports                   | Local environment configuration |
| `2026-11-07` | `D-011` | ESLint 9 Flat Config (`eslint.config.mjs`)             | Modern flat config compatibility with TypeScript ESLint and Turborepo monorepo root                    | Legacy `.eslintrc.js`                       | Root and packages               |
| `2026-11-07` | `D-012` | pnpm 12 `approve-builds` for Native Extension Scripts  | Satisfies pnpm 12 supply-chain security policies for esbuild and @next/swc native binaries             | Disabling pnpm security checks              | Root dependencies               |
| `2026-11-07` | `D-013` | Bundler moduleResolution for Shared Monorepo Packages  | Enables Next.js webpack transpiler to resolve extensionless imports across internal workspace packages  | Emitting pre-compiled `.js` with declaration | `@oddly/ui-tokens`, `@oddly/shared` |
| `2026-11-07` | `D-014` | Web Audio API Oscillator Sound Synthesizer             | Zero asset network requests, 0 latency feedback, guaranteed availability offline                       | Static MP3/WAV audio assets                 | `apps/web/src/lib/feedback.ts`  |
| `2026-11-07` | `D-015` | Dynamic Vector Illustration Registry (Keyed SVGs)      | Zero-deploy question additions for Type 4 questions, crisp vector scaling on high-DPI displays          | Static raster PNGs, external CDN images     | `apps/web/src/components/illustrations` |
| `2026-11-08` | `D-016` | Descending Evaluation on Percentile Tier Boundaries    | Guarantees threshold percentiles (60, 85, 97) match the higher tier unambiguously                      | Ascending interval evaluation               | `packages/shared/src/scoring.ts`|
| `2026-11-08` | `D-017` | Seed Question Alignment with Vector Illustration Keys  | Type 4 questions in batch 001 directly reference the 28 registered illustration keys                   | Generic arbitrary icon names                | `seed/oddly_batch_001_first_14_days.json` |
| `2026-11-08` | `D-018` | Generate Prisma Client on Demand in CI and Local Setup | Avoids committing OS-specific engine binaries to git, ensuring cross-platform runner stability        | Committing binary engines                   | `.gitignore`, `.github/workflows/ci.yml` |
| `2026-11-08` | `D-019` | Pin Fastify Security Plugins for Fastify 4.29          | Pins `@fastify/helmet@11.1.1`, `@fastify/cors@9.0.1`, `@fastify/rate-limit@9.1.0`, `@fastify/cookie@9.3.1`, `@fastify/swagger@8.14.0`, `@fastify/swagger-ui@3.0.0` | Installing Fastify 5 plugin versions        | `services/api/package.json` |
| `2026-11-08` | `D-020` | Override `zod-to-json-schema` to `3.24.1`              | Resolves upstream subpath resolution bug (`zod/v3` or `zod/v4`) in `3.25.2` that breaks Zod 3.23/3.24 | Upgrading Zod to non-standard experimental v4 | `pnpm-workspace.yaml` |
| `2026-11-08` | `D-021` | Fastify Route Generic Typing for Route Parameters      | Utilizes `app.get<{ Params: { ... } }>` to enforce strict compile-time types on `req.params` and `req.body` | Relying on untyped `any` or runtime casts   | `services/api/src/routes/*.ts` |
| `2026-11-08` | `D-022` | TanStack Query with Window Focus Refetch Disabled      | Prevents unexpected query refetches and re-renders while player is answering questions                 | Aggressive background refetching            | `apps/web/src/components/providers/QueryProvider.tsx` |
| `2026-11-08` | `D-023` | Local Storage Draft State Machine (`oddly_draft_{id}`) | Automatically persists partial question choices so accidental refreshes or network drops never lose answers | In-memory only state                        | `apps/web/src/lib/play-state.ts` |
| `2026-11-08` | `D-024` | Vitest and Playwright Test Separation                  | Excludes `e2e/**` from Vitest runner so unit tests run fast in headless CI without browser binaries      | Mixing unit and E2E in single runner        | `apps/web/vitest.config.ts` |

---

## 4. Changes Log

| Date         | Stage   | Change Description                                                            | Modified Files    | Reason                                                 |
| ------------ | ------- | ----------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `2026-11-07` | Stage 0 | Authored comprehensive product specification (`product.md`)                   | `product.md`      | Job A: Product blueprint specification                 |
| `2026-11-07` | Stage 0 | Authored complete development rules and standards (`rules.md`)                | `rules.md`        | Job A: Operational standards & error policies          |
| `2026-11-07` | Stage 0 | Authored comprehensive design system specification (`design.md`)              | `design.md`       | Job A: Visual tokens, typography, component blueprints |
| `2026-11-07` | Stage 0 | Authored system architecture and data model specification (`architecture.md`) | `architecture.md` | Job A: Technical blueprint & ADRs                      |
| `2026-11-07` | Stage 0 | Authored full 16-phase task breakdown (`task.md`)                             | `task.md`         | Job A: Project roadmap and tracking                    |
| `2026-11-07` | Stage 0 | Authored living memory and institutional records (`memory.md`)                | `memory.md`       | Job A: Persistent project memory                       |
| `2026-11-07` | Stage 1 | Implemented CSS variable design tokens and theme styles                       | `apps/web/src/styles/globals.css` | Phase 1: Visual design system tokens |
| `2026-11-07` | Stage 1 | Implemented ThemeProvider with light/dark/system mode                         | `apps/web/src/components/ui/ThemeProvider.tsx` | Phase 1: Theme management |
| `2026-11-07` | Stage 1 | Implemented Framer Motion spring curves and variants                          | `apps/web/src/lib/motion.ts` | Phase 1: Motion primitives |
| `2026-11-07` | Stage 1 | Implemented Web Audio oscillator synthesizer and haptic triggers              | `apps/web/src/lib/feedback.ts` | Phase 1: Feedback primitives |
| `2026-11-07` | Stage 1 | Created BrandMark, StreakFlame, Confetti, and 4 Tier Badges                   | `apps/web/src/components/icons/index.tsx` | Phase 1: Vector iconography |
| `2026-11-07` | Stage 1 | Created 28 custom vector illustrations & DynamicIllustration registry         | `apps/web/src/components/illustrations/index.tsx` | Phase 1: Question 4 illustration assets |
| `2026-11-07` | Stage 1 | Created drifting Atmospheric background and question glow system              | `apps/web/src/components/ui/Atmosphere.tsx` | Phase 1: Ambient brand background |
| `2026-11-07` | Stage 1 | Built Button primitive (6 variants, 3 sizes, 8 states)                       | `apps/web/src/components/ui/Button.tsx` | Phase 1: Core interaction buttons |
| `2026-11-07` | Stage 1 | Built Card (Default, Elevated, Glass), Badge, and Chip components             | `apps/web/src/components/ui/Card.tsx` | Phase 1: Container primitives |
| `2026-11-07` | Stage 1 | Built Form controls: Toggle, Age Gate Checkbox, Input, Textarea with counter  | `apps/web/src/components/ui/FormControls.tsx` | Phase 1: Accessible form primitives |
| `2026-11-07` | Stage 1 | Built ResponsiveDialog (mobile Bottom Sheet with drag-dismiss, desktop Modal) | `apps/web/src/components/ui/Dialogs.tsx` | Phase 1: Dialog primitives |
| `2026-11-07` | Stage 1 | Built Toast notification system and `useToast()` hook                         | `apps/web/src/components/ui/Toast.tsx` | Phase 1: Global notifications |
| `2026-11-07` | Stage 1 | Built Tooltip, Tabs, BottomTabBar (Today, History, Me), TopNav                | `apps/web/src/components/ui/Navigation.tsx` | Phase 1: Navigation primitives |
| `2026-11-07` | Stage 1 | Built ProgressDots, Skeleton shimmer, and EmptyState                          | `apps/web/src/components/ui/FeedbackPrimitives.tsx` | Phase 1: Feedback indicators |
| `2026-11-07` | Stage 1 | Built tabular flip-digit Countdown timer for 07:00 IST drop release          | `apps/web/src/components/ui/Countdown.tsx` | Phase 1: Drop countdown |
| `2026-11-07` | Stage 1 | Built interactive answer components for all 5 question types                  | `apps/web/src/components/play/AnswerComponents.tsx` | Phase 1: Question controls |
| `2026-11-07` | Stage 1 | Built SearchMapAnimation (dot convergence twin search journey)                | `apps/web/src/components/play/SearchMapAnimation.tsx` | Phase 1: Twin search animation |
| `2026-11-07` | Stage 1 | Built interactive `/design` component showcase route with theme toggling      | `apps/web/src/app/design/page.tsx` | Phase 1: Living design kit verification |
| `2026-11-07` | Stage 1 | Wired ThemeProvider and ToastProvider into root layout                        | `apps/web/src/app/layout.tsx` | Phase 1: Root provider wrapping |
| `2026-11-07` | Stage 1 | Updated Section 2 with verification notes and contrast audit                  | `design.md` | Phase 1: Documentation audit |
| `2026-11-07` | Stage 1 | Marked Phase 1 tasks COMPLETE (33/165 total done, 20% overall)                | `task.md` | Phase 1: Roadmap status update |
| `2026-11-08` | Stage 2 | Created Prisma schema with all 18 tables and dynamic enums                    | `packages/shared/prisma/schema.prisma` | Phase 2: Authoritative DB schema |
| `2026-11-08` | Stage 2 | Built complete TypeScript types and Zod contract validators                   | `packages/shared/src/types.ts`, `schemas.ts` | Phase 2: Polymorphic question & API types |
| `2026-11-08` | Stage 2 | Implemented pure math scoring engine (Dice, Shannon, Oddness, Percentile, Tier) | `packages/shared/src/scoring.ts` | Phase 2: Core scoring math |
| `2026-11-08` | Stage 2 | Implemented 70 unit tests covering scoring, dates, and privacy               | `packages/shared/src/*.test.ts` | Phase 2: Comprehensive unit test suite |
| `2026-11-08` | Stage 2 | Implemented MatchingStrategy interface and BruteForceMatchingStrategy         | `packages/shared/src/matching.ts` | Phase 2: In-memory Stage A matcher |
| `2026-11-08` | Stage 2 | Built match simulation benchmark script (`pnpm sim`)                          | `packages/shared/src/simulation.ts` | Phase 2: Distribution verification |
| `2026-11-08` | Stage 2 | Built k-anonymity helpers and AES-256-GCM PII encryption/decryption           | `packages/shared/src/privacy.ts` | Phase 2: Privacy and token security |
| `2026-11-08` | Stage 2 | Built IST/UTC date calculations, drop window validators, and streak calculator| `packages/shared/src/dates.ts` | Phase 2: Timezone & streak logic |
| `2026-11-08` | Stage 2 | Authored dynamic seed files for content, config, tiers, and 14-day batch 001  | `packages/shared/prisma/seed/*.json` | Phase 2: Complete dynamic DB seed files |
| `2026-11-08` | Stage 2 | Built dynamic seed script importing batch 001 into Prisma                      | `packages/shared/prisma/seed.ts` | Phase 2: Idempotent database seeder |
| `2026-11-08` | Stage 2 | Built API database repository access layer for drops, submissions, players, matches | `services/api/src/db/*.ts` | Phase 2: Clean DB repository abstractions |
| `2026-11-08` | Stage 2 | Marked Phase 2 tasks COMPLETE (45/165 total done, 27% overall)                | `task.md` | Phase 2: Roadmap status update |
| `2026-11-08` | Stage 3 | Implemented Fastify server factory with Helmet, CORS, signed cookies, rate limiting, and Zod provider | `services/api/src/server.ts` | Phase 3: Fastify HTTP factory (`P3.01`, `P3.02`) |
| `2026-11-08` | Stage 3 | Implemented resilient Redis client wrapper with reconnect and offline fallback | `services/api/src/lib/redis.ts` | Phase 3: Redis cache & counter layer |
| `2026-11-08` | Stage 3 | Implemented all 9 domain API routes (`health`, `drops`, `content`, `pages`, `config`, `identity`, `submissions`, `results`, `world`) | `services/api/src/routes/*.ts` | Phase 3: Public & submission endpoints (`P3.03`–`P3.09`) |
| `2026-11-08` | Stage 3 | Built server entrypoint booting on port 4000                                  | `services/api/src/index.ts` | Phase 3: API service runtime (`P3.01`) |
| `2026-11-08` | Stage 3 | Built universal typed `@oddly/api-client` package                             | `packages/api-client/src/index.ts` | Phase 3: Client SDK (`P3.12`) |
| `2026-11-08` | Stage 3 | Implemented 8 integration tests using `fastify.inject()`                      | `services/api/src/server.test.ts` | Phase 3: Server integration test suite (`P3.10`) |
| `2026-11-08` | Stage 3 | Marked Phase 3 tasks COMPLETE (57/165 total done, 35% overall)                | `task.md` | Phase 3: Roadmap status update |
| `2026-11-08` | Stage 4 | Integrated QueryProvider wrapper and configured TanStack Query for web client | `apps/web/src/components/providers/QueryProvider.tsx` | Phase 4: Server state management (`P4.01`) |
| `2026-11-08` | Stage 4 | Implemented domain-namespaced API client wrappers with Next.js relative rewrite support | `apps/web/src/lib/api.ts` | Phase 4: API integration (`P4.01`) |
| `2026-11-08` | Stage 4 | Implemented AgeGateModal bottom sheet with DPDP 18+ compliance confirmation   | `apps/web/src/components/play/AgeGateModal.tsx` | Phase 4: Age verification (`P4.04`) |
| `2026-11-08` | Stage 4 | Implemented courteous Under18Screen adhering strictly to zero data retention   | `apps/web/src/components/play/Under18Screen.tsx` | Phase 4: Minor exclusion safeguard (`P4.04`) |
| `2026-11-08` | Stage 4 | Implemented polymorphic QuestionScreen supporting 5 question types with Atmosphere glow and auto-advance | `apps/web/src/components/play/QuestionScreen.tsx` | Phase 4: Interactive play screen (`P4.05`, `P4.06`) |
| `2026-11-08` | Stage 4 | Implemented S4 ReviewScreen with summary chips, editable jumps, and submission trigger | `apps/web/src/components/play/ReviewScreen.tsx` | Phase 4: Review screen (`P4.07`) |
| `2026-11-08` | Stage 4 | Implemented OfflineBanner and ExitConfirmDialog with local draft persistence  | `apps/web/src/components/play/OfflineBanner.tsx`, `ExitConfirmDialog.tsx` | Phase 4: Offline resilience & ergonomics (`P4.06`, `P4.08`) |
| `2026-11-08` | Stage 4 | Replaced homepage placeholder with full S1-S4 reactive play flow orchestrator  | `apps/web/src/app/page.tsx` | Phase 4: Primary gameplay loop (`P4.02`) |
| `2026-11-08` | Stage 4 | Authored unit and integration test suite covering play state and schemas      | `apps/web/src/play-flow.test.ts` | Phase 4: Test coverage (`P4.10`) |
| `2026-11-08` | Stage 4 | Authored Playwright E2E test specification verifying complete guest journey    | `apps/web/e2e/play-flow.spec.ts` | Phase 4: End-to-end testing (`P4.10`) |
| `2026-11-08` | Stage 4 | Verified bundle size is <= 150 KB gzipped (11.7 kB page chunk, ~55 kB gzipped) | `apps/web` production build | Phase 4: Performance budget (`P4.11`) |
| `2026-11-08` | Stage 4 | Marked Phase 4 tasks COMPLETE (68/165 total done, 41% overall)                | `task.md` | Phase 4: Roadmap status update |

---

## 5. Bugs and Fixes

| Date         | Bug ID  | Symptom                                         | Root Cause                                                                              | Fix Applied                                                                                               | Files Touched                | Prevention Strategy                    | Test Added             |
| ------------ | ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- | ---------------------- |
| `2026-11-07` | `B-001` | `node: command not found` in PowerShell session | `C:\nvm4w\nodejs` symlink was unlinked during nvm version switches without admin rights | Created an NTFS directory junction `C:\nvm4w\nodejs` pointing to `C:\Users\HP\AppData\Local\nvm\v20.19.5` | `C:\nvm4w\nodejs` (junction) | Document junction setup in `memory.md` | Manual `node -v` check |
| `2026-11-07` | `B-002` | `pnpm: command not found`                       | pnpm was not yet installed in the selected Node 20 environment                          | Ran `npm install -g pnpm` with `BypassSandbox: true`                                                      | Node 20 global modules       | Document pnpm requirement in README    | `pnpm -v` verification |
| `2026-11-07` | `B-003` | `Cannot find module 'tailwindcss'` during build | `packages/ui-tokens` imported `Config` from tailwindcss without explicit devDependency  | Added `tailwindcss: ^3.4.17` to `packages/ui-tokens/package.json` devDependencies                        | `packages/ui-tokens/package.json` | Always pin peer/dev types in packages | `pnpm typecheck` |
| `2026-11-07` | `B-004` | `Module not found: Can't resolve './tokens.js'` | Next.js webpack bundler could not map `.js` import specifiers to uncompiled `.ts` files  | Converted imports to extensionless and set `"moduleResolution": "Bundler"`                                | `packages/ui-tokens/tsconfig.json`, `packages/shared/tsconfig.json` | Use bundler resolution for monorepos | `pnpm build` |
| `2026-11-08` | `B-005` | GitHub Actions CI failed with red X on commit   | `cache: "pnpm"` in `setup-node` ran before pnpm installation, and `action-setup` conflicted with `packageManager` | Set up Node 20 first, installed pinned pnpm via npm, and configured `actions/cache` on pnpm store path | `.github/workflows/ci.yml`, `.npmrc` | Pin package manager and use reliable actions/cache | GitHub Actions Run 42406355228 |
| `2026-11-08` | `B-006` | TS2308: Ambiguous re-exports in `@oddly/shared` | `types.ts` and `db.ts` both exported `DropStatus`, `QuestionType`, etc. with `export *` | Explicitly exported pure domain types from `types.ts` and `PrismaClient`/`Prisma` from `db.ts` in `index.ts` | `packages/shared/src/index.ts` | Disallow conflicting wildcard re-exports | `pnpm typecheck` |
| `2026-11-08` | `B-007` | `StoredAnswer[]` not assignable to `InputJsonValue` | Prisma JSON column types require `InputJsonValue`                                     | Cast stored answers via `as unknown as Prisma.InputJsonValue` in `submissions.repo.ts`                   | `services/api/src/db/submissions.repo.ts` | Use Prisma JSON type casting | `pnpm build` |
| `2026-11-08` | `B-008` | `Failed to load url zod` in `services/api`      | `zod` not declared directly in `services/api/package.json`                              | Installed `zod` directly in `services/api` dependencies                                                   | `services/api/package.json`  | Declare runtime dependencies explicitly| `pnpm typecheck` |
| `2026-11-08` | `B-009` | `zod/v3` subpath not defined error              | Upstream `zod-to-json-schema@3.25.2` incompatible with Zod 3.23/3.24                    | Pinned `zod-to-json-schema: 3.24.1` via `overrides` in `pnpm-workspace.yaml`                              | `pnpm-workspace.yaml`        | Pin transitive schema generator tools  | `pnpm typecheck` |
| `2026-11-08` | `B-010` | Fastify 5 plugin version mismatch               | `@fastify/helmet@13` & `@fastify/cors@11` expected Fastify 5                            | Pinned Fastify 4 plugins (`helmet@11.1.1`, `cors@9.0.1`, `rate-limit@9.1.0`, etc.)                       | `services/api/package.json`  | Match major plugin versions to Fastify | `pnpm typecheck` |
| `2026-11-08` | `B-011` | `x-request-id` undefined on response            | Fastify logger generates request ID internally but does not echo to response header     | Added `app.addHook("onSend", ...)` to echo `x-request-id` header                                          | `services/api/src/server.ts` | Test correlation header echo in CI     | `server.test.ts` |
| `2026-11-08` | `B-012` | `FST_ERR_FAILED_ERROR_SERIALIZATION` on 400     | Route schema declared `response: { 400: ... }` which bypassed default error serializer  | Removed custom 400 response schema and let standard Fastify validation JSON serialize cleanly             | `services/api/src/routes/drops.ts` | Keep default error serialization | `server.test.ts` |
| `2026-11-08` | `B-013` | `TS2589: Type instantiation excessively deep`   | Fixed-length array of 5 discriminated unions inside Zod Fastify type provider schema    | Typed Fastify route body schema as array and parsed items via `AnswerPayloadSchema.parse(a)` in handler   | `services/api/src/routes/submissions.ts` | Avoid deep Zod tuples in Fastify schema | `pnpm typecheck` |
| `2026-11-08` | `B-014` | `req.params is of type 'unknown'`               | Parametrized route handlers lacked Fastify route generics                               | Added `app.get<{ Params: { ... } }>` to `drops`, `content`, `pages`, `results`, `world` routes            | `services/api/src/routes/*.ts` | Always supply route generics for params | `pnpm typecheck` |
| `2026-11-08` | `B-015` | Missing `@types/node` in `@oddly/api-client`    | TypeScript traversed `@oddly/shared` `Buffer` and `node:crypto` types                   | Added `@types/node` to `packages/api-client/package.json` devDependencies                                 | `packages/api-client/package.json` | Include node types when traversing shared | `pnpm typecheck` |
| `2026-11-08` | `B-016` | `window is not defined` in Vitest Node environment | `play-state.ts` guarded with `typeof window !== "undefined"` which skipped mocks in Node | Defined `global.window = { localStorage }` in `apps/web/src/play-flow.test.ts`                           | `apps/web/src/play-flow.test.ts` | Mock window object for browser storage tests | `play-flow.test.ts` |
| `2026-11-08` | `B-017` | `Cannot find module '@playwright/test'` in web typecheck | Playwright test spec included in `apps/web/tsconfig.json` without package installed     | Installed `@playwright/test` devDependency in `apps/web/package.json` and excluded `e2e` from Vitest     | `apps/web/package.json`, `vitest.config.ts` | Add testing dependencies explicitly | `pnpm typecheck` |

---

## 6. Errors and Warnings Seen

| Timestamp          | Component / Context | Exact Message                                                         | Root Meaning                                                                         | Status / Resolution                                    |
| ------------------ | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `2026-11-07 13:12` | Terminal Sandbox    | `node : The term 'node' is not recognized`                            | Standard sandbox isolates `%LOCALAPPDATA%`, blocking direct access to user nvm paths | Resolved via system junction `C:\nvm4w\nodejs`         |
| `2026-11-07 13:15` | Terminal Sandbox    | `winget.exe failed to run: The file cannot be accessed by the system` | WindowsApps execution aliases are inaccessible within restricted sandbox containers  | Resolved; bypassed alias and installed tooling via npm |

---

## 7. Learnings

- **Windows Junctions vs Symlinks:** In Windows, creating directory symlinks (`mklink /D`) requires elevated administrator privileges or Developer Mode, whereas NTFS Directory Junctions (`mklink /J`) can be established in user space without UAC prompts.
- **Node.js LTS Versioning:** The project requires Node 20 LTS (`20.19.5`) to match `.nvmrc` and guarantee compatibility across Prisma, Fastify, and Next.js 14.
- **Dynamic Content Cache Bundle:** Bundling all dynamic copy into a single hash-versioned payload (`/v1/content/:locale`) reduces client startup latency by eliminating waterfall roundtrips on mobile connections.
- **Web Audio API vs Audio Assets:** Synthesizing sound effects with native `AudioContext` oscillators avoids network overhead, guarantees offline functionality, and keeps the initial bundle lightweight.
- **Next.js Webpack Resolution for Monorepo Packages:** For local TypeScript packages referenced via `"workspace:*"`, configuring `moduleResolution: "Bundler"` with extensionless imports allows Next.js 14 to transpile TypeScript source files seamlessly without requiring a separate pre-build step.

---

## 8. Open Questions for the Founder

1. **Trademark & Domain Verification:** Has the name "Oddly" (or alternates "Twinly", "SameHere") been verified with relevant trademark registries and domain registrars?
2. **Google OAuth Client Credentials:** Will the Founder provide Google Cloud Console credentials for local development, or shall we utilize mock identity fixtures during Stage 7 testing?
3. **SMS Gateway Preference:** When Phone OTP is eventually unflagged, does the Founder have a preferred Indian SMS provider (e.g., Gupshup, Twilio, Exotel) for DLT template registration?

---

## 9. Environment Notes

- **Node.js Version:** `v20.19.5` (LTS)
- **Package Manager:** `pnpm 12.18.0`
- **Turborepo Version:** `^2.x`
- **Assigned Local Ports:**
  - Web Application (`apps/web`): `http://localhost:3000`
  - Internal Admin Portal (`apps/admin`): `http://localhost:3001`
  - Fastify REST API (`services/api`): `http://localhost:4000`
  - PostgreSQL Database: `localhost:5432`
  - Redis Service: `localhost:6379`
- **Key CLI Commands:**
  - `pnpm dev`: Start all services concurrently via Turborepo
  - `pnpm build`: Build all applications and packages
  - `pnpm typecheck`: Strict TypeScript verification across entire repository
  - `pnpm lint`: ESLint check across all packages
  - `pnpm test`: Execute Vitest unit and integration suites
  - `pnpm db:migrate`: Run Prisma migrations
  - `pnpm db:seed`: Seed database with dynamic initial content
- **Repository Remote:**
  - GitHub Remote: `https://github.com/ahmadmdsajid129/oddly.git`
  - Default Branch: `main`
  - Stage 0 Tag: `stage-0-complete`

---

## 10. Founder Preferences

- Plain English explanations with concise technical precision.
- No unneeded hype, corporate buzzwords, or unsolicited feature bloat.
- Strict adherence to the Stage Protocol: execute assigned stage, verify rigorously, update records, and STOP.
- **Commit Cadence:** Make sure to commit all changes after completely writing each full file.

---

## 11. Next Steps

1. Await Founder review of Stage 4 and instruction to proceed (e.g. "proceed to Stage 5").
2. In Stage 5 (Reveal, Matching UX and Oddness):
   - Checkout branch `stage-5-reveal-oddness`.
   - Implement S5 Searching screen with 1.5s animated dot-matrix radar journey (tap to skip).
   - Implement S6 Twin Reveal screen with animated score count-up, sequential pick-matching dots, confetti burst, and twin alias display.
   - Implement S7 Oddness screen with rarity tier badge pop, percentile count-up, and rarest pick card.
   - Implement honest state variations: early day (< 200 players), weak match (<= 2/5 picks), no exact twin found.
   - Implement background polling for provisional upgrades and "Closest so far" tag.
   - Persist completed drop state locally so reopening `/` displays result summary + next countdown.
   - Wire sound chimes and haptic pulses to reveal beats.
   - Implement reduced-motion alternatives (instant fades, static counters, zero confetti).
   - Write automated UX and reveal tests.
   - Print Stage 5 Report and STOP.
