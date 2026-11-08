# Phase and Task Breakdown — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-08 | Owner: Founder + AI agent
Purpose of this file: Authoritative project roadmap, task tracking, progress bars, phase dependencies, and verification criteria across all 16 stages (Stage 0 to Stage 15).

---

## 1. Master Progress Dashboard

| Metric                          | Current Value                                             |
| ------------------------------- | --------------------------------------------------------- |
| **Overall Project Progress**    | `[██████░░░░░░░░░░░░░░] 35%`                              |
| **Current Active Stage**        | **Stage 3 Complete (Awaiting Founder review for Stage 4)**|
| **Total Tasks Tracked**         | 165 tasks                                                 |
| **Completed Tasks (`DONE`)**    | 57 tasks                                                  |
| **In Progress (`IN PROGRESS`)** | 0 tasks                                                   |
| **Blocked (`BLOCKED`)**         | 0 tasks                                                   |
| **Pending (`TODO`)**            | 108 tasks                                                 |

---

## 2. Phase Overview Table

| Phase        | Phase Name                              | Priority | Status    | Progress Bar      | Tasks (Done/Total) | Stage That Builds It |
| ------------ | --------------------------------------- | -------- | --------- | ----------------- | ------------------ | -------------------- |
| **Phase 0**  | Documentation & Skeleton Initialisation | Critical | COMPLETE  | `[##########] 100%`| 14 / 14            | Stage 0              |
| **Phase 1**  | Design System & UI Kit                  | High     | COMPLETE  | `[##########] 100%`| 19 / 19            | Stage 1              |
| **Phase 2**  | Database & Shared Core Scoring          | Critical | COMPLETE  | `[##########] 100%`| 12 / 12            | Stage 2              |
| **Phase 3**  | Fastify REST API Core                   | Critical | COMPLETE  | `[##########] 100%`| 12 / 12            | Stage 3              |
| **Phase 4**  | Play Flow Frontend (PWA)                | Critical | TODO      | `[----------] 0%` | 0 / 11             | Stage 4              |
| **Phase 5**  | Reveal, Matching UX & Oddness           | High     | TODO        | `[----------] 0%` | 0 / 9              | Stage 5              |
| **Phase 6**  | Server-Rendered Share Cards & Links     | High     | TODO        | `[----------] 0%` | 0 / 10             | Stage 6              |
| **Phase 7**  | Authentication & Guest Merge            | High     | TODO        | `[----------] 0%` | 0 / 9              | Stage 7              |
| **Phase 8**  | Streaks, History, Settings & Privacy    | Medium   | TODO        | `[----------] 0%` | 0 / 10             | Stage 8              |
| **Phase 9**  | Daily Pipeline & BullMQ Scheduler       | Critical | TODO        | `[----------] 0%` | 0 / 11             | Stage 9              |
| **Phase 10** | Web Push Notifications & PWA Caching    | Medium   | TODO        | `[----------] 0%` | 0 / 10             | Stage 10             |
| **Phase 11** | Admin Question Tool & Dynamic Importer  | High     | TODO        | `[----------] 0%` | 0 / 10             | Stage 11             |
| **Phase 12** | Observability, Telemetry & Security     | High     | TODO        | `[----------] 0%` | 0 / 9              | Stage 12             |
| **Phase 13** | End-to-End QA, Load Tests & Audits      | Critical | TODO        | `[----------] 0%` | 0 / 10             | Stage 13             |
| **Phase 14** | Cloud Deployment & Infrastructure       | Critical | TODO        | `[----------] 0%` | 0 / 9              | Stage 14             |
| **Phase 15** | Beta Launch & Go/No-Go Decision Gates   | High     | TODO        | `[----------] 0%` | 0 / 5              | Stage 15             |

---

## 3. Detailed Phase Breakdown and Task Catalog

### Phase 0: Documentation and Initialisation (Stage 0)

_Status: COMPLETE | Target: Skeleton verified, zero features implemented._

| ID      | Task Description                                                                                                                   | Priority | Status | Depends On  | Owner | Done Date   | Notes                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ----------- | ----- | ----------- | ---------------------------------- |
| `[x] P0.01` | Create 6 core markdown files (`architecture.md`, `product.md`, `rules.md`, `design.md`, `task.md`, `memory.md`)                    | Critical | DONE   | None        | Agent | 2026-11-07  | Fully detailed, cross-consistent   |
| `[x] P0.02` | Git repo initialization, `.gitignore`, `.editorconfig`, `.nvmrc` (Node 20), `.prettierrc`, ESLint config, `tsconfig.base.json`     | High     | DONE   | P0.01       | Agent | 2026-11-07  | Standard base configs              |
| `[x] P0.03` | Configure pnpm workspace (`pnpm-workspace.yaml`), `turbo.json`, root `package.json` with dev, build, lint, typecheck, test scripts | Critical | DONE   | P0.02       | Agent | 2026-11-07  | Monorepo orchestration             |
| `[x] P0.04` | Scaffold `apps/web` (Next.js 14 App Router, Tailwind, brand fonts placeholder "oddly — coming soon")                               | High     | DONE   | P0.03       | Agent | 2026-11-07  | Proves design tokens work          |
| `[x] P0.05` | Scaffold `services/api` (Fastify + TypeScript) with single `GET /health` route returning `{ ok: true, service: "api" }`            | High     | DONE   | P0.03       | Agent | 2026-11-07  | Strict type providers              |
| `[x] P0.06` | Scaffold `services/worker` (BullMQ + TypeScript) that boots, connects to Redis, logs "worker ready", and idles                     | Medium   | DONE   | P0.03       | Agent | 2026-11-07  | Background queue worker skeleton   |
| `[x] P0.07` | Scaffold `packages/shared`, `packages/ui-tokens`, and `packages/api-client` with typed exports                                     | High     | DONE   | P0.03       | Agent | 2026-11-07  | Internal monorepo library packages |
| `[x] P0.08` | Create `infra/docker-compose.yml` (PostgreSQL 16, Redis 7) and `infra/README.md`                                                   | Medium   | DONE   | P0.03       | Agent | 2026-11-07  | Local development services         |
| `[x] P0.09` | Create comprehensive `.env.example` at root, `apps/web`, `services/api`, `services/worker`                                         | High     | DONE   | P0.03       | Agent | 2026-11-07  | Every variable commented           |
| `[x] P0.10` | Set up Husky, lint-staged, and commitlint (Conventional Commits)                                                                   | Low      | DONE   | P0.02       | Agent | 2026-11-07  | Enforce git discipline             |
| `[x] P0.11` | Set up GitHub Actions CI workflow skeleton (`lint`, `typecheck`, `test`, `build`)                                                  | Medium   | DONE   | P0.03       | Agent | 2026-11-07  | Continuous integration             |
| `[x] P0.12` | Write root `README.md` (quick start, architecture overview, running commands)                                                      | High     | DONE   | P0.01       | Agent | 2026-11-07  | Project documentation              |
| `[x] P0.13` | Verify `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm dev` run cleanly                                      | Critical | DONE   | P0.04-P0.07 | Agent | 2026-11-07  | Verify all tooling                 |
| `[x] P0.14` | Stage 0 Report output and execution stop                                                                                           | Critical | DONE   | P0.13       | Agent | 2026-11-07  | Stop and wait for Founder go-ahead |

