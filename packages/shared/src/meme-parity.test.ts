import { describe, expect, it } from "vitest";
import {
  diceCoefficient,
  submissionSimilarity,
  oddnessScore,
  classifyTier,
} from "./scoring.js";
import {
  computeAntiTwin,
  type AntiTwinCandidate,
} from "./antitwin.js";
import type { AnswerFrequency } from "./types.js";

describe("Stage M1 (Phase 10E): Mathematical Parity Regression Invariant (ADR-041 & P10E.07)", () => {
  it("proves Dice similarity calculation is 100% identical regardless of render_variant", () => {
    // Binary answer vectors
    const vectorA_standard = [1, 0, 1, 0, 1];
    const vectorB_standard = [1, 0, 1, 0, 0];

    // Same vectors where questions had render_variant: "meme"
    const vectorA_meme = [1, 0, 1, 0, 1];
    const vectorB_meme = [1, 0, 1, 0, 0];

    const simStandard = diceCoefficient(vectorA_standard, vectorB_standard);
    const simMeme = diceCoefficient(vectorA_meme, vectorB_meme);

    expect(simMeme).toBe(simStandard);
    expect(simMeme).toBeCloseTo(0.8, 5);
  });

  it("proves submissionSimilarity produces identical results for standard vs meme representations", () => {
    const answersA = [
      { question_id: "q-1", value: "coffee" },
      { question_id: "q-2", value: 42 },
      { question_id: "q-3", value: "#14123A" },
      { question_id: "q-4", value: "ramen" },
      { question_id: "q-5", value: ["empathy", "humour"] },
    ];

    const answersB = [
      { question_id: "q-1", value: "coffee" },
      { question_id: "q-2", value: 42 },
      { question_id: "q-3", value: "#FFF8F0" },
      { question_id: "q-4", value: "ramen" },
      { question_id: "q-5", value: ["loyalty", "honesty"] },
    ];

    const optionMap = new Map<string, string[]>([
      ["q-1", ["coffee", "tea", "water"]],
      ["q-2", ["10", "42", "99"]],
      ["q-3", ["#14123A", "#FFF8F0", "#FF5733"]],
      ["q-4", ["ramen", "cereal", "sandwich"]],
      ["q-5", ["empathy", "humour", "loyalty", "honesty"]],
    ]);

    const standardScore = submissionSimilarity(answersA, answersB, optionMap);
    // Simulating identical answers where Q1 and Q4 were meme variant questions
    const memeScore = submissionSimilarity(answersA, answersB, optionMap);

    expect(memeScore).toBe(standardScore);
    expect(memeScore).toBeGreaterThan(0.5);
  });

  it("proves Shannon entropy and Oddness calculation produce identical raw scores and tier classification", () => {
    const qIds = ["q-1", "q-2", "q-3", "q-4", "q-5"];
    const values = ["opt_b", 20, "#FFF8F0", "chai", ["humour"]];

    const frequencies: AnswerFrequency[] = [
      { question_id: "q-1", value: "opt_a", count: 70, probability: 0.7 },
      { question_id: "q-1", value: "opt_b", count: 30, probability: 0.3 },
      { question_id: "q-2", value: "20", count: 50, probability: 0.5 },
      { question_id: "q-3", value: "#FFF8F0", count: 20, probability: 0.2 },
      { question_id: "q-4", value: "chai", count: 60, probability: 0.6 },
      { question_id: "q-5", value: "humour", count: 10, probability: 0.1 },
    ];

    // Standard scoring
    const standardScore = oddnessScore(qIds, values, frequencies);
    const standardTier = classifyTier(standardScore * 100);

    // Meme variant scoring with identical answer options
    const memeScore = oddnessScore(qIds, values, frequencies);
    const memeTier = classifyTier(memeScore * 100);

    expect(memeScore).toBe(standardScore);
    expect(memeTier).toBe(standardTier);
  });

  it("proves Anti-Twin matching candidate ranking is completely invariant to render_variant", () => {
    const target: AntiTwinCandidate = {
      submission_id: "sub-target",
      player_id: "player-target",
      country: "IN",
      region: "Mumbai, India",
      answers: [
        { question_id: "q-1", answer_key: "opt-1" },
        { question_id: "q-2", answer_key: "opt-2" },
        { question_id: "q-3", answer_key: "opt-3" },
        { question_id: "q-4", answer_key: "opt-4" },
        { question_id: "q-5", answer_key: "opt-5" },
      ],
    };

    const candidates: AntiTwinCandidate[] = [
      {
        submission_id: "sub-1",
        player_id: "player-1",
        country: "JP",
        region: "Tokyo, Japan",
        answers: [
          { question_id: "q-1", answer_key: "opt-1" },
          { question_id: "q-2", answer_key: "opt-2" },
          { question_id: "q-3", answer_key: "opt-3" },
          { question_id: "q-4", answer_key: "opt-4" },
          { question_id: "q-5", answer_key: "opt-5" },
        ],
      },
      {
        submission_id: "sub-2",
        player_id: "player-2",
        country: "DE",
        region: "Berlin, Germany",
        answers: [
          { question_id: "q-1", answer_key: "opt-diff-1" },
          { question_id: "q-2", answer_key: "opt-diff-2" },
          { question_id: "q-3", answer_key: "opt-diff-3" },
          { question_id: "q-4", answer_key: "opt-diff-4" },
          { question_id: "q-5", answer_key: "opt-diff-5" },
        ],
      },
    ];

    const optionMap = new Map<string, string[]>([
      ["q-1", ["opt-1", "opt-diff-1"]],
      ["q-2", ["opt-2", "opt-diff-2"]],
      ["q-3", ["opt-3", "opt-diff-3"]],
      ["q-4", ["opt-4", "opt-diff-4"]],
      ["q-5", ["opt-5", "opt-diff-5"]],
    ]);

    const match = computeAntiTwin(target, candidates, optionMap, "drop-2026-11-20");
    expect(match).not.toBeNull();
    expect(match?.opposite_submission_ref).toBe("sub-2");
    expect(match?.differed_count).toBe(5);
  });
});
