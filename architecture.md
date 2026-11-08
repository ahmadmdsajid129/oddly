# Architecture and Technical Specification — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-07 | Owner: Founder + AI agent
Purpose of this file: System architecture, complete tech stack, data models, Redis schema, API specifications, component lifecycles, and deployment infrastructure.

---

## 1. System Overview

Oddly is architected as a high-throughput, low-latency, mobile-first Web Application and API. The system handles sharp diurnal traffic spikes (around 07:00 IST) through edge caching, asynchronous background workers, and in-memory evaluation for real-time player matching.

### 1.1 Plain-Words Architecture

- **Web App (`apps/web`):** A Next.js 14 (App Router) responsive PWA. Delivers the client shell, question answering flow, dynamic content rendering, and result reveal animations. Reverse-proxies API calls (`/v1/*`) to avoid cross-origin cookie restrictions.
- **Admin App (`apps/admin`):** Next.js internal operations tool for question authoring, bulk JSON imports, panel tests, two-person drop scheduling, and moderation queues.
- **REST API Service (`services/api`):** Fastify + TypeScript service handling authentication, submission ingestion, instant Stage A provisional matching, profile management, and report intake.
- **Worker Service (`services/worker`):** BullMQ workers driven by Redis, processing asynchronous background jobs: daily drop scheduling, provisional match refreshing (every 5 min), final recap matching (07:00 IST), server-side share card generation via Satori, and Web Push dispatch.
- **PostgreSQL 16:** The authoritative system of record for drops, questions, submissions, matches, streaks, assets, dynamic content, and audit logs.
- **Redis 7:** Ephemeral high-speed store for live answer counters ($C(a)$), active answer vectors, rate limits, idempotency deduplication, and BullMQ queues.
- **Cloudflare Edge / R2:** Cloudflare CDN caches public documents (`GET /v1/drop/today`, `GET /v1/content/:locale`); Cloudflare R2 stores rendered share-card PNGs and user data exports; Cloudflare Turnstile blocks bot traffic.

### 1.2 System Topology Diagram

```mermaid
flowchart TD
    subgraph Clients["Clients (Mobile / Desktop)"]
        Browser["Player Browser (PWA)"]
        AdminBrowser["Admin Operator"]
    end

    subgraph Edge["Edge Infrastructure (Cloudflare)"]
        CDN["Cloudflare CDN & WAF"]
        Turnstile["Cloudflare Turnstile"]
        R2["Cloudflare R2 (Storage)"]
    end

    subgraph Services["Oddly Backend (Fly.io / Render)"]
        API["Fastify REST API (Port 4000)"]
        Worker["BullMQ Worker Service"]
    end

    subgraph Data["Persistence & Caching"]
        PG[("PostgreSQL 16 (Neon / Supabase)")]
        Redis[("Redis 7 (Upstash / Local)")]
    end

    subgraph External["External Integrations"]
        GoogleAuth["Google Identity Services"]
        WebPush["Web Push Gateways (FCM / Mozilla)"]
        Sentry["Sentry Error Tracking"]
        PostHog["PostHog Analytics"]
    end

    Browser -->|HTTPS / Next.js| CDN
    AdminBrowser -->|HTTPS / SSO| CDN
    CDN -->|Cached Drop & Assets| Browser
    CDN -->|Dynamic API Proxy| API
    Browser -.->|Bot Challenge| Turnstile

    API -->|Read / Write| PG
    API -->|Live Counters / Vector Store| Redis
    API -->|Enqueue Jobs| Redis

    Worker -->|Consume Queues| Redis
    Worker -->|Lock Final Recaps| PG
    Worker -->|Upload Share Cards| R2
    Worker -->|Dispatch Push| WebPush

    API -.->|Verify Tokens| GoogleAuth
    API -.->|Telemetry| PostHog
    Services -.->|Exceptions| Sentry
    Browser -.->|Fetch PNG Cards| R2
```

---

## 2. End-to-End Workflow and Failure Paths

### 2.1 The Complete Daily Journey

1. **User Discovery & Access:** User navigates to `https://oddly.app`. Cloudflare serves cached static assets in < 100ms.
2. **Drop State Check:** Client requests `GET /v1/drop/today`. If status is `live`, S1 Landing displays today's live player count. If `scheduled`, S2 Countdown is rendered.
3. **Frictionless Age Gate:** User taps _"Play today's five"_. On the first device visit, an Age Gate sheet confirms 18+ status. Upon confirmation, a client device UUID is stored locally and in an `oddly_did` cookie.
4. **Answering the Five Picks:**
   - Client iterates through Q1 (Pick One), Q2 (Number 1-50), Q3 (12-Colour Palette), Q4 (Image Tile), Q5 (Word).
   - Selections are held in a local Zustand store and persisted to `localStorage`.
   - Each answer start and duration is tracked locally for bot anomaly detection.
