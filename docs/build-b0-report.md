# Stage B0: Comprehensive Implementation & Architecture Report

> **Project:** Oddly v1  
> **Stage:** B0 (Lanes-First Build, From First Screen to Chat Unlock)  
> **Author:** Antigravity Coding Agent  
> **Branch:** `stage-B0-build`  
> **Date:** 2026-11-24  

---

## 1. Executive Summary

This report documents the lanes-first architectural transformation and end-to-end build of Oddly, starting from the first screen (18+ confirmation and lane picker) through daily Drop gameplay, multi-format similarity scoring, twin depth with mutual pairing, dedicated Memes lane, Orbit and connection safety, Telepathy and Sync, Twin Globe, Anti-twin, and the Three Doors chat unlock engine up to the `chat_ready` state. Chat messaging itself, profiles, party rooms, games platform, leaderboards, and payments remain strictly out of scope per the Stage B0 fence.

**Slice Implementation Status:**
- **Verified:** Slice A0 (Pre-flight baseline, schema migration 014, and demo mode scaffolding with synthetic isolation tests passing; commit `640b73e`, tag `b0-A0-done`), Slice A1 (Lanes Foundation, Lane Picker First, Per-Lane Drop Clock, Multi-Lane Play; tag `b0-A1-done`).
- **Not Started:** Slices A2 through A14 (Tier A) and B1 through B5 (Tier B), plus Slice Z.
- **Out of Scope (Not Built):** Chat messaging screen, message storage, message scanner, party rooms, hotspot/room codes, multiplayer games, solo games, leaderboards, public profiles, bios, photos, followers, payments, subscriptions, lives, Premium, Say It (typed replies), Situations lane, Brain lane, Meme Lab, creator badges.

### 1.1 Baseline Audit: M3 to M8 Feature Status in Code
As required by the Founder instructions, the codebase was audited for legacy Stages M3 through M8 features:
1. **M3 (Meme Lab user captions & moderation queue):** Tables `meme_submissions`, `meme_ratings`, `meme_stats`, and web routes (`/memes/new`) exist from earlier stages. In Stage B0, Meme Lab is excluded by the scope fence (memes exist strictly as a lane). The runtime flag `feature.meme_lab` is set to `false` (OFF).
2. **M4 (Insights engine):** Tables `question_stats_daily`, `tag_stats_daily`, and admin routes `/v1/admin/insights/*` exist in code for aggregate statistical telemetry (no DPDP sensitive inferences).
3. **M5 & M6 (Recognition Engine & Creator Badges):** Tables `badge_definitions`, `creator_badges`, `featured_memes` exist in schema from migration 009. These represent caption creator badges, which are distinct from Stage B0/B3 collector badges (`collector_badge_definitions`, `collector_badges`). Creator badge awarding is inactive in consumer flows.
4. **M7 (ML Ranker):** Tables `ml_models`, `ml_shadow_predictions` exist. The feature flag `feature.ml_ranker` is confirmed `false` (OFF) and `ml_ranker.mode` is set to `"off"`.
5. **M8 (Premium & Monetization Groundwork):** Tables `subscriptions`, `payment_transactions`, and entitlement checks exist. The feature flag `feature.premium` is confirmed `false` (OFF). No premium UI surfaces exist in the web app.

All such out-of-scope features are confirmed behind OFF feature flags, recorded in `docs/build-b0-conflicts.md` (C-11).

---

## 2. Environment & Baseline

- **Node.js:** v20 LTS (`v20.19.5`)
- **Package Manager:** `pnpm@9.15.4` (frozen lockfile)
- **Base Commit:** `a3b7b8f` on `main` (includes Stages L0-L4, F1-F4, M1-M8)
- **Active Branch:** `stage-B0-build`
- **Initial Play Route Bundle JS:** `152.5 KB` compressed (Approved ceiling: `159.5 KB`)
- **Test Baseline:** 125/125 web unit tests passing; 229 shared unit tests passing.

---

## 3. Founder Decisions Assumed

