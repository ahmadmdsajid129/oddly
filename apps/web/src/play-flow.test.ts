/**
 * @file play-flow.test.ts
 * Unit and integration tests for Stage 4 Play Flow Frontend.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isAdultConfirmed,
  setAdultConfirmed,
  getSavedDraft,
  saveDraft,
  clearDraft,
  getCompletedResult,
  saveCompletedResult,
  generateRequestId,
} from "./lib/play-state";
import { AnswerPayloadSchema } from "@oddly/shared";
import type { AnswerPayload } from "@oddly/shared";

// Mock localStorage and window for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "window", {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Stage 4: Play Flow State and Offline Caching", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("Age Gate & Adult Confirmation (DPDP Compliance)", () => {
    it("reports adult confirmation as false by default", () => {
      expect(isAdultConfirmed()).toBe(false);
    });

    it("persists adult confirmation after confirmation", () => {
      setAdultConfirmed();
      expect(isAdultConfirmed()).toBe(true);
      expect(localStorageMock.getItem("oddly_adult_confirmed")).toBe("true");
    });
  });

  describe("Draft Answer Persistence", () => {
    const dropId = "drop-test-001";
    const sampleAnswers: AnswerPayload[] = [
      {
        type: "text",
        question_id: "a0000000-0000-0000-0000-000000000001",
        value: "cold_pizza",
      },
      {
        type: "number",
        question_id: "a0000000-0000-0000-0000-000000000002",
        value: 42,
      },
      {
        type: "colour",
        question_id: "a0000000-0000-0000-0000-000000000003",
        value: "#3DDBB8",
      },
      {
        type: "image",
        question_id: "a0000000-0000-0000-0000-000000000004",
        value: "snack_ramen",
      },
      {
        type: "word",
        question_id: "a0000000-0000-0000-0000-000000000005",
        value: ["loyalty", "humour", "honesty"],
      },
    ];

    it("returns null when no draft is stored", () => {
      expect(getSavedDraft(dropId)).toBeNull();
    });

    it("persists and recovers partial or full draft answers", () => {
      saveDraft(dropId, sampleAnswers);
      const retrieved = getSavedDraft(dropId);
      expect(retrieved).toEqual(sampleAnswers);
      expect(retrieved?.length).toBe(5);
    });

    it("clears draft upon successful submission", () => {
      saveDraft(dropId, sampleAnswers);
      expect(getSavedDraft(dropId)).not.toBeNull();
      clearDraft(dropId);
      expect(getSavedDraft(dropId)).toBeNull();
    });
  });

  describe("Completed Result Caching", () => {
    const dropId = "drop-test-001";
    const mockResult = {
      submission_id: "sub_12345",
      score: 91,
      tier: "Legendary",
    };

    it("stores and retrieves completed drop results", () => {
      expect(getCompletedResult(dropId)).toBeNull();
      saveCompletedResult(dropId, mockResult);
      expect(getCompletedResult(dropId)).toEqual(mockResult);
    });
  });

  describe("Idempotency Token Generation", () => {
    it("generates non-empty unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).toBeDefined();
      expect(typeof id1).toBe("string");
      expect(id1.length).toBeGreaterThan(10);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Polymorphic Question Answer Validation", () => {
    it("validates all 5 question types through Zod schemas", () => {
      const q1 = AnswerPayloadSchema.safeParse({
        type: "text",
        question_id: "a0000000-0000-0000-0000-000000000001",
        value: "flat_soda",
      });
      expect(q1.success).toBe(true);

      const q2 = AnswerPayloadSchema.safeParse({
        type: "number",
        question_id: "a0000000-0000-0000-0000-000000000002",
        value: 12,
      });
      expect(q2.success).toBe(true);

      const q3 = AnswerPayloadSchema.safeParse({
        type: "colour",
        question_id: "a0000000-0000-0000-0000-000000000003",
        value: "#6C4CF1",
      });
      expect(q3.success).toBe(true);

      const q4 = AnswerPayloadSchema.safeParse({
        type: "image",
        question_id: "a0000000-0000-0000-0000-000000000004",
        value: "snack_cereal",
      });
      expect(q4.success).toBe(true);

      const q5 = AnswerPayloadSchema.safeParse({
        type: "word",
        question_id: "a0000000-0000-0000-0000-000000000005",
        value: ["spontaneity", "empathy", "ambition"],
      });
      expect(q5.success).toBe(true);
    });
  });
});
