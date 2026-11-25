# Task Audit Report: Status Audit Against Running Reality

> **Date:** November 25, 2026  
> **Repository:** Oddly (`stage-B0-build`)  
> **Auditor Mode:** Read-only task audit against live running code, scheduled jobs, and browser verification (Part A)  
> **Authoritative Baseline:** `product.md §0`, `rules.md Rules 36–41`, `docs/audit/b0-deep-dive-2026-11-25.md`

---

## 1. Executive Summary

This audit examined every completed task in `task.md` (Phases 1 through 10U) against the actual behavior of the running application (`@oddly/api` on port 4000, `@oddly/web` on port 3000, PostgreSQL on port 5432, Redis on port 6379).

In accordance with **Rule 41 ("Done" Means Reachable)**:
- A task is retained as **DONE** only when its code is wired end-to-end to real API routes or scheduled jobs, produces real (non-invented) data, and is accessible to a real player.
- Tasks whose code exists in isolation as unwired libraries, whose background jobs are never scheduled by BullMQ, or whose frontend components display fabricated/hardcoded mock data have been reopened to **🟡 IN PROGRESS**.
- Features that contradict Founder Decision D1–D8 and `product.md §0` (e.g., themed Drops in generic lanes, meme questions outside the Memes lane, dark mode) have been documented as **SUPERSEDED**.

A total of **37 additional tasks** (in addition to the 12 previously reopened in Phases 10L–10O) were reopened across Phases 3, 4, 5, 6, 7, 8, 9, 10A, 10B, 10C, 10D, and 10I. Total completed tasks reduced from 272 to **235**, with 49 tasks in progress and 199 pending tasks across 39 phases.

---

## 2. Table of Reopened Tasks (Status Changed to IN PROGRESS)

