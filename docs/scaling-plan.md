# Oddly — Scale Tiers and Scaling Plan

> **Purpose:** Defines the scale tiers (T0 to T4), architecture evolution, triggers, upgrade playbooks, and cost guardrails as Oddly scales from 1,000 to 1,000,000+ daily players.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative Architectural Baseline (Stage 0.5)

---

## 1. Scale Tiers Architecture Matrix

| Tier | Daily Players | Peak Submissions / sec | Infrastructure Topology | Core Architectural Changes | Promotion Trigger (Move Up When) |
|---|---|---|---|---|---|
| **T0** | Up to 1,000 | ~1 – 5 | 1 API instance, 1 worker, starter Postgres & Redis, global CDN in front | Cache-first CDN, monolithic Fastify API, BullMQ queues, in-memory/Redis brute force matching (Stage A) | Sustained peak > 20 req/s, or CPU > 60% at peak |
| **T1** | 1,000 to 10,000 | ~10 – 25 | 2 API instances, 1 worker, managed Postgres with connection pooler, Redis with AOF persistence | Multi-instance rolling deploys, connection pooler (PgBouncer), strict idempotency caching, matching Stage A | DB CPU > 60% at peak, p95 submit > 300 ms, or > 8,000 daily players |
| **T2** | 10,000 to 1,00,000 | ~100 – 250 | 3 to 6 API instances (autoscaling), separated worker pools, Redis split by role, Postgres read replica | Range-partitioned database tables, separate Redis roles (`cache`, `counters`, `queues`), matching Stage B (bucket index), Mode B async persist ready | > 80,000 daily players, queue lag > 30 s at peak, or DB write saturation |
| **T3** | 1,00,000 to 10,00,000 | ~1,100 (2x headroom: 2,200) | 10 to 40 API instances (autoscaling), dedicated Postgres primary with PgBouncer & replicas, Redis Cluster / dedicated nodes per role | Mode B async persist active during 07:00 window, parallel chunked final batch with progressive publish, matching Stage B/C, regional edge caching tuned | > 8,00,000 daily players or breaking point identified in load test |
| **T4** | > 10,00,000 | > 2,500+ | Multi-region read replicas, sharded counters, vector search service, managed stream backbone | Sharded option counters (`counter:{q}:{opt}:{shard}`), external ANN vector service, multi-region edge ingestion | Strategic business decision and funded dedicated SRE plan |

---

## 2. What to Build Now vs. Design Now vs. Do Not Build

### 2.1 Build Now (v1.0 Baseline)
- **Edge Caching & CDN:** Cloudflare in front; immutable assets (`max-age=31536000`), Drop JSON pointer caching (`s-maxage=5, stale-while-revalidate=30, stale-if-error=3600`).
- **Stateless API:** Graceful shutdown (`SIGTERM`, 25 s drain), liveness (`/health`) and readiness (`/ready`) endpoints.
- **Strict Idempotency:** `request_id` enforced with DB unique constraint and 24 h Redis key.
- **Redis Counters & Vectors:** Lua scripts for atomic increments; background reconciliation job with PostgreSQL.
- **Worker Bulkheads:** Separate BullMQ queues and workers for `submit-persist`, `match-provisional`, `match-final`, `card-render`, `notify`.
- **Resilience Engine:** `@fastify/under-pressure` load shedding; timeouts, retries with exponential backoff and full jitter; circuit breakers via `opossum`.
- **Degradation Ladder:** L0 (Normal) to L4 (Static) dynamically driven by database `app_config` without requiring deploys.
- **Range Partitioning from Day One:** `submissions`, `answers`, `matches`, and `answer_stats` partitioned by `drop_date`.
- **Synthetic Load Testing:** Automated k6 load generation (`pnpm loadgen`) and full disaster recovery restore drills.

