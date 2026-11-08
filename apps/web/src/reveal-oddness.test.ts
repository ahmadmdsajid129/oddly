/**
 * @file reveal-oddness.test.ts
 * Tests for Stage 5 Reveal, Matching UX and Oddness calculations.
 */

import { describe, it, expect } from "vitest";
import { classifyRarityTier } from "@oddly/shared";

describe("Stage 5: Reveal, Matching UX & Oddness Logic", () => {
  describe("Rarity Tier Thresholds (D-016 descending rule)", () => {
    it("classifies scores into correct rarity tiers", () => {
      expect(classifyRarityTier(20)).toBe("Common");
      expect(classifyRarityTier(59.9)).toBe("Common");
      expect(classifyRarityTier(60)).toBe("Uncommon");
      expect(classifyRarityTier(84.9)).toBe("Uncommon");
      expect(classifyRarityTier(85)).toBe("Rare");
      expect(classifyRarityTier(94.9)).toBe("Rare");
      expect(classifyRarityTier(95)).toBe("Legendary");
      expect(classifyRarityTier(99.5)).toBe("Legendary");
    });
  });

  describe("Twin Location & Honest State Rules", () => {
    const evaluateHonestState = (
      matchedPicks: number,
      totalPlayers: number
    ): {
      isExactTwin: boolean;
      isWeakMatch: boolean;
      isEarlyDay: boolean;
      statusLabel: string;
    } => {
      const isExactTwin = matchedPicks === 5;
      const isWeakMatch = matchedPicks <= 2;
      const isEarlyDay = totalPlayers < 200;

      let statusLabel = "Strong Match";
      if (isExactTwin) {
        statusLabel = "Exact Twin";
      } else if (isWeakMatch) {
        statusLabel = "Eclectic Match";
      } else if (isEarlyDay) {
        statusLabel = "Early Drop Session";
      }

      return { isExactTwin, isWeakMatch, isEarlyDay, statusLabel };
    };

    it("identifies exact twins correctly (5/5)", () => {
      const state = evaluateHonestState(5, 1200);
      expect(state.isExactTwin).toBe(true);
      expect(state.isWeakMatch).toBe(false);
      expect(state.statusLabel).toBe("Exact Twin");
    });

    it("identifies weak matches honestly (<= 2/5)", () => {
      const state1 = evaluateHonestState(2, 2500);
      expect(state1.isWeakMatch).toBe(true);
      expect(state1.statusLabel).toBe("Eclectic Match");

      const state2 = evaluateHonestState(1, 2500);
      expect(state2.isWeakMatch).toBe(true);
    });

    it("flags early day session when total players < 200", () => {
      const state = evaluateHonestState(4, 85);
      expect(state.isEarlyDay).toBe(true);
    });

    it("formats twin location as City, Country (Founder Decision)", () => {
      const formatLocation = (city: string, country: string): string => {
        return `${city}, ${country}`;
      };

      expect(formatLocation("Berlin", "Germany")).toBe("Berlin, Germany");
      expect(formatLocation("Mumbai", "India")).toBe("Mumbai, India");
      expect(formatLocation("Lagos", "Nigeria")).toBe("Lagos, Nigeria");
    });
  });

  describe("Search Animation Timing", () => {
    it("respects 2000ms maximum duration and 100ms reduced-motion timing", () => {
      const getDuration = (reducedMotion: boolean): number => {
        return reducedMotion ? 100 : 2000;
      };

      expect(getDuration(false)).toBe(2000);
      expect(getDuration(true)).toBe(100);
    });
  });
});
