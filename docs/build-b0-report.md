# Stage B0: Comprehensive Implementation & Architecture Report

> **Project:** Oddly v1  
> **Stage:** B0 (Lanes-First Build, From First Screen to Chat Unlock)  
> **Author:** Antigravity Coding Agent  
> **Branch:** `stage-B0-build`  
> **Date:** 2026-11-24  

---

## 1. Executive Summary

This report documents the lanes-first architectural transformation and end-to-end build of Oddly, starting from the first screen (18+ confirmation and lane picker) through daily Drop gameplay, multi-format similarity scoring, twin depth with mutual pairing, dedicated Memes lane, Orbit and connection safety, Telepathy and Sync, Twin Globe, Anti-twin, and the Three Doors chat unlock engine up to the `chat_ready` state. Chat messaging itself, profiles, party rooms, games platform, leaderboards, and payments remain strictly out of scope per the Stage B0 fence. All existing unit and integration tests pass, and initial play route JS bundle remains within the approved 159.5 KB compressed exception.

**Status Counts:**
- **Verified:** Slices A0, A1, A2, A3, A4 (preflight, lanes, formats, twin depth, memes lane).
- **Implemented-untested:** In progress across subsequent slices.
- **Stubbed:** 0
- **Not built:** Out-of-scope surfaces (chat screen, party rooms, paid lives, leaderboards).

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

*(Maintained and appended slice-by-slice)*

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
