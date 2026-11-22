# Authoritative Reliability Gap Audit — Oddly v1

<!-- visual:start reliability-gap-callout -->
> [!IMPORTANT]
> **Reliability Invariant:** No acknowledged submission is ever lost. All write paths guarantee idempotency with `request_id`. Worker pipelines enforce deterministic job completion and circuit-breaker isolation.
<!-- visual:end reliability-gap-callout -->



> **Document Type:** SRE & System Architecture Audit  
> **Status:** Authoritative / Read-Only Codebase Audit  
> **Date:** 2026-11-10  
> **Owner:** Senior System Designer & SRE  
> **Scope:** Full code inspection of `apps/`, `services/`, `packages/`, `.github/`, and `infra/` against the **Scale and Reliability Addendum** (Sections 5 to 12 and 14) and the per-route policy table in `architecture.md`.

---

## 1. Executive Summary

This audit compares the existing codebase in `apps/`, `services/`, and `packages/` against the **Scale and Reliability Addendum** and the **Per-Route Policy Table** (`architecture.md`).

### High-Level Finding
The project has successfully scaffolded high-quality domain models, UI components, pure scoring algorithms, and REST routes across Stages 0 through 8 and 10 (with 171 automated tests passing). However, **almost all scale, reliability, and resilience mechanisms specified in the Addendum are currently missing from the application code**. The codebase is currently operating at **Tier T0/T1 (Dev/Prototype)** and will fail catastrophically under the planned peak of 10 lakh DAU (1,100 to 2,200 submits/sec at 07:00 IST) without the hardening detailed below.

---

## 2. Comprehensive Requirement-by-Requirement Gap Audit Table

