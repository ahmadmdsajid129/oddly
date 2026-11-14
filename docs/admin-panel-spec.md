# Oddly Admin Panel: "Mission Control"

> Spec v1.0 | 14 Nov 2026 | Audience: the founder (boss) and the AI build agent
> Companion to: Oddly Product, Brand and Technical Blueprint v1.0, plus the later v1 decisions (Twin Globe, Orbit with Telepathy, Anti-twin, Oddly Deck).
> Phase tags: **[P1]** ships with v1 (Stage 11) | **[P2]** v1.1 to v1.5 | **[P3]** later.

---

## 1. Principles (this is what creates the "boss feeling")

1. **Five-second answer.** Open the panel and know three things at once: is the app healthy, how many people are playing, what needs me.
2. **Real numbers only.** Same honesty rule as the app. Every tile shows "as of hh:mm:ss" and goes amber if its data is stale.
3. **Everything drills down.** Tile, then chart, then list, then record. No dead-end numbers.
4. **Dangerous actions are deliberate.** Hold-to-confirm, a typed reason, and a second approver for anything irreversible.
5. **Everything is audited.** Every click that changes data is written to an immutable log.
6. **Privacy by default.** No raw phone numbers or individual answers on screen unless the admin gives a reason (logged). Aggregates follow k >= 20. External exports follow groups >= 1,000.
7. **Keyboard-first and phone-friendly.** Command palette (Ctrl/Cmd+K), shortcuts, and a mobile layout so the boss can check from a phone.
8. **Calm when green, loud when red.** Normal state is quiet and dark. Problems pulse and notify.

---

## 2. Access, roles and security [P1]

| Role | Can do | Cannot do |
|---|---|---|
| Owner (boss) | Everything, including roles, config, incident mode, deletions | None |
| Admin | Users, moderation, config, announcements | Change roles, delete audit log |
| Approver | Approve or reject Drops and questions | Write the same Drop they approve |
| Question writer | Draft questions and Drops, run panel tests | Approve, schedule, pull |
| Moderator | Reports queue, user flags, suspensions (not deletion) | Config, questions |
| Analyst | Read-only dashboards and aggregate exports | Any write |
| Support | Look up a user (masked), handle data requests | Suspend, config |
| Developer / on-call | System health, incident mode, deploys view | User data beyond masked |

Security rules:
- Separate host (for example `admin.<domain>`), SSO sign-in, **mandatory 2FA**, optional IP allowlist.
- Sessions: 8 hours absolute, 30 minutes idle. New-device sign-in sends an alert to the Owner.
- Role changes need the Owner plus one other Admin.
- One sealed break-glass account (hardware key), usage triggers an alert.
- Admin API is a separate service from the public API. Never expose admin routes on the public host.

---

## 3. Command Center (home screen) [P1 basic, P2 full]

A dark, control-room layout using the brand palette (Midnight background, Mint for healthy, Coral for alerts). Big numbers count up smoothly. A thin status bar sits on top.

### 3.1 Top status bar
- Environment badge (PROD in coral, STAGING in violet).
- App state: **Healthy / Degraded / Incident**, one word, one colour.
- Drop phase strip: `Locked > Staged > Live > Closing > Final batch > Recap`, with the current step glowing and a countdown to the next step.
- Boss name, notification bell, command-palette hint.

### 3.2 Tiles

