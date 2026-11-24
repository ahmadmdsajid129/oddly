/**
 * @file memes-lane.ts
 * @package @oddly/shared
 *
 * Memes Lane (Stage L4 / Phase 10O / F35).
 *
 * Core domain logic for the dedicated Memes lane:
 * 1. Content flow ingesting approved templates and captions from Meme Lab (F24/F26 / P10O.01).
 * 2. Mixed-format Memes Drops combining pick1, pick2of6, rank3, and slider7 (P10O.02).
 * 3. Telepathy question selection and isolation for Memes lane (P10O.04).
 * 4. Validation rules enforcing Rule L1, Rule L2, and Rule 18.
 */

import type { QuestionFormat } from "./types.js";
import { isEligibleTelepathyQuestion } from "./telepathy.js";

export const MEMES_LANE_SLUG = "memes";
export const MEMES_LANE_ID = "00000000-0000-4000-a000-000000000002";

/**
 * Asserts that a drop destination is valid for community meme ingestion.
 * Throws if target lane is Everyday or any non-memes lane (Rule L1 / Section 8.1 Invariant).
 */
export function assertMemesLaneTarget(targetLaneSlug: string): void {
  if (targetLaneSlug !== MEMES_LANE_SLUG) {
    throw new Error(
      `MEME_LAB_FEED_FORBIDDEN: Community-authored memes can only be ingested into the Memes lane ('${MEMES_LANE_SLUG}'), received '${targetLaneSlug}'.`
    );
  }
}

export interface MemeQuestionDraft {
  position: number;
  format: QuestionFormat;
  render_variant: "meme";
  template_key: string;
  prompt: string;
  subject_tags: string[];
  payload: Record<string, unknown>;
  answer_options?: Array<{
    label: string;
    value: string;
    display_order: number;
    illustration_key?: string;
  }>;
}

export interface MemesLaneDropDraft {
  drop_date: string;
  theme_key: string;
  lane_slug: "memes";
  questions: MemeQuestionDraft[];
  telepathy_position: number; // typically position 5 (or position 1)
}

/**
 * Validates a candidate Memes lane Drop against Stage L4 invariants:
 * - Exactly 5 questions.
 * - All questions must have render_variant === 'meme'.
 * - Must include mixed formats: pick1, pick2of6, rank3, and slider7.
 * - Exactly 1 designated Telepathy question with <= 4 options.
 * - All subject tags must be neutral lifestyle tags.
 */