---

### Phase 1: Design System and UI Kit (Stage 1)

_Status: COMPLETE | Target: Visual kit verified on `/design` route in light and dark mode._

| ID          | Task Description                                                                                                | Priority | Status | Depends On   | Owner | Done Date   | Notes                              |
| ----------- | --------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | ----------- | ---------------------------------- |
| `[x] P1.01` | Implement CSS variable design tokens and Tailwind preset in `packages/ui-tokens`                                | High     | DONE   | P0.07        | Agent | 2026-11-07  | Color, spacing, radius tokens      |
| `[x] P1.02` | Self-host Space Grotesk and Inter fonts via `next/font` in `apps/web`                                           | High     | DONE   | P1.01        | Agent | 2026-11-07  | Zero external font CDN calls       |
| `[x] P1.03` | Build theme provider with system preference detection and manual light/dark toggle                              | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Persisted in cookie/localStorage   |
| `[x] P1.04` | Implement atmospheric hero backgrounds (drifting circles, star dots, question glows)                            | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Animated and reduce-motion modes   |
| `[x] P1.05` | Build core button primitives (Primary, Secondary, Ghost, Destructive, Icon, Close X)                            | High     | DONE   | P1.01        | Agent | 2026-11-07  | All 8 interactive states           |
| `[x] P1.06` | Build container components: Card (Default, Elevated, Glass), Badge, Chip, Link                                  | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Accessible primitives              |
| `[x] P1.07` | Build form controls: Toggle (Radix Switch), Checkbox (Age Gate), Input, Textarea                                | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Form states and validation styling |
| `[x] P1.08` | Build Modal and Bottom Sheet component (Radix Dialog, mobile drag-to-dismiss)                                   | High     | DONE   | P1.01        | Agent | 2026-11-07  | Accessible dialog wrapper          |
| `[x] P1.09` | Implement global Toast notification system                                                                      | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Success, Error, Info variants      |
| `[x] P1.10` | Build Tab Navigation and Mobile Bottom Tab Bar (Today, History, Me)                                             | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Responsive touch navigation        |
| `[x] P1.11` | Implement Progress Dots, Skeleton shimmers, and Empty state components                                          | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Polished transition primitives     |
| `[x] P1.12` | Build flip/tabular Countdown clock component for S2                                                             | Medium   | DONE   | P1.02        | Agent | 2026-11-07  | Next-drop countdown timer          |
| `[x] P1.13` | Create custom SVG vector components (Brand Mark, Streak Flame, 4 Tier Badges)                                   | High     | DONE   | P1.01        | Agent | 2026-11-07  | Bespoke SVG icons                  |
| `[x] P1.14` | Create vector illustration SVG library for image questions (28 illustrated tiles)                               | High     | DONE   | P1.01        | Agent | 2026-11-07  | Flat vector style in brand tones   |
| `[x] P1.15` | Build interactive question answer components (Text Tile, Image Tile, Number Picker, 12-Swatch Grid, Word Chips) | Critical | DONE   | P1.05, P1.14 | Agent | 2026-11-07  | Interactive, stateful UI controls  |
| `[x] P1.16` | Wire Framer Motion presets, reduce-motion hooks, and sound/haptic helpers                                       | Medium   | DONE   | P1.01        | Agent | 2026-11-07  | Accessibility-compliant feedback   |
| `[x] P1.17` | Build `/design` showcase route displaying every component across all states                                     | High     | DONE   | P1.05-P1.15  | Agent | 2026-11-07  | Living visual component library    |
| `[x] P1.18` | Execute automated accessibility audit (`axe-core`) on design kit                                                | High     | DONE   | P1.17        | Agent | 2026-11-07  | WCAG 2.2 AA validation             |
| `[x] P1.19` | Record token contrast ratios and component decisions in `design.md` and `memory.md`                             | Medium   | DONE   | P1.18        | Agent | 2026-11-07  | Documentation update               |

---

### Phase 2: Database and Shared Core Scoring (Stage 2)

_Status: COMPLETE | Target: Prisma schema, dynamic seed files, mathematical scoring formulas, and 70 unit tests._

