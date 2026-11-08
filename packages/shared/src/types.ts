/**
 * @file types.ts
 * @package @oddly/shared
 *
 * Core TypeScript types for Oddly v1.
 * Generated from schema.prisma and product spec.
 * These are plain TS types (not Prisma-generated) so they can be used
 * in the web app without importing Prisma client.
 */

// ---------------------------------------------------------------------------
// Enums (mirrored from schema.prisma)
// ---------------------------------------------------------------------------

export type DropStatus = "pending" | "live" | "closed";

export type QuestionType = "text" | "number" | "colour" | "image" | "word";

export type ShareFormat = "story" | "square" | "link";

export type Tier = "Common" | "Uncommon" | "Rare" | "Mythic";

export type ReportReason = "offensive" | "spam" | "incorrect" | "other";

export type Locale = "en" | "hi" | "gu";

// ---------------------------------------------------------------------------
// Answer payloads — discriminated union by question type
// ---------------------------------------------------------------------------

/** Q-Type 1: Text (pick one label from a list) */
export interface TextAnswerPayload {
  type: "text";
  question_id: string;
  value: string; // selected label value
}

/** Q-Type 2: Number (pick a number from a range) */
export interface NumberAnswerPayload {
  type: "number";
  question_id: string;
  value: number;
}

/** Q-Type 3: Colour (pick a hex/named swatch) */
export interface ColourAnswerPayload {
  type: "colour";
  question_id: string;
  value: string; // hex string e.g. "#FF5733"
}

/** Q-Type 4: Image (pick one illustration key) */
export interface ImageAnswerPayload {
  type: "image";
  question_id: string;
  value: string; // illustration_key from answer_options
}

/** Q-Type 5: Word (pick one or more word chips) */
export interface WordAnswerPayload {
  type: "word";
  question_id: string;
  value: string[]; // selected word values
}

export type AnswerPayload =
  | TextAnswerPayload
  | NumberAnswerPayload
  | ColourAnswerPayload
  | ImageAnswerPayload
  | WordAnswerPayload;

// ---------------------------------------------------------------------------
// Question question payload (what's stored in questions.payload JSONB)
// ---------------------------------------------------------------------------

export interface TextQuestionPayload {
  type: "text";
  prompt: string;
  options: Array<{ label: string; value: string }>;
}

export interface NumberQuestionPayload {
  type: "number";
  prompt: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface ColourQuestionPayload {
  type: "colour";
  prompt: string;
  swatches: Array<{ label: string; value: string; hex: string }>;
}

export interface ImageQuestionPayload {
  type: "image";
  prompt: string;
  illustrations: Array<{
    label: string;
    value: string;
    illustration_key: string;
  }>;
}

export interface WordQuestionPayload {
  type: "word";
  prompt: string;
  chips: Array<{ label: string; value: string }>;
  max_selections: number;
}

export type QuestionPayload =
  | TextQuestionPayload
  | NumberQuestionPayload
  | ColourQuestionPayload
  | ImageQuestionPayload
  | WordQuestionPayload;

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** Answer option as returned from GET /v1/drops/:date/questions */
export interface AnswerOptionResponse {
  id: string;
  label: string;
  value: string;
  display_order: number;
  illustration_key?: string;
}

/** A question in the drop response */
export interface QuestionResponse {
  id: string;
  position: number;
  type: QuestionType;
  payload: QuestionPayload;
  answer_options: AnswerOptionResponse[];
}

/** GET /v1/drops/:date — the daily drop */
export interface DropResponse {
  id: string;
  drop_date: string; // YYYY-MM-DD in IST
  opens_at: string;  // ISO 8601 UTC
  closes_at: string; // ISO 8601 UTC
  status: DropStatus;
  questions: QuestionResponse[];
}

/** POST /v1/submissions — request body */
export interface SubmissionRequest {
  drop_id: string;
  player_id: string;
  request_id: string; // client UUID for idempotency
  answers: AnswerPayload[];
}

/** POST /v1/submissions — response body */
export interface SubmissionResponse {
  id: string;
  drop_id: string;
  player_id: string;
  submitted_at: string;
  status: "accepted" | "duplicate";
}

/** Tier definition as served from DB */
export interface TierDefinitionResponse {
  tier: Tier;
  min_percentile: number;
  max_percentile: number;
  label: string;
  description: string;
  badge_color: string;
}

/** GET /v1/results/:submission_id — result with match and oddness */
export interface ResultResponse {
  submission_id: string;
  drop_date: string;
  oddness: {
    raw_score: number;    // [0, 1]
    percentile: number;   // 0–100
    tier: Tier;
  };
  match: {
    twin_id: string;        // anonymised (not raw player UUID)
    similarity_score: number;
    is_provisional: boolean;
    matched_at: string;
  } | null;
  share_url: string;
}

/** GET /v1/content?locale=en — dynamic UI copy */
export interface ContentResponse {
  locale: Locale;
  strings: Record<string, string>;
}

/** Player session (stored in signed cookie / localStorage) */
export interface PlayerSession {
  player_id: string;
  did: string;         // device fingerprint
  account_id?: string; // set after Google sign-in
  created_at: string;
}

/** Streak status for a player */
export interface StreakStatus {
  player_id: string;
  current_streak: number;
  last_drop_date: string;
}

/** Anonymised twin revealed after results */
export interface TwinProfile {
  twin_token: string;   // one-way hashed twin id (never expose raw UUID)
  similarity_score: number;
  shared_answers: number; // count of matching answers (not which ones)
  tier: Tier;
}

// ---------------------------------------------------------------------------
// Internal domain types (used in services, not exposed to web)
// ---------------------------------------------------------------------------

/** An answer stored in submissions.answers JSONB */
export interface StoredAnswer {
  question_id: string;
  value: string | number | string[];
}

/** Frequency record for a question value */
export interface AnswerFrequency {
  question_id: string;
  value: string;
  count: number;
  probability: number; // [0, 1]
}

/** A submission as used by the matching engine */
export interface SubmissionForMatching {
  submission_id: string;
  player_id: string;
  drop_id: string;
  answers: StoredAnswer[];
  submitted_at: Date;
}

/** A match result returned by the matching strategy */
export interface MatchResult {
  player_a_id: string;
  player_b_id: string;
  submission_a_id: string;
  submission_b_id: string;
  similarity_score: number;
  matched_at: Date;
}

/** Health check response (already in index.ts, re-exported here for completeness) */
export interface HealthCheckResult {
  ok: boolean;
  service: string;
  time: string;
  version?: string;
}

