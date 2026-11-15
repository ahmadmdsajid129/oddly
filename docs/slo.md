# Oddly — Service Level Objectives (SLOs) and Error Budget Policy

> **Purpose:** Defines the availability, latency, durability, and recovery SLOs, error budget burn rules, and alerting thresholds for Oddly v1.0.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative Reliability Contract (Stage 0.5)

---

## 1. Core Reliability Promise

> **"No acknowledged submission is ever lost, the Drop is always reachable, and when we are overloaded we shed non-essential work first and say so honestly."**

---

## 2. Service Level Objectives (SLOs) Matrix

| Service / Area | Target SLO | Measurement Methodology | Window / Context |
|---|---|---|---|
| **Play-Path Availability** | **99.9%** Monthly<br>**99.95%** Peak (07:00–08:00 IST) | Synthetic play-flow probe every 60 s from 3 global regions + real user error rate | Core user journey: load Drop -> answer 5 picks -> submit -> view result |
| **`GET /v1/drop/today`** | **p95 < 100 ms**<br>Edge hit ratio > 99% | Cloudflare CDN Analytics | Global edge latency |
| **`POST /v1/submissions`** | **p95 < 500 ms**<br>p99 < 1,500 ms<br>Error rate < 0.5% | Fastify API metrics (`prom-client`) | At planned peak (1,100 submissions/sec) |
| **`GET /v1/results/:dropId`** | **p95 < 400 ms** | Fastify API metrics | Instant provisional or locked results |
| **Submission Durability** | **100% (Zero Loss)** | Reconciliation job: acknowledged `request_id`s vs stored DB rows | No acknowledged submission is ever discarded |
| **Final Batch Completion** | **99% of days by 07:10 IST**<br>100% by 07:20 IST | BullMQ pipeline timer & audit table | Locks exact world percentiles and streaks |
| **Share Card Readiness** | **p95 < 5 seconds** | Worker queue latency metric | Satori/Resvg card generation |
| **Share Landing (`/c/:shortId`)** | **p95 < 200 ms**<br>Edge hit ratio > 95% | Cloudflare CDN Analytics | Viral landing page delivery |
| **Push Notification Stagger** | First slice at 07:00 IST<br>All slices complete within 10 min | Worker notification queue timer | Staggered 5,000/batch slices |
| **Clamped Matching Accuracy (R2.9)** | **Exact Match >= 98%**<br>p99 Gap < 0.05<br>Twin Coverage >= 95% | Sampled verifier (1% sample vs exhaustive brute force) | Evaluated across skewed 50k+ player distributions |
| **Disaster Recovery (RTO / RPO)** | **RTO < 30 minutes**<br>**RPO < 5 minutes** | Quarterly disaster recovery drills | Recovery time & max acceptable data loss |

---

## 3. Error Budget and Release Freeze Policy

- **Monthly Error Budget (99.9% Availability):**
  - Total monthly minutes: $30 \times 24 \times 60 = 43,200\text{ minutes}$.
  - Maximum permitted downtime / severe degradation: **43.2 minutes per calendar month**.
- **Burn Rate Rules:**
  - **Budget Burn > 25% in a single week:** Immediate reliability review in weekly retrospective.
  - **Budget Burn > 50% in a month:** **Feature Release Freeze.** All code releases are restricted strictly to reliability, performance, bug-fixing, and infrastructure hardening until the budget resets.
  - **Budget Burn > 100%:** Post-incident review (PIR) signed off by the Founder with mandatory architectural remediation before resuming roadmap features.

---

## 4. Priority Order During Resource Scarcity (Load Shedding Ladder)

When system capacity is constrained, work is preserved or shed in strict priority order (top to bottom):

1. **Accept and durably store submissions** *(Highest priority — never shed)*
2. **Serve the Drop JSON and the client app shell**
3. **Show the user a result (provisional is acceptable)**
4. **Generate server-rendered share cards**
5. **History, user settings, and streak summaries**
6. **Push notifications dispatch**
7. **Analytics events and live player counters**
8. **Internal admin tooling and panel testing** *(Lowest priority — shed first)*

---

## 5. Automated Alerting Thresholds & Routing

