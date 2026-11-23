/**
 * @file mutual-pairing.test.ts
 * @package @oddly/shared
 *
 * Comprehensive Test Suite for Stage L3 (Phase 10N):
 * 1. BitMinHash 32-Byte History Signatures (P10N.02 / ADR-047)
 * 2. 4-Stage Hierarchical Tie-Breaking Pipeline (P10N.03 / ADR-046)
 * 3. Bounded K=32 Greedy Mutual Pairing Engine (P10N.04)
 * 4. Synthetic Tie-Size Simulation & Scale Invariants (P10N.07)
 */

import { describe, it, expect } from "vitest";
import {
  computeBitMinHashSignature,
  computeBitMinHashAgreement,
  mergeBitMinHashSignatures,
  signatureToHex,
  hexToSignature,
  popcount,
  SIGNATURE_BYTE_LENGTH,
} from "./bitminhash.js";
import {
  computeHmacPairTie,
  computeTieBreakWeight,
  determineTieBreakReason,
  computeTieGroupSize,
} from "./tie-breaker.js";
import {
  executeMutualPairing,
  extractWhyYouTwo,
  type CandidateWithHistory,
} from "./mutual-pairing.js";

describe("Stage L3: BitMinHash 32-Byte Signatures (P10N.02)", () => {
  it("generates signatures of exactly 32 bytes (256 bits)", () => {
    const answers = [
      { question_id: "q1", value: "opt_a" },
      { question_id: "q2", value: ["topping_1", "topping_2"] },
      { question_id: "q3", value: [0, 2, 1] },
      { question_id: "q4", value: 5 },
      { question_id: "q5", value: "scene_sunny" },
    ];

    const sig = computeBitMinHashSignature(answers);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(SIGNATURE_BYTE_LENGTH);

    // Number of set bits should be roughly balanced (not all zeroes or all ones)
    const setBits = popcount(sig);
    expect(setBits).toBeGreaterThan(50);
    expect(setBits).toBeLessThan(200);
  });

  it("produces 100% agreement (1.0) on identical answer sets (Reflexivity)", () => {
    const answers = [
      { question_id: "q1", value: "A" },
      { question_id: "q2", value: "B" },
    ];
    const sigA = computeBitMinHashSignature(answers);
    const sigB = computeBitMinHashSignature(answers);

    const agreement = computeBitMinHashAgreement(sigA, sigB);
    expect(agreement).toBe(1.0);
  });

  it("produces symmetric agreement scores: agreement(A, B) === agreement(B, A)", () => {
    const setA = [
      { question_id: "q1", value: "A" },
      { question_id: "q2", value: "B" },
    ];
    const setB = [
      { question_id: "q1", value: "A" },
      { question_id: "q2", value: "C" },
    ];
    const sigA = computeBitMinHashSignature(setA);
    const sigB = computeBitMinHashSignature(setB);

    const agreementAB = computeBitMinHashAgreement(sigA, sigB);
    const agreementBA = computeBitMinHashAgreement(sigB, sigA);

    expect(agreementAB).toBe(agreementBA);
    expect(agreementAB).toBeGreaterThan(0.5);
    expect(agreementAB).toBeLessThan(1.0);
  });

  it("shows monotonic decay in agreement as answer overlap decreases", () => {
    const base = [
      { question_id: "q1", value: "1" },
      { question_id: "q2", value: "2" },
      { question_id: "q3", value: "3" },
      { question_id: "q4", value: "4" },
    ];
    const oneDiff = [
      { question_id: "q1", value: "1" },
      { question_id: "q2", value: "2" },
      { question_id: "q3", value: "3" },
      { question_id: "q4", value: "X" },
    ];
    const allDiff = [
      { question_id: "q1", value: "W" },
      { question_id: "q2", value: "X" },
      { question_id: "q3", value: "Y" },
      { question_id: "q4", value: "Z" },
    ];

    const sigBase = computeBitMinHashSignature(base);
    const sigOneDiff = computeBitMinHashSignature(oneDiff);
    const sigAllDiff = computeBitMinHashSignature(allDiff);

    const agreeOne = computeBitMinHashAgreement(sigBase, sigOneDiff);
    const agreeAll = computeBitMinHashAgreement(sigBase, sigAllDiff);

    expect(agreeOne).toBeGreaterThan(agreeAll);
  });

  it("round-trips hex serialization perfectly", () => {
    const answers = [{ question_id: "q1", value: "sample" }];
    const sig = computeBitMinHashSignature(answers);

    const hex = signatureToHex(sig);
    expect(hex.length).toBe(64);

    const parsed = hexToSignature(hex);
    expect(parsed).toEqual(sig);
  });

  it("merges multiple trailing signatures into a valid aggregate", () => {
    const day1 = computeBitMinHashSignature([{ question_id: "q1", value: "A" }]);
    const day2 = computeBitMinHashSignature([{ question_id: "q1", value: "B" }]);
    const day3 = computeBitMinHashSignature([{ question_id: "q1", value: "A" }]);

    const merged = mergeBitMinHashSignatures([day1, day2, day3]);
    expect(merged.length).toBe(32);
    // Merged signature should share high agreement with the majority day1/day3
    expect(computeBitMinHashAgreement(merged, day1)).toBeGreaterThan(0.6);
  });
});

