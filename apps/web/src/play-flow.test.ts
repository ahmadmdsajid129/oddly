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
  savePendingSubmission,
  getPendingSubmission,
  clearPendingSubmission,
  getAllPendingSubmissions,
} from "./lib/play-state";
import { queryRetryPolicy, queryRetryDelayPolicy } from "./components/providers/QueryProvider";
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
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      return Object.keys(store)[index] ?? null;
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

  describe("R1.5 Client Resilience: Pending Submission Persistence & Offline Recovery", () => {
    const dropId = "drop-offline-001";
    const samplePending = {
      drop_id: dropId,
      player_id: "player-offline-1",
      request_id: "req-offline-1234567890",
      answers: [
        { type: "text" as const, question_id: "q1", value: "A" },
        { type: "number" as const, question_id: "q2", value: 10 },
      ],
      created_at: Date.now(),
    };

    it("persists pending submission in localStorage until confirmed", () => {
      expect(getPendingSubmission(dropId)).toBeNull();
      savePendingSubmission(samplePending);

      const retrieved = getPendingSubmission(dropId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.request_id).toBe(samplePending.request_id);
      expect(retrieved?.answers).toEqual(samplePending.answers);
    });

    it("clears pending submission upon confirmed network dispatch", () => {
      savePendingSubmission(samplePending);
      expect(getPendingSubmission(dropId)).not.toBeNull();

      clearPendingSubmission(dropId);
      expect(getPendingSubmission(dropId)).toBeNull();
    });

    it("discovers all pending submissions across multiple drops for replay", () => {
      savePendingSubmission({ ...samplePending, drop_id: "drop-1", request_id: "req-1" });
      savePendingSubmission({ ...samplePending, drop_id: "drop-2", request_id: "req-2" });

      const all = getAllPendingSubmissions();
      expect(all.length).toBe(2);
      expect(all.map((item) => item.drop_id).sort()).toEqual(["drop-1", "drop-2"]);
    });
  });

  describe("R1.5 Client Resilience: TanStack Query Retry & Backoff Policy", () => {
    it("does not retry 4xx errors except 408 Timeout and 429 Rate Limit", () => {
      // 400 Bad Request
      expect(queryRetryPolicy(0, { status: 400 })).toBe(false);
      // 401 Unauthorized
      expect(queryRetryPolicy(0, { status: 401 })).toBe(false);
      // 404 Not Found
      expect(queryRetryPolicy(0, { status: 404 })).toBe(false);
      // 408 Request Timeout -> SHOULD retry
      expect(queryRetryPolicy(0, { status: 408 })).toBe(true);
      // 429 Too Many Requests -> SHOULD retry
      expect(queryRetryPolicy(0, { status: 429 })).toBe(true);
    });

    it("retries 5xx server errors and network drops up to 3 attempts", () => {
      // 500 Internal Server Error
      expect(queryRetryPolicy(0, { status: 500 })).toBe(true);
      expect(queryRetryPolicy(1, { status: 503 })).toBe(true);
      expect(queryRetryPolicy(2, { status: 502 })).toBe(true);
      // Max retries reached (failureCount >= 3)
      expect(queryRetryPolicy(3, { status: 500 })).toBe(false);
    });

    it("honors server Retry-After header when present", () => {
      const errWithHeader = {
        headers: { "retry-after": "5" },
      };
      const delay = queryRetryDelayPolicy(0, errWithHeader);
      expect(delay).toBe(5000); // 5 seconds in ms
    });

    it("computes exponential backoff with full jitter within bounded range", () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const delay = queryRetryDelayPolicy(attempt, new Error("Network dropout"));
        const base = Math.min(1000 * 2 ** attempt, 30000);
        // Delay must be between 50% and 100% of base
        expect(delay).toBeGreaterThanOrEqual(base * 0.5);
        expect(delay).toBeLessThanOrEqual(base);
      }
    });
  });
});
