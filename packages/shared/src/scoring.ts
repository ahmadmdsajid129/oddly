/**
 * @file scoring.ts
 * @package @oddly/shared
 *
 * Pure math functions for Oddly's scoring engine.
 * All functions are deterministic and have no side effects.
 *
 * Key algorithms:
 *   - Dice coefficient  → answer-vector similarity [0, 1]
 *   - Shannon self-information → rarity of a single answer
 *   - Oddness score → weighted rarity across all 5 answers [0, 1]
 *   - Percentile → where a score sits in the day's population
 *   - Tier classification → Common / Uncommon / Rare / Mythic
 */

import type { AnswerFrequency, Tier } from "./types.js";

// ---------------------------------------------------------------------------
// 1. Dice Coefficient (Sørensen–Dice)
//
// Measures overlap between two binary answer vectors.
// Each element is 1 if the player chose that option, 0 otherwise.
//
// dice(A, B) = 2 * |A ∩ B| / (|A| + |B|)
//
// Properties:
//   - dice(A, A) = 1  (identical)
//   - dice(A, B) = 0  (completely different)
//   - dice(A, B) = dice(B, A)  (symmetric)
//   - 0 ≤ dice ≤ 1
// ---------------------------------------------------------------------------

/**
 * Compute the Dice coefficient between two answer vectors.
 *
 * @param a - Binary answer vector for player A (length N, values 0 or 1)
 * @param b - Binary answer vector for player B (same length)
 * @returns Similarity score in [0, 1]
 */
export function diceCoefficient(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `diceCoefficient: vectors must be same length (got ${a.length} vs ${b.length})`
    );
  }
  if (a.length === 0) return 0;

  const sumA = a.reduce((acc, v) => acc + v, 0);
  const sumB = b.reduce((acc, v) => acc + v, 0);

  if (sumA + sumB === 0) return 1; // both empty → identical (edge case)

  const intersection = a.reduce((acc, v, i) => acc + Math.min(v, b[i]!), 0);
  return (2 * intersection) / (sumA + sumB);
}

// ---------------------------------------------------------------------------
// 2. Shannon Self-Information
//
// self_information(p) = -log₂(p)
//
// Measures how "surprising" (rare) a given answer is.
//   - p = 1 (everyone chose it) → 0 bits (not surprising)
//   - p = 0.5                   → 1 bit
//   - p → 0 (almost nobody)     → ∞ bits → capped at MAX_BITS
//
// We cap at MAX_BITS to avoid instability when probability is tiny.
// ---------------------------------------------------------------------------

/** Maximum information value. Avoids inf for extremely rare answers. */
export const MAX_INFORMATION_BITS = 10; // log₂(1/2^10) = 10 bits

/**
 * Compute the Shannon self-information of a probability.
 *
 * @param probability - Relative frequency of an answer [0, 1]
 * @returns Information in bits, capped at MAX_INFORMATION_BITS
 */
export function selfInformation(probability: number): number {
  if (probability < 0 || probability > 1) {
    throw new Error(
      `selfInformation: probability must be in [0,1] (got ${probability})`
    );
  }
  if (probability === 0) return MAX_INFORMATION_BITS;
  if (probability === 1) return 0;
  return Math.min(-Math.log2(probability), MAX_INFORMATION_BITS);
}

// ---------------------------------------------------------------------------
// 3. Oddness Score
//
// Weighted mean of the self-information of each submitted answer.
// Normalised to [0, 1] by dividing by MAX_INFORMATION_BITS.
//
// oddness = mean(-log₂(p_i)) / MAX_BITS   for i in {1..5}
//
// A player who always picks the most popular answer → oddness ≈ 0 (Common).
// A player who always picks rare answers → oddness ≈ 1 (Mythic).
// ---------------------------------------------------------------------------

/**
 * Compute the oddness score for a single submission.
 *
 * @param questionIds  - Ordered list of question IDs the player answered
 * @param values       - The player's value for each question (same order)
 * @param frequencies  - Frequency table (all values for all questions in drop)
 * @returns Oddness score in [0, 1]
 */
export function oddnessScore(
  questionIds: string[],
  values: (string | number | string[])[],
  frequencies: AnswerFrequency[]
): number {
  if (questionIds.length === 0) return 0;

  // Build lookup: questionId → value → probability
  const lookup = new Map<string, Map<string, number>>();
  for (const freq of frequencies) {
    if (!lookup.has(freq.question_id)) {
      lookup.set(freq.question_id, new Map());
    }
    lookup.get(freq.question_id)!.set(freq.value, freq.probability);
  }

  let totalInfo = 0;
  for (let i = 0; i < questionIds.length; i++) {
    const qid = questionIds[i]!;
    const val = values[i]!;

    // For word-type (array values), use the least-common selected word
    // to represent the submission's information contribution.
    const valStr = Array.isArray(val)
      ? val.reduce<string>(
          (rarest, v) => {
            const p1 = lookup.get(qid)?.get(rarest) ?? 0.5;
            const p2 = lookup.get(qid)?.get(v) ?? 0.5;
            return p2 < p1 ? v : rarest;
          },
          val[0] ?? ""
        )
      : String(val);

    const probability = lookup.get(qid)?.get(valStr) ?? 0.5;
    totalInfo += selfInformation(probability);
  }

  const mean = totalInfo / questionIds.length;
  return Math.min(mean / MAX_INFORMATION_BITS, 1);
}