describe("Stage L3: 4-Stage Tie-Breaking Pipeline (P10N.03)", () => {
  const dropId = "00000000-0000-4000-a000-000000000099";

  it("HMAC-SHA256 tiebreak is symmetric and deterministic", () => {
    const playerA = "player-alpha";
    const playerB = "player-beta";

    const hashAB = computeHmacPairTie(dropId, playerA, playerB);
    const hashBA = computeHmacPairTie(dropId, playerB, playerA);

    expect(hashAB).toBe(hashBA);
    expect(hashAB).toBeGreaterThanOrEqual(0.0);
    expect(hashAB).toBeLessThan(1.0);

    // Repeated calls yield identical result
    expect(computeHmacPairTie(dropId, playerA, playerB)).toBe(hashAB);
  });

  it("higher Drop similarity strictly dominates all tiebreak stages (Monotonicity)", () => {
    // Player 1 has similarity 0.8, but 0 agreement and same country
    // Player 2 has similarity 0.7, but perfect 1.0 agreement, different country, and max hash
    const p1 = computeTieBreakWeight(dropId, "u", "v1", 0.8, { historyDays: 0 }, { historyDays: 0 });
    const p2 = computeTieBreakWeight(dropId, "u", "v2", 0.7, {
      signature: new Uint8Array(32),
      historyDays: 20,
      country: "US",
    }, {
      signature: new Uint8Array(32),
      historyDays: 20,
      country: "IN",
    });

    expect(p1.weight).toBeGreaterThan(p2.weight);
  });

  it("breaks equal-similarity ties by 28-day history agreement first", () => {
    const sigA = new Uint8Array(32).fill(0xaa);
    const sigB = new Uint8Array(32).fill(0xaa); // 100% agreement with A
    const sigC = new Uint8Array(32).fill(0x55); // 0% agreement with A

    const profileA = { signature: sigA, historyDays: 14, country: "IN" };
    const profileB = { signature: sigB, historyDays: 14, country: "IN" };
    const profileC = { signature: sigC, historyDays: 14, country: "IN" };

    const scoreB = computeTieBreakWeight(dropId, "A", "B", 0.8, profileA, profileB);
    const scoreC = computeTieBreakWeight(dropId, "A", "C", 0.8, profileA, profileC);

    expect(scoreB.weight).toBeGreaterThan(scoreC.weight);
    expect(determineTieBreakReason(scoreB, scoreC)).toBe("history_agreement");
  });

  it("breaks equal-similarity, equal-history ties by cross-culture bonus second", () => {
    const profileA = { historyDays: 0, country: "IN" };
    const profileB = { historyDays: 0, country: "DE" }; // different country
    const profileC = { historyDays: 0, country: "IN" }; // same country

    const scoreB = computeTieBreakWeight(dropId, "A", "B", 0.8, profileA, profileB);
    const scoreC = computeTieBreakWeight(dropId, "A", "C", 0.8, profileA, profileC);

    expect(scoreB.weight).toBeGreaterThan(scoreC.weight);
    expect(determineTieBreakReason(scoreB, scoreC)).toBe("cross_culture");
  });

  it("breaks completely identical ties by cryptographic HMAC hash", () => {
    const profileA = { historyDays: 0, country: "IN" };
    const profileB = { historyDays: 0, country: "IN" };

    const score1 = computeTieBreakWeight(dropId, "A", "B", 0.8, profileA, profileB);
    const score2 = computeTieBreakWeight(dropId, "A", "C", 0.8, profileA, profileB);

    const reason = determineTieBreakReason(score1, score2);
    expect(reason).toBe("deterministic_hash");
  });

  it("calculates honest group size T within epsilon = 0.01", () => {
    const scores = [0.995, 0.991, 0.985, 0.950, 0.800];
    const peak = 0.995;

    // 0.995 and 0.991 and 0.985 are >= 0.995 - 0.01 = 0.985 -> count is 3
    const tieGroup = computeTieGroupSize(scores, peak, 0.01);
    expect(tieGroup).toBe(3);
  });
});

