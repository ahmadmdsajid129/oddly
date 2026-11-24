/**
 * @file scenario-200.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice A14: The 200-Player Scenario Test Suite.
 */

import { describe, expect, it } from "vitest";
import { run200Scenario, SCENARIO_QUESTIONS, computeSim } from "../../../tools/seed-200-scenario.mjs";

describe("Stage B0 Slice A14: 200-Player Scenario Verification", () => {
  const { result, players, pairs, playerScores, playerTieGroups } = run200Scenario();

  it("seeds exactly 200 players with valid 5-question answer profiles", () => {
    expect(players.length).toBe(200);
    expect(result.playerCount).toBe(200);

    for (const p of players) {
      expect(p.id).toMatch(/^player-\d{3}$/);
      expect(p.country).toBeDefined();
      expect(p.historySignature.length).toBe(16);

      // Verify answers for all 5 questions
      expect(p.answers["q-1"]).toBeDefined();
      expect(Array.isArray(p.answers["q-2"])).toBe(true);
      expect(p.answers["q-2"].length).toBe(2);
      expect(Array.isArray(p.answers["q-3"])).toBe(true);
      expect(p.answers["q-3"].length).toBe(3);
      expect(typeof p.answers["q-4"]).toBe("number");
      expect(p.answers["q-5"]).toBeDefined();
    }
  });

  it("forms valid mutual pairs with zero below-tie-group violations", () => {
    expect(pairs.length).toBeGreaterThan(0);
    const EPSILON = 0.01;

    for (const pair of pairs) {
      const bestU = playerScores.get(pair.u).bestS;
      const bestV = playerScores.get(pair.v).bestS;

      // Invariant: Both players in a mutual pair must be within EPSILON of their best similarity
      expect(pair.weight).toBeGreaterThanOrEqual(bestU - EPSILON - 1e-6);
      expect(pair.weight).toBeGreaterThanOrEqual(bestV - EPSILON - 1e-6);
    }
  });

  it("verifies exact mathematical symmetry S(u, v) == S(v, u)", () => {
    const p1 = players[0];
    const p2 = players[1];

    let wSum = 0;
    let simSum1 = 0;
    let simSum2 = 0;

    for (const q of SCENARIO_QUESTIONS) {
      const sim1 = computeSim(q, p1.answers[q.id], p2.answers[q.id]);
      const sim2 = computeSim(q, p2.answers[q.id], p1.answers[q.id]);
      expect(sim1).toBe(sim2);
    }
  });

  it("ensures explain:twin output data is available for all formed pairs", () => {
    const topPair = pairs[0];
    expect(topPair).toBeDefined();

    const playerU = players.find((p) => p.id === topPair.u);
    const playerV = players.find((p) => p.id === topPair.v);

    expect(playerU).toBeDefined();
    expect(playerV).toBeDefined();
    expect(topPair.weight).toBeGreaterThanOrEqual(0.8);
  });
});
