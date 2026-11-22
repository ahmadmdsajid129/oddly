# Rules and Operating Standards — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-21 | Owner: Founder + AI agent
Purpose of this file: Immutable operational rules, coding standards, error-handling protocols, security policies, and Definition of Done for all development.

---

## 1. Absolute Rules (Never Break)

<!-- visual:start callout-rule-1 -->
> [!IMPORTANT]
> **Rule 1: Stop After Every Stage**  
> You must NEVER build multiple stages in one turn. Complete the assigned stage, update `task.md` and `memory.md`, emit the Stage Report, and immediately **STOP**. Wait for Founder instructions before proceeding.
<!-- visual:end callout-rule-1 -->

<!-- visual:start theme-legend -->
| Theme | Emoji | Core Focus |
|---|---|---|
| Stop & Scope | 🛑 | Stage boundaries, scope containment, and Founder gate controls |
| Privacy & Safety | 🔒 | DPDP compliance, zero deanonymisation, safety filters, and moderation |
| Testing & Quality | 🧪 | Honest tests, zero masked lint failures, and type safety |
| Data & Migrations | 🗄️ | Append-only logs, zero data loss, dynamic database state, and migrations |
| Design & Motion | 🎨 | Responsive performance, reduced-motion support, and UI token adherence |
| Money & Pressure | 💸 | Free-forever core loop, unpaywalled lanes, and zero coercive monetization |
| Lanes & Drops | 🛤️ | Lane isolation, Drop parity, deterministic tie-breaking, and honest counts |
<!-- visual:end theme-legend -->


1. 🛑 **Stop After Every Stage:** You must NEVER build multiple stages in one turn. Complete the assigned stage, update `task.md` and `memory.md`, emit the Stage Report, and immediately STOP. Wait for the Founder's explicit instruction (e.g., _"proceed to Stage N"_).
2. 🔒 **Never Fake Data or Matches:** Never synthesize fake players, simulated twins, fabricated odds, or deceptive countdown timers in production code. If data is sparse (< 200 players), declare it openly (_"Closest so far: N of 5. More people are playing."_).
3. 🔒 **No Free-Text User Input:** Prevent abuse architecturally. Users choose exclusively from structured options (tiles, numbers, colours, words, images). The only allowed user-submitted text is the optional 140-character report note on `/v1/reports`, strictly accessible to administrators. *(Cross-reference: See Rule 18 for the Meme Lab user caption exception [Stage M3] and Rule L5 for the Say It free-text semantic matching exception [Stage L6 / Gate G4].)*
4. 🔒 **Never Expose Identifiers or Vectors:** Never expose another user's user ID, IP address, device ID, push subscription, raw answer vector, or exact GPS coordinates via any API route, card, or public view. Twin views display only coarse region (k-anonymity $\ge 20$), age band ($\ge 20$), and the matched pick labels. *Exception:* Within an active Orbit, and only for the single designated Telepathy question after the viewer's own guess is locked, the partner's pick label may be shown to the viewer. No other pick, identifier or vector is ever exposed.
5. 🔒 **Never Commit Secrets:** API keys, database credentials, VAPID private keys, and Turnstile secrets must strictly reside in `.env` (gitignored). Provide dummy placeholder values in `.env.example` only.
6. 🛑 **Strict MVP Scope Boundaries:** Never build features in the OUT OF SCOPE list (chat, user profiles, leaderboards, real-money betting, native mobile apps, friends groups, wave, premium billing) without explicit written Founder approval. *(Founder approval recorded 2026-11-14: F18 Twin Globe, F19 Keep and Orbit, F20 Telepathy, F21 Anti-twin approved for v1; F22 Oddly Deck and F23 Friend-invite Orbit documented for v1.5; handle swap, DMs, contact exchange permanently Not Planned; F12 Wave superseded by F19).*
7. 🧪 **Never Hide Failing Tests or Lint Errors:** All tests, typechecks, and lints must pass cleanly. If a test fails, report it honestly in the Stage Report; do not comment it out, skip it, or alter assertions to mask bugs.
8. 🗄️ **Never Overwrite or Rewrite History in `memory.md`:** `memory.md` logs are append-only. Record fixes, adjustments, and decisions sequentially. Never delete tasks from `task.md` without an explicit changelog explanation.
9. 🗄️ **No Unrecorded Dependencies:** Before installing any package not listed in `architecture.md`, document it first (name, pinned version, purpose, features using it, alternative evaluated) and announce it in the Stage Report. Any new dependency (analytics SDK, payments, moderation service) must be documented with failure modes before use in `docs/failure-modes.md`.
10. 🎨 **Never Block Interaction with Animation:** Animations must remain under 600ms (except the 1.5s dot-map search journey and count-up numbers). Every animation must be skippable by a tap and must strictly respect `prefers-reduced-motion`.
11. 🗄️ **Everything Dynamic from Database (Override Addendum):** No content, questions, palettes, illustrations, UI copy, notification templates, tier cut-offs, or configuration values are hard-coded in application code. Layout and logic are in code; all content is stored in PostgreSQL, editable via Admin, and served via cached endpoints (`/v1/content/:locale`, `/v1/drop/today`). The only hard-coded copy permitted in code is the minimal offline fallback (see Section 12).
12. 🛤️ **Identical Drop Rule (Amended in Stage L0 and Stage L0-ADD; Founder-approved, L0, L0-ADD):**
    - *Previous Text (Stage L0, Rule L1):* "Within a lane, the five questions of a Drop are identical for every player of that lane and appear in the same order. No engine, flag, experiment or personalisation may change which questions a player sees in a lane, or their order. Different lanes have different Drops. Personalisation applies only to non-Drop surfaces (the order of lane cards on the picker, notification timing, optional meme card, Orbit prompts)."
    - *Amended Text (Stage L0-ADD, Rule L1 & Rule B1):* **Lane Drop Identity & Bonus Round Separation:** Within a lane, the five questions of a Drop are identical for every player of that lane and appear in the same order. No engine, flag, experiment or personalisation may change which questions a player sees in a lane, or their order. Different lanes have different Drops. Personalisation applies only to non-Drop surfaces (the order of lane cards on the picker, notification timing, optional meme card, Orbit prompts). Optional tie-breaking bonus rounds (F40, Rule B1) are strictly decoupled from the Drop: their questions originate from a published evergreen pool, are identical for all participants within a tie group, are never personalised, and never alter the five Drop questions or their order.
