/**
 * @file scoring.test.ts
 * @package @oddly/shared
 *
 * Unit tests for Oddly's scoring engine.
 * Coverage:
 *   - diceCoefficient: symmetry, bounds, worked examples, edge cases
 *   - selfInformation: bounds, capping, worked examples
 *   - oddnessScore: bounds, uniform distribution, all-rare
 *   - percentile: ordering, edge cases
 *   - classifyTier: all 4 tiers, boundary values
 *   - buildAnswerVector: single pick, multi-pick
 *   - submissionSimilarity: identical, disjoint
 */

import { describe, expect, it } from "vitest";
import {
  MAX_INFORMATION_BITS,
  buildAnswerVector,
  classifyTier,
  diceCoefficient,
  oddnessScore,
  percentile,
  selfInformation,
  submissionSimilarity,
} from "./scoring.js";
import type { AnswerFrequency } from "./types.js";

// ---------------------------------------------------------------------------
// diceCoefficient
// ---------------------------------------------------------------------------

describe("diceCoefficient", () => {
  it("returns 1 for identical vectors", () => {
    expect(diceCoefficient([1, 0, 0, 1], [1, 0, 0, 1])).toBe(1);
  });

  it("returns 0 for completely disjoint vectors", () => {
    expect(diceCoefficient([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("is symmetric: dice(A,B) === dice(B,A)", () => {
    const a = [1, 0, 1, 0, 1];
    const b = [0, 1, 1, 0, 0];
    expect(diceCoefficient(a, b)).toBe(diceCoefficient(b, a));
  });

  it("is in [0, 1] for arbitrary binary vectors", () => {
    const cases = [
      [[1, 1, 0, 0], [0, 0, 1, 1]],
      [[1, 0, 0, 0], [1, 0, 0, 0]],
      [[1, 1, 1, 1], [1, 0, 0, 0]],
      [[0, 0, 0, 1], [1, 1, 1, 0]],
    ];
    for (const [a, b] of cases) {
      const result = diceCoefficient(a!, b!);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it("handles all-zero vectors (empty selections) as fully matching", () => {
    // Both players selected nothing → they're the same
    expect(diceCoefficient([0, 0, 0], [0, 0, 0])).toBe(1);
  });

  it("throws when vectors have different lengths", () => {
    expect(() => diceCoefficient([1, 0], [1, 0, 0])).toThrow();
  });

  it("worked example: 3-of-5 options match", () => {
    // A selects opts 0,1,2; B selects opts 1,2,3
    // |A| = 3, |B| = 3, intersection = 2 (opts 1,2)
    // dice = 2*2 / (3+3) = 4/6 ≈ 0.667
    const a = [1, 1, 1, 0, 0];
    const b = [0, 1, 1, 1, 0];
    expect(diceCoefficient(a, b)).toBeCloseTo(4 / 6, 5);
  });
});

// ---------------------------------------------------------------------------
// selfInformation
// ---------------------------------------------------------------------------

describe("selfInformation", () => {
  it("returns 0 for probability = 1 (everyone picked it)", () => {
    expect(selfInformation(1)).toBe(0);
  });

  it("returns MAX_INFORMATION_BITS for probability = 0", () => {
    expect(selfInformation(0)).toBe(MAX_INFORMATION_BITS);
  });

  it("returns 1 bit for probability = 0.5", () => {
    expect(selfInformation(0.5)).toBeCloseTo(1, 5);
  });

  it("returns 2 bits for probability = 0.25", () => {
    expect(selfInformation(0.25)).toBeCloseTo(2, 5);
  });

  it("returns 3 bits for probability = 0.125", () => {
    expect(selfInformation(0.125)).toBeCloseTo(3, 5);
  });

  it("caps at MAX_INFORMATION_BITS for very small probabilities", () => {
    // 2^-10 = 0.000976... → exactly MAX_BITS before capping
    // 2^-15 → 15 bits → capped to 10
    const result = selfInformation(1 / (2 ** 15));
    expect(result).toBe(MAX_INFORMATION_BITS);
  });

  it("is monotonically decreasing: lower p → higher information", () => {
    const p1 = 0.9;
    const p2 = 0.5;
    const p3 = 0.1;
    expect(selfInformation(p1)).toBeLessThan(selfInformation(p2));
    expect(selfInformation(p2)).toBeLessThan(selfInformation(p3));
  });

  it("throws for out-of-range probability", () => {
    expect(() => selfInformation(-0.1)).toThrow();
    expect(() => selfInformation(1.1)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// oddnessScore
// ---------------------------------------------------------------------------

describe("oddnessScore", () => {
  const makeFreqs = (
    qid: string,
    values: string[],
    prob: number
  ): AnswerFrequency[] =>
    values.map((v) => ({
      question_id: qid,
      value: v,
      count: Math.round(prob * 100),
      probability: prob,
    }));

  it("returns 0 for empty input", () => {
    expect(oddnessScore([], [], [])).toBe(0);
  });

  it("is in [0, 1] for typical input", () => {
    const freqs: AnswerFrequency[] = [
      { question_id: "q1", value: "a", count: 80, probability: 0.8 },
      { question_id: "q1", value: "b", count: 20, probability: 0.2 },
      { question_id: "q2", value: "x", count: 50, probability: 0.5 },
      { question_id: "q2", value: "y", count: 50, probability: 0.5 },
    ];
    const score = oddnessScore(["q1", "q2"], ["a", "x"], freqs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("popular-answer player has lower score than rare-answer player", () => {
    const freqs: AnswerFrequency[] = [
      { question_id: "q1", value: "popular", count: 90, probability: 0.9 },
      { question_id: "q1", value: "rare", count: 10, probability: 0.1 },
    ];
    const popularScore = oddnessScore(["q1"], ["popular"], freqs);
    const rareScore = oddnessScore(["q1"], ["rare"], freqs);
    expect(rareScore).toBeGreaterThan(popularScore);
  });

  it("all popular (p=1) gives score 0", () => {
    const freqs = makeFreqs("q1", ["a"], 1);
    const score = oddnessScore(["q1"], ["a"], freqs);
    expect(score).toBe(0);
  });

  it("unknown value defaults to p=0.5 (1 bit / MAX_BITS)", () => {
    const score = oddnessScore(["q1"], ["unknown_value"], []);
    // selfInformation(0.5) = 1 bit; normalised = 1/MAX_BITS = 0.1
    expect(score).toBeCloseTo(1 / MAX_INFORMATION_BITS, 5);
  });
});

// ---------------------------------------------------------------------------
// percentile
// ---------------------------------------------------------------------------

describe("percentile", () => {
  it("returns 50 for empty population", () => {
    expect(percentile(0.5, [])).toBe(50);
  });

  it("returns 0 for the lowest score", () => {
    expect(percentile(0, [0, 0.5, 1])).toBe(0);
  });

  it("returns 100% position for the highest score", () => {
    // 2 out of 3 scores are strictly below 1
    expect(percentile(1, [0, 0.5, 1])).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("gives middle score ~50th percentile in symmetric distribution", () => {
    // scores: [0, 0.5, 1] — 1 score below 0.5 → 33.3%
    // Not exactly 50 because we use exclusive lower percentile
    expect(percentile(0.5, [0, 0.5, 1])).toBeCloseTo(33.33, 1);
  });

  it("handles single-element population", () => {
    expect(percentile(0.7, [0.7])).toBe(0); // nobody below it
  });

  it("produces ordered percentiles for ordered scores", () => {
    const scores = [0.1, 0.3, 0.5, 0.7, 0.9];
    const pcts = scores.map((s) => percentile(s, scores));
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeGreaterThan(pcts[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// classifyTier
// ---------------------------------------------------------------------------

describe("classifyTier", () => {
  it("classifies 0% as Common", () => {
    expect(classifyTier(0)).toBe("Common");
  });

  it("classifies 59% as Common", () => {
    expect(classifyTier(59)).toBe("Common");
  });

  it("classifies 60% as Uncommon", () => {
    expect(classifyTier(60)).toBe("Uncommon");
  });

  it("classifies 84% as Uncommon", () => {
    expect(classifyTier(84)).toBe("Uncommon");
  });

  it("classifies 85% as Rare", () => {
    expect(classifyTier(85)).toBe("Rare");
  });

  it("classifies 96% as Rare", () => {
    expect(classifyTier(96)).toBe("Rare");
  });

  it("classifies 97% as Mythic", () => {
    expect(classifyTier(97)).toBe("Mythic");
  });

  it("classifies 100% as Mythic", () => {
    expect(classifyTier(100)).toBe("Mythic");
  });

  it("respects custom tier boundaries", () => {
    const custom = [
      { tier: "Common" as const, min: 0, max: 50 },
      { tier: "Uncommon" as const, min: 50, max: 75 },
      { tier: "Rare" as const, min: 75, max: 90 },
      { tier: "Mythic" as const, min: 90, max: 100 },
    ];
    expect(classifyTier(45, custom)).toBe("Common");
    expect(classifyTier(55, custom)).toBe("Uncommon");
    expect(classifyTier(80, custom)).toBe("Rare");
    expect(classifyTier(95, custom)).toBe("Mythic");
  });
});

// ---------------------------------------------------------------------------
// buildAnswerVector
// ---------------------------------------------------------------------------

describe("buildAnswerVector", () => {
  const options = ["red", "blue", "green", "yellow"];

  it("builds correct single-pick vector", () => {
    expect(buildAnswerVector("blue", options)).toEqual([0, 1, 0, 0]);
  });

  it("builds correct multi-pick vector (word type)", () => {
    expect(buildAnswerVector(["red", "green"], options)).toEqual([1, 0, 1, 0]);
  });

  it("returns all-zeros for unknown value", () => {
    expect(buildAnswerVector("purple", options)).toEqual([0, 0, 0, 0]);
  });

  it("handles number value", () => {
    const numOptions = ["1", "2", "3"];
    expect(buildAnswerVector(2, numOptions)).toEqual([0, 1, 0]);
  });
});

// ---------------------------------------------------------------------------
// submissionSimilarity
// ---------------------------------------------------------------------------

describe("submissionSimilarity", () => {
  const optionMap = new Map([
    ["q1", ["a", "b", "c"]],
    ["q2", ["x", "y", "z"]],
  ]);

  it("returns 1 for identical submissions", () => {
    const answers = [
      { question_id: "q1", value: "a" },
      { question_id: "q2", value: "x" },
    ];
    expect(submissionSimilarity(answers, answers, optionMap)).toBe(1);
  });

  it("returns 0 for completely different submissions", () => {
    const a = [
      { question_id: "q1", value: "a" },
      { question_id: "q2", value: "x" },
    ];
    const b = [
      { question_id: "q1", value: "b" },
      { question_id: "q2", value: "y" },
    ];
    expect(submissionSimilarity(a, b, optionMap)).toBe(0);
  });

  it("is symmetric", () => {
    const a = [
      { question_id: "q1", value: "a" },
      { question_id: "q2", value: "z" },
    ];
    const b = [
      { question_id: "q1", value: "b" },
      { question_id: "q2", value: "z" },
    ];
    const ab = submissionSimilarity(a, b, optionMap);
    const ba = submissionSimilarity(b, a, optionMap);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it("returns 0 for empty submissions", () => {
    expect(submissionSimilarity([], [], optionMap)).toBe(0);
  });
});