| ID      | Task Description                                                                                     | Priority | Status | Depends On | Owner | Done Date   | Notes                               |
| ------- | ---------------------------------------------------------------------------------------------------- | -------- | ------ | ---------- | ----- | ----------- | ----------------------------------- |
| `[x] P2.01` | Write authoritative `schema.prisma` covering all 18 tables defined in `architecture.md`              | Critical | DONE   | P0.08      | Agent | 2026-11-08  | Fully typed PostgreSQL schema       |
| `[x] P2.02` | Build dynamic seed script importing `seed/oddly_batch_001_first_14_days.json`, palettes, and content | Critical | DONE   | P2.01      | Agent | 2026-11-08  | Seeds via the actual batch importer |
| `[x] P2.03` | Define Zod schemas and TypeScript types for all API payloads in `packages/shared`                    | Critical | DONE   | P0.07      | Agent | 2026-11-08  | Shared contract validation          |
| `[x] P2.04` | Implement pure mathematical functions: `similarity`, `information`, `oddness`, `percentile`, `tier`  | Critical | DONE   | P0.07      | Agent | 2026-11-08  | Pure scoring math                   |
| `[x] P2.05` | Unit test scoring functions with Master Prompt worked-example fixtures and property tests            | Critical | DONE   | P2.04      | Agent | 2026-11-08  | Strict symmetry, bounds [0, 1]      |
| `[x] P2.06` | Implement `MatchingStrategy` interface and Stage A brute-force pairwise matcher                      | Critical | DONE   | P2.04      | Agent | 2026-11-08  | In-memory matcher with tie-breakers |
| `[x] P2.07` | Build match simulation script (`pnpm sim`) reproducing entropy and pair distributions                | High     | DONE   | P2.06      | Agent | 2026-11-08  | Validates theoretical match odds    |
| `[x] P2.08` | Implement k-anonymity privacy helpers for region and age-band merging with unit tests                | High     | DONE   | P2.03      | Agent | 2026-11-08  | Prevents deanonymisation            |
| `[x] P2.09` | Implement Twin Day UTC/IST boundary helpers and streak calculation logic with tests                  | High     | DONE   | P2.03      | Agent | 2026-11-08  | Handles cross-timezone players      |
| `[x] P2.10` | Build dynamic content registry and seed JSON files (`app_content`, `app_config`, `tier_definitions`) | High     | DONE   | P2.01      | Agent | 2026-11-08  | Section 12 dynamic architecture     |
| `[x] P2.11` | Build repository data access layer in `services/api/src/db`                                          | High     | DONE   | P2.01      | Agent | 2026-11-08  | Clean Prisma query abstraction      |
| `[x] P2.12` | Build AES-256-GCM encryption/decryption helpers for PII fields with unit tests                       | High     | DONE   | P2.03      | Agent | 2026-11-08  | Encrypts push tokens & IDs          |

---

### Phase 3: Fastify REST API Core (Stage 3)

_Status: COMPLETE | Target: Working API endpoints with rate limits and Zod validation._

| ID          | Task Description                                                                                          | Priority | Status | Depends On   | Owner | Done Date   | Notes                              |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | ----------- | ---------------------------------- |
| `[x] P3.01` | Build Fastify server factory with CORS, Helmet, Cookie, Rate-Limit, and Zod type provider                 | Critical | DONE   | P0.05, P2.03 | Agent | 2026-11-08  | Secure HTTP foundation             |
| `[x] P3.02` | Configure structured Pino logging with correlation `requestId` propagation                                | High     | DONE   | P3.01        | Agent | 2026-11-08  | Traceable server logs              |
| `[x] P3.03` | Implement `GET /v1/drop/today`, `GET /v1/content/:locale`, `GET /v1/pages/:slug`, `GET /v1/config/public` | Critical | DONE   | P3.01, P2.11 | Agent | 2026-11-08  | Edge-cached public documents       |
| `[x] P3.04` | Implement guest identity creation and cookie issuance (`oddly_did`, `oddly_at`)                           | High     | DONE   | P3.01        | Agent | 2026-11-08  | Zero-login guest session           |
| `[x] P3.05` | Implement `POST /v1/submissions` with Zod validation, idempotency, transaction, and Redis counters        | Critical | DONE   | P3.01, P2.11 | Agent | 2026-11-08  | Core submission engine             |
| `[x] P3.06` | Integrate instant Stage A matching and oddness scoring inside submission pipeline                         | Critical | DONE   | P3.05, P2.06 | Agent | 2026-11-08  | Returns provisional twin in < 50ms |
| `[x] P3.07` | Implement `GET /v1/results/:dropId` for viewing current provisional or final match                        | High     | DONE   | P3.05        | Agent | 2026-11-08  | Personal result endpoint           |
| `[x] P3.08` | Implement `GET /v1/world/:dropId` returning aggregate global stats post-close                             | Medium   | DONE   | P3.03        | Agent | 2026-11-08  | Recap statistics                   |
| `[x] P3.09` | Implement rate limiting and anti-bot timing anomaly detection (< 3s total duration flagged)               | High     | DONE   | P3.05        | Agent | 2026-11-08  | Bot defenses                       |
| `[x] P3.10` | Write API integration tests covering happy path, duplicate submit, closed window, and retries             | Critical | DONE   | P3.05-P3.09  | Agent | 2026-11-08  | Comprehensive test suite           |
| `[x] P3.11` | Generate typed OpenAPI documentation directly from Zod route schemas                                      | Low      | DONE   | P3.01        | Agent | 2026-11-08  | Self-documenting API               |
| `[x] P3.12` | Generate and export typed `@oddly/api-client` package                                                     | High     | DONE   | P3.10        | Agent | 2026-11-08  | Universal API client library       |

---

### Phase 4: Play Flow Frontend (Stage 4)

_Status: TODO | Target: Complete play flow playable in browser from landing to submit._

