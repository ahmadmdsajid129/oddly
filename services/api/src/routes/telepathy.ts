/**
 * @file telepathy.ts
 * @package @oddly/api
 *
 * Telepathy (Instinct Sync) API Endpoints (Stage F3 / Phase 10C / Tasks P10C.04, P10C.05).
 * - GET /v1/orbits/:id/telepathy: Get current Telepathy round state, question, and Sync summary
 * - POST /v1/orbits/:id/telepathy/guess: Submit and permanently lock in guess (Rule 4 scoped reveal exception)
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { TelepathyRepository } from "../db/telepathy.repo.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import { SubmitTelepathyGuessSchema } from "@oddly/shared";

const TelepathyQuestionResponseSchema = z.object({
  id: z.string(),
  position: z.number(),
  type: z.enum(["text", "image"]),
  prompt: z.string(),
  answer_options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      display_order: z.number(),
      illustration_key: z.string().nullable().optional(),
    })
  ),
});

const TelepathyRevealResponseSchema = z.object({
  partner_pick: z.string(),
  is_match: z.boolean(),
  baseline_p: z.number(),
});

const TelepathySyncSummaryResponseSchema = z.object({
  total_rounds: z.number(),
  matches: z.number(),
  sync_score: z.number(),
  baseline_score: z.number(),
  lift: z.number(),
  unlocked: z.boolean(),
  min_rounds: z.number(),
});

const TelepathyRoundStateResponseSchema = z.object({
  drop_date: z.string(),
  question: TelepathyQuestionResponseSchema.nullable(),
  has_both_submitted: z.boolean(),
  caller_submitted: z.boolean(),
  partner_submitted: z.boolean(),
  my_guess: z
    .object({
      guessed_option: z.string(),
      locked_at: z.string(),
    })
    .nullable(),
  partner_guess_locked: z.boolean(),
  reveal: TelepathyRevealResponseSchema.nullable(),
  sync_summary: TelepathySyncSummaryResponseSchema.nullable(),
});

export const telepathyRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/orbits/:id/telepathy
   * Get current Telepathy round state for an Orbit.
   */
  app.get<{ Params: { id: string }; Querystring: { drop_date?: string } }>(
    "/v1/orbits/:id/telepathy",
    {
      schema: {
        tags: ["Telepathy"],
        summary: "Get current Telepathy round state, question, and Sync summary",
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            round: TelepathyRoundStateResponseSchema,
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          403: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Authentication required to access Telepathy.",
        });
      }

      try {
        const round = await TelepathyRepository.getRoundState(
          req.params.id,
          player.id,
          req.query?.drop_date
        );
        return reply.send({
          ok: true,
          round,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg === "FORBIDDEN") {
          return reply.status(403).send({
            ok: false,
            error: "FORBIDDEN",
            message: "You are not a member of this Orbit.",
          });
        }
        if (errorMsg === "ORBIT_NOT_FOUND") {
          return reply.status(404).send({
            ok: false,
            error: "ORBIT_NOT_FOUND",
            message: "Orbit does not exist.",
          });
        }
        throw err;
      }
    }
  );

  /**
   * POST /v1/orbits/:id/telepathy/guess
   * Lock in caller's guess for today's Telepathy round.
   * Rule 4 Exception: reveals partner pick ONLY after guess lock-in.
   */
  app.post<{ Params: { id: string }; Body: { guessed_option: string }; Querystring: { drop_date?: string } }>(
    "/v1/orbits/:id/telepathy/guess",
    {
      schema: {
        tags: ["Telepathy"],
        summary: "Lock in Telepathy guess (permanent lock-in, scoped partner reveal)",
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          drop_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
        body: SubmitTelepathyGuessSchema,
        response: {
          200: z.object({
            ok: z.literal(true),
            round: TelepathyRoundStateResponseSchema,
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          403: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          409: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          422: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          503: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      // Check system degradation: Telepathy guessing is paused at L2+ (priority rank 7)
      const level = await DegradationManager.getLevel();
      if (level >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "TELEPATHY_PAUSED",
          message: "Telepathy guessing is temporarily paused during peak load. Please try again shortly.",
        });
      }

      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to submit Telepathy guess.",
        });
      }

      try {
        const round = await TelepathyRepository.lockInGuess(
          req.params.id,
          player.id,
          req.body.guessed_option,
          req.query?.drop_date
        );

        return reply.send({
          ok: true,
          round,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg === "FORBIDDEN") {
          return reply.status(403).send({
            ok: false,
            error: "FORBIDDEN",
            message: "You are not a member of this Orbit.",
          });
        }
        if (errorMsg === "ORBIT_NOT_FOUND") {
          return reply.status(404).send({
            ok: false,
            error: "ORBIT_NOT_FOUND",
            message: "Orbit does not exist.",
          });
        }
        if (errorMsg === "SUBMISSION_REQUIRED") {
          return reply.status(422).send({
            ok: false,
            error: "SUBMISSION_REQUIRED",
            message: "Both you and your twin must complete today's Drop before playing Telepathy.",
          });
        }
        if (errorMsg === "GUESS_ALREADY_LOCKED") {
          return reply.status(409).send({
            ok: false,
            error: "GUESS_ALREADY_LOCKED",
            message: "You have already locked in your guess for today's Telepathy round.",
          });
        }
        throw err;
      }
    }
  );
};