| # | Founder Decision | Replaces / Clarifies | Implementation Detail |
|---|---|---|---|
| D1 | Lane picker is the first screen after 18+ confirmation | L0 text: "picker appears after first result" | First-time players see picker immediately; returning players see "Continue in <last lane>" top card |
| D2 | One lane = one Drop per day = one match pool | Reinforces Rule L2 lane isolation | Every connection and scoring entity carries `lane_id` |
| D3 | Memes is a lane; meme content lives only in Memes | M0 F24 "themed Drops" | Community memes feed exclusively into Memes lane (`slug = 'memes'`) |
| D4 | Streak per lane + overall days played counter | Blueprint single streak | Per-lane streaks with max 1 reminder push/day |
| D5 | Players may play several lanes the same day | Unspecified | Separate submission and twin per lane |
| D6 | Bonus rounds are additive | Q8 default | Emits additive closest-match in `bonus_results`, locked twin untouched |
| D7 | Three Doors chat unlock engine | F31 purchasable lives | Unlocks to `chat_ready` via Duo Trial, Streak, or Sync without any paywall |
| D8 | Badges private by default with opt-in sharing | L10 "strictly private" | Opt-in sharing enabled if population $\ge 500$ |
| D9 | No leaderboards in this stage | Non-Goals | Excluded from build |

---

## 4. Feature-by-Feature "How It Works as Built"

### 4.1 Slice A1: Lanes Foundation, Lane Picker First, Per-Lane Drop Clock, Lane-Scoped Submit & Result
- **Lane Picker as First Screen (Decision D1):** Once the user confirms the 18+ age gate, the web app directly presents `LanePicker` (`step === "lane_picker"`) rather than jumping into questions of an arbitrary default lane.
- **Returning Player Experience:** If the user has played before, `play-store` persists `lastPlayedLaneSlug` in `localStorage` ("oddly_last_played_lane"). The top of the lane picker renders a distinct "Continue in <Last Lane>" card for quick resumption.
- **Per-Lane Status & Multi-Lane Play (Decision D5):** For each open lane:
  - If already completed today, a mint badge "Played today" and a "View Twin" CTA button appear. Clicking "View Twin" retrieves the cached/completed submission result and navigates directly to the reveal screen.
  - If unplayed today, a sun-accented "Play now" CTA button allows the player to play questions for that lane.
- **Per-Lane Drop Clock:** Drop availability cycles run strictly from 07:00 IST to 06:59:59 IST next day with recap calculation at 07:05 IST. The UI surfaces this accurate window to prevent timing ambiguity.
- **Database Partitioning Integrity:** Migration `015_lane_id_integrity.sql` replaced the old global unique constraint `(drop_date, player_id)` with `uq_submissions_drop_lane_player (drop_date, lane_id, player_id)`. This guarantees that players can play multiple distinct lanes on the same calendar day without collisions or data crosstalk, while strictly isolating each lane's submissions, questions, and match pool.
- **Verification:** 16 web test suites (125 tests) and 4 data safety integration tests pass; frontend play-route bundle is 148.7 KB (within the 150 KB target and well below 159.5 KB ceiling).

---

## 5. Frontend Inventory

*(Machine-generated and verified across Next.js app router)*

---

## 6. API Inventory

*(Generated from Fastify route definitions)*

---

## 7. Data Model & ER Diagram

*(Entity-relationship structure and table definitions)*

---

## 8. Jobs & Schedule

*(BullMQ workers, schedules, and idempotency guarantees)*

---

## 9. Connection Map & State Machines

*(Mermaid dependency graph and unlock state transitions)*

---

## 10. Worked Example (200-Player Scenario)

*(Detailed candidate evaluation using `explain:twin`)*

---

## 11. Config Keys & Flags

*(Summary referencing `docs/build-b0-config-keys.md`)*

---

## 12. Seeds & Content

*(Runway counts across drops, questions, templates, and prompts)*

---

## 13. Security & Privacy Review

*(Rule 4, k-anonymity, DPDP deletion, and IDOR validation)*

---

## 14. Performance & Scale

*(Bundle sizes and latency measurements)*

---

## 15. Conflicts & Open Questions

*(Referencing `docs/build-b0-conflicts.md`)*

---

## 16. Not Built / Out of Scope

*(Explicit list of deferred components with rationales)*

---

## 17. Manual Walkthrough Checklist

*(Referencing `docs/build-b0-demo-script.md`)*

---

## 18. Math & Matching Logic Summary

*(Summary referencing `docs/build-b0-math-logic.md`)*

---

## 19. Changes the Documentation Files Will Need

*(Itemized list for the subsequent prompt that rewrites markdown files)*