| # | Requirement | Status | Evidence (Code / Test Path) | Work Needed | Suggested Stage |
|---|---|---|---|---|---|
| **1** | **Cache headers per route** | **Partial** | `services/api/src/routes/drops.ts:70`<br>`services/api/src/routes/content.ts:58`<br>`services/api/src/routes/config.ts:59` | `drops` has `s-maxage=60`, `content` has `s-maxage=3600`, `config` has `s-maxage=300`. However: <br>1. **Zero ETag headers** generated across any route.<br>2. **Zero `304 Not Modified`** conditional response handling.<br>3. `results.ts` and `world.ts` have **no Cache-Control headers** at all.<br>4. Drop and content routes hit PostgreSQL directly instead of querying Redis cache first. | **Stage 3** (API Core) |
| **2** | **Load shedding (`under-pressure`)** | **Missing** | `services/api/src/server.ts:9-211`<br>`services/api/package.json:14-29` | Fastify server does not register `@fastify/under-pressure`. No monitoring of event-loop lag (target: shed at >20ms delay), RSS/heap memory limits, or max concurrent requests. Requests continue to be accepted until the Node process crashes with OOM or event-loop freeze. | **Stage 3** (API Core) |
| **3** | **Timeouts (HTTP, DB, Redis)** | **Missing** | `services/api/src/server.ts:48-72`<br>`services/api/src/lib/redis.ts:21-30`<br>`packages/shared/prisma/schema.prisma:12-15` | Fastify has no route-level execution timeouts (`connectionTimeout`, `keepAliveTimeout`). Prisma client has no `$queryRaw` or statement timeout (`statement_timeout=3000ms`). Redis client has no `commandTimeout` (default is indefinite wait). A saturated DB connection pool will hang API requests indefinitely. | **Stage 3** (API Core) |
| **4** | **Circuit breakers** | **Missing** | `services/api/src/routes/submissions.ts`<br>`services/api/src/auth/turnstile.ts`<br>`services/worker/src/push/` | No circuit breaker pattern (e.g. Opossum or custom state machine) is wrapped around PostgreSQL, Redis, Cloudflare Turnstile, Cloudflare R2, or Web Push endpoints. Downstream stalls propagate immediately to origin workers. | **Stage 3 & 9** |
| **5** | **Retries with exponential backoff & jitter** | **Partial** | `apps/web/src/components/providers/QueryProvider.tsx:13`<br>`services/worker/src/index.ts:25-28` | Web client TanStack Query uses static `retry: 1` with 0ms backoff and zero jitter. Redis has simple linear retry (`times * 100`). Need full exponential backoff with Decorrelated Jitter (Full Jitter) on client queries and BullMQ job processors; parse `Retry-After` headers on 429/503. | **Stage 3 & 4** |
| **6** | **Layered rate limits** | **Partial** | `services/api/src/server.ts:109-113` | Global `@fastify/rate-limit` is configured (120 req/min per IP), but uses **in-memory store** (not shared across API instances) and localhost is allowlisted. **No route-specific rate limit on `POST /v1/submissions`** (target: 30 req/min). Edge rate limit configuration (Cloudflare WAF) is documented but unprovisioned. | **Stage 3** (API Core) |
| **7** | **Idempotency & request_id handling** | **Partial** | `services/api/src/routes/submissions.ts:48, 92-125`<br>`services/api/src/server.ts:63-71` | `x-request-id` header is generated and echoed on all responses. `POST /v1/submissions` validates `request_id` and queries `SubmissionsRepository.findByRequestId`. However: idempotency check queries Postgres directly without Redis atomic lock (`SET submission:lock:{id} NX EX 10`); concurrent duplicate requests within 50ms race each other. | **Stage 3** (API Core) |
| **8** | **Graceful shutdown** | **Missing** | `services/api/src/index.ts:13-30`<br>`services/worker/src/index.ts:74-79` | API and Worker boot scripts have zero `process.on('SIGTERM')` or `process.on('SIGINT')` signal handlers. When containers scale down or restart, active in-flight HTTP requests and BullMQ jobs are abruptly terminated with broken TCP sockets. | **Stage 3 & 9** |
| **9** | **Readiness endpoint (`/ready`)** | **Missing** | `services/api/src/routes/health.ts:14-38` | Only `GET /health` exists, returning a hardcoded `{ ok: true, service: "oddly-api" }` without verifying PostgreSQL connectivity, Redis ping, or migrations status. No `/ready` endpoint exists for Kubernetes/load-balancer health probes. | **Stage 3** (API Core) |
| **10** | **Redis key TTLs & role separation** | **Missing** | `services/api/src/lib/redis.ts:10-30`<br>`services/worker/src/index.ts:18-29` | Both API and Worker connect to a single monolithic `REDIS_URL`. Environment variables `CACHE_REDIS_URL`, `COUNTERS_REDIS_URL`, and `QUEUE_REDIS_URL` are defined in `.env.example` but completely ignored in code. Keys are written without standardized prefixes (`cache:`, `counter:`, `queue:`) and without enforced TTLs. | **Stage 2 & 3** |
| **11** | **Table partitioning** | **Missing** | `packages/shared/prisma/schema.prisma:100-160` | `Submission`, `Answer`, and `Match` tables are defined as monolithic tables without PostgreSQL daily range partitioning. At 10 lakh DAU (~7.7M rows/day), B-tree indexes will exceed RAM within weeks and table vacuuming will lock hot paths. | **Stage 2** (Database) |
| **12** | **Queue isolation & dead-letter handling (DLQ)** | **Partial** | `services/worker/src/scheduler.ts:37-48`<br>`services/worker/src/index.ts:52-56` | BullMQ queues exist for `daily-pipeline` and `cards`, but run on the same Redis instance with default concurrency. Dead-letter queue (DLQ) quarantine is unconfigured; poison jobs fail 3 times and are discarded without alert triggers or replay tooling. | **Stage 9** (Worker) |
| **13** | **Scheduler leader lock & catch-up** | **Missing** | `services/worker/src/scheduler.ts:83-100` | `DailyScheduler.registerSchedules` registers repeatable BullMQ jobs on startup. There is no distributed leader election lock (`SET scheduler:leader <id> NX EX 30`). Multiple worker pods will register duplicate jobs. If scheduler restarts during 07:00 IST, there is no missed-drop catch-up logic. | **Stage 9** (Worker) |
| **14** | **Final-batch chunking & resumability** | **Missing** | `services/worker/src/workers/closure.worker.ts:50-174` | `ClosureWorker.runBatchClosure` takes an in-memory array of ALL submissions for a drop. At 10 lakh submissions, loading this into Node memory causes instant heap OOM. There is no chunking (target: 5,000/batch), no cursor tracking, no `batch_runs` table, and no heartbeat. | **Stage 9** (Worker) |
| **15** | **Bounded matching candidates** | **Missing** | `services/api/src/routes/submissions.ts:251`<br>`services/api/src/db/submissions.repo.ts:63-75` | `SubmissionsRepository.listByDrop(dropId)` executes `prisma.submission.findMany({ where: { drop_id } })` with **NO LIMIT**. On every single submission, the API fetches ALL previous submissions for the day into Node.js memory. At 10,000+ players, every submit will timeout or OOM. Must clamp candidate pool to $\le 2,000$ (500 at L2, 0 at L3). | **Stage 3** (API Core) |
| **16** | **Degradation level wiring (L0–L4)** | **Missing** | `services/api/src/server.ts`<br>`apps/web/src/app/page.tsx` | Five-level degradation ladder is documented in `docs/degradation-playbook.md`, but zero code exists to query, propagate, or respond to degradation levels. API does not emit `x-oddly-degradation-level` header; frontend does not render degraded banners or adjust polling rates. | **Stage 3 & 4** |
| **17** | **Client retry & pending-submission recovery** | **Partial** | `apps/web/src/lib/play-state.ts:26-53`<br>`apps/web/src/app/page.tsx:160-210` | Draft answers are saved to `localStorage` under `oddly_draft_{dropId}`. However: if the user clicks Submit and the network drops mid-flight, the answers are cleared from draft but NOT queued in a resilient `oddly_pending_submission` queue to auto-replay on reconnect with the same `request_id`. | **Stage 4** (Web Flow) |
| **18** | **Service worker caching** | **Partial** | `apps/web/public/sw.js:9-50` | `sw.js` precaches `["/", "/offline", "/manifest.webmanifest"]` and implements stale-while-revalidate for assets. However: does not cache dynamic question illustration SVGs, does not version cache names with app git hash, and does not handle background sync for pending submissions. | **Stage 10** (PWA) |
| **19** | **Bundle budget check in CI** | **Missing** | `.github/workflows/ci.yml:1-53`<br>`apps/web/package.json` | CI runs `lint`, `typecheck`, `test`, `build`. It does NOT execute `size-limit` or any bundle budget validation. If a developer imports a heavy package, the 150 KB initial JS budget will be silently breached. | **Stage 4** (Web Flow) |
| **20** | **Metrics & distributed tracing** | **Missing** | `services/api/package.json`<br>`services/worker/package.json` | No Prometheus `prom-client` instrumentation (no `/metrics` route, no golden signals: request duration, error rate, queue depth, DB pool saturation). No OpenTelemetry tracing spans exported. | **Stage 12** (Telemetry) |
| **21** | **Alert rules** | **Missing** | `infra/`<br>`services/api/` | No Prometheus alert rules or Sentry alert triggers are configured in code or repo configuration. Error budget burn alerts and p95 latency alerts exist only as documentation in `docs/slo.md`. | **Stage 12** (Telemetry) |

