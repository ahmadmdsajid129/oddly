# Oddly — Stage M0 Report: Memes, Signals and Insights Engine Analysis and Documentation

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-M0-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->



**Date:** 2026-11-15  
**Branch:** `stage-M0-meme-signals-docs`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1 (Documentation and analysis only. Zero code, zero migrations, zero seeds, zero dependencies changed).  

---

## 1. What Changed Per Document

| Document | Key Changes Applied | Commit |
|---|---|---|
| `rules.md` | **Rule 12 (Identical Drop Rule):** Five questions of a Drop are 100% identical globally; zero personalisation on Drop questions.<br>**Rule 13 (Consent Rule):** Separate, withdrawable DPDP consent for analytics and personalisation; default OFF; deletion on withdrawal.<br>**Rule 14 (No Sensitive Inference):** Never infer or store protected categories from taste or timing; build-fail unit test on forbidden tag matches.<br>**Rule 15 (No Identity-Joined Profiling):** Pseudonymous `analytics_id`; $k \ge 20$ group reporting only; zero individual dashboards.<br>**Rule 16 (Experiment Rule):** A/B tests run strictly on non-Drop surfaces via flags with documented hypothesis and kill switch.<br>**Rule 17 (No Pressure to Pay):** Daily play free forever; zero guilt copy or streak death urgency; max 1 offer per 14 days; stop for 90 days after 2 dismissals.<br>**Rule 18 (Free-Text Exception):** Scoped exception for Meme Lab captions ($\le 100$ chars, moderation-gated; marked inactive until Stage M3 is approved).<br>**Rule 19 (Orbit Subject-Sync Amendment):** Inside active Orbit, show aggregate agreement rates per tag with min 5 shared answers; individual picks remain hidden.<br>**Rule 9 Reminder:** Any new dependency (analytics SDK, payments, moderation) must have failure modes documented before use.<br>**Section 9.2:** Editorial rules for meme questions (zero right/wrong, language-light, no forbidden topics, no group mockery, balanced entropy, original-to-Oddly policy, mandatory tagging).<br>**Change Log:** Added 2026-11-15 entry. | `669bfda` |
| `product.md` | **Non-Goals Additions:** NO user image uploads, NO selling user data, NO propensity-to-buy models in v1, NO per-user Drop question changes.<br>**Section 4.3:** Added success metrics for Meme Questions and Signals pipeline.<br>**Section 11B:** Full specifications for F24 (Meme questions & themed Drops), F25 (Signals foundation), F26 (Meme Lab), F27 (Insights engine), F28 (Taste sync by subject in Orbit), F29 (Recognition: badges & featured memes), F30 (ML ranker), and F31 (Premium groundwork). | `9966cf2` |
| `architecture.md` | **Section 7.1:** Added 10 new route policy rows (`/v1/events`, `/v1/consents`, `/v1/memes/*`, `/v1/me/*`, `/v1/orbits/:id/subject-sync`).<br>**Section 12:** Updated degradation ladder: `/v1/events` and Meme Corner are rank 7 load-shedding priorities (sampled 50% at L1, shed at L2+).<br>**Section 16.3:** Added complete data architecture for M0: `tags`, `question_tags`, `meme_templates`, `questions` extensions, `drops` extensions, `consents`, `analytics_ids`, `events_raw` (day-partitioned), `question_stats_daily`, `tag_stats_daily`, `player_taste`, `meme_submissions`, `meme_ratings`, `meme_stats`, `badge_definitions`, `creator_badges`, `featured_memes`, runtime config keys, and ER invariants.<br>**Section 17:** Added ADR 041 (Meme Questions & Taxonomy), ADR 042 (Consented Signals & PostHog Reconciliation), ADR 043 (Meme Lab Captions & Moderation), and ADR 044 (Statistical Insights & Zero Sensitive Inferences). | `8ccd3a3` |
| `design.md` | **Section 12B:** Detailed Sticker Pop specifications for Meme question card, Meme Corner card, consent banner & Settings toggles, Meme Lab composer & status cards, creator badges and Satori achievement cards, featured memes surface, Orbit subject-sync rows, touch targets $\ge 44\text{px}$, and accessibility. Zero new colours.<br>**Section 22:** Added v1.2 change log line. | `6bbbc72` |
| `docs/admin-panel-spec.md` | **Section 6.3:** Extended automatic question checks with items 9 to 12 (subject tag present, template licensed/registered, captions & alt text forbidden scan, originality note).<br>**Addendum A:** Appended full Mission Control extensions: A1 (Tag taxonomy & template library [P1]), A2 (Question quality panel [P1]), A3 (Category performance & suggestions [P2]), A4 (Signals & consent admin [P1]), A5 (Meme Lab moderation queue [P2]), A6 (Recognition tools [P2]), A7 (Premium admin [P3]), A8 (Data-model additions), A9 (Admin API routes), and A10 (Acceptance checklist). | `778541b` |
| `docs/event-dictionary.md` | Created comprehensive allowlisted Event Dictionary & Telemetry Specification: 22 typed events, properties, Zod validation, priority lane, retention, compaction, and DPDP consent policies. | `72c0958` |
| `docs/capacity-model.md` | Added Section 6: Telemetry event volume math at 10k, 100k, and 10 lakh DAU; peak HTTP inflow (~222 req/sec); storage and 90-day compaction math (~1.8 GB/day at 10 lakh); worker runtime analysis; confirmation of zero impact on submit hot path. | `6993d05` |
| `docs/meme-and-insights-features.md` | Comprehensive architectural analysis: conflict resolution, component reuse, scale projections, client bundle plan (< 450B), DPDP compliance, abuse threat models, and neutral taxonomy audit. | `dc9cfe9` |
| `task.md` | Added Phase 10E (Meme Questions, Stage M1), Phase 10F (Signals Foundation, Stage M2), Phase 10G (Meme Lab, Stage M3), Phase 10H (Insights Engine, Stage M4), Phase 10I (Taste & Recognition, Stages M5/M6), Phase 10J (ML Ranker, Stage M7), and Phase 10K (Premium Groundwork, Stage M8). Expanded Phase 11 with tasks P11.26–P11.32. Recalculated dashboard (336 total tasks, 171 done, 51% progress). Added stage checklists and change log. | `efb99e9` |
| `README.md` | Updated Section 1 with approved meme questions and signals features; updated Section 5 documentation table pointing to `docs/event-dictionary.md`, `docs/meme-and-insights-features.md`, and Addendum A. | `7b9261b` |
| `AGENTS.md` | Added Memes, Signals & Insights Rule: "Never personalise Drop questions; analytics only with consent; no sensitive inference." | `df7e162` |
| `memory.md` | Recorded Stage M0 completion, decisions log entries for ADR 041 to ADR 044, open questions for Founder with recommended defaults, admin spec mismatches, and next steps. | `b58e7f5` |