13. **Consent Rule (Founder-approved, M0):** Analytics and personalisation each require separate, withdrawable consent (DPDP, per `product.md` section 13.1), default OFF until granted. Security processing (bot detection such as the 3 second minimum answer time, rate limiting) is not analytics and is documented separately. Withdrawal stops collection immediately and deletes personalisation data (`player_taste`) within the existing deletion window. *(Stage L0 Note: The compact lane history signature used for tie-breaking uses past answers given by the player for matching; it is disclosed in the privacy notice with a Settings toggle "Use my past answers to find closer twins", default ON as part of the core service).*
14. **No Sensitive Inference Rule (Founder-approved, M0):** Never infer or store religion, caste, politics, sexuality, health, mental state, body image, income or any category in the forbidden-topics list from taste, humour tags, timing or any other signal. Tag taxonomies must contain only neutral subject tags; an automated test fails the build if a tag key matches the forbidden list.
15. **No Identity-Joined Profiling Rule (Founder-approved, M0):** Behavioural data is keyed by a pseudonymous analytics ID, not by email or name. No dashboards at individual level; any breakdown shows only groups of at least 20 players (k-anonymity).
16. **Experiment Rule (Founder-approved, M0):** A/B tests run only on non-Drop surfaces, through feature flags, with a documented hypothesis, a guardrail metric and a kill switch.
<!-- visual:start callout-rule-17 -->
> [!WARNING]
> **Rule 17: No Pressure to Pay**  
> Daily play is always free. Never use guilt copy, fake urgency, countdowns, scarcity or "your streak is about to die" prompts to sell anything. Never show an offer at the moment of a streak break. Max 1 offer per 14 days (*config*); after 2 dismissals, stop for 90 days (*config*). Cancellation is as easy as purchase. Prices shown plainly.
<!-- visual:end callout-rule-17 -->

17. 💸 **No Pressure to Pay (Founder-approved, M0; extends Rule 3 'Never Do'):** Daily play is always free. Never use guilt copy, fake urgency, countdowns, scarcity or "your streak is about to die" prompts to sell anything. Never show an offer at the moment of a streak break. Max 1 offer per 14 days (*config*); after 2 dismissals, stop for 90 days (*config*). Cancellation is as easy as purchase. Prices shown plainly.
18. **Free-Text Exception (Amended in Stage L0; Founder-approved, L0):**
    - *Previous Text (Stage M0):* "The only user-authored text allowed besides the 140 character report note is a Meme Lab caption of at most 100 characters (*config*), passed through moderation before anyone else sees it. *Status: Inactive until the Founder approves Stage M3.*"
    - *Amended Text (Stage L0, Rule L5):* **Free-Text Answers:** Typed answers (`say_it` format) are allowed only (a) in a lane whose `text_enabled` flag is on, (b) for a question whose format is `say_it`, (c) up to 80 characters (*config*), (d) after the player has seen a plain-words notice that the text is only compared by a machine and is never shown to other players, (e) after moderation and personal-data screening, (f) with the raw text deleted after *config* 7 days from the Drop's finalisation, keeping only the derived embedding and archetype for the history window (*config* 28 days) and then deleting those too, (g) never sent to any third-party service in v1, (h) never used to train any model without a separate, withdrawable consent that does not exist yet, (i) never written to logs, error reports or analytics events, (j) deleted with the account. *Status: Inactive until Gate G4 passes.* The 140-character report note and the Meme Lab caption exception from M0 remain active as previously written.
