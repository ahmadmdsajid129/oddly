# Product Specification — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-07 | Owner: Founder + AI agent
Purpose of this file: Definitive product blueprint, scope, user personas, brand identity, matching mechanics, feature definitions (F1–F17), edge cases, and legal/safety boundaries.

---

## 1. What We Are Making

**Oddly** (working title: _Twin_) is a daily five-pick game web app designed to give every person a daily moment of unexpected human connection in under 30 seconds. Every day at 07:00 IST, Oddly drops five instinct-based questions—identical for everyone on Earth. Players answer on intuition without profiles, feeds, chat, or followers. Immediately upon submission, Oddly computes your **Twin**: the one stranger anywhere in the world who answered most like you today. It also computes your **Oddness**: an information-theoretic rarity percentile revealing how singular your combination of picks was compared to everyone else who played.

- **Working Title:** Twin
- **Brand Name:** Oddly (trademark, domain, app store, and social handle availability NOT yet verified; candidate alternates: _Twinly_, _SameHere_).
- **Primary Tagline:** _"Someone out there is oddly like you."_
- **Action Line:** _"Five picks. One twin."_
- **Share Line:** _"I matched a stranger in [place]. Can you beat my oddness?"_
- **Store Subtitle:** _"Find your daily twin in 30 seconds."_
- **Notification Hook:** _"Today's five are live. Who thinks like you?"_

---

## 2. Problem Statement and Opportunity

### 2.1 The Problem

People experience a pervasive sense of isolation alongside social media fatigue. They crave authentic, low-friction moments of human connection but are exhausted by infinite feeds, performance pressure, awkward dating chats, and the demand to curate online personas. Most existing question-matching or quiz applications (e.g., Hunch, 20 Questions, CHOOSE, Just Like You) either force users into open-ended messaging/dating, suffer from user-generated spam, or overwhelm players with endless quizzes.

### 2.2 The Opportunity

Oddly turns the **result itself into the entire product**. By stripping away chat, direct messaging, user profiles, and public rankings, Oddly provides a finite, 30-second ritual. It delivers:

1. **Validation of Individuality & Belonging:** Proving both that you are unique ("Oddness") and that you are never entirely alone ("Twin").
2. **Zero Effort Connection:** No bio to maintain, no photos to upload, no small talk to sustain.
3. **High Virality Without Social Toxicity:** Share cards focus on intriguing coincidences and rarity metrics rather than vanity or status competition.

---

## 3. Target Audience, Personas, and Jobs-to-be-Done

### 3.1 Target Personas

#### Persona 1: Riya (19, College Student — Ahmedabad)

- **Context:** Heavy user of Instagram, Snapchat, and WhatsApp. Plays casual games between classes, on the bus, or late at night.
- **Motivations:** Fun, novelty, comparing oddities with friends, sharing quirky story cards, maintaining daily streaks.
- **Pain Point:** Tired of toxic comment sections and high-maintenance dating apps. Wants a quick burst of amusement.
- **Oddly Moment:** Answers during a 5-minute lecture break, shares her 4/5 match card to her close friends' Instagram story with the caption _"Who matches me?"_

#### Persona 2: Karan (27, Software Engineer — Bengaluru)

- **Context:** Commutes via metro, drinks morning filter coffee, active on X (Twitter) and Reddit. Appreciates clean design, numbers, and probability.
- **Motivations:** Fascinated by entropy, rarity distributions, and global data points. Enjoys a structured morning routine.
- **Pain Point:** Dislikes bloated apps demanding sign-ups before providing value.
- **Oddly Moment:** Opens Oddly at 07:15 AM with his morning coffee, inspects his "Mythic Tier (98.4%)" oddness score, and posts his rarity breakdown on X.

#### Persona 3: Meera (46, High School Teacher — Pune)

- **Context:** Uses WhatsApp daily for family and school groups; reads news on her tablet. Joined via a challenge link sent by her daughter.
- **Motivations:** Wholesome, gentle daily habit that sparks lightweight conversation with family across cities.
- **Pain Point:** Intimidated by complex gaming mechanics, accounts requiring passwords, and unsolicited messages from strangers.
- **Oddly Moment:** Completes her picks after morning tea, forwards her result into the family WhatsApp group: _"Look, I matched someone in Kyoto today!"_

### 3.2 Jobs to Be Done (JTBD)