| Tile | Definition | Refresh |
|---|---|---|
| **Playing right now** | Distinct client pings in the last 5 minutes. At scale only about 10% of clients ping, so the count is scaled up and labelled "estimated". | 10 s |
| **Answered in last 10 min** | Per-minute submission buckets summed | 10 s |
| **Players today** | Unique submissions in the current Twin Day | 10 s |
| **Submissions per minute** | 60-minute sparkline, spike markers at Drop time | 10 s |
| **Completion rate** | Viewers who submitted all five | 1 min |
| **Median time to complete** | Seconds from first question to submit | 1 min |
| **D1 / D7 / D30 retention** | Rolling 7-day cohort average, with gate thresholds (G0 to G3) drawn as lines | hourly |
| **Share rate** | Finishers who share a card | 5 min |
| **Flip rate** | Share of viewers who flip the card to see the back | 5 min |
| **Invite conversion and K-factor** | Link clicks to completed Drops; invites x conversion | hourly |
| **Twin quality** | % players with 5-of-5 twin, % with 4+ of 5, median exact twins | 5 min |
| **Orbit** | Active Orbits, Keep rate, Telepathy hit rate against the luck baseline | hourly |
| **Reports open** | Count, oldest age, and SLA breaches | 1 min |
| **Cost today** | Hosting, SMS, push and storage in rupees, against budget | hourly |
| **Health ring** | Composite 0 to 100 (error rate, latency, queue backlog, batch status, CDN errors) | 30 s |

### 3.3 Panels
- **Needs me**: a short list of items waiting on the Owner (approvals due, reports past SLA, a Drop gap in the next 14 days, a failed job). Empty state says "Nothing needs you."
- **Since yesterday**: a diff of the key tiles (players, D1, share rate, reports) with up and down arrows.
- **Live globe mini**: the same Twin Globe as the app, fed by the same anonymous arc batches, plus a "live / replay" indicator.
- **Boss Brief** [P2]: a daily summary card at 08:00 (also sent by email or push): yesterday's players, D1, shares, best moment, worst problem, today's Drop preview.

### 3.4 Boss-feel details [P2]
- Milestone moments: confetti and an optional chime at the 100th, 1,000th, 10,000th player of the day; a banner on new all-time highs.
- Count-up animation on every number; respects reduced motion.
- Density toggle (comfortable / compact), pin favourite tiles, saved views.
- "Hold to confirm" red buttons for dangerous actions.

---

## 4. Live Ops [P1 basic]

| View | What it shows |
|---|---|
| Live map | Heat by coarse region of who is playing now. Never individuals. Regions under k = 20 merge. |
| Live event stream | Anonymous rolling feed: `submit | IN-GJ | 18-24 | 22 s`. No IDs, no answers. Pausable. |
| Live funnel | Landing > age gate > Q1 > Q2 > Q3 > Q4 > Q5 > submit > reveal > share, with counts and drop-off per step in the last 15 minutes. |
| Per-question drop-off | Which question people abandon on (a quality signal for question writing). |
| Device mix | OS, browser, screen size, mid-range Android share, PWA installed share. |
| Network quality | Median load time, slow-connection share, offline-queued submissions. |
| Push health | Permission grant rate, sends, deliveries, opens, failures by provider. |
| Queue monitor | Matching, card render and notification queue depths and oldest job age. |

---

## 5. Users [P1 read and basic actions, P2 segments]

### 5.1 List and search
- Search by user ID, alias, hashed-phone match, device hash, or share link ID. Never by raw phone.
- Filters: status (active, flagged, suspended, deleted), joined date, streak range, region, age band, guest or account, platform, source (campus code, UTM), Orbit status.
- Columns are configurable and saved as views.

### 5.2 User drawer
- **Overview:** alias, status, joined, last seen, streak (current and best), region, age band, locale, platform.
- **Activity:** submissions history, time per Drop, matches (twin region, similarity, tier), shares, notifications received and opened.
- **Orbit and Deck:** active Orbits, Telepathy record, Anti-twin history, Deck progress.
- **Trust:** flags, report history (by and against), blocks, device cluster size, suspected-multi-account score, suspected-minor score.
- **Masked identity:** phone and email are masked. "Reveal" needs a typed reason and writes to the audit log.

### 5.3 Actions

| Action | Who | Rules |
|---|---|---|
| Flag and exclude from matching | Moderator+ | Reversible. Flagged accounts are never anyone's twin. |
| Suspend | Moderator+ | Reason and duration. User sees a clear message. |
| Remove suspected minor | Admin+ | Reason required. Triggers deletion flow. |
| Reset streak or grant streak freeze | Admin+ | Reason required (support gestures). |
| Sever an Orbit | Moderator+ | Both users are told neutrally. |
| Delete account and data | Owner or Admin + second approver | Starts the deletion job. Irreversible. |
| View as user (read-only) | Admin+ | Banner on screen, session logged, time-limited. |

