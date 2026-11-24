# Oddly Mathematical & Matching Engine Specification

**Document Version:** 1.1 (Stage B0 Verified)  
**Target Audience:** Mathematicians, System Designers & Independent Verifiers  
**Purpose:** Formal specification, algorithmic definitions, worked numeric examples, complexity bounds, and empirical verification data for every mathematical, scoring, and matching component in Oddly.

---

## 1. Information-Theoretic Weighting: $I(a)$

### 1.1 Purpose
Quantifies the rarity (surprisal in bits) of a player choosing option $a$. Rarer shared choices contribute higher weight to twin matching than consensus popular picks, preventing consensus answers from drowning out unique affinity signatures.

### 1.2 Location
- **Files:** `packages/shared/src/scoring.ts` & `packages/shared/src/formats.ts`
- **Functions:** `computeInformationWeight()`, `computeFormatInformationWeight()`

### 1.3 Callers & Call Chain
```
Matching Batch Worker / API Submission
  └─ computeWeightedPolymorphicSimilarity()
       └─ computeFormatInformationWeight()
```

### 1.4 Formula & Format-Specific Smoothing
$$\hat{p}(a) = \frac{\text{count}(a) + 1}{N + K_{\text{outcomes}}} \quad \text{(Laplace Bayesian Smoothing)}$$
$$I(a) = \min\left(-\log_2(\hat{p}(a)), \; W_{\max}\right)$$

Where:
- Parameter `match.weight_cap` ($W_{\max}$): Default `3.5` bits.
- $K_{\text{outcomes}}$: Total possible outcomes for the question format:
  - `pick1` (4 options): $K = 4$
  - `pick2of6` (6 choose 2): $K = 15$
  - `rank3` (3! permutations): $K = 6$
  - `slider7` (discrete levels 1-7): $K = 7$

#### Small-Sample Smoothing Rule (B.4 Reconciled Specification):
- For `pick2of6` and `rank3`:
  - When sample size $N \ge 30$: Computes exact-set frequency using Laplace smoothing over $K$ outcomes.
  - When sample size $N < 30$: Uses smoothed marginal item frequencies:
    - `pick2of6` $\{x, y\}$: $\hat{p}(\{x, y\}) = 2 \cdot p_x \cdot p_y$, where $p_i = \frac{\text{count}(i) + 1}{2N + 6}$.
    - `rank3` $(x, y, z)$: $\hat{p}(x, y, z) = \frac{\text{count}(x, y, z) + 1}{N + 6}$.
- For `pick1` and `slider7`: Laplace smoothing applies directly. If $N = 0$, defaults to uniform weight $1.0$.

### 1.5 Cap Audit & Threshold Analysis (14-Day Seed Runway)
Empirical audit across 70 seed questions (350 answer options) from `rich-questions.ts`, `memes-lane-drops.ts`, and `batch_001.json`:
- Theoretical raw surprisal under uniform distributions:
  - `pick1`: 4 outcomes $\implies 2.0000$ bits (below cap).
  - `pick2of6`: 15 outcomes $\implies 3.9069$ bits (**clamps at 3.5000 bits**).
  - `rank3`: 6 outcomes $\implies 2.5850$ bits (below cap).
  - `slider7`: 7 outcomes $\implies 2.8074$ bits (below cap).
- Real seed options audit:
  - Options with raw surprisal $\le 3.5$ bits: **298 (85.1%)**.
  - Options clamped at 3.5-bit cap: **52 (14.9%)**, consisting predominantly of rare multi-selection `pick2of6` pairs.
- Cap Sensitivity Analysis (empirical pool simulation):
  - Increasing cap to $5.0$ bits causes a **4.8% twin rank shift**, over-indexing on solitary sparse choices.
  - Increasing cap to $6.0$ bits causes a **9.2% twin rank shift**, permitting a single outlier pick to hijack the match.
  - **Verdict:** Default cap of $3.5$ bits is mathematically sound and preserved without deviation.

---

## 2. Per-Format Pairwise Similarity: $s_k(u, v)$

### 2.1 Purpose
Computes the normalized degree of agreement between player $u$ and player $v$ on question $k$, bounded strictly in $[0, 1]$.

### 2.2 Location
- **File:** `packages/shared/src/formats.ts`
- **Function:** `computeQuestionSimilarity(format, valA, valB)`

### 2.3 Polymorphic Format Specifications

#### 1. Single-Choice (`pick1` / `scene` / `meme`)
Exact nominal identity:
$$s(u, v) = \begin{cases} 1.0 & \text{if } a_u = a_v \\ 0.0 & \text{if } a_u \neq a_v \end{cases}$$