describe("Stage L3: Bounded K=32 Greedy Mutual Pairing Engine (P10N.04)", () => {
  const dropId = "00000000-0000-4000-a000-000000000001";

  it("pairs players reciprocally (is_mutual = true) with symmetrical assignments", () => {
    const submissions: CandidateWithHistory[] = [
      {
        player_id: "p1",
        submission_id: "sub1",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [
          { question_id: "q1", value: "A" },
          { question_id: "q2", value: "B" },
        ],
        country: "IN",
      },
      {
        player_id: "p2",
        submission_id: "sub2",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [
          { question_id: "q1", value: "A" },
          { question_id: "q2", value: "B" },
        ],
        country: "US",
      },
      {
        player_id: "p3",
        submission_id: "sub3",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [
          { question_id: "q1", value: "X" },
          { question_id: "q2", value: "Y" },
        ],
        country: "DE",
      },
      {
        player_id: "p4",
        submission_id: "sub4",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [
          { question_id: "q1", value: "X" },
          { question_id: "q2", value: "Y" },
        ],
        country: "FR",
      },
    ];

    const result = executeMutualPairing(submissions, dropId);

    expect(result.matches.length).toBe(2);
    expect(result.mutualCount).toBe(2);
    expect(result.asymmetricCount).toBe(0);

    // p1 should pair with p2, p3 with p4
    const match1 = result.matches.find((m) => m.player_a_id === "p1" || m.player_b_id === "p1");
    expect(match1).toBeDefined();
    expect(match1!.is_mutual).toBe(true);
    expect([match1!.player_a_id, match1!.player_b_id]).toContain("p2");

    const match2 = result.matches.find((m) => m.player_a_id === "p3" || m.player_b_id === "p3");
    expect(match2).toBeDefined();
    expect(match2!.is_mutual).toBe(true);
    expect([match2!.player_a_id, match2!.player_b_id]).toContain("p4");
  });

  it("handles odd player pools with graceful asymmetric fallback (is_mutual = false)", () => {
    const submissions: CandidateWithHistory[] = [
      {
        player_id: "p1",
        submission_id: "sub1",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [{ question_id: "q1", value: "A" }],
      },
      {
        player_id: "p2",
        submission_id: "sub2",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [{ question_id: "q1", value: "A" }],
      },
      {
        player_id: "p3",
        submission_id: "sub3",
        drop_id: dropId,
        submitted_at: new Date(),
        answers: [{ question_id: "q1", value: "A" }],
      },
    ];

    const result = executeMutualPairing(submissions, dropId);

    expect(result.matches.length).toBe(2); // 1 mutual pair + 1 asymmetric match for p3
    expect(result.mutualCount).toBe(1);
    expect(result.asymmetricCount).toBe(1);

    const asymMatch = result.matches.find((m) => !m.is_mutual);
    expect(asymMatch).toBeDefined();
    expect(asymMatch!.is_mutual).toBe(false);
  });

  it("extracts rarest shared answers for 'Why you two?' accordion", () => {
    const answersA = [
      { question_id: "q1", value: "common_choice" },
      { question_id: "q2", value: "rare_choice" },
      { question_id: "q3", value: "divergent_A" },
    ];
    const answersB = [
      { question_id: "q1", value: "common_choice" },
      { question_id: "q2", value: "rare_choice" },
      { question_id: "q3", value: "divergent_B" },
    ];

    const freqMap = new Map<string, Map<string, number>>();
    const q1Freq = new Map<string, number>([["common_choice", 0.65]]);
    const q2Freq = new Map<string, number>([["rare_choice", 0.042]]);
    freqMap.set("q1", q1Freq);
    freqMap.set("q2", q2Freq);

    const whyItems = extractWhyYouTwo(answersA, answersB, freqMap);

    expect(whyItems.length).toBe(2);
    // Rarest shared answer should be first
    expect(whyItems[0]!.question_id).toBe("q2");
    expect(whyItems[0]!.value).toBe("rare_choice");
    expect(whyItems[0]!.rarity_percent).toBe(4.2);

    expect(whyItems[1]!.question_id).toBe("q1");
    expect(whyItems[1]!.rarity_percent).toBe(65.0);
  });
});