### 5.4 Segments [P2]
New today, power users (30+ days), at-risk (streak of 7+ but missed yesterday), dormant (14 days), likely bots, device clusters (same device on many accounts), campus cohorts. Segments can feed notifications and announcements (counts only, no export of identities).

### 5.5 Bulk actions
Always preview the affected count and a 10-row sample, require a reason, and run as a background job with an undo window where possible.

---

## 6. Questions and Drops [P1] (the heart of the product)

### 6.1 Question bank
Columns: ID, type, text, options, category, status (draft, in review, approved, scheduled, live, retired, pulled), predicted entropy (panel), **realised entropy (live)**, top-option share, share-rate lift, abandon rate, report count, last used, language coverage.
Filters by type, category, status, health.
**Health score** per question: balanced answers, low abandon, low reports, positive share lift. Red questions are never reused.

### 6.2 Question editor
- Forms per type: pick-one text (2 to 4 options), pick-one image (4), number (1 to 50), colour (palette picker with text labels), word (6 options).
- Image upload with a **licence log** (source, licence, attribution). A question cannot be approved without it.
- Live phone preview (360 and 390 widths), dark and light.
- Options carry stable IDs so translations never change meaning.
- Translation tabs (Hindi, Gujarati) with a human-review status [P2].

### 6.3 Automatic checks (block approval on failure)
1. Exactly five questions per Drop.
2. Mix rule: at least one low-cardinality question and at least two high-cardinality (number, colour, word).
3. **Telepathy rule:** at least one question with 2 to 4 options (the anchor for Telepathy guesses).
4. Forbidden-topic lint: religion, caste, politics, sexuality, health, body image, real people, brands (until sponsored questions exist). Flags words for human decision, never silently passes.
5. Predicted balance: no option above about 60% (binary) or 40% (multi-option), from the panel test.
6. Readability: question text under two lines at 360 px.
7. Same type not in the same slot two days in a row.
8. Cooldown: a question cannot repeat within 180 days.

### 6.4 Panel testing
Generate a private test link for 100+ testers. The tool collects answers and shows distribution, entropy and abandon points before the question can move to review.

### 6.5 Drops calendar
- Month and week views. **The next 14 days must be filled**: gaps are red, and a gap within 3 days pages the Owner.
- Drop card states: Draft > In review > Approved > Scheduled > Locked (D-2) > Live > Closed > Final.
- **Two-person approval:** the approver cannot be the writer. Rejections carry a comment.
- Drag to reschedule (blocked inside the lock window).
- Staging rehearsal: "Run as test Drop in 10 minutes" on staging only.

### 6.6 Emergency controls
- **Pull a question:** one button. Matching recomputes on the remaining four, users get a recap note, and the action needs a reason and the Owner or Admin role.
- **Extend the window:** add hours to the current Drop (for outages). Users are told through a banner.
- **Hold the next Drop:** stops the 07:00 release (for example if a content problem is found).

### 6.7 Bulk import [P1]
CSV or JSON upload with a **dry run**: shows what would be created, errors per row, duplicates. Nothing is saved until confirmed.

### 6.8 Post-mortem per Drop
After each final batch: realised entropy against predicted, per-option shares, abandon points, share rate, best and worst question. One click copies a summary.

### 6.9 Submitted questions [P2, from month 3]
Queue of user suggestions (reviewed, never shown directly). Accept, edit and credit, or decline with a template reply.

---

## 7. Matching, Globe, Orbit, Anti-twin and Deck ops [P1 basic]