5. **Review Screen (S4):** User inspects summary chips. Tapping _"Find my twin"_ initiates submission.
6. **Submission Execution (`POST /v1/submissions`):**
   - Client sends answers along with client-generated `request_id`, device ID, and timing metadata.
   - API verifies idempotency key in Redis (`idem:{request_id}`).
   - Fastify executes a PostgreSQL transaction: writes `submissions` and 5 `answers` rows.
   - Atomically increments option frequency counters in Redis (`drop:{id}:count:{q}:{opt}`).
   - Runs **Stage A Matching**: evaluates the player's 5-vector against active vectors in memory/Redis.
   - Computes Oddness bits, percentile, and tier.
   - Saves provisional match row in PostgreSQL.
   - Enqueues background card rendering job to BullMQ (`cards` queue).
   - Returns provisional twin, match count, and rarity percentile directly in HTTP response.
7. **Reveal Flow (S5 $\to$ S6 $\to$ S7):** Client displays 1.5s search animation, twin reveal with Mint illumination, count-up match score, and rarity tier card.
8. **Share & Retention (S8):** User generates Story/Square card via Web Share API or copies challenge link (`/c/:shortId?challenge=1`).
9. **Next Morning Recap (07:05 IST):** BullMQ final worker locks final matches, recalculates exact probabilities, updates user streaks, and pushes recap notifications.

### 2.2 Failure Paths and Resiliency

```mermaid
flowchart TD
    Start["User Submits Answers"] --> CheckNet{"Network Available?"}
    CheckNet -- No --> CacheLocal["Keep in localStorage; Retry with exponential backoff"]
    CheckNet -- Yes --> SendReq["POST /v1/submissions (request_id)"]
    SendReq --> CheckIdem{"Idempotency Cache Hit?"}
    CheckIdem -- Yes --> ReturnCached["Return existing stored result (HTTP 200)"]
    CheckIdem -- No --> CheckStatus{"Drop Status?"}
    CheckStatus -- "closed" --> Return409["HTTP 409 DROP_CLOSED (Redirect to Recap)"]
    CheckStatus -- "live" --> DBWrite{"DB Transaction"}
    DBWrite -- Success --> MatchEngine["Stage A Match + Enqueue Card Job"]
    DBWrite -- DB Failure --> Return503["HTTP 503 SERVICE_UNAVAILABLE (Answers kept locally)"]
    MatchEngine --> ReturnResult["HTTP 200 (Provisional Result)"]
```

- **Network Drop Mid-Submission:** The client caches answers locally. When connectivity restores, it retries with the _identical_ `request_id`. The server accepts only the first successful write.
- **Duplicate Submission Attempt:** If a user opens two tabs and submits simultaneously, the database unique constraint on `(drop_id, user_id)` halts the second insert, returning the stored result.
- **Server Outage at 07:00 Drop Time:** The Drop JSON document is pre-staged and edge-cached on Cloudflare CDN. The client renders questions normally; submissions buffer in client storage until API recovers.
- **Late Final Batch (Past 07:10 IST):** The UI continues displaying the provisional twin with a subtle label: _"Final results are being finalized"_.

---

## 3. Technology Stack

