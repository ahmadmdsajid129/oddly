# Architecture and Technical Specification — Oddly v1

> **The Reliability Promise:**  
> *"No acknowledged submission is ever lost, the Drop is always reachable, and when we are overloaded we shed non-essential work first and say so honestly."*

**Project:** Oddly v1 | **Last updated:** 2026-11-10 | **Owner:** Senior System Designer & SRE + Founder  
**Purpose of this file:** System architecture, complete tech stack, scaling plan, edge caching, data models, Redis schema, API specifications, component lifecycles, degradation ladder, and deployment infrastructure.

---

## 1. System Overview & Service Level Objectives (SLOs)

Oddly is architected as an ultra-high-throughput, low-latency, mobile-first Web Application (PWA) and API designed to withstand extreme diurnal traffic spikes (around the 07:00 IST daily Drop). The platform combines edge caching, distributed in-memory evaluation, graceful degradation, and asynchronous worker pools to guarantee zero data loss.

### 1.1 Service Level Objectives (SLOs)

*Planning targets to be validated and tuned via load testing.*

| Area / Service | Target SLO | Measurement Methodology | Operational Context |
|---|---|---|---|
| **Play-Path Availability** | **99.9%** Monthly<br>**99.95%** 07:00–08:00 IST | Synthetic play-flow probe every 60 s from 3 global regions + real-user error rate | Core user loop: load Drop -> answer 5 picks -> submit -> view result |
| **`GET /v1/drop/today`** | **p95 < 100 ms**<br>Edge hit ratio > 99% | Cloudflare CDN Analytics | Pre-published and edge cached |
| **`POST /v1/submissions`** | **p95 < 500 ms**<br>p99 < 1,500 ms<br>Error rate < 0.5% | Fastify API metrics (`prom-client`) | At planned peak (1,100 submissions/sec) |
| **`GET /v1/results/:dropId`** | **p95 < 400 ms** | Fastify API metrics | Instant provisional or locked results |
| **Submission Durability** | **100% (Zero Loss)** | Reconciliation job: acknowledged `request_id`s vs stored DB rows | No acknowledged submission is ever dropped |
| **Final Batch Completion** | **99% of days by 07:10 IST**<br>100% by 07:20 IST | BullMQ pipeline timer & audit log | Finalizes exact percentiles and streaks |
| **Share Card Readiness** | **p95 < 5 seconds** | Worker queue latency | Satori + Resvg worker pipeline |
| **Share Landing (`/c/:shortId`)** | **p95 < 200 ms**<br>Edge hit ratio > 95% | Cloudflare CDN Analytics | Viral landing page delivery |
| **Push Delivery Start** | First batch at 07:00 IST<br>All batches in < 10 min | Notification worker queue metrics | Staggered 5,000/batch slices |
| **Disaster Recovery** | **RTO < 30 minutes**<br>**RPO < 5 minutes** | Quarterly disaster recovery drills | Time to restore service & max data loss |

*Error Budget Policy:* 99.9% monthly allows 43.2 minutes of downtime/degraded service per month. If > 50% of monthly budget burns, feature releases freeze immediately until reliability is restored.

### 1.2 Resource Scarcity Priorities (Strict Order)

When capacity is constrained, work is preserved or shed in strict order:
1. **Accept and durably store submissions** *(Highest priority — never shed)*
2. **Serve the Drop JSON and the client app shell**
3. **Show the user a result (provisional is acceptable)**
4. **Generate server-rendered share cards**
5. **History, settings, and streak summaries**
6. **Push notifications dispatch**
7. **Analytics events and live player counters**
8. **Internal admin tooling and panel testing** *(Lowest priority — shed first)*

---

## 2. Load Model & Capacity Summary

