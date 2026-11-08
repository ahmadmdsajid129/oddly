/**
 * @file results.ts
 * @package @oddly/api
 *
 * Results endpoint for viewing matches and Oddness scores (P3.07).
 */

import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { hashTwinId } from "@oddly/shared";
import { prisma } from "../db/client.js";
import { SubmissionsRepository } from "../db/submissions.repo.js";
import { MatchesRepository } from "../db/matches.repo.js";

export const resultsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /v1/results/:dropId — view result for drop
  app.get(
    "/v1/results/:dropId",
    {
      schema: {
        description: "Fetch player's result, Oddness score, and twin for a drop",
        tags: ["Results"],
        params: z.object({
          dropId: z.string().uuid(),
        }),
        querystring: z.object({
          player_id: z.string().uuid().optional(),
        }),
      },
    },
    async (req, reply) => {
      // Resolve player_id from query or cookie
      let playerId = req.query.player_id;
      if (!playerId && req.cookies.oddly_at) {
        const unsigned = req.unsignCookie(req.cookies.oddly_at);
        playerId = unsigned.valid ? unsigned.value : req.cookies.oddly_at;
      }

      if (!playerId) {
        reply.status(400).send({
          ok: false,
          error: "PLAYER_ID_REQUIRED",
          message: "A player_id query parameter or session cookie is required.",
        });
        return;
      }

      const submission = await SubmissionsRepository.findByPlayerAndDrop(
        playerId,
        req.params.dropId
      );

      if (!submission) {
        reply.status(404).send({
          ok: false,
          error: "SUBMISSION_NOT_FOUND",
          message: "No submission found for this player in the specified drop.",
        });
        return;
      }

      const oddness = await prisma.oddnessScore.findUnique({
        where: { submission_id: submission.id },
      });

      const match = await MatchesRepository.getMatchForPlayer(
        req.params.dropId,
        playerId
      );

      const twinId = match
        ? match.player_a_id === playerId
          ? match.player_b_id
          : match.player_a_id
        : null;

      return {
        ok: true,
        submission_id: submission.id,
        drop_id: req.params.dropId,
        oddness: {
          raw_score: oddness?.raw_score ?? 0.5,
          percentile: oddness?.percentile ?? 50,
          tier: oddness?.tier ?? "Common",
        },
        match: match && twinId
          ? {
              twin_token: hashTwinId(twinId, req.params.dropId),
              similarity_score: match.similarity_score,
              is_provisional: match.is_provisional,
              matched_at: match.matched_at.toISOString(),
            }
          : null,
      };
    }
  );

  // GET /v1/results/submission/:submissionId
  app.get(
    "/v1/results/submission/:submissionId",
    {
      schema: {
        description: "Fetch result directly by submission ID",
        tags: ["Results"],
        params: z.object({
          submissionId: z.string().uuid(),
        }),
      },
    },
    async (req, reply) => {
      const submission = await SubmissionsRepository.getById(
        req.params.submissionId
      );

      if (!submission) {
        reply.status(404).send({
          ok: false,
          error: "SUBMISSION_NOT_FOUND",
          message: "Submission does not exist.",
        });
        return;
      }

      const match = await MatchesRepository.getMatchForPlayer(
        submission.drop_id,
        submission.player_id
      );

      const twinId = match
        ? match.player_a_id === submission.player_id
          ? match.player_b_id
          : match.player_a_id
        : null;

      return {
        ok: true,
        submission_id: submission.id,
        drop_id: submission.drop_id,
        oddness: {
          raw_score: submission.oddnessScore?.raw_score ?? 0.5,
          percentile: submission.oddnessScore?.percentile ?? 50,
          tier: submission.oddnessScore?.tier ?? "Common",
        },
        match: match && twinId
          ? {
              twin_token: hashTwinId(twinId, submission.drop_id),
              similarity_score: match.similarity_score,
              is_provisional: match.is_provisional,
            }
          : null,
      };
    }
  );
};