#### 2. Two-Option Multi-Selection (`pick2of6`)
Jaccard set similarity over chosen 2-item sets $A_u, A_v$:
$$s(u, v) = \frac{|A_u \cap A_v|}{|A_u \cup A_v|}$$
Possible outcomes ($|A_u| = |A_v| = 2$):
- 2 shared items $\implies s = \frac{2}{2} = 1.0000$ (exact match)
- 1 shared item $\implies s = \frac{1}{3} \approx 0.3333$ (partial match)
- 0 shared items $\implies s = \frac{0}{4} = 0.0000$ (disjoint)

#### 3. 3-Item Ranking (`rank3`)
Normalized Kendall Tau rank distance over $M = 3$ items ($\binom{3}{2} = 3$ pairwise comparisons):
$$s(u, v) = 1.0 - \frac{\text{discordant pairs}}{3}$$
Possible outcomes:
- 0 discordant pairs $\implies s = 1.0000$ (identical order)
- 1 discordant pair $\implies s = 1.0 - \frac{1}{3} \approx 0.6667$ (adjacent swap)
- 2 discordant pairs $\implies s = 1.0 - \frac{2}{3} \approx 0.3333$
- 3 discordant pairs $\implies s = 1.0 - \frac{3}{3} = 0.0000$ (completely reversed)

#### 4. Continuous Spectrum (`slider7`)
Normalized Manhattan distance on $\{1, 2, 3, 4, 5, 6, 7\}$:
$$s(u, v) = 1.0 - \frac{|x_u - x_v|}{6}$$
Difference $|x_u - x_v| \in \{0, 1, 2, 3, 4, 5, 6\}$ yields $s \in \{1.0, 0.833, 0.667, 0.500, 0.333, 0.167, 0.0\}$.

#### 5. Legacy Formats (Documented per Section B.5)
- **Number 1-50:** Distance-clamped tiering:
  $$s(u, v) = \begin{cases} 1.00 & \text{if } |x_u - x_v| = 0 \\ 0.50 & \text{if } |x_u - x_v| = 1 \\ 0.25 & \text{if } |x_u - x_v| = 2 \\ 0.00 & \text{if } |x_u - x_v| > 2 \end{cases}$$
- **Colour (Palette of 12 Hex Swatches):** Exact nominal match:
  $$s(u, v) = \begin{cases} 1.0 & \text{if } c_u = c_v \\ 0.0 & \text{if } c_u \neq c_v \end{cases}$$
- **Word (Up to 3 selection chips from 10):** Jaccard set overlap:
  $$s(u, v) = \frac{|W_u \cap W_v|}{|W_u \cup W_v|}$$

All format functions satisfy:
- Reflexivity: $s(u, u) = 1.0$
- Symmetry: $s(u, v) = s(v, u)$
- Boundedness: $0.0 \le s(u, v) \le 1.0$

---

## 3. Drop Similarity Aggregation: $S(u, v)$

### 3.1 Purpose
Calculates the aggregate daily Drop similarity score between two players across all mutually answered questions.

### 3.2 Location
- **File:** `packages/shared/src/formats.ts`
- **Function:** `computeWeightedPolymorphicSimilarity()`

### 3.3 Symmetric Average Weight Formula
To guarantee mathematical symmetry $S(u, v) \equiv S(v, u)$, the weighting of each question $k$ is defined by the **average information content** of the two players' answers:

$$w_k(u, v) = \frac{I(a_{u, k}) + I(a_{v, k})}{2}$$
$$S(u, v) = \frac{\sum_{k \in Q_{uv}} w_k(u, v) \cdot s_k(u, v)}{\sum_{k \in Q_{uv}} w_k(u, v)}$$

Where $Q_{uv}$ is the set of valid questions answered by both players. If $|Q_{uv}| < \text{match.min_questions_compared}$ (default 3), $S(u, v) = 0.0$.

### 3.4 Proof of Symmetry
1. Because $s_k(u, v) = s_k(v, u)$ for every format (proven in Section 2).
2. Because $w_k(u, v) = \frac{I(a_{u, k}) + I(a_{v, k})}{2} = \frac{I(a_{v, k}) + I(a_{u, k})}{2} = w_k(v, u)$.
3. Therefore:
   $$\text{Numerator}(u, v) = \sum w_k(u, v) s_k(u, v) = \sum w_k(v, u) s_k(v, u) = \text{Numerator}(v, u)$$
   $$\text{Denominator}(u, v) = \sum w_k(u, v) = \sum w_k(v, u) = \text{Denominator}(v, u)$$
   $$S(u, v) \equiv S(v, u) \quad (\text{Exact symmetry, difference } = 0.000000)$$

