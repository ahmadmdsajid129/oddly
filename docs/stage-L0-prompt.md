# STAGE L0: LANES, RICHER ANSWERS, TWIN DEPTH AND TEXT ANSWERS: ANALYSIS AND DOCUMENTATION (NO CODE)

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-L0-prompt.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->



You are the coding agent for Oddly. This stage is **documentation and analysis only**. Write no application code, no migrations, no seed changes, no dependencies. Follow `rules.md` Rule 1: do this stage, update the living documents, print the Stage Report in the same format as your previous stage reports, then **STOP** and wait for the Founder to say "proceed to Stage L1".

This stage changes the shape of the whole product, so it touches **every** markdown file, from the player-facing frontend to the admin panel. It must leave the documents so complete and so consistent that the next prompt ("proceed to Stage L1") can start changing the code without asking anything.

**Pre-flight (do this first).**
1. Run `git status` and read the latest Stage Report. If any stage is mid-way or has uncommitted changes, STOP immediately and tell the Founder to run this prompt after that stage's report. Never edit the shared markdown files while another stage is in progress.
2. This stage amends documents that Stages F0 and M0 create. Check that `docs/stage-F0-report.md`, `docs/stage-M0-report.md`, `docs/connection-features.md`, `docs/admin-panel-spec.md` (with Addendum A) and `docs/meme-and-insights-features.md` exist. If any is missing, STOP and tell the Founder which prompt to run first. Do not recreate them.
3. If everything is committed, create branch `stage-L0-lanes-docs` from the current branch. Do not modify the output of any earlier stage except where this prompt says "amend". Preserve existing entries in `task.md`, `memory.md` and `architecture.md`; amendments are written as new, dated, clearly marked paragraphs, never as silent rewrites. Commit after each completed file. Tag `stage-L0-complete` at the end.

**How to read this prompt.** Section numbers are for you to cross-reference. Text in *italics with "config"* means the number is a starting guess that must live in `app_config` (Rule 11), not in code. Every number here that is not derived from a rule or from `product.md` is **unverified** and must be recorded as an assumption to test, not a fact.

---

## 0. What the Founder wants, in plain words (read this twice)

Today every player gets the same five questions and the engine finds one twin among everyone who played. The Founder has realised four problems and one opportunity:

1. **Too many identical twins.** When thousands of people answer five easy questions, hundreds will have exactly the same five answers. A single "twin" stops feeling special. The Founder is right: the questions will be fun, short-choice questions (memes, opinions, situations), not "pick a number from 1 to 50", and short-choice questions collide even more than numbers do.
2. **People like different things.** A player who loves memes should be twinned with another player who played memes. So the player **chooses a lane** (a subject), gets that lane's Drop, and is matched only with players of the **same lane**.
3. **Some of the most revealing questions need words.** Example from the Founder: a situation question such as "Someone you have been noticing walks up and starts talking to you. How do you react?" where the player **types** a reply, and the engine decides whether two replies "sound the same". If all five replies sound the same, those two are twins.
4. **Twin must mean more than one day.** One day of five answers cannot separate thousands of people. The twin that counts is built over days. This is also what makes Orbit worth keeping.
5. **Opportunity.** Lanes give Oddly many reasons to come back, many share cards, and a clean way to grow community by community (campus, meme page, gaming group) instead of everyone at once.

**The product change in one paragraph.** Oddly keeps one daily Drop clock (07:00 IST, 24 hour window, recap at 07:05) but the Drop now exists **per lane**. Within a lane the five questions are identical for every player (the old rule, narrowed). A new player with no account still goes straight into the default lane "Everyday" and plays in about 30 seconds; the lane picker appears after the first result. Questions use richer answer formats so that fewer people collide. When many players tie, the engine breaks ties by (1) how well you agree with each other over the last weeks in that lane, (2) different country, (3) a reproducible hash, and it pairs tied players **mutually** so that "your twin" also has you as their twin. The result always shows the honest group size ("5 of 5 with 312 people"). A player who is twinned in two or more lanes with the same person gets a rare **Super twin**. A few lanes have a **Say it** question where the player types a short reply, matched by meaning with a self-hosted model. Globe, Keep and Orbit, Telepathy, Anti-twin, memes and insights all become lane-aware.

**Honest constraints the Founder must see in your report (do not water these down).**
- Splitting players into lanes **shrinks each pool**. With few players a lane twin is weak. So lanes open by gates, small lanes are labelled honestly, and v1 launches with **Everyday + Memes** only. Other lanes are fully documented and seeded as "planned", not live.
- Free text matched by an algorithm is the **hardest and riskiest** part: it needs moderation, privacy handling, a multilingual (English, Hindi, Hinglish, later Gujarati) model, evaluation data that does not exist yet, and a legal review. It is documented completely but **built last, behind Gate G4**, and the "Situations" lane launches first with illustrated choice cards that carry the same scenarios.
- The "sigma or desperate" idea must not shame people or teach pressure on others. The lane is a playful "how would you react" lane. Labels describe a **style**, never a worth. See Rule L7.
- **Politics is not a lane.** It conflicts with `rules.md` (forbidden topics) and with the no-sensitive-inference rule from M0. "Hot takes" is allowed only for non-party, non-religion, non-caste topics. See Rule L6.
- Nothing here is a promise about how many players Oddly will have. All thresholds are tests.

---

## 1. Founder decisions (this message is the written approval required by `rules.md` Rule 6)

New stage prefix **L** (Lanes). Feature IDs continue after F31. Gates: product gates G0 to G3 are unchanged; this stage adds **Gate L-A** (a lane may open) and **Gate G4** (free-text answers may be built). Define both in `product.md`.