---

## 2. Analysis Summary (Section 8)

1. **Conflicts & Resolutions:**
   - *Drop Parity vs Personalisation:* Prohibited by Rule 12. Drop questions are 100% identical globally. Personalisation is strictly confined to non-Drop surfaces (optional Meme Corner card, notification send-hour cohorts, suggested share card themes).
   - *DPDP Compliance vs Analytics:* Handled via Rule 13 and Rule 15: separate, granular consent toggles in Settings, default OFF; pseudonymous `analytics_id` keying; zero join with user profile identity.
   - *Sensitive Inference Defense:* Prohibited by Rule 14: neutral lifestyle taxonomy only; automated build-fail unit test verifies zero tag keys overlap with forbidden topics.
   - *User Free-Text vs Rule 3:* Addressed by Rule 18: scoped exception for Meme Lab captions ($\le 100$ characters) passed through admin moderation before publication. Inactive until Stage M3.
   - *Orbit Privacy vs Subject Sync:* Addressed by Rule 19: aggregate percentage only across min 5 shared questions; secret individual picks remain completely hidden.
2. **Infrastructure Reuse:**
   - 100% reuse of the local SVG illustration registry (D-015), polymorphic question renderer, JSON batch importer, shared Zod validation engine, Settings screen, push pipeline, and Satori 3D flip card generator.
3. **Scale Projections (10 Lakh DAU):**
   - Ingests ~6,000,000 consented events/day.
   - Client-side micro-batching reduces peak HTTP traffic to `POST /v1/events` to **~222 requests/sec** (< 5% CPU of 3-instance API cluster).
   - `events_raw` produces **~1.80 GB / day**; 90-day rolling partition compaction keeps storage bounded at ~162 GB.
   - Nightly aggregation worker executes in **< 4.5 seconds** off-peak (07:15 IST).
   - **Zero impact on submit hot path:** telemetry is dispatched asynchronously on the Low priority lane.
4. **Bundle Budget Plan:**
   - Play route (`/play` or `/`) initial bundle budget ($\le 159.5\text{ KB}$ approved exception) is strictly protected.
   - Added play route JS: **< 450 bytes** gzipped (native `navigator.sendBeacon` and lightweight memory flusher).
   - Meme Corner, Meme Lab, and Badges are lazy-loaded on secondary routes.