| ID      | Task Description                                                                            | Priority | Status | Depends On   | Owner | Done Date | Notes                         |
| ------- | ------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ----------------------------- |
| `P4.01` | Configure Next.js API rewrites (`/v1/*` -> Fastify) and TanStack Query provider             | Critical | TODO   | P0.04, P3.12 | Agent | —         | Seamless same-origin requests |
| `P4.02` | Implement S1 Landing / Today screen with live player counter and dynamic copy               | High     | TODO   | P1.05, P4.01 | Agent | —         | Entry landing screen          |
| `P4.03` | Implement S2 Countdown screen with tabular flip digits and yesterday's recap link           | High     | TODO   | P1.12, P4.01 | Agent | —         | Drop pending view             |
| `P4.04` | Implement Age Gate bottom sheet and courteous under-18 exclusion screen                     | Critical | TODO   | P1.08, P4.01 | Agent | —         | DPDP Act compliance           |
| `P4.05` | Implement S3 Question screens (Pick One Text, Number, 12-Colour, Image Grid, Word Chips)    | Critical | TODO   | P1.15, P4.01 | Agent | —         | Polymorphic question engine   |
| `P4.06` | Implement auto-advance (350ms), back navigation, exit confirmation, and persisted draft     | High     | TODO   | P4.05        | Agent | —         | Smooth mobile ergonomics      |
| `P4.07` | Implement S4 Review screen with summary chips, editable jumps, and "Find my twin" CTA       | High     | TODO   | P4.05        | Agent | —         | Final review step             |
| `P4.08` | Implement submission handler with idempotency `request_id`, retry queue, and offline banner | Critical | TODO   | P4.07, P3.05 | Agent | —         | Fault-tolerant submission     |
| `P4.09` | Add screen-reader announcements (`aria-live`) and full keyboard navigation across play flow | High     | TODO   | P4.05        | Agent | —         | Accessibility compliance      |
| `P4.10` | Write Playwright E2E test verifying complete guest play flow from S1 to S4                  | Critical | TODO   | P4.08        | Agent | —         | Automated flow verification   |
| `P4.11` | Verify play flow bundle size is $\le 150 \text{ KB}$ gzipped                                | High     | TODO   | P4.08        | Agent | —         | Performance budget check      |

---

### Phase 5: Reveal, Matching UX and Oddness (Stage 5)

_Status: TODO | Target: Animated reveal, count-up match score, oddness card, honesty states._

| ID      | Task Description                                                                                    | Priority | Status | Depends On   | Owner | Done Date | Notes                    |
| ------- | --------------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ------------------------ |
| `P5.01` | Implement S5 Searching screen with 1.5s animated world dot-matrix journey (tap to skip)             | High     | TODO   | P1.13, P4.08 | Agent | —         | Ambient search animation |
| `P5.02` | Implement S6 Twin Reveal screen with count-up score, sequential pick dots, and confetti             | Critical | TODO   | P1.13, P5.01 | Agent | —         | Core emotional climax    |
| `P5.03` | Implement S7 Oddness screen with tier badge pop, percentile count-up, and rarest pick card          | Critical | TODO   | P1.13, P5.02 | Agent | —         | Rarity validation screen |
| `P5.04` | Implement honest state variations: early day (< 200 players), weak match ($\le 2/5$), no exact twin | Critical | TODO   | P5.02, P5.03 | Agent | —         | Transparent messaging    |
| `P5.05` | Implement background polling for provisional upgrades and "Closest so far" tag                      | High     | TODO   | P5.02        | Agent | —         | Live match refinement    |
| `P5.06` | Persist completed drop state locally so reopening `/` displays result summary + next countdown      | High     | TODO   | P5.02        | Agent | —         | Returning session UX     |
| `P5.07` | Wire sound chimes and haptic pulses (`navigator.vibrate`) to reveal beats                           | Medium   | TODO   | P1.16, P5.02 | Agent | —         | Multi-sensory delight    |
| `P5.08` | Implement reduced-motion alternatives (instant fades, static counters, zero confetti)               | High     | TODO   | P5.02, P5.03 | Agent | —         | Accessibility compliance |
| `P5.09` | Write Playwright test verifying all reveal variants and honest states                               | High     | TODO   | P5.04        | Agent | —         | Automated UX testing     |

---

### Phase 6: Share Cards, Share Pages, and Challenge Links (Stage 6)

_Status: TODO | Target: Satori PNG card generator, `/c/:shortId` landing page, challenge loops._

| ID      | Task Description                                                                               | Priority | Status | Depends On   | Owner | Done Date | Notes                        |
| ------- | ---------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ---------------------------- |
| `P6.01` | Build Satori card layout templates (Story 9:16, Square 1:1, Link 1.91:1) in 3 themes           | Critical | TODO   | P1.01, P1.02 | Agent | —         | Serverless card layouts      |
| `P6.02` | Implement BullMQ card rendering job (`renderCard`) with `@resvg/resvg-js` PNG output           | Critical | TODO   | P6.01, P0.06 | Agent | —         | High-resolution image worker |
| `P6.03` | Configure Cloudflare R2 / local filesystem storage client with content-hash keying             | High     | TODO   | P6.02        | Agent | —         | S3-compatible card storage   |
| `P6.04` | Implement `GET /v1/results/:dropId/card` polling endpoint and skeleton placeholder in UI       | High     | TODO   | P6.03        | Agent | —         | Async card retrieval         |
| `P6.05` | Implement S8 Share Sheet (Web Share API with file attachment, copy link, save image)           | High     | TODO   | P6.04        | Agent | —         | Native share integration     |
| `P6.06` | Build `/c/:shortId` public share landing page with dynamic Open Graph meta tags                | Critical | TODO   | P6.03        | Agent | —         | Viral receiver landing page  |
| `P6.07` | Implement Challenge Link parameter (`?challenge=1`) and "You vs Sharer" pick comparison        | High     | TODO   | P6.06        | Agent | —         | Compares public picks only   |
| `P6.08` | Integrate in-memory QR code generator (`qrcode`) onto share card footer                        | Medium   | TODO   | P6.01        | Agent | —         | Scannable card QR code       |
| `P6.09` | Write visual regression tests for generated share cards across all 3 aspect ratios             | High     | TODO   | P6.02        | Agent | —         | Ensures layout consistency   |
| `P6.10` | Write privacy audit test asserting zero PII or user IDs appear on share cards or landing pages | Critical | TODO   | P6.06        | Agent | —         | Strict privacy verification  |

