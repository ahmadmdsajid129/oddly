# Oddly — Failure Modes and Effects Analysis (FMEA)

<!-- visual:start failure-mode-summary -->
| Failure Domain | Primary Defense | Fallback State | Recovery Time |
|---|---|---|---|
| **PostgreSQL Outage** | Mode B async ingestion | Cached static drop, local client retry | RTO < 30m |
| **Redis Outage** | Direct DB fallback mode | Reduced rate limits, provisional delay | RTO < 10m |
| **Worker Overload** | Piscina CPU cap + load shed | Defer non-critical matching jobs | Self-healing |
| **CDN Partition** | Stale-if-error headers | Local browser cached bundle | Instant |
<!-- visual:end failure-mode-summary -->



> **Purpose:** Comprehensive catalog of failure scenarios, architectural mitigations, detection signals, and resilience design patterns.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative Resilience Inventory (Stage 0.5)

---

## 1. Resilience Patterns Inventory

1. **Timeouts Everywhere:** Every network call (PostgreSQL, Redis, Cloudflare R2, Web Push, Turnstile, Google OAuth) enforces strict deadlines. No thread or connection hangs indefinitely.
2. **Retries with Exponential Backoff & Jitter:** 500 ms, 1 s, 2 s, 4 s, 8 s with full randomization (`Math.random() * interval`). Avoids thundering herds and synchronized lockstep retries.
3. **Circuit Breakers (`opossum`):** Protects downstream dependencies (Redis, Google SSO, Cloudflare R2). Tripping circuit breaker returns degraded fallback immediately instead of exhausting worker pools.
4. **Bulkheads (Resource Isolation):** Dedicated connection pools, independent Redis instances, and separate worker queues. Heavy share-card rendering can never starve live 07:00 IST submissions.
5. **Load Shedding (`@fastify/under-pressure`):** Automatically drops non-essential requests with HTTP `503 Overloaded` and `Retry-After` header when event-loop delay or heap memory cross safe thresholds.
6. **Graceful Degradation Ladder (L0 to L4):** Dynamic levers controlled via database `app_config` that progressively disable optional features while keeping core submissions 100% durable.
7. **Strict Idempotency:** Submissions require client-generated UUID `request_id`, enforced by database unique constraints and Redis keys. Retrying a submission is completely safe and returns the stored result.
8. **Dead Letter Queues (DLQ) & Poison Job Isolation:** Failed worker jobs are sequestered after 5 retries without crashing the worker process, alerting on-call engineers.

---

## 2. Failure Mode Analysis Table

| Failure Scenario | Direct System Impact | Architectural Mitigation | Detection Mechanism |
|---|---|---|---|
| **CDN / Edge Partial Outage** | Slow or failed page loads in specific geographical regions | `stale-if-error` headers; origin fallback with strict rate limiting; status page update | Global synthetic multi-region probes |
| **API Instance Crash or Rolling Deploy** | In-flight HTTP requests terminated | Stateless containers, rolling blue-green deploys, 25 s SIGTERM drain, client auto-retries with same `request_id` | Container orchestrator health metrics |
| **Event-Loop Starvation in API** | API latency spikes across all routes | `@fastify/under-pressure` load shedding; CPU tasks (card rendering, heavy matching) strictly off-thread | Event-loop delay metric (>20 ms) |
| **Postgres Primary DB Failover** | Transient write errors (10–60 seconds) | Managed HA failover; client retry with jitter; Mode B queueing; strict idempotency on reconnect | DB connectivity health checks |
| **Postgres Connection Exhaustion** | New API requests fail with pool timeout | Transaction-mode PgBouncer pooler; bounded client pools; per-role connection limits; load shedding | Pool wait time metric (>100 ms) |
| **Postgres Slow Query or Lock Contention** | Database worker threads blocked | 3-second statement timeouts; range partitioning by `drop_date`; short transactions (<20 ms) | Slow query log with automated alerts |
| **Redis Instance Failover or Data Loss** | Live answer counters and queues disrupted | Redis AOF `everysec` persistence; automated failover to replica; background reconciliation job from Postgres; fallback to Mode A | Redis heartbeat & latency metrics |
| **Redis Memory Exhaustion (OOM)** | Redis writes rejected with OOM | Separate Redis roles; strict TTLs on all keys; `noeviction` on queues/counters, `allkeys-lru` on cache; alarms at 70% and 85% | Redis memory usage alert |
| **Queue Backlog / Worker Starvation** | Delayed cards, delayed match updates, delayed push | Autoscaling workers based on queue depth and job age; priority lanes; skipping optional pre-rendering | BullMQ queue depth and age metrics |
| **Poison Job in BullMQ Worker** | Worker crash-loop and stalled jobs | Try/catch wrappers inside processors; max 5 retries with exponential backoff; automatic quarantine to DLQ | DLQ size metric (>0) |
| **Scheduler Double-Fire or Miss** | Duplicate or missing Drop open/close/final jobs | Distributed lock via Redis/Postgres advisory lock; `scheduler_runs` unique table; catch-up on boot | Scheduler run audit log |
| **Final Batch Race at 07:00 IST** | Stalled recap calculation or database contention | Dedicated worker pool with max 25% DB connection limit; parallel chunked jobs (5,000 users/chunk); progressive publish | Pipeline timer alert at 07:10 IST |
| **Web Push Gateway Outage / Throttling** | Delayed or failed push alerts | Staggered 5,000/batch dispatch; rate limiting; circuit breaker; automatic cleanup of 410/404 expired tokens | Notification delivery failure rate |
| **Cloudflare R2 Object Storage Outage** | Share cards cannot be uploaded | On-demand card generation; client-side SVG/canvas fallback; text-only share fallback | Storage client error metric |
| **Google Identity Services Outage** | Users cannot authenticate with Google SSO | Guest play remains completely unaffected; non-blocking error toast; session preservation | Auth failure rate spike |
| **Cloudflare Turnstile Outage** | Bot verification checks fail | Fail-open for low-risk actions with stricter per-IP rate limits (configurable via `app_config`) | Turnstile verification error rate |
| **Client Retry Storm after Hiccup** | Massive request amplification at origin | Full jitter on exponential backoff; client retry budget; `Retry-After` header adherence | Edge request rate vs origin rate |
| **Faulty Code Deployment** | Elevated error rates or latency | Automated canary analysis (5% -> 25% -> 100%); automatic rollback if error rate > 1% | Sentry error tracking by version |
| **Faulty Database Migration** | Table locks or blocking schema changes | Expand/Contract migration pattern; lock timeouts on DDL sessions; concurrent index creation; staging rehearsal | CI migration test & lock monitoring |
| **Offensive or Broken Question** | Brand damage or player complaints | Two-person approval workflow; emergency question pull tool with automated replacement | In-app user reports queue |
| **Complete Cloud Region Outage** | Entire primary region unreachable | Static CDN fallback (L4); multi-region encrypted backups; automated DNS failover; documented RTO < 30 min | Multi-region uptime monitoring |

