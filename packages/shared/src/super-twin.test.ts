/**
 * @file super-twin.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B2: Super Twin Test Suite.
 */

import { describe, expect, it } from "vitest";
import { evaluateSuperTwin, DEFAULT_SUPER_TWIN_CONFIG } from "./super-twin.js";

describe("Stage B0 Slice B2: Super Twin Alignment (Stage L7 / F38)", () => {
  it("rejects pair when fewer than min_lanes (default 2) are shared", () => {
    const res = evaluateSuperTwin({
      playerId: "p-1",
      candidateId: "p-2",
      dropDate: "2026-11-24",
      sharedLaneScores: [
        { laneId: "l-1", laneSlug: "everyday", similarity: 0.95 },
      ],
    });

    expect(res.isSuperTwin).toBe(false);
    expect(res.qualifies).toBe(false);
    expect(res.sharedLanes).toEqual(["everyday"]);
  });

  it("rejects pair when mean similarity across 2 lanes is below threshold (0.80)", () => {
    const res = evaluateSuperTwin({
      playerId: "p-1",
      candidateId: "p-2",
      dropDate: "2026-11-24",
      sharedLaneScores: [
        { laneId: "l-1", laneSlug: "everyday", similarity: 0.85 },
        { laneId: "l-2", laneSlug: "memes", similarity: 0.7 }, // mean = 0.775 < 0.80
      ],
    });

    expect(res.isSuperTwin).toBe(false);
    expect(res.meanSimilarity).toBeCloseTo(0.775, 3);
  });

  it("qualifies as Super Twin when >= 2 lanes achieve mean similarity >= 0.80", () => {
    const res = evaluateSuperTwin({
      playerId: "p-1",
      candidateId: "p-2",
      dropDate: "2026-11-24",
      sharedLaneScores: [
        { laneId: "l-1", laneSlug: "everyday", similarity: 0.88 },
        { laneId: "l-2", laneSlug: "memes", similarity: 0.84 },
      ],
    });

    expect(res.isSuperTwin).toBe(true);
    expect(res.qualifies).toBe(true);
    expect(res.meanSimilarity).toBeCloseTo(0.86, 2);
    expect(res.sharedLanes).toEqual(["everyday", "memes"]);
  });
});
