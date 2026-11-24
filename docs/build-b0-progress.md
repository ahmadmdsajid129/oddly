# Stage B0: Build Progress

| Slice | Name | Status | Commit | Note |
|---|---|---|---|---|
| A0 | Pre-flight, baseline, CI, demo mode scaffolding | done | b0-A0-done | Preflight audit complete, demo mode & synthetic guardrails verified |
| A1 | Lanes foundation, lane picker first, per-lane Drop clock, lane-scoped submit and result | done | b0-A1-done | D1 first-screen lane picker, 07:00-06:59 IST daily clock, multi-lane persistence verified |
| A2 | Question formats and similarity per format | done | b0-A2-done | pick1, pick2of6, rank3, slider7, scene verified with proofs and 12 questions/format |
| A3 | Twin depth: closest so far, tie groups, history signature, mutual pairing, group size copy | done | b0-A3-done | Closest so far (<200), tie groups, BitMinHash history, and greedy mutual pairing verified |
| A4 | Memes lane: meme presentation, template registry, seed Drops, lane config | done | b0-A4-done | 14-drop runway (70 meme Qs), strict lane isolation, Satori meme share cards verified |
| A5 | Result hub, share cards per lane, per-lane streaks, history, "play another lane" | done | b0-A5-done | /result/[lane]/[date], /me/streaks, lane history filter, and "play another lane" verified |
| A6 | Safety foundation: block, report, sever, consent, kill switches, audit log | done | b0-A6-done | POST /v1/blocks, audit_logs, ops:sever-orbit, ops:ban-player, and consent verified |
| A7 | Keep and Orbit, lane-tagged | done | b0-A7-done | Lane-tagged Keep creation, Orbit formation with lane_id, and lane badge on Orbit rows verified |
| A8 | Telepathy and Sync score | done | b0-A8-done | Daily blind instinct prediction, luck baseline, and Sync score verified with 19 tests |
| A9 | Twin Globe | done | b0-A9-done | Flat SVG world map, k-anonymity aggregated arcs, time jitter, /globe verified |
| A10 | Anti-twin | done | b0-A10-done | Bounded lowest-similarity opposite, opt-in reveal, Satori flip card, /anti-twin verified |
| A11 | Sync by subject (statistics only) | done | b0-A11-done | F28 tag-level agreement rate stats with k>=5 and Rule 19 Zero-Leak |
| A12 | Chat unlock engine (Three Doors, Duo Trial v0, both-confirm, chat_ready) | done | b0-A12-done | Three Doors evaluation, Duo Trial v0, both-confirm state machine to chat_ready |
| A13 | Notifications for Orbit and unlock; events; consent-gated signals | done | b0-A13-done | Event dictionary, strict schema allowlist, and DPDP consent-gated signals |
| A14 | Demo seeder, the 200-player scenario test, explain:twin tool | done | b0-A14-done | 200-player scenario seeder, tie-group invariant tests, and pnpm explain:twin CLI |
| B1 | Bonus rounds | done | b0-B1-done | Stage L9 additive closest-match tie-breaker; bonus_results; flag OFF |
| B2 | Super twin | done | b0-B2-done | Multi-lane twin match surface; >= 2 lanes with mean similarity >= 0.80 |
| B3 | Collector badges and opt-in sharing | done | b0-B3-done | Non-evaluative badges with tamper-evident evidence and opt-in sharing |
| B4 | Oddly Deck lite (flag off) | done | b0-B4-done | Procedural unusual pick card binder; rare pick extraction; flag OFF |
| B5 | Friend-invite Orbit and Friends Compare lite (flag off) | done | b0-B5-done | Single-use 7-day invite code and group compare up to 30 members; flag OFF |
| Z | Final report, inventories, hardening, tag stage-B0-complete | done | stage-B0-complete | Full report, build-b0-inventory.json, budget passed, all tests verified |
