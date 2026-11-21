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



---

## 7. Stage L0 Capacity & Volumetric Addendum: Lanes, Formats, Twin Depth and Say It (2026-11-21)

### 7.1 Volumetric Matrix by DAU & Lanes Played

At 10,000, 100,000, and 1,000,000 (10 Lakh) daily active players, assuming an average of 1, 2, or 4 lanes played per user per day:

| Metric | 10k DAU (1L / 2L / 4L) | 100k DAU (1L / 2L / 4L) | 10 Lakh DAU (1L / 2L / 4L) |
|---|---|---|---|
| **Daily Submissions** | 10k / 20k / 40k | 100k / 200k / 400k | 1.0M / 2.0M / 4.0M |
| **Daily Answers Rows** | 50k / 100k / 200k | 500k / 1.0M / 2.0M | 5.0M / 10.0M / 20.0M |
| **Relational Storage Growth/Day** | 8 MB / 16 MB / 32 MB | 80 MB / 160 MB / 320 MB | 800 MB / 1.6 GB / 3.2 GB |
| **Telemetry Events/Day (Consented)** | 150k / 300k / 600k | 1.5M / 3.0M / 6.0M | 15.0M / 30.0M / 60.0M |
| **32-Byte History Signatures** | 320 KB / 640 KB / 1.28 MB | 3.2 MB / 6.4 MB / 12.8 MB | 32 MB / 64 MB / 128 MB |

---

### 7.2 Extra Background Jobs per Lane
With each active lane operating its own Drop cycle:
1. **Drop Pre-Staging (06:30 IST):** 1 worker job per lane. Compiles JSON, caches in Redis (`lane:{slug}:drop:{date}`). Takes $< 50\text{ ms}$ per lane.
2. **Drop Live Transition (07:00 IST):** Transitions `drops.status = 'live'` across all open lanes simultaneously. Single fast SQL update.
3. **Drop Close & Final Recap (07:00–07:05 IST):** Evaluates mutual pairing and final twin assignments per lane. At Tier 1 (10k), takes $< 400\text{ ms}$ per lane. At Tier 3 (1M across 2 lanes = 500k/lane), chunked workers finish in $< 4.5\text{ minutes}$, well within the 07:10 IST recap deadline.
4. **Lane History Signature Roll (07:15 IST):** Nightly BitMinHash compaction job updates player signatures for active participants in that lane. Evaluates 28-day window incrementally ($< 25\text{ ms}$ per 1,000 players).

---

### 7.3 Redis Memory Allocation per Lane
For each active lane:
- Live counter (`lane:{slug}:players_today`): ~40 bytes.
- 10-minute velocity sliding window (`lane:{slug}:answered:10m`): ~1 KB.
- Pre-staged Drop cache (`lane:{slug}:drop:{date}`): ~12 KB.
- Provisional candidate working sets ($K=32$ candidate IDs): ~350 bytes per active session.
- **Total Redis Footprint per Lane:**
  - 10k players: ~3.5 MB per lane.
  - 100k players: ~35 MB per lane.
  - 10 Lakh players (500k in lane): ~175 MB per lane.
  - With 2 open launch lanes (Everyday + Memes), total Redis footprint at 10 lakh DAU is **~350 MB**, comfortably within standard 2 GB – 4 GB Redis provisioning.

---

### 7.4 Peak 07:00 IST Traffic Spike & Submit Hot Path Protection
- **Shared Clock vs. Staggering:** All lanes open at 07:00 IST. Submissions remain strictly 1 single HTTP POST write per completed lane Drop (`POST /v1/answers`).
- **No Submit Bloat:** The submit path handles validation and inserts the answer row.
- **Hot-Path Rule:** Zero embedding inference, zero mutual pairing graph resolution, and zero history signature lookups run on the submit path. All heavy matching runs asynchronously in workers or during the 07:05 IST final batch.

---

### 7.5 Matching Engine Scale: Stage A, B, and C
1. **Stage A (Brute Force Pairwise, $< 10,000$ players/lane):**
   - Pairwise matrix inside candidate tie clusters takes $< 300\text{ ms}$ in-memory.
2. **Stage B (Hash Bucketing, $10,000 - 100,000$ players/lane):**
   - Players are partitioned into coarse answer buckets; mutual pairing executes within buckets. Compute time $< 2.2\text{ seconds}$.
3. **Stage C (Approximate Nearest Neighbour, $> 100,000$ players/lane):**
   - HNSW / BitMinHash signature indexing bounds comparison to top $K=32$ candidates per user. Time complexity is strictly $O(N \cdot K \log K)$. Evaluates 500,000 lane participants in $< 45\text{ seconds}$ on 4 parallel worker cores.

---

### 7.6 Free-Text "Say It" Model & Vector Index Cost (Stage L6 / Gate G4)
- **Model Profile:** `paraphrase-multilingual-MiniLM-L12-v2` (or `multilingual-e5-small`) exported to 8-bit quantized ONNX.
- **Model Size on Disk / RAM:** ~118 MB.
- **Inference Latency on CPU:** Measured benchmark on 2.4 GHz vCPU: **~18 ms per 80-character sentence** on single core.
- **Worker Concurrency:** At 100k DAU with 20% participating in `say_it` (20,000 text submissions spread across 24h = ~0.23 submits/sec average, ~15 submits/sec peak):
  - 2 worker threads easily process 100 inferences/sec (providing $6.6\times$ peak headroom).
- **Index Memory:** Storing 384-dimensional float32 embeddings for 20,000 daily answers = $20,000 \times 384 \times 4\text{ bytes} \approx 30.7\text{ MB}$ RAM.
- **Purge Impact:** 7-day raw text purge and 28-day embedding drop run via partitioned metadata drops in $< 10\text{ ms}$.