---

## 3. The 10 Highest-Risk Reliability Gaps (Ranked by Severity)

Below are the 10 failure modes most likely to cause a total service blackout or data loss under load, ranked strictly by severity and blast radius:

```
[CRITICAL SEV-1]
1. Unbounded Matching Candidates on Hot Submission Path
2. Missing Database & Redis Timeouts (Cascade Connection Exhaustion)
3. No Admission Control / Load Shedding under-pressure
4. Daily Pipeline Workers are Stubs (Stage, Open, Close not executing)
5. Monolithic In-Memory Final Batch Processing (Heap OOM at scale)

[HIGH SEV-2]
6. Unpartitioned Submissions & Answers Tables (Index bloat & VACUUM lock)
7. Rate Limiter Uses In-Memory Store without Route Differentiation
8. Missing /ready Health Check and Graceful Shutdown Signal Handlers
9. Zero Jitter on Client Countdown Timer (07:00 IST Thundering Herd)
10. Unwired Degradation Ladder (System cannot shed load gracefully)
```

### Risk & Effort Breakdown

| Rank | Gap Description | Blast Radius | Root Cause | Implementation Effort | Suggested Stage |
|---|---|---|---|---|---|
| **1** | **Unbounded matching candidate query on `POST /v1/submissions`** | Catastrophic API crash (OOM) at $\ge 5,000$ players. | `SubmissionsRepository.listByDrop(dropId)` runs `findMany` with no `take` limit. Every submission deserializes thousands of answer JSON blobs into the Node process. | **1.5 days** | **Stage 3 / Stage 5** |
| **2** | **Missing DB statement and Redis command timeouts** | Fastify event loop blocked, connection pool exhausted, HTTP requests hang until client timeout. | No statement timeouts configured in Prisma or Postgres pooler. Slow or locked queries hold pool connections indefinitely. | **1 day** | **Stage 3** |
| **3** | **No load shedding (`@fastify/under-pressure` missing)** | Total API pod failure during 07:00 IST burst (1,100–2,200 submits/sec). | API attempts to process all incoming TCP requests regardless of event loop delay (>20ms) or memory saturation, crashing pods instead of returning `503 Service Unavailable` with `Retry-After`. | **0.5 days** | **Stage 3** |
| **4** | **Daily pipeline workers are non-functional stubs** | Drop fails to open at 07:00 IST, results never finalize, streaks never update. | `services/worker/src/scheduler.ts` stubs `triggerStageDrop` and `triggerOpenDrop`. `services/worker/src/index.ts` does NOT instantiate a worker for the `daily-pipeline` queue. | **2 days** | **Stage 9** |
| **5** | **Final batch closure processes all submissions in-memory** | Worker pod crashes with `JavaScript heap out of memory` at 07:00:05 IST; final recap SLO breached. | `ClosureWorker.computeAnswerFrequencies` and `finalizeDropSubmissions` pass entire submission list in one synchronous array. No chunking (5k/batch), cursor pagination, or resume checkpoints. | **2 days** | **Stage 9** |
| **6** | **Unpartitioned `submissions` and `answers` tables** | DB query degradation, massive index bloat, autovacuum locks during daytime. | Tables are defined as monolithic tables in `schema.prisma`. Writing 7.7M rows/day into a single table without daily range partitioning will saturate disk I/O and degrade B-tree lookups. | **2 days** | **Stage 2** |
| **7** | **In-memory rate limiting with no submit-route throttling** | Hot submission path easily flooded by scripts or bot farms; limits not shared across pods. | `@fastify/rate-limit` is initialized with default in-memory store; `POST /v1/submissions` has no dedicated 30 req/min limit. | **0.5 days** | **Stage 3** |
| **8** | **Missing `/ready` endpoint & missing `SIGTERM` graceful shutdown** | Broken user submissions and 502 Bad Gateway errors on every rolling deployment or pod autoscale. | Containers killed immediately with `SIGKILL` without waiting 15s to drain active HTTP requests. Load balancers send traffic to booting containers before DB/Redis are connected. | **0.5 days** | **Stage 3** |
| **9** | **No countdown client fetch jitter (Thundering Herd)** | 4,00,000 countdown screens hit `/v1/drop/today` at the exact same millisecond (07:00:00.000 IST). | Web countdown timer computes remaining seconds and immediately fires fetch on expiration without adding a randomized 0 to 4000ms delay. | **0.5 days** | **Stage 4** |
| **10** | **Degradation ladder L0–L4 completely unwired** | System cannot shed non-critical features (share cards, live counters, exact matching) when under stress. | Degradation playbook exists in `docs/` only. Neither API middleware nor client components read or enforce degradation levels. | **1.5 days** | **Stage 3 / Stage 4** |

