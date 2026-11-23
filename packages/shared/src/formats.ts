/**
 * @file formats.ts
 * @package @oddly/shared
 *
 * Richer Answer Formats (Stage L2 / Phase 10M / Tasks P10M.01 - P10M.06).
 *
 * Implements:
 * 1. Format-specific similarity scoring functions (sq) with mathematical proofs:
 *    - pick1 & scene: Exact equality (0 or 1)
 *    - pick2of6: Jaccard set similarity |A ∩ B| / |A ∪ B| (0, 1/3, 1)
 *    - rank3: Normalized Kendall Tau distance 1 - (d_K / 3) (0, 1/3, 2/3, 1)
 *    - slider7: Normalized Manhattan metric 1 - (|v1 - v2| / 6) (0, 1/6, ..., 1)
 * 2. Information content weighting I(a) with 3.5-bit cap and Laplace smoothing.
 * 3. Entropy and tie-risk estimator utility functions (Shannon H, effective outcomes, birthday collision risk).
 */

import type { QuestionFormat } from "./types.js";

// ---------------------------------------------------------------------------
// 1. Format-Specific Similarity Functions (P10M.02)
//
// Invariants guaranteed by all functions:
// - Symmetry: s(x, y) === s(y, x)
// - Boundedness: 0.0 <= s(x, y) <= 1.0
// - Identity / Reflexivity: s(x, x) === 1.0
// - Monotonicity: greater divergence produces strictly lower or equal similarity
// ---------------------------------------------------------------------------

/**
 * Format 1: pick1 (Single-choice equality)
 * @returns 1.0 if both chose the same option, 0.0 otherwise.
 */
export function pick1Similarity(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): number {
  if (a == null || b == null) return 0.0;
  return String(a) === String(b) ? 1.0 : 0.0;
}

/**
 * Format 5: scene (Reaction card equality)
 * @returns 1.0 if identical card value chosen, 0.0 otherwise.
 */
export function sceneSimilarity(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return pick1Similarity(a, b);
}

/**
 * Format 2: pick2of6 (Two-Option Multi-Selection)
 * Computes Jaccard set similarity between two 2-item sets A and B:
 *   s(A, B) = |A ∩ B| / |A ∪ B|
 *
 * Outcomes:
 *   - 2 in common -> 2 / 2 = 1.0 (Exact match)
 *   - 1 in common -> 1 / 3 ≈ 0.3333333333333333 (Partial match)
 *   - 0 in common -> 0 / 4 = 0.0 (Disjoint)
 */
export function pick2of6Similarity(
  a: string[] | readonly string[] | null | undefined,
  b: string[] | readonly string[] | null | undefined
): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0.0;

  const setA = new Set(a.map(String));
  const setB = new Set(b.map(String));

  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  if (unionSize <= 0) return 1.0;

  const similarity = intersectionCount / unionSize;
  return Math.max(0.0, Math.min(1.0, similarity));
}

/**
 * Format 3: rank3 (Ordered 3-Item Ranking)
 * Computes normalized Kendall Tau distance on permutations of 3 items:
 *   s(R1, R2) = 1 - (d_K(R1, R2) / 3)
 * where d_K is the number of discordant pairs (inversions) in {0, 1, 2, 3}.
 *
 * Outcomes:
 *   - d_K = 0 -> 1.0 (Identical order)
 *   - d_K = 1 -> 2/3 ≈ 0.6666666666666666 (One adjacent swap)
 *   - d_K = 2 -> 1/3 ≈ 0.3333333333333333 (Two swaps)
 *   - d_K = 3 -> 0.0 (Complete reversal)
 */
