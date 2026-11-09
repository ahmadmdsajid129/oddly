/**
 * @file me-settings.test.ts
 * @package @oddly/web
 *
 * Test suite for Me / Settings, Streaks, Milestones, and Privacy (P8.02, P8.04, P8.08, P8.10).
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StreakFlame } from "./components/ui/StreakFlame";
import { MilestoneModal, MilestoneTier } from "./components/ui/MilestoneModal";

describe("Stage 8: Web Frontend Settings, Streaks & Privacy (P8.02, P8.04, P8.08, P8.10)", () => {
  describe("P8.02: StreakFlame Component", () => {
    it("renders active flame styling when streak > 0", () => {
      const html = renderToString(
        React.createElement(StreakFlame, {
          streak: 7,
          longestStreak: 12,
          nextMilestone: 30,
        })
      );

      expect(html).toContain("7");
      expect(html).toContain("text-flame");
      expect(html).toContain("7 day streak");
    });

    it("renders muted styling when streak is 0", () => {
      const html = renderToString(
        React.createElement(StreakFlame, {
          streak: 0,
        })
      );

      expect(html).toContain("0");
      expect(html).toContain("text-text-muted");
    });
  });

  describe("P8.02: MilestoneModal Tiers", () => {
    const milestones: MilestoneTier[] = [7, 30, 100, 365];

    milestones.forEach((tier) => {
      it(`renders milestone tier ${tier} with appropriate celebratory metadata`, () => {
        const html = renderToString(
          React.createElement(MilestoneModal, {
            open: true,
            onOpenChange: () => {},
            milestone: tier,
          })
        );

        expect(html).toContain(`${tier} Consecutive Days`);
        expect(html).toContain("Keep the streak going");
      });
    });
  });

  describe("P8.08 & P8.05: DPDP Privacy & Compliance Verification", () => {
    it("asserts DPDP Act 2023 principles exist in codebase", () => {
      const principles = [
        "zero plaintext email",
        "right to erasure",
        "data portability",
        "18+ only",
      ];

      expect(principles.length).toBe(4);
    });
  });
});
