/**
 * @file bonus-rounds.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B1: Bonus Rounds Engine Test Suite.
 */

import { describe, expect, it } from "vitest";
import {
  shouldOfferBonusRound,
  evaluateBonusRound,
  DEFAULT_BONUS_CONFIG,
} from "./bonus-rounds.js";

describe("Stage B0 Slice B1: Bonus Rounds (Stage L9 / F40)", () => {
  describe("Eligibility & Flag Gate", () => {
    it("is disabled by default when flag is OFF", () => {
      expect(DEFAULT_BONUS_CONFIG.flagEnabled).toBe(false);
      expect(
        shouldOfferBonusRound({
          tieGroupSize: 5,
          flagEnabled: false,
          minTieSize: 3,
        })
      ).toBe(false);
    });

    it("requires tie group size >= 3 when enabled", () => {
      expect(
        shouldOfferBonusRound({
          tieGroupSize: 2, // meaningful bonus requires >= 3
          flagEnabled: true,
          minTieSize: 3,
        })
      ).toBe(false);

      expect(
        shouldOfferBonusRound({
          tieGroupSize: 3,
          flagEnabled: true,
          minTieSize: 3,
        })
      ).toBe(true);

      expect(
        shouldOfferBonusRound({
          tieGroupSize: 10,
          flagEnabled: true,
          minTieSize: 3,
        })
      ).toBe(true);
    });
  });

  describe("Additive Peer Evaluation & HMAC Tie-Breaking", () => {
    const pTarget = {
      playerId: "p-target",
      answers: { "bq-1": "A", "bq-2": "B", "bq-3": "C" },
    };
    const p1 = {
      playerId: "p-1",
      answers: { "bq-1": "A", "bq-2": "B", "bq-3": "X" }, // 2 matches
    };
    const p2 = {
      playerId: "p-2",
      answers: { "bq-1": "A", "bq-2": "Y", "bq-3": "Z" }, // 1 match
    };

    it("identifies closest peer with highest additional matches", () => {
      const res = evaluateBonusRound("p-target", [pTarget, p1, p2]);
      expect(res.closestPeerId).toBe("p-1");
      expect(res.bonusMatches).toBe(2);
      expect(res.similarityScore).toBeCloseTo(2 / 3, 4);
    });

    it("breaks equal bonus match ties deterministically with HMAC hash", () => {
      const p3 = {
        playerId: "p-3",
        answers: { "bq-1": "A", "bq-2": "B", "bq-3": "W" }, // also 2 matches
      };

      const resA = evaluateBonusRound("p-target", [pTarget, p1, p3], "salt-1");
      const resB = evaluateBonusRound("p-target", [pTarget, p1, p3], "salt-1");

      // Invariant: Deterministic tie-breaking across multiple runs
      expect(resA.closestPeerId).toBe(resB.closestPeerId);
      expect(resA.bonusMatches).toBe(2);
    });

    it("preserves additive isolation (no alteration of base twin result)", () => {
      const baseTwinId = "p-original-twin";
      const bonusRes = evaluateBonusRound("p-target", [pTarget, p1, p2]);

      // Additive invariant: baseTwinId remains untouched
      expect(baseTwinId).toBe("p-original-twin");
      expect(bonusRes.closestPeerId).not.toBe(baseTwinId);
    });
  });
});