---

## 4. Reconciling `task.md` with Reality

Per the audit guidelines, **a task is marked `DONE` only if the code exists AND automated tests cover it**. Tasks that were marked `DONE` based on stubs, incomplete implementations, or missing test suites must be reverted to `TODO` or `PARTIAL`.

### Tasks Reconciled from `DONE` to `TODO` / `PARTIAL`

1. **`P1.19` (Automated Accessibility Audit with `@axe-core/playwright`):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-07).
   - *Reality:* `@axe-core/playwright` is **not installed** in `apps/web/package.json` or root. No axe test script or test file exists.
   - *Corrected Status:* `[ ] TODO`.

2. **`P3.09` (`@fastify/rate-limit` with Redis Store & Route Limits):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-08).
   - *Reality:* `@fastify/rate-limit` is registered with default **in-memory store** (no Redis store connection). No route-specific limit of 30 req/min is configured on `POST /v1/submissions`.
   - *Corrected Status:* `[ ] TODO` (Partial code exists).

3. **`P9.02` (`stageDrop` Worker Pre-compilation & Redis Warming):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-09).
   - *Reality:* `DailyScheduler.triggerStageDrop` is an empty stub returning `{ ok: true, status: "pending" }`. Does not compile JSON or warm Redis cache.
   - *Corrected Status:* `[ ] TODO`.

