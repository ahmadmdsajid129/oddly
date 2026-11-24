/**
 * @file chat-unlock.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice A12: Chat Unlock Engine & Three Doors Test Suite.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIAL_PROMPTS,
  scoreDuoTrial,
  evaluateThreeDoors,
  transitionChatConfirm,
} from "./chat-unlock.js";

describe("Stage B0 Slice A12: Chat Unlock Engine & Three Doors", () => {
  describe("Duo Trial v0 Prompts & Scoring", () => {
    it("contains exactly 8 balanced 2-option prompts", () => {
      expect(DEFAULT_TRIAL_PROMPTS.length).toBe(8);
      for (const p of DEFAULT_TRIAL_PROMPTS) {
        expect(p.id).toBeDefined();
        expect(p.prompt_text.length).toBeGreaterThan(5);
        expect(p.option_a.length).toBeGreaterThan(0);
        expect(p.option_b.length).toBeGreaterThan(0);
        expect(p.option_a).not.toBe(p.option_b);
        expect(p.category.length).toBeGreaterThan(0);
      }
    });

    it("evaluates trial pass mark (requires >= 5 matches out of 8)", () => {
      const answersA = [
        { prompt_id: "trial-1", choice: "Coffee first, questions later" },
        { prompt_id: "trial-2", choice: "Night owl alive after midnight" },
        { prompt_id: "trial-3", choice: "Pine mountains and crisp air" },
        { prompt_id: "trial-4", choice: "Text message with funny reaction" },
        { prompt_id: "trial-5", choice: "Firm itinerary with bookings" },
        { prompt_id: "trial-6", choice: "Home-cooked simple comfort food" },
        { prompt_id: "trial-7", choice: "Sweet dessert / chocolate bar" },
        { prompt_id: "trial-8", choice: "Loyal dog greeting at the door" },
      ];

      // 4 matches
      const answersB4 = [
        { prompt_id: "trial-1", choice: "Coffee first, questions later" }, // match 1
        { prompt_id: "trial-2", choice: "Night owl alive after midnight" }, // match 2
        { prompt_id: "trial-3", choice: "Pine mountains and crisp air" }, // match 3
        { prompt_id: "trial-4", choice: "Text message with funny reaction" }, // match 4
        { prompt_id: "trial-5", choice: "Completely open and spontaneous" }, // diff
        { prompt_id: "trial-6", choice: "Order delivery from favourite spot" }, // diff
        { prompt_id: "trial-7", choice: "Crispy savory chips / salted nuts" }, // diff
        { prompt_id: "trial-8", choice: "Independent cat napping on desk" }, // diff
      ];

      const res4 = scoreDuoTrial(answersA, answersB4, 5);
      expect(res4.matches).toBe(4);
      expect(res4.total).toBe(8);
      expect(res4.passed).toBe(false);

      // 5 matches
      const answersB5 = [
        ...answersB4.slice(0, 4),
        { prompt_id: "trial-5", choice: "Firm itinerary with bookings" }, // match 5
        ...answersB4.slice(5),
      ];

      const res5 = scoreDuoTrial(answersA, answersB5, 5);
      expect(res5.matches).toBe(5);
      expect(res5.passed).toBe(true);
    });
  });

  describe("Three Doors Evaluation", () => {
    it("remains locked when no doors have been passed", () => {
      const evalResult = evaluateThreeDoors({
        trialPassed: false,
        coStreak: 1,
        syncScorePct: 40,
        streakThreshold: 3,
        syncThreshold: 60,
      });

      expect(evalResult.isUnlocked).toBe(false);
      expect(evalResult.unlockedBy).toBeNull();
      expect(evalResult.doors.trial.passed).toBe(false);
      expect(evalResult.doors.streak.passed).toBe(false);
      expect(evalResult.doors.sync.passed).toBe(false);
    });

    it("unlocks via Door 1 (Duo Trial) when passed", () => {
      const evalResult = evaluateThreeDoors({
        trialPassed: true,
        coStreak: 1,
        syncScorePct: 30,
      });

      expect(evalResult.isUnlocked).toBe(true);
      expect(evalResult.unlockedBy).toBe("trial");
      expect(evalResult.doors.trial.passed).toBe(true);
    });

    it("unlocks via Door 2 (Co-Streak >= 3 days)", () => {
      const evalResult = evaluateThreeDoors({
        trialPassed: false,
        coStreak: 3,
        syncScorePct: 45,
      });

      expect(evalResult.isUnlocked).toBe(true);
      expect(evalResult.unlockedBy).toBe("streak");
      expect(evalResult.doors.streak.passed).toBe(true);
    });

    it("unlocks via Door 3 (Sync Score >= 60%)", () => {
      const evalResult = evaluateThreeDoors({
        trialPassed: false,
        coStreak: 2,
        syncScorePct: 65,
      });

      expect(evalResult.isUnlocked).toBe(true);
      expect(evalResult.unlockedBy).toBe("sync");
      expect(evalResult.doors.sync.passed).toBe(true);
    });
  });

  describe("Both-Confirm State Machine & Scope Fence", () => {
    const playerA = "player-a-111";
    const playerB = "player-b-222";

    it("prevents confirmation when doors are locked", () => {
      const res = transitionChatConfirm({
        currentChatState: "closed",
        callerPlayerId: playerA,
        consentPlayerId: null,
        unlockState: "locked",
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe("DOORS_LOCKED");
      expect(res.isReady).toBe(false);
    });

    it("moves to pending_confirm when first player confirms", () => {
      const res = transitionChatConfirm({
        currentChatState: "closed",
        callerPlayerId: playerA,
        consentPlayerId: null,
        unlockState: "unlocked",
      });

      expect(res.ok).toBe(true);
      expect(res.nextChatState).toBe("pending_confirm");
      expect(res.consentPlayerId).toBe(playerA);
      expect(res.isReady).toBe(false);
    });

    it("detects idempotent confirmation when first player taps again", () => {
      const res = transitionChatConfirm({
        currentChatState: "pending_confirm",
        callerPlayerId: playerA,
        consentPlayerId: playerA,
        unlockState: "unlocked",
      });

      expect(res.ok).toBe(true);
      expect(res.nextChatState).toBe("pending_confirm");
      expect(res.alreadyConfirmed).toBe(true);
      expect(res.isReady).toBe(false);
    });

    it("transitions to chat_ready when second player confirms", () => {
      const res = transitionChatConfirm({
        currentChatState: "pending_confirm",
        callerPlayerId: playerB,
        consentPlayerId: playerA,
        unlockState: "unlocked",
      });

      expect(res.ok).toBe(true);
      expect(res.nextChatState).toBe("chat_ready");
      expect(res.isReady).toBe(true);
    });
  });
});