| Alert Name | Condition & Duration | Severity | Actionable Runbook Reference |
|---|---|---|---|
| **SubmitErrorRateHigh** | Error rate > 1% for 5 min, or > 2% for 2 min | High | `docs/runbook.md#submit-errors` |
| **SubmitLatencyDegraded** | p95 latency > 800 ms for 5 min | High | `docs/runbook.md#submit-latency` |
| **PlayPathDown** | 2 consecutive synthetic probe failures from 2+ regions | **Critical** | `docs/runbook.md#drop-not-live` |
| **DegradationLevelEscalated** | Degradation level elevated to L2, L3, or L4 | High / **Critical** | `docs/degradation-playbook.md` |
| **DatabasePoolExhaustion** | Pool wait > 100 ms or connection usage > 80% | High | `docs/runbook.md#db-saturation` |
| **RedisMemoryAlarm** | Redis memory > 85% or latency > 20 ms p99 | High | `docs/runbook.md#redis-failover` |
| **QueueBacklogStalled** | Live queue job age > 2 min or DLQ count > 0 | High | `docs/runbook.md#queue-backlog` |
| **FinalBatchDelayed** | Final batch incomplete at 07:10:00 IST | **Critical** | `docs/runbook.md#final-batch-late` |
| **SchedulerMissedRun** | Drop open / close / final cron missed or duplicated | **Critical** | `docs/runbook.md#scheduler-miss` |
| **PersistReconciliationGap** | Acknowledged `request_id` missing from DB > 5 min | **Critical** | `docs/runbook.md#data-loss-investigation` |
| **PartitionDepletionRisk** | Fewer than 7 future daily partitions exist in Postgres | Medium | `docs/runbook.md#partition-maintenance` |
| **ErrorBudgetExceeded** | Monthly error budget burn > 50% | Medium | Freeze feature deploys |
| **CostRunawayAlert** | Daily infrastructure spend > 150% of budget forecast | Medium | `docs/runbook.md#cost-spikes` |

---

## 6. Prometheus Metrics Catalog (`prom-client`)

The following metrics are instrumented across API and Worker services and exported via bearer-authenticated `GET /metrics`. High-cardinality values (user IDs, drop IDs, dynamic URL tokens) are strictly forbidden in label names to protect memory bounds.

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `oddly_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP request counter for RED golden signal tracking |
| `oddly_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency distribution across standard response buckets |
| `oddly_http_requests_in_flight` | Gauge | `method`, `route` | Current active requests being processed |
| `oddly_db_pool_connections_in_use` | Gauge | — | Active Postgres database client connections currently checked out |
| `oddly_db_pool_connections_waiting` | Gauge | — | Requests currently queued waiting for an available DB connection |
| `oddly_cache_operations_total` | Counter | `operation`, `result` | Redis cache lookups classified by result (`hit`, `miss`, `stale`) |
| `oddly_circuit_breaker_state` | Gauge | `name` | Breaker state (0 = CLOSED, 1 = HALF_OPEN, 2 = OPEN) |
| `oddly_circuit_breaker_failures_total` | Counter | `name` | Total consecutive failures intercepted by the breaker |
| `oddly_circuit_breaker_fallbacks_total` | Counter | `name` | Total invocations of fallback paths under open breaker conditions |
| `oddly_degradation_level` | Gauge | — | Current degradation ladder rung (0: L0 Normal to 4: L4 Read-Only) |
| `oddly_shed_requests_total` | Counter | `route`, `reason` | Total requests rejected with 503 during shedding |
| `oddly_idempotency_conflicts_total` | Counter | `route` | Collisions on Redis idempotency locks returning 409 |
| `oddly_default_partition_rows_total` | Counter | — | Submissions routed to DEFAULT partition (triggers immediate page) |
| `oddly_queue_depth` | Gauge | `queue_name`, `state` | BullMQ background jobs in `waiting`, `active`, `delayed`, `failed` |
| `oddly_queue_oldest_job_age_seconds` | Gauge | `queue_name` | Age of the longest-waiting job in worker queues |
| `oddly_final_batch_chunk_progress` | Gauge | `chunk_id`, `status` | Progress tracking across 5,000-submission chunks in final match |
| `oddly_provisional_refresh_evaluated_total` | Counter | — | Total players examined in provisional twin refresh sweeps |
| `oddly_provisional_upgrades_total` | Counter | — | Total twin upgrades (>= +0.10 similarity) discovered |


