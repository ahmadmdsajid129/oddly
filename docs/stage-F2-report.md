# Oddly — Stage F2 Report: Orbit and Globe UI

**Date:** 2026-11-15  
**Branch:** `stage-F2-orbit-globe-ui`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1, Rule 4, Rule 6, `design.md` Section 12A, and ADR-037 / ADR-038.  

---

## 1. What Changed Per Document and Package

| Document / Package | Key Changes Applied |
|---|---|
| `packages/api-client/src/index.ts` | Added typed DTOs and API methods for Orbit and Globe: `KeepResponse`, `IncomingKeepsResponse`, `RespondKeepResponse`, `OrbitsListResponse`, `OrbitDetailResponse`, `SendExpressionResponse`, `EndOrbitResponse`, `GlobeResponse`. Implemented `createKeep`, `getIncomingKeeps`, `respondKeep`, `getOrbits`, `getOrbit`, `sendOrbitExpression`, `endOrbit`, and `getGlobe`. |
| `apps/web/src/lib/api.ts` | Added domain-namespaced wrappers: `api.keeps` (`create`, `getIncoming`, `respond`), `api.orbits` (`list`, `get`, `express`, `end`), and `api.globe` (`get`). |
| `apps/web/src/components/orbit/KeepButton.tsx` (P10B.01) | Implemented interactive tactile sticker button for "Keep this twin". Enforces locked final twin check (`is_provisional === false`, seals at 07:00 IST). Integrated with Google soft sign-in prompt (`LoginModal`) with clear value proposition. Stretches with tactile press-flat feedback and haptics/audio. Event propagation isolation prevents parent flip cards from flipping back. |
| `apps/web/src/components/share/FlipCard.tsx` (P10B.01) | Mounted `KeepButton` on the details back face of the card alongside pick overlap breakdown. |
| `apps/web/src/app/recap/page.tsx` (P10B.01) | Mounted `KeepButton` on the sealed morning recap screen. |
| `apps/web/src/components/orbit/OrbitRequestCard.tsx` (P10B.02) | Implemented incoming connection request card with coarse macro-region ($k \ge 20$), age band, match percentage, and accessible touch targets ($\ge 44\text{px}$) for Accept and Not now actions. |
| `apps/web/src/components/orbit/ProceduralAvatar.tsx` (P10B.03) | Implemented deterministic SVG 2-color geometric glyph derived from pairing seed / shared answers using the sticker pop palette (discs, rotated diamond, yin-yang, petals). |
| `apps/web/src/components/orbit/OrbitListRow.tsx` (P10B.03) | Implemented Orbit list row with procedural geometric avatar, anonymous title ("Twin #N"), active vs ended status, co-streak flame badge, and $\ge 44\text{px}$ touch target. |
| `apps/web/src/app/orbit/page.tsx` (P10B.03) | Implemented `/orbit` management screen showing pending incoming requests, active orbits (up to 3 concurrent slots), empty state CTA, and guest soft sign-in card. |
| `apps/web/src/app/orbit/[id]/page.tsx` (P10B.03) | Implemented Orbit detail view with partner summary, co-streak counter, staged unlocks track, daily expression tray, exchanged wave history, and instant unprovoked dissolution dialog. |
| `apps/web/src/components/orbit/ExpressionTray.tsx` (P10B.04) | Implemented 6-sticker expression tray (The Wave: `👋`, `✨`, `💜`, `🙌`, `☕`, `🤔`) with 1/day limit per direction, press-flat tactile feedback, pop haptics, and live countdown timer until 07:00 IST reset. |
| `apps/web/src/components/orbit/StagedUnlocks.tsx` (P10B.05) | Implemented 5-milestone progression track (Day 1 Globe Line, Day 3 Pick Overlap, Day 7 Telepathy Sync, Day 14 Orbit Card, Day 30 Co-Anniversary) with dynamic progress and next unlock banner. |
| `services/api/src/routes/globe.ts` (P10B.06) | Implemented `/v1/globe` edge-cached endpoint (`s-maxage=60`) querying Redis pre-aggregated cache or real matches with $k \ge 20$ aggregation, macro-region centroids, and caller's active Orbit lines. |
| `services/worker/src/workers/globe.worker.ts` (P10B.06) | Authored 5-minute batch aggregation worker writing regional match pairs to Redis cache key `oddly:globe:aggregated_arcs`. |
| `apps/web/src/components/globe/TwinGlobeMap.tsx` (P10B.07) | Built lightweight static SVG equirectangular map with quadratic bezier regional arcs, glowing violet active user Orbit lines, 44px pulsing circular pins, and zero 3D/WebGL dependencies. |
| `apps/web/src/app/globe/page.tsx` (P10B.07, P10B.08) | Implemented `/globe` screen with transparent Live / Replay status pill, automatic fallback when window volume < 50 submissions, and connection legend. |
| `apps/web/src/components/ui/BottomNav.tsx` (P10B.09) | Built standard 4-tab bottom navigation (`Today`, `Globe`, `History`, `Me`) with keyboard focus rings, active sticker styling, and $\ge 44\text{px}$ touch targets. |
| `apps/web/src/app/layout.tsx` (P10B.09) | Mounted `BottomNav` persistently across main screens. |
| `apps/web/src/app/not-found.tsx` & `error.tsx` | Added explicit `globals.css` import and stylesheet resilience ensuring 404 pages never render naked unstyled fallback HTML. |
| `task.md` | Marked tasks `P10B.01` through `P10B.10` as `DONE`. Updated Phase 10B progress to 100% (10/10). Updated Stage F2 checklist. |
| `memory.md` | Recorded Stage F2 completion in Section 21 with verification logs. |

