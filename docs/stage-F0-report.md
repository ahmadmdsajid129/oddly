# Oddly — Stage F0 Report: New Features Analysis and Documentation

**Date:** 2026-11-14  
**Branch:** `stage-F0-feature-docs`  
**Status:** Complete  
**Governing Standard:** `rules.md` Rule 1 (Documentation and analysis only. Zero code, zero migrations, zero dependencies changed).  

---

## 1. What Changed Per Document

| Document | Key Changes Applied | Commit |
|---|---|---|
| `docs/admin-panel-spec.md` | Copied verbatim from Founder's `admin-panel.md`: 20 sections detailing "Mission Control", access roles, Command Center, Live Ops, Question Bank checks, Ops controls, and 20 acceptance checks. | `71fbc35` |
| `rules.md` | **Rule 4:** Added consent-scoped exception for active Orbit Telepathy question (partner's pick label shown to viewer *only* after viewer's guess is locked).<br>**Rule 6:** Formally recorded Founder approval (2026-11-14) for F18–F21 (v1.0), F22–F23 (v1.5), and permanent Not Planned status for handle swaps/DMs.<br>**Section 3:** Added prohibition against pressuring an Orbit partner (no guilt, nagging, or "your twin is waiting" copy). Corrected font line from Space Grotesk to Bricolage Grotesque and Inter.<br>**Change Log:** Added 2026-11-14 entry. | `9716b61` |
| `product.md` | **Non-Goals:** Recorded handle swap, DMs, contact exchange as permanently Not Planned.<br>**F11 & F23:** Unified Friends Compare and Friend-Invite Orbit into one v1.5 feature.<br>**F12:** Recorded as superseded by F19 (the 6-sticker tray inside an Orbit is the Wave).<br>**Section 11A:** Added full specifications for F18 (Twin Globe), F19 (Keep & Orbit), F20 (Telepathy), F21 (Anti-Twin), F22 (Oddly Deck [v1.5]), and F23 (Friend-Invite Orbit [v1.5]). | `d2d36a6` |
| `architecture.md` | **Section 7.1:** Added 11 new route policy rows (`/v1/keeps*`, `/v1/orbits*`, `/v1/globe`, `/v1/results/:dropId/anti-twin`).<br>**Section 12:** Updated degradation ladder L0–L4 with connection feature shedding priorities.<br>**Section 16.1 & 16.2:** Added schema definitions for `twin_keeps`, `orbits`, `orbit_expressions`, `telepathy_guesses`, `anti_twin_results`, plus `app_config` keys and feature flags.<br>**Section 17:** Added ADR-037 (Twin Globe), ADR-038 (Keep & Orbit), ADR-039 (Telepathy), and ADR-040 (Anti-Twin). | `2b81b7e` |
| `design.md` | **Section 12A:** Detailed design specifications for Keep button, Orbit request card, Orbit list/detail rows, procedural avatars, co-streaks, 6-sticker expression tray, staged unlocks, SVG Twin Globe map, Telepathy guess/result stickers (with shape+icon distinction), Anti-twin card, Satori share cards, and accessibility.<br>**Section 22:** Added v1.1 change log line. | `8a01e81` |
| `docs/connection-features.md` | Comprehensive architectural analysis: conflict resolution, component reuse, scale projections, client bundle plan, DPDP compliance, abuse controls, and honesty rules. | `128b761` |
| `docs/capacity-model.md` | Added Section 5 (Capacity Addendum for Connection Features): detailed row growth, memory calculations, and worker load at 10k, 100k, and 10 lakh DAU. | `8fab520` |
| `task.md` | Inserted Phase 10A (Orbit Foundation, Stage F1), Phase 10B (Orbit & Globe UI, Stage F2), Phase 10C (Telepathy, Stage F3), and Phase 10D (Anti-Twin & Gate, Stage F4). Expanded Phase 11 to 25 tasks (P11.01 to P11.25) with spec cross-references and deferred list. Recalculated dashboard (274 total tasks, 161 done, 59% progress). Added stage checklists. | `4df3972` |
| `README.md` | Updated Section 1 with approved connection features, Section 5 documentation table pointing to `docs/admin-panel-spec.md` with required reading warning, and links to `docs/connection-features.md`. | `52203cb` |
| `AGENTS.md` | Added Admin Panel Engineering Rule: "Admin work: read `docs/admin-panel-spec.md` first. It is the authoritative description of what to build in Phase 11." | `667d650` |
| `memory.md` | Recorded Stage F0 completion, decisions log entries for ADR-037 to ADR-040, open questions for Founder, admin spec mismatches, and updated next steps. | `bbe6079` |