- **JTBD 1 (Boredom / Micro-break):** _When I have 30 seconds between tasks, I want a delightful, finished interactive moment so that I feel refreshed without falling down a social media rabbit hole._
- **JTBD 2 (Affirmation):** _When I feel alone or eccentric in my daily preferences, I want to see that another human across the globe shares my exact peculiar instincts so that I feel validated and connected._
- **JTBD 3 (Playful Social Sharing):** _When I get a surprising or humorous result, I want to share a beautiful, low-friction card with friends so that we can compare our quirks._
- **JTBD 4 (Daily Habit):** _When I wake up, I want a predictable, clean morning ritual that respects my time and keeps a streak going._

### 3.3 Regions and Languages

- **Launch Target:** India (English with a light, warm Indian-English / Hinglish conversational cadence).
- **Global Audience:** The daily Drop is universal worldwide (UTC synchronized, anchored to 07:00 IST for India launch).
- **Future Locales:** Architecture supports Hindi and Gujarati via dynamic string storage (`app_content`) and i18n question schemas (`text_i18n`).

---

## 4. Goals, Non-Goals, and Go/No-Go Gates

### 4.1 Goals for v1.0

- Build a rock-solid, responsive Web App (PWA) that loads in < 2 seconds on mid-range Android devices over 4G.
- Enable zero-friction guest play: users reach their provisional reveal in under 60 seconds on their first visit and under 30 seconds on return visits.
- Deliver an honest, mathematically rigorous matching engine with k-anonymity privacy safeguards.
- Implement server-side rendered, privacy-safe share cards (Story, Square, Link Preview) with high viral appeal.
- Maintain strict data minimisation: no free-text user chat, no profile pictures, no precise geolocation.

### 4.2 Non-Goals for v1.0 (Strictly Out of Scope)

- **NO chat or messaging:** Users cannot message their twin. The result is the final destination.
- **NO user profiles or avatars:** No profile bios, photos, or public user profiles.
- **NO public leaderboards:** No ranking players by "popularity" or "oddness".
- **NO real-money prizes or betting:** Free-to-play, zero gambling mechanics (compliant with 2025 Indian online gaming regulations).
- **NO native iOS/Android apps in v1.0:** Web-first responsive PWA; native apps slated for v1.1 (Expo).
- **NO paid subscriptions or ads in v1.0:** Monetisation (streaks freeze, sponsored questions) is strictly deferred.
- **NO friends groups, waves, or mutual blocks in v1.0:** Schema-ready, but UI/routes deferred to v1.5.

### 4.3 Success Metrics

- **Completion Rate:** > 85% of users who tap "Play" finish all 5 questions.
- **Median Time to Complete:** ~30 seconds.
- **Day-1 Retention (D1):** > 25% during initial testing.
- **Day-7 Retention (D7):** > 12% across initial cohorts.
- **Share Rate:** > 15% of completing users trigger a share action or copy link.
- **Viral Coefficient (K-factor):** > 0.3 driven by challenge links (`/c/:shortId?challenge=1`).

### 4.4 Go/No-Go Decision Gates

1. **Gate G0 (Weekend Prototype Test):** 100 organic players. Day-1 return ≥ 25%, share rate ≥ 15%. If below 15%, iterate on questions and card design.
2. **Gate G1 (Web MVP Beta — Week 4):** 200 beta users. Day-7 return ≥ 12%, drop completion ≥ 85%, crash-free sessions > 99%.
3. **Gate G2 (Campus Cohort — Week 8):** 1,000 active players. Day-30 return ≥ 8%, K-factor > 0.3.
4. **Gate G3 (Monetisation Feasibility — Week 12):** Evaluate premium features (streak freezes, archive access) only if D30 remains stable.

---

## 5. Brand Identity and Voice

### 5.1 The Brand Story (Verbatim for About Page and Onboarding)

> Everyone has a thing. You pick odd numbers when you are nervous. You think lukewarm coffee is a crime. You see a colour and feel a Monday.
>
> You assume it is just you. It almost never is.
>
> Oddly asks you five tiny questions every day, the same five for everyone on Earth. No quizzes to study for, no profile to build, no followers to chase. You answer on instinct, and then we do one simple thing: we look for the person, anywhere in the world, who answered most like you.
>
> You will never know their name. You will know they are real, that they are somewhere you have never been, and that today, for thirty seconds, two strangers were oddly in sync.
>
> That is the whole product. A small, daily reminder that the world is bigger than your feed and a little more like you than you thought.

