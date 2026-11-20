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
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  CreateMemeSubmissionSchema,
  type CreateMemeSubmissionInput,
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
};
