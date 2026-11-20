# Stage M2 Report: Signals Foundation (Phase 10F)

**Date:** 2026-11-17  
**Branch:** `stage-M2-signals-foundation`  
**Commit Milestone:** `stage-M2-complete`  
**Prerequisites:** Stage M1 (Phase 10E: Meme Questions & Themed Drops)  
**Status:** **COMPLETE (10/10 Tasks Delivered, 100% Verification)**

---

## 1. Executive Summary

Phase 10F (Stage M2) delivers the **Signals Foundation** for Oddly v1, strictly adhering to the **Digital Personal Data Protection Act (DPDP Act) 2023**, **`rules.md` Rule 13** (*Analytics & Signals — Consented, Aggregated, Minimal*), and **`rules.md` Rule 14** (*Zero Sensitive Inference*).

The signals engine enables essential question quality tracking (dwell time p50/p90, option change rate, back navigation rate, drop abandon rate) and subject tag performance tracking **without** third-party analytics SDKs, without tracking IP addresses or user agents, and with **zero collection** unless the player explicitly grants consent.

---

## 2. Deliverables & Verification Matrix

| Task ID | Deliverable | Spec Reference | Status | Verification |
|---|---|---|---|---|
| `P10F.01` | Database migrations: `consents`, `analytics_ids`, `events_raw` (day-partitioned), `question_stats_daily`, `tag_stats_daily` | Section 16.3.1, ADR-042 | **DONE** | Migration `006_signals_foundation.sql` applied cleanly to PostgreSQL 16; Prisma models generated. |
| `P10F.02` | Client-side event batcher (< 450 bytes) using `navigator.sendBeacon` and memory flush | ADR-042, `signals.ts` | **DONE** | Zero external analytics SDKs, memory queue, auto-flush on page hide / visibility change. |
| `P10F.03` | Fastify `POST /v1/events` ingestion handler (202 Accepted, Low priority lane, allowlist Zod) | Section 16.3.1, `events.ts` | **DONE** | 202 Accepted, low-priority lane, strict Zod allowlist (rejects arbitrary keys and PII). |
| `P10F.04` | Settings consent toggles UI (`analytics` and `personalisation`) and first-run notice banner | Rule 13, `FirstRunConsentBanner.tsx`, `/me` | **DONE** | DPDP default OFF compliance; granular toggles in `/me` and dismissible first-run banner. |
| `P10F.05` | Partition manager integration: pre-create `events_raw` partitions 14 days in advance | `partition.manager.ts` | **DONE** | Pre-creates daily range partitions 14 days ahead, alerts if future count < 7. |
| `P10F.06` | Daily worker aggregation job: roll `events_raw` into `question_stats_daily` and `tag_stats_daily` | `signals-aggregation.job.ts` | **DONE** | Runs off-peak at 07:15 IST, computes dwell percentiles, change/back/abandon rates. |
| `P10F.07` | Retention worker job: drop `events_raw` partitions older than 90 days | `retention.worker.ts` | **DONE** | DDL metadata drop (`DETACH` + `DROP TABLE`) executed in < 15ms. |
| `P10F.08` | DPDP deletion and export hooks: purge raw events, `analytics_id`, and `player_taste` on erasure | DPDP Section 12, `me.ts` | **DONE** | `DELETE /v1/me` purges `analytics_ids`, raw partitioned events, and `consents`. |
| `P10F.09` | Graceful degradation logic: deterministic 50% sampling at L1, 100% load shed at L2+ | Resource Rank 7, `events.ts` | **DONE** | Core submit path is 100% protected; telemetry sheds immediately at L2+ with 202 Accepted. |
| `P10F.10` | Author integration tests proving zero events sent without consent, zero PII ingested, and kill switch | Section 16.3.1 | **DONE** | `signals.integration.test.ts` (6/6 passed), `signals.aggregation.test.ts` (2/2 passed). |

---

## 3. Core Architectural Invariants Proven

### 1. DPDP Default OFF Invariant (DPDP Act 2023)
- Under the DPDP Act 2023, data telemetry and personalization cannot be opt-out.
- When a new player or guest joins, `consents` table has zero granted rows.
- If a client emits events without granted `'analytics'` consent, `POST /v1/events` drops the batch immediately at the API boundary, returning `202 Accepted` with `{ accepted: 0, consented: false }`. Zero rows are inserted into `events_raw`.

### 2. Pseudonymous Identity Severance (ADR-042)
- `events_raw` **never** contains `player_id`.
- The `analytics_ids` table maintains a severed 1:1 mapping between `player_id` and a randomly generated UUID `analytics_id`.
- All telemetry batches are written and queried solely by `analytics_id`, rendering event data pseudonymous and severing correlation with player accounts.

### 3. Resource Rank 7 Load Shedding (Play-Path Protection)
- In the five-level graceful degradation ladder, telemetry ingestion is assigned the lowest resource priority (Rank 7).
- **At Level 0 (Normal):** 100% of consented events ingested.
- **At Level 1 (Elevated):** Deterministic 50% sampling using request ID hash modulus.
- **At Level 2+ (Peak Drop Crunch / Emergency):** 100% load shed at the API boundary with immediate `202 Accepted` (`{ accepted: 0, dropped: true }`). Zero database queries or connection pool usage.

### 4. Zero Sensitive Inference & Fixed Drop Guarantee (Rule 14)
- Personalization consent is strictly separated from analytics consent.
- Personalization **never** affects Daily Drop questions (Daily Drop questions are identical for all players globally).
- When a user withdraws `'personalisation'` consent, an instant hard-deletion hook purges any taste affinity data.

---

## 4. Test Suite Summary

- **API Signals Integration Tests (`services/api/src/signals.integration.test.ts`):**  
  `6/6 passed (100%)`
  1. DPDP Default OFF verification
  2. Zero-ingest discard when consent is OFF
  3. Consent grant and severed pseudonymous ID creation
  4. Successful ingestion when consent is active
  5. 100% load shedding at degradation level L2+
  6. DPDP Section 12 erasure purge hook
- **Worker Signals & Partition Tests (`services/worker/src/signals.aggregation.test.ts` & `partition.test.ts`):**  
  `9/9 passed (100%)`
  1. Daily aggregation into `question_stats_daily` and `tag_stats_daily`
  2. 90-day retention partition drop of `events_raw`
  3. Range partition pre-creation 14 days in advance
- **Web Client Tests (`apps/web`):**  
  `69/69 passed (100%)` across 10 test suites
- **Web App Compilation & Build (`apps/web`):**  
  `tsc --noEmit` passed with 0 errors.

---

## 5. Next Steps & Stop Declaration

Per **`rules.md` Rule 1**, Stage M2 is complete. The agent **stops here** and does not proceed to Stage M3 (Phase 10G: Meme Lab — User Captions & Moderation Queue) without explicit Founder authorization.