---

### Phase 7: Authentication and Login Panel (Stage 7)

_Status: TODO | Target: Google OAuth, guest-to-account merge, session cookies._

| ID      | Task Description                                                                            | Priority | Status | Depends On   | Owner | Done Date | Notes                          |
| ------- | ------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ------------------------------ |
| `P7.01` | Implement JWT token generation, rotating refresh tokens, and CSRF protection                | Critical | TODO   | P3.01        | Agent | —         | Robust token infrastructure    |
| `P7.02` | Implement `POST /v1/auth/oauth` verifying Google ID tokens                                  | Critical | TODO   | P7.01        | Agent | —         | Google Sign-In endpoint        |
| `P7.03` | Build Login Panel (Modal on desktop, Bottom Sheet on mobile) and `/login` fallback page     | High     | TODO   | P1.08, P7.02 | Agent | —         | Non-intrusive login sheet      |
| `P7.04` | Implement `POST /v1/auth/merge-guest` relinking guest submissions and recalculating streaks | Critical | TODO   | P7.02, P2.09 | Agent | —         | Seamless guest history merge   |
| `P7.05` | Implement `POST /v1/auth/logout` revoking refresh tokens and clearing HTTP-only cookies     | High     | TODO   | P7.01        | Agent | —         | Clean sign-out handler         |
| `P7.06` | Integrate invisible Cloudflare Turnstile bot verification on sign-in                        | High     | TODO   | P7.02        | Agent | —         | Bot challenge protection       |
| `P7.07` | Implement duplicate account detection hooks (matching phone hash, device clusters)          | Medium   | TODO   | P7.04        | Agent | —         | Anti-abuse safeguards          |
| `P7.08` | Write comprehensive integration tests for OAuth authentication and guest merge              | Critical | TODO   | P7.04        | Agent | —         | Full auth test coverage        |
| `P7.09` | Implement stub interface for Phone OTP behind `FEATURE_PHONE_OTP` feature flag              | Low      | TODO   | P7.01        | Agent | —         | Flagged, ready for SMS gateway |

---

### Phase 8: Streaks, History, Settings, Privacy, and Reports (Stage 8)

_Status: TODO | Target: Streak milestones, history calendar, Me settings, export/deletion, reporting._

| ID      | Task Description                                                                      | Priority | Status | Depends On   | Owner | Done Date | Notes                           |
| ------- | ------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ------------------------------- |
| `P8.01` | Implement streak verification and `streak_log` transaction logic                      | Critical | TODO   | P2.09, P3.05 | Agent | —         | Daily streak management         |
| `P8.02` | Build Header Streak Flame and milestone celebration modal (7, 30, 100, 365 days)      | High     | TODO   | P1.13, P8.01 | Agent | —         | Streak gamification             |
| `P8.03` | Implement `GET /v1/history` API and S10 History screen (calendar strip + past cards)  | High     | TODO   | P3.07, P4.01 | Agent | —         | Historical game archive         |
| `P8.04` | Implement S14 Me / Settings screen (notification prefs, quiet hours, theme, privacy)  | High     | TODO   | P1.07, P4.01 | Agent | —         | User control panel              |
| `P8.05` | Build user data export worker job (`POST /v1/me/export`) generating downloadable JSON | High     | TODO   | P0.06, P2.11 | Agent | —         | DPDP data portability           |
| `P8.06` | Build account deletion flow (`DELETE /v1/me`) with 2-tap confirmation sheet           | Critical | TODO   | P1.08, P2.11 | Agent | —         | DPDP right to erasure           |
| `P8.07` | Implement Report flow (`POST /v1/reports`) with reason selector and 140-char note     | High     | TODO   | P1.08, P3.01 | Agent | —         | Content moderation intake       |
| `P8.08` | Build dynamic Privacy Notice and Terms of Service pages rendered from `pages` table   | High     | TODO   | P3.03        | Agent | —         | Marked "lawyer review required" |
| `P8.09` | Build About Oddly page rendering verbatim brand story from Section 4.1                | Medium   | TODO   | P3.03        | Agent | —         | Brand storytelling              |
| `P8.10` | Write Playwright tests for settings changes, data export, deletion, and reporting     | High     | TODO   | P8.04-P8.07  | Agent | —         | Automated settings verification |

---

### Phase 9: Scheduler and Daily Pipeline (Stage 9)

_Status: TODO | Target: BullMQ repeatable daily timeline, accelerated staging clock._