4. **`P9.03` (`openDrop` Worker Drop Transition):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-09).
   - *Reality:* `DailyScheduler.triggerOpenDrop` is an empty stub returning `{ ok: true, status: "live" }`. Does not update PostgreSQL drop status or publish Redis events.
   - *Corrected Status:* `[ ] TODO`.

5. **`P9.04` (`pairingWorker` Background Sweeps):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-09).
   - *Reality:* `PairingWorker` logic exists in `workers/pairing.worker.ts` with unit tests, but no BullMQ worker is instantiated in `services/worker/src/index.ts` to actually execute recurring sweeps against the database.
   - *Corrected Status:* `[ ] TODO` (Worker processor uninstantiated).

6. **`P9.05` (`closureWorker` Locking Submissions at 06:59:59 IST):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-09).
   - *Reality:* API route verifies `isDayOpen()`, but no background worker executes drop closure or transitions database status to `archived`.
   - *Corrected Status:* `[ ] TODO`.

7. **`P9.06` (`matchFinal` Worker Finalizing Probabilities & Locking Twins):**
   - *Previous Status:* Marked `[x] DONE` (2026-11-09).
   - *Reality:* Pure helper functions exist in `closure.worker.ts`, but no database-connected, chunked worker process is wired to execute in the worker service.
   - *Corrected Status:* `[ ] TODO`.

---

## 5. Actual Project Stage Assessment

### What Stage is the Project Actually At?
The project has built and verified the vertical functional features up through **Stage 8** (Guest Persistence, Auth, Streaks, History, Settings) and **Stage 10** (Web Push & PWA basics). However:
1. **Stage 0.5 (Scale and Reliability Hardening):** Architectural specifications and operational documentation are 100% complete, but the corresponding infrastructure code (timeouts, circuit breakers, load shedding, table partitioning, Redis role separation) remains to be implemented.
2. **Stage 9 (Daily Pipeline & BullMQ Scheduler):** Only partially completed. The scheduling clock and mathematical helpers exist, but the worker processors for staging, opening, pairing, and closing drops are stubs and not wired to live queues in `services/worker/src/index.ts`.

### Accurate Project Status:
- **Functional Feature Progress:** Core play flow, scoring, cards, auth, streaks, and push are built and passing 171 tests.
- **Scale & Reliability Implementation Progress:** 0% implemented in code (pure documentation and config templates).
- **Active Operational Milestone:** **Stage 0.5 Complete (Audit Phase)**.
- **True Task Count:**
  - **Total Tasks Tracked:** 217 tasks
  - **Truly Completed Tasks (`DONE`):** 123 tasks (56.7%)
  - **Reconciled Tasks (Moved from `DONE` to `TODO`):** 7 tasks (`P1.19`, `P3.09`, `P9.02`, `P9.03`, `P9.04`, `P9.05`, `P9.06`)
  - **Pending Tasks (`TODO`):** 94 tasks (43.3%)