---

## 2. Test Verification Summary

### Web Component & Unit Test Suite (`vitest run`):
```
 ✓ src/recap.test.ts (1 test)
 ✓ src/pwa.test.ts (10 tests)
 ✓ src/orbit-globe.test.ts (11 tests)
 ✓ src/share-challenge.test.ts (4 tests)
 ✓ src/reveal-oddness.test.ts (6 tests)
 ✓ src/play-flow.test.ts (16 tests)
 ✓ src/me-settings.test.ts (7 tests)

 Test Files  7 passed (7)
      Tests  55 passed (55)
   Duration  2.84s
```

### Backend Orbit Integration Suite (`services/api/src/orbit.integration.test.ts`):
```
 ✓ rejects unauthenticated guest from sending Keep (status 401)
 ✓ rejects Keep on provisional drop (status 400 DROP_NOT_LOCKED)
 ✓ sends Keep to locked final twin successfully (status 201)
 ✓ rejects duplicate Keep in same drop (status 409 KEEP_ALREADY_SENT)
 ✓ incoming keep returns sanitized traits with zero sender ID leakage (status 200)
 ✓ mutual acceptance creates Orbit with player_a_id < player_b_id (status 200)
 ✓ unique index blocks duplicate active orbit between same pair
 ✓ sends valid expression and rejects second daily expression (status 409)
 ✓ rejects unapproved expression key (status 400)
 ✓ increments co-streak when both players complete, quietly resets when missed
 ✓ instant unprovoked dissolution sets status ended (status 200)
 ✓ admin severance tool severs orbit with mandatory audit reason (status 200)
 ✓ DPDP account erasure severs active orbits and purges pending keeps (status 200)

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

### Production Next.js Bundle & Typecheck Audit (`next build`):
```
Route (app)                              Size     First Load JS
┌ ○ /                                    13.7 kB         160 kB
├ ○ /_not-found                          138 B          87.5 kB
├ ○ /about                               4 kB           98.6 kB
├ ƒ /c/[shortId]                         4.9 kB          139 kB
├ ○ /design                              264 B           149 kB
├ ○ /dev/ui                              189 B           149 kB
├ ○ /globe                               5.49 kB         107 kB
├ ○ /history                             6.18 kB         110 kB
├ ○ /login                               3.04 kB         120 kB
├ ○ /manifest.webmanifest                0 B                0 B
├ ○ /me                                  5.68 kB         136 kB
├ ○ /offline                             1.21 kB        98.5 kB
├ ○ /orbit                               5.21 kB         129 kB
├ ƒ /orbit/[id]                          6.36 kB         144 kB
├ ○ /privacy                             3.66 kB        98.3 kB
├ ○ /recap                               7.97 kB         125 kB
└ ○ /terms                               3.48 kB        98.1 kB
+ First Load JS shared by all            87.4 kB

✓ 0 TypeScript errors across all 5 workspace projects.
✓ 0 ESLint warnings.
✓ /globe route size: 5.49 kB (107 kB First Load JS, zero Three.js / WebGL overhead).
```

---

## 3. Invariants Verified

1. **Initial Route Bundle Budget Preservation:**
   - `/globe`, `/orbit`, and `/orbit/[id]` are separate code-split routes. The initial `/` route bundle overhead for the globe and orbit features is **0 KB**.
2. **Zero WebGL / Zero Heavy Map Libraries:**
   - `TwinGlobeMap` is implemented with native inline SVG and quadratic bezier math. No Three.js, Leaflet, Mapbox, or Cesium libraries were added.
3. **Strict Touch Target Compliance ($\ge 44 \times 44\text{px}$):**
   - Every sticker in `ExpressionTray`, every action button in `OrbitRequestCard` and `KeepButton`, and each tab in `BottomNav` adheres to the $\ge 44\text{px}$ minimum touch target rule.
4. **Honest Live / Replay Fallback:**
   - When drop window volume is below 50 submissions, the map automatically displays the honest Replay badge (*"Quiet right now. Replaying yesterday's twins"*). No artificial bot arcs are ever rendered.
5. **Blame-Free Safety Invariant:**
   - The End Orbit dialog uses neutral, non-accusatory language. Dissolution is instantaneous and one-sided, quietly returning both players to the daily pool without alerts or blame.