| Task ID | Phase | Old Status | New Status | File:Line / Browser Observation & Detailed Reason |
|---|---|---|---|---|
| `P3.07` | Phase 3 | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/results.ts:36`: Query param `?player_id=` accepts arbitrary IDs; `matches.repo.ts:61` uses unordered `findFirst`; production scores with unweighted Dice. |
| `P4.01` | Phase 4 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:215-233`: Direct landing screen flow superseded by Lane Picker first (Decision D1); requires cleanup and honest resting states (P10V.21). |
| `P4.03` | Phase 4 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/drop/Countdown.tsx`: Countdown screen lacks per-lane resting and drop window awareness (P10V.21). |
| `P4.04` | Phase 4 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:102-140`: Home page serves hardcoded `FALLBACK_QUESTIONS` across all lanes when API fails or during initial paint instead of lane-specific drops (P10V.21). |
| `P4.08` | Phase 4 | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/submissions.ts:405-445`: Submission route accepts answers without server-side 18+ check and matches using unweighted Dice (P10V.05, P10V.07). |
| `P5.02` | Phase 5 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:314-318, 519-523`: Result state hardcodes twin location "Berlin, Germany", age "25 to 34", and 3,482 players (Rule 36 violation, P10V.01). |
| `P5.05` | Phase 5 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:320-321`: Hardcodes 84th percentile and "Rare" tier; `TwinRevealScreen.tsx:56` derives tier from matched picks count (P10V.01, P10V.14). |
| `P5.06` | Phase 5 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:323-327, 528-532`: Hardcodes rarest pick "Luminous Violet" at 3.1% (Rule 36 violation, P10V.01). |
| `P5.07` | Phase 5 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/page.tsx:317, 522`: Low-density (<200) messaging is completely unreachable because `total_players_today: 3482` is hardcoded (P10V.01, P10V.13). |
| `P6.02` | Phase 6 | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/workers/pairing.worker.ts:60`: Emits exact city ("Stranger in Berlin, Germany") into card payload, violating coarse-region privacy (P10V.19). |
| `P7.03` | Phase 7 | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/lib/identity.ts:102`: Accepts unsigned or invalid cookies, allowing impersonation of other player IDs (P10V.03). |
| `P8.02` | Phase 8 | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/me.ts:140-155`: `calculateStreak` computes single global streak; per-lane streaks missing and `longest` is computed incorrectly from Set size (P10V.16). |
| `P8.04` | Phase 8 | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/history/page.tsx`: Shows provisional or missing twin because no cron job locks twins at 07:00 IST (P10V.11). |
| `P9.04` | Phase 9 | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/index.ts:93`: Scheduled `provisional-pairing` worker calls `runPairingSweep(job.data?.dropId, [])` with an empty array `[]` (P10V.10). |
| `P9.06` | Phase 9 | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/scheduler.ts:60-80`: `matchFinal` job is not in `getScheduledJobs()`, so final batch never runs and twins never lock (P10V.11). |
| `P9.07` | Phase 9 | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/scheduler.ts`: Recap job is not scheduled; locked twin recap screen is unreachable for a real player (P10V.12). |
| `P9.10` | Phase 9 | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/pipeline.worker.ts`: Streak progression is tied to final match batch, which is not scheduled in the daily clock (P10V.11, P10V.16). |
| `P10A.04` | Phase 10A | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/keeps.ts`: Keep route requires an existing locked twin; because twins never lock, players always receive "cannot keep until 07:05" (P10V.11). |
| `P10A.05` | Phase 10A | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/orbits.ts`: Orbit state machine is unreachable for real players because Keep requests cannot be created (P10V.11). |
| `P10A.06` | Phase 10A | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/scheduler.ts`: Co-streak computation is omitted from scheduled daily clock jobs (P10V.11). |
| `P10B.01` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/twin/FlipCard.tsx`: "Keep this twin" button is disabled/unreachable because twins never reach final locked status (P10V.11). |
| `P10B.03` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/app/orbit/[id]/page.tsx`: Orbit detail view is unreachable for real players because Keeps cannot complete (P10V.11). |
| `P10B.04` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/orbit/ExpressionPicker.tsx`: Unreachable for real players until Orbit relationships can form (P10V.11). |
| `P10B.05` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/orbit/MilestoneTrack.tsx`: Unreachable for real players until Orbit relationships can form (P10V.11). |
| `P10B.06` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/workers/globe.worker.ts:51`: Worker is not scheduled in `scheduler.ts` and aggregator has no $k$-anonymity filter (P10V.17). |
| `P10B.07` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/globe.ts`: When empty, route returns hardcoded fake arcs with counts 38, 24, 19, 15 (Rule 36 violation, P10V.01, P10V.17). |
| `P10B.08` | Phase 10B | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/globe.ts`: Live/Replay fallback loop serves hardcoded invented replay arcs (P10V.01, P10V.17). |
| `P10C.04` | Phase 10C | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/telepathy.ts`: Telepathy API endpoints require an active Orbit, which real players cannot reach (P10V.11). |
| `P10C.05` | Phase 10C | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/telepathy.ts`: Telepathy lock-in and partner pick reveal unreachable until Orbit can form (P10V.11). |
| `P10C.06` | Phase 10C | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/scheduler.ts`: Closure worker does not schedule random luck baseline computation (P10V.11). |
| `P10C.07` | Phase 10C | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/telepathy/TelepathyGame.tsx`: UI is inside `/orbit/:id`, which cannot be reached by real players (P10V.11). |
| `P10C.08` | Phase 10C | `✅ DONE` | `🟡 IN PROGRESS` | `packages/shared/src/telepathy.ts`: Composite Sync summary unreachable until 5 Telepathy rounds are played in an Orbit (P10V.11). |
| `P10D.02` | Phase 10D | `✅ DONE` | `🟡 IN PROGRESS` | `services/worker/src/workers/antitwin.worker.ts`: `ComputeAntiTwinJob` is not scheduled by any daily worker job (P10V.06). |
| `P10D.03` | Phase 10D | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/antitwin.ts:62`: Query parameter `?min_pool=` allows client to override and bypass the 200-player privacy floor (P10V.06). |
| `P10D.04` | Phase 10D | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/twin/AntiTwinCard.tsx`: Mounted on recap screen, which real players cannot reach because recap job is not scheduled (P10V.12). |
| `P10I.01` | Phase 10I | `✅ DONE` | `🟡 IN PROGRESS` | `services/api/src/routes/orbits.ts`: Subject Sync route `/v1/orbits/:id/subject-sync` is unreachable until Orbit can form (P10V.11). |
| `P10I.02` | Phase 10I | `✅ DONE` | `🟡 IN PROGRESS` | `apps/web/src/components/orbit/SubjectSyncCard.tsx`: Subject Sync UI inside Orbit view is unreachable until Orbit can form (P10V.11). |

---

## 3. Superseded Features List

These tasks contradicted Founder Decisions D1–D8, `product.md §0`, or `design.md` cream-only rules and were flagged as **SUPERSEDED** in `task.md`:

| Task ID | Phase | Feature Description | Superseded By | Reason & Alignment Note |
|---|---|---|---|---|
| `P1.16` | Phase 1 | `ThemeProvider` supporting Dark Mode | `product.md §0`, `AGENTS.md`, `design.md §2.4` | Oddly v1 is strictly cream-only (`#FFF8F0`). Dark mode is not in v1 and must not be built. |
| `P10E.01` | Phase 10E | Themed Drops schema (`drops.theme_key`) | `product.md §0.1, §0.9` (Decision D3) | Memes is its own dedicated lane (`slug = memes`). Generic themed Drops are superseded. |
| `P10E.04` | Phase 10E | JSON batch importer parsing `template_key` for themed drops | `product.md §0.1, §0.9` (Decision D3) | Themed drops superseded by lane-specific drops. |
| `P10E.05` | Phase 10E | `meme` render variant inside general Drops | `product.md §0.1, §0.9` (Decision D3) | Meme content lives exclusively in the Memes lane; no meme questions in other lanes. |
| `P10E.06` | Phase 10E | 12 sample meme questions for generic Drops | `product.md §0.1, §0.9` (Decision D3) | Generic themed drops superseded; Memes lane has its own 5-question Drops. |
| `P10I.04` | Phase 10I | Creator badge evaluation from Meme Lab | `product.md §0.3, §0.6` (Decision D8) | Meme Lab is documented only (not switched on in v1). Badges in v1 are Collector, All-Lanes, and Super-twin. |
| `P10I.06` | Phase 10I | Featured memes showcase page (`/featured`) | `product.md §0.3, §0.9` (Decision D3) | Meme Lab community showcase is documented only; Memes is a container lane. |

