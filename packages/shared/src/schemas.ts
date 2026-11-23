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

export const QuestionFormatSchema = z.enum([
  "pick1",
  "pick2of6",
  "rank3",
  "slider7",
  "scene",
  "say_it",
]);

export const RenderVariantSchema = z.enum(["standard", "meme"]);

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

/** Q-Format: Pick 2 of 6 */
export const Pick2Of6AnswerPayloadSchema = z.object({
  type: z.literal("pick2of6"),
  question_id: UUIDSchema,
  value: z
    .array(z.string().min(1).max(100))
    .length(2, "Must select exactly 2 options")
    .refine(
      (arr) => new Set(arr).size === 2,
      "Must select 2 distinct options"
    ),
});

/** Q-Format: Rank 3 */
export const Rank3AnswerPayloadSchema = z.object({
  type: z.literal("rank3"),
  question_id: UUIDSchema,
  value: z
    .array(z.string().min(1).max(100))
    .length(3, "Must rank exactly 3 items")
    .refine(
      (arr) => new Set(arr).size === 3,
      "Must rank 3 distinct items"
    ),
});

/** Q-Format: Slider 7 */
export const Slider7AnswerPayloadSchema = z.object({
  type: z.literal("slider7"),
  question_id: UUIDSchema,
  value: z.number().int().min(1).max(7),
});

/** Q-Format: Scene */
export const SceneAnswerPayloadSchema = z.object({
  type: z.literal("scene"),
  question_id: UUIDSchema,
  value: z.string().min(1).max(100),
});

/** Q-Format: Say It (Gate G4) */
export const SayItAnswerPayloadSchema = z.object({
  type: z.literal("say_it"),
  question_id: UUIDSchema,
  value: z.string().min(1).max(80),
});

export const AnswerPayloadSchema = z.discriminatedUnion("type", [
  TextAnswerPayloadSchema,
  NumberAnswerPayloadSchema,
  ColourAnswerPayloadSchema,
  ImageAnswerPayloadSchema,
  WordAnswerPayloadSchema,
  Pick2Of6AnswerPayloadSchema,
  Rank3AnswerPayloadSchema,
  Slider7AnswerPayloadSchema,
  SceneAnswerPayloadSchema,
  SayItAnswerPayloadSchema,
]);

// ---------------------------------------------------------------------------
// Question payloads (what's stored in questions.payload JSONB)
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

export const Pick2Of6QuestionPayloadSchema = z.object({
  type: z.literal("pick2of6").or(z.literal("text")).optional(),
  format: z.literal("pick2of6").optional(),
  prompt: z.string().min(1),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        illustration_key: z.string().nullable().optional(),
      })
    )
    .length(6, "pick2of6 requires exactly 6 options"),
});

export const Rank3QuestionPayloadSchema = z.object({
  type: z.literal("rank3").or(z.literal("text")).optional(),
  format: z.literal("rank3").optional(),
  prompt: z.string().min(1),
  items: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .length(3, "rank3 requires exactly 3 items"),
});

export const Slider7QuestionPayloadSchema = z.object({
  type: z.literal("slider7").or(z.literal("number")).optional(),
  format: z.literal("slider7").optional(),
  prompt: z.string().min(1),
  left_label: z.string().min(1),
  right_label: z.string().min(1),
  mid_label: z.string().nullable().optional(),
  min: z.number().default(1),
  max: z.number().default(7),
  step: z.number().default(1),
});

export const SceneQuestionPayloadSchema = z.object({
  type: z.literal("scene").or(z.literal("image")).optional(),
  format: z.literal("scene").optional(),
  prompt: z.string().min(1),
  scene_asset_key: z.string().nullable().optional(),
  cards: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        illustration_key: z.string().nullable().optional(),
        caption: z.string().nullable().optional(),
      })
    )
    .min(3)
    .max(5),
});

export const SayItQuestionPayloadSchema = z.object({
  type: z.literal("say_it").or(z.literal("text")).optional(),
  format: z.literal("say_it").optional(),
  prompt: z.string().min(1),
  placeholder: z.string().optional(),
  max_length: z.number().default(80),
});

export const QuestionPayloadSchema = z.union([
  TextQuestionPayloadSchema,
  NumberQuestionPayloadSchema,
  ColourQuestionPayloadSchema,
  ImageQuestionPayloadSchema,
  WordQuestionPayloadSchema,
  Pick2Of6QuestionPayloadSchema,
  Rank3QuestionPayloadSchema,
  Slider7QuestionPayloadSchema,
  SceneQuestionPayloadSchema,
  SayItQuestionPayloadSchema,
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
  format: QuestionFormatSchema.default("pick1"),
  render_variant: RenderVariantSchema.default("standard"),
  template_id: z.string().nullable().optional(),
  template_key: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  payload: QuestionPayloadSchema,
  scene_asset_key: z.string().nullable().optional(),
  entropy_estimate: z.number().nullable().optional(),
  tie_risk_estimate: z.number().nullable().optional(),
  answer_options: z.array(AnswerOptionResponseSchema),
});

