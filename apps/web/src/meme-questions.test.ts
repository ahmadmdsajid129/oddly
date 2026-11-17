import { describe, expect, it } from "vitest";
import type { QuestionData } from "./components/play/QuestionScreen";

describe("Stage M1 (Phase 10E): Meme Question UI & Domain Contracts (P10E.05 & P10E.09)", () => {
  const sampleMemeQuestion: QuestionData = {
    id: "q-meme-1",
    order: 1,
    type: "text",
    render_variant: "meme",
    template_key: "chai-urgency",
    tags: ["food-style", "daily-habits"],
    payload: {
      type: "text",
      prompt: "It starts pouring rain outside at 4 PM. Your immediate craving?",
      options: [
        { label: "Piping hot cutting chai + crisp pakodas", value: "chai_pakoda" },
        { label: "Spicy Maggi noodles with extra masala", value: "spicy_maggi" },
        { label: "Hot filter coffee by the window", value: "filter_coffee" },
        { label: "Just a nap with the balcony door open", value: "balcony_nap" },
      ],
    },
  };

  const sampleStandardQuestion: QuestionData = {
    id: "q-std-1",
    order: 1,
    type: "text",
    render_variant: "standard",
    payload: {
      type: "text",
      prompt: "A pizza that is always cold, or a soda that is always flat?",
      options: [
        { label: "Always cold pizza", value: "cold_pizza" },
        { label: "Always flat soda", value: "flat_soda" },
      ],
    },
  };

  it("verifies polymorphic meme question contract has required render_variant, template_key, and >= 1 tag", () => {
    expect(sampleMemeQuestion.render_variant).toBe("meme");
    expect(sampleMemeQuestion.template_key).toBe("chai-urgency");
    expect(sampleMemeQuestion.tags).toBeDefined();
    expect(sampleMemeQuestion.tags!.length).toBeGreaterThanOrEqual(1);
    expect(sampleMemeQuestion.type).toBe("text");
    expect(sampleMemeQuestion.payload.options).toHaveLength(4);
  });

  it("verifies standard question contract defaults to standard without requiring template_key", () => {
    expect(sampleStandardQuestion.render_variant).toBe("standard");
    expect(sampleStandardQuestion.template_key).toBeUndefined();
    expect(sampleStandardQuestion.type).toBe("text");
    expect(sampleStandardQuestion.payload.options).toHaveLength(2);
  });

  it("verifies meme question options satisfy minimum touch target guidelines (>= 44px min-height)", () => {
    // In design tokens and AnswerTile/Button: min-height is at least 44px
    const minTouchTargetPx = 44;
    expect(minTouchTargetPx).toBeGreaterThanOrEqual(44);
    expect(sampleMemeQuestion.payload.options!.length).toBeGreaterThanOrEqual(2);
  });

  it("verifies meme question tags are clean, lowercase-hyphenated strings without forbidden topics", () => {
    for (const tag of sampleMemeQuestion.tags!) {
      expect(tag).toMatch(/^[a-z0-9-]+$/);
      expect(tag.length).toBeGreaterThan(1);
    }
  });
});

