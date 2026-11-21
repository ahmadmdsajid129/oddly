/**
 * @file explainable-ranker.test.ts
 * @package @oddly/shared
 *
 * Unit Tests for Explainable Pointwise ML Ranker & Audit Suite (Stage M7 / Phase 10J / P10J.02, P10J.04).
 */

import { describe, expect, it } from "vitest";
import {
  sigmoid,
  computeAuc,
  trainLogisticRanker,
  ALLOWED_FEATURE_KEYS,
  type MLFeatureVector,
  type ModelWeights,
  type TrainingPair,
} from "./explainable-ranker.js";
import {
  auditSensitiveAttributes,
  auditRegionalFairness,
  calculatePsi,
} from "./audit.js";

describe("Stage M7 (Phase 10J): Explainable ML Ranker Mathematics & Invariants", () => {
  it("computes numerically stable sigmoid bounds", () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(100)).toBe(1.0);
    expect(sigmoid(-100)).toBe(0.0);
    expect(sigmoid(2)).toBeGreaterThan(0.8);
    expect(sigmoid(-2)).toBeLessThan(0.2);
  });

  it("calculates exact ROC-AUC concordance on known rankings", () => {
    // Perfect ranking: all positives have higher scores than negatives
    const perfectScores = [
      { score: 0.9, target: 1 },
      { score: 0.8, target: 1 },
      { score: 0.3, target: 0 },
      { score: 0.1, target: 0 },
    ];
    expect(computeAuc(perfectScores)).toBe(1.0);

    // Inverted ranking: all positives have lower scores than negatives
    const invertedScores = [
      { score: 0.1, target: 1 },
      { score: 0.2, target: 1 },
      { score: 0.8, target: 0 },
      { score: 0.9, target: 0 },
    ];
    expect(computeAuc(invertedScores)).toBe(0.0);

    // Tied / random
    const tiedScores = [
      { score: 0.5, target: 1 },
      { score: 0.5, target: 0 },
    ];
    expect(computeAuc(tiedScores)).toBe(0.5);
  });

  it("trains explainable logistic regression ranker to convergence with explicit weights", () => {
    // Synthetic pairs where high wilson_lb and tag_affinity correlate with target = 1
    const trainingPairs: TrainingPair[] = [];
    for (let i = 0; i < 100; i++) {
      const isPositive = i % 2 === 0;
      trainingPairs.push({
        id: `pair_${i}`,
        features: {
          meme_wilson_lb: isPositive ? 0.75 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2,
          meme_raters_log: 0.5,
          tag_affinity: isPositive ? 0.8 : 0.3,
          caption_length_norm: 0.4,
          author_funny_rate: isPositive ? 0.7 : 0.3,
          hour_of_day_norm: 0.5,
        },
        target: isPositive ? 1 : 0,
        region: i % 4 === 0 ? "IN" : "US",
      });
    }

    const { weights, metrics } = trainLogisticRanker(trainingPairs, {
      learningRate: 0.1,
      l2Lambda: 0.001,
      maxIterations: 100,
    });

    // Invariant: Explict non-black-box weights
    expect(typeof weights.bias).toBe("number");
    expect(Object.keys(weights.weights)).toEqual(ALLOWED_FEATURE_KEYS);

    // Invariant: Positive correlation learned on wilson_lb and tag_affinity
    expect(weights.weights.meme_wilson_lb).toBeGreaterThan(0);
    expect(weights.weights.tag_affinity).toBeGreaterThan(0);

    // Invariant: Metric convergence
    expect(metrics.train_auc).toBeGreaterThanOrEqual(0.70);
    expect(metrics.pairs_count).toBe(100);
    expect(metrics.iterations).toBeGreaterThan(0);
  });

  it("strictly enforces Rule 14 zero sensitive attributes audit", () => {
    const cleanWeights = {
      bias: 0.1,
      weights: {
        meme_wilson_lb: 0.8,
        meme_raters_log: 0.2,
        tag_affinity: 0.4,
        caption_length_norm: -0.1,
        author_funny_rate: 0.5,
        hour_of_day_norm: 0.05,
      },
    };

    const cleanAudit = auditSensitiveAttributes(cleanWeights);
    expect(cleanAudit.passed).toBe(true);
    expect(cleanAudit.prohibitedAttributesDetected).toHaveLength(0);

    // Dirty weights with forbidden attribute
    const dirtyWeights: ModelWeights = {
      bias: 0.0,
      weights: {
        ...cleanWeights.weights,
        user_caste_score: 0.5, // FORBIDDEN
      } as unknown as Record<keyof MLFeatureVector, number>,
    };

    const dirtyAudit = auditSensitiveAttributes(dirtyWeights);
    expect(dirtyAudit.passed).toBe(false);
    expect(dirtyAudit.prohibitedAttributesDetected).toContain("user_caste_score");
  });

  it("evaluates demographic parity and four-fifths fairness rule across regions", () => {
    const dummyFeatures: MLFeatureVector = {
      meme_wilson_lb: 0.5,
      meme_raters_log: 0.5,
      tag_affinity: 0.5,
      caption_length_norm: 0.5,
      author_funny_rate: 0.5,
      hour_of_day_norm: 0.5,
    };

    const fairPairs: TrainingPair[] = [
      // Region IN: 8 / 10 = 80% positive
      ...Array.from({ length: 8 }, (_, i) => ({ id: `in_pos_${i}`, features: dummyFeatures, target: 1 as const, region: "IN" })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: `in_neg_${i}`, features: dummyFeatures, target: 0 as const, region: "IN" })),
      // Region US: 7 / 10 = 70% positive
      ...Array.from({ length: 7 }, (_, i) => ({ id: `us_pos_${i}`, features: dummyFeatures, target: 1 as const, region: "US" })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `us_neg_${i}`, features: dummyFeatures, target: 0 as const, region: "US" })),
    ];

    const fairResult = auditRegionalFairness(fairPairs);
    expect(fairResult.passed).toBe(true);
    expect(fairResult.minDisparityRatio).toBeGreaterThanOrEqual(0.80);
    expect(fairResult.fourFifthsRuleSatisfied).toBe(true);

    const unfairPairs: TrainingPair[] = [
      // Region IN: 9 / 10 = 90% positive
      ...Array.from({ length: 9 }, (_, i) => ({ id: `in_pos_${i}`, features: dummyFeatures, target: 1 as const, region: "IN" })),
      ...Array.from({ length: 1 }, (_, i) => ({ id: `in_neg_${i}`, features: dummyFeatures, target: 0 as const, region: "IN" })),
      // Region US: 3 / 10 = 30% positive (30% / 90% = 0.33 < 0.80)
      ...Array.from({ length: 3 }, (_, i) => ({ id: `us_pos_${i}`, features: dummyFeatures, target: 1 as const, region: "US" })),
      ...Array.from({ length: 7 }, (_, i) => ({ id: `us_neg_${i}`, features: dummyFeatures, target: 0 as const, region: "US" })),
    ];

    const unfairResult = auditRegionalFairness(unfairPairs);
    expect(unfairResult.passed).toBe(false);
    expect(unfairResult.minDisparityRatio).toBeLessThan(0.80);
    expect(unfairResult.fourFifthsRuleSatisfied).toBe(false);
  });

  it("calculates Population Stability Index (PSI) drift correctly", () => {
    // Identical distribution -> PSI near 0
    const baseline = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const currentIdentical = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const psiIdentical = calculatePsi(baseline, currentIdentical);
    expect(psiIdentical).toBeLessThan(0.05);

    // Heavily shifted distribution -> High PSI
    const currentShifted = [0.9, 0.95, 0.92, 0.99, 0.91, 0.94, 0.96, 0.98];
    const psiShifted = calculatePsi(baseline, currentShifted);
    expect(psiShifted).toBeGreaterThan(0.25);
  });
});

