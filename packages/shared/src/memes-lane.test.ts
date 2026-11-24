/**
 * @file memes-lane.test.ts
 * @package @oddly/shared
 *
 * Stage L4: Memes Lane Launch Test Suite (Phase 10O / Tasks P10O.01 - P10O.05).
 */

import { describe, it, expect } from "vitest";
import {
  MEMES_LANE_SLUG,
  validateMemesLaneDrop,
  buildMixedFormatMemesDrop,
  isEligibleTelepathyQuestion,
  selectTelepathyQuestion,
  SEED_MEMES_LANE_DROPS,
  renderMemeShareCardPng,
  assertMemesLaneTarget,
} from "./index.js";

describe("Stage L4: Memes Lane Launch (Phase 10O)", () => {
  describe("P10O.01: Content Inflow Invariant (Rule L1 & Section 8.1)", () => {
    it("allows Meme Lab submissions to target the memes lane exclusively", () => {
      expect(() => {
        assertMemesLaneTarget(MEMES_LANE_SLUG);
      }).not.toThrow();
    });

    it("strictly blocks Meme Lab submissions from feeding into Everyday lane", () => {
      expect(() => {
        assertMemesLaneTarget("everyday");
      }).toThrow(/MEME_LAB_FEED_FORBIDDEN/);

      expect(() => {
        assertMemesLaneTarget("food");
      }).toThrow(/MEME_LAB_FEED_FORBIDDEN/);
    });
  });

  describe("P10O.02: Mixed-Format Memes Drops Validation", () => {
    it("validates a well-formed mixed-format Memes drop", () => {
      const drop = buildMixedFormatMemesDrop({
        drop_date: "2026-12-09",
        theme_key: "test_theme",
        heroMeme: {
          template_key: "hero-1",
          prompt: "Hero caption pick",
          tags: ["test"],
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
        pick2of6Meme: {
          template_key: "pick2-1",
          prompt: "Pick two options",
          tags: ["test"],
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
            { label: "5", value: "5" },
            { label: "6", value: "6" },
          ],
        },
        rank3Meme: {
          template_key: "rank3-1",
          prompt: "Rank three items",
          tags: ["test"],
          items: [
            { label: "X", value: "x" },
            { label: "Y", value: "y" },
            { label: "Z", value: "z" },
          ],
        },
        slider7Meme: {
          template_key: "slider7-1",
          prompt: "Rate on spectrum",
          left_label: "Low",
          right_label: "High",
          tags: ["test"],
        },
        telepathyMeme: {
          template_key: "telepathy-1",
          prompt: "Telepathy instinct sync",
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
            { label: "Maybe", value: "maybe" },
          ],
          tags: ["test"],
        },
      });

      const validation = validateMemesLaneDrop(drop);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("rejects drops that do not have exactly 5 questions", () => {
      const drop = buildMixedFormatMemesDrop({
        drop_date: "2026-12-09",
        theme_key: "test_theme",
        heroMeme: {
          template_key: "hero-1",
          prompt: "Hero caption pick",
          tags: ["test"],
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
        pick2of6Meme: {
          template_key: "pick2-1",
          prompt: "Pick two options",
          tags: ["test"],
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
          ],
        },
        rank3Meme: {
          template_key: "rank3-1",
          prompt: "Rank three items",
          tags: ["test"],
          items: [
            { label: "X", value: "x" },
            { label: "Y", value: "y" },
          ],
        },
        slider7Meme: {
          template_key: "slider7-1",
          prompt: "Rate on spectrum",
          left_label: "Low",
          right_label: "High",
          tags: ["test"],
        },
        telepathyMeme: {
          template_key: "telepathy-1",
          prompt: "Telepathy instinct sync",
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ],
          tags: ["test"],
        },
      });

      drop.questions.pop(); // now 4 questions
      const validation = validateMemesLaneDrop(drop);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/exactly 5 questions/);
    });
  });

  describe("P10O.03: Dedicated Memes Share Card Generation", () => {
    it("renders valid Memes lane share card PNG with correct dimensions and PNG signature", async () => {
      const pngBuffer = await renderMemeShareCardPng({
        score: 4,
        total: 5,
        tier: "Rare",
        percentile: 98.4,
        templateKey: "snooze-battle",
        caption: "When the alarm rings and reality hits",
        twinCity: "Tokyo, Japan",
        shortId: "meme777",
      });

      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      expect(pngBuffer.length).toBeGreaterThan(1000);

      // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50);
      expect(pngBuffer[2]).toBe(0x4e);
      expect(pngBuffer[3]).toBe(0x47);
    });
  });

  describe("P10O.04: Lane-Isolated Telepathy for Memes Questions", () => {
    it("identifies low-cardinality meme questions (2 to 4 options) as telepathy-eligible", () => {
      const eligibleMemeQ = {
        id: "m-q5",
        type: "meme",
        render_variant: "meme",
        format: "pick1",
        answer_options: [
          { label: "A", value: "a", display_order: 1 },
          { label: "B", value: "b", display_order: 2 },
          { label: "C", value: "c", display_order: 3 },
        ],
      };

      expect(isEligibleTelepathyQuestion(eligibleMemeQ)).toBe(true);
    });

    it("rejects high-cardinality meme questions (> 4 options) for telepathy", () => {
      const highCardMemeQ = {
        id: "m-q2",
        type: "meme",
        render_variant: "meme",
        format: "pick2of6",
        answer_options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
          { label: "C", value: "c" },
          { label: "D", value: "d" },
          { label: "E", value: "e" },
          { label: "F", value: "f" },
        ],
      };

      expect(isEligibleTelepathyQuestion(highCardMemeQ)).toBe(false);
    });

    it("selects the eligible meme question from mixed drop questions", () => {
      const questions = [
        { id: "q1", type: "meme", render_variant: "meme", answer_options: new Array(5).fill({ label: "x", value: "x" }) },
        { id: "q2", type: "meme", render_variant: "meme", answer_options: new Array(6).fill({ label: "x", value: "x" }) },
        { id: "q3", type: "meme", render_variant: "meme", answer_options: new Array(3).fill({ label: "x", value: "x" }) }, // eligible!
      ];

      const selected = selectTelepathyQuestion(questions);
      expect(selected?.id).toBe("q3");
    });
  });

  describe("P10O.05: 14 Seed Memes Drops Runway Verification", () => {
    it("contains exactly 14 seed drops providing a 2-week runway", () => {
      expect(SEED_MEMES_LANE_DROPS).toHaveLength(14);
    });

    it("verifies that all 14 seed drops satisfy validateMemesLaneDrop with zero errors", () => {
      SEED_MEMES_LANE_DROPS.forEach((drop, idx) => {
        const validation = validateMemesLaneDrop(drop);
        expect(
          validation.valid,
          `Drop #${idx + 1} (${drop.drop_date} - ${drop.theme_key}) failed validation: ${validation.errors.join(", ")}`
        ).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    it("verifies format distribution across all 70 questions (100% meme render_variant)", () => {
      let totalQuestions = 0;
      let pick1Count = 0;
      let pick2of6Count = 0;
      let rank3Count = 0;
      let slider7Count = 0;

      for (const drop of SEED_MEMES_LANE_DROPS) {
        expect(drop.questions).toHaveLength(5);
        totalQuestions += drop.questions.length;

        for (const q of drop.questions) {
          expect(q.render_variant).toBe("meme");
          if (q.format === "pick1") pick1Count++;
          if (q.format === "pick2of6") pick2of6Count++;
          if (q.format === "rank3") rank3Count++;
          if (q.format === "slider7") slider7Count++;
        }
      }

      expect(totalQuestions).toBe(70);
      expect(pick1Count).toBe(28); // Q1 hero + Q5 telepathy for 14 drops = 28
      expect(pick2of6Count).toBe(14); // Q2 for 14 drops = 14
      expect(rank3Count).toBe(14); // Q3 for 14 drops = 14
      expect(slider7Count).toBe(14); // Q4 for 14 drops = 14
    });
  });
});
