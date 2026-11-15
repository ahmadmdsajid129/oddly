# Oddly — Stage F3 Report: Telepathy (Instinct Sync)

**Date:** 2026-11-15  
**Branch:** `stage-F3-telepathy`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1, Rule 2, Rule 4 (amended), ADR-038 Addendum, and `product.md` F20.  

---

## 1. What Changed Per Document and Package

| Document / Package | Key Changes Applied |
|---|---|
| `packages/shared/prisma/migrations/003_telepathy_foundation.sql` (P10C.01, P10C.03) | Authored expand migration: added `telepathy_question_id` to table `drops` (indexed foreign key referencing `questions.id`), created range-partitioned table `telepathy_guesses` (partitioned by `drop_date`), composite primary key `(id, drop_date)`, unique constraint `(orbit_id, drop_date, guesser_player_id)`, default partition and warning alert trigger. |
| `packages/shared/prisma/schema.prisma` (P10C.01, P10C.03) | Added `telepathy_question_id` and relation `telepathy_question` to `Drop`. Added model `TelepathyGuess` range-partitioned by `drop_date` with 90-day retention. Added relations on `Player`, `Orbit`, and `Question`. |
| `packages/shared/src/telepathy.ts` (P10C.01, P10C.02, P10C.06, P10C.08) | Built Telepathy domain functions: `isEligibleTelepathyQuestion` (Type 1 text or Type 4 image with $\le 4$ options), `selectTelepathyQuestion` (first eligible text, then image), `validateDropTelepathy` (admin safety gate rejecting drops lacking eligible question), `calculateLuckBaseline` ($\sum [p(a)]^2$ from question option frequencies), and `calculateSyncScore` (composite Sync summary calculation and 5-round unlock gate). |
| `packages/shared/src/schemas.ts` | Extended `DropResponseSchema` with `telepathy_question_id`. Added Zod schemas: `SubmitTelepathyGuessSchema`, `TelepathyRevealSchema`, `TelepathySyncSummarySchema`, and `TelepathyRoundResponseSchema`. |
| `packages/shared/src/index.ts` | Exported `telepathy.ts` and new schemas. |
| `services/worker/src/partition.manager.ts` (P10C.03) | Registered `"telepathy_guesses"` into `PartitionManager` with 14-day advance pre-creation buffer and 90-day retention. |
| `services/worker/src/workers/closure.worker.ts` (P10C.06) | Added `computeTelepathyBaseline` in `ClosureWorker` to compute $\sum [p(a)]^2$ across option distributions at 07:00 IST drop closure. |
| `services/api/src/db/telepathy.repo.ts` (P10C.04, P10C.05) | Built `TelepathyRepository`: `getRoundState` (resolves question, checks submissions, handles scoped reveal) and `lockInGuess` (enforces prerequisite that both players submitted, permanent lock-in rejecting duplicates with 409, computes hit/miss and luck baseline). |
| `services/api/src/routes/telepathy.ts` (P10C.04, P10C.05) | Implemented Fastify routes: `GET /v1/orbits/:id/telepathy` and `POST /v1/orbits/:id/telepathy/guess`. Enforces authentication, Orbit membership, degradation shedding at L2+, 422 `SUBMISSION_REQUIRED`, and 409 `GUESS_ALREADY_LOCKED`. |
| `services/api/src/server.ts` | Registered `telepathyRoutes` into Fastify server instance. |
| `packages/api-client/src/index.ts` | Added typed DTOs (`TelepathyQuestion`, `TelepathyReveal`, `TelepathySyncSummary`, `TelepathyRoundResponse`) and client methods: `getTelepathy` and `submitTelepathyGuess`. |
| `apps/web/src/lib/api.ts` | Added `api.telepathy` client methods. |
| `apps/web/src/components/orbit/TelepathyGameCard.tsx` (P10C.07, P10C.08) | Implemented tactile Telepathy game component: Drop prerequisite notice with link to play, accessible option buttons ($\ge 44\text{px}$) with sticker press-flat physics, "Lock In Guess" button, permanent lock-in notice, side-by-side sticker pair ("Your Guess" and "Twin's Pick"), shape-based outcome indicators (Check $\checkmark$ for match vs Slash $\times$ for differ, never color alone), honest statistical baseline caption, and running Sync Summary card (unlocked at $\ge 5$ rounds). |
| `apps/web/src/app/orbit/[id]/page.tsx` | Mounted `TelepathyGameCard` seamlessly under Staged Unlocks track. |
| `task.md` | Marked tasks `P10C.01` through `P10C.09` as `DONE`. Updated Phase 10C progress to 100% (9/9). |
| `memory.md` | Recorded Phase 10C completion in Section 23 with verification details. |

