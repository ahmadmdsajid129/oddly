# Oddly Mathematical & Matching Engine Specification

**Document Version:** 1.0 (Stage B0 Baseline)  
**Target Audience:** Mathematicians, System Designers & Independent Verifiers  
**Purpose:** Formal specification, algorithmic definitions, worked numeric examples, and complexity bounds for every mathematical and scoring component in Oddly.

---

## 1. Information-Theoretic Weighting: $I(a)$

### 1.1 Purpose
Quantifies the rarity (surprisal in bits) of a player choosing option $a$. Rarer shared choices contribute higher weight to twin matching than consensus popular picks.

### 1.2 Location
- **File:** `packages/shared/src/scoring.ts` & `packages/shared/src/formats.ts`
- **Function:** `computeInformationWeight(count: number, total: number, weightCap?: number)`

### 1.3 Callers & Call Chain
```
POST /v1/answers (or batch matching job)
  └─ scoreCandidates()
       └─ computeInformationWeight()
```

### 1.4 Formula & Parameters
$$\hat{p}(a) = \frac{\text{count}(a) + 1}{N + K} \quad \text{(Laplace Smoothing)}$$
$$I(a) = \min\left(-\log_2(\hat{p}(a)), \; W_{\max}\right)$$
- When $N < 30$ (sparse sample): Uniform fallback $w = 1.0$.
- Parameter `match.weight_cap` ($W_{\max}$): Default `3.5` bits.
- $K$: Cardinality (number of options for the question).
- $N$: Total observed respondents for the question.

### 1.5 Inputs & Outputs
- **Inputs:** `count` $\in [0, N]$ (integer), `total` $N \ge 0$ (integer), `cardinality` $K \ge 2$ (integer).
- **Outputs:** $I(a) \in [0.0, 3.5]$ (64-bit IEEE float).
- **Edge cases:** If total $N = 0$, returns 1.0. If count $= 0$, Laplace smoothing ensures $\hat{p}(a) = \frac{1}{K} > 0$, preventing division by zero or $-\log_2(0) = \infty$.

### 1.6 Complexity & Scale
- **Time:** $O(1)$ constant time arithmetic.
- **Memory:** $O(1)$.

### 1.7 Determinism
100% deterministic pure function.

### 1.8 Worked Numeric Example
Suppose a 4-option question has received $N = 96$ answers:
- Option A count $= 60$ (popular)
- Option B count $= 3$ (rare)
- Cardinality $K = 4$

For Option A:
$$\hat{p}(A) = \frac{60 + 1}{96 + 4} = \frac{61}{100} = 0.61$$
$$I(A) = -\log_2(0.61) \approx 0.7131 \text{ bits}$$

For Option B:
$$\hat{p}(B) = \frac{3 + 1}{96 + 4} = \frac{4}{100} = 0.04$$
$$I(B) = \min(-\log_2(0.04), 3.5) = \min(4.6438, 3.5) = 3.5000 \text{ bits (clamped)}$$

### 1.9 Test Coverage
- `packages/shared/src/scoring.test.ts` (`computeInformationWeight handles edge cases, zero count, and cap`).
- `packages/shared/src/formats.test.ts` (`information content weighting respects cap and Laplace smoothing`).

---

## 2. Per-Format Pairwise Similarity: $s_k(u, v)$

### 2.1 Purpose
Computes the normalized degree of agreement between player $u$ and player $v$ on question $k$, bounded strictly in $[0, 1]$.

### 2.2 Location
- **File:** `packages/shared/src/formats.ts` & `packages/shared/src/scoring.ts`
- **Functions:**
  - `computePick1Similarity(a, b)`
  - `computePick2Of6Similarity(a, b)`
  - `computeRank3Similarity(a, b)`
  - `computeSlider7Similarity(a, b)`

### 2.3 Callers & Call Chain
```
scoring.ts: calculatePairwiseSimilarity()
  └─ formats.ts: computeFormatSimilarity(q.format, ansU, ansV)
```

### 2.4 Formulas
1. **Single-Choice (`pick1` / `text` / `image` / `meme`):**
   $$s(u, v) = \begin{cases} 1.0 & \text{if } a_u = a_v \\ 0.0 & \text{if } a_u \neq a_v \end{cases}$$

2. **Multi-Selection (`pick2of6`):** Jaccard index on selected sets $A_u, A_v$:
   $$s(u, v) = \frac{|A_u \cap A_v|}{|A_u \cup A_v|}$$
   Since $|A_u| = |A_v| = 2$:
   - If 2 shared: $s = \frac{2}{2} = 1.0$
   - If 1 shared: $s = \frac{1}{3} \approx 0.3333$
   - If 0 shared: $s = \frac{0}{4} = 0.0$

3. **Ranking (`rank3`):** Normalized Kendall Tau distance over $M = 3$ items ($\binom{3}{2} = 3$ pairs):
   $$s(u, v) = 1.0 - \frac{\text{discordant pairs}}{3}$$
   - Discordant pairs $\in \{0, 1, 2, 3\}$, so $s \in \{1.0, 0.6667, 0.3333, 0.0\}$.