### 5.2 Mission, Vision, and Core Values

- **Mission:** Give every person a daily moment of unexpected human connection, in under a minute.
- **Vision:** The shared daily ritual that reminds the world how alike strangers are.
- **Core Values:**
  1. **Tiny:** Respect human time. Never demand homework, quizzes, or profiles.
  2. **Kind:** Celebrate eccentricities. No shaming, no ranking, no losers.
  3. **Safe by Design:** Prevent abuse architecturally by eliminating free text, chat, and precise locations.
  4. **Honest:** Never generate synthetic twins, bots, or fake rarity counts. If data is sparse, say so transparently.

### 5.3 Brand Voice Guidelines

| Do                                                                                          | Don't                                                                         |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Celebrate quirky choices (_"Only 0.4% picked purple for Monday. Respect."_)                 | Mock or criticise any choice (_"Why would anyone pick cold pizza?"_)          |
| Use plain, warm, friendly language with short sentences.                                    | Use corporate jargon, growth-hacking hype, or tech buzzwords.                 |
| Be honest about early-day or weak matches (_"Closest so far: 3 of 5. Check back tonight."_) | Fake a 5/5 match or exaggerate rarity.                                        |
| Maintain playful self-awareness (_"Two strangers, thirty seconds, zero small talk."_)       | Write lengthy academic or psychological paragraphs.                           |
| Treat all demographic backgrounds with equal respect and warmth.                            | Touch religion, caste, politics, sexuality, health conditions, or body image. |

### 5.4 In-App Vocabulary

- **Drop:** The daily set of exactly five questions released at 07:00 IST.
- **Picks:** The five options a player chooses in a Drop.
- **Twin:** The closest eligible other player who answered today's Drop.
- **Oddness:** The information-theoretic rarity score of a player's five picks (percentile + tier).
- **Streak:** The number of consecutive Twin Days a player has submitted answers.
- **Recap:** The final locked summary of yesterday's Drop, twin, rarity, and global numbers revealed at 07:05 IST.
- **Wave:** _(v1.5 schema-ready)_ A one-tap mutual emoji greeting exchanged between twins.

---

## 6. Core Loop and Daily Timeline

### 6.1 The Player Core Loop

```
[Notification / Shared Link / Morning Habit]
             │
             ▼
      [Open Web App] (Zero login barrier)
             │
             ▼
  [Age Gate Check] (18+ confirmation on 1st visit)
             │
             ▼
  [Answer 5 Picks] (30 seconds, instinct-driven)
             │
             ▼
       [Review & Lock] (Idempotent submission)
             │
             ▼
  [Searching Animation] (1.5s visual map journey)
             │
             ▼
  [Provisional Twin Reveal] (Coarse region, age band, matched picks)
             │
             ▼
    [Oddness Percentile & Tier] (Rarity celebration)
             │
             ▼
   [Share Card / Challenge] (Instagram Story, WhatsApp, link)
             │
             ▼
[Soft Sign-in Prompt] ("Save your streak with Google")
             │
             ▼
[Next Morning Recap & New Drop] (07:05 IST)
```

### 6.2 The Daily "Twin Day" Timeline (All times IST, stored in UTC)

| Time (IST)        | System / User Event   | Technical Operations                                                                                   |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| **D - 2 days**    | Drop Curation & Lock  | Two-person editorial approval in Admin tool locks the Drop. Questions are immutable.                   |
| **06:30**         | Drop Pre-Staging      | Scheduler pre-compiles Drop JSON, caches it in Redis and warms CDN edge origins.                       |
| **07:00**         | Drop Goes Live        | `drops.status` transitions from `scheduled` to `live`. Staggered web push batches begin (5k/batch).    |
| **07:00 – 07:30** | Morning Peak Traffic  | High-concurrency submissions. Instant Stage A provisional twin calculated in memory/Redis.             |
| **Every 5 min**   | Background Refinement | Worker re-evaluates provisional pairings as the pool of players grows.                                 |
| **12:00 / 20:00** | Smart Nudge           | At most one gentle reminder for unplayed users with notifications enabled (respects quiet hours).      |
| **20:00**         | Streak at Risk Alert  | Users with streaks ≥ 3 receive a reminder if they haven't submitted today.                             |
| **21:00**         | Twin Upgrade Push     | Sent ONLY if a player's similarity improves by ≥ 0.10 or matches jump from 3 to 4/5 (max 1/day).       |
| **06:59 (D+1)**   | Window Closes         | `drops.status` set to `closed`. Further submissions rejected with HTTP 409.                            |
| **07:00 – 07:05** | Final Batch Job       | BullMQ finalizes exact probabilities $p(a)$, locks final twins, computes world stats, updates streaks. |
| **07:05**         | Recap Live & New Drop | Recap notifications sent; today's new Drop goes live simultaneously.                                   |

