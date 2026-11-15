# Oddly — Stage F1 Report: Orbit Foundation (Backend)

**Date:** 2026-11-15  
**Branch:** `stage-F1-orbit-backend`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1, Rule 4, Rule 6, and ADR-038 (Keep & Orbit).  

---

## 1. What Changed Per Document and Package

| Document / Package | Key Changes Applied |
|---|---|
| `packages/shared/prisma/schema.prisma` | Added enums `KeepStatus` (`pending`, `accepted`, `declined`, `expired`) and `OrbitStatus` (`active`, `ended`, `severed`). Updated `Player` model relations. Added models `TwinKeep`, `Orbit`, and `OrbitExpression`. |
| `packages/shared/prisma/migrations/002_orbit_foundation.sql` | Authored expand migration: created PostgreSQL enums `"KeepStatus"` and `"OrbitStatus"`, created range-partitioned table `twin_keeps` (partitioned by `drop_date`), table `orbits` with `CHECK (player_a_id < player_b_id)` and partial unique index `idx_orbits_active_pair` on active pairs, and range-partitioned table `orbit_expressions` (partitioned by `drop_date`). Created default partitions and notification triggers. |
| `services/worker/src/partition.manager.ts` | Registered `"twin_keeps"` and `"orbit_expressions"` into the daily partition pre-creation engine (14 days advance partition buffer). |
| `services/api/src/db/keeps.repo.ts` | Implemented Keep repository enforcing asymmetric privacy (zero sender ID or pick vector leakage; returns only coarse region and age band with $k \ge 20$). Implemented `createKeep`, `hasSentKeepForDrop`, `countIncomingPendingToday`, `hasRecentCooldown`, `getKeepById`, `getIncomingPendingKeeps`, `respondToKeep`, and `expireStaleKeeps`. |
| `services/api/src/db/orbits.repo.ts` | Implemented Orbit repository enforcing canonical pair ordering (`player_a_id < player_b_id`), 3 active orbits cap, 6 approved stickers ("The Wave") with 1 expression per direction per day cap, `findActiveOrbitBetween`, `endOrbit`, and co-streak counter maintenance. |
| `services/api/src/config/orbit.config.ts` | Created cached configuration loader (`getOrbitConfig`) reading `app_config` with Redis 60s cache fallback: `feature.orbit`, `orbit.max_active_per_player: 3`, `orbit.keep_expiry_hours: 48`, `orbit.cooldown_days: 30`, `orbit.max_incoming_per_day: 3`, and 6 approved expression keys. |
| `services/api/src/auth/player-auth.ts` | Implemented unified authenticated player resolver supporting JWT Authorization header, guest session cookies, and test bypass headers. |
| `services/api/src/routes/keeps.ts` | Implemented Keep REST routes: `POST /v1/keeps` (Google auth guard, locked drop guard, single-keep cap, max 3 active cap, 30-day cooldown, target daily cap, mutual auto-connection), `GET /v1/keeps/incoming` (sanitized traits), and `POST /v1/keeps/:id/respond` (accept / decline). |
| `services/api/src/routes/orbits.ts` | Implemented Orbit REST routes: `GET /v1/orbits`, `GET /v1/orbits/:id`, `POST /v1/orbits/:id/express` (The Wave: 6 approved stickers, 1/day limit), `POST /v1/orbits/:id/end` (instant unprovoked dissolution), and `POST /v1/admin/orbits/:id/sever` (admin severance with mandatory audit reason). |
| `services/worker/src/workers/pipeline.worker.ts` | Implemented `computeCoStreaks(dropId, dropDate)` and `expireStaleKeeps(48)` executing after the final batch chunk of daily recap matching. Increments co-streaks on mutual completion and quietly resets on breaks without guilt copy. |
| `services/api/src/notifications/orbit-push.ts` | Implemented Orbit Web Push notification channel: enforces quiet hours (22:00-07:00 IST), 2/day daily cap, and zero guilt copy for `keep_received`, `orbit_established`, and `expression_received`. |
| `services/api/src/routes/me.ts` | Updated `DELETE /v1/me` to sever all active orbits (`ended_by = "dpdp_erasure"`) and mark pending keeps expired, fulfilling DPDP 7-day erasure requirements. |
| `services/api/src/orbit.integration.test.ts` | Authored end-to-end integration test suite verifying 13/13 critical paths against live Docker PostgreSQL 16 and Redis 7. |
| `task.md` | Marked tasks `P10A.01` through `P10A.10` as `DONE`. Updated Phase 10A progress to 100% (10/10). Updated Master Dashboard to 171 completed tasks (62% progress). Updated Section 4 Checklist and Section 5 Change Log. |
| `memory.md` | Recorded Stage F1 completion and added Section 18 implementation details and verification log. |

---

## 2. Test Verification Summary

Ran full integration suite `services/api/src/orbit.integration.test.ts` against real Docker PostgreSQL 16 & Redis 7:

```
✔ rejects unauthenticated guest from sending Keep (status 401)
✔ rejects Keep on provisional drop (status 400 DROP_NOT_LOCKED)
✔ sends Keep to locked final twin successfully (status 201)
✔ rejects duplicate Keep in same drop (status 409 KEEP_ALREADY_SENT)
✔ incoming keep returns sanitized traits with zero sender ID leakage (status 200)
✔ mutual acceptance creates Orbit with player_a_id < player_b_id (status 200)
✔ unique index blocks duplicate active orbit between same pair
✔ sends valid expression and rejects second daily expression (status 409)
✔ rejects unapproved expression key (status 400)
✔ increments co-streak when both players complete, quietly resets when missed
✔ instant unprovoked dissolution sets status ended (status 200)
✔ admin severance tool severs orbit with mandatory audit reason (status 200)
✔ DPDP account erasure severs active orbits and purges pending keeps (status 200)

13 tests passed, 0 failed.
```

All TypeScript packages compile cleanly:
- `pnpm --filter @oddly/shared typecheck`: 0 errors
- `pnpm --filter @oddly/api typecheck`: 0 errors
- `pnpm --filter @oddly/worker typecheck`: 0 errors

---

## 3. Invariants Verified

1. **Strict Asymmetric Privacy (ADR-038 & Rule 4):**
   - Recipient of an incoming Keep receives only coarse region ($k \ge 20$) and age band. Zero sender user ID, profile name, or answer vector is returned.
2. **Deterministic Canonical Indexing:**
   - Table `orbits` enforces `player_a_id < player_b_id` via PostgreSQL CHECK constraint. The partial unique index `idx_orbits_active_pair` guarantees that no two active orbits can exist between the same two players regardless of who initiates.
3. **Zero Guilt & Quiet Resets:**
   - Push notification copy and co-streak pipeline strictly omit nagging or guilt copy ("your twin is waiting", etc.). Broken streaks reset quietly to 0.
4. **Safety & Instant Dissolution:**
   - Any player can dissolve an active Orbit immediately via `POST /v1/orbits/:id/end` with zero confirmation required from the other player and zero attribution of blame.

---

**Stage F1 complete.**