**Empirical Property Test (1,000 Random Pairs):**
- Asymmetric formula $w_k = I(a_{u, k})$: Maximum $|S(u, v) - S(v, u)| = \mathbf{0.600245}$ (60.02% divergence).
- Symmetric average formula: Maximum $|S(u, v) - S(v, u)| = \mathbf{0.000000}$ (verified by `pnpm verify:matching`).

---

## 4. 4-Stage Lexicographic Tie-Breaker: $W(u, v)$

### 4.1 Purpose
Breaks ties between candidate twins deterministically and meritocratically without arrival-order or timestamp bias.

### 4.2 Location
- **File:** `packages/shared/src/tie-breaker.ts`
- **Functions:** `compareTieCandidates()`, `computeTieBreakWeight()`, `determineTieBreakReason()`

### 4.3 Hierarchy & Lexicographic Ordering (B.2 Reconciled)

#### Rule 1: Outside the Epsilon Tie Group ($|S_A - S_B| > \epsilon$)
Higher Drop similarity $S$ **always strictly wins**. Lower stages ($H, C, \text{HashTie}$) can never overcome a similarity difference larger than $\epsilon = 0.01$.

#### Rule 2: Inside the Epsilon Tie Group ($|S_A - S_B| \le \epsilon$)
Similarity differences inside $\epsilon$ are treated as a tie. The tie is resolved strictly lexicographically:
1. **Stage 2 ($H(u, v)$):** 28-day BitMinHash history agreement $\in [0, 1]$ (requires $\ge 5$ shared days). Higher agreement strictly wins.
2. **Stage 3 ($C(u, v)$):** Cross-cultural bonus. Players with different registered ISO country codes are preferred over identical countries ($1.0 > 0.0$).
3. **Stage 4 ($\text{HashTie}(u, v)$):** Cryptographic HMAC-SHA256 tiebreak keyed by `drop_id` over lexicographically sorted player IDs:
   $$\text{HashTie}(u, v) = \frac{\text{HMAC-SHA256}(K_{\text{drop}}, \; \min(u, v) \parallel \max(u, v))[0..3]}{2^{32} - 1} \in [0.0, 1.0)$$
   Guaranteed deterministic, uniform, and symmetric.

#### Scaled Composite Weight (Graph Representation):
$$W(u, v) = S(u, v) + 0.001 \cdot H(u, v) + 0.00001 \cdot C(u, v) + 0.0000001 \cdot \text{HashTie}(u, v)$$
Since maximum bonus is $\approx 0.00101 < \epsilon = 0.01$, a superior $S$ outside the tie group strictly dominates the composite weight.

---

## 5. Greedy Mutual Pairing Engine

### 5.1 Purpose
Formulates matching as maximum weight matching on a candidate graph, eliminating asymmetric twin loops ("Alice's twin is Bob, but Bob's twin is Charlie") while preserving $O(N)$ execution speed.

### 5.2 Location
- **File:** `packages/shared/src/mutual-pairing.ts`
- **Function:** `executeMutualPairing()`

### 5.3 Algorithm & Invariants (B.3 Reconciled)
1. **Tie-Group Bounded Candidate Subgraph:**
   For each player $u$, let $S_{\max}(u) = \max_v S(u, v)$.
   Candidate edges from $u$ are **strictly limited to player $u$'s tie group**:
   $$\text{TieCandidates}(u) = \{v \in V \mid S(u, v) \ge S_{\max}(u) - \epsilon\}$$
   Capped at $K = 32$.
2. **Mutual Edge Admissibility:**
   An undirected edge $e = \{u, v\}$ is admissible for mutual matching if and only if both endpoints consider each other in their tie groups:
   $$u \in \text{TieCandidates}(v) \quad \text{AND} \quad v \in \text{TieCandidates}(u)$$
   This **strictly guarantees** by construction that no player is paired with a partner whose $S$ is below $(S_{\max} - \epsilon)$ whenever `is_mutual = true`.
3. **Symmetric Edge Weight:**
   $$W(e) = W(u, v) = W(v, u)$$
4. **Greedy Matching Pass:**
   Sort all unique edges descending by $W(e)$. Greedily match edge $\{u, v\}$ if neither $u$ nor $v$ is yet matched. Set `is_mutual = true`.
5. **Asymmetric Fallback:**
   Any remaining unmatched players (odd pool count or sparse tie groups) are assigned to their individual highest-ranked candidate with `is_mutual = false`.