| ID      | Task Description                                                                             | Priority | Status | Depends On   | Owner | Done Date | Notes                        |
| ------- | -------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ---------------------------- |
| `P9.01` | Implement BullMQ scheduler for daily timeline (06:30 stage, 07:00 open, 06:59 close)         | Critical | TODO   | P0.06, P2.01 | Agent | —         | Core timeline automation     |
| `P9.02` | Build 5-minute repeatable worker job refreshing provisional pairings                         | High     | TODO   | P2.06, P9.01 | Agent | —         | Background match updates     |
| `P9.03` | Build 07:00 final batch job: locks $p(a)$, final twins, oddness, streaks, immutable rows     | Critical | TODO   | P2.04, P9.01 | Agent | —         | Definitive recap computation |
| `P9.04` | Implement world stats calculation job (total players, rarest pick, most popular pick)        | High     | TODO   | P9.03        | Agent | —         | Global community stats       |
| `P9.05` | Implement share card regeneration job appending immutable "FINAL" badge                      | High     | TODO   | P6.02, P9.03 | Agent | —         | Final card rendering         |
| `P9.06` | Build S9 Recap screen displaying yesterday's locked twin, world stats, and new drop CTA      | High     | TODO   | P5.02, P9.04 | Agent | —         | Morning recap interface      |
| `P9.07` | Implement staging accelerated clock (`CLOCK_ACCELERATION=true`) running a Drop every 10 mins | Critical | TODO   | P9.01        | Agent | —         | Rapid pipeline verification  |
| `P9.08` | Build dead-letter queue, automated job retries, and late-recap fallback UI banner            | High     | TODO   | P9.03        | Agent | —         | Fault tolerance              |
| `P9.09` | Implement live question-pull recompute pipeline (re-scoring on remaining 4 questions)        | High     | TODO   | P9.03        | Agent | —         | Emergency question pull      |
| `P9.10` | Implement daily cleanup worker job (purging expired guest records, transient Redis keys)     | Medium   | TODO   | P9.01        | Agent | —         | Data retention hygiene       |
| `P9.11` | Run automated test suite simulating full 24-hour cycle via accelerated clock                 | Critical | TODO   | P9.07        | Agent | —         | Full lifecycle validation    |

---

### Phase 10: Notifications and PWA (Stage 10)

_Status: TODO | Target: Web Push sender, 2-per-day cap, quiet hours, installable PWA._

| ID       | Task Description                                                                           | Priority | Status | Depends On     | Owner | Done Date | Notes                         |
| -------- | ------------------------------------------------------------------------------------------ | -------- | ------ | -------------- | ----- | --------- | ----------------------------- |
| `P10.01` | Implement service worker and Web App Manifest (standalone display, icons, `/offline`)      | Critical | TODO   | P0.04          | Agent | —         | PWA installability            |
| `P10.02` | Build Web Push permission request flow and second-visit prompt sheet                       | High     | TODO   | P1.08, P3.01   | Agent | —         | Contextual permission request |
| `P10.03` | Configure VAPID signing and BullMQ `sendPush` job utilizing `web-push` library             | Critical | TODO   | P0.06          | Agent | —         | Push delivery engine          |
| `P10.04` | Implement push channels: Drop Live, Smart Nudge, Twin Upgrade, Recap, Streak at Risk       | High     | TODO   | P10.03         | Agent | —         | Template-driven notifications |
| `P10.05` | Enforce strict delivery constraints: max 2 pushes/user/day, quiet hours (22:00-07:00 IST)  | Critical | TODO   | P10.04         | Agent | —         | Anti-annoyance protection     |
| `P10.06` | Implement Twin Upgrade push trigger ($\Delta S \ge 0.10$ or jump from 3 to 4/5, max 1/day) | High     | TODO   | P9.02, P10.04  | Agent | —         | High-value retention trigger  |
| `P10.07` | Implement iOS Safari home-screen installation instruction banner                           | Medium   | TODO   | P10.01         | Agent | —         | Guides iOS push requirement   |
| `P10.08` | Build in-app PWA install button hooked to `beforeinstallprompt` event                      | Medium   | TODO   | P10.01         | Agent | —         | Streamlined install UX        |
| `P10.09` | Log push dispatches and track notification open rates in `notifications_log`               | High     | TODO   | P10.04         | Agent | —         | Delivery telemetry            |
| `P10.10` | Write integration tests verifying push capping, quiet hour silencing, and upgrade triggers | High     | TODO   | P10.05, P10.06 | Agent | —         | Notification test suite       |

---

### Phase 11: Admin Tool and Dynamic Importer (Stage 11)

_Status: TODO | Target: Bulk JSON question importer, two-person approval, buffer alerts._

| ID       | Task Description                                                                           | Priority | Status | Depends On    | Owner | Done Date | Notes                        |
| -------- | ------------------------------------------------------------------------------------------ | -------- | ------ | ------------- | ----- | --------- | ---------------------------- |
| `P11.01` | Scaffold `apps/admin` Next.js application with Google SSO, allowlist, and role guards      | Critical | TODO   | P0.03, P7.01  | Agent | —         | Internal admin portal        |
| `P11.02` | Build question library browser and polymorphic editor with live phone-sized preview        | High     | TODO   | P11.01, P2.01 | Agent | —         | Question authoring interface |
| `P11.03` | Build bulk JSON batch importer supporting `seed/oddly_batch_001_first_14_days.json` format | Critical | TODO   | P11.01, P2.02 | Agent | —         | Core batch ingestion engine  |
| `P11.04` | Implement batch validation engine: mix of 5 types, option counts, forbidden topics scan    | Critical | TODO   | P11.03        | Agent | —         | Content policy enforcement   |
| `P11.05` | Implement Drop scheduling calendar with two-person approval workflow and D-2 lock          | Critical | TODO   | P11.01, P2.01 | Agent | —         | Editorial governance         |
| `P11.06` | Build panel-testing evaluation tool computing `panel_entropy` and flagging skewed options  | High     | TODO   | P11.02        | Agent | —         | Predictive quality scoring   |
| `P11.07` | Implement live administrative actions: pull question, extend drop window, view audit log   | High     | TODO   | P11.01, P9.09 | Agent | —         | Operational control center   |
| `P11.08` | Implement buffer tracking dashboard: alert when approved drops remain < 14 days            | High     | TODO   | P11.05        | Agent | —         | Content pipeline health      |
| `P11.09` | Build dynamic editors for `app_content` copy strings, `pages` markdown, and `app_config`   | High     | TODO   | P11.01, P2.10 | Agent | —         | Content management UI        |
| `P11.10` | Write automated tests verifying batch validation rejects invalid question structures       | High     | TODO   | P11.04        | Agent | —         | Ingestion safety tests       |

---

### Phase 12: Observability, Telemetry, and Security Hardening (Stage 12)

_Status: TODO | Target: PostHog funnels, Sentry tracing, CSP headers, rate-limit audit._