// ---------------------------------------------------------------------------
// 4. Percentile
//
// Returns the percentage of scores strictly below the given score.
// (Exclusive lower percentile — standard in statistics.)
// ---------------------------------------------------------------------------

/**
 * Compute the percentile rank of a score within a population.
 *
 * @param score      - The score to rank
 * @param allScores  - All scores in the population (including this one)
 * @returns Percentile in [0, 100] (0 = lowest, 100 = highest)
 */
export function percentile(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 50; // default when no data
  const below = allScores.filter((s) => s < score).length;
  return (below / allScores.length) * 100;
}

// ---------------------------------------------------------------------------
// 5. Tier Classification
//
// Boundaries (from product spec / tier_definitions table, D-005):
//   Common:   0–60%
//   Uncommon: 60–85%
//   Rare:     85–97%
//   Mythic:   97–100%
//
// At runtime these come from the DB (tier_definitions table).
// These defaults are used for the scoring engine tests and simulations.
// ---------------------------------------------------------------------------

export interface TierBoundary {
  tier: Tier;
  min: number; // inclusive
  max: number; // exclusive (except Mythic which is inclusive at 100)
}

export const DEFAULT_TIER_BOUNDARIES: TierBoundary[] = [
  { tier: "Common", min: 0, max: 60 },
  { tier: "Uncommon", min: 60, max: 85 },
  { tier: "Rare", min: 85, max: 97 },
  { tier: "Mythic", min: 97, max: 100 },
];

/**
 * Classify a percentile into a Tier.
 *
 * @param pct       - Percentile value (0–100)
 * @param boundaries - Optional custom boundaries (default = product spec values)
 * @returns Tier name
 */
export function classifyTier(
  pct: number,
  boundaries: TierBoundary[] = DEFAULT_TIER_BOUNDARIES
): Tier {
  // Sort boundaries ascending by min to ensure correct order
  const sorted = [...boundaries].sort((a, b) => a.min - b.min);

  for (const boundary of sorted) {
    if (pct >= boundary.min && pct <= boundary.max) {
      return boundary.tier;
    }
  }

  // Edge case: pct === 100 always Mythic
  if (pct >= 97) return "Mythic";

  // Fallback
  return "Common";
}

// ---------------------------------------------------------------------------
// 6. Answer vector builder
//
// Converts a player's answer (single string value) into a binary vector
// over the full option space of a question. Used by diceCoefficient.
// ---------------------------------------------------------------------------

/**
 * Build a binary answer vector for a question.
 *
 * @param playerValue - The player's chosen value
 * @param allValues   - All possible values for the question (defines vector length)
 * @returns Binary vector: 1 at the index of playerValue, 0 elsewhere
 */
export function buildAnswerVector(
  playerValue: string | number | string[],
  allValues: string[]
): number[] {
  const vec = new Array<number>(allValues.length).fill(0);

  if (Array.isArray(playerValue)) {
    // Word-type: multiple selections
    for (const v of playerValue) {
      const idx = allValues.indexOf(String(v));
      if (idx !== -1) vec[idx] = 1;
    }
  } else {
    const idx = allValues.indexOf(String(playerValue));
    if (idx !== -1) vec[idx] = 1;
  }

  return vec;
}

/**
 * Compute the overall similarity between two submissions (5 questions).
 *
 * @param answersA    - Stored answers for player A ({question_id, value}[])
 * @param answersB    - Stored answers for player B
 * @param optionMap   - Map from question_id → array of all possible values
 * @returns Dice similarity in [0, 1]
 */
export function submissionSimilarity(
  answersA: Array<{ question_id: string; value: string | number | string[] }>,
  answersB: Array<{ question_id: string; value: string | number | string[] }>,
  optionMap: Map<string, string[]>
): number {
  const questionIds = [...new Set(answersA.map((a) => a.question_id))];
  if (questionIds.length === 0) return 0;

  const lookupA = new Map(answersA.map((a) => [a.question_id, a.value]));
  const lookupB = new Map(answersB.map((a) => [a.question_id, a.value]));

  let totalDice = 0;
  let counted = 0;

  for (const qid of questionIds) {
    const options = optionMap.get(qid);
    if (!options || options.length === 0) continue;

    const valA = lookupA.get(qid);
    const valB = lookupB.get(qid);
    if (valA === undefined || valB === undefined) continue;

    const vecA = buildAnswerVector(valA, options);
    const vecB = buildAnswerVector(valB, options);
    totalDice += diceCoefficient(vecA, vecB);
    counted++;
  }

  return counted === 0 ? 0 : totalDice / counted;
}