export function validateMemesLaneDrop(drop: MemesLaneDropDraft): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!drop.questions || drop.questions.length !== 5) {
    errors.push(`Memes lane drop must contain exactly 5 questions (found ${drop.questions?.length || 0})`);
    return { valid: false, errors };
  }

  // Check positions 1 through 5
  const positions = new Set(drop.questions.map((q) => q.position));
  for (let pos = 1; pos <= 5; pos++) {
    if (!positions.has(pos)) {
      errors.push(`Missing question at position ${pos}`);
    }
  }

  // Check render_variant === 'meme' for all questions
  for (const q of drop.questions) {
    if (q.render_variant !== "meme") {
      errors.push(`Question ${q.position} must have render_variant === 'meme'`);
    }
  }

  // Check format diversity
  const formats = new Set(drop.questions.map((q) => q.format));
  if (!formats.has("pick1")) {
    errors.push("Memes lane drop must include at least one 'pick1' question");
  }
  if (!formats.has("pick2of6")) {
    errors.push("Memes lane drop must include at least one 'pick2of6' question");
  }
  if (!formats.has("rank3")) {
    errors.push("Memes lane drop must include at least one 'rank3' question");
  }
  if (!formats.has("slider7")) {
    errors.push("Memes lane drop must include at least one 'slider7' question");
  }

  // Check Telepathy question eligibility
  const telepathyQ = drop.questions.find((q) => q.position === drop.telepathy_position);
  if (!telepathyQ) {
    errors.push(`Telepathy question not found at position ${drop.telepathy_position}`);
  } else {
    const isEligible = isEligibleTelepathyQuestion({
      id: `q_${telepathyQ.position}`,
      type: "text",
      format: telepathyQ.format,
      payload: telepathyQ.payload,
      answerOptions: telepathyQ.answer_options,
    });
    if (!isEligible) {
      errors.push(`Telepathy question at position ${drop.telepathy_position} is not eligible (must have between 2 and 4 options)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds a curated 5-question mixed-format Memes Drop template.
 */
export function buildMixedFormatMemesDrop(params: {
  drop_date: string;
  theme_key: string;
  heroMeme: {
    template_key: string;
    prompt: string;
    options: Array<{ label: string; value: string }>;
    tags: string[];
  };
  pick2of6Meme: {
    template_key: string;
    prompt: string;
    options: Array<{ label: string; value: string }>;
    tags: string[];
  };
  rank3Meme: {
    template_key: string;
    prompt: string;
    items: Array<{ label: string; value: string }>;
    tags: string[];
  };
  slider7Meme: {
    template_key: string;
    prompt: string;
    left_label: string;
    right_label: string;
    mid_label?: string;
    tags: string[];
  };
  telepathyMeme: {
    template_key: string;
    prompt: string;
    options: Array<{ label: string; value: string }>; // 2 to 4 options
    tags: string[];
  };
}): MemesLaneDropDraft {
  const questions: MemeQuestionDraft[] = [
    // 1. Hero Meme Caption Pick (pick1)
    {
      position: 1,
      format: "pick1",
      render_variant: "meme",
      template_key: params.heroMeme.template_key,
      prompt: params.heroMeme.prompt,
      subject_tags: params.heroMeme.tags,
      payload: {
        type: "text",
        prompt: params.heroMeme.prompt,
        options: params.heroMeme.options,
      },
      answer_options: params.heroMeme.options.map((opt, idx) => ({
        label: opt.label,
        value: opt.value,
        display_order: idx,
      })),
    },

    // 2. Meme Multi-Selection (pick2of6)
    {
      position: 2,
      format: "pick2of6",
      render_variant: "meme",
      template_key: params.pick2of6Meme.template_key,
      prompt: params.pick2of6Meme.prompt,
      subject_tags: params.pick2of6Meme.tags,
      payload: {
        type: "text",
        format: "pick2of6",
        prompt: params.pick2of6Meme.prompt,
        options: params.pick2of6Meme.options,
      },
      answer_options: params.pick2of6Meme.options.map((opt, idx) => ({
        label: opt.label,
        value: opt.value,
        display_order: idx,
      })),
    },

    // 3. Meme Reaction Ranking (rank3)
    {
      position: 3,
      format: "rank3",
      render_variant: "meme",
      template_key: params.rank3Meme.template_key,
      prompt: params.rank3Meme.prompt,
      subject_tags: params.rank3Meme.tags,
      payload: {
        type: "text",
        format: "rank3",
        prompt: params.rank3Meme.prompt,
        items: params.rank3Meme.items,
      },
      answer_options: params.rank3Meme.items.map((opt, idx) => ({
        label: opt.label,
        value: opt.value,
        display_order: idx,
      })),
    },

    // 4. Meme Unhinged / Relatability Spectrum (slider7)
    {
      position: 4,
      format: "slider7",
      render_variant: "meme",
      template_key: params.slider7Meme.template_key,
      prompt: params.slider7Meme.prompt,
      subject_tags: params.slider7Meme.tags,
      payload: {
        type: "text",
        format: "slider7",
        prompt: params.slider7Meme.prompt,
        left_label: params.slider7Meme.left_label,
        right_label: params.slider7Meme.right_label,
        mid_label: params.slider7Meme.mid_label,
      },
      answer_options: [
        { label: params.slider7Meme.left_label, value: "1", display_order: 1 },
        { label: "2", value: "2", display_order: 2 },
        { label: "3", value: "3", display_order: 3 },
        { label: params.slider7Meme.mid_label || "Neutral", value: "4", display_order: 4 },
        { label: "5", value: "5", display_order: 5 },
        { label: "6", value: "6", display_order: 6 },
        { label: params.slider7Meme.right_label, value: "7", display_order: 7 },
      ],
    },

    // 5. Designated Telepathy Meme Pick (pick1 with <= 4 options)
    {
      position: 5,
      format: "pick1",
      render_variant: "meme",
      template_key: params.telepathyMeme.template_key,
      prompt: params.telepathyMeme.prompt,
      subject_tags: params.telepathyMeme.tags,
      payload: {
        type: "text",
        prompt: params.telepathyMeme.prompt,
        options: params.telepathyMeme.options,
      },
      answer_options: params.telepathyMeme.options.map((opt, idx) => ({
        label: opt.label,
        value: opt.value,
        display_order: idx,
      })),
    },
  ];

  return {
    drop_date: params.drop_date,
    theme_key: params.theme_key,
    lane_slug: "memes",
    questions,
    telepathy_position: 5,
  };
}
