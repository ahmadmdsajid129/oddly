/**
 * @file tier-b-flags.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slices B4 & B5: Tier B Scaffolding & Flag-Off Validation.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_ODDLY_DECK_CONFIG,
  isOddlyDeckEnabled,
  extractDeckCards,
} from "./oddly-deck.js";
import {
  DEFAULT_FRIEND_ORBIT_CONFIG,
  generateFriendInviteCode,
  computeFriendsGroupCompare,
} from "./friend-orbit.js";

describe("Stage B0 Tier B Slices B4 & B5 (Flag Off Invariants)", () => {
  describe("Slice B4: Oddly Deck Lite", () => {
    it("is strictly disabled by default (flag = false)", () => {
      expect(DEFAULT_ODDLY_DECK_CONFIG.flagEnabled).toBe(false);
      expect(isOddlyDeckEnabled()).toBe(false);
    });

    it("returns empty card list when flag is OFF", () => {
      const picks = [
        {
          dropDate: "2026-11-24",
          questionId: "q-1",
          questionPrompt: "Morning drink:",
          pickValue: "cold_brew",
          selfInformationBits: 3.5,
        },
      ];

      const cards = extractDeckCards(picks, { flagEnabled: false });
      expect(cards).toEqual([]);
    });

    it("extracts and tags rarity tiers when flag is ON", () => {
      const picks = [
        {
          dropDate: "2026-11-24",
          questionId: "q-common",
          questionPrompt: "Drink:",
          pickValue: "water",
          selfInformationBits: 1.2,
        },
        {
          dropDate: "2026-11-24",
          questionId: "q-rare",
          questionPrompt: "Desk item:",
          pickValue: "mechanical_keyboard",
          selfInformationBits: 3.9,
        },
        {
          dropDate: "2026-11-24",
          questionId: "q-mythic",
          questionPrompt: "Bookshop:",
          pickValue: "talk_to_ghost",
          selfInformationBits: 4.8,
        },
      ];

      const cards = extractDeckCards(picks, { flagEnabled: true, minRareBits: 3.0 });
      expect(cards.length).toBe(2);

      const rareCard = cards.find((c) => c.questionId === "q-rare");
      expect(rareCard?.rarityTier).toBe("rare");
      expect(rareCard?.holographic).toBe(false);

      const mythicCard = cards.find((c) => c.questionId === "q-mythic");
      expect(mythicCard?.rarityTier).toBe("mythic");
      expect(mythicCard?.holographic).toBe(true);
    });
  });

  describe("Slice B5: Friend-Invite Orbit & Friends Compare", () => {
    it("is strictly disabled by default (flag = false)", () => {
      expect(DEFAULT_FRIEND_ORBIT_CONFIG.flagEnabled).toBe(false);
      const inviteRes = generateFriendInviteCode("player-1", "2026-11-24");
      expect(inviteRes.ok).toBe(false);
      expect(inviteRes.error).toBe("FEATURE_DISABLED");

      const compareRes = computeFriendsGroupCompare([]);
      expect(compareRes.ok).toBe(false);
      expect(compareRes.error).toBe("FEATURE_DISABLED");
    });

    it("generates 7-day single-use invite code when enabled", () => {
      const inviteRes = generateFriendInviteCode("player-1", "2026-11-24", {
        flagEnabled: true,
        inviteExpiryDays: 7,
      });

      expect(inviteRes.ok).toBe(true);
      expect(inviteRes.code).toMatch(/^ODD-[A-F0-9]{8}$/);
      expect(inviteRes.expiresAt).toBeDefined();

      const diffDays =
        (new Date(inviteRes.expiresAt!).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it("enforces maxGroupSize = 30 in friends compare", () => {
      const members = Array.from({ length: 31 }, (_, i) => ({
        playerId: `p-${i}`,
        alias: `Friend ${i}`,
        answers: { q1: "a" },
      }));

      const res = computeFriendsGroupCompare(members, {
        flagEnabled: true,
        maxGroupSize: 30,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe("MAX_GROUP_EXCEEDED");
    });

    it("computes pair-wise agreement across friend group", () => {
      const members = [
        { playerId: "p-1", alias: "Alice", answers: { q1: "A", q2: "B", q3: "C" } },
        { playerId: "p-2", alias: "Bob", answers: { q1: "A", q2: "B", q3: "X" } }, // 2/3 = 67%
        { playerId: "p-3", alias: "Charlie", answers: { q1: "A", q2: "B", q3: "C" } }, // 3/3 = 100% with Alice
      ];

      const res = computeFriendsGroupCompare(members, { flagEnabled: true });
      expect(res.ok).toBe(true);
      expect(res.membersCount).toBe(3);
      expect(res.pairs.length).toBe(3);
      expect(res.mostSimilarPair?.memberA).toBe("Alice");
      expect(res.mostSimilarPair?.memberB).toBe("Charlie");
      expect(res.mostSimilarPair?.agreementPct).toBe(100);
    });
  });
});