| Layer                | Technology                        | Version         | Why Chosen                                                 | Features Using It         | Alternative Considered |
| -------------------- | --------------------------------- | --------------- | ---------------------------------------------------------- | ------------------------- | ---------------------- |
| **Runtime**          | Node.js                           | `20.19.5` (LTS) | Enterprise stability, LTS predictability                   | All services              | Bun, Deno              |
| **Package Manager**  | pnpm                              | `9.x`           | Fast, disk-efficient workspace management                  | Monorepo root             | npm, yarn              |
| **Monorepo Engine**  | Turborepo                         | `2.x`           | High-performance remote build caching                      | Root pipelines            | Nx, Lerna              |
| **Language**         | TypeScript                        | `5.6.x`         | Strict type safety across client, server, and shared core  | All packages              | Vanilla JS             |
| **Frontend App**     | Next.js (App Router)              | `14.2.x`        | Server components, edge routes, optimal image optimization | `apps/web`, `apps/admin`  | Vite SPA, Remix        |
| **Styling**          | Tailwind CSS                      | `3.4.x`         | Utility-first, zero runtime CSS overhead                   | All UI components         | Styled Components      |
| **Primitives**       | Radix UI                          | Latest          | Unstyled, accessible, keyboard-compliant primitives        | Modals, Sheets, Toggles   | Headless UI            |
| **Iconography**      | lucide-react                      | Latest          | Lightweight, tree-shakeable SVG icons                      | All UI components         | Heroicons              |
| **Animation**        | Framer Motion                     | `11.x`          | Physics-based spring animations and gestures               | S3, S5, S6, S7            | React Spring           |
| **Celebrations**     | canvas-confetti                   | `1.9.x`         | Lightweight canvas particle emitter                        | S6 Twin Reveal            | Custom canvas engine   |
| **Client State**     | Zustand                           | `4.5.x`         | Minimalist hook-based store for active draft answers       | Answering flow (F4)       | Redux, Jotai           |
| **Server State**     | TanStack Query                    | `5.x`           | Robust caching, deduplication, and polling for results     | API data fetching         | SWR, RTK Query         |
| **Validation**       | Zod                               | `3.23.x`        | Schema validation shared across API and client             | All forms and endpoints   | Yup, Joi               |
| **Date Arithmetic**  | date-fns & tz                     | `3.6.x`         | Lightweight, modular UTC timezone formatting               | Twin Day scheduling       | Day.js, Moment         |
| **Identifiers**      | uuid & nanoid                     | `9.x` / `5.x`   | UUIDv4 for database IDs; nanoid for share URLs             | Database & short links    | CUID, shortid          |
| **API Framework**    | Fastify                           | `4.28.x`        | Ultra-low overhead, native schema validation               | `services/api`            | Express, NestJS        |
| **API Type Provider** | fastify-type-provider-zod         | `^2.0.0`        | Native end-to-end typed request/response with Zod schemas  | `services/api`            | TypeBox, Joi           |
| **API Security**     | @fastify/helmet, cors, rate-limit | Latest          | Out-of-the-box secure HTTP headers and rate limiting       | `services/api`            | Custom middlewares     |
| **API Cookies**      | @fastify/cookie                   | `^9.3.1`        | Secure HTTP-only signed cookies for guest identity         | Guest identity (F1)       | Custom cookie parsing  |
| **API Documentation**| @fastify/swagger, swagger-ui      | `8.x` / `3.x`   | Automated OpenAPI / Swagger documentation from Zod routes  | Developer docs            | Manual OpenAPI spec    |
| **Authentication**   | jose & google-auth-library        | `5.x` / `9.x`   | Secure JWT sign/verify, Google ID token verification       | Auth (F1, F2)             | NextAuth, Passport     |
| **Database ORM**     | Prisma                            | `5.19.x`        | Type-safe query builder, automated migration management    | Data access               | Drizzle, Kysely        |
| **Primary Database** | PostgreSQL                        | `16`            | ACID compliance, JSONB capabilities, future pgvector       | All core storage          | MySQL, MongoDB         |
| **Cache & Queues**   | Redis (ioredis)                   | `7` / `5.x`     | Sub-millisecond counters, vector caching, BullMQ           | Counters, caching, queues | Memcached              |
| **Queue Engine**     | BullMQ                            | `5.x`           | Robust Redis-based job queues with repeatable schedules    | `services/worker`         | Celery, RabbitMQ       |
| **Card Rendering**   | satori + @resvg/resvg-js          | Latest          | Serverless JSX-to-SVG to high-res PNG compilation          | F8 Share Cards            | Puppeteer, Canvas      |
| **QR Generation**    | qrcode                            | `1.5.x`         | In-memory SVG/PNG QR code rendering for share cards        | F8 Share Cards            | Third-party QR APIs    |
| **Object Storage**   | @aws-sdk/client-s3                | `3.x`           | Universal S3-compatible client for Cloudflare R2           | Asset storage             | Native R2 API          |
| **Push Gateway**     | web-push                          | `3.6.x`         | Web Push protocol implementation with VAPID                | Notifications (F13)       | OneSignal, Firebase    |
| **PWA Engine**       | @serwist/next                     | `9.x`           | Modern service worker compiler for Next.js PWA             | PWA offline caching       | next-pwa               |
| **Bot Challenge**    | @marsidev/react-turnstile         | Latest          | Invisible Cloudflare Turnstile bot protection              | Anti-bot defenses         | Google reCAPTCHA       |
| **Telemetry**        | posthog-js / node                 | Latest          | Product analytics, retention cohorts, feature flags        | Telemetry & metrics       | Mixpanel, Amplitude    |
| **Error Logging**    | @sentry/nextjs / node             | `8.x`           | Real-time crash alerting and performance tracing           | All services              | Bugsnag, Datadog       |
| **Server Logging**   | pino                              | `9.x`           | High-speed structured JSON logging                         | API & Worker              | Winston                |
| **Test Runners**     | Vitest & Playwright               | Latest          | Unit testing for scoring; E2E browser testing              | QA and CI/CD              | Jest, Cypress          |

---

## 4. Feature-to-Technology Mapping

