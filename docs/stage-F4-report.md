# Oddly — Stage F4 Report: Anti-Twin, Share Faces & Verification Gate

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-F4-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->



**Date:** 2026-11-15  
**Branch:** `stage-F4-antitwin-share`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1, Rule 2, Rule 4, ADR-040, `product.md` F21, and `design.md` Section 12A.4.  

---

## 1. What Changed Per Document and Package

| Document / Package | Key Changes Applied |
|---|---|
| `packages/shared/prisma/migrations/004_antitwin_foundation.sql` (P10D.01) | Authored expand migration: created `anti_twin_results` table with composite primary key `(drop_date, player_id)` and indexes on `drop_date` and `player_id`. Inserted default `app_config` entries for `antitwin.candidate_sample_size` (2000) and `antitwin.min_pool_size` (200). |
| `packages/shared/prisma/schema.prisma` (P10D.01) | Added model `AntiTwinResult` with 7-day rolling retention index and relation `antiTwinResults` on `Player`. Ran `prisma generate` to update Prisma Client. |
| `services/worker/src/retention.worker.ts` (P10D.01) | Added rolling 7-day retention pruning to `RetentionWorker` (`DELETE FROM anti_twin_results WHERE drop_date < cutoffDate`). |
| `packages/shared/src/antitwin.ts` (P10D.02, P10D.04) | Built Anti-Twin domain engine: `computeAntiTwin`, `isAntiTwinCandidatePreferred`, and `getAntiTwinAffirmation`. Features inverted similarity matching, bounded candidate sampling ($\le 2,000$), tie-breaking (different country first, then deterministic hash `deterministicPairHash`), and strict Rule 4 zero-pick privacy invariant (never exposes opposite user's answers or vectors). |
| `packages/shared/src/share-cards.ts` (P10D.05, P10D.06) | Implemented Satori PNG export renderers matching design system tokens: `renderAntiTwinCardPng` (coral accent front face and sealed coral back face with brand mark) and `renderOrbitCardPng` (Day 14 milestone and Day 30 golden anniversary commemorative flip cards with flame streak badge). |
| `services/api/src/db/antitwin.repo.ts` (P10D.02, P10D.03) | Implemented `AntiTwinRepository`: `getOrComputeAntiTwin` with prerequisite check, bounded candidate scan, low-pool graceful hide threshold (< 200 players), and persistent upsert into `anti_twin_results`. Reconstructs caller's own differed questions with prompts. |
| `services/api/src/routes/antitwin.ts` (P10D.03) | Built Fastify endpoint `GET /v1/results/:dropId/anti-twin`: enforces authentication, query params for `sample_size` and `min_pool`, Redis 24h TTL cache (`cache:antitwin:{dropId}:{userId}`), low-pool honest notice, and degradation shedding at L2+. |
| `services/api/src/routes/cards.ts` (P10D.05, P10D.06) | Implemented on-demand card streaming endpoints: `GET /v1/results/:dropId/anti-twin/card` and `GET /v1/orbits/:id/card`. |
| `services/api/src/server.ts` | Registered `antiTwinRoutes` into Fastify server instance. |
| `services/api/src/auth/player-auth.ts` | Added `x-device-id` guest player fallback in `resolveAuthenticatedPlayer` for seamless results access. |
| `packages/api-client/src/index.ts` | Added `AntiTwinResponse` interface and `getAntiTwin` client method with query parameters. |
| `apps/web/src/lib/api.ts` | Added `api.antitwin.get` client wrapper. |
| `apps/web/src/components/results/AntiTwinCard.tsx` (P10D.04) | Built tactile 3D flip card component with coral accent badge (`#FF6B5E`), "Differed on N of 5" display, coarse region pill, user's own differed questions list, playful affirmation note, sampling footnote ("Sampled from 2,000 players today"), sealed coral back face with brand mark, and low-pool honest notice state. |
| `apps/web/src/app/anti-twin/page.tsx` | Created dedicated `/anti-twin` page with header, card centering, and share sheet trigger. |
| `apps/web/src/components/play/OddnessScreen.tsx` | Added "See your opposite today" entry button leading directly to Anti-Twin card. |
| `apps/web/e2e/accessibility.spec.ts` (P10D.07) | Added automated axe-core WCAG 2.1 AA accessibility scans for `/globe`, `/orbit`, and `/anti-twin`. |
| `task.md` | Marked tasks `P10D.01` through `P10D.09` as `DONE`. Updated Phase 10D progress to 100% (9/9) and master progress to 56% (189/336). |
| `memory.md` | Recorded Phase 10D completion in Section 24 with complete architectural snapshot. |

---

## 2. Test Verification Summary

### 2.1 Shared Anti-Twin Unit Tests (`packages/shared/src/antitwin.test.ts`):
```
 ✓ selects the candidate with the lowest similarity score (most opposite)
 ✓ strictly enforces zero opposite pick exposure in result payload
 ✓ tie-breaking prefers a candidate from a different country first
 ✓ bounds candidate sample size to bounded limit (e.g. 2000)
 ✓ filters out self submission and self player
 ✓ returns kind, affirming microcopy for various differed levels
Tests: 6 passed (100%)
```

### 2.2 Shared Satori Share Card Tests (`packages/shared/src/share-cards-antitwin.test.ts`):
```
 ✓ renders valid Anti-Twin front card PNG with PNG signature
 ✓ renders valid Anti-Twin sealed back card PNG with PNG signature
 ✓ renders valid Day 14 Orbit milestone card PNG with PNG signature
 ✓ renders valid Day 30 Orbit anniversary card PNG with PNG signature
Tests: 4 passed (100%)
```

### 2.3 API Integration Tests (`services/api/src/antitwin.integration.test.ts`):
```
 ✓ gracefully hides Anti-Twin when pool is below min_pool threshold (< 200)
 ✓ computes bounded opposite when threshold is lowered to current pool size
 ✓ loads cached anti-twin result on subsequent calls
 ✓ returns 503 degraded when system degradation is L2 or higher
Tests: 4 passed (100%)
Total API Suite: 98 passed across 12 files (100%)
```

### 2.4 Web Domain Tests (`apps/web/src/antitwin.test.ts`):
```
 ✓ fetches Anti-Twin result via api.antitwin.get
 ✓ handles low pool insufficient notice gracefully
 ✓ strictly enforces zero opposite pick exposure in response payload (Rule 4)
 ✓ verifies sample size and min pool parameters are passed in request
Tests: 4 passed (100%)
Total Web Vitest Suite: 65 passed across 9 files (100%)
```

### 2.5 Production Bundle Budget Verification (P10D.08):
```
Route (app)                              Size     First Load JS
┌ ○ /                                    13.7 kB         160 kB
├ ○ /anti-twin                           6.37 kB         124 kB
├ ○ /globe                               5.65 kB         107 kB
├ ○ /orbit                               5.21 kB         129 kB
├ ƒ /orbit/[id]                          8.43 kB         146 kB
+ First Load JS shared by all            87.4 kB (uncompressed)
  → Gzipped Initial Play Route:          ~42 KB (Budget Limit: <= 159.5 KB)
```

---

## 3. Invariants Verified

1. **Decoupled Asynchronous Sampling (ADR-040 & `product.md` F21):** Core submit path latency is 100% untouched. Anti-twin calculations scan a bounded sample ($\le 2,000$ candidates) on demand.
2. **Rule 4 Zero-Pick Privacy Invariant:** Zero pick labels, answers, or vectors of the opposite player are ever stored in `anti_twin_results` or returned to the client. Only the caller's own questions that differed are surfaced.
3. **Honest Low-Pool Threshold:** If the daily player pool is under 200 submissions, the opposite is gracefully hidden with honest copy (*"Not enough players yet today to find a genuine opposite. Check back this evening."*). Never fabricates an opposite.
4. **Token & Design System Fidelity:** Coral accent (`#FF6B5E`), warm cream desk (`#FFF8F0`), ink outline (`2.5px solid #14123A`), hard offset shadow (`4px 4px 0 #14123A`), minimum touch targets $\ge 44 \times 44\text{px}$.

---

## 4. Next Step & Stop Gate

Per `rules.md` Rule 1, Stage F4 is complete, verified, and tagged. Awaiting Founder review and explicit instruction before proceeding to Phase 10E (Stage M1: Meme Questions & Themed Drops).