| ID       | Task Description                                                                              | Priority | Status | Depends On   | Owner | Done Date | Notes                          |
| -------- | --------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ------------------------------ |
| `P12.01` | Instrument PostHog telemetry across key lifecycle events (drop view, submit, reveal, share)   | High     | TODO   | P4.08, P5.02 | Agent | —         | Privacy-safe product analytics |
| `P12.02` | Configure PostHog retention and funnel dashboards tracking G0/G1 success metrics              | Medium   | TODO   | P12.01       | Agent | —         | Metrics visualization          |
| `P12.03` | Integrate Sentry error monitoring and performance tracing in Web, API, and Worker             | Critical | TODO   | P0.04, P0.05 | Agent | —         | Real-time crash monitoring     |
| `P12.04` | Configure automated alert thresholds (error rate > 1%, submit p95 > 800ms, queue delay > 10m) | High     | TODO   | P12.03       | Agent | —         | Operational alerts             |
| `P12.05` | Harden HTTP security headers (strict Content-Security-Policy, HSTS, secure cookies)           | Critical | TODO   | P3.01        | Agent | —         | Application defense in depth   |
| `P12.06` | Verify zero PII leakage across logs, network responses, and client error messages             | Critical | TODO   | P3.02, P6.10 | Agent | —         | Privacy security audit         |
| `P12.07` | Run automated dependency vulnerability audit (`pnpm audit`) and fix CVEs                      | High     | TODO   | P0.03        | Agent | —         | Supply-chain security          |
| `P12.08` | Build dynamic cache invalidation test suite ensuring content updates flush instantly          | High     | TODO   | P3.03        | Agent | —         | Cache coherence tests          |
| `P12.09` | Implement feature flags in API and Web (`FEATURE_PHONE_OTP`, `FEATURE_WAVE`)                  | Medium   | TODO   | P3.01        | Agent | —         | Controlled feature rollouts    |

---

### Phase 13: End-to-End Testing, QA, and Performance (Stage 13)

_Status: TODO | Target: 95% test coverage in shared, k6 load test up to 10k players._

| ID       | Task Description                                                                            | Priority | Status | Depends On   | Owner | Done Date | Notes                           |
| -------- | ------------------------------------------------------------------------------------------- | -------- | ------ | ------------ | ----- | --------- | ------------------------------- |
| `P13.01` | Verify test coverage: $\ge 95\%$ on `packages/shared`, $\ge 80\%$ on `services/api`         | Critical | TODO   | P2.05, P3.10 | Agent | —         | Coverage target compliance      |
| `P13.02` | Execute end-to-end Playwright tests covering all user flows and error paths                 | Critical | TODO   | P4.10, P5.09 | Agent | —         | Full regression test suite      |
| `P13.03` | Conduct comprehensive accessibility audit with `@axe-core/playwright` (zero AA violations)  | High     | TODO   | P13.02       | Agent | —         | WCAG 2.2 AA certification       |
| `P13.04` | Validate performance on simulated low-end Android CPU and throttled 4G network              | Critical | TODO   | P4.11        | Agent | —         | Core device compatibility       |
| `P13.05` | Execute k6 load test simulating 10,000 daily players with 5x burst concurrency at 07:00 IST | Critical | TODO   | P3.05        | Agent | —         | Peak burst capacity test        |
| `P13.06` | Validate simulation script output matching Master Prompt theoretical match distributions    | High     | TODO   | P2.07        | Agent | —         | Algorithm fidelity verification |
| `P13.07` | Cross-browser compatibility audit (Chrome, Safari, Firefox, Samsung Internet)               | High     | TODO   | P13.02       | Agent | —         | Browser matrix check            |
| `P13.08` | Execute batch importer stress tests with deliberately broken, malformed JSON inputs         | High     | TODO   | P11.10       | Agent | —         | Ingestion resilience testing    |
| `P13.09` | Run comprehensive team Bug Bash and resolve all critical/high priority defects              | High     | TODO   | P13.02       | Agent | —         | Quality polish                  |
| `P13.10` | Verify Beta Release Acceptance Criteria (Crash-free > 99%, drop completion > 85%)           | Critical | TODO   | P13.09       | Agent | —         | Gate G1 compliance check        |

---

### Phase 14: Cloud Deployment and Infrastructure (Stage 14)

_Status: TODO | Target: Automated staging & production deployments, tested backups._

| ID       | Task Description                                                                       | Priority | Status | Depends On    | Owner   | Done Date | Notes                         |
| -------- | -------------------------------------------------------------------------------------- | -------- | ------ | ------------- | ------- | --------- | ----------------------------- |
| `P14.01` | Provision managed PostgreSQL (Neon/Supabase), Redis (Upstash), Cloudflare R2           | Critical | TODO   | None          | Founder | —         | Managed cloud databases       |
| `P14.02` | Deploy staging environment and execute full accelerated-clock pipeline dry run         | Critical | TODO   | P9.07, P14.01 | Agent   | —         | Staging verification          |
| `P14.03` | Configure production GitHub Actions CI/CD deployment pipeline                          | Critical | TODO   | P14.02        | Agent   | —         | Zero-downtime CD              |
| `P14.04` | Configure automated daily PostgreSQL backups and verify point-in-time restore          | Critical | TODO   | P14.01        | Agent   | —         | Disaster recovery validation  |
| `P14.05` | Configure uptime monitors, synthetic health checks, and alerting integration           | High     | TODO   | P14.02        | Agent   | —         | Infrastructure monitoring     |
| `P14.06` | Configure Cloudflare CDN caching rules, WAF rate limits, and Turnstile production keys | Critical | TODO   | P14.03        | Agent   | —         | Edge perimeter security       |
| `P14.07` | Write comprehensive operations incident runbook in `docs/runbook.md`                   | High     | TODO   | P14.03        | Agent   | —         | On-call procedures & runbooks |
| `P14.08` | Complete pre-launch verification checklist across all services                         | Critical | TODO   | P14.06        | Agent   | —         | Final operational sign-off    |
| `P14.09` | Audit infrastructure operating costs against ₹2,500/month lean budget target           | Medium   | TODO   | P14.01        | Agent   | —         | Cloud budget verification     |