| Feature ID | Feature Name            | Screens Involved              | API Routes                                                           | Database Tables                                                      | Redis Keys / Queues                  | Worker Jobs             | Libraries Used                 |
| ---------- | ----------------------- | ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ | ----------------------- | ------------------------------ |
| **F1**     | Guest Play & Onboarding | S1 Landing, Age Gate Sheet    | `GET /v1/drop/today`, `POST /v1/submissions`                         | `users`, `devices`                                                   | `drop:{id}:players`                  | `analytics`             | Radix Dialog, Zod, uuid        |
| **F2**     | Google Account & Merge  | Login Panel, `/login`         | `POST /v1/auth/oauth`, `POST /v1/auth/merge-guest`                   | `users`, `auth_identities`, `refresh_tokens`, `devices`              | `rl:{ip}:auth`                       | —                       | jose, google-auth-library      |
| **F3**     | Daily Drop              | S1 Landing, S2 Countdown      | `GET /v1/drop/today`                                                 | `drops`, `drop_questions`, `questions`, `palettes`, `assets`         | `drop:{id}:json`                     | `openDrop`, `stageDrop` | date-fns, Prisma               |
| **F4**     | Answering Flow          | S3 (Q1-Q5), S4 Review         | `POST /v1/submissions`                                               | `submissions`, `answers`                                             | `idem:{req_id}`, `drop:{id}:count:*` | —                       | Zustand, Framer Motion         |
| **F5**     | Provisional Twin        | S5 Searching, S6 Reveal       | `POST /v1/submissions`, `GET /v1/results/:dropId`                    | `matches`                                                            | `drop:{id}:vec:*`                    | `matchProvisional`      | Framer Motion, canvas-confetti |
| **F6**     | Final Twin & Recap      | S9 Recap                      | `GET /v1/results/:dropId`, `GET /v1/world/:dropId`                   | `matches`, `drops`, `streak_log`                                     | —                                    | `matchFinal`, `recap`   | date-fns, Prisma               |
| **F7**     | Oddness & Rarity Tiers  | S7 Oddness                    | `POST /v1/submissions`                                               | `matches`, `tier_definitions`                                        | `drop:{id}:count:*`                  | —                       | `@oddly/shared` scoring        |
| **F8**     | Share Cards             | S8 Share Sheet, `/c/:shortId` | `GET /v1/results/:dropId/card`, `POST /v1/shares`, `GET /c/:shortId` | `shares`, `matches`                                                  | BullMQ: `cards`                      | `renderCard`            | satori, resvg-js, qrcode, R2   |
| **F9**     | Streaks & Milestones    | Header Flame, S9 Recap        | `GET /v1/me`                                                         | `users`, `streak_log`, `milestones`                                  | —                                    | `matchFinal`            | canvas-confetti, date-fns      |
| **F10**    | History Archive         | S10 History                   | `GET /v1/history`                                                    | `submissions`, `matches`, `drops`                                    | —                                    | —                       | TanStack Query                 |
| **F13**    | Notifications           | Me Settings, Reminder Sheet   | `POST /v1/me/push-subscription`                                      | `devices`, `notification_prefs`, `notifications_log`                 | BullMQ: `notifications`              | `sendPush`              | web-push, VAPID                |
| **F14**    | Settings & Privacy      | S14 Me                        | `GET/PATCH /v1/me`, `DELETE /v1/me`, `POST /v1/me/export`            | `users`, `data_exports`                                              | BullMQ: `cleanup`                    | `cleanup`, `export`     | Radix Switch, S3 client        |
| **F16**    | Content Moderation      | Report Sheet                  | `POST /v1/reports`                                                   | `reports`                                                            | —                                    | —                       | Radix Dialog, Zod              |
| **F17**    | Admin Tool              | `/admin/*`                    | `/admin/batches/*`, `/admin/drops/*`, `/admin/questions/*`           | `question_batches`, `questions`, `drops`, `audit_log`, `app_content` | `drop:{id}:json`                     | `stageDrop`             | Next.js, Zod, Prisma           |

---

## 5. Monorepo Folder Structure

```
oddly/
├── apps/
│   ├── web/                     # Public player web application (Next.js 14 App Router, PWA)
│   │   ├── src/app/             # Web routes: /, /play, /result, /recap, /history, /me, /c/[shortId]
│   │   ├── src/components/      # UI components: ui/, play/, result/, share/, layout/
│   │   ├── src/lib/             # Client wiring: api client, hooks, push worker, analytics
│   │   ├── src/styles/          # CSS globals and design token variables
│   │   └── public/              # Icons, manifest.json, custom SVG illustrations, sounds
│   └── admin/                   # Internal question authoring, import, and scheduling tool
├── services/
│   ├── api/                     # High-throughput Fastify REST API
│   │   ├── src/routes/          # Route handlers: drop, submissions, results, history, auth, me, admin
│   │   ├── src/plugins/         # Fastify plugins: auth, cors, rate-limit, zod-provider, cookies
│   │   ├── src/modules/         # Domain logic: matching, oddness, streaks, cards, content
│   │   └── src/db/              # Prisma client singleton and repository access layer
│   └── worker/                  # Asynchronous BullMQ background worker service
│       └── src/jobs/            # Schedulers: stageDrop, openDrop, matchProvisional, matchFinal, renderCard
├── packages/
│   ├── shared/                  # Universal pure logic: scoring math, Zod schemas, types, copy keys
│   ├── api-client/              # Typed HTTP client used by web and worker applications
│   └── ui-tokens/               # Design tokens, Tailwind CSS preset, color constants
├── infra/                       # Docker Compose for local PostgreSQL 16 & Redis 7, deployment runbooks
├── prisma/                      # schema.prisma, migration history, and dynamic seed scripts
├── seed/                        # Seed JSON files (oddly_batch_001_first_14_days.json, content, palettes)
├── architecture.md              # System architecture and technical blueprint
├── product.md                   # Product specification and core loop definitions
├── rules.md                     # Coding standards, error policies, Definition of Done
├── design.md                    # Visual tokens, typography, component specs, screen layouts
├── task.md                      # Phase breakdown, task tracking, progress metrics
├── memory.md                    # Living project memory, ADR logs, environment notes
├── package.json                 # Monorepo root package configuration
├── pnpm-workspace.yaml          # PNPM workspace package declarations
├── turbo.json                   # Turborepo task pipeline definitions
└── .env.example                 # Documented environment variable templates
```

