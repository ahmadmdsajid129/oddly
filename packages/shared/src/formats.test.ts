/**
 * @file formats.test.ts
 * @package @oddly/shared
 *
 * Mathematical Property Tests for Richer Answer Formats (Stage L2 / Phase 10M / Tasks P10M.01, P10M.02, P10M.03, P10M.06).
 *
 * Verifies:
 * 1. Mathematical invariants: Symmetry, Boundedness [0, 1], Identity, Monotonicity.
 * 2. Exact worked examples from docs/lanes-and-matching.md Section 2.2.
 * 3. Information weighting I(a) with Laplace smoothing, 3.5-bit cap, and N < 30 fallback.
 * 4. Entropy and tie-risk estimations (Shannon H, effective outcomes, birthday collision risk).
 */

import { describe, expect, it } from "vitest";
import {
  pick1Similarity,
  sceneSimilarity,
  pick2of6Similarity,
  rank3Similarity,
  slider7Similarity,
  computeQuestionSimilarity,
  calculateSmoothedProbability,
  computeInformationWeight,
  computeWeightedPolymorphicSimilarity,
  calculateEntropy,
  calculateEffectiveOutcomes,
  estimateTieRisk,
  evaluateDropEntropy,
  MAX_WEIGHT_BITS,
} from "./formats.js";
import {
  Pick2Of6AnswerPayloadSchema,
  Rank3AnswerPayloadSchema,
  Slider7AnswerPayloadSchema,
  SceneAnswerPayloadSchema,
  Pick2Of6QuestionPayloadSchema,
  Rank3QuestionPayloadSchema,
  Slider7QuestionPayloadSchema,
  SceneQuestionPayloadSchema,
  AnswerPayloadSchema,
} from "./schemas.js";

