/**
 * @file schemas.ts
 * @package @oddly/shared
 *
 * Zod validators for all API contracts and domain objects.
 * These parse + narrow untrusted data at system boundaries
 * (API request bodies, DB JSON fields, postMessage events, etc.).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const UUIDSchema = z.string().uuid();

export const DropStatusSchema = z.enum(["pending", "live", "closed"]);

export const QuestionTypeSchema = z.enum([
  "text",
  "number",
  "colour",
  "image",
  "word",
]);

export const TierSchema = z.enum(["Common", "Uncommon", "Rare", "Mythic"]);

export const ShareFormatSchema = z.enum(["story", "square", "link"]);

export const ReportReasonSchema = z.enum([
  "offensive",
  "spam",
  "incorrect",
  "other",
]);

export const LocaleSchema = z.enum(["en", "hi", "gu"]);

// ---------------------------------------------------------------------------
// Answer payloads (discriminated by "type")
// ---------------------------------------------------------------------------

export const TextAnswerPayloadSchema = z.object({
  type: z.literal("text"),
  question_id: UUIDSchema,
  value: z.string().min(1).max(200),
});

export const NumberAnswerPayloadSchema = z.object({
  type: z.literal("number"),
  question_id: UUIDSchema,
  value: z.number().finite(),
});

export const ColourAnswerPayloadSchema = z.object({
  type: z.literal("colour"),
  question_id: UUIDSchema,
  value: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex colour e.g. #FF5733"),
});

export const ImageAnswerPayloadSchema = z.object({
  type: z.literal("image"),
  question_id: UUIDSchema,
  value: z.string().min(1).max(100),
});

export const WordAnswerPayloadSchema = z.object({
  type: z.literal("word"),
  question_id: UUIDSchema,
  value: z.array(z.string().min(1).max(100)).min(1).max(10),
});

export const AnswerPayloadSchema = z.discriminatedUnion("type", [
  TextAnswerPayloadSchema,
  NumberAnswerPayloadSchema,
  ColourAnswerPayloadSchema,
  ImageAnswerPayloadSchema,
  WordAnswerPayloadSchema,
]);

// ---------------------------------------------------------------------------
// Question question payloads (what's stored in questions.payload JSONB)
// ---------------------------------------------------------------------------

export const TextQuestionPayloadSchema = z.object({
  type: z.literal("text"),
  prompt: z.string().min(1),
  options: z.array(
    z.object({ label: z.string(), value: z.string() })
  ),
});

export const NumberQuestionPayloadSchema = z.object({
  type: z.literal("number"),
  prompt: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().optional(),
});

export const ColourQuestionPayloadSchema = z.object({
  type: z.literal("colour"),
  prompt: z.string().min(1),
  swatches: z.array(
    z.object({ label: z.string(), value: z.string(), hex: z.string() })
  ),
});

export const ImageQuestionPayloadSchema = z.object({
  type: z.literal("image"),
  prompt: z.string().min(1),
  illustrations: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      illustration_key: z.string(),
    })
  ),
});

export const WordQuestionPayloadSchema = z.object({
  type: z.literal("word"),
  prompt: z.string().min(1),
  chips: z.array(z.object({ label: z.string(), value: z.string() })),
  max_selections: z.number().int().min(1),
});

export const QuestionPayloadSchema = z.discriminatedUnion("type", [
  TextQuestionPayloadSchema,
  NumberQuestionPayloadSchema,
  ColourQuestionPayloadSchema,
  ImageQuestionPayloadSchema,
  WordQuestionPayloadSchema,
]);

// ---------------------------------------------------------------------------
// API request / response schemas
// ---------------------------------------------------------------------------

export const SubmissionRequestSchema = z.object({
  drop_id: UUIDSchema,
  player_id: UUIDSchema,
  request_id: z.string().min(16).max(64), // client-generated idempotency key
  answers: z
    .array(AnswerPayloadSchema)
    .length(5, "Must submit exactly 5 answers — one per question"),
});

export const SubmissionResponseSchema = z.object({
  id: UUIDSchema,
  drop_id: UUIDSchema,
  player_id: UUIDSchema,
  submitted_at: z.string().datetime(),
  status: z.enum(["accepted", "duplicate"]),
});

export const AnswerOptionResponseSchema = z.object({
  id: UUIDSchema,
  label: z.string(),
  value: z.string(),
  display_order: z.number().int(),
  illustration_key: z.string().optional(),
});

export const QuestionResponseSchema = z.object({
  id: UUIDSchema,
  position: z.number().int().min(1).max(5),
  type: QuestionTypeSchema,
  payload: QuestionPayloadSchema,
  answer_options: z.array(AnswerOptionResponseSchema),
});

export const DropResponseSchema = z.object({
  id: UUIDSchema,
  drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opens_at: z.string().datetime(),
  closes_at: z.string().datetime(),
  status: DropStatusSchema,
  questions: z.array(QuestionResponseSchema),
});

export const TierDefinitionResponseSchema = z.object({
  tier: TierSchema,
  min_percentile: z.number().min(0).max(100),
  max_percentile: z.number().min(0).max(100),
  label: z.string(),
  description: z.string(),
  badge_color: z.string(),
});

export const ResultResponseSchema = z.object({
  submission_id: UUIDSchema,
  drop_date: z.string(),
  oddness: z.object({
    raw_score: z.number().min(0).max(1),
    percentile: z.number().min(0).max(100),
    tier: TierSchema,
  }),
  match: z
    .object({
      twin_id: z.string(),
      similarity_score: z.number().min(0).max(1),
      is_provisional: z.boolean(),
      matched_at: z.string().datetime(),
    })
    .nullable(),
  share_url: z.string().url(),
});

export const ContentResponseSchema = z.object({
  locale: LocaleSchema,
  strings: z.record(z.string()),
});

export const PlayerSessionSchema = z.object({
  player_id: UUIDSchema,
  did: z.string().min(1).max(128),
  account_id: UUIDSchema.optional(),
  created_at: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Report request schema
// ---------------------------------------------------------------------------

export const CreateReportSchema = z.object({
  submission_id: UUIDSchema,
  drop_id: UUIDSchema,
  reason: ReportReasonSchema,
  note: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Stored answer (what goes into submissions.answers JSONB)
// ---------------------------------------------------------------------------

export const StoredAnswerSchema = z.object({
  question_id: UUIDSchema,
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const StoredAnswersSchema = z.array(StoredAnswerSchema).length(5);

// ---------------------------------------------------------------------------
// Answer frequency (used in scoring)
// ---------------------------------------------------------------------------

export const AnswerFrequencySchema = z.object({
  question_id: UUIDSchema,
  value: z.string(),
  count: z.number().int().min(0),
  probability: z.number().min(0).max(1),
});

// ---------------------------------------------------------------------------
// Push subscription keys
// ---------------------------------------------------------------------------

export const PushKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const PushSubscriptionRequestSchema = z.object({
  player_id: UUIDSchema,
  endpoint: z.string().url(),
  keys: PushKeysSchema,
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export const HealthCheckSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  time: z.string().datetime(),
  version: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Type inference helpers
// ---------------------------------------------------------------------------

export type ValidatedSubmissionRequest = z.infer<typeof SubmissionRequestSchema>;
export type ValidatedAnswerPayload = z.infer<typeof AnswerPayloadSchema>;
export type ValidatedPlayerSession = z.infer<typeof PlayerSessionSchema>;
export type ValidatedStoredAnswer = z.infer<typeof StoredAnswerSchema>;