---

## 6. Data Model (PostgreSQL via Prisma)

All primary keys are UUIDs (`id UUID DEFAULT gen_random_uuid()`). All tables include `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()`.

```mermaid
erDiagram
    users ||--o{ auth_identities : has
    users ||--o{ refresh_tokens : owns
    users ||--o{ devices : registers
    users ||--o{ submissions : submits
    users ||--o{ matches : pairs
    users ||--o{ streak_log : logs
    users ||--o{ shares : generates
    drops ||--o{ drop_questions : contains
    drops ||--o{ submissions : receives
    drops ||--o{ matches : evaluates
    questions ||--o{ drop_questions : slotted
    question_batches ||--o{ questions : groups
    palettes ||--o{ palette_colours : defines
    palettes ||--o{ questions : styles
    submissions ||--o{ answers : records
```

### 6.1 Database Schema Table Catalog

1. **`users`:** Core user entity (guests and registered players).
   - Columns: `id` (UUID, PK), `display_alias` (TEXT), `country_code` (VARCHAR(2)), `state_code` (VARCHAR(10)), `age_band` (VARCHAR(10)), `birth_year` (INT, nullable), `locale` (VARCHAR(5) DEFAULT 'en'), `is_adult_confirmed` (BOOLEAN), `streak_current` (INT DEFAULT 0), `streak_best` (INT DEFAULT 0), `status` (ENUM: active, flagged, deleted), `share_region` (BOOLEAN DEFAULT true), `is_guest` (BOOLEAN DEFAULT true).
2. **`auth_identities`:** Linked authentication credentials.
   - Columns: `id` (UUID, PK), `user_id` (UUID, FK), `provider` (ENUM: google, phone, apple), `provider_uid` (TEXT, encrypted), `phone_hash` (TEXT, nullable).
3. **`devices`:** Device installations and push tokens.
   - Columns: `id` (UUID, PK), `user_id` (UUID, FK, nullable), `device_hash` (TEXT, unique), `platform` (TEXT), `push_subscription` (JSONB, encrypted), `last_seen` (TIMESTAMPTZ).
4. **`palettes` & `palette_colours`:** Dynamic 12-colour question palettes.
   - Columns (`palettes`): `id` (UUID, PK), `name` (TEXT), `slug` (TEXT, unique), `status` (TEXT).
   - Columns (`palette_colours`): `id` (UUID, PK), `palette_id` (UUID, FK), `position` (INT), `label` (TEXT), `hex_value` (VARCHAR(7)).
5. **`assets`:** SVG illustrations and static graphical assets.
   - Columns: `id` (UUID, PK), `asset_key` (TEXT, unique), `storage_url` (TEXT), `alt_text_i18n` (JSONB), `license` (TEXT), `status` (TEXT).
6. **`question_batches`:** Imported batches of question drafts.
   - Columns: `id` (UUID, PK), `batch_name` (TEXT), `source` (TEXT), `author` (TEXT), `status` (ENUM: draft, in_review, approved, rejected).
7. **`questions`:** Authoritative question library.
   - Columns: `id` (UUID, PK), `batch_id` (UUID, FK, nullable), `type` (ENUM: pick_one_text, pick_one_image, number, colour, word), `text_i18n` (JSONB), `options_json` (JSONB), `palette_id` (UUID, FK, nullable), `category` (TEXT), `status` (ENUM: draft, in_review, approved, scheduled, live, retired, evergreen), `panel_entropy` (FLOAT, nullable), `created_by` (TEXT), `approved_by` (TEXT).
8. **`drops`:** Daily 24-hour question instances.
   - Columns: `id` (UUID, PK), `drop_date` (DATE, unique), `opens_at` (TIMESTAMPTZ), `closes_at` (TIMESTAMPTZ), `status` (ENUM: draft, scheduled, live, closed, final), `sponsor_id` (UUID, nullable).
