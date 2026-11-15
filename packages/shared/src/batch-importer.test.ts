import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { validateBatch, type BatchJsonInput } from "./batch-importer.js";

const fillerQuestions = (startIndex: number) =>
  [startIndex, startIndex + 1, startIndex + 2, startIndex + 3].map((pos) => ({
    position: pos,
    type: "text" as const,
    render_variant: "standard" as const,
    payload: {
      type: "text" as const,
      prompt: `Filler question ${pos}`,
      options: [
        { label: "Option 1", value: "opt1" },
        { label: "Option 2", value: "opt2" },
      ],
    },
    answer_options: [
      { label: "Option 1", value: "opt1", display_order: 1 },
      { label: "Option 2", value: "opt2", display_order: 2 },
    ],
  }));

describe("Stage M1 (Phase 10E): Batch Importer & Safety Validation (P10E.03, P10E.04)", () => {
  it("validates the curated sample meme batch JSON cleanly with zero errors", () => {
    const samplePath = resolve(__dirname, "../prisma/seed/batch_meme_sample.json");
    const content = readFileSync(samplePath, "utf-8");
    const json = JSON.parse(content) as BatchJsonInput;

    const validation = validateBatch(json);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(json.drops.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a meme question missing template_key or template_id", () => {
    const invalidBatch: BatchJsonInput = {
      drops: [
        {
          drop_date: "2026-11-20",
          theme_key: "workplace",
          questions: [
            {
              position: 1,
              type: "text",
              render_variant: "meme",
              // missing template_key
              tags: ["career-work"],
              payload: {
                type: "text",
                prompt: "Your code compiles on Friday at 5:59 PM:",
                options: [
                  { label: "Commit and push immediately", value: "push" },
                  { label: "Leave it for Monday morning", value: "monday" },
                ],
              },
              answer_options: [
                { label: "Commit and push immediately", value: "push", display_order: 1 },
                { label: "Leave it for Monday morning", value: "monday", display_order: 2 },
              ],
            },
            ...fillerQuestions(2),
          ],
        },
      ],
    };

    const validation = validateBatch(invalidBatch);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("missing required template_key"))).toBe(true);
  });

  it("rejects a meme question missing subject tags (must have >= 1 tag)", () => {
    const invalidBatch: BatchJsonInput = {
      drops: [
        {
          drop_date: "2026-11-20",
          questions: [
            {
              position: 1,
              type: "text",
              render_variant: "meme",
              template_key: "this-is-fine",
              tags: [], // empty tags
              payload: {
                type: "text",
                prompt: "Server is burning:",
                options: [
                  { label: "Stay calm", value: "calm" },
                  { label: "Panic", value: "panic" },
                ],
              },
            },
            ...fillerQuestions(2),
          ],
        },
      ],
    };

    const validation = validateBatch(invalidBatch);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("at least 1 subject tag"))).toBe(true);
  });

  it("strictly rejects any batch question tagging forbidden topics under Section 9.1", () => {
    const forbiddenBatch: BatchJsonInput = {
      drops: [
        {
          drop_date: "2026-11-20",
          questions: [
            {
              position: 1,
              type: "text",
              render_variant: "meme",
              template_key: "drake-choice",
              tags: ["election-politics"], // forbidden topic
              payload: {
                type: "text",
                prompt: "Voting preferences:",
                options: [
                  { label: "Party A", value: "a" },
                  { label: "Party B", value: "b" },
                ],
              },
            },
            ...fillerQuestions(2),
          ],
        },
      ],
    };

    const validation = validateBatch(forbiddenBatch);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("violates Section 9.1 Forbidden Topic List"))).toBe(true);
  });

  it("rejects meme variant on unsupported question types (e.g. number, colour, word)", () => {
    const invalidTypeBatch: BatchJsonInput = {
      drops: [
        {
          drop_date: "2026-11-20",
          questions: [
            {
              position: 1,
              type: "number",
              render_variant: "meme",
              template_key: "drake-choice",
              tags: ["sleep-chronotype"],
              payload: {
                type: "number",
                prompt: "Hours of sleep",
                min: 0,
                max: 12,
              },
            },
            ...fillerQuestions(2),
          ],
        },
      ],
    };

    const validation = validateBatch(invalidTypeBatch);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("must be type 'text' or 'image'"))).toBe(true);
  });

  it("produces warning when 3 consecutive questions share the exact same slot type", () => {
    const repeatBatch: BatchJsonInput = {
      drops: [
        {
          drop_date: "2026-11-20",
          questions: [
            { position: 1, type: "text", payload: { type: "text", prompt: "Q1", options: [] } },
            { position: 2, type: "text", payload: { type: "text", prompt: "Q2", options: [] } },
            { position: 3, type: "text", payload: { type: "text", prompt: "Q3", options: [] } },
            { position: 4, type: "number", payload: { type: "number", prompt: "Q4", min: 1, max: 10, step: 1 } },
            { position: 5, type: "colour", payload: { type: "colour", prompt: "Q5", swatches: [] } },
          ],
        },
      ],
    };

    const validation = validateBatch(repeatBatch);
    expect(validation.warnings.some((w) => w.includes("3 consecutive questions share the same type"))).toBe(true);
  });
});