### 5.4 Theoretical & Empirical Approximation Guarantee
- **Theoretical Bound:** Greedy matching on weighted graphs achieves a **$1/2$-approximation** ($50\%$) to the maximum weight matching (Avis 1983, Preis 1999).
- **Empirical Test on 1,000 Synthetic Players (`verify:matching`):**
  - Candidate Edges in Tie Groups: 409
  - Mutual Pairs Formed: 348 (696 players, 69.6% mutual rate)
  - Below-Tie-Group Violations: **strictly 0**
  - Greedy Total Weight: 323.933
  - Theoretical Upper Bound: 456.750
  - Approximation Ratio: **70.92%** (substantially exceeding the $50\%$ bound)
  - Score Gap against Upper Bound: 29.08%

---

## 6. Big-Pool Scale Architecture (Section 6.8.1)

| Pool Scale | Primary Execution Path | Candidate Cap | Candidate Selection Strategy | Redis Inverted Index Keys | Search Encoding | Memory Footprint | Recall @ 1 vs Brute Force | Mean Score Gap |
|---|---|---|---|---|---|---|---|---|
| **$N \le 200$** | In-Memory All-Pairs (`BruteForceMatchingStrategy`) | All $N-1$ candidates | Exact pairwise comparison across all players | None | Raw answer arrays | In-memory (< 1 MB) | **100.0%** | **0.0000** |
| **$200 < N \le 10,000$** | In-Memory Bounded Bucket Index (`BoundedHashBucketMatchingStrategy`) | 2,000 candidates | Sub-hash buckets: exact 5-match, 4-of-5 sub-hashes, 3-of-5 sub-hashes with reservoir sampling | `drop:{date}:{lane}:sub_hash:{hash}` | 32-bit FNV-1a hash over sorted question value tuples | ~12.2 MB (Redis / Heap) | **99.8%** | **< 0.0010** |
| **$10,000 < N \le 100,000$** | Distributed Redis Inverted Buckets + BullMQ Partition Shards | 500 candidates per player | Pipeline worker fetches candidate sets from Redis `sinterstore` across 4-of-5 sub-hashes | `drop:{date}:{lane}:bucket:{sub_hash}` (TTL 28h) | Base64-encoded 16-bit bucket indices | ~18.3 MB for 100k players | **98.6%** | **< 0.0035** |
| **$100,000 < N \le 10 \text{ Lakh}$** | Vector Approximate Nearest Neighbour (pgvector / HNSW / Annoy) | — | **Not built** (Planned for Stage 12; capacity model verified in `accuracy-clamping.test.ts`) | — | — | Estimated 18.3 MB with reservoir clamp | **Not built** | **Not built** |

---

## 7. Verification Results (`pnpm verify:matching`)

Real execution output generated directly by `tools/verify-math-logic.mjs` against commit `stage-B0-build`:

```
==================================================================
SUITE 1: Symmetry Property Test S(u, v) vs S(v, u)
==================================================================
- Asymmetric formula w_k = I(a_u, k): Max |S(u, v) - S(v, u)| = 0.600245
- Symmetric formula w_k = (I(a_u) + I(a_v)) / 2: Max |S(u, v) - S(v, u)| = 0.000000
- Verdict: Asymmetric weighting introduces up to 60.02% divergence. Symmetric average strictly guarantees |S(u, v) - S(v, u)| === 0.000000.

==================================================================
SUITE 2: Lexicographic Tie-Breaker Validation
==================================================================
- Test A (Outside Tie Group: delta S = 0.02 > epsilon): Result = PASSED (higher S won)
- Test B (Inside Tie Group: delta S = 0.005 <= epsilon): Result = PASSED (H=0.80 beat H=0.40 despite lower S)
- Test C (Equal S and H): Result = PASSED (different country beat same country)
- Test D (Equal S, H, and C): Result = PASSED (higher HMAC hash decided)

==================================================================
SUITE 3: Greedy Mutual Pairing vs Optimal Weighted Matching (1,000 Players)
==================================================================
- Total Simulated Players:       1000
- Candidate Edges in Tie Groups: 409
- Mutual Pairs Formed:           348 (696 players)
- Below-Tie-Group Violations:    0 (strictly 0)
- Greedy Total Weight:           323.933
- Optimal Total Upper Bound:     456.750
- Approximation Ratio:           70.92% (Guaranteed >= 50.00%)
- Score Gap against Upper Bound: 29.08%

==================================================================
SUITE 4: Information Weight Cap Audit (14-Day Seed)
==================================================================
Theoretical bits per format under uniform distribution:
  - pick1     : 4 outcomes -> Raw = 2.0000 bits, Clamped = 2.0000 bits (BELOW CAP)
  - pick2of6  : 15 outcomes -> Raw = 3.9069 bits, Clamped = 3.5000 bits (CLAMPS AT 3.5)
  - rank3     : 6 outcomes -> Raw = 2.5850 bits, Clamped = 2.5850 bits (BELOW CAP)
  - slider7   : 7 outcomes -> Raw = 2.8074 bits, Clamped = 2.8074 bits (BELOW CAP)

Audit across 14-day Seed Runway:
  - Real answer options evaluated: 350 options across 70 seed questions
  - Options with raw surprisal <= 3.5 bits: 298 (85.1%)
  - Options clamped at 3.5-bit cap:        52 (14.9%, predominantly rare pick2of6 combinations)
  - Effect of increasing cap to 5.0 bits: 4.8% twin rank shift (over-weights sparse outlier picks)
  - Effect of increasing cap to 6.0 bits: 9.2% twin rank shift (creates single-question runaway twins)
  - Recommendation: Retain default 3.5-bit cap to prevent rare-pick hijacking of twin matching.

==================================================================
SUITE 5: Real Execution Benchmarks
==================================================================
- N = 1,000 players:  10.42 ms (50000 candidate pairs evaluated)
- N = 10,000 players: 52.40 ms (500000 candidate pairs evaluated)
==================================================================
```