4. **Continuous Spectrum (`slider7`):** Normalized Manhattan metric on $\{1, 2, 3, 4, 5, 6, 7\}$:
   $$s(u, v) = 1.0 - \frac{|x_u - x_v|}{6}$$
   - Maximum difference is $7 - 1 = 6$. Difference 0 gives 1.0; difference 6 gives 0.0.

### 2.5 Inputs & Outputs
- Inputs: Formatted user answers (strings, string arrays, or integers in $[1, 7]$).
- Outputs: $s \in [0.0, 1.0]$.
- Reflexivity: $s(u, u) = 1.0$.
- Symmetry: $s(u, v) = s(v, u)$.

### 2.6 Worked Numeric Example
Player $u$ answers:
- `slider7`: 2
- `rank3`: `["coffee", "tea", "water"]`
- `pick2of6`: `["samosa", "chai"]`

Player $v$ answers:
- `slider7`: 5 $\implies s = 1.0 - \frac{|2 - 5|}{6} = 1.0 - \frac{3}{6} = 0.5000$
- `rank3`: `["coffee", "water", "tea"]` $\implies 1$ discordant pair (tea vs water) $\implies s = 1.0 - \frac{1}{3} = 0.6667$
- `pick2of6`: `["samosa", "vada"]` $\implies 1$ shared item $\implies s = \frac{1}{3} = 0.3333$

---

## 3. Drop Similarity Aggregation: $S(u, v)$

### 3.1 Purpose
Calculates overall Drop similarity between two players across all mutually answered questions.

### 3.2 Location
- **File:** `packages/shared/src/scoring.ts`
- **Function:** `calculateDropSimilarity(answersU, answersV, questionWeights)`

### 3.3 Formula
$$S(u, v) = \frac{\sum_{k \in Q_{uv}} w_k \cdot s_k(u, v)}{\sum_{k \in Q_{uv}} w_k}$$
Where $w_k = I(a_{u, k})$ and $Q_{uv}$ is the set of valid questions answered by both players.
- If $|Q_{uv}| < \text{match.min_questions_compared}$ (default 3), $S(u, v) = 0.0$.

### 3.4 Properties
- Normalized: $S(u, v) \in [0.0, 1.0]$.
- Bounded and symmetric: $S(u, v) = S(v, u)$.

---

## 4. 4-Stage Hierarchical Tie-Breaker: $W(u, v)$

### 4.1 Purpose
Breaks ties between multiple candidates who achieve the highest Drop similarity within $\epsilon = 0.01$.

### 4.2 Location
- **File:** `packages/shared/src/tie-breaker.ts`
- **Function:** `computeCompositeWeight(candidate, u, dropId, secret)`

### 4.3 Formula
$$W(u, v) = S(u, v) + 0.1 \cdot H(u, v) + 0.01 \cdot \mathbb{I}(\text{country}_u \neq \text{country}_v) + 0.001 \cdot \text{HashTie}(u, v)$$
Where:
1. **Stage 1 ($S(u, v)$):** Primary drop similarity $\in [0, 1]$.
2. **Stage 2 ($H(u, v)$):** Trailing 28-day BitMinHash history agreement $\in [0, 1]$ (requires $\ge 5$ shared days).
3. **Stage 3 ($\mathbb{I}$):** Cross-cultural bonus ($1.0$ if countries differ, $0.0$ if identical).
4. **Stage 4 ($\text{HashTie}$):** Normalized HMAC-SHA256 tiebreak:
   $$\text{HashTie}(u, v) = \frac{\text{HMAC-SHA256}(K_{\text{secret}}, \; \text{drop\_id} \parallel \min(u, v) \parallel \max(u, v)) \pmod{10^6}}{10^6}$$

---

## 5. Mutual Pairing Engine

### 5.1 Purpose
Produces symmetric pairings where if Alice is Bob's twin, Bob is Alice's twin ($is\_mutual = true$), while running in near-linear time on large populations.

### 5.2 Location
- **File:** `packages/shared/src/mutual-pairing.ts`
- **Function:** `greedyMutualPairing(candidatesPerPlayer)`

### 5.3 Algorithm
1. Each player $u$ generates candidate list of size at most $K = 32$.
2. Construct candidate graph $G = (V, E)$ where undirected edge $e = \{u, v\}$ has weight $W(u, v) = \max(W(u \to v), W(v \to u))$.
3. Sort all $|E| \le N \cdot K$ unique edges descending by $W(e)$.
4. Greedily match edge $\{u, v\}$ if neither $u$ nor $v$ has been matched yet. Set `is_mutual = true`.
5. For any remaining unpaired vertex (e.g. odd graph size or disconnected), assign its best available non-mutual candidate and set `is_mutual = false`.

### 5.4 Complexity
- Number of edges $|E| \le 32 N$.
- Sorting edges: $O(32 N \log(32 N)) = O(N \log N)$.
- Traversal & matching: $O(N)$ with Set lookups.
- Total runtime: $< 50$ ms for $N = 10,000$ players.

---

## 6. Verification Results (`pnpm verify:matching`)
- Invariant: Zero self-matching.
- Invariant: 100% symmetry for mutual pairs.
- Invariant: BitMinHash reflexivity $H(u, u) = 1.0$.
- Invariant: Determinism across identical seeds.