---

## 2. Analysis Summary (Section 6)

1. **Conflicts & Resolutions:**
   - *Rule 4 vs. Telepathy:* Scoped exception approved by Founder: partner pick label shown *only* for the single designated question, *only* inside active mutual Orbit, *only* after guess is permanently locked.
   - *Non-Goals vs. Connection:* Strictly zero chat, zero profiles, zero handle exchange, zero public leaderboards. Communication is bounded to the 6-sticker tray (The Wave).
   - *Guilt Copy:* Prohibited by rule; co-streaks reset quietly without nagging.
   - *Submit Path Latency:* Anti-twin and Globe arcs are completely decoupled from HTTP submit path; computed asynchronously in background workers.
2. **Infrastructure Reuse:**
   - Full reuse of `users` table, Google OAuth sessions, `matches` Dice scores, `privacy.ts` k-anonymity helpers, `FlipCard.tsx`, Satori PNG pipeline, and BullMQ push queues.
3. **Scale Projections (10 Lakh DAU):**
   - Produces ~80k Keep requests/day, ~28k new Orbits/day (~120k active Orbits).
   - Database growth: ~84 MB/day total relational storage (~8.4% overhead on baseline).
   - Redis memory footprint: ~58 MB ephemeral memory.
   - Worker load: Anti-twin on-demand worker consumes < 0.7% of a single vCPU core.
4. **Bundle Budget Plan:**
   - Play route (`/play` or `/`) initial bundle budget ($\le 159.5\text{ KB}$ approved exception) is strictly protected. Added play route JS: **0 KB**.
   - Features lazy-load on dedicated routes: `/globe` (~8.4 KB), `/orbit/[id]` (~11.2 KB), `/anti-twin` (~4.1 KB).
   - 3D WebGL libraries (Three.js/Cesium) are strictly rejected; Twin Globe uses native static SVG paths.
5. **Privacy & DPDP Compliance:**
   - Explicit consent notice on Keep tap.
   - One-click dissolution and hard deletion of Orbit linkages within 7 days upon account deletion.
   - Data export includes only the requesting user's own actions and guesses.
6. **Abuse Threat Controls:**
   - Stalking prevented by 1 Keep per drop cap and 30-day cooldown on ended pairs.
   - Targeting popular twins throttled by 3 incoming requests/day cap.
   - Bot farms eliminated by mandatory Google OAuth sign-in gate.
   - Unwanted persistence mitigated by unprovoked, neutral one-tap dissolution.
7. **Data Honesty Check:**
   - Zero synthetic arcs on Twin Globe; automatic fallback to yesterday's verified replay buffer when volume < 50.
   - Mathematically honest luck baseline ($\sum [p(a)]^2$) displayed for Telepathy; never marketed as psychic or mind reading.
   - Anti-twin hidden if today's pool < 200 players; zero fabricated opposites.

---

## 3. Design Token Drift Check

| Token Name | `design.md` Section 2.1 | `packages/ui-tokens` Shipped | `contrast.test.ts` Status | Finding / Action Taken |
|---|---|---|---|---|
| `ink` | `#14123A` | `#14123A` | PASS (16.93:1 on cream) | Exact match |
| `cream` | `#FFF8F0` | `#FFF8F0` | PASS (Desk background) | Exact match |
| `paper` | `#FFFFFF` | `#FFFFFF` | PASS (17.84:1 with ink) | Exact match |
| `violet` | `#6C4CF1` | `#6C4CF1` | PASS (5.33:1 with white) | Exact match |
| `lavender` | `#EEEAFE` | `#EEEAFE` | PASS (15.15:1 with ink) | Exact match (Note: `memory.md` had listed early draft `#E5DEFF`) |
| `coral` | `#FF6B5E` | `#FF6B5E` | PASS (6.38:1 with ink) | Exact match (Note: `memory.md` had listed early draft `#FF6B4A`) |
| `mint` | `#3DDBB0` | `#3DDBB0` | PASS (10.16:1 with ink) | Exact match (Note: `memory.md` had listed early draft `#2EC4B6`) |
| `sun` | `#FFD23F` | `#FFD23F` | PASS (12.35:1 with ink) | Exact match (Note: `memory.md` had listed early draft `#FFD166`) |
| `muted` | `#5B5780` | `#5B5780` | PASS (6.39:1 on cream) | Exact match (Note: `memory.md` had listed early draft `#6E6A8A`) |
| `lilac` | `#CDBFFF` | `#CDBFFF` | PASS (10.61:1 with ink) | Exact match (Note: `memory.md` had listed early draft `#D4BBFF`) |
| `error` | `#D92D4B` | `#D92D4B` | PASS (7.12:1 with white) | Exact match (Note: `memory.md` had listed early draft `#E63946`) |

