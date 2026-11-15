/**
 * @file telepathy.test.ts
 * @package @oddly/shared
 *
 * Unit tests for Telepathy question eligibility, drop validation,
 * luck baseline math, and Sync score aggregation (Stage F3 / Phase 10C).
 */

import { describe, it, expect } from "vitest";
import {
  isEligibleTelepathyQuestion,
  selectTelepathyQuestion,
  validateDropTelepathy,
  calculateLuckBaseline,
  calculateSyncScore,
  type QuestionLike,
} from "./telepathy.js";
import type { AnswerFrequency } from "./types.js";

describe("Phase 10C: Telepathy Engine & Validation", () => {
  describe("P10C.01: Question Eligibility", () => {
    it("accepts Type 1 text questions with 2 to 4 options", () => {
      const q2Options: QuestionLike = {
        id: "q-1",
        type: "text",
        answer_options: [
          { label: "Option A", value: "opt_a" },
          { label: "Option B", value: "opt_b" },
        ],
      };
      expect(isEligibleTelepathyQuestion(q2Options)).toBe(true);

      const q4Options: QuestionLike = {
        id: "q-2",
        type: "text",
        payload: {
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
      };
      expect(isEligibleTelepathyQuestion(q4Options)).toBe(true);
    });

    it("accepts Type 4 image questions with 2 to 4 illustrations", () => {
      const qImage: QuestionLike = {
        id: "q-img",
        type: "image",
        payload: {
          illustrations: [
            { label: "A", value: "a", illustration_key: "key_a" },
            { label: "B", value: "b", illustration_key: "key_b" },
            { label: "C", value: "c", illustration_key: "key_c" },
            { label: "D", value: "d", illustration_key: "key_d" },
          ],
        },
      };
      expect(isEligibleTelepathyQuestion(qImage)).toBe(true);
    });

    it("rejects questions with > 4 options or < 2 options", () => {
      const q5Options: QuestionLike = {
        id: "q-5",
        type: "text",
        answer_options: [
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
          { label: "5", value: "5" },
        ],
      };
      expect(isEligibleTelepathyQuestion(q5Options)).toBe(false);

      const q1Option: QuestionLike = {
        id: "q-1-opt",
        type: "text",
        answer_options: [{ label: "1", value: "1" }],
      };
      expect(isEligibleTelepathyQuestion(q1Option)).toBe(false);
    });

    it("rejects ineligible question types (number, colour, word)", () => {
      const qNumber: QuestionLike = {
        id: "q-num",
        type: "number",
        payload: { min: 1, max: 50 },
      };
      expect(isEligibleTelepathyQuestion(qNumber)).toBe(false);

      const qColour: QuestionLike = {
        id: "q-col",
        type: "colour",
        payload: { swatches: [{ label: "Blue", value: "#0000FF", hex: "#0000FF" }] },
      };
      expect(isEligibleTelepathyQuestion(qColour)).toBe(false);

      const qWord: QuestionLike = {
        id: "q-wrd",
        type: "word",
        payload: { chips: [{ label: "A", value: "a" }], max_selections: 1 },
      };
      expect(isEligibleTelepathyQuestion(qWord)).toBe(false);
    });
  });

  describe("P10C.01 & P10C.02: Selection Logic & Admin Validation", () => {
    it("selects Type 1 text question first when available", () => {
      const questions: QuestionLike[] = [
        {
          id: "q-text-1",
          type: "text",
          answer_options: [
            { label: "Cold pizza", value: "cold_pizza" },
            { label: "Lukewarm coffee", value: "lukewarm_coffee" },
          ],
        },
        {
          id: "q-num-2",
          type: "number",
        },
        {
          id: "q-col-3",
          type: "colour",
        },
        {
          id: "q-img-4",
          type: "image",
          answer_options: [
            { label: "Cat", value: "cat" },
            { label: "Dog", value: "dog" },
            { label: "Owl", value: "owl" },
            { label: "Fox", value: "fox" },
          ],
        },
        {
          id: "q-wrd-5",
          type: "word",
        },
      ];

      const selected = selectTelepathyQuestion(questions);
      expect(selected?.id).toBe("q-text-1");

      const validation = validateDropTelepathy(questions);
      expect(validation.valid).toBe(true);
      expect(validation.telepathyQuestionId).toBe("q-text-1");
    });

    it("falls back to Type 4 image question if Type 1 is absent", () => {
      const questions: QuestionLike[] = [
        { id: "q-num-1", type: "number" },
        { id: "q-col-2", type: "colour" },
        {
          id: "q-img-3",
          type: "image",
          answer_options: [
            { label: "Cat", value: "cat" },
            { label: "Dog", value: "dog" },
          ],
        },
      ];

      const selected = selectTelepathyQuestion(questions);
      expect(selected?.id).toBe("q-img-3");

      const validation = validateDropTelepathy(questions);
      expect(validation.valid).toBe(true);
      expect(validation.telepathyQuestionId).toBe("q-img-3");
    });

    it("rejects drops that lack an eligible question", () => {
      const questions: QuestionLike[] = [
        { id: "q-num-1", type: "number" },
        { id: "q-col-2", type: "colour" },
        { id: "q-wrd-3", type: "word" },
      ];

      const validation = validateDropTelepathy(questions);
      expect(validation.valid).toBe(false);
      expect(validation.telepathyQuestionId).toBeNull();
      expect(validation.error).toContain("Drop lacks an eligible");
    });
  });

  describe("P10C.06: Random Luck Baseline Math (sum[p(a)^2])", () => {
    it("computes uniform 2-option baseline as 0.50", () => {
      const freqs: AnswerFrequency[] = [
        { question_id: "q-1", value: "a", count: 50, probability: 0.5 },
        { question_id: "q-1", value: "b", count: 50, probability: 0.5 },
      ];
      // 0.5^2 + 0.5^2 = 0.25 + 0.25 = 0.50
      expect(calculateLuckBaseline("q-1", freqs)).toBeCloseTo(0.5, 4);
    });

    it("computes uniform 4-option baseline as 0.25", () => {
      const freqs: AnswerFrequency[] = [
        { question_id: "q-4", value: "a", count: 25, probability: 0.25 },
        { question_id: "q-4", value: "b", count: 25, probability: 0.25 },
        { question_id: "q-4", value: "c", count: 25, probability: 0.25 },
        { question_id: "q-4", value: "d", count: 25, probability: 0.25 },
      ];
      // 4 * (0.25^2) = 0.25
      expect(calculateLuckBaseline("q-4", freqs)).toBeCloseTo(0.25, 4);
    });

    it("accurately computes skewed probability baseline (honest math invariant)", () => {
      const freqs: AnswerFrequency[] = [
        { question_id: "q-skew", value: "a", count: 80, probability: 0.8 },
        { question_id: "q-skew", value: "b", count: 20, probability: 0.2 },
      ];
      // 0.8^2 + 0.2^2 = 0.64 + 0.04 = 0.68
      expect(calculateLuckBaseline("q-skew", freqs)).toBeCloseTo(0.68, 4);
    });

    it("falls back to 1/optionCount if no frequencies exist yet", () => {
      expect(calculateLuckBaseline("q-empty", [], 4)).toBe(0.25);
      expect(calculateLuckBaseline("q-empty", [], 2)).toBe(0.5);
    });
  });

  describe("P10C.08: Composite Sync Score Aggregation", () => {
    it("calculates sync score, baseline, and lift across completed rounds", () => {
      const rounds = [
        { hit: true, baseline_p: 0.3 },
        { hit: true, baseline_p: 0.25 },
        { hit: false, baseline_p: 0.35 },
        { hit: true, baseline_p: 0.25 },
        { hit: true, baseline_p: 0.35 },
      ];

      const summary = calculateSyncScore(rounds, 5);
      expect(summary.total_rounds).toBe(5);
      expect(summary.matches).toBe(4);
      expect(summary.sync_score).toBe(0.8); // 4/5
      expect(summary.baseline_score).toBe(0.3); // (0.3+0.25+0.35+0.25+0.35)/5 = 1.5/5
      expect(summary.lift).toBe(0.5); // 0.8 - 0.3
      expect(summary.unlocked).toBe(true);
    });

    it("marks summary as locked when total rounds < 5", () => {
      const rounds = [
        { hit: true, baseline_p: 0.25 },
        { hit: false, baseline_p: 0.25 },
      ];

      const summary = calculateSyncScore(rounds, 5);
      expect(summary.total_rounds).toBe(2);
      expect(summary.unlocked).toBe(false);
      expect(summary.min_rounds).toBe(5);
    });
  });
});