| Area | What the admin sees and controls |
|---|---|
| Daily matching | Players today, mean and median similarity, share of players with 5-of-5 and 4+ twins, tier distribution, the "closest so far" share. Compare against the simulation table in the blueprint. |
| Batches | Provisional refresh status (every 5 min), final batch progress with ETA and per-worker status, last duration. Buttons: re-run final (Owner only, reason required) and view failures. |
| Algorithm stage | Which stage is active (brute force, hash buckets, ANN), candidate counts, p95 match time. |
| Privacy rules | How many regions and age bands were merged today because of k < 20. |
| Exclusions | Counts of flagged, same-device, blocked and friend exclusions applied. |
| **Twin Globe** | Arcs per minute, batch interval, mode toggle **Live / Replay loop**, last 24-hour replay buffer health, kill switch. Only coarse regions. |
| **Orbit** | Active Orbits, Keep rate (taps / offers), average Orbit length, churn, friend-invite Orbits vs twin Orbits, abuse patterns (mass-Keep from one account). Sever and block tools. |
| **Telepathy** | Guess rate, hit rate, **luck baseline** (expected hits = sum of 1/options per guess), lift over luck. Shown honestly. |
| **Anti-twin** | Share of players who open it, share rate vs normal card, quality check that results are genuinely opposite. |
| **Oddly Deck** [P2] | Cards minted, binder completion, set completions, Mythic count, foil render failures. |

---

## 8. Share cards and Growth [P1 basic, P2 full]

- **Share funnel:** card viewed > flip > share tap > channel > link opened > Drop played > shared again. Broken down by tier, card version, size (story, feed, link), and channel.
- **Card A/B tests:** variants behind flags (headline, back-side design, reveal length). Shows lift and a significance note. Never declares a winner under a minimum sample.
- **Link health:** open rate, preview render failures, expired link rate.
- **Campaign tools [P2]:** campus and ambassador codes, UTM links, QR code generator, per-code performance (players, D7, share rate). Campus comparison uses aggregates only.
- **Ambassador view [P2]:** each ambassador sees only their own code's numbers.
- **Data stories [P2]:** weekly generator for "India's colour for Monday" style posts, with minimum group size 1,000 enforced.

---

## 9. Notifications and Announcements [P1]

- **Schedule view:** the daily timeline (Drop live, nudges, twin upgrade, recap) with status per batch.
- **Template library:** every push and in-app message, versioned, with test send to the Owner's device.
- **Rules (editable in config):** max 2 per user per day, quiet hours (default 22:00 to 07:00), batch size and gap, nudge times.
- **Batch monitor:** sent, delivered, opened, failed, with provider error breakdown.
- **Opt-out watch:** unsubscribe rate per template. A template above its threshold is flagged.
- **Announcements:** in-app banner (info, warning, maintenance), with start and end time and audience (all, region, platform).
- **"We're busy" toggle:** turns on the load-shedding banner manually.
- **Maintenance mode:** read-only app with a friendly page.

---

## 10. Moderation and Safety [P1]

### 10.1 Reports queue
- Filters: type (question, card, twin detail, Orbit, user), severity, age, SLA state.
- Each report shows context without exposing private data: the reported item, reporter alias, reason, previous reports on the same item or user.
- Actions: dismiss, warn, hide item, suspend, escalate. Response templates for each.
- **SLA timers:** high severity 2 hours, normal 24 hours. Breaches appear on the Command Center.
- Reports against a question can trigger "pull" with one click.

### 10.2 Safety dashboard
Reports per 1,000 players, median time to resolve, repeat offenders, Orbit severs, block rate, suspected-minor removals.

### 10.3 Escalation
Any report suggesting risk to a person follows the written runbook: lock the account, preserve data, notify the Owner immediately, record the decision. The runbook is stored in the panel and its steps are checkboxes with timestamps.

### 10.4 Appeals [P2]
Suspended users can appeal from a form. The appeal appears in the queue with the original case attached.

---

## 11. Config, Copy and Feature flags [P1]

Everything the product says or decides comes from the database, editable here with **draft, preview, approve, publish** and a full **version history with one-click rollback**.