### 2.2 Design Now, Build When Triggers Fire
- **Mode B (Asynchronous Persist):** Queue submissions to Redis stream with `202 Accepted` response; worker micro-batches inserts to Postgres (trigger: T3 or DB saturation).
- **Matching Stage B & C:** Exact-hash and 4/5 candidate buckets (Stage B) and HNSW ANN vector index (Stage C) implemented behind `MatchingStrategy` interface (trigger: T2/T3).
- **Redis Split by Role:** Independent instances for `cache`, `counters-vectors`, and `queues` (trigger: T2).
- **Database Read Replicas:** Route history, world stats, and admin reads to replica (trigger: T2).
- **Sharded Hot Counters:** Distribute hot answer options across 16 random shards (`counter:{q}:{opt}:{shard}`) (trigger: hot-key CPU ceiling in Redis).

### 2.3 Explicitly Rejected for v1.0 (Do Not Build)
The following technologies are rejected for v1.0 to prevent premature over-engineering:
- **Kubernetes (K8s):** Overhead exceeds solo founder operating capacity. Containerized autoscaling on managed platforms is sufficient. *(Revisit trigger: T4 multi-region)*
- **Microservices Architecture:** Monorepo with modular services (`apps/web`, `services/api`, `services/worker`) is preserved. No RPC/gRPC network hops. *(Revisit trigger: > 15 dedicated engineers)*
- **Apache Kafka / Heavy Event Bus:** BullMQ with Redis Streams/Lists meets all throughput requirements up to T3. *(Revisit trigger: > 50,000 events/sec)*
- **GraphQL / Multi-Database Polyglot:** REST with OpenAPI and Fastify/Zod is simpler, faster, and easily cached by edge CDNs. *(Revisit trigger: complex graph queries)*
- **WebSockets / Server-Sent Events for Live Counters:** CDN-cached polling (`GET /v1/stats/today`, `s-maxage=10`) reduces origin connections by 99%. *(Revisit trigger: T4 real-time multiplayer)*

---

## 3. Tier Upgrade Playbooks

### Upgrading from T0/T1 to T2
1. **Database:** Deploy PgBouncer in transaction mode; enable read replica for `/v1/history` and `/v1/world`.
2. **Redis:** Provision dedicated Redis instances for `queues` (AOF on) and `counters-vectors` (AOF on). Move ephemeral cache to separate instance (`allkeys-lru`).
3. **Workers:** Split worker processes into separate process managers: 1 for share cards, 1 for matching/pipeline, 1 for notifications.
4. **Matching:** Enable `MatchingStageB` (bucketed candidate search) via `app_config.matching_strategy = "stage_b"`.

### Upgrading from T2 to T3
1. **Ingestion Mode:** Enable Mode B (`PERSIST_MODE=async`) during the 06:50–07:30 IST window.
2. **Final Batch:** Scale worker pool to 10 instances; configure chunk size to 5,000 players per job with 8 parallel worker threads.
3. **Edge Optimization:** Pre-warm Cloudflare edge cache at 06:30 IST with immutable Drop JSON.

---

## 4. Cost Guardrails and Financial Estimates

| Tier | Daily Active Players | Estimated Monthly Infrastructure Cost | Primary Cost Drivers | Cost Control Mechanism |
|---|---|---|---|---|
| **T0** | 1,000 | ~$50 – $100 / mo | 1 VPS / Container, starter DB & Redis | Free-tier CDN, single instance |
| **T1** | 10,000 | ~$250 – $500 / mo | Managed Postgres, persistent Redis, 2 API containers | Edge caching (>95% hit ratio), query optimization |
| **T2** | 1,00,000 | ~$1,200 – $2,500 / mo | Managed Postgres with replica, multi-role Redis, auto-scaled compute | Fixed-price Redis instances (avoid command pricing), S3/R2 lifecycle rules |
| **T3** | 10,00,000 | ~$5,000 – $10,000 / mo | Dedicated multi-core DB primary + replicas, Redis clusters, 20–40 containers | 90-day raw answer retention, log/trace sampling (1–5%), Brotli compression |

> **Cost Golden Rule:** Any proposed infrastructure upgrade must state its monthly cost impact and be benchmarked against cheaper software optimizations (indexing, caching, pooling) first.

