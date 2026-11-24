/**
 * @file telepathy.ts
 * @package @oddly/shared
 *
 * Telepathy (Instinct Sync) Domain Engine (Stage F3 / Phase 10C)
 * Implements:
 * - Low-cardinality question eligibility (Type 1 text or Type 4 image with <= 4 options)
 * - Selection logic for daily designated Telepathy question
 * - Admin drop validation rule (P10C.02)
 * - Mathematical luck baseline calculation: sum(p(a)^2) across option distribution (P10C.06)
 * - Running Sync score aggregation and 5-round unlock threshold (P10C.08)
 */

import type { AnswerFrequency } from "./types.js";

export interface QuestionLike {
  id: string;
  type: string;
  position?: number;
  format?: string;
  render_variant?: string;
  payload?: unknown;
  answer_options?: Array<{
    id?: string;
    label: string;
    value: string;
    display_order?: number;
    illustration_key?: string | null;
  }>;
  answerOptions?: Array<{
    id?: string;
    label: string;
    value: string;
    display_order?: number;
    illustration_key?: string | null;
  }>;
}

export interface SyncRoundRecord {
  hit: boolean | null;
  baseline_p: number;
}

export interface TelepathySyncSummary {
  total_rounds: number;
  matches: number;
  sync_score: number;
  baseline_score: number;
  lift: number;
  unlocked: boolean;
  min_rounds: number;
}

/**
 * Checks whether a question is eligible to be designated for Telepathy.
 * Per F20 / P10C.01:
 * - Must be Type 1 ("text") or Type 4 ("image")
 * - Must have between 2 and 4 options (low-cardinality)
 */
export function isEligibleTelepathyQuestion(question: QuestionLike): boolean {
  if (
    !question ||
    (question.type !== "text" &&
      question.type !== "image" &&
      question.type !== "meme" &&
      question.render_variant !== "meme")
  ) {
    return false;
  }

  let optionCount = 0;
  const opts = question.answerOptions || question.answer_options;

  if (Array.isArray(opts) && opts.length > 0) {
    optionCount = opts.length;
  } else if (question.payload && typeof question.payload === "object") {
    const p = question.payload as Record<string, unknown>;
    if (question.type === "text" && Array.isArray(p.options)) {
      optionCount = p.options.length;
    } else if (question.type === "image" && Array.isArray(p.illustrations)) {
      optionCount = p.illustrations.length;
    } else if (
      (question.type === "meme" || question.render_variant === "meme") &&
      Array.isArray(p.options)
    ) {
      optionCount = p.options.length;
    }
  }

  return optionCount >= 2 && optionCount <= 4;
}

/**
 * Selects the designated Telepathy question for a drop.
 * Priority:
 * 1. The first eligible Type 1 ("text") question.
 * 2. If no Type 1 question qualifies, the first eligible Type 4 ("image") question.
 * 3. If no image question qualifies, the first eligible meme question (render_variant === 'meme').
 * Returns null if no question meets the eligibility criteria.
 */
export function selectTelepathyQuestion<T extends QuestionLike>(questions: T[]): T | null {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  // First try Type 1 text
  const textCandidate = questions.find(
    (q) => q.type === "text" && isEligibleTelepathyQuestion(q)
  );
  if (textCandidate) return textCandidate;

  // Next try Type 4 image
  const imageCandidate = questions.find(
    (q) => q.type === "image" && isEligibleTelepathyQuestion(q)
  );
  if (imageCandidate) return imageCandidate;

  // Next try meme question (render_variant === 'meme' or type === 'meme')
  const memeCandidate = questions.find(
    (q) =>
      (q.type === "meme" || q.render_variant === "meme") &&
      isEligibleTelepathyQuestion(q)
  );
  if (memeCandidate) return memeCandidate;

  return null;
}

/**
 * Admin Drop validation rule (P10C.02).
 * Rejects any Drop lacking an eligible low-cardinality Telepathy question.
 */
export function validateDropTelepathy(questions: QuestionLike[]): {
  valid: boolean;
  telepathyQuestionId: string | null;
  error?: string;
} {
  const selected = selectTelepathyQuestion(questions);
  if (!selected) {
    return {
      valid: false,
      telepathyQuestionId: null,
      error:
        "Drop validation failed: Drop lacks an eligible low-cardinality Telepathy question (requires Type 1 or Type 4 with 2 to 4 options).",
    };
  }
  return {
    valid: true,
    telepathyQuestionId: selected.id,
  };
}

/**
 * Calculates the expected agreement probability by random chance between two independent players:
 * Baseline = sum(p(a)^2) across all options of the question.
 *
 * Mathematical honesty guarantee (Rule 2):
 * If option distributions are skewed (e.g. 80% / 20%), the random chance of independent agreement
 * is 0.8^2 + 0.2^2 = 0.68, not the uniform 0.50.
 * If frequencies are unobserved (e.g. zero submissions), defaults to 1 / optionCount (e.g. 0.25).
 */
export function calculateLuckBaseline(
  questionId: string,
  frequencies: AnswerFrequency[],
  defaultOptionCount: number = 4
): number {
  const qFreqs = frequencies.filter((f) => f.question_id === questionId);
  if (qFreqs.length === 0) {
    return defaultOptionCount > 0 ? 1 / defaultOptionCount : 0.25;
  }

  const sumSquared = qFreqs.reduce((sum, f) => sum + Math.pow(f.probability, 2), 0);
  // Clamped strictly between 0 and 1
  return Math.min(1, Math.max(0, sumSquared));
}

/**
 * Aggregates composite Sync summary from historical Telepathy rounds.
 * Per F20 / P10C.08:
 * - Requires min_rounds (default: 5) to unlock and display the score to eliminate early sample variance.
 */
export function calculateSyncScore(
  rounds: SyncRoundRecord[],
  minRounds: number = 5
): TelepathySyncSummary {
  const completedRounds = rounds.filter((r) => r.hit !== null);
  const totalRounds = completedRounds.length;
  const matches = completedRounds.filter((r) => r.hit === true).length;

  const syncScore = totalRounds > 0 ? matches / totalRounds : 0;
  const baselineSum = completedRounds.reduce((acc, r) => acc + (r.baseline_p || 0.25), 0);
  const baselineScore = totalRounds > 0 ? baselineSum / totalRounds : 0.25;
  const lift = syncScore - baselineScore;

  return {
    total_rounds: totalRounds,
    matches,
    sync_score: Math.round(syncScore * 1000) / 1000,
    baseline_score: Math.round(baselineScore * 1000) / 1000,
    lift: Math.round(lift * 1000) / 1000,
    unlocked: totalRounds >= minRounds,
    min_rounds: minRounds,
  };
}