| ID | Feature | Decision | Stage |
|---|---|---|---|
| F32 | **Lanes**: player-chosen subject Drops, lane-isolated matching, lane picker, lane results, lane streak rules, lane gating, per-lane notifications | **Build in v1** with lanes **Everyday** and **Memes** open; all others seeded as `planned` | L1 |
| F33 | **Richer answer formats**: pick 1 of 2 to 4 (existing), pick 2 of 6, rank 3, 7-point slider, illustrated scenario card; matching maths per format | **Build in v1** | L2 |
| F34 | **Twin depth**: tie groups, honest group size, history tie-break, mutual pairing, deterministic tie-break, "closest so far" per lane | **Build in v1** | L3 |
| F35 | **Memes lane launch** (uses F24 meme questions from M1 as the lane's content) | **Build in v1** | L4 |
| F36 | **Situations lane** (the Founder's "sigma" idea, made safe): scenario cards first, archetype result; "Say it" version later | **Document fully; build the card version on Founder command** | L5 |
| F37 | **Say it**: short typed answers matched by meaning with a self-hosted model, archetype tagger, moderation pipeline, retention rules | **Document fully; tasks in `task.md`; build only after Gate G4** | L6 |
| F38 | **Super twin** (same person is your twin in 2 or more lanes) and **lane-aware** Globe, Keep and Orbit, Telepathy, Anti-twin | Document fully; build on command after L3 and F2 to F4 | L7 |
| F39 | **Brain lane** (knowledge questions; twin means "made the same mistakes") | **Documented only**, not scheduled | L8 |

**Lane catalogue to seed in docs (status in brackets):**

| Lane | Working name | What it asks | Status at v1 |
|---|---|---|---|
| Everyday | Everyday | Light daily choices: food, habits, small dilemmas, "would you rather" | **Open** (default, always open) |
| Memes | Memes | Meme-template questions and caption picks (F24) | **Open** |
| Gaming | Gaming | Game habits and takes (genres, playstyle, rage moments); no real brands required, no esports betting | Planned |
| Screen and Sound | Screen and Sound | Shows, films, music moods, fandom-neutral questions; no real-person judgments | Planned |
| Food and Habits | Food and Habits | Taste, routines, sleep, study and work habits | Planned |
| Hot Takes | Hot Takes | Harmless debates ("pineapple on pizza", "reply or leave on seen"); no parties, leaders, religion, caste, nationality, gender wars | Planned |
| How You Think | How You Think | Playful decision-style questions ("fast or careful", "plan or wing it"); never diagnostic | Planned |
| Situations | Situations | "What would you do" scenes, including the social scene the Founder described; archetype result | Planned (card version first) |
| Brain | Brain | Knowledge questions; twin = same wrong and right answers | Documented only |

Lanes are data (table `lanes`), not code. Adding a lane must need **no deploy** once Phase 11 is built; until then lanes are seeded and edited by seed and `app_config`.

**Execution order the Founder wants (write it into `task.md` as "Recommended execution order" and ask the Founder to confirm in your report):**

`F1 (running) → M0 → L0 (this stage) → L1 → L2 → L3 → F2 → F3 → F4 (built lane-aware) → M1 → M2 → L4 → Phase 11 admin (with Addendum A and Addendum B) → L5 → L7 → on command: M3 to M8, L6, L8`.

Reason: lane columns are cheapest to add before Globe, Keep and Orbit tables multiply. If the Founder prefers the old order, the F2 to F4 stages must add `lane_id` by expand-only migration later (state the extra cost in the report). Do not renumber existing phases; new phases are numbered **10L to 10S** and placed after 10K and before Phase 11.

Not planned (record in Non-Goals so nobody adds them by accident): a politics lane or any party, leader, religion or caste question; showing one player's typed text to another player in v1; user-uploaded images; paywalled lanes or any paid advantage in matching; per-user change of a lane's questions; ranking humans by attractiveness, status or "value"; a dating or contact feature; free text longer than 80 characters (*config*).

---

## 2. Read first (in this order)

1. `rules.md`, `AGENTS.md`, `product.md`, `architecture.md`, `design.md`, `task.md`, `memory.md`, `README.md`
2. `docs/connection-features.md`, `docs/admin-panel-spec.md` (including Addendum A), `docs/meme-and-insights-features.md`, `docs/event-dictionary.md`, `docs/capacity-model.md`, `docs/stage-F0-report.md`, `docs/stage-M0-report.md`, and the reports of any F or M stage already finished
3. Code you must analyse (read-only): the Prisma schema; the question validation engine; the polymorphic question renderer and the five existing question components; the matching engine, its scoring function, its tie-break and its provisional and final jobs; the Drop scheduler and the BullMQ queues; the share-card renderer; the Settings screen and consent toggles; the Orbit and Keep tables and routes already built by F1; `packages/shared/src/privacy.ts`; the importer; the dynamic illustration registry (D-015)

Quote the exact current wording of every rule you are about to amend in your report, so the Founder can see old text and new text side by side.

---

## 3. Absolute new rules and amendments for `rules.md` (write exact text, mark "Founder-approved, L0")

Do **not** trust the rule numbers in this prompt; find each rule by its wording and cite the number you found.

**L1. Lane Drop identity (amends the Identical Drop rule from M0 and any older "same five for everyone" wording).** Within a lane, the five questions of a Drop are identical for every player of that lane and appear in the same order. No engine, flag, experiment or personalisation may change which questions a player sees in a lane, or their order. Different lanes have different Drops. Personalisation applies only to non-Drop surfaces (the order of lane cards on the picker, notification timing, optional meme card, Orbit prompts).

**L2. Lane isolation.** A twin, anti-twin, Globe arc, Orbit candidate or Telepathy partner always belongs to exactly one lane, and the lane is always shown. The only cross-lane object is the **Super twin** (F38), which names its lanes explicitly. Never merge answers from different lanes into one score except for the Super twin and the lane-history tie-break described in F34.

**L3. Lane honesty.** A lane's status is real: `planned`, `preview` (open with an "Early lane" label), `open`, `resting` (today's Drop missing or paused). Never display a lane as popular, never show a player count the system did not measure, never fill a lane with fake players. Under *config* 200 players in the lane that day, results say "Closest so far". "Coming soon" tiles show no counts.

**L4. Tie honesty.** The tie group size shown to a player is the real count. Never claim a unique twin when the group is larger than one. The copy is "N of 5 with M people. Meet one of them." Show exact counts below 1,000 and "1,000+" above (*config*). Respect k-anonymity: a group smaller than the minimum shown count is described as "a few others".

**L5. Free-text answers (extends and does not replace the M0 free-text exception).** Typed answers are allowed only (a) in a lane whose `text_enabled` flag is on, (b) for a question whose format is `say_it`, (c) up to 80 characters (*config*), (d) after the player has seen a plain-words notice that the text is only compared by a machine and is never shown to other players, (e) after moderation and personal-data screening, (f) with the raw text deleted after *config* 7 days from the Drop's finalisation, keeping only the derived embedding and archetype for the history window (*config* 28 days) and then deleting those too, (g) never sent to any third-party service in v1, (h) never used to train any model without a separate, withdrawable consent that does not exist yet, (i) never written to logs, error reports or analytics events, (j) deleted with the account. Mark this rule "inactive until Gate G4 passes", like the M0 Meme Lab exception. The 140 character report note and the Meme Lab caption exception from M0 stay as written.

**L6. Forbidden topics stay forbidden in every lane and every format.** Politics (parties, leaders, elections, policies), religion, caste, sexuality, health, mental state, body image, income, real named people and brands as targets of judgement are not allowed in questions, options, scenario texts, archetype labels, tags, alt text or free-text prompts. "Hot Takes" may only use harmless topics. An automated test must fail the build when any seeded question, option, tag or archetype label matches the forbidden list. Free-text replies are screened for the same topics only for moderation, never to build a profile.

**L7. Situations lane safety.** (a) Scenes are written without assuming anyone's gender or orientation and never ask a player's. (b) No scene frames continuing to approach someone after a refusal, following, pressuring, or "winning" a person. (c) Archetype results describe a **style of reacting** with playful, kind names; labels such as "desperate", "loser", "simp" or any ranking of worth are **not allowed** as result labels, tags or share-card text. (d) No result may be displayed as better or worse than another. (e) The lane is not a dating feature and shows no contact path. (f) 18+ only, as everywhere. (g) Editors must tick a scenario safety checklist in admin; the lane cannot open without it.

**L8. Lane parity.** Lanes cannot be paywalled and no paid feature may change who matches whom. Premium (M8) stays limited to history archive, streak freezes and card themes.

**L9. No lane without a Drop.** If a lane has no valid, approved Drop for today, the lane shows "Resting today" with a kind message and a link to another lane. The system never reuses yesterday's Drop silently and never shows an unvalidated Drop. An alert goes to admin at least 24 hours before a lane would run out (*config*).

**L10. First-run promise.** A new visitor reaches the first question of the Everyday lane with no account, no lane choice and no extra screen, as today. The lane picker is offered after the first result.

**L11. Lane choice is the player's own.** A player may play any open lane, one or more per day. Streaks count a day if at least one lane Drop was completed (v1). Lane-specific streaks are documented for v1.5, not built.

Also amend: Rule 9 reminder (a self-hosted embedding model and vector index are new dependencies; document failure modes first), the privacy rule from M0 (lane history signature uses answers the player gave for the matching purpose; disclose it in the privacy notice and give a Settings switch "Use my past answers to find closer twins", default ON as part of the core service, *Founder to confirm*), and the Non-Goals section.

---

## 4. Feature specifications

Write into `product.md` as section **"11C. Lanes, Twin Depth and Text Answers, F32 to F39"**. For each feature give: purpose, player journey (step by step), exact copy keys (all text from `app_content`, Rule 11), states and edge cases, privacy rules, data, degradation behaviour, feature flag, success metric, and what is explicitly out of scope. Update the core-loop section of `product.md` so that it describes lanes.

### F32 Lanes (v1, Stage L1)

**Purpose.** Let people pick the subject they enjoy and be twinned with people who chose the same one, while keeping the 30 second loop and the no-login first run.

**Journey.**
1. First visit: age check as today, then straight into the **Everyday** Drop. No lane screen. (Rule L10.)
2. After the first result: a "Try another lane" card with the open lanes, plus "Coming soon" tiles for planned lanes with a **"Tell me when it opens"** button (needs the notification consent; stores only an aggregate interest count plus the player's own opt-in).
3. Returning visit: the home screen shows today's lane cards: lane name, accent token, icon, status chip (Open, Early lane, Resting, Played, Closed), time left, and a "Last played" hint. The last played lane is first. Order is the only personalised element (Rule L1).
4. Player taps a lane, sees its Drop (five questions, one at a time, same Sticker pop components), submits, and gets **that lane's** instant twin, oddness tier and share card. The result page shows a lane chip and a "Play another lane" row.
5. Recap at 07:05 the next morning is per lane; one push can cover several lanes (max 2 pushes per day total, existing rule).
6. Streak: a day counts when at least one lane Drop is completed (Rule L11). Streak milestones are unchanged. Lane-specific streaks are documented only.

**Rules of behaviour.**
- One Drop per lane per date: unique (`lane_id`, `drop_date`). A player can complete each lane once per Drop.
- The Drop clock is shared: all lanes open at 07:00 IST and close after 24 hours. Do not stagger in v1 (the 07:00 spike already has a capacity model; lanes must not multiply hot-path work: the submit path stays one write per lane Drop).
- Lane status is controlled by `lanes.status` and gate logic. **Gate L-A** (a lane may be `open`): Founder approval **and** at least *config* 8 approved Drops queued **and** moderation/safety checklist done. A lane below *config* 500 daily lane players is shown as "Early lane". Below *config* 200 the result says "Closest so far" (Rule L3). A lane with no approved Drop for today is `resting` (Rule L9).
- Notifications per lane are opt-in, default off except Everyday; the 2 per day cap and quiet hours apply across lanes.
- Guests may play any open lane; guest history is per lane and merges on sign-in as today.
- Share cards carry the lane chip and lane accent; challenge links ("Beat my match") carry the lane; a friend opening a challenge for a lane they have not played goes straight into that lane's Drop.
- Deleting a lane is never allowed once it has Drops; retire it (`status = retired`).

**Edge cases to document.** Lane retires while a player has a pending Orbit in it; player changes device mid-Drop; player plays the same lane on two devices; time zone display; lane with 4 questions approved but a fifth failing validation (the lane rests, never serves a partial Drop); lane renamed after share cards exist.

**Success metrics.** Share of first-session players who play a second lane; lane completion rate; D1 return per lane; share rate per lane; percentage of lane Drops that end "Closest so far".

### F33 Richer answer formats (v1, Stage L2)

Add these formats to the polymorphic question renderer and the validation engine, **keeping every existing format working unchanged** (regression tests must prove old scores are identical). The legacy formats (number 1 to 50, colour, picture, mood) stay available but are used **only** in the Everyday lane and only as a minority (*config*: at most 2 of 5).

| Format key | Player action | Outcomes | Similarity s (0 to 1) | Notes |
|---|---|---|---|---|
| `pick1` | Tap 1 of 2 to 4 options | 2 to 4 | 1 if equal else 0 | existing behaviour |
| `pick2of6` | Tap exactly 2 of 6 options | 15 | Jaccard: size of shared ÷ size of union (so 0, 1/3, 1) | good for taste |
| `rank3` | Drag or tap 3 items into order | 6 | 1 minus (Kendall distance ÷ 3) | provide tap-to-order for accessibility |
| `slider7` | Choose 1 to 7 on a labelled spectrum | 7 | 1 minus (absolute difference ÷ 6) | endpoints labelled with words, no numbers shown as "scores" |
| `scene` | Pick 1 of 3 to 5 illustrated reaction cards | 3 to 5 | as `pick1` | used by Situations (F36) |
| `say_it` | Type up to 80 characters | open | semantic similarity, see F37 | Gate G4; documented only until then |

**Matching maths to specify precisely (write into `architecture.md` section "Matching" and `docs/lanes-and-matching.md`).**
- Keep the existing overall form: similarity of two players for a Drop is the weighted mean of per-question similarities, weights from the information of the answer, `I(a) = log2(1/p(a))`, using that day's real answer frequencies. Extend `p(a)` to each format: for `pick2of6` and `rank3` use the frequency of the exact set or ordering when the sample is at least *config* 30, otherwise a smoothed estimate from item frequencies; for `slider7` use a smoothed frequency of the chosen point and its neighbours.
- Per-question weights must be capped (*config*) so one extremely rare answer cannot decide the match.
- A player who skips or fails moderation on a question gets weight 0 for it; their match is computed on the rest, and the result says how many questions were compared.
- State the minimum questions compared for a match to be shown (*config* 3 of 5).
- Show a worked numeric example for each format and add property tests: symmetry, bounds 0 to 1, identical answers give 1, monotonicity.
- **Entropy planning.** For every format record the number of outcomes and an estimate of the **effective** outcomes after popularity skew. The Question quality panel (admin) must show an expected "tie risk" per question and per Drop before approval (Addendum B).
- Provide guidance for editors: a Drop in a non-Everyday lane should have at least 3 of 5 questions in formats with 6 or more outcomes (*config*) when the lane expects more than 5,000 daily players.

**Design.** Components for each format using existing tokens only (see section 8). Keyboard, screen-reader and reduced-motion behaviour for drag-to-rank must be specified; tap-to-order is the default on small screens.

### F34 Twin depth (v1, Stage L3)

**Purpose.** Make "twin" meaningful when many players tie, and make it mutual.

**Definitions.**
- **Tie group.** For a player P in a lane Drop, the candidates whose similarity to P is within *config* 0.01 of P's best similarity. Its real size is T.
- **Top neighbour list.** For every player the engine keeps at most *config* K=32 best candidates (never the full group), so the work is bounded.

**Selection order for the final twin** (provisional uses the same logic over players so far):
1. Highest similarity (existing).
2. **History tie-break.** Among the tie group, prefer the candidate with the highest **lane history agreement** with P: the information-weighted similarity of both players' answers on the days both played this lane in the last *config* 28 days, requiring at least *config* 5 shared days; below that the history term is 0. Only players with a stable player ID are eligible; players who switched off "Use my past answers to find closer twins" are treated as having no history. Computation is bounded: use a compact per-player, per-lane **history signature** updated by a daily job (propose the design in an ADR, for example a small fixed-length signature of answer-rarity-weighted choices) and compare signatures only inside tie groups.
3. **Different country** preferred (existing preference, kept).
4. **Deterministic hash**: a reproducible tiebreak seeded by `drop_id` and the two player IDs, so any result can be audited and re-run.

**Mutual pairing.** After selection, the final job builds pairs inside each tie region: sort candidate edges by (similarity, history, different-country, hash), then greedily pair players so that each player is the twin of the player they are paired with. Leftover players (odd count) keep their best available twin and are marked `is_mutual = false`. Never pair a player with themselves, with another account on the same device or network pattern the existing anti-self rules already block, or with a player who has blocked them. Write the algorithm, its complexity (it must be about O(N × K)), its determinism and its behaviour at Stage A, B and C scale (brute force, hash buckets, approximate nearest neighbour) per lane.

**What the player sees.**
- "4 of 5 with a person in Lagos, 18 to 24. **312 people** matched you this way." Copy per group size band; never "your one and only twin".
- If T = 1: "You and this person were the only ones who answered like this today."
- If the lane is small: "Closest so far."
- After the final result, an optional "Why you two?" line: the questions where you and your twin agreed on a **rare** answer (rarest first), no answers shown unless the Rule 4 exceptions apply.

**Privacy.** The history signature is a compact numeric summary, not the answers; it is deleted with the account and rebuilt from nothing if the switch is turned off then on. Document purpose, lawful basis and retention.

**Data produced** (`twin_results` gains: `lane_id`, `tie_group_size`, `is_mutual`, `tie_break_reason` (`similarity`, `history`, `country`, `hash`), `questions_compared`, `history_days`). Admin must be able to see the distribution (Addendum B5) but never the individual players' identities from it.

**Success metrics.** Median and p90 tie group size per lane per day; share of results with `is_mutual`; share decided by history; D7 return of players whose twin was decided by history versus by hash (as a cohort comparison, not a causal claim).

### F35 Memes lane launch (v1, Stage L4)

The Memes lane is the first lane that is not Everyday. It consumes F24 meme questions (tags, templates, captions). Each Memes Drop mixes `pick1` caption picks with `pick2of6` and `slider7` ("how funny is this to you") formats. Meme Lab (F26) later feeds this lane only. Document how F24 and F35 differ: F24 is the **question type**; F35 is the **lane**. Meme questions may also appear in Everyday as a minority (*config*: at most 1 of 5). Tags remain neutral and pass the forbidden-topics test.

### F36 Situations lane (document fully; card version on command, Stage L5)

**Purpose.** The Founder's idea: scenes where a player's reaction shows their style, for example "Someone you have been noticing walks up and starts talking to you", "Your friend cancels at the last minute", "You see your ex-colleague at a wedding" (editors write more; never a real named person).

**Version 1 (cards).** Each question is an illustrated scene with 3 to 5 reaction cards (format `scene`). Every card maps to a **style tag** from a closed list of 6 to 8 neutral styles (*config*; examples: Calm, Playful, Shy, Bold, Guarded, Over-the-moon, Deflecting, Curious). A player's result shows their dominant style as a kind label ("Your style today: Playful") and the twin is matched on the cards chosen, exactly like `pick1`. Style names are editable by admin but must pass the forbidden-topics test and Rule L7.

**Version 2 (Say it).** The same scenes with a typed reply (F37). Cards stay as an option for players who prefer not to type. A player never has to type.

**Safety, in addition to Rule L7.** Scenarios are reviewed with a checklist (no gender or orientation assumptions, no pressure on others, no humiliation, no real people, no sexual content, no alcohol or drug glorification). The share card for this lane shows the style label and a playful illustration, never a ranking or a percentage of "attractiveness" or "confidence". The Insights engine (F27) must not aggregate this lane into anything that looks like a personality or mental-health inference (Rule 3 of M0).

### F37 Say it: typed answers matched by meaning (documented fully; build only after Gate G4, Stage L6)

**Purpose.** Let some questions be answered in a player's own words and still produce a twin.

**Player journey.** The question shows a scene or prompt and a text box (counter to 80 characters, placeholder in the lane's language, "Nobody else will read this. We only compare how replies sound." notice). The player submits. The five-question Drop can include at most *config* 2 `say_it` questions. If processing is not finished when the player finishes the Drop, the result is computed without that question and **improves** when processing completes (the existing provisional-to-final logic); the screen says so plainly.

**Pipeline (specify as a diagram in `architecture.md`).**
1. **Normalise**: trim, collapse whitespace, Unicode normalise, lowercase Latin letters, keep emoji (they carry meaning), detect script and language (English, Hindi in Devanagari, Hinglish in Latin letters; Gujarati later).
2. **Screen**: reject URLs, phone numbers, email addresses, social handles and other personal data (never store the match; store only "rejected: personal data"); run the lexical filters for abuse and forbidden topics (English, Hindi, Hinglish blocklists maintained in admin); anything ambiguous goes to `held` and is **excluded from matching**. A rejected or held answer is treated as skipped for that question (weight 0); the player is told kindly ("That one can't be used. Try saying it another way.") and may resubmit once within the Drop window. Three rejections in a day disable text for 7 days (*config*) without banning play.
3. **Embed** in a BullMQ worker with a **self-hosted multilingual sentence-embedding model** (propose and compare candidates, for example a small multilingual E5 or MiniLM-class model run through ONNX on CPU; record size, language coverage, licence, latency and memory; **do not** assume numbers, measure them in analysis). No third-party API receives player text in v1 (Rule L5(g)).
4. **Tag**: assign an **archetype** from the lane's closed list using nearest centroid over a few labelled example replies per archetype (explainable, editable in admin). Store the archetype and its confidence. Low confidence means "unclassified" and counts only through embedding similarity.
5. **Similarity**: `s = a × [same archetype] + (1 − a) × calibrate(cosine)` where `a` is *config* (start at 0.5; the analysis proposes how to set it) and `calibrate` maps cosine into 0 to 1 using the lane's background similarity distribution measured on real data (so two unrelated replies score near 0, and "I laugh and say hi" versus "I smile and say hello" score high). Weight each text question by **local rarity**: the share of that day's replies that are within the similarity threshold of this one. Common phrasing counts less, unusual shared phrasing counts more.
6. **Search**: neighbour search over embeddings per lane per question. Propose pgvector (if the managed Postgres allows the extension) or an in-memory HNSW index in the matcher worker, with an ADR comparing cost, recovery after restart and determinism. Below *config* 10,000 daily lane players brute force is acceptable.
7. **Retention**: raw text deleted after *config* 7 days (Rule L5(f)); embedding and archetype kept for the history window then deleted; everything deleted with the account.

**Abuse cases to analyse and control.** Copying a famous phrase to match many people (rarity weighting reduces it; also detect high duplicate counts); bots flooding text; players pasting identical replies across accounts; prompt-like injection (not relevant because no generative model reads the text, state this); hate or harassment in text (screening plus report path); personal data pasted (rejected); players trying to learn others' answers by probing (answers are never shown); GDPR-style and DPDP deletion requests (embedding deletion proof).

**Gate G4 (all must be true before any code):** (1) Founder approval in writing; (2) the admin text moderation queue and archetype manager exist (Phase 11 items B6); (3) a labelled evaluation set of at least *config* 300 reply pairs rated "sounds alike" or not by the Founder and trusted testers, with the embedding-plus-archetype similarity agreeing with humans at least *config* 80 percent, and the archetype tagger reaching at least *config* 0.75 macro-F1 on at least *config* 200 labelled replies; (4) the lawyer review of the notice and retention; (5) a load test showing the embedding queue keeps up at 10 times expected volume without touching the submit path. If any item fails, text stays off and the lane stays on cards.

**Honest limit to state in the docs.** Meaning-similarity models match **topic and wording more reliably than tone or attitude**. Two replies can sound alike to a model and feel different to a human. This is why the archetype layer exists and why Version 1 of Situations uses cards. Record this as an accepted risk with the evaluation plan.

### F38 Super twin and lane-aware connection features (document fully; build on command, Stage L7)

- **Super twin.** For a player who completed two or more lanes the same day: candidates are players who completed the same lanes. A candidate is a Super twin when they are the player's selected twin in at least *config* 2 lanes that day, or when their per-lane similarity is at least *config* 0.8 in at least 2 lanes. Show only real results; the copy names the lanes ("Twins in Memes and Everyday"). A distinct card face, no new colours. Counted in streak and share logic like a normal result. It is rare by construction; do not promise frequency.
- **Globe.** Arcs belong to a lane; the Globe has lane chips (Everyday default). A lane below the minimum event count hides its arcs and shows the honest replay or empty state. Lane-filtered counts obey k-anonymity.
- **Keep and Orbit.** A Keep request is per lane Drop (still one Keep per Drop per player). An Orbit is tagged with its lane. An Orbit may later show Sync by subject (F28) using the lane as the primary subject dimension. Player-level cap on active Orbits is unchanged; document how lane tags interact with the cap.
- **Telepathy.** Works in any lane for questions with 4 or fewer options (`pick1`, `scene`).
- **Anti-twin.** Computed within the lane, from the same bounded sample.
- **Meme Lab and Insights.** Aggregates gain a lane dimension; minimum group size 20 still applies.

### F39 Brain lane (documented only, Stage L8)

Knowledge questions have right answers, so matching is different: similarity over **right and wrong answers together** (twins made the same mistakes and got the same ones right). Document the idea, the fairness issue (a player who looks the answer up), the anti-cheat measures (time limits, no results before close), the copyright rules for sources, and why it is not scheduled.

---

## 5. Data model proposal

Write into `architecture.md` (new section "Lanes and Twin Depth", and update the data model, ER description and Prisma plan). All migrations are **expand-only** (Rule 6.8): add columns nullable, backfill, then enforce. State the exact migration order and a rollback for each.

**New tables**
- `lanes`: `id`, `slug` (unique), `name_key` and `description_key` (copy keys), `accent_token` (one of the existing palette tokens, no new colours), `icon_key` (illustration registry), `status` (`planned`, `preview`, `open`, `resting`, `retired`), `sort_order`, `age_rating`, `locale_set`, `formats_allowed` (array), `text_enabled` (bool), `super_twin_enabled`, `gate_notes`, `opened_at`, `created_at`.
- `lane_interest`: `id`, `lane_id`, `player_id` or `guest_id`, `created_at` (only when the player pressed "Tell me when it opens"; aggregate counts in admin).
- `player_lane_prefs`: `player_id`, `lane_id`, `notify` (bool), `last_played_at`, `plays_count`.
- `lane_history_signature`: `player_id`, `lane_id`, `window_end`, `days_counted`, `signature` (bytes), `model_version`. Deleted on account deletion and when the Settings switch is turned off.
- `answer_text` (documented now, created in Stage L6 only): `answer_id`, `lang`, `moderation_status` (`ok`, `held`, `rejected_pii`, `rejected_abuse`), `raw_text` (nullable, purged after retention), `embedding` (vector or bytes, 384 or model-specific dimension), `embedding_model_version`, `archetype_id`, `archetype_confidence`, `purge_raw_at`, `purge_all_at`.
- `text_archetypes`: `id`, `lane_id`, `question_scope` (lane level or specific question), `key`, `label_key`, `description_key`, `centroid` (vector), `example_replies` (small, editor-written, never player text), `version`, `status`.
- `style_tags` (Situations cards): `id`, `lane_id`, `key`, `label_key`, mapping from card option to tag lives on the option record.
- `super_twin_results`: `id`, `player_id`, `partner_player_id`, `drop_date`, `lanes` (array), `score`, `created_at`.

**Changed tables**
- `drops`: add `lane_id`, unique (`lane_id`, `drop_date`); backfill every existing Drop to the Everyday lane.
- `questions`: add `lane_id`, `format` (`pick1`, `pick2of6`, `rank3`, `slider7`, `scene`, `say_it`, plus legacy keys), `options` (jsonb per format schema), `subject_tags`, `scene_asset_key`, `entropy_estimate`, `tie_risk_estimate`.
- `submissions` and `answers`: add `lane_id` (denormalised for fast aggregation), widen the answer payload to carry sets, rankings, slider values and (L6) a reference to `answer_text`.
- `twin_results`, `oddness_results`, `anti_twin_results`: add `lane_id`; `twin_results` gains `tie_group_size`, `is_mutual`, `tie_break_reason`, `questions_compared`, `history_days`.
- `twin_keeps`, `orbits`, `orbit_expressions`, `telepathy_guesses`: add `lane_id`; an Orbit inherits the lane of the Keep that created it.
- Globe events table or cache keys: add `lane_id`.
- `events_raw`, `question_stats_daily`, `tag_stats_daily`: add `lane_id` (dimension).
- `app_config` and `app_content`: new keys listed in section 9. No hard-coded copy.

**Redis keys**: per-lane live counters (players today, answered in last 10 minutes), per-lane Drop cache, per-lane top-neighbour working sets with TTL. Define key names, TTLs and eviction behaviour.

**Backfill and continuity.** All existing players, answers, streaks, history, twin results, keeps and orbits map to the Everyday lane with no loss and no visible change. Write the backfill as an idempotent, resumable job with row-count verification, and the user-facing behaviour while it runs (reads use the old path). Challenge links and share cards created before the change must keep working and open Everyday.

**Prisma plan and indexes.** List new indexes: (`lane_id`, `drop_date`) on drops; (`lane_id`, `drop_id`) on submissions; the tie-group lookup path; partial indexes for `status = open`. Give estimated row growth at 10,000, 100,000 and 10 lakh daily players with 1, 2 and 4 lanes played per player per day.

---

## 6. API outline and per-route policy rows (Rule 6.1)

Add rows to the per-route policy table (auth, rate limit, cache, idempotency, degradation level at which it sheds). Proposed routes, to be confirmed by your analysis:

| Route | Purpose | Notes |
|---|---|---|
| `GET /v1/lanes` | List lanes with status, accent, time left, player's last played and played-today flags | cacheable 60 s (*config*) for guests; personalised flags merged client-side or by a thin authenticated call |
| `GET /v1/drops/today?lane=slug` | Today's Drop for a lane | existing signed and cached path with lane in the key; honours Rule L9 (`resting`) |
| `POST /v1/answers` | Submit a lane Drop | existing idempotent path; payload carries `lane`, formats, and for `say_it` a text field (L6); the hot path stays one write |
| `GET /v1/results/:dropId` | Lane result: twin, group size, tier | adds `lane`, `tie_group_size`, `questions_compared`, `is_mutual` |
| `POST /v1/lane-interest` | "Tell me when it opens" | needs notification consent; idempotent |
| `PUT /v1/me/lane-prefs` | Notifications per lane, history switch | audit-logged |
| `GET /v1/me/super-twin` (L7) | Super twin for a date | k-anonymity and Rule 4 apply |
| `GET /v1/globe?lane=slug` (F2 onward) | Lane-filtered arcs | existing delay and region rules |
| `/v1/orbits`, `/v1/keeps` | Existing, lane-tagged | no new behaviour beyond lane |
| `POST /v1/answers/:id/text` (L6, if text is submitted separately) | Typed reply | rate limited hard; never logged; returns `accepted`, `held`, `rejected` only |

Admin routes are listed in Addendum B (section 7). Add to the degradation table: at degradation level L2 or worse the lane picker shows only Everyday and the previously played lane; Super twin, history tie-break and text processing are shed first; the submit path is never shed.

**Events (add to `docs/event-dictionary.md`)**, all subject to consent and never containing text: `lane_viewed`, `lane_selected`, `lane_switched`, `lane_interest_tapped`, `lane_resting_seen`, `format_interacted` (format, duration bucket), `rank_reordered_count`, `slider_moved_count`, `text_started` (no content), `text_submitted` (length bucket only), `text_rejected` (reason class), `tie_group_seen` (size band), `why_you_two_opened`, `super_twin_seen`.

---

## 7. Admin panel: extend the spec (Phase 11 must build these)

1. **Do not rewrite `docs/admin-panel-spec.md`.** Add "lane-aware" notes inside the existing sections and append a clearly marked **"Addendum B: Lanes, Formats, Twin Depth and Text Answers"**. Tag each section P1, P2 or P3 like the original spec.

**Existing sections to annotate (one short paragraph each, not rewrites):** Command Center (per-lane tiles and a lane switcher); Live Ops (per-lane live counts, per-lane drop status); Users (lane preferences, history-switch state, no answers shown); Questions and Drops (lane column, format column, per-lane calendar); Matching/Globe/Orbit/Anti-twin ops (lane filter on every panel); Share cards (lane chip, per-lane template preview); Notifications (per-lane content and caps); Moderation (reports carry lane); Config and flags (per-lane overrides); Analytics (lane dimension, k-anonymity); System health (embedding queue and matcher lag per lane); Privacy (history signature and text retention runs, deletion proof); Audit log (new action types); Data model and API outline (section 5 and 6 additions); Build order (below); Acceptance checklist.

**Addendum B sections**
- **B1 Lanes manager [P1]**: create, edit, preview as a player, set status (`planned`, `preview`, `open`, `resting`, `retired`), colour token and icon from registry only, description and copy keys, allowed formats, `text_enabled`, Super twin switch, order on the picker, Gate L-A checklist with gate progress (approved Drops queued, safety checklist, Founder approval), "Tell me when it opens" interest count (aggregate only, with k-anonymity).
- **B2 Lane Drop planner [P1]**: per-lane calendar with Drops by state (draft, review, approved, scheduled, live), **missing-Drop alerts** ahead of Rule L9, bulk import with a `lane` column, two-person approval as today, "pull a question" per lane with the Drop-resting behaviour, copy a Drop to another lane as a draft only.
- **B3 Format editor and entropy estimator [P1]**: editors for `pick1`, `pick2of6`, `rank3`, `slider7`, `scene` (and `say_it` once enabled); live preview in the player components; shows **outcomes, estimated effective outcomes and tie risk** per question and for the whole Drop, using the lane's recent answer frequencies when available and a documented default when not; warns when a Drop in a lane expecting more than 5,000 daily players has fewer than 3 high-entropy questions (*config*).
- **B4 Automatic checks, extended [P1]**: the existing eight automatic checks plus: lane present and open for scheduling; format valid; option counts within limits; forbidden-topics scan over options, scene text, alt text, style tags and archetype labels (Rule L6); Situations scenario safety checklist ticked (Rule L7); translation completeness for the lane's locale set; entropy and tie-risk thresholds; a Memes-lane check that the template is licensed.
- **B5 Matching and tie dashboard [P1 basics, P2 drill-down]**: per lane per day: players, similarity distribution, **tie group size** median, p90 and max, share mutual, share decided by history, share "Closest so far", questions-compared distribution, Super twin counts (L7), jobs lag. Group-level only; no player identities (Rule 4 of M0).
- **B6 Text answers operations [P2, required before L6]**: moderation queue (held answers with reason class and PII hits), **raw text visible only to the Moderator role, only after entering a reason, every view audit-logged**; blocklist manager for English, Hindi, Hinglish (and Gujarati later); archetype manager (labels, descriptions, editor-written example replies, version history, centroid rebuild, dry-run on the evaluation set); evaluation viewer for the Gate G4 tests; strike and 7 day text-disable list; retention purge status and deletion proof; per-lane text kill switch.
- **B7 Lane health [P1]**: per lane daily players, completion rate, D1 and D7 return, share rate, average time, abandonment by question, share of Drops with thin data, with group-level thresholds; the lane gate view that shows whether a lane meets *config* thresholds to change status.
- **B8 Per-lane notifications [P2]**: content per lane, caps shown across lanes, preview, send log.
- **B9 Lane config and flags [P1]**: tie epsilon, neighbour limit K, history window and minimum shared days, "Early lane" and "Closest so far" thresholds, mutual pairing on or off, history tie-break on or off, Super twin on or off, text on or off, similarity mix `a`, per-question weight cap, minimum questions compared. Every change audit-logged with before and after values and a one-click revert.
- **B10 Roles and permissions**: Editor can be **assigned to lanes** and only edits those; Reviewer approves; Moderator sees held text with reason; Admin changes lane status; **Founder only** can open a lane and activate Gate L-A and G4 items. Add to the roles table.
- **B11 Data-model additions, admin API additions, B12 acceptance checklist**: privacy, audit and k-anonymity of every breakdown; no panel shows player text or answers except the audited moderator view; every config change is revertible.

2. **Tasks.** In `task.md` Phase 11 keep all existing tasks (including P11.01 to P11.32) and add: **P11.33** Lanes manager and gate view (B1, P1); **P11.34** Lane Drop planner and missing-Drop alerts (B2, P1); **P11.35** Format editor and entropy estimator (B3, P1); **P11.36** Automatic checks extension (B4, P1); **P11.37** Matching and tie dashboard (B5, P1/P2); **P11.38** Lane health and gate progress (B7, P1); **P11.39** Lane config and flags (B9, P1); **P11.40** Lane roles and scoped permissions (B10, P1); **P11.41** Per-lane notifications (B8, P2); **P11.42** Text moderation queue and blocklists (B6, P2, deferred until G4 is commanded); **P11.43** Archetype manager and evaluation viewer (B6, P2, deferred until G4); **P11.44** Lane-aware annotations across existing panels (P1); **P11.45** Lane retention and deletion proof views (P2); **P11.46** Addendum B acceptance run (P1). Update the Stage 11 checklist and the acceptance list. Keep the reminder that Phase 11 starts by reading `docs/admin-panel-spec.md` in full, now including Addenda A and B.
3. In your report list every mismatch you find between the new addenda and tasks already in Phase 11, and propose the resolution.

---

## 8. Design requirements (add to `design.md` as section 12C; existing tokens, radii, shadows and fonts only; no new colours)

Specify layout, all states, copy keys, 44px targets, focus rings, keyboard and screen-reader behaviour, and reduced-motion fallbacks for each:

1. **Lane picker** (home): lane card in Sticker pop (name, accent from the token set, icon from the registry, status chip, time left, played tick), "Coming soon" tile and its "Tell me when it opens" button, ordering, loading and empty states.
2. **Lane chip** used on result, share card, challenge link, Globe filter, Orbit header.
3. **Format components**: `pick2of6` (selected count, disabled third pick, clear), `rank3` (tap-to-order and drag, with an accessible alternative), `slider7` (labelled endpoints, keyboard arrows, no numbers displayed as scores), `scene` card (illustration, caption, selected state).
4. **Say it composer** (documented now): idle, typing with counter, over limit, personal data rejected, held or rejected kind message, processing "improves when ready", submitted. The privacy notice as an inline note, not a modal.
5. **Result changes**: tie group size line for each size band, "Closest so far" per lane, "Why you two?" row, questions-compared note, `is_mutual` is never shown as a word to the player.
6. **Super twin card face** and its flip anatomy (front, back) using the existing flip card, tokens and Satori constraints.
7. **Situations style label** card and share card (no rank, no percent).
8. **Globe lane chips** and **Orbit lane tag**.
9. **Resting lane** and **early lane** states with kind copy.
10. **Admin** screens are specified in the admin spec, not in `design.md`, except shared components you reuse.

Also confirm the bundle plan: lane picker and format components must not push the play-route initial bundle past the approved exception (159.5 KB); lazy-load rank, slider and Say it components and the lane picker's non-default lanes, and keep Everyday's `pick1` path as it is.

---

## 9. New config and copy keys to list (Rule 11)

Write the full list with default values into `architecture.md` and `docs/lanes-and-matching.md`:
`lane.closest_so_far_below`, `lane.early_below`, `lane.min_approved_drops_to_open`, `lane.missing_drop_alert_hours`, `lane.max_legacy_formats_in_everyday`, `lane.min_high_entropy_questions`, `lane.expected_players_threshold_for_entropy_rule`, `match.tie_epsilon`, `match.neighbour_limit_k`, `match.history_window_days`, `match.history_min_shared_days`, `match.weight_cap`, `match.min_questions_compared`, `match.mutual_pairing_enabled`, `match.history_tiebreak_enabled`, `match.group_size_display_cap`, `super.min_lanes`, `super.min_similarity`, `text.max_chars`, `text.max_questions_per_drop`, `text.raw_retention_days`, `text.history_retention_days`, `text.rejection_limit_per_day`, `text.disable_days`, `text.archetype_weight_a`, `text.min_confidence`, plus the copy keys for every string in sections 4 and 8 (lane names and descriptions, status chips, picker copy, tie-group copy by band, "Closest so far" variants, resting copy, Say it notice and errors, style labels, Super twin copy, consent and Settings copy).

---

## 10. Stage plan to write into `task.md`

Add phases **10L to 10S** after Phase 10K and before Phase 11, without renumbering anything. Use IDs (`P10L.01` and so on), priority, dependencies, `TODO` status, notes; recompute the dashboard counts; add Stage Checklists to section 4 and Change Log rows. Also add the "Recommended execution order" block from section 1.

| Phase | Stage | Gate to start | Contents (expand into tasks) |
|---|---|---|---|
| 10L Lanes plumbing | L1 | After F1 and M0 and L0 are committed; before F2 | `lanes` migration, backfill to Everyday, `lane_id` columns, per-lane Drop scheduling and the 07:00 job per lane, lane-keyed Redis and caches, `GET /v1/lanes`, lane picker UI, lane chip, result and share-card lane chip, challenge link lane, per-lane push opt-in, `lane_interest`, Gate L-A logic, `resting` behaviour, seeds for the nine lanes (two open), regression suite proving Everyday behaves identically to before, capacity re-test, docs |
| 10M Formats | L2 | After L1 | `pick2of6`, `rank3`, `slider7`, `scene` in the renderer and validation, per-format similarity functions and information weights with property tests, importer format, entropy and tie-risk estimators (library code only), a11y and bundle checks, 12 sample questions per format in a seed batch, docs |
| 10N Twin depth | L3 | After L2 | Tie groups, neighbour list, history signature job, tie-break order, mutual pairing, group-size copy, "Why you two?" line, `twin_results` columns, determinism and idempotency tests, synthetic tie-size simulation (labelled test data), scale test at Stage A and B, docs |
| 10O Memes lane | L4 | After M1 and L3 | Memes lane content flow, mixed-format Memes Drops, lane-aware meme card, Telepathy in Memes, seed batch, tests |
| 10P Situations (cards) | L5 | Founder command, after Phase 11 safety checklist | `scene` Drops, style tags, style result and share card, safety checklist enforcement, seed batch of scenes written to Rule L7, tests |
| 10Q Say it | L6 | **Gate G4** and Founder command | Moderation and screening pipeline, embedding worker, archetype tagger, calibration, neighbour search, retention jobs, composer UI, admin B6 hooks, evaluation harness, abuse tests, load test, docs |
| 10R Super twin and lane-aware connection | L7 | Founder command, after L3 and F2 to F4 | Super twin computation and card, Globe lane chips, Orbit lane tag and Sync by subject by lane, Telepathy and Anti-twin per lane |
| 10S Brain lane (documented) | L8 | Not scheduled | Format, right and wrong answer matching, anti-cheat, source rules |

Each stage: tests for every formula and state transition, Playwright journeys, bundle and axe checks, `pnpm typecheck`, `pnpm lint`, `pnpm test` green, docs updated, Stage Report, STOP.

---

## 11. Analysis you must perform and report

1. **Conflicts.** List every conflict between F32 to F39 and `rules.md`, `AGENTS.md`, the product Non-Goals, `architecture.md`, `design.md`, the F0 and M0 documents and the existing admin spec, and how the rules in section 3 resolve each. Specifically check: the old and M0 versions of the identical-Drop rule; Rule 4 (no pick shown); the forbidden-topics list versus Hot Takes and Situations; the M0 no-sensitive-inference rule versus style tags and archetypes; the M0 free-text exception versus Rule L5; the 5-question Drop rule versus formats; Telepathy baselines for `scene`; the 159.5 KB bundle exception; the "2 pushes per day" rule versus lanes. Add any conflict I missed.
2. **Tie-size simulation (quantitative).** Using clearly labelled **synthetic** assumptions (state a popularity skew such as Zipf-like option choice, and justify it), estimate for each lane type the expected tie group size at 1,000, 10,000, 1 lakh and 10 lakh daily lane players for: (a) the old format mix, (b) the new format mix in section 4 F33, (c) the new mix with the history tie-break. Report median and p90. You may use a throwaway script outside the repository source tree and paste the result tables into the document; commit no application code. Label every table "synthetic, unverified". Use the result to propose the minimum daily lane players at which each lane type should leave "Early lane".
3. **Pool-split risk.** Quantify how splitting players across 1, 2, 3 and 5 lanes reduces the match quality at small scale (below 2,000 daily players), using the existing match-quality benchmarks from the blueprint where possible, and recommend the lane count per player-count band. Confirm or challenge "Everyday + Memes only at launch".
4. **Cost and scale.** Events, rows and storage per day at 10,000, 100,000 and 10 lakh DAU for 1, 2 and 4 lanes played per player per day; extra jobs per lane (Drop prep, recap, finalise, history signature); Redis memory per lane; the effect on the 07:00 spike; the cost of the tie-group and mutual-pairing job at Stage A, B and C; the embedding and vector index cost for Say it (**measure a candidate model locally on a small set if you can, otherwise list as "to be measured"; never invent numbers**). Add an addendum to `docs/capacity-model.md`. Anything that touches the submit hot path must be rejected or moved to a worker.
5. **Matching correctness.** Write the maths for each format with at least two worked examples each, state symmetry and boundedness proofs or tests, and explain how the weights behave when a lane's sample is small. Define exactly what happens to a player whose twin was decided by hash only. Propose the history-signature design (options, size per player, accuracy versus exact comparison) and recommend one in an ADR.
6. **Free-text feasibility (F37).** Compare at least three embedding model candidates and two vector-index options on licence, size, language coverage (English, Hindi, Hinglish; Gujarati later), expected CPU latency, memory, and operational complexity on the current hosting; recommend one; list what must be measured before Gate G4. State plainly if you judge the feature too risky for the current stage, and what the smallest safe version would be.
7. **Privacy and DPDP.** Purposes and lawful basis for: lane preferences, lane interest, history signature, free text, embeddings, archetypes. Retention table, deletion and export behaviour (including proof that embeddings are deleted), the notice copy, the Settings switches, children's data exclusion, and the points a lawyer must review. Record in `docs/` and `memory.md` Open Questions. This is not legal advice.
8. **Safety and abuse.** Situations scenario checklist; labels and share-card review; abuse cases (copy-paste farming, brigading a lane, sockpuppets to manufacture a Super twin, text harassment, scraping the lane list) with the control for each; moderation SLAs.
9. **Reuse.** Illustration registry (D-015), the polymorphic renderer, importer, validation engine, Settings screen, push pipeline, share-card renderer, Globe and Orbit components from F1, `privacy.ts`, admin spec sections.
10. **Bundle plan** and **migration plan** (order, rollback, verification, how long the backfill takes at 1 lakh and 10 lakh existing rows).
11. **Taxonomy and content audit.** Check lane names, seeded questions, options, style tags and archetype labels against the forbidden-topics list and Rule L7; report anything borderline.
12. **Risks the Founder asked not to be softened.** In one table: risk, likelihood, impact, mitigation, owner, for: thin lanes, tie-size collapse at scale, free-text mismatch of tone, moderation load, legal exposure from user text, scenario content harming players, engagement without retention, complexity creeping into the 30 second loop.

---

## 12. Documents to update in this stage

Update **every** file below. Each update is an amendment with a dated heading, never a silent rewrite. Where a document describes the player journey, it must now describe lanes.

- `product.md`: core loop rewritten for lanes; section 11C (F32 to F39); lane catalogue; Gate L-A and Gate G4; Non-Goals additions (section 1); success metrics per lane; personas touched; v1 scope list updated (lanes, formats, twin depth in v1; Say it, Situations, Super twin, Brain not in v1); monetisation section notes Rule L8.
- `rules.md`: section 3 rules in exact text; the amended rules shown old versus new; Rule 9 reminder; editorial rules for lane content (neutral tags, no real people, scenario checklist); Rule 11 reminder listing the new config keys.
- `AGENTS.md`: add one line: "Lanes isolate matching; Drops are identical within a lane; typed answers only behind Gate G4; no politics; never shame a player."
- `architecture.md`: new section "Lanes and Twin Depth" (data model, Redis, jobs, matching maths per format, tie groups, mutual pairing, history signature, pipeline diagram for Say it, degradation table, per-route policy rows, ADRs from the next free number (suggested: lane model; mutual pairing; history signature; embedding model and vector index; text retention), config key list, migration and backfill plan).
- `design.md`: section 12C and change log; update the screens inventory and the Sticker pop component list.
- `task.md`: phases 10L to 10S, Phase 11 additions P11.33 to P11.46, recommended execution order, dashboard counts, stage checklists, change log; keep all existing tasks.
- `memory.md`: append-only: decisions (lanes, formats, twin depth, Say it gated, politics excluded, execution order), open questions (section 13), risks, next steps. Fix nothing silently; if you notice the duplicate ADR numbers, token drift or other inconsistencies already known, list them in the report instead.
- `README.md`: docs table, feature list with statuses, how lanes change the play loop in plain words.
- `docs/admin-panel-spec.md`: annotations and **Addendum B** only (section 7).
- `docs/connection-features.md`: amend F18 to F23 for lanes (Globe chips, Keep and Orbit lane tag, Telepathy and Anti-twin per lane, Rule L2) as dated amendments.
- `docs/meme-and-insights-features.md`: amend F24 to F31 for lanes (F24 vs F35, lane dimension for signals and insights, Meme Lab feeds Memes only).
- `docs/event-dictionary.md`: the events in section 6.
- `docs/capacity-model.md`: addendum from analysis 4.
- **New** `docs/lanes-and-matching.md`: the full analysis and specification (formats maths, ties, mutual pairing, history, Super twin, simulation tables, recommendations).
- **New** `docs/say-it-text-answers.md`: F37 in full (pipeline, models compared, evaluation plan, Gate G4 checklist, retention, abuse cases, limits).
- **New** `docs/situations-lane-guidelines.md`: Rule L7 as an editor guide with the checklist, good and bad scenario examples, style label guidance, share-card rules.
- **New** `docs/stage-L0-report.md`.

Also update any **copy deck, glossary or content docs** that exist (search `docs/` for "twin", "Drop" and "five questions") so that terminology is consistent: "lane", "Drop" (per lane), "twin", "tie group", "Super twin", "Say it", "Early lane", "Closest so far".

---

## 13. Report format, then STOP

Print the Stage Report and also write it to `docs/stage-L0-report.md` with: what changed per document (file and section names); the old-versus-new text of every amended rule; the results of sections 11.1 to 11.12 (with the synthetic tables clearly labelled); the final recommended lane count per player-count band; the recommended execution order and what it costs if the Founder chooses the old order; any mismatch between Addendum B and existing Phase 11 tasks; the list of dependencies proposed (embedding model, vector index) with failure modes; confirmation that **no code, migration, seed or dependency changed**; the list of files created and the git tag.

Then add **Questions for the Founder** as a numbered list, each with your recommended default, including at least:
1. Name: "Lanes" or another word players will understand (for example Channels, Rooms, Zones)?
2. Launch lanes: Everyday + Memes only (recommended)?
3. Gate L-A numbers: *config* 8 approved Drops queued, "Early lane" under 500, "Closest so far" under 200?
4. Tie settings: epsilon 0.01, K = 32, history window 28 days, minimum shared days 5?
5. Is "Use my past answers to find closer twins" ON by default with a Settings switch (recommended), or opt-in?
6. Show exact tie group sizes below 1,000 (recommended)?
7. Legacy formats (number, colour, picture, mood): keep only in Everyday, at most 2 of 5, or retire?
8. Execution order: insert L1 to L3 before F2 (recommended) or keep the old order?
9. Situations: card version first (recommended); style list size 6 to 8; who writes and signs off scenes?
10. Say it: approve the self-hosted model approach and Gate G4 targets (300 labelled pairs, 80 percent agreement, macro-F1 0.75)? Hindi and Hinglish at launch of text, Gujarati later?
11. Raw text retention 7 days, history retention 28 days?
12. Hot Takes: approve the harmless-topics-only definition, or drop the lane?
13. Politics: confirm it stays excluded (recommended), or commission a separate legal and trust-and-safety review before any decision?
14. Lane streaks and a "play all lanes" bonus: leave for v1.5?
15. Super twin threshold: at least 2 lanes with similarity 0.8 or more?
16. Brain lane: keep documented only?
17. Anything in the new rules that the Founder wants worded differently?

End with the line **"Stage L0 complete."** and stop. Do not begin Stage L1.