19. **Orbit Subject-Sync Amendment (Founder-approved, M0; extends Rule 4 exception from F0):** Inside an active Orbit the app may show aggregate agreement rates per subject tag with a minimum of 5 shared answers per tag (*config*). Individual picks are still never shown except the Telepathy question as already amended.
20. **Lane Isolation (Founder-approved, L0; Rule L2):** A twin, anti-twin, Globe arc, Orbit candidate or Telepathy partner always belongs to exactly one lane, and the lane is always shown. The only cross-lane object is the **Super twin** (F38), which names its lanes explicitly. Never merge answers from different lanes into one score except for the Super twin and the lane-history tie-break described in F34.
21. **Lane Honesty (Founder-approved, L0; Rule L3):** A lane's status is real: `planned`, `preview` (open with an "Early lane" label), `open`, `resting` (today's Drop missing or paused). Never display a lane as popular, never show a player count the system did not measure, never fill a lane with fake players. Under *config* 200 players in the lane that day, results say "Closest so far". "Coming soon" tiles show no counts.
22. **Tie Honesty (Founder-approved, L0; Rule L4):** The tie group size shown to a player is the real count. Never claim a unique twin when the group is larger than one. The copy is "N of 5 with M people. Meet one of them." Show exact counts below 1,000 and "1,000+" above (*config*). Respect k-anonymity: a group smaller than the minimum shown count is described as "a few others".
23. 🔒 **Forbidden Topics Stay Forbidden in Every Lane and Every Format (Founder-approved, L0; Rule L6):** Politics (parties, leaders, elections, policies), religion, caste, sexuality, health, mental state, body image, income, real named people and brands as targets of judgement are not allowed in questions, options, scenario texts, archetype labels, tags, alt text or free-text prompts. "Hot Takes" may only use harmless topics (e.g. food, trivial habits). An automated test must fail the build when any seeded question, option, tag or archetype label matches the forbidden list. Free-text replies are screened for the same topics only for moderation, never to build a profile.
24. 🔒 **Situations Lane Safety (Founder-approved, L0; Rule L7):** (a) Scenes are written without assuming anyone's gender or orientation and never ask a player's. (b) No scene frames continuing to approach someone after a refusal, following, pressuring, or "winning" a person. (c) Archetype results describe a style of reacting with playful, kind names; labels such as "desperate", "loser", "simp" or any ranking of worth are **not allowed** as result labels, tags or share-card text. (d) No result may be displayed as better or worse than another. (e) The lane is not a dating feature and shows no contact path. (f) 18+ only, as everywhere. (g) Editors must tick a scenario safety checklist in admin; the lane cannot open without it.
25. 💸 **Lane Parity (Founder-approved, L0; Rule L8):** Lanes cannot be paywalled and no paid feature may change who matches whom. Premium (M8) stays strictly limited to history archive, streak freezes and card themes.
26. 🛤️ **No Lane Without a Drop (Founder-approved, L0; Rule L9):** If a lane has no valid, approved Drop for today, the lane shows "Resting today" with a kind message and a link to another lane. The system never reuses yesterday's Drop silently and never shows an unvalidated Drop. An alert goes to admin at least 24 hours before a lane would run out (*config*).
27. 🛤️ **First-Run Promise (Founder-approved, L0; Rule L10):** A new visitor reaches the first question of the Everyday lane with no account, no lane choice and no extra screen, as today. The lane picker is offered after the first result.
28. 🛤️ **Lane Choice is the Player's Own (Founder-approved, L0; Rule L11):** A player may play any open lane, one or more per day. Streaks count a day if at least one lane Drop was completed (v1). Lane-specific streaks are documented for v1.5, not built in v1.
29. 🛤️ **Bonus Questions Are Not Drop Questions (Founder-approved, L0-ADD; Rule B1):** Bonus questions come from a published evergreen pool per lane, are identical for every player inside a tie group, are never personalised, and never change which Drop questions a player sees or their order (clarifies Rule 12 / L1).
30. 🔒 **Bonus Honesty (Founder-approved, L0-ADD; Rule B2):** Participant and tie-group counts shown on bonus rounds are real database counts. A player is never told they were matched on a bonus round if they were not, and no synthetic or simulated participants are ever generated (Rule 2).
31. 🗄️ **No Side Effects for Bonus Answers (Founder-approved, L0-ADD; Rule B3):** Bonus answers do not change oddness scores, percentiles, tiers, streaks, badges, or any global statistics. They affect solely the twin selection among participating tie-group members for that specific Drop. Bonus answers are retained only for `bonus.retention_days` (default 28 days) and then permanently purged under the history signature deletion protocol.
32. 🛤️ **Bonus Lane Isolation (Founder-approved, L0-ADD; Rule B4):** A bonus round belongs strictly to one lane and one specific Drop. Cross-lane bonus rounds do not exist (Rule L2).
33. 🔒 **Badges Are Private and Unranked (Founder-approved, L0-ADD; Rule B5):** Badges are visible only to their owner on the result screen and their private "My badges" page. No public badge showcase, no leaderboards, no display of how many other players hold a badge, and no comparative ranking between players. Placement on any future profile requires an explicit separate Founder decision.
34. 💸 **Badges Cannot Be Bought or Rushed (Founder-approved, L0-ADD; Rule B6):** No badge can be purchased, boosted, or accelerated with money. No badges are awarded simply for playing more days, and zero notification pressure (no pushes, emails, or "one lane away" nag copy) may be used to drive badge progress. Progress is visible only on the passive "My badges" screen. Premium (M8) remains strictly confined to its listed archival and theme perks (Rule L8, Rule 17).
35. 🔒 **Badges Are Honest and Evidenced (Founder-approved, L0-ADD; Rule B7):** Every badge awarded stores tamper-evident metadata (the triggering lane IDs, Drop IDs, similarity scores, and the rule version). If an account is suspended or removed for duplicate-device manipulation or abuse, all earned badges are revoked with an immutable audit log entry.

