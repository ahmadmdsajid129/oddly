/**
 * @file types.ts
 * @package @oddly/shared
 *
 * Core TypeScript types for Oddly v1.
 * Generated from schema.prisma and product spec.
 * These are plain TS types (not Prisma-generated) so they can be used
 * in the web app without importing Prisma client.
 */

export const EVERYDAY_LANE_ID = "00000000-0000-4000-a000-000000000001" as const;

// ---------------------------------------------------------------------------
// Enums (mirrored from schema.prisma)
// ---------------------------------------------------------------------------

export type DropStatus = "pending" | "live" | "closed";

export type QuestionType = "text" | "number" | "colour" | "image" | "word";

export type QuestionFormat =
  | "pick1"
  | "pick2of6"
  | "rank3"
  | "slider7"
  | "scene"
  | "say_it";

export type RenderVariant = "standard" | "meme";

export type ShareFormat = "story" | "square" | "link";

export type Tier = "Common" | "Uncommon" | "Rare" | "Mythic";

export type ReportReason = "offensive" | "spam" | "incorrect" | "other";

export type Locale = "en" | "hi" | "gu";

// ---------------------------------------------------------------------------
// Answer payloads — discriminated union by question type / format
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

/** Q-Format: Pick 2 of 6 (multiselect exactly 2 distinct items) */
export interface Pick2Of6AnswerPayload {
  type: "pick2of6";
  question_id: string;
  value: [string, string] | string[];
}

/** Q-Format: Rank 3 (ordered permutation of 3 items) */
export interface Rank3AnswerPayload {
  type: "rank3";
  question_id: string;
  value: [string, string, string] | string[];
}

/** Q-Format: Slider 7 (discrete 1-7 spectrum) */
export interface Slider7AnswerPayload {
  type: "slider7";
  question_id: string;
  value: number; // 1 to 7 integer
}

/** Q-Format: Scene (pick 1 reaction card out of 3-5) */
export interface SceneAnswerPayload {
  type: "scene";
  question_id: string;
  value: string;
}

/** Q-Format: Say It (free-text answer up to 80 chars, Gate G4) */
export interface SayItAnswerPayload {
  type: "say_it";
  question_id: string;
  value: string;
}

export type AnswerPayload =
  | TextAnswerPayload
  | NumberAnswerPayload
  | ColourAnswerPayload
  | ImageAnswerPayload
  | WordAnswerPayload
  | Pick2Of6AnswerPayload
  | Rank3AnswerPayload
  | Slider7AnswerPayload
  | SceneAnswerPayload
  | SayItAnswerPayload;

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

export interface Pick2Of6QuestionPayload {
  type?: "pick2of6" | "text";
  prompt: string;
  options: Array<{
    label: string;
    value: string;
    illustration_key?: string | null;
  }>;
}

export interface Rank3QuestionPayload {
  type?: "rank3" | "text";
  prompt: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export interface Slider7QuestionPayload {
  type?: "slider7" | "number";
  prompt: string;
  left_label: string;
  right_label: string;
  mid_label?: string | null;
  min?: number;
  max?: number;
  step?: number;
}

export interface SceneQuestionPayload {
  type?: "scene" | "image";
  prompt: string;
  scene_asset_key?: string | null;
  cards: Array<{
    label: string;
    value: string;
    illustration_key?: string | null;
    caption?: string | null;
  }>;
}

export interface SayItQuestionPayload {
  type?: "say_it" | "text";
  prompt: string;
  placeholder?: string;
  max_length?: number;
}

export type QuestionPayload =
  | TextQuestionPayload
  | NumberQuestionPayload
  | ColourQuestionPayload
  | ImageQuestionPayload
  | WordQuestionPayload
  | Pick2Of6QuestionPayload
  | Rank3QuestionPayload
  | Slider7QuestionPayload
  | SceneQuestionPayload
  | SayItQuestionPayload;

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
  format?: QuestionFormat;
  render_variant?: RenderVariant;
  template_id?: string | null;
  template_key?: string | null;
  tags?: string[];
  payload: QuestionPayload;
  options?: unknown;
  subject_tags?: unknown;
  scene_asset_key?: string | null;
  entropy_estimate?: number | null;
  tie_risk_estimate?: number | null;
  answer_options: AnswerOptionResponse[];
}

/** GET /v1/drops/:date — the daily drop */
export interface DropResponse {
  id: string;
  drop_date: string; // YYYY-MM-DD in IST
  opens_at: string;  // ISO 8601 UTC
  closes_at: string; // ISO 8601 UTC
  status: DropStatus;
  theme_key?: string | null;
  telepathy_question_id?: string | null;
  lane_id?: string | null;
  is_resting?: boolean;
  questions: QuestionResponse[];
}

/** Stage L1: Subject Lane Types */
export type LaneStatus = "planned" | "preview" | "open" | "resting" | "retired";

export interface LaneSummary {
  id: string;
  slug: string;
  name_key: string;
  description_key: string;
  accent_token: string;
  icon_key: string;
  status: LaneStatus;
  sort_order: number;
  age_rating: string;
  formats_allowed: string[];
  text_enabled: boolean;
  super_twin_enabled: boolean;
  players_today?: number;
  subscribers_count?: number;
  opened_at?: string | null;
}

export interface LaneDetail extends LaneSummary {
  current_drop?: DropResponse | null;
  is_resting?: boolean;
}

export interface PlayerLanePrefResponse {
  lane_id: string;
  slug: string;
  name_key: string;
  notify: boolean;
  plays_count: number;
  last_played_at: string | null;
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
  country?: string; // Optional ISO-3166-1 alpha-2 country code for tie-breaking
}

/** A match result returned by the matching strategy */
export interface MatchResult {
  player_a_id: string;
  player_b_id: string;
  submission_a_id: string;
  submission_b_id: string;
  similarity_score: number;
  tie_group_size?: number;
  is_mutual?: boolean;
  tie_break_reason?: string;
  history_days?: number;
  why_you_two?: Array<{
    question_id: string;
    value: unknown;
    rarity_percent: number;
  }>;
  matched_at: Date;
}

/** Health check response (already in index.ts, re-exported here for completeness) */
export interface HealthCheckResult {
  ok: boolean;
  service: string;
  time: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// Signals & Consent types (Stage M2 / Phase 10F)
// ---------------------------------------------------------------------------

export type SignalEventName =
  | "question_shown"
  | "question_answered"
  | "question_changed"
  | "question_back"
  | "drop_started"
  | "drop_completed"
  | "drop_abandoned"
  | "share_clicked"
  | "theme_viewed";

export interface SignalEventProps {
  question_id?: string;
  position?: number;
  dwell_ms?: number;
  option_count?: number;
  format?: string;
  theme_key?: string;
  tag_key?: string;
}

export interface SignalEventItem {
  event_name: SignalEventName;
  drop_date: string;
  props?: SignalEventProps;
  timestamp_ms?: number;
}

export interface EventsBatchRequest {
  session_id?: string;
  events: SignalEventItem[];
}

export type ConsentPurpose = "analytics" | "personalisation";

export interface UpdateConsentRequest {
  purpose: ConsentPurpose;
  granted: boolean;
  policy_version?: number;
}

export interface ConsentsResponse {
  analytics: boolean;
  personalisation: boolean;
  policy_version: number;
  analytics_id?: string | null;
}