---

## 4. Phase 10V (Stage C0) Tasks Catalog

All reopened work is mapped to existing, actionable tasks in Phase 10V (Stage C0):

| Task ID | Task Summary | Priority | Covers Reopened Tasks | Status |
|---|---|---|---|---|
| `P10V.01` | Remove every invented value from player screens (hardcoded city, age band, 3482 players, "4 of 5", Luminous Violet, offline mock result) | 🔴 Critical | `P5.02`, `P5.05`, `P5.06`, `P5.07`, `P10B.07`, `P10B.08`, `P10N.06` | ⚪ TODO |
| `P10V.02` | Build-fail test that scans player components for literal stand-in values | 🟠 High | Verification for `P10V.01` | ⚪ TODO |
| `P10V.03` | Lock `/v1/results` and `/v1/me` to the signed session; reject unsigned cookies and `player_id` query for other players | 🔴 Critical | `P3.07`, `P7.03` | ⚪ TODO |
| `P10V.04` | Exclude blocked pairs (both directions) from submit match, provisional refresh, final batch, anti-twin, Keep and Orbit | 🔴 Critical | Safety rule (Rule 38) | ⚪ TODO |
| `P10V.05` | Record 18+ confirmation on the server with timestamp; API refuses submit without it | 🟠 High | `P4.08` | ⚪ TODO |
| `P10V.06` | Anti-twin `min_pool` and sample size read from `app_config` only (remove query params) | 🟠 High | `P10D.02`, `P10D.03` | ⚪ TODO |
| `P10V.07` | Make the weighted, format-aware, symmetric similarity the only production formula; delete the Dice path | 🔴 Critical | `P3.07`, `P4.08`, `P10M.02`, `P10M.03` | ⚪ TODO |
| `P10V.08` | Remove the age-band pool split; one pool per lane and Drop | 🟠 High | Rule 40 alignment | ⚪ TODO |
| `P10V.09` | Pairing order strictly lexicographic (S, history, country, hash); 500-player pairing within test limit | 🟠 High | `P10N.03` | ⚪ TODO |
| `P10V.10` | Schedule provisional refresh every 5 min per lane with real candidates (no empty list) | 🔴 Critical | `P9.04` | ⚪ TODO |
| `P10V.11` | Schedule the 07:00 final batch per lane using mutual pairing and tie-break; mark matches final; exactly one locked twin per player per lane | 🔴 Critical | `P8.04`, `P9.06`, `P9.10`, `P10A.04-06`, `P10B.01-05`, `P10C.04-08`, `P10N.04` | ⚪ TODO |
| `P10V.12` | 07:05 recap job and recap push (max one per day) | 🟠 High | `P9.07`, `P10D.04` | ⚪ TODO |
| `P10V.13` | Result API returns real `matched_picks`, lane player count, twin coarse region and age band, tie-group size, `is_mutual`; "Closest so far" below 200 | 🔴 Critical | `P3.07`, `P5.02`, `P10N.05` | ⚪ TODO |
| `P10V.14` | Oddness percentile per lane pool with "Early" state below minimum pool; fix final-batch percentile | 🟠 High | `P5.05` | ⚪ TODO |
| `P10V.15` | Chat unlock backend: trial start/answer/score on server, Door 2 and 3 evaluation, both-confirm and `chat_ready` stored; UI reads server state | 🔴 Critical | Missing chat unlock endpoints | ⚪ TODO |
| `P10V.16` | Per-lane streaks (lane column) plus overall days played, for every open lane | 🟠 High | `P8.02` | ⚪ TODO |
| `P10V.17` | Twin Globe: k ≥ 20 filter, scheduled aggregation, coarse regions only, no invented replay arcs | 🟠 High | `P10B.06`, `P10B.07`, `P10B.08` | ⚪ TODO |
| `P10V.18` | Wire bonus rounds (job, routes, UI), Super twin and collector badges with opt-in share | 🟡 Medium | `P10I.01`, `P10I.02` | ⚪ TODO |
| `P10V.19` | Report categories harassment, underage_suspected, contact_attempt; twin location coarse region only (no exact city) | 🟡 Medium | `P6.02` | ⚪ TODO |
| `P10V.20` | End-to-end test on real Postgres and Redis: 50-player Memes lane from submit to locked twin, Keep, Orbit, one door, both confirm, `chat_ready` | 🔴 Critical | Rule 41 verification gate | ⚪ TODO |
| `P10V.21` | Remove `FALLBACK_QUESTIONS` and the hardcoded initial Drop from the home page; each lane shows only its own Drop, or an honest Resting/not-open-yet state | 🔴 Critical | `P4.01`, `P4.03`, `P4.04`, `P10O.02` | ⚪ TODO |
| `P10V.22` | Lane cards show real names and descriptions (resolve `lane.*.name` / `lane.*.desc` keys); `/v1/lanes` and `/v1/lanes/:id` agree on lane status | 🟠 High | `P10L.06`, `P10L.10` | ⚪ TODO |
| `P10V.23` | Fix the Memes Drop endpoint 500 (Redis key-prefix rule vs `lane:` keys) and keep Memes Drops seeded for current dates | 🔴 Critical | `P10L.03`, `P10O.05` | ⚪ TODO |
| `P10V.24` | API client: wrap global `fetch` so browser calls don't throw "Illegal invocation" | 🔴 Critical | Verified in browser 2026-11-25 | ✅ DONE |