---

## 2. Always Do

- **Update Living Documents Continuously:** Modify `task.md` and `memory.md` as work happens, not just at the final stage boundary.
- **Strict TypeScript Everywhere:** Enforce strict type checking across all packages. Avoid `any`; use `unknown` and type narrowing.
- **Boundary Validation with Zod:** Validate every inbound request, outbound response, and environment variable using shared Zod schemas (`packages/shared`).
- **Idempotency on State Changes:** Every write route (especially `POST /v1/submissions`) must require a unique `request_id` (UUIDv4) to guarantee safe retries over unreliable cellular networks.
- **Dynamic Copy via Content Registry:** In code, reference copy through typed content keys. Seed defaults live in `seed/` and DB table `app_content`.
- **Write Unit Tests for Mathematical Invariants:** Every scoring formula (`similarity`, `information`, `oddness`, `percentile`, `tier`) and edge-case tie-breaker must be covered by deterministic unit tests in `packages/shared`.
- **Accessible & Semantic Primitives:** Use Radix UI primitives, proper ARIA tags, logical focus trapping, and ensure contrast ratios $\ge 4.5:1$ for normal text and $\ge 3.0:1$ for large text.
- **Mobile-First Design for Mid-Range Android:** Optimize for 360px viewport width, low memory (~2 GB RAM), and high-latency 4G mobile networks.

---

## 3. Never Do

- Never make client-side calculations the source of truth for matches, streaks, or rarity scores. The server is the sole arbiter of state and time.
- Never use runtime CDNs for typography or icon assets. Self-host Bricolage Grotesque, Inter, and local SVGs.
- Never introduce heavy component libraries or CSS frameworks outside of Tailwind CSS and Radix UI primitives.
- Never tie daily game resets to midnight user-local time. The Twin Day is strictly bounded by 07:00 IST to 06:59:59 IST globally.
- Never show dark patterns, guilt copy, or artificial countdown urgency (_"Hurry, only 3 spots left!"_).
- Never pressure a player about an Orbit partner (no guilt, nagging or 'your twin is waiting' copy).
- Never allow a single user to submit multiple entries for the same Drop on different devices or accounts (detect and exclude duplicate submissions).

---

## 4. Coding Standards

### 4.1 Architecture & Directory Structure

- Follow the monorepo structure specified in `architecture.md` managed by `pnpm` workspaces and Turborepo.
- Code sharing:
  - `@oddly/shared`: Pure scoring logic, validation schemas, data types, copy keys, constants. Zero Node/Browser-specific dependencies.
  - `@oddly/ui-tokens`: Tailwind preset, raw token JSON/TS, design constants.
  - `@oddly/api-client`: Universal typed API client used by web and worker services.

### 4.2 Code Cleanliness

- **File & Function Length:** Keep functions under ~50 lines where practical. Files should focus on a single responsibility.
- **Exports:** Prefer named exports. Default exports are reserved exclusively for Next.js route conventions (`page.tsx`, `layout.tsx`).
- **Date & Time Standards:** Store and compute all timestamps in UTC (`TIMESTAMPTZ` in PostgreSQL, ISO 8601 strings in JSON). Format localized display times on the client using `date-fns` and `date-fns-tz`.
- **Identifiers:** Use standard UUIDv4 for database primary keys; use `nanoid` (8-12 characters, URL-safe alphabet) for shareable short links (`/c/:shortId`).
- **Code Comments:** Document _why_ a particular approach was chosen, never merely narrate _what_ the syntax does.

---

## 5. Error Handling Policy

