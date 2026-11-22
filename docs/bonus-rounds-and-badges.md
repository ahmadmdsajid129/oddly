# Bonus Rounds (F40) and Badges (F41) Specification — Oddly v1

<!-- visual:start doc-banner -->
> [!NOTE]
> **Stage L0-ADD Definitive Specification:** Architectural and operational specification for asynchronous tie-break Bonus Rounds (F40) and private, unranked collectible Badges (F41).
<!-- visual:end doc-banner -->

---

## 1. Executive Summary & Plain-Words Intent

In large daily Drop cohorts, answer collisions on five questions naturally generate tie groups ("312 people matched you this way"). While cryptographic hashing and historical agreement provide fair, auditable tie resolution, players frequently seek authentic mutual discovery.

- **Bonus Rounds (F40):** An asynchronous, optional tie-break allowing tied players to answer 3 extra evergreen questions to find who is genuinely closest. It transforms *"meet one of them"* into *"meet the closest of them"* without ever modifying the shared Drop or pressuring players.
- **Badges (F41):** A private, unranked collectible system that celebrates Oddly's distinctive multi-lane exploration and Super Twins without leaderboards, social competition, or streaks.

---

## 2. F40 Bonus Rounds Specification

### 2.1 Trigger Criteria & Scope Boundaries
- **Availability Window:** Opens at 07:05 IST morning recap and closes at the end of that Drop's play window at 06:59:59 IST the next morning (effective window until the next Drop opens; `bonus.window_hours` [24h] is the cap). `bonus.close_and_compute` runs at 07:01 IST, safely ahead of the 07:05 final batch (pausable at degradation L2+). A second round, if still needed, opens at the next 07:05 recap.
- **Eligibility:**
  - Lane Drop is finalised (recap locked).
  - Player's tie group has at least `bonus.min_tie_size` (default 2) members.
  - Lane has at least `bonus.pool_min_per_lane` (default 40) approved evergreen questions in `bonus_pool_questions`.
  - Lane daily participation is at or above `lane.closest_so_far_below` (200) players.
- **Strict Invariants:**
  - Never offered for provisional results.
  - Never offered in the `say_it` free-text format.
  - Exactly `bonus.questions_per_round` (3) questions per round; maximum `bonus.max_rounds` (2) rounds per tie group per Drop.
  - Maximum 6 bonus questions per player per Drop.

### 2.2 Evergreen Pool & Deterministic Selection
1. **Evergreen Pool:** Per-lane catalog of approved, high-entropy questions managed via admin (P11.47), strictly screened against Section 9.1 forbidden topics.
2. **Entropy Sorting:** Questions are prioritized by predicted split power (highest Shannon entropy $H(Q)$ first).
3. **History Exclusion:** Excludes any question answered by any tie-group member in their 28-day history.
4. **Deterministic Seed:** Seeded by `HMAC_SHA256(drop_id || tie_group_id || round_number)`. Every player in the tie group receives the exact same questions in the exact same order (Rule L1 / Rule B1).

### 2.3 Asynchronous Play & Scoring Mechanics
- **Optionality:** 100% voluntary. Non-participants remain in the group and retain their original locked twin.
- **Additive Evaluation Protocol:**
  - When the round window closes, the engine evaluates participants who answered.
  - Bonus answers are scored using the information-weighted formula.
  - Greedy mutual pairing runs among participants only, evaluating closest participant in the tie group.
  - The outcome is written strictly to `bonus_results`. Non-participants' twins and participants' original locked twins in `twin_results` are never touched or modified.
- **Alone State Honesty:** If only 1 player participates, their twin remains unchanged with honest copy: *"Nobody else from your group played the tie-break. Your twin stays the same."*

### 2.4 Exact Copy Keys (`app_content`)
- `bonus.offer.title`: "Break the tie?"
- `bonus.offer.body`: "{{count}} people matched you. 3 quick extra questions can find the closest one. Totally optional."
- `bonus.result.narrowed`: "Tie-break: {{k}} of 3 matched with {{m}} of the {{n}} who played."
- `bonus.result.alone`: "Nobody else from your group played the tie-break. Your twin stays the same."
- `bonus.closed`: "This tie-break has ended."
- **Prohibited Copy:** No countdown timers, no "your twin is waiting", no urgency triggers (Rule 17).

---

## 3. F41 Badges Specification

### 3.1 Lane Collector Badge (Cumulative, Never Lost)
- **Earning Condition:** Awarded when a player earns a final verified twin in an `open` lane on a day with $\ge 200$ players and similarity $\ge `badge.min_similarity`$ (default 0.60).
- **Tiers:**
  - **Collector I:** `badge.tier1_lanes` (2) distinct open lanes.
  - **Collector II:** `badge.tier2_lanes` (3) distinct open lanes.
  - **Collector III:** `badge.tier3_lanes` (5) distinct open lanes.
  - **All-Lanes:** Every lane that was `open` on the day the player earned their final required lane twin.