export const MemeQuestionSchema = QuestionResponseSchema.superRefine((val, ctx) => {
  if (val.render_variant === "meme") {
    if (val.type !== "text" && val.type !== "image") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meme question render variant only supports Type 1 (text) and Type 4 (image)",
        path: ["type"],
      });
    }
    if (!val.template_key && !val.template_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meme question requires a valid template_key or template_id",
        path: ["template_key"],
      });
    }
    if (!val.tags || val.tags.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meme question requires at least 1 tag",
        path: ["tags"],
      });
    }
  }
});

export const DropResponseSchema = z.object({
  id: UUIDSchema,
  drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opens_at: z.string().datetime(),
  closes_at: z.string().datetime(),
  status: DropStatusSchema,
  theme_key: z.string().nullable().optional(),
  telepathy_question_id: UUIDSchema.optional().nullable(),
  questions: z.array(QuestionResponseSchema),
});

// ---------------------------------------------------------------------------
// Telepathy (Instinct Sync) Schemas (Stage F3 / Phase 10C)
// ---------------------------------------------------------------------------

export const SubmitTelepathyGuessSchema = z.object({
  guessed_option: z.string().min(1).max(200),
});

export const TelepathyRevealSchema = z.object({
  partner_pick: z.string(),
  is_match: z.boolean(),
  baseline_p: z.number().min(0).max(1),
});

export const TelepathySyncSummarySchema = z.object({
  total_rounds: z.number().int().min(0),
  matches: z.number().int().min(0),
  sync_score: z.number().min(0).max(1),
  baseline_score: z.number().min(0).max(1),
  lift: z.number(),
  unlocked: z.boolean(),
  min_rounds: z.number().int(),
});

export const TelepathyRoundResponseSchema = z.object({
  drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  question: QuestionResponseSchema.nullable(),
  has_both_submitted: z.boolean(),
  caller_submitted: z.boolean(),
  partner_submitted: z.boolean(),
  my_guess: z
    .object({
      guessed_option: z.string(),
      locked_at: z.string().datetime(),
    })
    .nullable(),
  partner_guess_locked: z.boolean(),
  reveal: TelepathyRevealSchema.nullable(),
  sync_summary: TelepathySyncSummarySchema.nullable(),
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
      tie_group_size: z.number().int().min(1).optional(),
      is_mutual: z.boolean().optional(),
      tie_break_reason: z.string().optional(),
      history_days: z.number().int().min(0).optional(),
      why_you_two: z
        .array(
          z.object({
            question_id: z.string(),
            value: z.unknown(),
            rarity_percent: z.number(),
          })
        )
        .optional(),
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
// Signals & Telemetry Schemas (Stage M2 / Phase 10F)
// ---------------------------------------------------------------------------

export const SignalEventNameSchema = z.enum([
  "question_shown",
  "question_answered",
  "question_changed",
  "question_back",
  "drop_started",
  "drop_completed",
  "drop_abandoned",
  "share_clicked",
  "theme_viewed",
]);

export const SignalEventPropsSchema = z
  .object({
    question_id: z.string().optional(),
    position: z.number().int().min(1).max(5).optional(),
    dwell_ms: z.number().int().min(0).max(600000).optional(),
    option_count: z.number().int().min(2).max(10).optional(),
    format: z.string().max(20).optional(),
    theme_key: z.string().max(50).optional(),
    tag_key: z.string().max(50).optional(),
  })
  .strict(); // strictly forbid any unexpected keys, arbitrary strings or PII

export const SignalEventItemSchema = z.object({
  event_name: SignalEventNameSchema,
  drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  props: SignalEventPropsSchema.default({}),
  timestamp_ms: z.number().int().optional(),
});

export const EventsBatchRequestSchema = z.object({
  session_id: z.string().max(64).optional(),
  events: z.array(SignalEventItemSchema).min(1).max(50),
});

export const ConsentPurposeSchema = z.enum(["analytics", "personalisation"]);

export const UpdateConsentRequestSchema = z.object({
  purpose: ConsentPurposeSchema,
  granted: z.boolean(),
  policy_version: z.number().int().min(1).default(1),
});

export const ConsentsResponseSchema = z.object({
  analytics: z.boolean(),
  personalisation: z.boolean(),
  policy_version: z.number().int(),
  analytics_id: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Type inference helpers
// ---------------------------------------------------------------------------

export type ValidatedSubmissionRequest = z.infer<typeof SubmissionRequestSchema>;
export type ValidatedAnswerPayload = z.infer<typeof AnswerPayloadSchema>;
export type ValidatedPlayerSession = z.infer<typeof PlayerSessionSchema>;
export type ValidatedStoredAnswer = z.infer<typeof StoredAnswerSchema>;
export type ValidatedTelepathyRoundResponse = z.infer<typeof TelepathyRoundResponseSchema>;
export type ValidatedSubmitTelepathyGuess = z.infer<typeof SubmitTelepathyGuessSchema>;
export type ValidatedTelepathyReveal = z.infer<typeof TelepathyRevealSchema>;
export type ValidatedTelepathySyncSummary = z.infer<typeof TelepathySyncSummarySchema>;