*Drift Finding:* `packages/ui-tokens` and `design.md` Section 2.1 already match identically on all 11 tokens. Earlier drafts in `memory.md` listed legacy hexes from Stage 1; `memory.md` has been reconciled to reflect the shipped WCAG AA token palette.

---

## 4. Questions for the Founder (with Recommended Defaults)

1. **Globe Navigation Tab Placement:**  
   *Question:* Should the Twin Globe reside as a 4th tab in the bottom bar ("Today", "Globe", "History", "Me") or remain nested as an exploration card within the Today screen?  
   *Recommendation:* **4th tab in the bottom bar** (as specified in F0). It establishes spatial presence and gives returning players a quick visual reason to visit even after finishing their five picks.
2. **Orbit Ceiling (3 Active Orbits):**  
   *Question:* Is a fixed cap of 3 active Orbits per player optimal, or should it expand with streak milestones (e.g. +1 slot at 30-day streak)?  
   *Recommendation:* **Fixed at 3 for v1.0**. Keeps relationship maintenance lightweight, avoids cognitive overload, and prevents social accumulation. Revisit in v1.5.
3. **Keep Request Expiry Window (48 Hours):**  
   *Question:* Is 48 hours optimal for incoming Keep requests to expire silently, or should it match the 24-hour Drop window?  
   *Recommendation:* **48 hours**. Players often open the app every other day or in the evening; 48 hours gives the recipient a fair window to notice and accept without feeling rushed.
4. **Staged Unlock Schedule (Days 1, 3, 7, 14, 30):**  
   *Question:* Is the 5-milestone schedule (Day 1 Globe line, Day 3 Pick overlap, Day 7 Sync, Day 14 Share card, Day 30 Anniversary badge) approved?  
   *Recommendation:* **Approved as data in `app_content`**. Storing the unlock schedule as JSON in `app_content` allows tuning without code changes.
5. **Google Sign-In Requirement for Orbit:**  
   *Question:* Should guest users be required to sign in with Google to send or accept a Keep?  
   *Recommendation:* **Yes, mandatory Google sign-in**. A durable multi-day connection cannot survive a guest clearing their mobile browser storage or switching devices. Guests see the soft sign-in modal with Orbit-specific value copy.

---

## 5. Mismatches Between Admin Spec and Existing Phase 11 Tasks

1. **Panel Testing Tool (`P11.06`):**  
   In `docs/admin-panel-spec.md` Section 6.4 and Section 19, the external panel-testing tool (generating private test links for 100+ external testers with live entropy feedback) is categorized as **[P2]** (v1.1+), whereas the original `task.md` listed `P11.06` in Stage 11.  
   *Recommendation:* In Stage 11 (Phase 1), implement automated predictive checks on question structure and balance; defer the multi-tester external panel link generator to Phase 2 as the spec dictates.
2. **Build Order Precedence:**  
   Admin spec Section 7 ("Matching, Globe, Orbit, Anti-twin and Deck ops") directly relies on the backend tables and metrics created in Stages F1 to F4. Therefore, **Stage 11 must be built AFTER Stage F4**.

---

## 6. Zero Code Confirmation

- **Application code modified:** Zero lines.
- **Database migrations executed:** Zero migrations.
- **Dependencies added/altered:** Zero packages added or modified.
- **Git State:** Clean branch `stage-F0-feature-docs` with 11 atomic documentation commits. Tagged `stage-F0-complete`.

---

Stage F0 complete.
