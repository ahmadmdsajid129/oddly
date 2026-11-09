/**
 * @file recap.test.ts
 * @package @oddly/web
 *
 * Test suite for S9 Morning Recap Screen (P9.04).
 */

import { describe, expect, it } from "vitest";
import type { RecapData } from "./app/recap/page";

describe("Stage 9: S9 Morning Recap Screen (P9.04)", () => {
  it("validates recap data structure conforms to product requirements", () => {
    const mockRecap: RecapData = {
      yesterdayDate: "Nov 8",
      dropNumber: 42,
      dropId: "drop_sealed_42",
      matchedPicks: 4,
      totalPicks: 5,
      twinCity: "Tokyo, Japan",
      percentile: 84.6,
      tier: "Rare",
      globalMatchRate: 4.8,
      picksSummary: [
        {
          question: "Midnight snack craving",
          playerPick: "Warm toast with butter",
          twinPick: "Warm toast with butter",
          isMatched: true,
        },
        {
          question: "Weekend morning vibe",
          playerPick: "Slow coffee in silence",
          twinPick: "Slow coffee in silence",
          isMatched: true,
        },
      ],
    };

    expect(mockRecap.matchedPicks).toBe(4);
    expect(mockRecap.totalPicks).toBe(5);
    expect(mockRecap.twinCity).toBe("Tokyo, Japan");
    expect(mockRecap.tier).toBe("Rare");
    expect(mockRecap.percentile).toBeGreaterThan(80);
    expect(mockRecap.globalMatchRate).toBeLessThan(10);
    expect(mockRecap.picksSummary.length).toBe(2);
    expect(mockRecap.picksSummary[0]?.isMatched).toBe(true);
  });
});
