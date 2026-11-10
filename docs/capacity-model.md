# Oddly — Load Model and Capacity Math

> **Purpose:** Authoritative capacity model, resource formulas, and throughput calculations supporting Oddly from MVP to 10 lakh (1,000,000) daily players.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Planning Assumptions (To be validated by Stage 13 load tests)

---

## 1. Planned Peak Scale & Load Math

| Parameter | Baseline Planning Value | Mathematical Derivation / Operational Context |
|---|---|---|
| **Planned Peak Scale** | 10,00,000 (10 lakh) daily players | Target scale ceiling for Oddly v1.0 |
| **Morning Window Traffic (07:00 – 07:30 IST)** | 40% = 4,00,000 sessions | 40% of global daily active users arrive in the first 30 minutes |
| **Average Session Arrival Rate** | ~222 sessions / second | 4,00,000 sessions / 1,800 seconds |
| **Burst Factor over Average** | 5.0x | Peak arrival burst during notification reception & morning routine |
| **Peak Session Arrival Rate** | **~1,100 sessions / second** | 222 x 5.0 |
| **API Requests per Session** | ~4.0 requests | 1x Drop fetch, 1x Submit, 1x Results reveal, 1x Telemetry/share |
| **Total Peak Requests per Second (RPS)** | **~4,400 RPS** | 1,100 sessions/s x 4 calls |
| **Origin RPS (Non-CDN Cached)** | **~2,200 to 2,800 RPS** | Submissions + personalized results + events (Drop JSON & assets are CDN hits) |
| **Peak Submissions per Second** | **~1,100 submissions / second** | One final submission per completed session |
| **Database Rows Written per Submission** | ~7 rows | 1 submission + 5 question answers + 1 provisional match record |
| **Peak Database Row Inserts per Second** | **~7,700 rows / second** | 1,100 submissions/s x 7 rows |
| **Design Headroom Target** | **2.0x planned peak (2,200 submits/s)** | Target for meeting all SLOs with zero degradation |
| **Degradation Stress Envelope** | **Up to 5.0x planned peak (5,500 submits/s)** | Must degrade gracefully (L1 -> L3) without crashing or dropping data |
| **Viral Share Scenario** | 5,00,000 visitors in 10 minutes | Must achieve >95% edge CDN hit ratio on `/c/:shortId` landing pages |

---

## 2. In-Memory and Storage Budgets

### 2.1 Redis Memory Budget at Planned Peak (10 Lakh Players)
- **Vector Representation:**
  - Compact binary representation of 5 answers per player: ~20 bytes payload.
  - Redis Hash overhead + key identifier (`vec:{dropId}:{playerId}`): ~180 to 250 bytes per player.
  - **Total Vector Memory for 10 Lakh Players:**
    $$M_{\text{vectors}} = 10^6 \times 220\text{ bytes} \approx 220\text{ MB}$$
- **Live Answer Counters:**
  - 5 questions x up to 12 options = 60 integers.
  - Negligible memory footprint (< 100 KB).
- **Idempotency Keys (`idemp:{requestId}` with 24h TTL):**
  - $10^6 \times 120\text{ bytes} \approx 120\text{ MB}$.
- **Total Redis Ephemeral Memory per Drop:** **~350 MB to 500 MB**.  
  *(A standard 2 GB to 4 GB Redis instance provides substantial safety headroom).*

### 2.2 PostgreSQL Storage Growth & Retention Budget
- **Row Size Estimations:**
  - `submissions`: ~120 bytes
  - `answers`: ~80 bytes each x 5 = ~400 bytes
  - `matches`: ~150 bytes
  - Indexes & metadata overhead: ~300 bytes
  - **Total per Submission:** ~970 bytes (~1 KB).
- **Daily Storage Ingestion (10 Lakh Players):**
  $$\text{Daily Growth} = 10^6 \times 1\text{ KB} \approx 1.0\text{ GB / day} \quad (7\times 10^6\text{ rows / day})$$
- **Retention Strategy (90-Day Hot Window):**
  - 90 days hot partitioned storage: ~90 GB raw data.
  - After 90 days: Detailed `answers` rows compacted into user history summaries and archived to cold Parquet/JSON in R2/S3; raw partition dropped.

---

## 3. Special Traffic Herd Models

1. **Countdown Herd (07:00:00 IST):**
   - Tens of thousands of browser tabs reach 00:00:00 simultaneously.
   - *Mitigation:* Client jitter (0 to 4 seconds random delay), immutable Drop JSON pre-staged at 06:30 IST, Cloudflare Origin Shielding.
2. **Push Notification Herd (07:00 – 07:10 IST):**
   - Push notifications wake mobile devices within seconds.
   - *Mitigation:* Push queue slices dispatch in staggered batches of 5,000 users every 20 seconds.
3. **Timeline Overlap Hazard (06:59 – 07:10 IST):**
   - The D-1 Drop is finalising (computing locked matches and streaks) while the D Drop goes live.
   - *Mitigation:* Worker bulkhead separation; final batch worker runs in dedicated pool with max 25% DB connection limit.
4. **Retry Storm after Partial Outage:**
   - 100,000 retries hitting the API simultaneously.
   - *Mitigation:* Exponential backoff with full jitter on client; `@fastify/under-pressure` early load shedding; `Retry-After` header enforcement.

---

## 4. Measured Production Limits (To be populated during Stage 13)

| Scenario / Metric | Planning Assumption | Measured Result (Staging k6) | Pass / Fail | Notes |
|---|---|---|---|---|
| Max Sustainable Submissions / sec (T0) | 20 req/s | *[Pending Stage 13]* | — | |
| Max Sustainable Submissions / sec (T1) | 100 req/s | *[Pending Stage 13]* | — | |
| Max Sustainable Submissions / sec (T2) | 500 req/s | *[Pending Stage 13]* | — | |
| Max Sustainable Submissions / sec (T3) | 2,200 req/s | *[Pending Stage 13]* | — | |
| Event Loop Delay under 1,100 req/s | < 20 ms | *[Pending Stage 13]* | — | |
| Final Batch Duration (10 Lakh Players) | < 10 minutes | *[Pending Stage 13]* | — | |