export function rank3Similarity(
  r1: string[] | readonly string[] | null | undefined,
  r2: string[] | readonly string[] | null | undefined
): number {
  if (!r1 || !r2 || r1.length < 3 || r2.length < 3) return 0.0;

  // Build index lookup for position in r2
  const pos2 = new Map<string, number>();
  for (let i = 0; i < r2.length; i++) {
    pos2.set(String(r2[i]), i);
  }

  // Count inversions between all pairs (i < j in r1)
  let discordantCount = 0;
  let totalPairs = 0;

  for (let i = 0; i < 3; i++) {
    const itemI = String(r1[i]);
    const pos2I = pos2.get(itemI);
    if (pos2I === undefined) continue;

    for (let j = i + 1; j < 3; j++) {
      const itemJ = String(r1[j]);
      const pos2J = pos2.get(itemJ);
      if (pos2J === undefined) continue;

      totalPairs++;
      // In r1, itemI precedes itemJ (i < j). If in r2, pos2I > pos2J, it's discordant.
      if (pos2I > pos2J) {
        discordantCount++;
      }
    }
  }

  if (totalPairs === 0) return 0.0;
  // Maximum discordance for 3 items is 3
  const maxDiscordance = 3;
  const score = 1.0 - discordantCount / maxDiscordance;
  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Format 4: slider7 (Discrete 7-Point Spectrum)
 * Computes normalized Manhattan metric on integer continuum {1, 2, 3, 4, 5, 6, 7}:
 *   s(v1, v2) = 1 - (|v1 - v2| / 6)
 *
 * Outcomes:
 *   - |v1 - v2| = 0 -> 1.0 (Identical)
 *   - |v1 - v2| = 1 -> 5/6 ≈ 0.8333 (Adjacent)
 *   - |v1 - v2| = 2 -> 4/6 ≈ 0.6667
 *   - |v1 - v2| = 3 -> 3/6 = 0.5000 (Moderate divergence)
 *   - |v1 - v2| = 4 -> 2/6 ≈ 0.3333
 *   - |v1 - v2| = 5 -> 1/6 ≈ 0.1667
 *   - |v1 - v2| = 6 -> 0.0 (Polar opposites)
 */
export function slider7Similarity(
  v1: number | string | null | undefined,
  v2: number | string | null | undefined
): number {
  if (v1 == null || v2 == null) return 0.0;
  const num1 = typeof v1 === "number" ? v1 : parseInt(String(v1), 10);
  const num2 = typeof v2 === "number" ? v2 : parseInt(String(v2), 10);

  if (isNaN(num1) || isNaN(num2)) return 0.0;

  // Clamp to [1, 7]
  const clamped1 = Math.max(1, Math.min(7, num1));
  const clamped2 = Math.max(1, Math.min(7, num2));

  const diff = Math.abs(clamped1 - clamped2);
  const score = 1.0 - diff / 6.0;
  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Universal polymorphic question similarity evaluator.
 * Dispatches to the exact format function.
 */
export function computeQuestionSimilarity(
  format: QuestionFormat | string,
  valA: unknown,
  valB: unknown
): number {
  switch (format) {
    case "pick2of6":
      return pick2of6Similarity(valA as string[], valB as string[]);
    case "rank3":
      return rank3Similarity(valA as string[], valB as string[]);
    case "slider7":
      return slider7Similarity(valA as number, valB as number);
    case "scene":
      return sceneSimilarity(valA as string, valB as string);
    case "say_it":
      // Fallback for Gate G4 until semantic embeddings pipeline is active
      return pick1Similarity(valA as string, valB as string);
    case "pick1":
    default:
      if (Array.isArray(valA) && Array.isArray(valB)) {
        // Multi-word chips fallback
        return pick2of6Similarity(valA as string[], valB as string[]);
      }
      return pick1Similarity(valA as string | number, valB as string | number);
  }
}

// ---------------------------------------------------------------------------
// 2. Information Content Weighting with 3.5-bit Cap (P10M.03)
// ---------------------------------------------------------------------------

/** Cap on information content bits per question to prevent single-answer hijacking */
export const MAX_WEIGHT_BITS = 3.5;

/** Total possible distinct outcomes for each format */
export function formatOutcomesCount(format: QuestionFormat | string, numOptions?: number): number {
  switch (format) {
    case "pick2of6":
      return 15; // 6 choose 2
    case "rank3":
      return 6; // 3!
    case "slider7":
      return 7;
    case "scene":
      return numOptions && numOptions >= 3 && numOptions <= 5 ? numOptions : 4;
    case "say_it":
      return 50; // open archetype bin estimation
    case "pick1":
    default:
      return numOptions && numOptions >= 2 ? numOptions : 3;
  }
}

/**
 * Laplace Bayesian smoothing for answer frequency:
 *   p_hat(a) = (count(a) + 1) / (N + K_outcomes)
 */
export function calculateSmoothedProbability(
  count: number,
  totalN: number,
  kOutcomes: number
): number {
  if (totalN <= 0) return 1.0 / Math.max(1, kOutcomes);
  return (count + 1) / (totalN + kOutcomes);
}

/**
 * Compute information weight I(a) = -log2(p(a)) with smoothing and 3.5-bit cap.
 * Falls back to uniform 1.0 if sample size N < 30 (small-sample smoothing rule).
 */
export function computeInformationWeight(
  probability: number,
  totalN: number,
  maxBits: number = MAX_WEIGHT_BITS
): number {
  // Small sample size threshold rule: If total lane participants N < 30, use uniform weighting
  if (totalN < 30) {
    return 1.0;
  }

  if (probability <= 0) return maxBits;
  if (probability >= 1.0) return 0.0;

  const rawBits = -Math.log2(probability);
  return Math.min(Math.max(0.0, rawBits), maxBits);
}

/**
 * Calculate symmetric weighted match similarity across 5 questions.
 * Ensures S(P, Q) === S(Q, P) strictly by evaluating symmetric average weight.
 */
export function computeWeightedPolymorphicSimilarity(
  questions: Array<{
    id: string;
    format: QuestionFormat | string;
    weight?: number;
  }>,
  answersA: Map<string, unknown>,
  answersB: Map<string, unknown>
): {
  overallSimilarity: number;
  perQuestionSimilarities: Array<{ questionId: string; similarity: number; weight: number }>;
  questionsCompared: number;
} {
  let weightedSum = 0.0;
  let totalWeight = 0.0;
  let compared = 0;
  const perQuestion: Array<{ questionId: string; similarity: number; weight: number }> = [];

  for (const q of questions) {
    const valA = answersA.get(q.id);
    const valB = answersB.get(q.id);

    // Skip unanswered or moderated questions (weight 0)
    if (valA === undefined || valB === undefined || valA === null || valB === null) {
      perQuestion.push({ questionId: q.id, similarity: 0.0, weight: 0.0 });
      continue;
    }

    const sim = computeQuestionSimilarity(q.format, valA, valB);
    const weight = q.weight != null ? q.weight : 1.0;

    weightedSum += sim * weight;
    totalWeight += weight;
    compared++;

    perQuestion.push({ questionId: q.id, similarity: sim, weight });
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : 0.0;
  return {
    overallSimilarity: Math.max(0.0, Math.min(1.0, overall)),
    perQuestionSimilarities: perQuestion,
    questionsCompared: compared,
  };
}

// ---------------------------------------------------------------------------
// 3. Entropy & Tie-Risk Estimator Utility Functions (P10M.06)
// ---------------------------------------------------------------------------

/**
 * Compute Shannon entropy H in bits:
 *   H = - sum(p_i * log2(p_i))
 */
export function calculateEntropy(probabilities: number[]): number {
  let entropy = 0.0;
  for (const p of probabilities) {
    if (p > 0 && p <= 1.0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Compute effective outcomes K_eff = 2^H.
 */
export function calculateEffectiveOutcomes(entropyBits: number): number {
  return Math.pow(2, entropyBits);
}

/**
 * Estimate collision probability and expected tie group size using birthday approximation:
 *   lambda = N^2 / (2 * K_eff)
 *   tie_risk = 1 - exp(-N / K_eff)
 *   expected_group_size = max(1, N / K_eff)
 */
export function estimateTieRisk(
  kEff: number,
  dailyPlayers: number
): {
  collisionProbability: number;
  expectedTieGroupSize: number;
  tieRiskScore: number;
} {
  if (kEff <= 0 || dailyPlayers <= 0) {
    return { collisionProbability: 1.0, expectedTieGroupSize: dailyPlayers, tieRiskScore: 1.0 };
  }

  const ratio = dailyPlayers / kEff;
  const collisionRisk = Math.min(1.0, 1.0 - Math.exp(-ratio));
  const expectedGroup = Math.max(1.0, ratio);

  return {
    collisionProbability: collisionRisk,
    expectedTieGroupSize: expectedGroup,
    tieRiskScore: Math.min(1.0, collisionRisk),
  };
}

/**
 * Drop-level entropy and tie-risk evaluation.
 * Evaluates whether a drop in a high-volume lane (>5000 players) meets the
 * entropy guideline of having at least 3 high-entropy questions (K >= 6).
 */
export function evaluateDropEntropy(
  questions: Array<{
    id?: string;
    format: QuestionFormat | string;
    probabilities?: number[];
  }>,
  expectedDailyPlayers: number = 5000
): {
  totalEntropyBits: number;
  totalEffectiveOutcomes: number;
  dropTieRisk: number;
  highEntropyQuestionsCount: number;
  isEntropySufficient: boolean;
  advisoryWarning: string | null;
} {
  let totalBits = 0.0;
  let highEntropyCount = 0;

  for (const q of questions) {
    let qBits = 0.0;
    const kMax = formatOutcomesCount(q.format);

    if (q.probabilities && q.probabilities.length > 0) {
      qBits = calculateEntropy(q.probabilities);
    } else {
      // Default uniform assumption for capacity planning
      qBits = Math.log2(kMax);
    }

    totalBits += qBits;

    if (kMax >= 6) {
      highEntropyCount++;
    }
  }

  const effectiveOutcomes = calculateEffectiveOutcomes(totalBits);
  const tieRisk = estimateTieRisk(effectiveOutcomes, expectedDailyPlayers);

  // Spec rule: If lane expects > 5000 daily players, should have >= 3 questions with >= 6 outcomes
  const isSufficient = expectedDailyPlayers <= 5000 || highEntropyCount >= 3;
  let advisory: string | null = null;
  if (!isSufficient) {
    advisory = `Drop has only ${highEntropyCount} high-entropy questions (minimum 3 required for lanes expecting > 5,000 players). Risk of oversized tie groups.`;
  }

  return {
    totalEntropyBits: totalBits,
    totalEffectiveOutcomes: effectiveOutcomes,
    dropTieRisk: tieRisk.tieRiskScore,
    highEntropyQuestionsCount: highEntropyCount,
    isEntropySufficient: isSufficient,
    advisoryWarning: advisory,
  };
}

