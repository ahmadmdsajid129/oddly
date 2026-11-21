# Oddly — Allowlisted Event Dictionary & Telemetry Specification

**Version:** 1.0.0  
**Effective Date:** 2026-11-15  
**Governing Principles:** `rules.md` Rule 13 (Consent Rule), Rule 14 (No Sensitive Inference), Rule 15 (No Identity-Joined Profiling), ADR-042.

---

## 1. Operating Rules and Boundaries

1. **Strict Typed Allowlist:** Only events defined in this document are accepted by `POST /v1/events`. Any unrecognised event or unexpected JSON property triggers immediate payload validation rejection (`400 VALIDATION_FAILED`) or silent discard.
2. **Zero PII & Free-Text:** Absolutely no user names, email addresses, phone numbers, raw IP addresses, device serial numbers, or free-text user inputs may be captured in event properties.
3. **Pseudonymous Analytics ID:** All events are keyed by a pseudonymous `analytics_id` generated client-side and mapped 1-to-1 in `analytics_ids`. It is completely decoupled from user profile records and is purged upon DPDP erasure requests.
4. **Consent-Gated Ingestion:** Events are accepted and stored only for players who have granted explicit, withdrawable `'analytics'` consent in Settings (default is strictly OFF).
5. **Decoupled from Submit Hot Path:** The event pipeline runs on the **Low priority lane** (rank 7 load shedding). Transmitted asynchronously via `navigator.sendBeacon` or micro-batched fetch. Never executed inline during question answering or submission.

---

## 2. Event Catalog

| Event Name | Allowed Properties (Zod Schema) | Purpose | Aggregated Into |
|---|---|---|---|
| `drop_viewed` | `drop_date: string (YYYY-MM-DD)`, `source: "notification" \| "challenge_link" \| "direct" \| "pwa_launch"` | Top of daily funnel conversion tracking | `daily_funnel_stats` |
| `question_shown` | `drop_date: string`, `question_id: string (uuid)`, `position: number (1-5)` | Denominator for dwell, change, and abandon calculations | `question_stats_daily.shown_count` |
| `question_answered` | `question_id: string (uuid)`, `position: number (1-5)`, `dwell_ms: number (0-120000)`, `time_to_lock_ms: number (0-120000)`, `changes_count: number (0-50)`, `back_count: number (0-20)` | Question friction, ambiguity, and difficulty metrics | `question_stats_daily.dwell_p50_ms`, `dwell_p90_ms`, `change_rate`, `back_rate` |
| `drop_abandoned` | `drop_date: string`, `last_position: number (1-5)`, `elapsed_ms: number` | Pinpoint drop-off points in the five-question flow | `question_stats_daily.abandon_rate` |
| `submission_completed` | `drop_date: string`, `total_ms: number` | Play completion rate and end-to-end latency | `daily_funnel_stats.completions` |
| `reveal_viewed` | `drop_date: string`, `screen: "twin" \| "oddness"`, `dwell_ms: number` | Engagement with matching results | `daily_funnel_stats.reveal_dwell` |
| `card_flipped` | `drop_date: string`, `side: "front" \| "back"` | Share card front/back engagement | `card_interaction_stats` |
| `share_tapped` | `drop_date: string`, `format: "story" \| "square" \| "link"`, `card_face: "front" \| "back"` | Viral share intent | `share_stats_daily.taps` |
| `share_completed` | `drop_date: string`, `format: "story" \| "square" \| "link"`, `channel: "web_share" \| "clipboard" \| "download"` | Confirmed share distribution | `share_stats_daily.completed` |
| `link_opened` | `source: "challenge" \| "recap" \| "orbit"`, `has_referrer: boolean` | Incoming viral traffic measurement | `viral_k_stats` |
| `link_play_started` | `source: "challenge" \| "recap" \| "orbit"` | Conversion of shared link visitors into active players | `viral_k_stats` |
| `keep_sent` | `drop_date: string` | Connection feature health: Keep request volume | `orbit_funnel_stats` |
| `keep_accepted` | `drop_date: string` | Connection feature health: Orbit establishment rate | `orbit_funnel_stats` |
| `orbit_ended` | `duration_days: number` | Connection retention and churn rate | `orbit_funnel_stats` |
| `expression_sent` | `expression_key: string` | Daily interaction frequency within active Orbits | `orbit_interaction_stats` |
| `telepathy_guessed` | `drop_date: string`, `is_sync_round: boolean` | Telepathy engagement and completion | `telepathy_stats` |
| `antitwin_opened` | `drop_date: string`, `differed_count: number (0-5)` | Opposite-twin surface interest | `antitwin_stats` |
| `notification_opened` | `channel: "drop_live" \| "orbit_activity" \| "recap_final"`, `hour_bucket: number (0-23)` | Optimal notification delivery timing | `notification_timing_stats` |
| `install_prompt_shown` | `outcome: "accepted" \| "dismissed"` | PWA installation conversion | `pwa_stats` |
| `push_optin` | `status: "granted" \| "denied"` | Push notification opt-in funnel | `push_stats` |
| `perf_vitals` | `lcp_ms: number`, `inp_ms: number`, `cls: number`, `device_class: "low" \| "mid" \| "high"`, `connection_type: "4g" \| "3g" \| "wifi"` | Real-user performance monitoring on target budget devices | `performance_vitals_daily` |
| `meme_rated` (M3+) | `meme_id: string (uuid)`, `rating: "funny" \| "not_for_me"` | Community humor taste and Wilson score calculation | `meme_stats`, `player_taste` |
| `lane_viewed` | `open_lanes_count: number`, `last_played_lane: string \| null` | Home lane picker impressions and lane exposure | `lane_funnel_stats` |
| `lane_selected` | `lane_slug: string`, `position_index: number` | Lane selection preference and picker rank conversion | `lane_funnel_stats` |
| `lane_switched` | `from_lane: string`, `to_lane: string` | Cross-lane exploration and secondary play | `lane_funnel_stats` |
| `lane_interest_tapped` | `lane_slug: string` | Demand signal for planned/coming-soon lanes | `lane_interest_stats` |
| `lane_resting_seen` | `lane_slug: string` | Frequency of resting-state encounters | `lane_health_stats` |
| `format_interacted` | `format: "pick1" \| "pick2of6" \| "rank3" \| "slider7" \| "scene" \| "say_it"`, `duration_bucket: "0-5s" \| "5-15s" \| "15-30s" \| ">30s"` | Interaction engagement across polymorphic formats | `format_performance_stats` |
| `rank_reordered_count` | `moves_count: number` | Rank3 interaction depth and drag vs. tap usability | `format_performance_stats` |
| `slider_moved_count` | `adjustments_count: number` | Slider7 precision and thumb movement frequency | `format_performance_stats` |
| `text_started` | `lane_slug: string` | Say it composer initiation (strictly ZERO text content) | `say_it_funnel_stats` |
| `text_submitted` | `length_bucket: "1-20" \| "21-50" \| "51-80"` | Say it answer length distribution (strictly ZERO text content) | `say_it_funnel_stats` |
| `text_rejected` | `reason_class: "pii" \| "blocklist" \| "length"` | Moderation screening filter efficacy | `say_it_moderation_stats` |
| `tie_group_seen` | `size_band: "1" \| "2-10" \| "11-50" \| "51-200" \| "201-1000" \| "1000+"` | Honest tie-group size exposure to players | `tie_group_telemetry` |
| `why_you_two_opened` | `rare_matches_count: number` | Player interest in rare-answer tie-break explanations | `result_depth_stats` |
| `super_twin_seen` | `shared_lanes_count: number`, `lanes_list: string[]` | Super twin celebration card views and virality | `super_twin_stats` |