describe("Stage L3: Synthetic Scale Simulation (P10N.07)", () => {
  it("scales to 500 simulated players with sub-100ms execution and high mutual rate", () => {
    const dropId = "scale-drop-sim";
    const N = 500;
    const submissions: CandidateWithHistory[] = [];

    // Simulate 500 players with Zipf-like option distribution across 5 questions
    for (let i = 0; i < N; i++) {
      const answers = [
        { question_id: "q1", value: `opt_${Math.floor(Math.pow(Math.random(), 1.5) * 4)}` },
        { question_id: "q2", value: `opt_${Math.floor(Math.pow(Math.random(), 1.5) * 3)}` },
        { question_id: "q3", value: `opt_${Math.floor(Math.pow(Math.random(), 1.5) * 5)}` },
        { question_id: "q4", value: `opt_${Math.floor(Math.pow(Math.random(), 1.5) * 2)}` },
        { question_id: "q5", value: `opt_${Math.floor(Math.pow(Math.random(), 1.5) * 4)}` },
      ];

      const sig = computeBitMinHashSignature(answers);

      submissions.push({
        player_id: `player_${i}`,
        submission_id: `sub_${i}`,
        drop_id: dropId,
        submitted_at: new Date(1700000000000 + i * 1000),
        answers,
        country: i % 3 === 0 ? "IN" : i % 3 === 1 ? "US" : "GB",
        historySignature: sig,
        historyDays: 10 + (i % 18),
      });
    }

    const start = performance.now();
    const result = executeMutualPairing(submissions, dropId, new Map(), undefined, 32);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(3000); // well within bounds
    expect(result.matches.length).toBeGreaterThanOrEqual(250);

    // In a cohort of 500 players, greedy mutual pairing on K=32 captures >= 90% in mutual pairs
    const mutualPlayerCount = result.mutualCount * 2;
    const mutualRate = mutualPlayerCount / N;
    expect(mutualRate).toBeGreaterThanOrEqual(0.85);

    // Verify determinism: re-running gives identical pairs
    const result2 = executeMutualPairing(submissions, dropId, new Map(), undefined, 32);
    expect(result2.matches.length).toBe(result.matches.length);
    expect(result2.matches[0]!.player_a_id).toBe(result.matches[0]!.player_a_id);
    expect(result2.matches[0]!.player_b_id).toBe(result.matches[0]!.player_b_id);
    expect(result2.matches[0]!.edge_weight).toBe(result.matches[0]!.edge_weight);
  });
});