| Section | Examples |
|---|---|
| Remote config | Drop time, window length, upgrade-notification rule (0.10), tier cut-offs (50, 80, 95), k-anonymity (20), minimum live-number threshold (20), notification caps, rate limits, Orbit unlock days (3, 7, 14, 30), Telepathy options limit (4) |
| Copy and micro-copy | The whole micro-copy library by language, with character-length warnings and preview in the real UI |
| Pages | About, Privacy, Terms, FAQ, Safety, Contact |
| Feature flags | Each feature with on/off, percentage rollout, audience (region, platform, cohort), and a kill-switch row. Includes Twin Globe, Orbit, Telepathy, Anti-twin, Deck, handle swap. |
| Card templates | Choose the active card version and back-side design per tier |
| Banners | See section 9 |

Rules: config changes by Admin need Owner approval for "danger" keys (Drop time, k-anonymity, age policy, notification caps). Every change is diffed in the audit log.

---

## 12. Analytics [P2]

- **Retention cohorts:** D1 to D30 grid, by join date, source, campus, age band, region, platform, and "played with Orbit vs without".
- **Funnels:** onboarding, reveal to share, share to install, Keep to Orbit day 7.
- **Stickiness:** DAU / MAU, streak distribution, resurrected users.
- **Experiments:** every flagged test with variants, sample sizes and lift.
- **Question insights:** which question types and topics drive completion and shares.
- **Exports:** CSV of aggregates only. Group size minimum 20 internally, 1,000 for anything leaving the company. Each export is logged.
- **Saved reports and scheduled email digests** to the Owner.

---

## 13. System health and Incident mode [P1 basic]

### 13.1 Health
API p50 and p95 latency, error rate, submit latency, queue depth and oldest job, worker status, Postgres and Redis memory and connections, CDN hit rate and origin errors, push provider status, last backup and last restore test, deploy history with a rollback link, uptime.

Alerts (from the blueprint): error rate above 1% for 5 minutes, submit p95 above 800 ms, queue backlog above 10 minutes, final batch not complete by 07:10, CDN origin errors. Alerts go to the Owner by push and to on-call by the configured channel.

### 13.2 Incident mode (one big red button, hold to confirm)
A single screen of runbook actions, each a toggle with an audit entry:
1. Show the "we're busy" or maintenance banner.
2. Extend the current Drop window.
3. Pause non-essential notifications.
4. Switch the Twin Globe to Replay loop.
5. Disable Orbit and Anti-twin (keep core play).
6. Pull a specific question.
7. Serve the static Drop from CDN only.
8. Roll back to the previous release.
An incident timeline records who pressed what and when, and exports a post-incident report.

---

## 14. Privacy and Legal [P1 basic]

- **Data requests queue:** download and deletion requests with SLA timers and status. Deletion shows the job's progress and a completion receipt.
- **Consent log:** notification and analytics consent per user (counts in the UI, records in the database).
- **Retention jobs:** guest expiry, log expiry, deleted-account purge. Last run, count, failures.
- **Processor register:** analytics, SMS, push, hosting, error tracking providers with region and agreement date.
- **Breach log and runbook.**
- **Age policy:** counts of declared-under-18 attempts and suspected-minor removals.

---

## 15. Money [P3]

Hidden behind a flag until revenue starts: subscriptions, MRR, churn, trials and conversion, refunds, payment failures, sponsored-question pipeline (brief, review, schedule, aggregate report), invoices, GST records.

---

## 16. Audit log [P1]

- Immutable, append-only: who, role, action, target, before and after (diff), reason, IP, device, timestamp.
- Filter by admin, action type, target and date. Export for legal.
- Tamper evidence: periodic hash chain checkpoint stored outside the main database.
- Shown inline on every record ("history" tab).

---

## 17. Data model additions

| Table | Purpose |
|---|---|
| `admin_users`, `admin_roles`, `admin_sessions` | Access control |
| `audit_log` | Immutable action log |
| `config_entries`, `config_versions` | Remote config with history and rollback |
| `copy_entries`, `copy_versions` | Editable copy |
| `feature_flags`, `flag_rules` | Flags and rollouts |
| `announcements` | Banners and maintenance |
| `question_reviews`, `panel_tests`, `panel_test_answers` | Review workflow and panel testing |
| `drop_postmortems` | Post-Drop summaries |
| `report_cases`, `case_actions`, `case_templates` | Moderation |
| `user_flags`, `device_clusters` | Trust signals |
| `data_requests`, `retention_runs` | Privacy operations |
| `campaigns`, `campaign_codes` | Growth tracking |
| `metrics_minute`, `metrics_hour`, `metrics_day` | Pre-aggregated counters feeding every tile |
| `incidents`, `incident_actions` | Incident timeline |
| `orbits`, `telepathy_guesses` | Orbit and Telepathy (shared with the app) |