---

## 5. Old vs New Dashboard Numbers

| Metric | Before Part A Audit | After Part A Audit | Delta |
|---|---|---|---|
| **Total Tasks** | 434 | 434 | 0 |
| **Completed Tasks (`DONE`)** | 272 | 235 | **-37** |
| **In Progress (`IN PROGRESS`)** | 12 | 49 | **+37** |
| **Blocked (`BLOCKED`)** | 0 | 0 | 0 |
| **Pending Tasks (`TODO`)** | 150 | 150 | 0 |
| **Total Not Done (`TODO` + `IN PROGRESS`)** | 162 | 199 | **+37** |
| **Overall Progress %** | 63% (272/434) | **54%** (235/434) | **-9%** |

### Per-Phase Progress Table (After Audit)

| Phase | Phase Name | Status | Tasks (Done/Total) | Progress % |
|---|---|---|---|---|
| **Phase 0** | Documentation & Skeleton | ✅ COMPLETE | 17 / 17 | 100% |
| **Phase 1** | Design System & UI Kit | ✅ COMPLETE | 23 / 23 | 100% |
| **Phase 2** | Database & Shared Core Scoring | ✅ COMPLETE | 17 / 17 | 100% |
| **Phase 3** | Fastify REST API Core | 🟡 PARTIAL | 15 / 16 | 94% |
| **Phase 4** | Play Flow Frontend (PWA) | 🟡 PARTIAL | 11 / 15 | 73% |
| **Phase 5** | Reveal, Matching UX & Oddness | 🟡 PARTIAL | 7 / 11 | 64% |
| **Phase 6** | Server-Rendered Share Cards & Links | 🟡 PARTIAL | 11 / 12 | 92% |
| **Phase 7** | Authentication & Guest Merge | 🟡 PARTIAL | 10 / 11 | 91% |
| **Phase 8** | Streaks, History, Settings & Privacy | 🟡 PARTIAL | 10 / 12 | 83% |
| **Phase 9** | Daily Pipeline & BullMQ Scheduler | 🟡 PARTIAL | 11 / 15 | 73% |
| **Phase 10** | Web Push Notifications & PWA | ✅ COMPLETE | 11 / 11 | 100% |
| **Phase 10A** | Orbit Foundation (Backend) | 🟡 PARTIAL | 7 / 10 | 70% |
| **Phase 10B** | Orbit and Globe UI | 🟡 PARTIAL | 3 / 10 | 30% |
| **Phase 10C** | Telepathy (Instinct Sync) | 🟡 PARTIAL | 4 / 9 | 44% |
| **Phase 10D** | Anti-Twin, Share Faces & Verification Gate | 🟡 PARTIAL | 6 / 9 | 67% |
| **Phase 10E** | Meme Questions & Themed Drops | ✅ COMPLETE | 9 / 9 | 100% |
| **Phase 10F** | Signals Foundation | ✅ COMPLETE | 10 / 10 | 100% |
| **Phase 10G** | Meme Lab (User Captions & Moderation) | ✅ COMPLETE | 9 / 9 | 100% |
| **Phase 10H** | Insights Engine (Statistics Only) | ✅ COMPLETE | 9 / 9 | 100% |
| **Phase 10I** | Taste Dimension & Recognition | 🟡 PARTIAL | 6 / 8 | 75% |
| **Phase 10J** | ML Ranker for Optional Surfaces | ✅ COMPLETE | 5 / 5 | 100% |
| **Phase 10K** | Premium Groundwork | ✅ COMPLETE | 5 / 5 | 100% |
| **Phase 10L** | Lanes Plumbing | 🟡 PARTIAL | 7 / 10 | 70% |
| **Phase 10M** | Richer Answer Formats | 🟡 PARTIAL | 5 / 7 | 71% |
| **Phase 10N** | Twin Depth & Mutual Pairing | 🟡 PARTIAL | 2 / 7 | 29% |
| **Phase 10O** | Memes Lane Launch | 🟡 PARTIAL | 3 / 5 | 60% |
| **Phase 10P** | Situations Lane (Cards First) | ⚪ TODO | 0 / 5 | 0% |
| **Phase 10Q** | Say It: Free-Text Answers (Gate G4) | ⚪ TODO | 0 / 8 | 0% |
| **Phase 10R** | Super Twin & Lane-Aware Connection | ⚪ TODO | 0 / 6 | 0% |
| **Phase 10S** | Brain Lane (Documented Only) | ⚪ TODO | 0 / 1 | 0% |
| **Phase 10T** | Bonus Rounds (Stage L9) | ⚪ TODO | 0 / 7 | 0% |
| **Phase 10U** | Badges (Stage L10) | ⚪ TODO | 0 / 6 | 0% |
| **Phase 10V** | Make the Core Real (Stage C0) | 🟡 PARTIAL | 1 / 24 | 4% |
| **Phase 11** | Admin Panel ("Mission Control") | ⚪ TODO | 0 / 50 | 0% |
| **Phase 12** | Observability, Telemetry & Security | 🟡 PARTIAL | 1 / 11 | 9% |
| **Phase 13** | End-to-End QA, Load Tests & Audits | ⚪ TODO | 0 / 12 | 0% |
| **Phase 14** | Cloud Deployment & Infrastructure | ⚪ TODO | 0 / 11 | 0% |
| **Phase 15** | Beta Launch & Go/No-Go Decision Gates | ⚪ TODO | 0 / 6 | 0% |
| **Phase 16** | Scale Readiness Gate (T1, T2, T3) | ⚪ TODO | 0 / 5 | 0% |

All validation invariants enforced by `scripts/docs-visuals/build.mjs` have passed cleanly.