---

## 2. Test Verification Summary

### Shared Domain Unit Tests (`packages/shared/src/telepathy.test.ts`):
```
 ✓ accepts Type 1 text questions with 2 to 4 options
 ✓ accepts Type 4 image questions with 2 to 4 illustrations
 ✓ rejects questions with > 4 options or < 2 options
 ✓ rejects ineligible question types (number, colour, word)
 ✓ selects Type 1 text question first when available
 ✓ falls back to Type 4 image question if Type 1 is absent
 ✓ rejects drops that lack an eligible question
 ✓ computes uniform 2-option baseline as 0.50
 ✓ computes uniform 4-option baseline as 0.25
 ✓ accurately computes skewed probability baseline (honest math invariant)
 ✓ falls back to 1/optionCount if no frequencies exist yet
 ✓ calculates sync score, baseline, and lift across completed rounds
 ✓ marks summary as locked when total rounds < 5

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

### Backend API Integration Tests (`services/api/src/telepathy.integration.test.ts`):
```
 ✓ P10C.04 Guard: rejects unauthenticated request with 401
 ✓ P10C.04 Guard: rejects outsider who is not an Orbit member with 403
 ✓ P10C.04 Prerequisite: blocks guess before both players submit today's drop with 422
 ✓ P10C.05 Scoped Reveal Invariant (Rule 4): reveals partner pick ONLY after guess lock-in
 ✓ P10C.05 Permanent Lock-In: duplicate guess attempt is rejected with 409 GUESS_ALREADY_LOCKED
 ✓ P10C.08 Composite Sync Summary: unlocks once pair completes 5 rounds

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### Web Domain Tests (`apps/web/src/telepathy.test.ts`):
```
 ✓ enforces waiting state when either player has not submitted today's drop
 ✓ strictly conceals partner pick while caller's guess is unlocked
 ✓ reveals partner pick and match outcome only after caller locks in guess
 ✓ calculates expected agreement baseline from question option probabilities
 ✓ verifies shape-based visual indicators (check vs cross) for accessibility
 ✓ locks summary until pair completes at least 5 rounds

 Test Files  1 passed (1)
      Tests  6 passed (6)
 Total Web Suite: 61/61 passed (100%)
```

---

## 3. Strict Compliance Invariants Verified

1. **Rule 4 Scoped Reveal Invariant:**
   - The partner's chosen pick label is revealed to the guesser **strictly after** the guesser locks in their own guess.
   - Reveal is limited strictly to the single designated question.
   - Zero other answer picks, identifiers, or profile vectors are ever exposed.
2. **Permanent Lock-In Invariant:**
   - Once a guess is recorded, it cannot be modified, withdrawn, or overwritten. Duplicate submission attempts return HTTP 409 `GUESS_ALREADY_LOCKED`.
3. **Mathematical Honesty Invariant (Rule 2):**
   - The random baseline chance is computed honestly as $\sum [p(a)]^2$ from the question's observed option distribution, never assuming a uniform $1/K$ when options are skewed.
   - Sync scores are surfaced only after 5 completed rounds ($N \ge 5$) to prevent volatile small-sample variance.
4. **Accessible Indicators Invariant:**
   - Uses distinct shape icons (Check $\checkmark$ vs Slash $\times$) and textual microcopy, strictly avoiding relying on color alone for state.
   - All interactive touch targets are $\ge 44 \times 44\text{px}$.