9. **`drop_questions`:** Question slot assignment (exactly 5 per drop).
   - Columns: `id` (UUID, PK), `drop_id` (UUID, FK), `question_id` (UUID, FK), `position` (INT 1-5). Unique: `(drop_id, position)`.
10. **`submissions`:** Verified player submissions.
    - Columns: `id` (UUID, PK), `drop_id` (UUID, FK), `user_id` (UUID, FK), `device_id` (UUID, FK), `request_id` (UUID, unique), `submitted_at` (TIMESTAMPTZ), `duration_ms` (INT), `flags` (TEXT[]). Unique: `(drop_id, user_id)`.
11. **`answers`:** Individual question choices.
    - Columns: `id` (UUID, PK), `submission_id` (UUID, FK), `question_id` (UUID, FK), `option_id` (TEXT, nullable), `number_value` (INT, nullable), `vector_hash` (TEXT).
12. **`matches`:** Provisional and locked final twin relationships.
    - Columns: `id` (UUID, PK), `drop_id` (UUID, FK), `user_id` (UUID, FK), `twin_user_id` (UUID, FK, nullable), `similarity` (FLOAT), `matched_count` (INT), `matched_question_ids` (UUID[]), `oddness_bits` (FLOAT), `oddness_percentile` (FLOAT), `tier` (ENUM: common, uncommon, rare, mythic), `is_final` (BOOLEAN DEFAULT false), `region_shown` (TEXT), `age_band_shown` (TEXT). Unique: `(drop_id, user_id, is_final)`.
13. **`streak_log`:** Historical streak completion audit.
    - Columns: `id` (UUID, PK), `user_id` (UUID, FK), `drop_id` (UUID, FK), `completed` (BOOLEAN). Unique: `(user_id, drop_id)`.
14. **`shares`:** Viral link and card tracking.
    - Columns: `id` (UUID, PK), `user_id` (UUID, FK), `drop_id` (UUID, FK), `short_id` (VARCHAR(12), unique), `channel` (TEXT), `card_urls` (JSONB).
15. **`app_content`:** Dynamic UI copy keys and localizations.
    - Columns: `id` (UUID, PK), `key` (TEXT), `locale` (VARCHAR(5)), `value` (TEXT), `version` (INT), `status` (TEXT). Unique: `(key, locale)`.
16. **`app_config`:** System-wide runtime parameters.
    - Columns: `id` (UUID, PK), `key` (TEXT, unique), `json_value` (JSONB), `version` (INT).
17. **`tier_definitions`:** Dynamic rarity tier brackets.
    - Columns: `id` (UUID, PK), `tier_name` (TEXT, unique), `min_percentile` (FLOAT), `max_percentile` (FLOAT), `badge_style_key` (TEXT).
18. **`reports` & `audit_log`:** Moderation intake and admin audit trails.

---

## 7. Redis Key Architecture

| Key Pattern                 | Data Structure         | TTL                                 | Purpose                                                   |
| --------------------------- | ---------------------- | ----------------------------------- | --------------------------------------------------------- |
| `drop:{id}:json`            | String (JSON)          | Window close + 7 days               | Pre-compiled Drop document served to clients              |
| `drop:{id}:players`         | Integer Counter        | Window close + 7 days               | Atomic count of all submitted players today               |
| `drop:{id}:count:{q}:{opt}` | Integer Counter        | Window close + 7 days               | Atomic selection count $C(a)$ for option $a$              |
| `drop:{id}:vec:{userId}`    | String (5-byte / Hash) | Final batch + 1 day                 | Compact answer vector for in-memory Stage A matching      |
| `drop:{id}:bucket:{hash}`   | Set of User IDs        | Final batch + 1 day                 | Sub-combination buckets for Stage B scaling (reserved)    |
| `idem:{requestId}`          | String (JSON result)   | 24 hours                            | Prevents duplicate processing of submissions              |
| `rl:{ip/user}:{route}`      | Counter                | 1 to 60 seconds                     | Rate limiting window counters                             |
| `content:{locale}:bundle`   | String (JSON)          | Indefinite (invalidated on publish) | Consolidated dynamic UI copy bundle                       |
| `config:public`             | String (JSON)          | Indefinite (invalidated on publish) | Client-visible runtime settings (k-anonymity, thresholds) |

---

## 8. API Specification Outline

All API endpoints are versioned under `/v1`, validate payloads with Zod, and return structured error objects on failure.