All API responses on failure must return a uniform JSON error payload:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "User-friendly, non-technical explanation",
    "requestId": "uuidv4-string",
    "details": {}
  }
}
```

### 5.1 Error Matrix

| Error Class           | Example Trigger                         | HTTP Status | Error Code            | UI Behavior (from `copy.ts` / `app_content`)                                                   | Log Level        | Retry Strategy                   |
| --------------------- | --------------------------------------- | ----------- | --------------------- | ---------------------------------------------------------------------------------------------- | ---------------- | -------------------------------- |
| **Validation**        | Malformed answer payload                | 400         | `VALIDATION_FAILED`   | Inline field error or _"Something looks off with your picks. Please try again."_               | 🟡 `warn`        | No retry; fix input              |
| **Authentication**    | Expired session cookie                  | 401         | `AUTH_EXPIRED`        | Silent background refresh; if failed, display non-blocking login prompt                        | 🟢 `info`        | 1 silent retry                   |
| **Forbidden**         | Accessing admin route as guest          | 403         | `FORBIDDEN`           | _"You do not have permission to view this area."_                                              | 🟡 `warn`        | No retry                         |
| **Age Gate**          | Declared age under 18                   | 403         | `ADULTS_ONLY`         | Displays courteous under-18 screen; clears local storage; no data saved                        | 🟢 `info`        | No retry                         |
| **Drop Not Open**     | Querying Drop before 07:00 IST          | 404 / 409   | `DROP_NOT_OPEN`       | Displays S2 Countdown screen until drop time                                                   | 🟢 `info`        | Poll with exponential backoff    |
| **Window Closed**     | Submitting answer at 07:01 IST next day | 409         | `DROP_CLOSED`         | _"Today's window has closed. Check out yesterday's recap!"_                                    | 🟢 `info`        | No retry; redirect to recap      |
| **Duplicate Submit**  | Submitting same Drop twice              | 200 / 409   | `ALREADY_SUBMITTED`   | Returns existing stored result idempotently; displays S6 Reveal                                | 🟢 `info`        | No retry                         |
| **Rate Limited**      | Exceeded per-minute request ceiling     | 429         | `RATE_LIMITED`        | _"Easy there! Lots of players are here. Retrying in a few moments..."_ with auto countdown    | 🟡 `warn`        | Retry strictly after `Retry-After` header |
| **Pending Persist**   | Mode B asynchronous ingestion active    | 202         | `PENDING_PERSIST`     | _"Saved! Finding your stranger twin... This may take a moment."_ with two-dot animation        | 🟢 `info`        | Poll with backoff & jitter (5s, 10s, 30s) |
| **Overloaded (Shed)** | Event loop delay or memory saturated    | 503         | `OVERLOADED`          | _"Lots of people are here right now. Trying again in a few seconds..."_ with countdown        | 🟡 `warn`        | Exponential backoff with jitter + `Retry-After` |
| **Bot Challenge**     | Suspicious timing or failed Turnstile   | 403         | `CHALLENGE_FAILED`    | Displays interactive Cloudflare Turnstile verification modal                                   | 🟡 `warn`        | Retry on human solve             |
| **Offline / Network** | Network drops mid-submission            | Client-side | `NETWORK_ERROR`       | Stores picks in `localStorage`, displays _"Offline. Trying again..."_ with manual retry button | 🟢 `info`        | Exponential backoff (500ms, 1s, 2s, 4s, 8s + jitter) |
| **Internal Server**   | Unhandled exception in route            | 500         | `INTERNAL_ERROR`      | _"Something went wrong on our side. Your picks are saved. Try again in a few moments."_        | 🔴 `error` (Sentry) | Manual retry button              |
| **Dependency Down**   | PostgreSQL or Redis unavailable         | 503         | `SERVICE_UNAVAILABLE` | Friendly error page; cached static Drop still served from Cloudflare CDN                       | 🔴 `error` (Alert)  | Backoff poll                     |
| **Late Final Batch**  | Recap worker delayed past 07:10         | Worker/API  | `RECAP_PENDING`       | Displays provisional twin with _"Final results are being finalized"_ badge                     | 🟡 `warn`        | Automatic worker retry           |

---

## 6. Reliability and Scalability Rules (Non-Negotiable)

1. **Per-Route Policy Mandatory:** Every new or modified API route must have an approved row in the `architecture.md` Per-Route Policy Table before merge (specifying timeout, rate-limit class, cache policy, idempotency key, priority lane, and degradation behavior).
2. **Outbound Call Defenses:** Every outbound network call (database, Redis, Cloudflare R2, push gateways, Google Auth, Turnstile) must enforce a strict timeout, bounded retries with exponential backoff and full jitter, and an `opossum` circuit breaker.
3. **Bounded Everything:** No unbounded database queries (`SELECT *` without `LIMIT`), no unbounded loops, no unbounded queue depths, no unbounded Redis sets/lists, and no unbounded cache keys (all keys must carry TTLs).
4. **Zero N+1 Queries:** Database operations must use multi-row inserts and structured relational joins. Enforced via query profiling in CI and automated test suites.
5. **Keep CPU off the Request Path:** Image rendering, PDF/PNG compilation, heavy pairwise matching, and compression run strictly in worker threads (`piscina`) or the background worker service. Never block the event loop.
6. **No Inline Side-Effects:** Analytics logging, notification scheduling, share-card generation, and streak milestone rewards must be enqueued asynchronously in BullMQ, never executed inline during the HTTP submit request.
7. **Every Queue Job Idempotent:** All worker job processors must use deterministic job IDs (`prefix:userId:dropId:hash`) and idempotent database upserts so that running a job twice produces zero side-effects.
8. **Expand and Contract Migrations:** Every database schema migration must follow the zero-downtime expand-and-contract pattern. Never drop or rename a column in the same deployment that modifies application code.
9. **Deploy Freeze Window:** Never deploy code between **06:30 IST and 08:30 IST** daily, or at any time when the degradation ladder is at Level L2 or above. Emergency hotfixes require written Founder sign-off.
10. **Evidence-Based Limit Changes:** Never increase an API rate limit, database connection pool, statement timeout, or queue concurrency without attaching a supporting load-test benchmark in `memory.md`.
11. **No Dependency Without Failure Modes:** Before introducing any new dependency, document its failure modes, fallback path, and circuit breaker behavior in `docs/failure-modes.md`.
12. **Absolute Prohibition on Printing or Reading `.env`:** Never read, echo, display, or commit `.env` files. Work only with documented placeholder templates in `.env.example`.
13. **Dynamic Copy for All Failure States:** All user-facing error banners, modal dialogs, and degradation notices must read text dynamically from the database `app_content` table.
14. **Hot-Path Benchmarking:** Any architectural change to the core submit or reveal path requires automated before-and-after throughput benchmarks on staging.
15. **Error Budget Depletion Halt:** Releases stop immediately whenever more than **50% of the monthly error budget** is burned. All engineering efforts pivot exclusively to reliability and performance hardening.

---

## 6A. Constraints and Guardrails

### 6A.1 Technical & Operational Constraints

- **Runtime:** Node.js 20 LTS.
- **Client Bundle Budget:** Initial JavaScript bundle for the `/play` flow must remain $\le 150 \text{ KB}$ gzipped.
- **First Contentful Paint (FCP):** $\le 1.8 \text{ s}$ on a simulated 4G connection and mid-range mobile CPU.
- **Infrastructure Budget:** Lean architecture designed to run on free/inexpensive tiers (Cloudflare Pages/Workers, Fly.io / Render, Supabase / Neon, Upstash Redis). Total monthly operating cost kept below ₹2,500 (~$30) at inception.

### 6A.2 Legal & Privacy Guardrails

- In full compliance with India's **DPDP Act 2023**:
  - Explicit adult confirmation (18+) required before storing answer telemetry.
  - Zero processing of children's data.
  - One-click account deletion and data export.
  - Data minimisation: no collection of real names, phone numbers (unless OTP flagged), or biometric identifiers.

---

## 7. Git and Workflow Conventions

1. **Branching Strategy:**
   - Work happens on stage-specific branches: `stage-0-init`, `stage-1-design-system`, etc.
   - Merges into `main` occur only when a stage passes all verification steps and is approved by the Founder.
2. **Commit Conventions (Conventional Commits):**
   - Format: `<type>(<scope>): <short description>`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
   - Examples:
     - `feat(api): implement idempotent submission handler`
     - `test(shared): add worked example fixtures for pair similarity`
     - `docs(task): update phase 0 progress to 100%`
3. **Tags:** At the end of every approved stage, create an annotated git tag: `git tag -a stage-0-complete -m "Stage 0 verified and complete"`.

---

## 8. Definition of Done (DoD)

### 8.1 Per-Task Definition of Done

A task is marked `DONE` in `task.md` only when:

1. Code is fully implemented according to specifications.
2. TypeScript compiles cleanly with zero errors (`pnpm typecheck`).
3. ESLint passes with zero warnings or errors (`pnpm lint`).
4. Unit/integration tests covering the task pass (`pnpm test`).
5. Accessibility requirements (WCAG 2.2 AA) are verified for any UI elements.
6. Structured `pino` JSON logs and `prom-client` metrics are instrumented.
7. Any new or altered API endpoint has an approved entry in the Per-Route Policy Table (`architecture.md`).
8. Hot-path changes include an attached load/performance benchmark note in `memory.md`.
9. Any newly introduced failure mode or dependency has an actionable runbook entry in `docs/runbook.md`.

### 8.2 Per-Stage Definition of Done

A stage is complete only when:

1. All constituent tasks in `task.md` meet the per-task DoD.
2. `architecture.md` is updated if any data schemas, routes, or dependencies evolved.
3. `task.md` progress bars and task counts are recomputed and redrawn.
4. `memory.md` contains an updated "Current state", dated decisions, and changelog entries.
5. The Stage Report is printed in the exact format defined in Section 1.3 of the Master Prompt.
6. The AI assistant halts execution and waits for the Founder's review.
7. The docs visuals are regenerated when task counts change.

---

## 9. Content Policy and Editorial Guidelines

### 9.1 Forbidden Topic List (Enforced by Admin Importer)

<!-- visual:start callout-forbidden-topics -->
> [!WARNING]
> **Zero-Tolerance Forbidden Topics**  
> Questions, options, scenario texts, archetype labels, tags, alt text or free-text prompts must NEVER touch: politics (parties, leaders, elections, policies), religion, caste, sexuality, health, mental state, body image, income, or real named people/brands as targets of judgement. Automated tests fail the build when any seeded item matches this list.
<!-- visual:end callout-forbidden-topics -->


The question curation tool and JSON importer reject or flag questions touching:

1. **Religion & Faith:** Beliefs, rituals, deities, religious holidays, sacred texts.
2. **Caste & Community:** Caste distinctions, reservations, community stereotypes.
3. **Electoral & Partisan Politics:** Political parties, leaders, elections, government policies.
4. **Sexuality & Romance:** Sexual habits, relationship history, adult content. *(Situations Lane Clarification: Social dilemma scenes—such as "someone you have been noticing at work or campus walks up to talk to you"—must maintain strictly platonic, social, and conversational framing. Zero romantic pursuit, zero dating framing, zero sexual subtext. Scenarios focus purely on social reaction style and conversational etiquette, strictly preserving compliance with this rule.)*
5. **Medical & Mental Health:** Diagnoses, medication, physical ailments, disabilities.
6. **Body Image & Physical Appearance:** Weight, height, skin tone, beauty standards.
7. **Living Individuals:** Real celebrities, influencers, public figures.
8. **Commercial Brands:** Corporate logos or product endorsements (unless sponsored in v2.0).

### 9.2 Editorial Rules for Meme Questions (Founder-approved, M0)

All meme questions (`render_variant = "meme"`) must adhere to strict editorial standards:

1. **Zero Right or Wrong Answers:** Questions must be pure instinct and preference; never trivia, intelligence, or correctness tests.
2. **Language-Light:** Prompts and option captions must be concise and easily understood across English-speaking and bilingual Indian cohorts.
3. **No Forbidden Topics:** Strict zero tolerance for any theme or subtext touching Section 9.1 categories.
4. **No Content That Mocks a Group:** Humour must be self-referential or universally relatable to daily human quirks; never punching down, stereotyping, or mocking any demographic, region, or subculture.
5. **Balanced Answer Spread (Entropy Check):** Options must be designed so no single option monopolizes selections (entropy verified before publishing).
6. **Original-to-Oddly Policy:** Never claim a meme is *"never seen on the internet"*; claim only that it was written for Oddly. All captions must be freshly authored for Oddly.
7. **Mandatory Subject Tagging:** Every meme question must carry at least one valid subject tag from the database-managed neutral taxonomy before admin approval.

### 9.3 Editorial Rules for Lane Content & Situations Scenarios (Founder-approved, L0)

1. **Neutral Tags Only:** All lanes, question tags, and style tags must use strictly neutral, non-judgmental descriptors.
2. **No Real Named People or Living Figures:** Scenarios and prompts must never reference real individuals, celebrities, politicians, or influencers.
3. **Situations Scenario Safety Checklist (Mandatory for Admin Sign-Off):**
   - Gender-neutral and orientation-neutral phrasing throughout.
   - Zero scenes depicting persistent contact after refusal, stalking, intimidation, or pressuring someone.
   - Zero scenes involving alcohol, drug use, humiliation, or non-consensual dynamics.
   - Playful, non-judgmental archetype style labels (e.g., *Calm, Playful, Shy, Bold, Guarded, Over-the-moon, Deflecting, Curious*); zero toxic or pejorative tags (*"simp", "desperate", "loser", "sigma"* are strictly forbidden).
4. **No Politics in Any Lane:** Politics remains completely barred from all lanes, including "Hot Takes" (which is restricted to harmless lifestyle debates like food habits).

### 9.4 Architectural Reminders (Founder-approved, L0)

1. **Rule 9 Reminder (Failure Modes for Embedding Model & Vector Index):** Introducing a self-hosted ONNX embedding model (for Stage L6 `say_it`) and vector search index introduces worker CPU and memory failure modes. These must be fully analyzed in `docs/say-it-text-answers.md` and failure modes documented before code is authored.
2. **Rule 11 Reminder (New Dynamic `app_config` Keys):** All operational thresholds for lanes and twin depth reside in `app_config`: `lane.closest_so_far_below` (200), `lane.early_below` (500), `lane.min_approved_drops_to_open` (8), `lane.missing_drop_alert_hours` (24), `lane.max_legacy_formats_in_everyday` (2), `lane.min_high_entropy_questions` (3), `lane.expected_players_threshold_for_entropy_rule` (5000), `match.tie_epsilon` (0.01), `match.neighbour_limit_k` (32), `match.history_window_days` (28), `match.history_min_shared_days` (5), `match.weight_cap` (3.5), `match.weight_cap_enabled` (true for new lanes, false for Everyday until the Founder decides), `match.min_questions_compared` (3), `match.mutual_pairing_enabled` (true), `match.history_tiebreak_enabled` (true), `match.group_size_display_cap` (1000), `super.min_lanes` (2), `super.min_similarity` (0.8), `text.max_chars` (80), `text.max_questions_per_drop` (1), `text.raw_retention_days` (7), `text.history_retention_days` (28), `text.rejection_limit_per_day` (3), `text.disable_days` (7), `text.archetype_weight_a` (0.5), `text.min_confidence` (0.7), `bonus.min_tie_size` (2), `bonus.questions_per_round` (3), `bonus.max_rounds` (2), `bonus.pool_min_per_lane` (40), `bonus.window_hours` (24), `bonus.retention_days` (28), `bonus.min_participants` (2), `feature.bonus_rounds` (false), `badge.min_similarity` (0.6), `badge.tier1_lanes` (2), `badge.tier2_lanes` (3), `badge.tier3_lanes` (5), `badge.super_window_days` (7), `feature.badges` (false).

---

## 10. Copywriting and Honesty Standards

1. **Zero Mockery:** Never tease, judge, or patronize a player's choice. Celebrate all answers equally.
2. **Short & Crisp:** Body copy in mobile views must not exceed 2 lines. Let whitespace create calm.
3. **Transparent Probabilities:** Rarity numbers (e.g., _"1 in 4,200"_) must reflect actual database occurrences. Never fabricate statistical rarity.
4. **Offline Copy Fallback (The ONLY Allowed Static Strings):**
   - Offline Title: _"You're offline."_
   - Offline Subtitle: _"Your picks are saved on this phone. We'll send them the second you're reconnected."_
   - Offline Button: _"Try again"_
   - Error Title: _"Something went wrong."_
   - Error Subtitle: _"Your picks are safe. Let's give it another shot."_
   - Error Button: _"Retry"_

---

## 11. Change Log

- **2026-11-22:** Stage L0-ADD rule additions approved by Founder:
  - Rule B1 (clarifies Rule 12 / L1): Bonus Questions Are Not Drop Questions (drawn from published evergreen pool, identical within tie group, never personalised).
  - Rule B2: Bonus Honesty (real participant and tie group counts; zero synthetic participants).
  - Rule B3: No Side Effects for Bonus Answers (no changes to oddness, percentiles, tiers, streaks, or badges; 28-day retention purge).
  - Rule B4: Bonus Lane Isolation (bonus round strictly bound to one lane and one Drop).
  - Rule B5: Badges Are Private and Unranked (visible only to owner on result screen and My Badges page; no leaderboards or player comparisons).
  - Rule B6: Badges Cannot Be Bought or Rushed (no paid progress, no play-day grind badges, zero nagging notifications).
  - Rule B7: Badges Are Honest and Evidenced (stored evidence with lane IDs and Drop IDs; abuse accounts revoked with audit entry).
  - Added 14 new config keys for bonus rounds and badges to Section 9.4.
- **2026-11-21:** Stage L0 rule additions and amendments approved by Founder:
  - Rule L1 (amends Rule 12): Lane Drop Identity (questions are identical within a lane; Drops exist per lane).
  - Rule L2: Lane Isolation (twins, anti-twins, arcs, and Orbits belong to exactly one lane; only Super twin spans lanes).
  - Rule L3: Lane Honesty (real status `planned`, `preview`, `open`, `resting`, `retired`; honest "Closest so far" below 200 players).
  - Rule L4: Tie Honesty (real group size displayed; "N of 5 with M people"; exact below 1,000, "1,000+" above).
  - Rule L5 (amends Rule 18): Free-Text Answers (`say_it` format; max 80 chars; machine comparison only; 7-day raw text purge; 28-day embedding purge; inactive until Gate G4).
  - Rule L6: Forbidden Topics Stay Forbidden Across All Lanes & Formats (politics, religion, caste, sexuality, mental health; build-fail validation check).
  - Rule L7: Situations Lane Safety (gender-neutral, no persistent pursuit/pressure, kind style labels, no rankings, 18+ only, safety checklist).
  - Rule L8: Lane Parity (lanes cannot be paywalled; no paid advantage in matching).
  - Rule L9: No Lane Without a Drop (missing Drop displays "Resting today"; 24-hour advance admin alert).
  - Rule L10: First-Run Promise (new visitor goes straight into Everyday Drop without extra screens; lane picker offered after first result).
  - Rule L11: Lane Choice is the Player's Own (play any open lane; streak counts if $\ge 1$ lane Drop is completed).
  - Added Section 9.3: Editorial Rules for Lane Content & Situations Scenarios.
  - Added Section 9.4: Rule 9 & Rule 11 Reminders for Stage L0.
- **2026-11-15:** Stage M0 rule additions approved by Founder:
  - Rule 12: Identical Drop rule (the five questions of a Drop are identical for every player; zero personalisation on Drop questions).
  - Rule 13: Consent rule (analytics and personalisation require separate, withdrawable DPDP consent, default OFF; security processing separate; deletion on withdrawal).
  - Rule 14: No sensitive inference rule (never infer or store protected categories from taste or timing; build-fail test on forbidden tag matches).
  - Rule 15: No identity-joined profiling rule (pseudonymous analytics ID; no individual-level dashboards; $k \ge 20$ group reporting).
  - Rule 16: Experiment rule (A/B testing strictly restricted to non-Drop surfaces via flags with documented hypothesis, guardrails, and kill switch).
  - Rule 17: No pressure to pay (daily play free forever; zero guilt or streak urgency copy; max 1 offer per 14 days, stop for 90 days after 2 dismissals).
  - Rule 18: Free-text exception for Meme Lab captions ($\le 100$ chars, moderation-gated; marked inactive until Stage M3 is approved).
  - Rule 19: Orbit subject-sync amendment (aggregate agreement rates per tag with min 5 shared answers; individual picks remain hidden).
  - Rule 9 reminder: Any new dependency (analytics SDK, payments, moderation) must have failure modes documented before use.
  - Section 9.2: Added Editorial Rules for Meme Questions.
- **2026-11-14:** Stage F0 rule amendments approved by Founder:
  - Rule 4: Added consent-scoped exception for active Orbit Telepathy question (partner's pick label shown to viewer after own guess locked).
  - Rule 6: Recorded approval of F18 (Twin Globe), F19 (Keep & Orbit), F20 (Telepathy), and F21 (Anti-twin) for v1; F22 and F23 as v1.5 documented only; handle swap/DMs/contact exchange permanently Not Planned; F12 Wave superseded by F19.
  - Section 3: Added prohibition against pressuring an Orbit partner (no guilt, nagging, or "your twin is waiting" copy).
  - Section 3: Corrected font reference from Space Grotesk to shipped Bricolage Grotesque and Inter.
- **2026-11-07:** Initial rules established for Oddly v1.