---

## 7. Dynamic Question System and Content Architecture

### 7.1 Everything Dynamic from the Database (Override Addendum)

No content, questions, palettes, illustrations, UI copy, notification templates, tier cut-offs, or configuration values are hard-coded in the application codebase.

- All questions, options, palettes, and assets are stored in PostgreSQL and managed through the Admin Panel.
- All UI strings live in `app_content` (PostgreSQL), served via a fast, cached endpoint `GET /v1/content/:locale`.
- Pure functions and generic components render questions dynamically based on schemas defined in `@oddly/shared`.

### 7.2 The Five Question Types

Every Drop contains **exactly five questions**, always combining lower and higher entropy choices:

| Slot / Type                  | Answer Format                   | Answer Space        | Matching Rule                                                                                               |
| ---------------------------- | ------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Type 1: Pick One (Text)**  | 2 to 4 text option tiles        | Low cardinality     | Exact match: 1.0 if identical, 0.0 otherwise.                                                               |
| **Type 2: Number**           | Visual dial & snapping strip    | 1 to 50             | Fuzzy match: Exact = 1.0, $\Delta = 1 \implies 0.5$, $\Delta = 2 \implies 0.25$, $\Delta > 2 \implies 0.0$. |
| **Type 3: Colour**           | 12-swatch grid with text labels | 12 distinct colours | Exact match: 1.0 if identical, 0.0 otherwise. Accessible text labels prevent colour-blindness exclusion.    |
| **Type 4: Pick One (Image)** | 2x2 grid of custom SVG tiles    | 4 image options     | Exact match: 1.0 if identical, 0.0 otherwise. Illustrated with clean vector assets.                         |
| **Type 5: Word**             | 2x3 grid of pill chips          | 6 curated words     | Exact match: 1.0 if identical, 0.0 otherwise. Instinctive mood association.                                 |

### 7.3 Editorial Rules for Writing a Drop

1. **Instinct, Never Knowledge:** Questions must have zero right or wrong answers.
2. **Entropy Spread:** Aim for balanced answer distributions. No option should exceed ~60% in binary questions or ~40% in multi-option questions (verified via panel testing).
3. **Strictly Forbidden Topics:** Religion, caste, politics, electoral opinions, sexual preferences, medical conditions, body weight/appearance, real living individuals, corporate brand endorsements (until sponsored questions exist), and anything causing shame or exclusion.
4. **Language-Light:** Questions must be effortlessly understood by non-native English speakers.
5. **No Consecutive Patterns:** Never place the same question type in the same slot on two consecutive days.
6. **Two-Person Rule:** An editor drafts; an independent approver must review and approve before scheduling.

### 7.4 Standard Seed: Sample Week of Drops (Draft Batch Demo)

_Seeded dynamically via JSON importer in `seed/oddly_batch_001_first_14_days.json`:_

