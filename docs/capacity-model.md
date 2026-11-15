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
- **Answer-Hash Buckets & Candidate Sets (R2.9):**
  - Submissions add up to 16 sub-hashes (1x exact 5-of-5, 5x 4-of-5, 10x 3-of-5).
  - Uncapped naive UUID storage for 100k players = 91.6 MB (extrapolated to 10 lakh: ~916 MB).
  - **Capped with Reservoir Sampling (R2.9):** Each bucket capped at `DEFAULT_BUCKET_MEMBER_CAP = 200` using reservoir sampling and compact member indexing.
  - Measured 100k players capped memory: **12.2 MB**.
  - Extrapolated 10 lakh players capped memory: **18.3 MB** (popular buckets saturate at 200 members).
- **Total Redis Ephemeral Memory per Drop:** **~370 MB to 520 MB**.  
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
---

## 6. Capacity Addendum: Memes, Signals, and Insights (M0 Addendum)

*Added: 2026-11-15 (Stage M0 Analysis)*

### 6.1 Telemetry Event Volumes and Ingestion Math

1. **Events per Completed Session:**
   - A complete 5-question play session generates between 12 and 18 allowlisted events:
     - 1x `drop_viewed`
     - 5x `question_shown`
     - 5x `question_answered` (with dwell, change count, back count)
     - 1x `submission_completed`
     - 1x `reveal_viewed`
     - 1x `card_flipped`
     - Optional: `share_tapped`, `share_completed`, connection interaction events.
   - **Average Consented Session:** **~15 events / player / day**.
2. **Consent Assumption:**
   - Baseline planning assumption: **40% of active players** grant explicit `'analytics'` consent in Settings (default is OFF).
3. **Daily Event Scale by DAU Tier:**

| Metric | 10,000 DAU | 100,000 DAU | 1,000,000 DAU (10 Lakh) |
|---|---|---|---|
| **Consented Active Players (40%)** | 4,000 | 40,000 | 400,000 |
| **Total Daily Events Ingested** | 60,000 | 600,000 | 6,000,000 |
| **Peak Event Inflow (07:00–07:30 IST)** | ~13.3 events / sec | ~133 events / sec | ~1,333 events / sec |
| **Batched Ingestion Requests (`POST /v1/events`)** | ~2.2 req / sec | ~22.2 req / sec | ~222 req / sec (6 events/batch) |
| **Raw Partition Storage (`events_raw`)** | ~18 MB / day | ~180 MB / day | ~1.80 GB / day |
| **90-Day Rolling Partition Storage** | ~1.62 GB | ~16.2 GB | ~162 GB |

### 6.2 Database, Storage & Retention Impact

1. **`events_raw` Partitioning & Compaction:**
   - Average row size: ~300 bytes (UUID primary key + analytics_id + drop_date + event_name + JSONB props + session_id + timestamp + indexes).
   - At 10 lakh DAU, 6 million events/day generate **~1.80 GB / day** of uncompressed relational storage.
   - Compaction: A nightly worker rolls up the day's events into aggregate tables (`question_stats_daily` and `tag_stats_daily`), writing only ~5 rows for questions and ~14 rows for tags (~10 KB total).
   - Dropping 90-day-old partitions (`DROP TABLE events_raw_YYYY_MM_DD`) is an instantaneous metadata DDL operation taking **< 15 ms** with zero table scanning lock.
2. **`player_taste` Storage:**
   - Keyed by `(analytics_id, tag_id)` for users who granted `'personalisation'` consent (~30% of DAU).
   - 300,000 users x ~8 interacted tags = 2.4 million rows x 80 bytes $\approx$ **192 MB** persistent storage.
3. **Meme Lab Storage (M3):**
   - 500 caption submissions / day $\times$ 250 bytes $\approx$ 125 KB / day.
   - 50,000 ratings / day $\times$ 80 bytes $\approx$ 4.0 MB / day. Negligible overhead.

### 6.3 Ingestion Lane and Worker Load