| Method | Path                        | Auth Required       | Request Payload Summary                                                                       | Response Summary                                                                                  |
| ------ | --------------------------- | ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`                   | Public              | None                                                                                          | `{ ok: true, service: "api", time: "..." }`                                                       |
| `GET`  | `/v1/drop/today`            | Public              | None                                                                                          | `{ drop: { id, opens_at, closes_at, status, questions: [...] }, players_today: 3482 }`            |
| `POST` | `/v1/submissions`           | Guest or User       | `{ drop_id, answers: [{ question_id, option_id?, number_value? }], duration_ms, request_id }` | `{ result: { similarity, matched_count, oddness_percentile, tier, twin: { region, age_band } } }` |
| `GET`  | `/v1/results/:dropId`       | Owner               | None                                                                                          | Full provisional or final result payload                                                          |
| `GET`  | `/v1/results/:dropId/card`  | Owner               | None                                                                                          | `{ status: "ready", cards: { story_url, square_url, link_url } }`                                 |
| `GET`  | `/v1/history`               | Owner               | `?cursor=...&limit=10`                                                                        | `{ items: [{ drop_date, score, tier, region }], next_cursor }`                                    |
| `GET`  | `/v1/world/:dropId`         | Public (Post-Close) | None                                                                                          | `{ total_players, rarest_pick: {...}, most_popular: {...} }`                                      |
| `GET`  | `/v1/content/:locale`       | Public              | None                                                                                          | `{ locale: "en", hash: "a1b2...", copy: { "landing.title": "..." } }`                             |
| `GET`  | `/v1/config/public`         | Public              | None                                                                                          | `{ drop_start_time_ist: "07:00", k_anonymity_min: 20 }`                                           |
| `POST` | `/v1/auth/oauth`            | Public              | `{ provider: "google", id_token: "..." }`                                                     | Sets `oddly_at` and `oddly_rt` HTTP-only cookies; returns User                                    |
| `POST` | `/v1/auth/merge-guest`      | User                | `{ guest_device_id: "uuid" }`                                                                 | `{ ok: true, merged_submissions_count: 5 }`                                                       |
| `POST` | `/v1/me/push-subscription`  | Guest/User          | `{ endpoint, keys: { p256dh, auth } }`                                                        | `{ ok: true }`                                                                                    |
| `POST` | `/v1/reports`               | Guest/User          | `{ target_type, target_id, reason, note? }`                                                   | `{ ok: true }`                                                                                    |
| `POST` | `/admin/batches/import`     | Admin               | Multipart JSON/CSV batch file                                                                 | `{ batch_id, validation_report: { errors: [], warnings: [] } }`                                   |
| `POST` | `/admin/drops/:id/approve`  | Approver            | `{ drop_id }`                                                                                 | `{ ok: true, status: "approved" }`                                                                |
| `POST` | `/admin/questions/:id/pull` | Admin               | `{ question_id, reason }`                                                                     | `{ ok: true, recomputed_matches_count: 3482 }`                                                    |

---

## 9. Environment Variables Specification

| Variable Name          | Component   | Secret? | Default / Example Value                       | Description                                                  |
| ---------------------- | ----------- | ------- | --------------------------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`             | All         | No      | `development`                                 | Runtime environment (`development`, `staging`, `production`) |
| `PORT`                 | API         | No      | `4000`                                        | Port on which Fastify listens                                |
| `WEB_URL`              | Web / API   | No      | `http://localhost:3000`                       | Public URL of web client                                     |
| `API_URL`              | Web         | No      | `http://localhost:4000`                       | Direct backend API URL for Next.js rewrites                  |
| `DATABASE_URL`         | API, Worker | **YES** | `postgresql://user:pass@localhost:5432/oddly` | PostgreSQL connection string                                 |
| `REDIS_URL`            | API, Worker | **YES** | `redis://localhost:6379`                      | Redis connection string                                      |
| `JWT_ACCESS_SECRET`    | API         | **YES** | `min-32-chars-random-secret`                  | Key used to sign 15-minute access JWTs                       |
| `JWT_REFRESH_SECRET`   | API         | **YES** | `min-32-chars-random-secret`                  | Key used to sign rotating refresh tokens                     |
| `ENCRYPTION_KEY`       | API         | **YES** | `32-byte-hex-encoded-secret`                  | AES-256-GCM key for encrypting push tokens and PII           |
| `GOOGLE_CLIENT_ID`     | Web, API    | No      | `xxx.apps.googleusercontent.com`              | Google OAuth Client ID                                       |
| `GOOGLE_CLIENT_SECRET` | API         | **YES** | `GOCSPX-xxx`                                  | Google OAuth Client Secret                                   |
| `TURNSTILE_SITE_KEY`   | Web         | No      | `0x4AAAAAA...`                                | Cloudflare Turnstile public widget key                       |
| `TURNSTILE_SECRET_KEY` | API         | **YES** | `0x4AAAAAA...`                                | Cloudflare Turnstile verification secret                     |
| `VAPID_PUBLIC_KEY`     | Web, Worker | No      | `BEl...`                                      | Web Push public application server key                       |
| `VAPID_PRIVATE_KEY`    | Worker      | **YES** | `secret...`                                   | Web Push private signing key                                 |
| `VAPID_SUBJECT`        | Worker      | No      | `mailto:security@oddly.app`                   | Contact URI for Web Push delivery services                   |
| `R2_ACCOUNT_ID`        | Worker      | **YES** | `cloudflare-account-id`                       | Cloudflare account identifier                                |
| `R2_ACCESS_KEY_ID`     | Worker      | **YES** | `r2-access-key`                               | Cloudflare R2 access key ID                                  |
| `R2_SECRET_ACCESS_KEY` | Worker      | **YES** | `r2-secret-key`                               | Cloudflare R2 secret access key                              |
| `R2_BUCKET`            | Worker      | No      | `oddly-share-cards`                           | Target bucket name                                           |
| `R2_PUBLIC_BASE_URL`   | Worker, Web | No      | `https://cards.oddly.app`                     | Public CDN base URL for share cards                          |
| `POSTHOG_KEY`          | Web, API    | No      | `phc_xxx`                                     | PostHog public project token                                 |
| `POSTHOG_HOST`         | Web, API    | No      | `https://us.i.posthog.com`                    | PostHog ingestion host                                       |
| `SENTRY_DSN`           | All         | No      | `https://xxx@sentry.io/yyy`                   | Sentry error tracking endpoint                               |
| `DROP_START_TIME_IST`  | API, Worker | No      | `07:00`                                       | Universal drop release time                                  |
| `CLOCK_ACCELERATION`   | Worker      | No      | `false`                                       | Staging flag: accelerates drop cycle to 10 mins              |
| `FEATURE_PHONE_OTP`    | Web, API    | No      | `false`                                       | Feature flag gating Phone OTP login                          |

