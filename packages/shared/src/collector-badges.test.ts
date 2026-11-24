/**
 * @file collector-badges.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B3: Collector Badges & Opt-In Sharing Test Suite.
 */

import { describe, expect, it } from "vitest";
import {
  STANDARD_COLLECTOR_BADGES,
  awardCollectorBadge,
  enableBadgeSharing,
} from "./collector-badges.js";

describe("Stage B0 Slice B3: Collector Badges & Opt-In Sharing", () => {
  it("contains curated non-evaluative badge definitions", () => {
    expect(STANDARD_COLLECTOR_BADGES.length).toBeGreaterThanOrEqual(3);
    const ids = STANDARD_COLLECTOR_BADGES.map((b) => b.id);
    expect(ids).toContain("collector_tier1");
    expect(ids).toContain("all_lanes");
    expect(ids).toContain("super_twin_achieved");
  });

  it("awards badge with cryptographic evidence hash and private default state", () => {
    const badge = awardCollectorBadge({
      playerId: "player-99",
      definitionId: "collector_tier1",
      evidence: {
        dropDate: "2026-11-24",
        laneIds: ["lane-everyday", "lane-memes"],
      },
    });

    expect(badge.playerId).toBe("player-99");
    expect(badge.definitionId).toBe("collector_tier1");
    expect(badge.evidenceHash.length).toBe(16);
    expect(badge.isShared).toBe(false); // Invariant: Private by default
    expect(badge.shareId).toBeNull();
  });

  it("enables opt-in public sharing with stable shareId", () => {
    const badge = awardCollectorBadge({
      playerId: "player-99",
      definitionId: "collector_tier1",
      evidence: {
        dropDate: "2026-11-24",
      },
    });

    const sharedBadge = enableBadgeSharing(badge);
    expect(sharedBadge.isShared).toBe(true);
    expect(sharedBadge.shareId).toBeDefined();
    expect(sharedBadge.shareId?.length).toBe(12);

    // Idempotent
    const sharedAgain = enableBadgeSharing(sharedBadge);
    expect(sharedAgain.shareId).toBe(sharedBadge.shareId);
  });
});
