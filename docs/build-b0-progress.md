# Stage B0: Build Progress (re-audited 2026-11-25)

> [!WARNING]
> The earlier version of this file marked every slice "done". A direct code read on 2026-11-25 found otherwise. Statuses below use the Rule 41 words: Working, Partly working, Library only, Fake, Not built. The fixes are tracked in `task.md` Phase 10V (Stage C0). Full evidence: `docs/audit/b0-deep-dive-2026-11-25.md`.

| Slice | Name | Real status | Note (fix task) |
|---|---|---|---|
| A0 | Pre-flight, baseline, CI, demo mode | Working | CI pnpm fix and preflight hold |
| A1 | Lanes, lane picker first, per-lane Drop clock, lane-scoped submit | Partly working | Picker first and per-lane Drops work; 18+ only in the browser (P10V.05) |
| A2 | Question formats and similarity per format | Library only | Format UI works; production scores with unweighted Dice, so rank and slider partial credit are wrong (P10V.07) |
| A3 | Twin depth: closest so far, ties, history, mutual pairing | Library only | Mutual pairing and tie-break are never called with real players; "Closest so far" never shows (P10V.09–13) |
| A4 | Memes lane | Working | Memes is its own open lane with seeded Drops |
| A5 | Result hub, share cards, per-lane streaks, history | Fake / Partly working | Result shows invented values (P10V.01); streaks cover only Everyday (= overall) and Memes (P10V.16) |
| A6 | Safety: block, report, sever, consent, audit | Partly working | Block route exists but matching ignores it (P10V.04); results readable by any player_id (P10V.03) |
| A7 | Keep and Orbit, lane-tagged | Built, unreachable | Keep needs a locked twin; nothing locks twins (P10V.11) |
| A8 | Telepathy and Sync | Built, unreachable | Depends on Orbit |
| A9 | Twin Globe | Fake | No k filter, not scheduled, hardcoded replay arcs (P10V.17) |
| A10 | Anti-twin | Partly working | Client can lower min_pool (P10V.06); uses the wrong formula |
| A11 | Sync by subject | Built, unreachable | Depends on Orbit |
| A12 | Chat unlock (Three Doors, both-confirm, chat_ready) | Fake | No API; UI hardcodes Sync 70 and passes Door 1 locally (P10V.15) |
| A13 | Notifications, events, consent-gated signals | Partly working | Events and consents routes exist; Orbit pushes not checked end to end |
| A14 | Demo seeder, 200-player scenario, explain:twin | Library only | Scenario runs on library code, not on the production path |
| B1 | Bonus rounds | Library only | 0 callers (P10V.18) |
| B2 | Super twin | Library only | 0 callers (P10V.18) |
| B3 | Collector badges and opt-in sharing | Library only | 0 callers; /v1/badges/mine returns creator badges (P10V.18) |
| B4 | Oddly Deck lite (flag off) | Library only | Documented-only feature; fine |
| B5 | Friend-invite Orbit and Friends Compare lite (flag off) | Library only | Documented-only feature; fine |
| Z | Final report and hardening | Not done | Previous report overstated status; replaced by docs/audit/b0-deep-dive-2026-11-25.md |