---

## 10. Architecture Decision Records (ADRs)

### ADR 001: Monorepo with pnpm Workspaces & Turborepo

- **Date:** 2026-11-07
- **Context:** Need to share scoring algorithms, Zod schemas, design tokens, and API client types between Next.js, Fastify, and BullMQ worker.
- **Decision:** Use pnpm workspaces with Turborepo for pipeline caching.
- **Consequence:** Zero code duplication; single typecheck and lint command verifies the entire repository.

### ADR 002: TypeScript Strict Mode Everywhere

- **Date:** 2026-11-07
- **Context:** Solo-founder operational scale demands defect prevention at compile time.
- **Decision:** Enable `strict: true`, `noImplicitAny: true`, and prohibit `any` across all packages.
- **Consequence:** Higher initial authoring rigor; virtually eliminates runtime null-pointer exceptions.

### ADR 003: Web-First Responsive PWA (Deferring Native Apps)

- **Date:** 2026-11-07
- **Context:** Need to test product hypothesis with minimum capital expenditure and zero app store approval friction.
- **Decision:** Build a responsive Next.js Progressive Web App (PWA) with Web Push; defer native iOS/Android (Expo) to v1.1.
- **Consequence:** Immediate cross-platform reach; viral links open directly in mobile browsers without install barriers.

### ADR 004: Strict Architectural Prohibition of Chat

- **Date:** 2026-11-07
- **Context:** User-matching apps typically degrade into unmoderated dating chats or harassment vectors.
- **Decision:** Eliminate chat, free-text messaging, and profile bios entirely. The reveal card is the final destination.
- **Consequence:** Massive reduction in trust-and-safety overhead, zero content moderation liability, complete compliance with privacy standards.

### ADR 005: PostgreSQL as Authoritative Source of Truth; Redis for Counters & Queues

- **Date:** 2026-11-07
- **Context:** Submissions require strict transactional integrity, while the daily morning drop requires sub-millisecond atomic counter increments.
- **Decision:** PostgreSQL 16 stores authoritative relational entities; Redis 7 handles live option counters ($C(a)$), vector caches, rate limits, and BullMQ queues.
- **Consequence:** Clean separation of durable historical state from high-concurrency ephemeral operations.

### ADR 006: Server-Rendered Share Cards via Satori

- **Date:** 2026-11-07
- **Context:** Client-side HTML canvas rendering suffers from font-loading glitches and device-specific rendering inconsistencies.
- **Decision:** Generate share card PNGs server-side in BullMQ worker using `satori` and `@resvg/resvg-js`.
- **Consequence:** Flawless visual consistency across Story, Square, and Open Graph previews; cards are pre-cached in Cloudflare R2.

### ADR 007: Everything Dynamic from Database (Override Addendum)

- **Date:** 2026-11-07
- **Context:** Founder requires that nothing content-like is hard-coded in source files.
- **Decision:** Store questions, palettes, assets, copy, pages, configs, and notification templates in PostgreSQL. Expose them via cached endpoints (`/v1/content/:locale`, `/v1/drop/today`).
- **Consequence:** Editorial team can update copy, introduce palettes, and schedule batches without triggering code deploys.

### ADR 008: Generic Question Renderer Engine

- **Date:** 2026-11-07
- **Context:** Application must dynamically support new questions, image sets, or word selections from database schemas.
- **Decision:** Build a polymorphic question renderer in `@oddly/shared` and `apps/web` that dynamically renders the appropriate UI based on the `type` discriminator in the question JSON.
- **Consequence:** Zero frontend code changes needed when publishing new Drops.