---

### Phase 15: Beta Launch and Decision Gates (Stage 15)

_Status: TODO | Target: 200 beta cohort live, Gate G1 evaluation._

| ID       | Task Description                                                                             | Priority | Status | Depends On | Owner   | Done Date | Notes                        |
| -------- | -------------------------------------------------------------------------------------------- | -------- | ------ | ---------- | ------- | --------- | ---------------------------- |
| `P15.01` | Implement Weekend Prototype Test mode (`WEEKEND_TEST=true`) if G0 is executed first          | High     | TODO   | P14.03     | Agent   | —         | Prototype mode toggle        |
| `P15.02` | Execute 200-user closed beta onboarding and cohort tracking                                  | Critical | TODO   | P14.03     | Founder | —         | Beta cohort rollout          |
| `P15.03` | Build automated daily metrics reporting script tracking G0, G1, and G2 thresholds            | High     | TODO   | P12.01     | Agent   | —         | Automated retention metrics  |
| `P15.04` | Execute 14-day post-launch operational monitoring checklist                                  | High     | TODO   | P15.02     | Both    | —         | Daily drop health monitoring |
| `P15.05` | Conduct post-beta retrospective and prioritize v1.5 backlog (Friends, Waves, Hindi/Gujarati) | High     | TODO   | P15.04     | Both    | —         | Next cycle planning          |

---

## 4. Founder Verification Checklists (Stage-by-Stage)

- **Stage 0 Checklist:**
  - [ ] All 6 core markdown files exist, are fully written, detailed, and consistent with no stub headings.
  - [ ] Monorepo skeleton initialized with valid `pnpm-workspace.yaml`, `turbo.json`, and root scripts.
  - [ ] `apps/web` displays "oddly — coming soon" with real tokens; `services/api` responds to `GET /health`.
  - [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` run and pass cleanly.
- **Stage 1 Checklist:**
  - [ ] Navigate to `/design` in browser; toggle Light/Dark themes and test interactive states for all components.
  - [ ] Check contrast ratios, mobile touch targets ($\ge 44 \text{px}$), and verify all 28 question SVGs render.
- **Stage 2 Checklist:**
  - [ ] Run `pnpm test` to verify pure scoring math against worked-example fixtures.
  - [ ] Run `pnpm sim` to verify simulated entropy and match probabilities match theoretical values.
  - [ ] Run seed script to verify `oddly_batch_001_first_14_days.json` imports cleanly into PostgreSQL.
- **Stage 3 Checklist:**
  - [ ] Execute `curl http://localhost:4000/v1/drop/today` and verify edge-cached JSON structure.
  - [ ] Execute `POST /v1/submissions` with sample vector; confirm immediate Stage A provisional twin return.
- **Stage 4 Checklist:**
  - [ ] Open web app on mobile viewport; complete all 5 questions from S1 to S4 without logging in.
  - [ ] Test offline behavior by disconnecting network; confirm answers persist and retry gracefully.
- **Stage 5 Checklist:**
  - [ ] Inspect reveal sequence: 1.5s search journey, twin card slide-up, pick dot illumination, confetti burst.
  - [ ] Inspect Oddness card, percentile count-up, and verify honest copy displays for low player counts.
- **Stage 6 Checklist:**
  - [ ] Generate share cards across Story, Square, and Link formats; verify crisp rendering and QR code.
  - [ ] Open `/c/:shortId` in an incognito window; verify dynamic Open Graph tags and "Play" CTA.
- **Stage 7 Checklist:**
  - [ ] Sign in with Google from the result sheet; verify guest picks and streaks merge without data loss.
- **Stage 8 Checklist:**
  - [ ] Inspect History archive, change notification preferences in Settings, test Data Export and Deletion.
- **Stage 9 Checklist:**
  - [ ] Run accelerated staging pipeline (`CLOCK_ACCELERATION=true`); observe automated 10-minute drop cycles.
- **Stage 10 Checklist:**
  - [ ] Install PWA to mobile home screen; accept push prompt; receive test notification on drop time.
- **Stage 11 Checklist:**
  - [ ] Log into Admin portal; import a new batch JSON; verify validation report and approve drops.
- **Stage 12 Checklist:**
  - [ ] Review PostHog dashboard, trigger a deliberate error to verify Sentry alert dispatch.
- **Stage 13 Checklist:**
  - [ ] Review k6 load test results and automated accessibility audit reports.
- **Stage 14 Checklist:**
  - [ ] Verify production staging URLs, automated backups, and Cloudflare WAF protection.
- **Stage 15 Checklist:**
  - [ ] Review Day-7 retention metrics against Gate G1 criteria with 200 beta players.

---

## 5. Change Log

| Date         | Phase / Task              | Description of Change                                                                                          | Reason                                        |
| ------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `2026-11-07` | Architecture / Section 12 | Integrated Override Addendum: all content, questions, palettes, copy, and configs are dynamic from PostgreSQL. | Founder requirement: zero hard-coded content. |
| `2026-11-07` | Phase 0 to 15             | Established initial 16-phase roadmap containing 165 granular, tracked engineering tasks.                       | Comprehensive project initialisation.         |
| `2026-11-07` | Stage 0 Complete          | Verified monorepo skeleton, 6 core markdown documents, and base scripts (typecheck, lint, test, build, dev).    | Stage 0 Definition of Done achieved.          |
| `2026-11-07` | Stage 1 Complete          | Built complete design system, UI kit, 28 SVGs, interactive controls, and `/design` showcase route. Verified.   | Stage 1 Definition of Done achieved.          |