---

## 3. Ingestion Architecture (`POST /v1/events`)

### 3.1 Client Implementation
- **Batching:** Client collects events in memory and flushes:
  - On page transition (e.g. from Question 5 to Review).
  - On visibility change (`document.visibilityState === 'hidden'`) via `navigator.sendBeacon`.
  - Every 30 seconds if un-flushed events exist.
- **Client Footprint:** Implemented in pure TypeScript without third-party analytics libraries. Total bundle impact: **< 450 bytes** gzipped.

### 3.2 Ingestion Handler & Degradation
- **Endpoint:** `POST /v1/events`
- **Response:** `HTTP 202 Accepted` with empty body.
- **Priority Lane:** Low (Resource Rank 7).
- **Degradation Controls:**
  - **L0 (Normal):** 100% of consented events ingested.
  - **L1 (Conserve):** Deterministic 50% client-side sampling (hash of `analytics_id % 2 === 0`).
  - **L2+ (Protect Core / Survive / Static):** 100% load shed. Client suppresses network dispatch and clears memory buffer.

### 3.3 Storage and Compaction
- **Raw Partitioning:** `events_raw` is range-partitioned daily by `drop_date`.
- **90-Day Compaction:** A nightly maintenance worker rolls events into aggregate tables (`question_stats_daily`, `tag_stats_daily`, `daily_funnel_stats`), and drops raw partitions older than 90 days (`app_config: signals.events_retention_days`).
- **DPDP Deletion Hook:** When a user requests account erasure (`DELETE /v1/me`), their `analytics_id` is looked up in `analytics_ids`, all rows matching that ID in `events_raw` and `player_taste` are deleted, and the mapping itself is purged.

---

## 4. PostHog Reconciliation Decision

In Phase 12, PostHog was evaluated for product telemetry (`P12.01`, `P12.02`). To prevent double instrumentation and bloat:

1. **Unified Schema:** This Event Dictionary serves as the **single source of truth** for both the first-party PostgreSQL pipeline and any future PostHog instance.
2. **First-Party by Default:** The first-party pipeline (`POST /v1/events` -> PostgreSQL) powers Mission Control question quality, tag affinity, and editorial suggestions out-of-the-box.
3. **Optional PostHog Proxy:** If PostHog is activated, the server-side API or worker forwards the exact same allowlisted pseudonymous payload to PostHog via webhook or server SDK. **No client-side PostHog JS snippet is ever loaded on the `/play` route**, preserving the 159.5 KB bundle ceiling.
