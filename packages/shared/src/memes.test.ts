/**
 * @file memes.test.ts
 * @package @oddly/shared
 *
 * Unit tests for Meme Lab schemas, scoring, duplicate detection, and Rule 18 invariants.
 */

import { describe, it, expect } from "vitest";
import {
  CreateMemeSubmissionSchema,
  levenshteinDistance,
  isDuplicateOrNearDuplicate,
  calculateWilsonScore,
  isTurnstileValid,
} from "./memes.js";

describe("Stage M3: Meme Lab Core Utilities (Phase 10G)", () => {
  describe("Rule 18: Scoped Free-Text Character Limit (<= 100 chars)", () => {
    it("accepts valid captions up to 100 characters", () => {
      const valid99 = "A".repeat(99);
      const valid100 = "B".repeat(100);

      const parsed99 = CreateMemeSubmissionSchema.safeParse({
        template_id: "tmpl_123",
        caption_text: valid99,
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      });
      expect(parsed99.success).toBe(true);

      const parsed100 = CreateMemeSubmissionSchema.safeParse({
        template_id: "tmpl_123",
        caption_text: valid100,
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      });
      expect(parsed100.success).toBe(true);
    });

    it("rejects captions strictly exceeding 100 characters", () => {
      const invalid101 = "C".repeat(101);

      const res = CreateMemeSubmissionSchema.safeParse({
        template_id: "tmpl_123",
        caption_text: invalid101,
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain("100 characters");
      }
    });

    it("rejects empty or whitespace-only captions", () => {
      const emptyRes = CreateMemeSubmissionSchema.safeParse({
        template_id: "tmpl_123",
        caption_text: "   ",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      });
      expect(emptyRes.success).toBe(false);
    });

    it("mandates originality attestation", () => {
      const res = CreateMemeSubmissionSchema.safeParse({
        template_id: "tmpl_123",
        caption_text: "Monday mornings without chai",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: false,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Duplicate and Levenshtein Detection", () => {
    it("calculates exact edit distances", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("monday", "monday")).toBe(0);
      expect(levenshteinDistance("chai", "coffee")).toBe(5);
    });

    it("detects exact duplicate captions under normalization", () => {
      const existing = ["Monday mornings without chai", "Debugging in production"];
      const check1 = isDuplicateOrNearDuplicate("monday mornings without chai!", existing);
      expect(check1.isDuplicate).toBe(true);
      expect(check1.reason).toBe("exact");

      const check2 = isDuplicateOrNearDuplicate("   Debugging IN Production...  ", existing);
      expect(check2.isDuplicate).toBe(true);
      expect(check2.reason).toBe("exact");
    });

    it("detects near-duplicates within Levenshtein edit distance <= 2", () => {
      const existing = ["Monday mornings without chai"];
      // "Monday mornings withut chai" (1 typo: missing 'o')
      const check1 = isDuplicateOrNearDuplicate("Monday mornings withut chai", existing, 2);
      expect(check1.isDuplicate).toBe(true);
      expect(check1.reason).toBe("near_duplicate");

      // Distinct caption should pass
      const check2 = isDuplicateOrNearDuplicate("Friday evenings with green tea", existing, 2);
      expect(check2.isDuplicate).toBe(false);
    });
  });

  describe("Wilson Score Lower Bound Calculation (ADR 043)", () => {
    it("returns 0 for zero raters", () => {
      expect(calculateWilsonScore(0, 0)).toBe(0.0);
    });

    it("calculates lower bound conservatively for small sample sizes", () => {
      // 5 out of 5 positive ratings (100% positive, but small sample n=5)
      const score5 = calculateWilsonScore(5, 5);
      // Wilson lower bound is well below 1.0 because of uncertainty
      expect(score5).toBeGreaterThan(0.45);
      expect(score5).toBeLessThan(0.70);
    });

    it("rewards high volume of positive ratings (n >= 200 threshold)", () => {
      // 180 out of 200 positive ratings (90% positive, n=200)
      const score200 = calculateWilsonScore(180, 200);
      expect(score200).toBeGreaterThan(0.84);
      expect(score200).toBeLessThan(0.94);

      // 900 out of 1000 positive ratings (90% positive, n=1000)
      const score1000 = calculateWilsonScore(900, 1000);
      // Higher confidence -> higher lower bound
      expect(score1000).toBeGreaterThan(score200);
    });

    it("always stays bounded within [0, 1]", () => {
      expect(calculateWilsonScore(0, 500)).toBe(0.0);
      expect(calculateWilsonScore(500, 500)).toBeLessThanOrEqual(1.0);
      expect(calculateWilsonScore(500, 500)).toBeGreaterThan(0.98);
    });
  });

  describe("Turnstile Token Verification", () => {
    it("validates test and mock tokens", () => {
      expect(isTurnstileValid("mock-valid-turnstile")).toBe(true);
      expect(isTurnstileValid("test-token")).toBe(true);
      expect(isTurnstileValid("")).toBe(false);
    });
  });
});