describe("Stage L2: Richer Answer Formats Mathematical Suite", () => {
  // ==========================================================================
  // 1. Worked Examples from docs/lanes-and-matching.md Section 2.2
  // ==========================================================================
  describe("P10M.02: Worked Numeric Examples from Spec", () => {
    it("Format 1 (pick1 & scene): handles equality and inequality", () => {
      expect(pick1Similarity("B", "B")).toBe(1.0);
      expect(pick1Similarity("A", "C")).toBe(0.0);
      expect(sceneSimilarity("card_sun", "card_sun")).toBe(1.0);
      expect(sceneSimilarity("card_sun", "card_rain")).toBe(0.0);
    });

    it("Format 2 (pick2of6): matches exact Jaccard fractions (0, 1/3, 1)", () => {
      // Example 2.a (Exact match)
      expect(pick2of6Similarity(["1", "3"], ["1", "3"])).toBe(1.0);

      // Example 2.b (Partial match: 1 common, union 3)
      const partial = pick2of6Similarity(["1", "3"], ["3", "5"]);
      expect(partial).toBeCloseTo(1 / 3, 5);

      // Example 2.c (Disjoint match: 0 common, union 4)
      expect(pick2of6Similarity(["1", "3"], ["2", "6"])).toBe(0.0);
    });

    it("Format 3 (rank3): matches normalized Kendall Tau inversions (0, 1/3, 2/3, 1)", () => {
      const R1 = ["A", "B", "C"];

      // Example 3.a (Identical order) -> d_K = 0 -> s = 1.0
      expect(rank3Similarity(R1, ["A", "B", "C"])).toBe(1.0);

      // Example 3.b (One swap: A, B inverted) -> d_K = 1 -> s = 2/3 ≈ 0.667
      expect(rank3Similarity(R1, ["B", "A", "C"])).toBeCloseTo(2 / 3, 5);

      // Example 3.c (Two swaps: B, C, A) -> d_K = 2 -> s = 1/3 ≈ 0.333
      expect(rank3Similarity(R1, ["B", "C", "A"])).toBeCloseTo(1 / 3, 5);

      // Example 3.d (Complete reversal: C, B, A) -> d_K = 3 -> s = 0.0
      expect(rank3Similarity(R1, ["C", "B", "A"])).toBe(0.0);
    });

    it("Format 4 (slider7): matches normalized Manhattan distance", () => {
      // Example 4.a (Identical) -> |4 - 4| = 0 -> 1.0
      expect(slider7Similarity(4, 4)).toBe(1.0);

      // Example 4.b (Adjacent) -> |3 - 4| = 1 -> 1 - 1/6 ≈ 0.8333
      expect(slider7Similarity(3, 4)).toBeCloseTo(5 / 6, 5);

      // Example 4.c (Moderate divergence) -> |2 - 5| = 3 -> 1 - 3/6 = 0.5000
      expect(slider7Similarity(2, 5)).toBe(0.5);

      // Example 4.d (Polar opposites) -> |1 - 7| = 6 -> 1 - 6/6 = 0.0
      expect(slider7Similarity(1, 7)).toBe(0.0);
    });
  });

  // ==========================================================================
  // 2. Mathematical Proofs & Invariants
  // ==========================================================================
  describe("P10M.02: Invariant Proofs (Symmetry, Boundedness, Identity, Monotonicity)", () => {
    const pick2Pairs: Array<[string[], string[]]> = [
      [["a", "b"], ["b", "c"]],
      [["x", "y"], ["z", "w"]],
      [["1", "2"], ["1", "2"]],
    ];

    const rank3Pairs: Array<[string[], string[]]> = [
      [["1", "2", "3"], ["2", "1", "3"]],
      [["x", "y", "z"], ["z", "x", "y"]],
      [["a", "b", "c"], ["c", "b", "a"]],
    ];

    const sliderPairs: Array<[number, number]> = [
      [1, 7],
      [3, 4],
      [2, 6],
      [5, 5],
    ];

    it("Proves Symmetry: s(x, y) === s(y, x)", () => {
      for (const [a, b] of pick2Pairs) {
        expect(pick2of6Similarity(a, b)).toBe(pick2of6Similarity(b, a));
      }
      for (const [r1, r2] of rank3Pairs) {
        expect(rank3Similarity(r1, r2)).toBe(rank3Similarity(r2, r1));
      }
      for (const [v1, v2] of sliderPairs) {
        expect(slider7Similarity(v1, v2)).toBe(slider7Similarity(v2, v1));
      }
    });

    it("Proves Boundedness: 0.0 <= s <= 1.0", () => {
      for (const [a, b] of pick2Pairs) {
        const s = pick2of6Similarity(a, b);
        expect(s).toBeGreaterThanOrEqual(0.0);
        expect(s).toBeLessThanOrEqual(1.0);
      }
      for (const [r1, r2] of rank3Pairs) {
        const s = rank3Similarity(r1, r2);
        expect(s).toBeGreaterThanOrEqual(0.0);
        expect(s).toBeLessThanOrEqual(1.0);
      }
      for (const [v1, v2] of sliderPairs) {
        const s = slider7Similarity(v1, v2);
        expect(s).toBeGreaterThanOrEqual(0.0);
        expect(s).toBeLessThanOrEqual(1.0);
      }
    });

    it("Proves Identity / Reflexivity: s(x, x) === 1.0", () => {
      expect(pick2of6Similarity(["itemA", "itemB"], ["itemA", "itemB"])).toBe(1.0);
      expect(rank3Similarity(["A", "B", "C"], ["A", "B", "C"])).toBe(1.0);
      expect(slider7Similarity(4, 4)).toBe(1.0);
      expect(pick1Similarity("apple", "apple")).toBe(1.0);
    });

    it("Proves Monotonicity on slider: distance increase strictly decreases similarity", () => {
      const center = 4;
      const s0 = slider7Similarity(center, 4); // diff 0
      const s1 = slider7Similarity(center, 5); // diff 1
      const s2 = slider7Similarity(center, 6); // diff 2
      const s3 = slider7Similarity(center, 7); // diff 3

      expect(s0).toBeGreaterThan(s1);
      expect(s1).toBeGreaterThan(s2);
      expect(s2).toBeGreaterThan(s3);
    });
  });

  // ==========================================================================
  // 3. Information Content Weighting (P10M.03)
  // ==========================================================================
  describe("P10M.03: Information Content Weighting & Smoothing", () => {
    it("applies Laplace smoothing correctly", () => {
      // count = 10, totalN = 100, kOutcomes = 15 -> (10 + 1) / (100 + 15) = 11 / 115
      const smoothed = calculateSmoothedProbability(10, 100, 15);
      expect(smoothed).toBeCloseTo(11 / 115, 6);
    });

    it("caps information weight strictly at 3.5 bits (P10M.03)", () => {
      expect(MAX_WEIGHT_BITS).toBe(3.5);

      // Very rare probability e.g. 0.0001 (-log2(0.0001) ≈ 13.28)
      const weight = computeInformationWeight(0.0001, 1000);
      expect(weight).toBe(3.5);
    });

    it("falls back to uniform 1.0 weight when sample size N < 30", () => {
      // At N = 10, even for a rare answer with p = 0.05, weight must be 1.0
      const weight = computeInformationWeight(0.05, 10);
      expect(weight).toBe(1.0);
    });

    it("calculates symmetric weighted polymorphic similarity", () => {
      const questions = [
        { id: "q1", format: "pick1", weight: 1.0 },
        { id: "q2", format: "pick2of6", weight: 2.0 },
        { id: "q3", format: "rank3", weight: 1.5 },
        { id: "q4", format: "slider7", weight: 1.0 },
        { id: "q5", format: "scene", weight: 1.0 },
      ];

      const answersA = new Map<string, unknown>([
        ["q1", "optA"],
        ["q2", ["A", "B"]],
        ["q3", ["1", "2", "3"]],
        ["q4", 4],
        ["q5", "scene1"],
      ]);

      const answersB = new Map<string, unknown>([
        ["q1", "optA"], // sim = 1.0
        ["q2", ["B", "C"]], // sim = 1/3 ≈ 0.3333
        ["q3", ["1", "2", "3"]], // sim = 1.0
        ["q4", 5], // sim = 5/6 ≈ 0.8333
        ["q5", "scene2"], // sim = 0.0
      ]);

      const resAB = computeWeightedPolymorphicSimilarity(questions, answersA, answersB);
      const resBA = computeWeightedPolymorphicSimilarity(questions, answersB, answersA);

      expect(resAB.overallSimilarity).toBeCloseTo(resBA.overallSimilarity, 6);
      expect(resAB.questionsCompared).toBe(5);
      expect(resAB.overallSimilarity).toBeGreaterThan(0.0);
      expect(resAB.overallSimilarity).toBeLessThan(1.0);
    });
  });

  // ==========================================================================
  // 4. Entropy & Tie-Risk Estimator (P10M.06)
  // ==========================================================================
  describe("P10M.06: Entropy & Tie-Risk Estimator Utilities", () => {
    it("computes Shannon entropy, effective outcomes, and tie risk score", () => {
      // Uniform across 4 outcomes -> -4 * (0.25 * log2(0.25)) = -4 * (0.25 * -2) = 2.0 bits
      const uniform4 = [0.25, 0.25, 0.25, 0.25];
      const h = calculateEntropy(uniform4);
      expect(h).toBeCloseTo(2.0, 5);
      const kEff = calculateEffectiveOutcomes(h);
      expect(kEff).toBeCloseTo(4.0, 5);

      const risk = estimateTieRisk(kEff, 100);
      expect(risk.collisionProbability).toBeGreaterThan(0.9);
      expect(risk.expectedTieGroupSize).toBe(25);
    });

    it("evaluates drop-level entropy and triggers warning if < 3 high-entropy questions for N > 5000", () => {
      // Drop with 4 low-entropy questions (pick1, 3 outcomes) and only 1 high-entropy question (slider7, 7 outcomes)
      const lowEntropyDrop = [
        { format: "pick1" },
        { format: "pick1" },
        { format: "pick1" },
        { format: "pick1" },
        { format: "slider7" },
      ];

      const resLow = evaluateDropEntropy(lowEntropyDrop, 10000);
      expect(resLow.highEntropyQuestionsCount).toBe(1);
      expect(resLow.isEntropySufficient).toBe(false);
      expect(resLow.advisoryWarning).not.toBeNull();

      // High entropy drop (Mix B: pick1, pick1, pick2of6, rank3, slider7)
      const mixBDrop = [
        { format: "pick1" },
        { format: "pick1" },
        { format: "pick2of6" }, // 15 outcomes
        { format: "rank3" },    // 6 outcomes
        { format: "slider7" },  // 7 outcomes
      ];

      const resMixB = evaluateDropEntropy(mixBDrop, 10000);
      expect(resMixB.highEntropyQuestionsCount).toBe(3);
      expect(resMixB.isEntropySufficient).toBe(true);
      expect(resMixB.advisoryWarning).toBeNull();
    });
  });

  // ==========================================================================
  // 5. Zod Schemas Validation (P10M.01)
  // ==========================================================================
  describe("P10M.01: Zod Schemas for Richer Formats", () => {
    it("validates pick2of6 answer requiring exactly 2 distinct items", () => {
      const valid = Pick2Of6AnswerPayloadSchema.safeParse({
        type: "pick2of6",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["opt1", "opt2"],
      });
      expect(valid.success).toBe(true);

      const invalidDuplicate = Pick2Of6AnswerPayloadSchema.safeParse({
        type: "pick2of6",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["opt1", "opt1"],
      });
      expect(invalidDuplicate.success).toBe(false);

      const invalidLength = Pick2Of6AnswerPayloadSchema.safeParse({
        type: "pick2of6",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["opt1"],
      });
      expect(invalidLength.success).toBe(false);
    });

    it("validates rank3 answer requiring exactly 3 distinct items", () => {
      const valid = Rank3AnswerPayloadSchema.safeParse({
        type: "rank3",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["first", "second", "third"],
      });
      expect(valid.success).toBe(true);

      const invalidDuplicate = Rank3AnswerPayloadSchema.safeParse({
        type: "rank3",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["first", "second", "first"],
      });
      expect(invalidDuplicate.success).toBe(false);
    });

    it("validates slider7 answer in [1, 7]", () => {
      const valid = Slider7AnswerPayloadSchema.safeParse({
        type: "slider7",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: 5,
      });
      expect(valid.success).toBe(true);

      const invalidOut = Slider7AnswerPayloadSchema.safeParse({
        type: "slider7",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: 8,
      });
      expect(invalidOut.success).toBe(false);
    });

    it("validates discriminated union AnswerPayloadSchema parses all formats", () => {
      const payload1 = AnswerPayloadSchema.safeParse({
        type: "pick2of6",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["a", "b"],
      });
      expect(payload1.success).toBe(true);

      const payload2 = AnswerPayloadSchema.safeParse({
        type: "rank3",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: ["a", "b", "c"],
      });
      expect(payload2.success).toBe(true);

      const payload3 = AnswerPayloadSchema.safeParse({
        type: "slider7",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: 7,
      });
      expect(payload3.success).toBe(true);

      const payload4 = AnswerPayloadSchema.safeParse({
        type: "scene",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: "scene_opt_1",
      });
      expect(payload4.success).toBe(true);

      const sceneValid = SceneAnswerPayloadSchema.safeParse({
        type: "scene",
        question_id: "00000000-0000-4000-a000-000000000001",
        value: "scene_opt_1",
      });
      expect(sceneValid.success).toBe(true);

      expect(computeQuestionSimilarity("pick1", "a", "a")).toBe(1.0);
      expect(computeQuestionSimilarity("pick2of6", ["a", "b"], ["a", "b"])).toBe(1.0);
      expect(computeQuestionSimilarity("rank3", ["a", "b", "c"], ["a", "b", "c"])).toBe(1.0);
      expect(computeQuestionSimilarity("slider7", 3, 3)).toBe(1.0);
      expect(computeQuestionSimilarity("scene", "x", "x")).toBe(1.0);
    });

    it("validates question definition payloads for all 4 formats", () => {
      const qPick2 = Pick2Of6QuestionPayloadSchema.safeParse({
        prompt: "Pick 2",
        options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
          { label: "5", value: "5" },
          { label: "6", value: "6" },
        ],
      });
      expect(qPick2.success).toBe(true);

      const qRank3 = Rank3QuestionPayloadSchema.safeParse({
        prompt: "Rank 3",
        items: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
        ],
      });
      expect(qRank3.success).toBe(true);

      const qSlider7 = Slider7QuestionPayloadSchema.safeParse({
        prompt: "Spectrum",
        left_label: "Low",
        right_label: "High",
      });
      expect(qSlider7.success).toBe(true);

      const qScene = SceneQuestionPayloadSchema.safeParse({
        prompt: "Reaction",
        cards: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
        ],
      });
      expect(qScene.success).toBe(true);
    });
  });
});