| Day     | Q1: Pick One (Text)                                | Q2: Number (1–50)                 | Q3: Colour (12 Palette)       | Q4: Image (4 SVG Tiles)                                     | Q5: Word (6 Options)                                 |
| ------- | -------------------------------------------------- | --------------------------------- | ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| **Mon** | Pizza always cold OR Coffee always lukewarm        | Pick a number (1–50)              | Colour of Monday morning      | Sunrise / Storm / Starry Night / Overcast Sky               | Cozy, Restless, Curious, Sleepy, Bold, Calm          |
| **Tue** | Pause time 10 min/day OR Rewind 10 s/day           | Minutes you'd wait for a friend   | Colour of your last good idea | Red door / Wooden door / Glass door / Tiny door             | Hopeful, Hungry, Tired, Playful, Focused, Nostalgic  |
| **Wed** | Always window seat OR Always aisle seat            | Your lucky number                 | Colour of a Sunday afternoon  | Chai lane / Quiet park path / Neon market / Beach promenade | Rest, Adventure, Company, Quiet, Snacks, Sunshine    |
| **Thu** | Text back instantly OR Perfect reply an hour later | A number that feels friendly      | Colour of a rainy day         | Book / Guitar / Torch / Notebook (Desert Island)            | Plenty, Panic, Hopeful, Doomed, Charging, Eco-mode   |
| **Fri** | Dessert first OR Dessert last                      | A number that sounds like weekend | Colour of Friday evening      | Movie night / Road trip / Long nap / Street food crawl      | Rocket, Sloth, Disco, Cat, Owl, Chill                |
| **Sat** | Mountains OR Beach for one perfect day             | How many snacks is "a few"?       | Colour of your favourite song | Fruit / Books / Bangles / Sweets (Market Stall)             | Hero, Sidekick, Villain, Narrator, Extra, Plot Twist |
| **Sun** | Plan week tonight OR Let Monday surprise you       | A number for tomorrow             | Colour of a fresh start       | 4 distinct sunrise/sunset scenes                            | Steady, Wild, Gentle, Busy, Lucky, New               |

---

## 8. Result System and Honesty Rules

### 8.1 The Three-Stage Reveal Sequence

1. **Your Twin:**
   - Score header: _"You matched 4 of 5 picks with someone in Lagos, age 18 to 24."_
   - Interactive pick comparison: 5 visual indicators (mint for matches, dimmed for differences).
2. **Your Oddness:**
   - Percentile headline: _"Your picks were rarer than 84% of today's players. Tier: Rare."_
   - Highlighted outlier: _"Your rarest pick: Lime for Monday Morning (only 2.1% chose it)."_
   - Verified 1-in-N count: Only displayed when calculated from real, observed database frequency.
3. **Your Actions:**
   - Share Card generator (Story 9:16, Square 1:1, Link Preview 1.91:1).
   - "Challenge a Friend" viral link (`/c/:shortId?challenge=1`).
   - "Save your streak with Google" non-blocking prompt.

### 8.2 Strict Honesty Protocol

- **Under 200 Players (Early Day):** If fewer than 200 submissions exist when a user finishes, display: _"Closest so far: N of 5. More people are still playing. Your final twin locks in tomorrow at 07:00 AM."_
- **Weak Matches:** If the closest match is $\le 2/5$, Oddly does not pretend it is a cosmic soulmate. It displays: _"You are one of a kind today! Closest so far is 2 of 5. Check back tomorrow."_
- **No Identical Twin Found:** If nobody has chosen your exact 5-vector, say honestly: _"Nobody else picked all five the way you did today."_
- **Zero Synthetic Data:** Under no circumstance will the system create fake AI profiles, fake submissions, or fabricated rarity numbers in production mode.

---

## 9. Mathematical Foundations and Matching Engine

### 9.1 Question-Level Similarity ($s_q$)

- For binary, colour, word, and image questions:
  $$s_q(u, v) = \begin{cases} 1.0 & \text{if } a_{u,q} = a_{v,q} \\ 0.0 & \text{otherwise} \end{cases}$$
- For number questions ($1 \le a \le 50$):
  $$s_q(u, v) = \begin{cases} 1.0 & \text{if } |a_{u,q} - a_{v,q}| = 0 \\ 0.5 & \text{if } |a_{u,q} - a_{v,q}| = 1 \\ 0.25 & \text{if } |a_{u,q} - a_{v,q}| = 2 \\ 0.0 & \text{if } |a_{u,q} - a_{v,q}| > 2 \end{cases}$$

### 9.2 Information Content and Weights

Let $p(a)$ be the empirical probability of option $a$ among all players of today's Drop, computed with Laplace add-one smoothing:
$$p(a) = \frac{C(a) + 1}{N + K_q}$$
where $C(a)$ is the selection count, $N$ is total drop submissions, and $K_q$ is the cardinality of question $q$.
The information content (in bits) is:
$$I(a) = \log_2\left(\frac{1}{p(a)}\right) = -\log_2(p(a))$$
The pair weight for question $q$ between users $u$ and $v$ is the symmetric mean information:
$$w_q(u, v) = \frac{I(a_{u,q}) + I(a_{v,q})}{2}$$

### 9.3 Overall Pairwise Similarity ($S(u, v)$)

The total similarity between two players $u$ and $v$ is the information-weighted sum of question similarities:
$$S(u, v) = \frac{\sum_{q=1}^{5} w_q(u, v) \cdot s_q(u, v)}{\sum_{q=1}^{5} w_q(u, v)}$$