Dashboards read from the pre-aggregated `metrics_*` tables and Redis counters. They must never run heavy queries on the live answers table.

---

## 18. Admin API outline (separate host, prefix `/admin/v1`)

| Path | Purpose |
|---|---|
| `GET /overview` | Command Center tiles |
| `GET /live/stream`, `/live/funnel`, `/live/map` | Live Ops |
| `GET /users`, `GET /users/:id`, `POST /users/:id/actions` | Users |
| `GET/POST /questions`, `POST /questions/:id/panel-test` | Question bank |
| `GET/POST /drops`, `POST /drops/:id/approve`, `/pull-question`, `/extend` | Drops |
| `POST /import/dry-run`, `POST /import/commit` | Bulk import |
| `GET /matching/today`, `POST /matching/rerun-final` | Matching ops |
| `GET /orbit/stats`, `POST /orbit/:id/sever` | Orbit |
| `GET /growth/shares`, `GET/POST /campaigns` | Growth |
| `GET/POST /notifications/*`, `POST /announcements` | Messaging |
| `GET /reports`, `POST /reports/:id/action` | Moderation |
| `GET/PUT /config/:key`, `GET /config/:key/versions`, `POST /config/:key/rollback` | Config |
| `GET/PUT /flags/:key` | Feature flags |
| `GET /health`, `POST /incident/toggle` | System and incident |
| `GET /data-requests`, `POST /data-requests/:id/complete` | Privacy |
| `GET /audit` | Audit log |

All write endpoints take a `reason` and an idempotency key, and return the audit entry ID.

---

## 19. Build order

**Phase 1 (Stage 11, with v1):**
1. Auth, roles, 2FA, audit log.
2. Question bank, editor, automatic checks, Drops calendar, two-person approval, pull question, extend window, bulk import with dry run.
3. Command Center basic tiles (live count, players today, submissions per minute, completion, pipeline strip, health, alerts).
4. Users list and drawer (masked), flag and suspend.
5. Reports queue with SLA.
6. Config, copy, feature flags with versioning and rollback.
7. Announcements and the "we're busy" and maintenance toggles.
8. Matching ops basics and Twin Globe live/replay toggle.
9. Incident mode.
10. Data requests queue.

**Phase 2:** full Command Center, Boss Brief, Live Ops detail, segments, analytics, campaign and ambassador tools, panel-test tool, user-submitted questions, Orbit and Deck ops, appeals, A/B dashboard.

**Phase 3:** Money, sponsor tools, external data exports, public data-story generator.

---

## 20. Acceptance checklist

- [ ] No admin route is reachable without SSO and 2FA, and none is served on the public host.
- [ ] Every write action creates an audit entry with a reason.
- [ ] Phone numbers and individual answers are never shown without a logged reveal.
- [ ] A Drop cannot be scheduled without two different people (writer and approver).
- [ ] All eight automatic question checks block approval when they fail.
- [ ] The 14-day gap warning fires, and a gap within 3 days alerts the Owner.
- [ ] Pulling a question recomputes matching on the other four and shows a recap note.
- [ ] Each tile shows "as of" time and turns amber when stale.
- [ ] Live count below the configured minimum shows "players today" instead.
- [ ] Incident mode toggles each action and writes a timeline.
- [ ] Config rollback restores the previous version and logs it.
- [ ] Dashboards load in under 2 seconds with 10 lakh players of data (tiles read only from aggregates).
- [ ] The panel is usable at 390 px width (phone).
- [ ] Reduced-motion setting is respected by all count-up and confetti effects.