See [`docs/capacity-model.md`](file:///e:/Oddly/docs/capacity-model.md) for full derivations, memory formulas, and testing logs.

| Quantity | Baseline Planning Value | Derivation / Notes |
|---|---|---|
| **Planned Peak Scale** | 10,00,000 (10 lakh) daily players | Target scale ceiling for Oddly v1.0 |
| **07:00–07:30 IST Traffic Share** | 40% = 4,00,000 sessions | Peak morning diurnal spike |
| **Average Session Arrival Rate** | ~222 sessions / second | 4,00,000 / 1,800 s |
| **Burst Factor over Average** | 5.0x | Surge at 07:00 notification opening |
| **Peak Session Arrival Rate** | ~1,100 sessions / second | 222 x 5.0 |
| **Peak Requests per Second (Total)** | ~4,400 RPS | ~4 API calls per session |
| **Peak Origin Requests (Non-CDN)** | ~2,200 to 2,800 RPS | Submissions, personalized results, telemetry |
| **Peak Submissions per Second** | ~1,100 submissions / second | One per completed session |
| **Database Row Inserts per Second** | ~7,700 rows / second | 7 rows per submission (sub + 5 answers + match) |
| **Redis Vector Memory (10 Lakh Players)** | ~220 MB per Drop | 5-byte compact binary vectors in Redis |
| **Design Headroom Target** | **2.0x planned peak (2,200 submits/s)** | Meets SLOs with zero degradation |
| **Degradation Stress Envelope** | **Up to 5.0x peak (5,500 submits/s)** | Graceful degradation L1 -> L3; zero crash loops |
| **Viral Share Scenario** | 5,00,000 visitors in 10 minutes | > 95% served directly from Cloudflare edge |

---

## 3. Non-Negotiable System Design Principles

1. **Cache First:** Anything identical for many users is an immutable CDN object (Drop JSON, content bundle, pages, share cards, landing pages). The origin only processes personalized or write operations.
2. **Stateless Application Servers:** Any API instance can die at any time with zero player impact. All state resides in PostgreSQL, Redis, or object storage.
3. **PostgreSQL is Source of Truth; Redis is Fast Cache & Queue:** Live counters in Redis must be reconstructible from PostgreSQL via scheduled reconciliation.
4. **Idempotency Everywhere:** Same `request_id`, same effect, same response. Every queue job is safe to execute multiple times.
5. **Bounded Everything:** Bounded queues, bounded retries with jitter, bounded candidate sets (max 5,000), bounded page sizes, bounded payload limits (4 KB). No unbounded loops anywhere.
6. **Timeouts and Circuit Breakers on All Outbound Calls:** Database, Redis, R2, Push gateways, Google Auth, and Turnstile all enforce strict deadlines with `opossum` circuit breakers.
7. **Isolate Failures (Bulkheads):** Separate worker pools and Redis roles for live submissions, matching, card rendering, notifications, and final batch.
8. **Shed Load Deliberately:** Rate limit at edge and API; reject early and cheaply with `429` or `503` plus `Retry-After`; adhere to the degradation ladder.
9. **Keep CPU off the Event Loop:** Satori/Resvg card rendering, heavy matching, and compression run in worker threads (`piscina`) or dedicated workers, never blocking request I/O.
10. **Observe Before You Scale:** No scaling step is taken without an exported metric proving the need and a load test proving the fix.
11. **Boring Technology, Minimal Moving Parts:** Adopt components only when promotion triggers fire; design clean interfaces so swapping components is straightforward.
12. **Everything Dynamic Stays Dynamic:** Copy, config, and flags come from the database through cached layers. Kill switches and degradation levels live in `app_config` and change in seconds without deploys.
13. **Fail Honestly:** When degraded, communicate honestly in brand voice. Never fabricate data, never silently drop a submission.
14. **Time is Server Time:** Clients never decide if a Drop is open. Client countdowns synchronize against the server `Date` header offset.
15. **Safe Delivery:** Zero-downtime deploys, backward-compatible expand/contract migrations, canary releases, and deploy freezes around the 07:00 IST window.

---

## 4. Scale Tiers Architecture

See [`docs/scaling-plan.md`](file:///e:/Oddly/docs/scaling-plan.md) for full architectural roadmap and cost projections.

| Tier | Daily Players | Peak Submissions / sec | Infrastructure Topology | Promotion Trigger (Move Up When) |
|---|---|---|---|---|
| **T0** | Up to 1,000 | ~1 – 5 | 1 API instance, 1 worker, starter Postgres & Redis, CDN | Sustained peak > 20 req/s, or CPU > 60% at peak |
| **T1** | 1,000 to 10,000 | ~10 – 25 | 2 API instances, 1 worker, managed Postgres with pooler, persistent Redis | DB CPU > 60% at peak, p95 submit > 300 ms, or > 8,000 players |
| **T2** | 10,000 to 1,00,000 | ~100 – 250 | 3 to 6 API instances, separate worker pools, multi-role Redis, Postgres replica | > 80,000 players, queue lag > 30 s at peak, or DB write saturation |
| **T3** | 1,00,000 to 10,00,000 | ~1,100 (2x: 2,200) | 10 to 40 API instances, dedicated Postgres primary + pooler + replicas, Redis Cluster | > 8,00,000 players or breaking point found in load test |
| **T4** | > 10,00,000 | > 2,500+ | Multi-region reads, sharded counters, vector search service, managed stream | Strategic business decision and funded dedicated SRE plan |

- **Build Now (v1.0):** CDN edge caching; stateless Fastify API; idempotent submissions; Redis atomic counters; BullMQ workers with isolated queues; rate limits; timeouts & circuit breakers; `@fastify/under-pressure` load shedding; degradation ladder L0–L4; range partitioning by `drop_date`; zero-downtime migrations; k6 load test harness.
- **Design Now, Build on Trigger:** Mode B async persist; matching Stage B bucket index & Stage C ANN; Redis role split; Postgres read replica; sharded hot counters; progressive final batch chunking.
- **Explicitly Rejected for v1.0:** Kubernetes (revisit at T4); Microservices beyond Web/API/Worker; Apache Kafka; Multi-region active-active writes; GraphQL; WebSockets/SSE for live counts.

---

## 5. Edge and Caching Architecture

Cloudflare sits in front of all services. Over 95% of requests never reach the origin at planned peak.

### 5.1 Edge Cache Policy Table

| Resource | Cache-Control Header | Edge Behavior & Revalidation |
|---|---|---|
| **App Shell & Static Assets** | `public, max-age=31536000, immutable` | Hashed filenames, fonts, SVG icons, compiled JS/CSS |
| **`GET /v1/drop/today`** | `public, s-maxage=5, stale-while-revalidate=30, stale-if-error=3600` | Pre-staged immutable JSON at `/v1/drops/:id.json`; pointer flips at 07:00 |
| **`GET /v1/content/:locale`** | Hash-versioned URL cached 1 year; pointer `s-maxage=60, stale-while-revalidate=600` | Dynamic content bundle; instant purge on admin publish |
| **`GET /v1/pages/:slug`** | `s-maxage=300, stale-while-revalidate=3600` | On-demand ISR revalidation on admin CMS publish |
| **`GET /v1/config/public`** | `s-maxage=30, stale-while-revalidate=300` | Delivers active degradation level and runtime settings |
| **Live Players Count (`/v1/stats/today`)** | `s-maxage=10, stale-while-revalidate=60` | Never computed per request; read from cached Redis counter |
| **Share Card Images** | `public, max-age=31536000, immutable` | Content-hashed storage keys in Cloudflare R2 |
| **Share Landing (`/c/:shortId`)** | `s-maxage=300, stale-while-revalidate=86400` | Fully edge-cacheable; zero PII rendered on landing |
| **`GET /v1/world/:dropId`** | `s-maxage=300` then immutable after finalization | World stats cached at edge once Drop closes |
| **Personalized Endpoints (`/results`, `/history`, `/me`)** | `private, no-store` | Never cached at edge; ETag support where applicable |

### 5.2 Thundering-Herd Defenses
- **Origin Shielding & Tiered Caching:** Thousands of concurrent edge misses coalesce into a single origin fetch.
- **Pre-Publish at 06:30 IST:** The staged Drop JSON is uploaded to R2/CDN 30 minutes before release. At 07:00:00, the pointer endpoint flips instantly. The API rejects submissions before `opens_at`.
- **Client-Side Jitter:** At 00:00:00 countdown, client waits `Math.random() * 4000` ms before requesting today's drop.
- **Push Notification Stagger:** 5,000 notifications dispatched per slice, 20 seconds apart.

---

## 6. Frontend Architecture for Scale (`apps/web`)

### 6.1 State Management (ADR 010)
- **Server Data (`TanStack Query`):** Automatic caching, deduplication, background polling with backoff and jitter, ETag 304 handling, offline persistence.
- **Client Draft & UI State (`Zustand` with `persist` middleware):** Lightweight (< 1 KB), selector-driven rendering. Draft answers and pending `request_id`s persist in `localStorage` so page refreshes never lose picks.
- **Redux Toolkit is Rejected:** Unnecessary bundle weight (~30 KB) against our 150 KB budget on 4G low-end Android devices.

### 6.2 Rendering & Delivery Strategy
- **Static App Shell:** Statically generated landing shell with Next.js App Router; personalized parts (streak, results) populate via TanStack Query after initial paint.
- **Performance Budgets Enforced in CI:** Initial JS < 150 KB compressed; Total page weight < 500 KB; LCP < 2.5 s and INP < 200 ms on 4G mobile.
- **Service Worker (`Serwist`):** Precaches static shell, offline page (`/offline`), and last-known-good content bundle.

### 6.3 Network Behavior & Anti-DDoS Discipline
- **Retry Rules:** Idempotent requests retry up to 5 times with exponential backoff (500 ms, 1 s, 2 s, 4 s, 8 s) plus full jitter; always honor `Retry-After`.
- **Polling Discipline:** Result polling uses ETag/304, backs off from 30 s to 5 min, pauses when the tab is hidden (Page Visibility API), and respects the degradation level.
- **Client Submission Safety:** Drafts and pending `request_id`s remain in local storage until the server returns confirmed result persistence.

---

## 7. API Layer for Scale (`services/api`)

1. **Stateless Fastify Services:** Behind a load balancer with `/health` (liveness) and `/ready` (readiness checking DB & Redis) endpoints. Graceful shutdown: on `SIGTERM`, stops taking traffic, drains in-flight requests (up to 25 s), closes pools, exits cleanly.
2. **Load Shedding (`@fastify/under-pressure`):** Monitors event-loop delay, heap size, and RSS. When thresholds are exceeded, immediately returns HTTP `503 Overloaded` with `Retry-After` before attempting heavy work.
3. **Connection Hygiene:** Bounded connection pool per instance matching PgBouncer limits. Never open connections per request.

### 7.1 Per-Route Policy Table

| Route | Method | Timeout | Rate Limit | Cache Policy | Idempotency | Priority Lane | Degradation Behavior |
|---|---|---|---|---|---|---|---|
| `/health` | GET | 1 s | None | No-store | None | Core | Never shed |
| `/ready` | GET | 2 s | None | No-store | None | Core | Never shed |
| `/v1/drop/today` | GET | 3 s | 120/min/IP | Edge s-maxage=5 | None | Core | Serve stale from CDN if down |
| `/v1/drops/:id.json` | GET | 3 s | None | Edge immutable | None | Core | Served directly from CDN/R2 |
| `/v1/submissions` | POST | 5 s | 30/min/IP | No-store | `request_id` (24h) | **Critical** | Switch to Mode B async at L3 |
| `/v1/results/:dropId` | GET | 3 s | 60/min/IP | Private ETag | None | Core | Return provisional if matching slow |
| `/v1/results/:dropId/card`| GET | 10 s | 30/min/IP | Edge immutable | None | Medium | On-demand render only at L1/L2 |
| `/v1/stats/today` | GET | 2 s | 60/min/IP | Edge s-maxage=10 | None | Low | Serve cached counter; shed at L2 |
| `/v1/time` | GET | 1 s | 120/min/IP | Edge s-maxage=1 | None | Core | Clock synchronization header |
| `/v1/config/public` | GET | 2 s | 120/min/IP | Edge s-maxage=30 | None | Core | Reflects active degradation level |
| `/v1/content/:locale` | GET | 3 s | 60/min/IP | Edge s-maxage=60 | None | Core | Serve last-known-good cached bundle |
| `/v1/history` | GET | 4 s | 30/min/IP | Private no-store | None | Medium | Route to replica; shed at L2 |
| `/v1/world/:dropId` | GET | 4 s | 60/min/IP | Edge s-maxage=300 | None | Low | Stale numbers up to 10 min at L2 |
| `/v1/auth/*` | POST | 5 s | 10/min/IP | No-store | None | Medium | Guest play only at L3 |
| `/v1/me/*` | GET/PUT | 4 s | 30/min/IP | Private no-store | None | Medium | Shed at L2/L3 |
| `/v1/reports` | POST | 4 s | 10/min/IP | No-store | None | Medium | Queued in BullMQ |
| `/admin/*` | ALL | 10 s | 120/min/IP | No-store | None | Low | Block writes at L2/L3 |

---

## 8. Data Layer & Multi-Role Redis

### 8.1 PostgreSQL 16 Architecture
- **Connection Pooler:** PgBouncer in transaction mode; separate DB credentials/roles for API, worker, and admin with custom statement timeouts.
- **Range Partitioning from Day One:** `submissions`, `answers`, `matches`, and `answer_stats` range-partitioned by `drop_date`. Scheduled job creates future partitions 14 days in advance (alerts if < 7 exist).
- **90-Day Retention Window:** Detailed `answers` rows compacted into user history summaries after 90 days; raw daily partitions dropped.
- **Zero-Downtime Migration Rules:** Expand -> Migrate -> Contract. No exclusive table locks; create indexes `CONCURRENTLY`.

### 8.2 Multi-Role Redis 7 Topology
Redis instances are segmented by logical role with dedicated eviction policies:
1. **`cache` Role (`allkeys-lru`):** Drop JSON, dynamic content bundles, public config, rate limits. Eviction safe.
2. **`counters-vectors` Role (`noeviction`, AOF `everysec`):** Live answer counters ($C(a)$) and player vectors. Never evicted. Reconstructible from Postgres via repair job.
3. **`queues` Role (`noeviction`, AOF `everysec`):** BullMQ job queues. Never evicted.

### 8.3 Ingestion Persistence Modes (A vs. B)
- **Mode A (Synchronous Ingestion — Default):** API writes submission, answers, and provisional match to PostgreSQL in a transaction, then updates Redis counters/vector, and responds with HTTP 200.
- **Mode B (Asynchronous Ingestion — Level L3):** API writes idempotency key and vector to Redis, appends submission to BullMQ `submit-persist` queue, and immediately responds with HTTP 202 (`"Saved. Finding your twin..."`). Worker micro-batches inserts to PostgreSQL. A reconciliation job ensures zero loss between acknowledged IDs and database rows.

---

## 9. Queues, Workers & Scheduler Safety (`services/worker`)

1. **Queue Bulkheads:** Separate BullMQ queues and workers: `submit-persist`, `match-provisional`, `match-final`, `card-render`, `notify`, `maintenance`, `export-delete`.
2. **Deterministic Idempotent Jobs:** Job IDs generated deterministically (e.g., `card:{userId}:{dropId}:{hash}`). Running a job twice produces identical results.
3. **CPU Offload:** Share card rendering (`satori` + `resvg`) and heavy matching run in worker threads (`piscina`) capped to available CPU cores.
4. **Scheduler Safety:** Single-leader execution via Redis/Postgres advisory lock and `scheduler_runs` unique table `(job_name, run_for)`. Missed cron runs catch up sequentially on reboot.

---

## 10. The Daily Pipeline at Scale

See [`docs/capacity-model.md`](file:///e:/Oddly/docs/capacity-model.md) for timeline hazard analysis.

- **06:30 IST (Staging):** Pre-publish immutable Drop JSON to CDN/R2; warm cache; pre-create next day's database partition; run synthetic health probe.
- **07:00 IST (Open):** Pointer endpoint flips to live; first notification slice released; Redis counter namespace switches.
- **Live Window (07:00 – 06:59 D+1):** Incremental provisional matching re-evaluates only players whose candidate buckets changed.
- **06:59 IST (Close):** Submissions close; persist queue drains; counter snapshot taken.
- **07:00 – 07:10 IST (Final Batch):** Runs in a dedicated worker pool capped at 25% DB connections. Partitioned into idempotent chunks (5,000 users/chunk). Results publish progressively; recap screens display locked twins as each chunk completes.

---

## 11. Matching at Scale

1. **`MatchingStrategy` Interface:** Decouples API from algorithm:
   - **Stage A (v1.0):** In-memory / Redis brute-force vector scan (suitable for up to 10,000 players).
   - **Stage B (T2+):** Exact-hash buckets, 4/5 sub-hash buckets, and 3/5 buckets.
   - **Stage C (T3+):** Approximate Nearest Neighbor (ANN / HNSW) index.
2. **Bounded Execution:** Maximum 5,000 candidate evaluations per submit request. Returns best candidate found; finishes evaluation asynchronously.
3. **Cached Probabilities:** $p(a)$ computed from in-memory cached counters refreshed every 5 seconds.
4. **Deterministic Tie-Breaking:** Seeded by `hash(drop_date, user_a, user_b)` ensuring identical twins across retries.

---

## 12. Graceful Degradation Ladder

Controlled dynamically via database `app_config.degradation_level` (L0 to L4). See [`docs/degradation-playbook.md`](file:///e:/Oddly/docs/degradation-playbook.md).

| Level | Name | Automated Trigger | System Adjustments | User Experience |
|---|---|---|---|---|
| **L0** | Normal | Healthy | All features active | Standard UI |
| **L1** | Conserve | submit p95 > 400 ms or CPU > 70% | Live count cached 60 s; matching refresh interval doubled; analytics sampled 50%; card pre-render on-demand | Live count shows subtle freshness label |
| **L2** | Protect Core | submit p95 > 800 ms or queue lag > 2m | Twin upgrade push paused; history/settings served stale; sign-up queued; admin writes locked | Banner: *"Busy right now. Your picks are safe."* |
| **L3** | Survive | Error rate > 2% or DB write saturation | **Mode B async persist active**; matching deferred; guest play only; push paused except Drop Live | Screen: *"Saved! Finding your twin... This may take a minute."* |
| **L4** | Static | Origin down / catastrophic | CDN serves cached shell and Drop JSON; client stores picks locally and retries for 6h | Banner: *"Picks saved safely on device. Will send automatically when reconnected."* |

*Hysteresis Rule:* Stepping down to a lower level requires **5 consecutive minutes** of healthy metrics below threshold.

---

## 13. Observability, Telemetry & Alerts

See [`docs/slo.md`](file:///e:/Oddly/docs/slo.md) for full alerting catalog.

- **Metrics (`prom-client`):** Four golden signals per route (latency, traffic, errors, saturation); event-loop delay; DB pool wait; Redis memory; queue depth and age.
- **Tracing (OpenTelemetry Node SDK):** Sampled at 1–5% (100% on errors); propagates `x-request-id` header across client, API, and database.
- **Structured Logging (`pino`):** High-performance JSON logging with `requestId`, status, duration. Zero PII logged.
- **Synthetic Probes:** Scripted play-flow executed every 60 s from 3 global regions. Public status page hosted externally.

---

## 14. Monorepo Folder Structure

```
oddly/
├── apps/
│   ├── web/                     # Public player web application (Next.js 14 App Router, PWA)
│   │   ├── src/app/             # Web routes: /, /play, /results, /recap, /history, /me, /c/[shortId]
│   │   ├── src/components/      # UI components: ui/, play/, result/, share/, layout/
│   │   ├── src/lib/             # Client wiring: api client, hooks, push worker, analytics
│   │   ├── src/styles/          # CSS globals and design token variables
│   │   └── public/              # Icons, manifest.json, sw.js, custom SVG illustrations
│   └── admin/                   # Internal question authoring, import, and scheduling tool
├── services/
│   ├── api/                     # High-throughput Fastify REST API
│   │   ├── src/routes/          # Route handlers: drop, submissions, results, history, auth, me, push
│   │   ├── src/plugins/         # Fastify plugins: under-pressure, rate-limit, auth, cookies
│   │   │   └── pressure.ts      # @fastify/under-pressure load shedding plugin (Stage 3)
│   │   ├── src/lib/resilience/  # Circuit breakers, retry helpers, concurrency limiters (Stage 3)
│   │   └── src/db/              # Prisma client and repository layer (notifications, streaks, etc.)
│   └── worker/                  # Asynchronous BullMQ background worker service
│       ├── src/jobs/            # Schedulers: stageDrop, openDrop, sendPush, renderCard
│       └── src/pools/           # Dedicated worker pools: submit-persist, final-batch, cards
├── packages/
│   ├── shared/                  # Universal pure logic: scoring math, Zod schemas, types, copy keys
│   ├── api-client/              # Typed HTTP client used by web and worker applications
│   └── ui-tokens/               # Design tokens, Tailwind CSS preset, color constants
├── docs/                        # Authoritative scale, reliability, and operations documentation
│   ├── scaling-plan.md          # Tiers T0-T4, triggers, and upgrade playbooks
│   ├── capacity-model.md        # Mathematical capacity formulas and Redis/DB memory budgets
│   ├── slo.md                   # SLOs, error budget policies, and alerting thresholds
│   ├── failure-modes.md         # FMEA matrix and resilience pattern specifications
│   ├── load-testing.md          # k6 load test scenarios, pass criteria, and execution logs
│   ├── runbook.md               # On-call incident response playbooks and triage guides
│   ├── degradation-playbook.md  # Detailed L0-L4 ladder, triggers, and manual controls
│   └── disaster-recovery.md     # RPO/RTO objectives, restoration steps, and drill logs
├── infra/
│   ├── loadtest/                # k6 load testing scripts and synthetic player generator (Stage 13)
│   ├── terraform/               # Declarative cloud infrastructure configurations (Stage 14)
│   └── docker-compose.yml       # Local development PostgreSQL 16 & Redis 7
├── packages/shared/prisma/      # schema.prisma, migrations, dynamic seed data
├── architecture.md              # System architecture and technical blueprint
├── product.md                   # Product specification and core loop definitions
├── rules.md                     # Coding standards, error policies, Definition of Done
├── design.md                    # Visual tokens, typography, component specs, degraded UI states
├── task.md                      # Phase breakdown, task tracking, progress metrics
├── memory.md                    # Living project memory, ADR logs, environment notes
├── package.json                 # Monorepo root package configuration
├── pnpm-workspace.yaml          # PNPM workspace declarations
└── .env.example                 # Documented environment variable templates
```

---

## 15. Extended Tech Stack Table

| Component | Library / Technology | Version | Purpose | Feature / Context | Install Stage |
|---|---|---|---|---|---|
| **Load Shedding** | `@fastify/under-pressure` | `^8.x` | Event-loop and memory overload protection | API Core | Stage 3 |
| **Compression** | `@fastify/compress` | `^7.x` | Brotli & Gzip payload compression | API Core | Stage 3 |
| **Conditional Requests** | `@fastify/etag` | `^5.x` | ETag computation for 304 Not Modified | API Core | Stage 3 |
| **Circuit Breakers** | `opossum` | `^8.x` | Outbound dependency failure isolation | API & Worker | Stage 3 |
| **HTTP Client** | `undici` | `^6.x` | High-performance HTTP client with connection pooling | Outbound HTTP | Stage 3 |
| **Retries & Limits** | `p-retry`, `p-limit` | `^6.x` / `^5.x`| Exponential backoff with full jitter and concurrency caps | API & Worker | Stage 3 |
| **Metrics** | `prom-client` | `^15.x` | Prometheus metrics exporter for golden signals | Observability | Stage 3 |
| **Tracing** | `@opentelemetry/sdk-node` | `^0.52.x`| Distributed OpenTelemetry request tracing | Observability | Stage 12 |
| **Thread Pools** | `piscina` | `^4.x` | Worker threads for CPU tasks (Satori, matching) | Worker | Stages 6, 9 |
| **Cluster Redis** | `ioredis` | `^5.x` | Atomic multi-key updates and cluster routing | Data layer | Stage 3 |
| **Connection Pooler** | PgBouncer | `1.22+` | Transaction-mode database connection pooling | PostgreSQL | Stages 2, 14 |
| **Performance Budgets** | `size-limit`, `@next/bundle-analyzer` | Latest | Enforce initial JS < 150 KB budget in CI | Web CI | Stages 4, 13 |
| **Load & Chaos** | k6, Toxiproxy, `clinic.js` | Latest | Synthetic player generator, load, chaos, profiling | Testing | Stage 13 |
| **Infrastructure as Code** | Terraform | `1.9+` | Reproducible declarative cloud infrastructure | Hosting | Stage 14 |
| **Synthetic Probes** | Better Stack / UptimeRobot | SaaS | Multi-region synthetic play-flow probes & status page | Operations | Stage 14 |

---

## 16. Extended Database Entities

In addition to core tables (`users`, `drops`, `questions`, `submissions`, `answers`, `matches`, `streak_log`, `shares`, `app_content`, `app_config`, `tier_definitions`, `reports`), the schema includes scale-governance tables:

1. **`batch_runs`:** Tracks chunked resumable final batch progress per drop.
   - Columns: `id` (UUID, PK), `drop_id` (UUID, FK), `chunk_index` (INT), `status` (ENUM: pending, running, completed, failed), `player_count` (INT), `error` (TEXT, nullable), `started_at` (TIMESTAMPTZ), `completed_at` (TIMESTAMPTZ). Unique: `(drop_id, chunk_index)`.
2. **`scheduler_runs`:** Distributed leader lock preventing duplicate cron executions.
   - Columns: `id` (UUID, PK), `job_name` (TEXT), `run_for_date` (DATE), `executed_at` (TIMESTAMPTZ), `instance_id` (TEXT). Unique: `(job_name, run_for_date)`.
3. **`persist_reconciliation`:** Mode B audit log reconciling acknowledged `request_id`s with persisted database rows.
   - Columns: `id` (UUID, PK), `request_id` (UUID, unique), `player_id` (UUID), `drop_id` (UUID), `persisted_at` (TIMESTAMPTZ, nullable), `status` (ENUM: acknowledged, persisted, missing).

---

## 17. Architecture Decision Records (ADRs)

### ADR 001 to ADR 008: Preserved Baseline
*(See original sections: Monorepo with Turborepo, TypeScript Strict Mode, Web-First PWA, Prohibition of Chat, PostgreSQL + Redis Split, Satori Share Cards, Everything Dynamic from DB, Polymorphic Question Renderer).*

### ADR 009: Scale Tiers (T0 to T4) Progression Model
- **Date:** 2026-11-10
- **Context:** Solo founder cannot operate bank-grade Kubernetes infrastructure on day one, but foundations must not require painful retrofitting.
- **Decision:** Establish 5 scale tiers (T0 to T4) gated strictly by measured metrics and promotion triggers.
- **Consequence:** Eliminates premature optimization while guaranteeing an actionable growth path.

### ADR 010: Frontend State Architecture (TanStack Query + Zustand; Redux Rejected)
- **Date:** 2026-11-10
- **Context:** Need predictable client and server state on mid-range Android devices over 4G within a 150 KB initial bundle budget.
- **Decision:** Use TanStack Query for server state and Zustand with `persist` middleware for draft answers. Redux Toolkit is explicitly rejected.
- **Consequence:** Saves ~30 KB in bundle size, simplifies async cache invalidation. Revisit trigger: client state becomes highly complex and multi-layered.

### ADR 011: Cache-First Edge Architecture with Cloudflare Origin Shielding
- **Date:** 2026-11-10
- **Context:** 07:00 IST drop causes massive global spikes that can easily exhaust origin web and database servers.
- **Decision:** Pre-publish immutable Drop JSON at 06:30 IST; serve public assets via Cloudflare CDN with `stale-while-revalidate` and `stale-if-error`.
- **Consequence:** > 95% of requests never hit the origin backend.

### ADR 012: Ingestion Persistence Modes (Synchronous Mode A & Asynchronous Mode B)
- **Date:** 2026-11-10
- **Context:** Database write capacity at Tier 3 planned peak (1,100–2,200 submits/sec) could saturate standard connection pools.
- **Decision:** Implement dual-mode ingestion: Mode A (synchronous DB transaction) for normal operation; Mode B (Redis queue + batched DB worker inserts) activated automatically at Level L3 or Tier 3.
- **Consequence:** Core play path never crashes under load; submissions are buffered durably with zero data loss.

### ADR 013: Daily Partitioning from Day One & 90-Day Retention
- **Date:** 2026-11-10
- **Context:** 10 lakh daily players produces ~7 million rows per day (~1 GB/day), degrading query performance over time.
- **Decision:** Range-partition `submissions`, `answers`, `matches`, and `answer_stats` by `drop_date`. Retain detailed answers for 90 days before archiving to cold storage.
- **Consequence:** Rapid query performance, cheap partition drops, strict adherence to DPDP privacy data minimisation.

### ADR 014: Five-Level Graceful Degradation Ladder (L0 to L4)
- **Date:** 2026-11-10
- **Context:** Sudden viral traffic surges must not take down the application.
- **Decision:** Implement a 5-level degradation ladder (Normal, Conserve, Protect Core, Survive, Static) dynamically driven by `app_config` with 5-minute hysteresis step-down rules.
- **Consequence:** Predictable, transparent degradation; users are informed honestly without seeing cryptic system errors.

### ADR 015: Chunked Resumable Final Batch with Progressive Publish
- **Date:** 2026-11-10
- **Context:** Finalizing 10 lakh players at 07:00 IST overlaps with the live morning drop, risking database connection starvation.
- **Decision:** Partition the final batch into 5,000-user idempotent chunks running in a dedicated worker pool capped at 25% DB connections, publishing results progressively.
- **Consequence:** Yesterday's recap finishes reliably by 07:10 IST without impacting today's live drop.