- **Permanence:** Once earned, a badge is never revoked when new lanes open. New lanes render as new empty slots.

### 3.2 Super Twin Badge (Rare, Multiplicity)
- **Condition:** Earned when a player achieves a Super Twin (F38) across $\ge 2$ lanes with similarity $\ge 0.80$ within a rolling `badge.super_window_days` (7) window.
- **Multiplicity:** Re-earned each time the condition is met, displayed with a multiplier tag ("Super twin x3").

### 3.3 Privacy & Anti-Pressure Rules
- **Rule B5:** Badges are private to the user on `/me/badges`. No public showcases, leaderboards, or player comparisons.
- **Rule B6:** Badges cannot be purchased, boosted, or earned via grind. No nagging notifications.
- **Rule B7:** Every badge stores cryptographic evidence (`lane_ids`, `drop_ids`, `rule_version`). Badges on abusive accounts are revoked with an audit trail.

---

## 4. Technical Architecture, Schema & Routes

### 4.1 Relational Schema DDL
```sql
-- Evergreen Pool
CREATE TABLE IF NOT EXISTS bonus_pool_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  entropy NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lane_id, question_id)
);

-- Bonus Rounds
CREATE TABLE IF NOT EXISTS bonus_rounds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  drop_id TEXT NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  lane_id TEXT NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  tie_group_id TEXT NOT NULL,
  round_no INT NOT NULL DEFAULT 1,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  seed_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(drop_id, tie_group_id, round_no)
);

-- Bonus Answers Partitioned
CREATE TABLE IF NOT EXISTS bonus_answers (
  round_id TEXT NOT NULL REFERENCES bonus_rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  drop_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (round_id, user_id, question_id, drop_date)
) PARTITION BY RANGE (drop_date);

-- Bonus Results (Additive Outcome, Never Modifies twin_results)
CREATE TABLE IF NOT EXISTS bonus_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  round_id TEXT NOT NULL REFERENCES bonus_rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  closest_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  questions_matched INT NOT NULL DEFAULT 0, -- 0 to 3
  participants INT NOT NULL DEFAULT 0,
  is_mutual BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bonus_results_user ON bonus_results(user_id);

-- Collector Badge Registry & Collector Badges
CREATE TABLE IF NOT EXISTS collector_badge_definitions (
  key VARCHAR(50) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL,
  rule_version INT NOT NULL DEFAULT 1,
  copy_keys JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collector_badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collector_badge_key VARCHAR(50) NOT NULL REFERENCES collector_badge_definitions(key) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence JSONB NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  UNIQUE(user_id, collector_badge_key, tier)
);
CREATE INDEX IF NOT EXISTS idx_collector_badges_user ON collector_badges(user_id) WHERE revoked_at IS NULL;
```

### 4.2 Per-Route Policy Summary
| Route | Method | Timeout | Rate Limit | Cache Policy | Priority | Degradation |
|---|---|---|---|---|---|---|
| `/v1/bonus/:dropId` | GET | 2000 ms | 60/min | private, max-age=30 | 🟡 normal | Shed at L2+ |
| `/v1/bonus/:roundId/answers` | POST | 3000 ms | 20/min | no-store (req_id) | 🟠 high | Shed at L2+ |
| `/v1/bonus/:roundId/result` | GET | 2000 ms | 60/min | private, max-age=30 | 🟡 normal | Fallback to original twin |
| `/v1/me/collector-badges` | GET | 2000 ms | 60/min | private, max-age=60 | 🟡 normal | Cached memory response |

---

## 5. Configuration Keys Catalog
| Key | Type | Default | Purpose |
|---|---|---|---|
| `bonus.min_tie_size` | Integer | 2 | Minimum tie group size to trigger bonus offer |
| `bonus.questions_per_round` | Integer | 3 | Questions presented per bonus round |
| `bonus.max_rounds` | Integer | 2 | Max bonus rounds per Drop |
| `bonus.pool_min_per_lane` | Integer | 40 | Required pool questions before opening feature |
| `bonus.window_hours` | Integer | 24 | Round play window duration in hours |
| `bonus.retention_days` | Integer | 28 | Retention schedule for bonus responses |
| `bonus.min_participants` | Integer | 2 | Min active players to run rematch |
| `feature.bonus_rounds` | Boolean | false | Feature flag |
| `badge.min_similarity` | Float | 0.60 | Similarity threshold for lane twin badge |
| `badge.tier1_lanes` | Integer | 2 | Lanes for Collector I |
| `badge.tier2_lanes` | Integer | 3 | Lanes for Collector II |
| `badge.tier3_lanes` | Integer | 5 | Lanes for Collector III |
| `badge.super_window_days` | Integer | 7 | Rolling day window for Super Twin badge |
| `feature.badges` | Boolean | false | Feature flag |
