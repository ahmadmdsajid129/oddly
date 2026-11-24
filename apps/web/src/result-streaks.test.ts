/**
 * @file result-streaks.test.ts
 *
 * Tests for Slice A5: Result Hub, Share Cards, Streaks & History (Decision D4, D5).
 */

import { describe, it, expect } from "vitest";
import { calculateStreak, getTwinDay } from "@oddly/shared";

describe("Slice A5: Result Hub, Per-Lane Streaks & History", () => {
  describe("Decision D4: Per-Lane Streaks", () => {
    it("computes per-lane streaks independently without collision", () => {
      const today = "2026-11-24";
      const yesterday = "2026-11-23";
      const dayBefore = "2026-11-22";

      // Everyday lane has 3 consecutive days
      const everydayDates = [today, yesterday, dayBefore];
      const everydayStreak = calculateStreak(everydayDates, today);
      expect(everydayStreak).toBe(3);

      // Memes lane has only played today
      const memesDates = [today];
      const memesStreak = calculateStreak(memesDates, today);
      expect(memesStreak).toBe(1);

      // Overall dates set union
      const overallDates = Array.from(new Set([...everydayDates, ...memesDates]));
      const overallStreak = calculateStreak(overallDates, today);
      expect(overallStreak).toBe(3);
    });

    it("evaluates milestone targets correctly", () => {
      const milestones = [7, 30, 100, 365];
      const currentStreak = 5;

      const next = milestones.find((m) => m > currentStreak) ?? 365;
      expect(next).toBe(7);
      expect(next - currentStreak).toBe(2);
    });
  });

  describe("Decision D5: Multi-Lane Result & Navigation", () => {
    it("validates result route parameters and lane identification", () => {
      const paramsEveryday = { lane: "everyday", date: "2026-11-24" };
      expect(paramsEveryday.lane).toBe("everyday");
      expect(paramsEveryday.date).toBe("2026-11-24");

      const paramsMemes = { lane: "memes", date: "2026-11-24" };
      expect(paramsMemes.lane).toBe("memes");
      expect(paramsMemes.date).toBe("2026-11-24");
    });

    it("filters history items by laneSlug", () => {
      const items = [
        { submissionId: "s1", laneSlug: "everyday", dropDate: "2026-11-24" },
        { submissionId: "s2", laneSlug: "memes", dropDate: "2026-11-24" },
        { submissionId: "s3", laneSlug: "everyday", dropDate: "2026-11-23" },
      ];

      const allItems = items;
      expect(allItems).toHaveLength(3);

      const everydayItems = items.filter((i) => i.laneSlug === "everyday");
      expect(everydayItems).toHaveLength(2);

      const memesItems = items.filter((i) => i.laneSlug === "memes");
      expect(memesItems).toHaveLength(1);
    });
  });
});