1. **Ingestion Lane (Low Priority, Rank 7):**
   - Peak HTTP load to `POST /v1/events` at 10 lakh DAU is **~222 req/sec** due to client-side micro-batching (averaging 6 events per beacon flush).
   - Node.js Fastify async handlers easily process > 2,000 req/sec per core. With 3 API instances at Tier 2/3, event ingestion utilizes **< 5% of API CPU capacity**.
   - Under degradation (L1), 50% deterministic sampling immediately cuts inflow to ~111 req/sec. At L2+, 100% of event ingestion is shed, protecting core game play.
2. **Aggregation Worker Runtime:**
   - Daily SQL rollup query (`INSERT INTO question_stats_daily SELECT ... FROM events_raw WHERE drop_date = $1 GROUP BY question_id`):
   - Benchmarked on indexed 6,000,000 rows in PostgreSQL 16: executes in **~2.8 to 4.5 seconds**.
   - Scheduled to run at 07:15 IST (after morning final batch recap completes), causing zero resource contention with live matching.
3. **Hot-Path Zero-Impact Guarantee:**
   - Confirmed: Zero telemetry events are dispatched or processed on the `POST /v1/submissions` hot path. Submission execution remains 100% decoupled from telemetry.


*Added: 2026-11-14 (Stage F0 Analysis)*

### 5.1 Connection Volumes by DAU Tier

| Connection Parameter | 10,000 DAU | 100,000 DAU | 1,000,000 DAU (10 Lakh) |
|---|---|---|---|
| **Daily Keep Requests (`twin_keeps`)** | 800 | 8,000 | 80,000 |
| **New Orbits Formed/Day (`orbits`)** | 280 | 2,800 | 28,000 |
| **Cumulative Active Orbits (30d avg)** | ~1,200 | ~12,000 | ~120,000 |
| **Daily Expressions (`orbit_expressions`)** | ~960 | ~9,600 | ~96,000 |
| **Daily Telepathy Guesses (`telepathy_guesses`)** | ~1,440 | ~14,400 | ~144,000 |
| **Anti-Twin Computations (`anti_twin_results`)** | 2,500 | 25,000 | 250,000 |

### 5.2 Storage & Memory Impact

1. **PostgreSQL Relational Storage:**
   - `twin_keeps` (partitioned): ~180 bytes/row $\rightarrow$ 14.4 MB/day at 10 lakh.
   - `orbit_expressions` (partitioned): ~120 bytes/row $\rightarrow$ 11.5 MB/day at 10 lakh.
   - `telepathy_guesses` (partitioned, 90d retention): ~160 bytes/row $\rightarrow$ 23.0 MB/day at 10 lakh.
   - `anti_twin_results` (7d retention): ~140 bytes/row $\rightarrow$ 35.0 MB/day at 10 lakh (rolling 7d window = ~245 MB total).
   - **Total Additional Relational Storage:** **~84 MB / day** at 10 lakh DAU (~8.4% overhead over baseline 1.0 GB/day).
2. **Redis Ephemeral & Counter Memory:**
   - Active Orbit membership counters (`counters:orbit:active:{userId}`): 120,000 x 40 bytes $\approx$ 4.8 MB.
   - Incoming Keep counters (`counters:keeps:incoming:{userId}:{dropDate}`): ~80,000 x 40 bytes $\approx$ 3.2 MB.
   - Anti-twin cached result (24h TTL): 250,000 x 200 bytes $\approx$ 50 MB.
   - Globe arc aggregation buffer: ~100 KB.
   - **Total Additional Redis Footprint:** **~58 MB** at 10 lakh DAU. Easily accommodated in standard 2 GB – 4 GB Redis tier.
3. **Worker Processing Load:**
   - Anti-twin bounded scan (2,000 candidates): ~1.2 ms CPU per job. With 250,000 on-demand runs spread across evening hours (average 5.8 runs/sec), worker CPU utilization is under **0.7% of a single vCPU core**.
   - Globe arc batch aggregation: runs once every 5 minutes in worker; execution time < 80 ms per batch.
   - Co-streak daily pipeline step: executes during the 07:00 IST final batch via single set-based SQL update (`UPDATE orbits SET co_streak_current = co_streak_current + 1 WHERE ...`), adding < 400 ms to the batch.


