/**
 * @file memes.ts
 * @package @oddly/api
 *
 * Meme Lab Routes (Stage M3 / Phase 10G / Tasks P10G.02, P10G.05, P10G.07, P10G.08).
 *
 * Implements:
 * - POST /v1/memes/submissions: Meme Lab submission API (Turnstile, duplicate check, 100 char limit)
 * - GET /v1/memes/templates: List active curated vector illustration templates
 * - GET /v1/memes/submissions/mine: List player's own meme submissions and their status
 *
 * Invariants:
 * - Rule 18: Scoped free-text exception strictly <= 100 characters.
 * - Zero public exposure until passed through human moderation queue in Mission Control.
 * - Daily submission cap (default 2 per author per day).
 * - Exact and Levenshtein near-duplicate rejection within template.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { MemesRepository } from "../db/memes.repo.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  CreateMemeSubmissionSchema,
  type CreateMemeSubmissionInput,
  RateMemeSchema,
  type RateMemeInput,
  calculateWilsonScore,
  isTurnstileValid,
  isDuplicateOrNearDuplicate,
} from "@oddly/shared";

export const memeRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/memes/templates
   * Lists active meme illustration templates available for captioning.
   */
  app.get(
    "/v1/memes/templates",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            templates: z.array(
              z.object({
                id: z.string(),
                key: z.string(),
                illustration_registry_key: z.string(),
                aspect: z.string(),
                alt_text_i18n: z.record(z.string(), z.unknown()),
                license_note: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (_req, reply) => {
      const templates = await prisma.memeTemplate.findMany({
        where: { status: "active" },
        select: {
          id: true,
          key: true,
          illustration_registry_key: true,
          aspect: true,
          alt_text_i18n: true,
          license_note: true,
        },
        orderBy: { key: "asc" },
      });

      return reply.status(200).send({
        ok: true,
        templates: templates.map((t) => ({
          ...t,
          alt_text_i18n: t.alt_text_i18n as Record<string, unknown>,
        })),
      });
    }
  );

  /**
   * GET /v1/memes/corner
   * Fetches the next tailored Meme Corner card for the authenticated player (P10G.06).
   * Runs the 80/20 exposure engine (80% exploitation top Wilson score, 20% exploration),
   * enforcing author exclusion, no-repeat limits, and template diversity caps.
   */
  app.get(
    "/v1/memes/corner",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            meme: z
              .object({
                id: z.string(),
                template_id: z.string(),
                template_key: z.string(),
                illustration_registry_key: z.string(),
                caption_text: z.string(),
                aspect: z.string(),
                alt_text: z.string().optional(),
                wilson_lb: z.number(),
                is_exploration: z.boolean(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme Corner is temporarily paused under high traffic.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to view Meme Corner",
        });
      }

      // 3. Exposure Engine Selection
      const memesRepo = new MemesRepository(prisma);
      const selected = await memesRepo.selectMemeForPlayer(player.id);

      return reply.status(200).send({
        ok: true,
        meme: selected,
      });
    }
  );

  /**
   * POST /v1/memes/submissions
   * Submits a user-authored caption for an active meme template.
   * Enforces Rule 18 (<= 100 chars), Turnstile, duplicate checking, and daily rate limit.
   */
  app.post(
    "/v1/memes/submissions",
    {
      schema: {
        body: CreateMemeSubmissionSchema,
        response: {
          201: z.object({
            ok: z.boolean(),
            submission: z.object({
              id: z.string(),
              author_player_id: z.string(),
              template_id: z.string(),
              caption_text: z.string(),
              status: z.string(),
              created_at: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme submissions are temporarily paused under high traffic. Please try again later.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to submit memes",
        });
      }

      const { template_id, caption_text, turnstile_token } = req.body as CreateMemeSubmissionInput;

      // 3. Turnstile Human Verification Check
      if (!isTurnstileValid(turnstile_token)) {
        return reply.status(400).send({
          ok: false,
          error: "INVALID_TURNSTILE",
          message: "Turnstile human verification challenge failed",
        });
      }

      // 4. Validate Template Existence and Active Status
      const template = await prisma.memeTemplate.findFirst({
        where: {
          OR: [{ id: template_id }, { key: template_id }],
          status: "active",
        },
      });

      if (!template) {
        return reply.status(404).send({
          ok: false,
          error: "TEMPLATE_NOT_FOUND",
          message: "Meme template not found or is currently inactive",
        });
      }

      // 5. Daily Submission Cap Check (default 2 per day)
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const dailyCount = await prisma.memeSubmission.count({
        where: {
          author_player_id: player.id,
          created_at: { gte: startOfDay },
        },
      });

      if (dailyCount >= 2) {
        return reply.status(429).send({
          ok: false,
          error: "DAILY_LIMIT_EXCEEDED",
          message: "Daily submission limit reached (max 2 per day)",
        });
      }

      // 6. Duplicate & Near-Duplicate Detection Check
      const trimmedCaption = caption_text.trim();
      const existingSubmissions = await prisma.memeSubmission.findMany({
        where: {
          template_id: template.id,
          status: { in: ["queued", "approved"] },
        },
        select: { caption_text: true },
      });

      const existingCaptions = existingSubmissions.map((s) => s.caption_text);
      const dupCheck = isDuplicateOrNearDuplicate(trimmedCaption, existingCaptions, 2);

      if (dupCheck.isDuplicate) {
        return reply.status(409).send({
          ok: false,
          error: "DUPLICATE_CAPTION",
          message:
            dupCheck.reason === "exact"
              ? "An identical caption already exists for this template"
              : "A very similar caption already exists for this template",
        });
      }

      // 7. Persist Meme Submission and Initialize Stats (Rule 18: status = 'queued')
      const submission = await prisma.memeSubmission.create({
        data: {
          author_player_id: player.id,
          template_id: template.id,
          caption_text: trimmedCaption,
          status: "queued",
          turnstile_verified: true,
          originality_attested_at: new Date(),
          stats: {
            create: {
              impressions: 0,
              raters: 0,
              funny_count: 0,
              not_for_me_count: 0,
              wilson_lb: 0.0,
            },
          },
        },
        select: {
          id: true,
          author_player_id: true,
          template_id: true,
          caption_text: true,
          status: true,
          created_at: true,
        },
      });

      return reply.status(201).send({
        ok: true,
        submission: {
          ...submission,
          created_at: submission.created_at.toISOString(),
        },
      });
    }
  );

  /**
   * GET /v1/memes/submissions/mine
   * Lists the authenticated player's own meme submissions and their review status.
   */
  app.get(
    "/v1/memes/submissions/mine",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            submissions: z.array(
              z.object({
                id: z.string(),
                template_id: z.string(),
                caption_text: z.string(),
                status: z.string(),
                moderation_reason: z.string().nullable(),
                created_at: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to view your meme submissions",
        });
      }

      const submissions = await prisma.memeSubmission.findMany({
        where: { author_player_id: player.id },
        select: {
          id: true,
          template_id: true,
          caption_text: true,
          status: true,
          moderation_reason: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      });

      return reply.status(200).send({
        ok: true,
        submissions: submissions.map((s) => ({
          ...s,
          created_at: s.created_at.toISOString(),
        })),
      });
    }
  );

  /**
   * POST /v1/memes/:id/rating
   * Ingests a binary reaction ("funny" | "not_for_me") for a meme submission.
   * Enforces 1 rating per player per submission, sheds at degradation L2+,
   * updates raters counters, and recalculates Wilson score lower bound.
   */
  app.post(
    "/v1/memes/:id/rating",
    {
      schema: {
        params: z.object({
          id: z.string().min(1, "Meme submission ID is required"),
        }),
        body: RateMemeSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            submission_id: z.string(),
            rating: z.enum(["funny", "not_for_me"]),
            raters: z.number(),
            wilson_lb: z.number(),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme rating ingestion is temporarily paused under high traffic.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to rate memes",
        });
      }

      const { id: submissionId } = req.params as { id: string };
      const { rating } = req.body as RateMemeInput;

      // 3. Validate Submission Existence
      const submission = await prisma.memeSubmission.findUnique({
        where: { id: submissionId },
        include: { stats: true },
      });

      if (!submission) {
        return reply.status(404).send({
          ok: false,
          error: "MEME_NOT_FOUND",
          message: "Meme submission not found",
        });
      }

      // 4. Check for Existing Rating by this Player
      const existingRating = await prisma.memeRating.findUnique({
        where: {
          submission_rater_unique: {
            submission_id: submissionId,
            rater_player_id: player.id,
          },
        },
      });

      if (existingRating) {
        return reply.status(409).send({
          ok: false,
          error: "ALREADY_RATED",
          message: "You have already rated this meme submission",
        });
      }

      // 5. Ingest Rating & Update Stats in Transaction
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      try {
        const result = await prisma.$transaction(async (tx) => {
          await tx.memeRating.create({
            data: {
              submission_id: submissionId,
              rater_player_id: player.id,
              rating,
              drop_date: today,
            },
          });

          const currentStats = await tx.memeStat.findUnique({
            where: { submission_id: submissionId },
          });

          const newRaters = (currentStats?.raters ?? 0) + 1;
          const newFunny = (currentStats?.funny_count ?? 0) + (rating === "funny" ? 1 : 0);
          const newNotForMe = (currentStats?.not_for_me_count ?? 0) + (rating === "not_for_me" ? 1 : 0);

          // ADR 043: Minimum 200 raters required before Wilson score activates
          const minRatersWilson = 200;
          const newWilson =
            newRaters >= minRatersWilson ? calculateWilsonScore(newFunny, newRaters) : 0.0;

          const updatedStats = await tx.memeStat.upsert({
            where: { submission_id: submissionId },
            create: {
              submission_id: submissionId,
              impressions: 1,
              raters: newRaters,
              funny_count: newFunny,
              not_for_me_count: newNotForMe,
              wilson_lb: newWilson,
              last_shown_at: new Date(),
            },
            update: {
              raters: newRaters,
              funny_count: newFunny,
              not_for_me_count: newNotForMe,
              wilson_lb: newWilson,
              last_shown_at: new Date(),
            },
          });

          return updatedStats;
        });

        return reply.status(200).send({
          ok: true,
          submission_id: submissionId,
          rating,
          raters: result.raters,
          wilson_lb: result.wilson_lb,
        });
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === "P2002") {
          return reply.status(409).send({
            ok: false,
            error: "ALREADY_RATED",
            message: "You have already rated this meme submission",
          });
        }
        throw err;
      }
    }
  );
};