- $S(u, v) \in [0.0, 1.0]$ and is strictly symmetric: $S(u, v) = S(v, u)$.
- Rare shared picks contribute significantly more to $S(u, v)$ than common shared picks (analogous to TF-IDF).

### 9.4 Oddness and Rarity Percentile

The total oddness of player $u$'s five picks is the sum of their information contents:
$$\text{Oddness}(u) = \sum_{q=1}^{5} I(a_{u,q})$$
The player's **Rarity Percentile** is:
$$\text{Percentile}(u) = 100 \times \frac{\#\{v \in \text{Players} \mid \text{Oddness}(v) < \text{Oddness}(u)\}}{N}$$
**Rarity Tiers:**

- **Common:** 0.0% – 49.9%
- **Uncommon:** 50.0% – 79.9%
- **Rare:** 80.0% – 94.9%
- **Mythic:** 95.0% – 100.0%

### 9.5 Scaling Stages for the Matching Engine

1. **Stage A (v1.0 — Up to 10,000 Daily Players):**
   - Brute-force pairwise evaluation against active in-memory / Redis vector representations.
   - Fits easily within ~10ms execution time on modern hardware.
   - Encapsulated behind the `MatchingStrategy` interface.
2. **Stage B (10,000 to 200,000 Daily Players):**
   - Combinatorial hash bucketing (1 exact 5-hash, 5 sub-hashes for 4/5 matches, 10 sub-hashes for 3/5 matches). Candidate pool evaluated via exact weighted formula.
3. **Stage C (> 200,000 Daily Players):**
   - Vector embeddings + Approximate Nearest Neighbors (ANN via pgvector HNSW index) followed by top-K exact rescoring.

### 9.6 Tie-Breaking and Exclusions

- **Exclusion Filters:** Never match a player with themselves, with another session on the same device/IP cluster, with blocked accounts, or with accounts flagged for bot behavior.
- **Tie-Breaking:** If two candidate twins have identical $S(u, v)$:
  1. Prefer the candidate from a **different country** (celebrates global connection).
  2. If still tied, use a deterministic pseudo-random hash seeded by `hash(drop_id, min(user_u, user_v), max(user_u, user_v))`. Never favor who submitted first.

### 9.7 Privacy via $k$-Anonymity

To prevent deanonymisation of players:

- **Region Safeguard:** A player's country or state is displayed to their twin ONLY if $\ge 20$ players from that geographic unit completed today's Drop. Otherwise, generalize to a continent/macro-region (e.g., _"Somewhere in Asia"_).
- **Age Band Safeguard:** Users are mapped into five standard bands: `18–24`, `25–34`, `35–44`, `45–54`, `55+`. If a band contains $< 20$ players today, merge with the adjacent band.
- **Zero Raw Vector Exposure:** Raw answer choices of other users are never queryable or exposed over public APIs.

---

## 10. Detailed Feature Specifications (F1 to F17)

### F1: Guest Play and Frictionless Onboarding

- **In v1?** Yes.
- **Specification:** No sign-up wall. When landing on `/`, player sees tagline and "Play today's five". On first tap, an Age Gate bottom sheet appears requiring confirmation of 18+ status. Upon confirmation, a unique anonymous device UUID (`oddly_did`) is created and persisted in `localStorage` and an `httpOnly` cookie.

### F2: Account and Authentication

- **In v1?** Google Sign-In: Yes. Phone OTP: Flagged / Deferred. Apple Sign-In: Slated for v1.1 iOS.
- **Specification:** Sign-in is never forced prior to play. After viewing results, user is prompted with _"Save your streak with Google"_. When authenticated, guest data (submissions, devices, streaks) seamlessly merges into the user account.

### F3: Daily Drop

- **In v1?** Yes.
- **Specification:** Exactly five questions per Twin Day. Served via cached endpoint `GET /v1/drop/today`. Before 07:00 IST, shows a countdown clock (S2). After 06:59:59 IST, submissions are locked and the Drop transitions to read-only.

### F4: Answering Flow

- **In v1?** Yes.
- **Specification:** Mobile-optimized, one question per screen. Progress dots at top. Selection automatically advances after 350ms (except Number, which has a tactile Confirm button). Back arrow allows changing previous answers before final review. Review screen (S4) displays compact summary chips and "Find my twin" CTA. Submission uses client-generated `request_id` for idempotency.

### F5: Provisional Twin Computation

- **In v1?** Yes.
- **Specification:** On `POST /v1/submissions`, server records answers, updates Redis counters, and synchronously computes the best available twin among players who have submitted so far. Returns provisional twin, match count, and coarse demographics.

### F6: Final Twin and Recap

- **In v1?** Yes.
- **Specification:** At 07:00 IST the following morning, the final batch worker calculates immutable final matches, locked rarity percentiles, and global highlights (total players, most controversial pick, rarest pick). User receives a recap notification leading to S9.

### F7: Oddness and Tier Computation

- **In v1?** Yes.
- **Specification:** Information-theoretic oddness score mapped to a percentile and assigned to one of four tiers (Common, Uncommon, Rare, Mythic). Distinct visual styling and badge for each tier.

### F8: Server-Rendered Share Cards

- **In v1?** Yes.
- **Specification:** Rendered using `satori` and `@resvg/resvg-js` in three formats: Story (1080x1920), Square (1080x1080), and Link Preview (1200x630). Cached by content hash in object storage. Includes score, coarse twin location, rarity highlight, streak flame, short URL, and QR code.

### F9: Streaks

- **In v1?** Yes (streak freezes deferred).
- **Specification:** Consecutive Twin Days with completed submissions increment `streak_current`. Missing a 24-hour Drop window resets the streak to 0. Milestone celebrations trigger at 7, 30, 100, and 365 days.

### F10: History

- **In v1?** Yes (Calendar & List view; mind map deferred to v1.5).
- **Specification:** Paginated archive of past Drops played by the user, showing date, picks, twin match, and rarity badge.

### F11: Friends Compare

- **In v1?** No (v1.5, schema-ready).
- **Specification:** Private invite groups (up to 30 people) to compare picks with close friends.

### F12: Wave

- **In v1?** No (v1.5, schema-ready).
- **Specification:** A single, mutual one-tap emoji ping sent between matched twins within 24 hours of Drop close.

### F13: Web Push Notifications

- **In v1?** Yes.
- **Specification:** Standard Web Push via VAPID keys. Hard cap: maximum 2 notifications per user per day. Strict quiet hours (default: 22:00 to 07:00 IST). Channels: Drop Live, Smart Nudge, Twin Upgrade, Recap Ready, Streak at Risk.

### F14: Settings and Privacy

- **In v1?** Yes.
- **Specification:** Granular notification toggles, theme selector (System/Dark/Light), sound/haptic toggles, reduce-motion toggle, region visibility toggle, one-click JSON data export, and complete account deletion.

### F15: Premium

- **In v1?** No (v1.5 / v2.0).
- **Specification:** Paid perks: streak freeze tokens, historical archive access, custom share card themes.

### F16: Report and Content Moderation

- **In v1?** Yes (reporting); User block deferred to v1.5.
- **Specification:** Kebab menu on cards/questions allows reporting for offensive, broken, or inappropriate content with an optional 140-character note. Reporting hides the question/card from the reporter and logs an admin queue entry.

### F17: Admin Question Tool

- **In v1?** Yes.
- **Specification:** Internal web application for creating, validating, bulk-importing, panel-testing, approving, and scheduling Drops. Supports two-person review, entropy warnings, and live question-pulling.

---

## 11. Edge Cases and System Behavior

| Scenario                                         | Operational Decision                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User loses connectivity during submit**        | Client caches answers in `localStorage` and automatically retries with identical `request_id` via exponential backoff (up to 5 attempts). Answers are never lost. |
| **Drop not yet open**                            | App displays Countdown screen (S2) with exact time remaining until 07:00 IST.                                                                                     |
| **Drop window has closed**                       | Submission rejected with HTTP 409 `DROP_CLOSED`. App redirects user to yesterday's recap and informs them when the next Drop goes live.                           |
| **Duplicate submission attempt**                 | Server enforces unique constraint on `(drop_id, user_id)`. Subsequent requests with identical `request_id` return the cached result idempotently.                 |
| **User travels across international time zones** | All Drops are strictly governed by UTC server time. Local display times adapt to client device locale; streaks never break due to timezone changes.               |
| **User declares age < 18**                       | Application displays a courteous screen explaining Oddly is restricted to adults. No cookies, device IDs, or user records are saved.                              |
| **Question pulled due to emergency/typo**        | Admin triggers pull action. Question is flagged as pulled. Matching engine dynamically re-scores based on the remaining 4 questions.                              |
| **Account deletion request**                     | User's submissions, device tokens, and PII are irrevocably purged or anonymized within 7 days. Public aggregate counts remain intact.                             |
| **Server downtime at 07:00 IST drop**            | Static Drop JSON is served directly from Cloudflare CDN edge. Submissions buffer gracefully on the client until API recovers.                                     |

---

## 12. Business Model and Monetisation Philosophy

### 12.1 Phase-1: Pure Focus on Retention

For the first six months, Oddly generates zero revenue. Success is measured purely by completion rates, organic K-factor, and D7/D30 retention. Daily play will **always remain 100% free**.

### 12.2 Future Monetisation (v1.5+)

- **Oddly Plus (Subscription):** Hypothesized at ₹79/month (~$0.99/mo). Includes 2 monthly streak freezes, full historical archive access, and bespoke share card colorways.
- **Sponsored Daily Questions (v2.0):** At > 20,000 DAU, offer a single, tasteful, clearly labelled sponsored question per week (e.g., _"Filter coffee vs. Cold brew"_ sponsored by a coffee roaster).
- **Aggregate Insights (v2.0):** Anonymized cultural trend reports at > 100,000 DAU.

### 12.3 What Oddly Will NEVER Sell

1. Individual user answers or pick vectors.
2. Identifiable user records, email addresses, phone numbers, or device IDs.
3. Precise geolocation data.
4. Any demographic segment representing fewer than 1,000 individuals.

---

## 13. Safety, Legal, and Privacy Framework

> **DISCLAIMER:** _This document does not constitute formal legal advice. A formal review by qualified legal counsel is required prior to public commercial launch._

### 13.1 Compliance with India's DPDP Act 2023

- **Age Restriction (18+):** Under the Digital Personal Data Protection Act 2023, processing data of minors requires verifiable parental consent. Oddly restricts service strictly to users aged 18 and older via explicit gatekeeping.
- **Data Minimisation:** No real names, avatars, free-text chats, or exact GPS coordinates are gathered.
- **Purpose Limitation & Consent:** Granular, separate opt-in consent for notifications and analytics.
- **Right to Erasure & Portability:** Native in-app buttons for one-click JSON data export and account deletion.

### 13.2 Online Gaming Regulations (India 2025)

Oddly involves zero real-money stakes, zero entry fees, and zero financial payouts. It is classified as an entertainment micro-game, exempt from real-money gaming restrictions.

---

## 14. Risks Register and Open Founder Decisions

### 14.1 Key Risks & Mitigations

1. **Low Density at Launch (Cold Start Problem):** If only 50 people play, twins will feel weak.
   _Mitigation:_ Honest UI messaging (_"Closest so far"_) and emphasis on the personal Oddness rarity score.
2. **Bot Infiltration & Timing Attacks:** Scripted bots flooding the API to distort probability weights.
   _Mitigation:_ Cloudflare Turnstile bot challenges, rate limiting, and minimum-answer-time thresholds (< 3 seconds flagged).
3. **Viral Surge Overload:** Sudden spike when an influencer shares a card.
   _Mitigation:_ Drop JSON served from Cloudflare CDN edge; submissions queued via Redis and Fastify with high throughput.

### 14.2 Open Decisions for the Founder

1. **Brand Trademark & Domain:** Formal availability clearance for "Oddly" (vs. "Twinly" or "SameHere").
2. **SMS Provider Selection (for Phone OTP):** Approval of SMS gateway (e.g., Twilio, Gupshup) and DLT registration in India when Phone OTP is unflagged.
3. **Legal Counsel Sign-Off:** Review of Draft Privacy Notice and Terms of Service.

---

## 15. Product Glossary

- **Drop:** Daily set of five questions released at 07:00 IST.
- **Picks:** A user's five chosen answers.
- **Twin:** Closest matching player for that Drop.
- **Oddness:** Total information content $I = \sum -\log_2(p(a))$ of a player's choices.
- **Rarity Percentile:** Percentage of players today with lower oddness.
- **Recap:** Final locked summary of yesterday's Drop.
- **Twin Day:** The 24-hour cycle from 07:00 IST to 06:59:59 IST.
- **Stage A Matching:** In-memory brute-force pairwise calculation for up to 10k players.