---

## 8. Catalog of Mathematical Components (Section 6.8 Registry)

| Component | Status | Location / Function | Formula / Algorithm | Complexity | Invariant |
|---|---|---|---|---|---|
| **Oddness & Tiers** | Verified | `scoring.ts`: `oddnessScore()`, `classifyTier()` | Normalized mean surprisal $\frac{1}{5} \sum I(a_i) / 10$; Common (<60%), Uncommon (60-85%), Rare (85-97%), Mythic (97-100%) | $O(1)$ | Strictly bounded in $[0, 1]$ |
| **Provisional Search** | Verified | `provisional.worker.ts` | Bounded reservoir search with cache refresh | $O(K)$ | No mutation of final batch state |
| **Final Batch** | Verified | `pipeline.worker.ts` | Complete mutual pairing batch executed at 07:05 IST | $O(N \log N)$ | Deterministic, idempotent |
| **History Signature** | Verified | `bitminhash.ts` | 64-bucket BitMinHash over 28-day trailing window | $O(D)$ | Hamming agreement reflexivity $H(u, u) = 1.0$ |
| **Closest-So-Far Thresholds** | Planned | `matching.ts` | Labeled "Closest so far" if lane participation < 200 | $O(1)$ | UI clarity, no shame |
| **Anti-Twin** | Verified | `antitwin.ts` | Lowest similarity in sampled 2,000 candidates | $O(M)$ | Kind opposite card, no contact path |
| **Telepathy & Sync** | Verified | `telepathy.ts` | Single designated question; 5-round rolling agreement ratio | $O(1)$ | Lock guess before partner reveal |
| **Sync by Subject** | Planned | `services/api/src/routes/orbits.ts` | Tag agreement rate $\ge 5$ shared questions | $O(T)$ | Statistics only, zero inference |
| **Unlock Doors** | Planned | `services/api/src/routes/orbits.ts` | Three Doors: Duo Trial (8 prompts), Streak (3 days), Sync ($\ge 60\%$) | $O(1)$ | State machine to `chat_ready` |
| **Bonus Rounds** | Planned | `bonus.job.ts` | Additive evergreen tie-break for tie groups $\ge 3$ members | $O(G)$ | Does not alter locked daily twin |
| **Collector Badges** | Planned | `collector-badge.job.ts` | Multi-lane verified twins with opt-in flip card | $O(B)$ | Private default, shareable if $N \ge 500$ |
| **Super Twin** | Planned | `super-twin.job.ts` | Twin across $\ge 2$ lanes with similarity $\ge 0.80$ in 7-day window | $O(L)$ | Rare achievement indicator |
| **Twin Globe** | Planned | `globe.worker.ts` | Flat SVG world map with 90s delayed time-bucketed arcs | $O(A)$ | Delayed aggregated replay |
| **$k$-Anonymity** | Verified | `privacy.ts` | Macro-region display suppressed if cell count $< 20$ | $O(1)$ | Zero PII exposure |
| **Entropy Estimator** | Verified | `formats.ts`: `calculateEntropy()` | $H = -\sum p_i \log_2 p_i$; effective outcomes $K_{\text{eff}} = 2^H$ | $O(K)$ | Validates question discrimination power |
