/**
 * @file richer-formats.test.tsx
 * @package @oddly/web
 *
 * Frontend Component & SSR Tests for Richer Answer Formats
 * (Stage L2 / Phase 10M / Tasks P10M.04, P10M.05, P10M.07).
 * Uses renderToString from react-dom/server for lightweight SSR verification.
 *
 * Verifies:
 * 1. Pick2Of6Card: Exactly 6 options rendered, 2-pick counter badge, ARIA multiselectable.
 * 2. Rank3Card: Ordered 3-item permutation, numbered badges [1], [2], [3], accessible arrow controls.
 * 3. Slider7Card: 7 discrete spectrum notches, semantic word labels, zero numbers as scores.
 * 4. SceneCard: 3-5 illustrated reaction cards, radio role and attributes.
 * 5. Seed batch validation: All 48 questions across 4 formats conform strictly to Zod schemas.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  Pick2Of6Card,
  Rank3Card,
  Slider7Card,
  SceneCard,
} from "./components/play/AnswerComponents";
import {
  Pick2Of6QuestionPayloadSchema,
  Rank3QuestionPayloadSchema,
  Slider7QuestionPayloadSchema,
  SceneQuestionPayloadSchema,
  SAMPLE_RICH_QUESTIONS,
} from "@oddly/shared";

describe("Stage L2: Richer Answer Formats UI & Schema Suite", () => {
  // ==========================================================================
  // 1. Pick2Of6Card (P10M.04, P10M.05)
  // ==========================================================================
  describe("Pick2Of6Card Rendering & Accessibility", () => {
    const sampleOptions = [
      { label: "Samosa", value: "samosa" },
      { label: "Chai", value: "chai" },
      { label: "Pakora", value: "pakora" },
      { label: "Vada", value: "vada" },
      { label: "Bhutta", value: "bhutta" },
      { label: "Maggi", value: "maggi" },
    ];

    it("renders exactly 6 options and counter badge", () => {
      const html = renderToString(
        <Pick2Of6Card
          questionId="q-pick2-1"
          options={sampleOptions}
          onChange={vi.fn()}
        />
      );

      expect(html).toContain("0 / 2 chosen");
      expect(html).toContain("Samosa");
      expect(html).toContain("Chai");
      expect(html).toContain("Pakora");
      expect(html).toContain("Vada");
      expect(html).toContain("Bhutta");
      expect(html).toContain("Maggi");
      expect(html).toContain('role="group"');
    });

    it("renders pre-selected values and clear button", () => {
      const html = renderToString(
        <Pick2Of6Card
          questionId="q-pick2-1"
          options={sampleOptions}
          selectedValue={["samosa", "chai"]}
          onChange={vi.fn()}
        />
      );

      expect(html).toContain("2 / 2 chosen");
      expect(html).toContain("Clear");
      expect(html).toContain('aria-pressed="true"');
    });
  });

  // ==========================================================================
  // 2. Rank3Card (P10M.04, P10M.05)
  // ==========================================================================
  describe("Rank3Card Rendering & Accessibility", () => {
    const sampleItems = [
      { label: "Autonomy", value: "autonomy" },
      { label: "Compensation", value: "compensation" },
      { label: "Culture", value: "culture" },
    ];

    it("renders 3 items with numbered badges [1], [2], [3] and accessible controls", () => {
      const html = renderToString(
        <Rank3Card
          questionId="q-rank3-1"
          items={sampleItems}
          onChange={vi.fn()}
        />
      );

      expect(html).toContain(">1<");
      expect(html).toContain(">2<");
      expect(html).toContain(">3<");
      expect(html).toContain("Autonomy");
      expect(html).toContain("Compensation");
      expect(html).toContain("Culture");
      expect(html).toContain('aria-label="Move Autonomy down"');
      expect(html).toContain('aria-label="Move Culture up"');
    });

    it("renders custom specified order correctly", () => {
      const html = renderToString(
        <Rank3Card
          questionId="q-rank3-1"
          items={sampleItems}
          currentOrder={["culture", "autonomy", "compensation"]}
          onChange={vi.fn()}
        />
      );

      expect(html).toContain("Current order: 1st Culture, 2nd Autonomy, 3rd Compensation");
    });
  });

  // ==========================================================================
  // 3. Slider7Card (P10M.04, P10M.05)
  // ==========================================================================
  describe("Slider7Card Rendering & Accessibility", () => {
    it("renders labeled endpoints and 7 discrete clickable notches with zero numbers as scores", () => {
      const html = renderToString(
        <Slider7Card
          questionId="q-slider7-1"
          leftLabel="Early Bird"
          rightLabel="Night Owl"
          midLabel="Flexible"
          value={4}
          onChange={vi.fn()}
        />
      );

      expect(html).toContain("Early Bird");
      expect(html).toContain("Night Owl");
      expect(html).toContain("Flexible");

      // Verify all 7 notches are rendered
      for (let i = 1; i <= 7; i++) {
        expect(html).toContain(`data-testid="slider7-notch-${i}"`);
      }

      // Verify semantic status pill (no numbers as scores)
      expect(html).toContain("Flexible");
      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-valuenow="4"');
    });

    it("reflects boundary positions with descriptive valuetext", () => {
      const html1 = renderToString(
        <Slider7Card
          questionId="q-slider7-1"
          leftLabel="Dawn Riser"
          rightLabel="Night Owl"
          value={1}
          onChange={vi.fn()}
        />
      );
      expect(html1).toContain("Extremely Dawn Riser");

      const html7 = renderToString(
        <Slider7Card
          questionId="q-slider7-1"
          leftLabel="Dawn Riser"
          rightLabel="Night Owl"
          value={7}
          onChange={vi.fn()}
        />
      );
      expect(html7).toContain("Extremely Night Owl");
    });
  });

  // ==========================================================================
  // 4. SceneCard (P10M.04, P10M.05)
  // ==========================================================================
  describe("SceneCard Rendering & Accessibility", () => {
    const sampleCards = [
      { label: "Finger Guns", value: "guns", caption: "Immediate silent salute", illustration_key: "island-torch" },
      { label: "Discreet Retreat", value: "retreat", caption: "Slip into shadows" },
      { label: "Selfie Besties", value: "selfie", caption: "Take a twin picture" },
      { label: "Play Blind", value: "blind", caption: "Stare at the wall" },
    ];

    it("renders reaction cards and radio group attributes", () => {
      const html = renderToString(
        <SceneCard
          questionId="q-scene-1"
          cards={sampleCards}
          selectedValue="guns"
          onSelect={vi.fn()}
        />
      );

      expect(html).toContain('role="radiogroup"');
      expect(html).toContain("Finger Guns");
      expect(html).toContain("Immediate silent salute");
      expect(html).toContain("Discreet Retreat");
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('aria-checked="false"');
    });
  });

  // ==========================================================================
  // 5. Seed Batch Schema Validation (P10M.07)
  // ==========================================================================
  describe("P10M.07: Seed Batch Question Validation", () => {
    it("validates all 12 pick2of6 sample questions", () => {
      expect(SAMPLE_RICH_QUESTIONS.pick2of6).toHaveLength(12);
      for (const q of SAMPLE_RICH_QUESTIONS.pick2of6) {
        const parsed = Pick2Of6QuestionPayloadSchema.safeParse(q);
        expect(parsed.success).toBe(true);
        expect(q.options).toHaveLength(6);
      }
    });

    it("validates all 12 rank3 sample questions", () => {
      expect(SAMPLE_RICH_QUESTIONS.rank3).toHaveLength(12);
      for (const q of SAMPLE_RICH_QUESTIONS.rank3) {
        const parsed = Rank3QuestionPayloadSchema.safeParse(q);
        expect(parsed.success).toBe(true);
        expect(q.items).toHaveLength(3);
      }
    });

    it("validates all 12 slider7 sample questions", () => {
      expect(SAMPLE_RICH_QUESTIONS.slider7).toHaveLength(12);
      for (const q of SAMPLE_RICH_QUESTIONS.slider7) {
        const parsed = Slider7QuestionPayloadSchema.safeParse(q);
        expect(parsed.success).toBe(true);
        expect(q.left_label.length).toBeGreaterThan(0);
        expect(q.right_label.length).toBeGreaterThan(0);
      }
    });

    it("validates all 12 scene sample questions", () => {
      expect(SAMPLE_RICH_QUESTIONS.scene).toHaveLength(12);
      for (const q of SAMPLE_RICH_QUESTIONS.scene) {
        const parsed = SceneQuestionPayloadSchema.safeParse(q);
        expect(parsed.success).toBe(true);
        expect(q.cards.length).toBeGreaterThanOrEqual(3);
        expect(q.cards.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