5. **Neutral Taxonomy Audit:**
   - All 14 seed tags (`humour`, `daily-habits`, `absurd-hypotheticals`, `food-style`, `sleep-and-time`, `decision-style`, `nostalgia`, `phone-behaviour`, `music-mood`, `places`, `word-and-mood`, `colour-and-aesthetics`, `work-and-study-style`, `quirks`) audited and confirmed 100% neutral. Zero overlap with Section 9.1 forbidden topics.

---

## 3. PostHog Reconciliation Recommendation

In Phase 12, PostHog was planned for telemetry (`P12.01`, `P12.02`). To prevent double-instrumentation and avoid bundle bloat:

1. **Single Source of Truth:** `docs/event-dictionary.md` is the sole event dictionary for Oddly.
2. **First-Party Ingestion Default:** The first-party API (`POST /v1/events` -> PostgreSQL) powers Mission Control question quality, tag affinity, and editorial suggestions without external dependencies.
3. **Server-Side Proxy (If Kept):** If PostHog is activated in Phase 12, the server-side API forwards identical allowlisted pseudonymous event payloads via webhook or server SDK. **No client-side PostHog JS is ever loaded on the `/play` route**, protecting the 159.5 KB bundle ceiling.

---

## 4. Questions for the Founder (with Recommended Defaults)

1. **Themed-Drop Rotation:**  
   - *Question:* Should themed Drop rotations (e.g. weekly thematic groupings via `drops.theme_key`) be active by default?  
   - *Recommendation:* **Default to OFF (`app_config: drops.theme_rotation = false`)**. Keep daily Drops purely instinct-driven at launch; activate themed rotations only when a complete, cohesive 7-day editorial arc is planned and reviewed.
2. **Minimum Raters for Community Memes ($N \ge 200$):**  
   - *Question:* Is a sample threshold of 200 raters appropriate before computing Wilson lower-bound scores for Drop candidate promotion?  
   - *Recommendation:* **200 raters**. Provides 95% statistical confidence without premature promotion based on small-sample noise.
3. **Meme Lab Caption Character Ceiling (100 Characters):**  
   - *Question:* Is a 100-character limit optimal for user caption submissions?  
   - *Recommendation:* **100 characters**. Keeps captions punchy, readable in 2 lines at 360px mobile viewports, and discourages essay-style rants or abusive diatribes.
4. **Taste Affinity Rating Threshold ($n \ge 20$):**  
   - *Question:* Should player tag affinity (`player_taste`) require at least 20 ratings on that tag cluster before displaying or personalizing?  
   - *Recommendation:* **Yes, minimum 20 ratings**. Prevents volatile skewing from a user rating 1 or 2 outlier memes.
5. **Raw Events Retention Window (90 Days):**  
   - *Question:* Is 90 days of raw partitioned event retention (`events_raw`) sufficient before dropping daily partitions?  
   - *Recommendation:* **90 days**. Matches ADR-013 retention standards. Immutable daily rollups (`question_stats_daily`, `tag_stats_daily`) are retained permanently for longitudinal analysis.
6. **Featured Memes Page (`/featured`):**  
   - *Question:* Is a dedicated showcase page for the editor-curated "Meme of the Week" approved?  
   - *Recommendation:* **Approved as an editorial showcase**, provided it never displays ranked leaderboards, scores, or public creator competition.
7. **Payment Provider Evaluation for Gate G3 (Stage M8):**  
   - *Question:* Which payment providers should be benchmarked when product Gate G3 is reached?  
   - *Recommendation:* **Razorpay (India UPI Autopay / Cards) and Stripe**. To be formally evaluated under Rule 9 with documented failure modes once Gate G3 is authorized.

---

## 5. Mismatches Between Admin Addendum and Phase 11 Tasks

- **Phase 11 Task Alignment:**
  - `P11.26` (taxonomy/templates), `P11.27` (question quality), and `P11.28` (signals admin) are marked **[P1]** and ship with Stage 11.
  - `P11.29` (Meme Lab moderation queue) is marked **[P2]** and is required before Stage M3 can be built.
  - `P11.30` (category performance) and `P11.31` (recognition) are marked **[P2]**.
  - `P11.32` (premium admin) is marked **[P3]** and deferred until Gate G3.
- **Stage Ordering Invariant:** Admin spec Section 7 and Addendum A rely on the backend entities created in Stages F1 to F4 and M1 to M2. Therefore, **Stage 11 must be built AFTER Stages F4 and M2**.

---

## 6. Confirmation of Invariants

- **Zero Application Code Changed:** Confirmed.
- **Zero Database Migrations Executed:** Confirmed.
- **Zero Seeds Modified:** Confirmed.
- **Zero Dependencies Added:** Confirmed.

---

**Stage M0 complete.**
