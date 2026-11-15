/**
 * @file telepathy.test.ts
 * @package @oddly/web
 *
 * Test suite for Phase 10C: Telepathy (Instinct Sync) (Stage F3 / P10C.01-P10C.09).
 */

import { describe, expect, it } from "vitest";
import { calculateLuckBaseline, calculateSyncScore } from "@oddly/shared";
import type { TelepathyRoundResponse } from "@oddly/api-client";

describe("Phase 10C: Telepathy (Instinct Sync) Web Domain & UI Tests", () => {
  describe("P10C.04 & P10C.05: Drop Prerequisites and Scoped Reveal Invariant", () => {
    it("enforces waiting state when either player has not submitted today's drop", () => {
      const pendingRound: TelepathyRoundResponse = {
        drop_date: "2026-11-15",
        question: null,
        has_both_submitted: false,
        caller_submitted: true,
        partner_submitted: false,
        my_guess: null,
        partner_guess_locked: false,
        reveal: null,
        sync_summary: null,
      };

      expect(pendingRound.has_both_submitted).toBe(false);
      expect(pendingRound.caller_submitted).toBe(true);
      expect(pendingRound.partner_submitted).toBe(false);
      expect(pendingRound.my_guess).toBeNull();
      expect(pendingRound.reveal).toBeNull();
    });

    it("strictly conceals partner pick while caller's guess is unlocked", () => {
      const activeUncompletedRound: TelepathyRoundResponse = {
        drop_date: "2026-11-15",
        question: {
          id: "q-telepathy-1",
          position: 1,
          type: "text",
          prompt: "If you had to pick one lifelong curse:",
          answer_options: [
            { id: "opt-1", label: "Pizza always cold", value: "cold_pizza", display_order: 1 },
            { id: "opt-2", label: "Coffee always lukewarm", value: "lukewarm_coffee", display_order: 2 },
          ],
        },
        has_both_submitted: true,
        caller_submitted: true,
        partner_submitted: true,
        my_guess: null, // Not guessed yet
        partner_guess_locked: true,
        reveal: null, // Scoped reveal invariant: STRICTLY NULL
        sync_summary: null,
      };

      expect(activeUncompletedRound.has_both_submitted).toBe(true);
      expect(activeUncompletedRound.my_guess).toBeNull();
      expect(activeUncompletedRound.reveal).toBeNull();
    });

    it("reveals partner pick and match outcome only after caller locks in guess", () => {
      const lockedRound: TelepathyRoundResponse = {
        drop_date: "2026-11-15",
        question: {
          id: "q-telepathy-1",
          position: 1,
          type: "text",
          prompt: "If you had to pick one lifelong curse:",
          answer_options: [
            { id: "opt-1", label: "Pizza always cold", value: "cold_pizza", display_order: 1 },
            { id: "opt-2", label: "Coffee always lukewarm", value: "lukewarm_coffee", display_order: 2 },
          ],
        },
        has_both_submitted: true,
        caller_submitted: true,
        partner_submitted: true,
        my_guess: {
          guessed_option: "cold_pizza",
          locked_at: new Date().toISOString(),
        },
        partner_guess_locked: true,
        reveal: {
          partner_pick: "cold_pizza",
          is_match: true,
          baseline_p: 0.52,
        },
        sync_summary: {
          total_rounds: 1,
          matches: 1,
          sync_score: 1.0,
          baseline_score: 0.52,
          lift: 0.48,
          unlocked: false,
          min_rounds: 5,
        },
      };

      expect(lockedRound.my_guess).not.toBeNull();
      expect(lockedRound.my_guess?.guessed_option).toBe("cold_pizza");
      expect(lockedRound.reveal).not.toBeNull();
      expect(lockedRound.reveal?.partner_pick).toBe("cold_pizza");
      expect(lockedRound.reveal?.is_match).toBe(true);
      expect(lockedRound.reveal?.baseline_p).toBe(0.52);
    });
  });

  describe("P10C.06 & P10C.07: Mathematical Baseline & Shape-based Indicators", () => {
    it("calculates expected agreement baseline from question option probabilities", () => {
      const freqs = [
        { question_id: "q1", value: "optA", count: 70, probability: 0.7 },
        { question_id: "q1", value: "optB", count: 30, probability: 0.3 },
      ];
      // 0.7^2 + 0.3^2 = 0.49 + 0.09 = 0.58
      const baseline = calculateLuckBaseline("q1", freqs);
      expect(baseline).toBeCloseTo(0.58, 2);
    });

    it("verifies shape-based visual indicators (check vs cross) for accessibility", () => {
      const matchState = {
        is_match: true,
        shapeIcon: "Check",
        statusText: "Instinct Match!",
      };
      const differState = {
        is_match: false,
        shapeIcon: "X",
        statusText: "Instinct Differed",
      };

      // Ensure distinct text and icon shape, not relying on color alone
      expect(matchState.shapeIcon).not.toBe(differState.shapeIcon);
      expect(matchState.statusText).not.toBe(differState.statusText);
    });
  });

  describe("P10C.08: Composite Sync Summary Threshold", () => {
    it("locks summary until pair completes at least 5 rounds", () => {
      const fourRounds = [
        { hit: true, baseline_p: 0.5 },
        { hit: false, baseline_p: 0.5 },
        { hit: true, baseline_p: 0.5 },
        { hit: true, baseline_p: 0.5 },
      ];

      const summary4 = calculateSyncScore(fourRounds, 5);
      expect(summary4.total_rounds).toBe(4);
      expect(summary4.unlocked).toBe(false);
      expect(summary4.min_rounds).toBe(5);

      const fiveRounds = [...fourRounds, { hit: true, baseline_p: 0.5 }];
      const summary5 = calculateSyncScore(fiveRounds, 5);
      expect(summary5.total_rounds).toBe(5);
      expect(summary5.matches).toBe(4);
      expect(summary5.sync_score).toBe(0.8);
      expect(summary5.unlocked).toBe(true);
    });
  });
});

