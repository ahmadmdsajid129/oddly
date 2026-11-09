import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  prisma,
  SubmissionsRepository,
  DropsRepository,
  MatchesRepository,
  SharesRepository,
} from "../db/index.js";

export const sharesRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/shares
   * Creates or retrieves a viral short link for a drop submission.
   */
  app.post<{ Body: { dropId: string } }>(
    "/shares",
    {
      schema: {
        tags: ["Shares"],
        summary: "Generate a short link token for a submission",
        body: z.object({
          dropId: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            shortId: z.string(),
            shareUrl: z.string(),
          }),
          401: z.object({
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const playerId = req.cookies.oddly_session;
      if (!playerId) {
        return reply.status(401).send({
          error: "UNAUTHORIZED",
          message: "Session cookie required to generate share link",
        });
      }

      const { dropId } = req.body;
      const submission = await SubmissionsRepository.findByPlayerAndDrop(playerId, dropId);
      if (!submission) {
        return reply.status(404).send({
          error: "SUBMISSION_NOT_FOUND",
          message: "No submission found for this drop",
        });
      }

      const { short_id: shortId } = await SharesRepository.createShortLink(submission.id);

      return reply.send({
        success: true,
        shortId,
        shareUrl: `/c/${shortId}`,
      });
    }
  );

  /**
   * GET /v1/shares/:shortId
   * Public landing page payload resolver with strict privacy enforcement (zero PII).
   */
  app.get<{ Params: { shortId: string } }>(
    "/shares/:shortId",
    {
      schema: {
        tags: ["Shares"],
        summary: "Public challenge receiver data with zero PII",
        params: z.object({
          shortId: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            shortId: z.string(),
            dropId: z.string(),
            dropDate: z.string(),
            sharerScore: z.number(),
            sharerTier: z.string(),
            sharerPercentile: z.number(),
            twinCity: z.string().optional(),
            answers: z.array(
              z.object({
                questionId: z.string(),
                value: z.unknown(),
              })
            ),
            questions: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                prompt: z.string(),
                options: z.unknown().optional(),
                media_url: z.string().nullable().optional(),
              })
            ),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { shortId } = req.params;
      const shortLink = await SharesRepository.findByShortId(shortId);

      if (!shortLink) {
        return reply.status(404).send({
          error: "SHORT_LINK_NOT_FOUND",
          message: "The requested challenge link does not exist",
        });
      }

      // Increment view count asynchronously
      void SharesRepository.incrementViews(shortId);

      // Fetch submission
      const submission = await SubmissionsRepository.getById(shortLink.submission_id);
      if (!submission) {
        return reply.status(404).send({
          error: "SUBMISSION_NOT_FOUND",
          message: "Original submission has expired",
        });
      }

      // Fetch drop, oddness, and match details
      const drop = await DropsRepository.getDropById(submission.drop_id);
      const match = await MatchesRepository.getMatchForPlayer(
        submission.drop_id,
        submission.player_id
      );
      const oddness = await prisma.oddnessScore.findUnique({
        where: { submission_id: submission.id },
      });

      const twinPlayer = match
        ? match.player_a_id === submission.player_id
          ? match.player_b
          : match.player_a
        : null;

      let twinCity = "Berlin, Germany";
      if (twinPlayer?.region === "IN") twinCity = "Mumbai, India";
      else if (twinPlayer?.region === "US") twinCity = "New York, USA";
      else if (twinPlayer?.region === "GB") twinCity = "London, UK";
      else if (twinPlayer?.region === "DE") twinCity = "Berlin, Germany";

      // Map questions and answers cleanly without any player/user references
      interface StoredItemAnswer {
        question_id?: string;
        questionId?: string;
        value: unknown;
      }
      interface StoredQuestionItem {
        id: string;
        type: string;
        prompt: string;
        options?: unknown;
        media_url?: string | null;
      }

      const rawAnswers = (submission.answers as unknown as StoredItemAnswer[]) || [];
      const sanitizedAnswers = rawAnswers.map((a) => ({
        questionId: a.question_id || a.questionId || "",
        value: a.value,
      }));

      const rawQuestions = (drop?.questions as unknown as StoredQuestionItem[]) || [];
      const sanitizedQuestions = rawQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        media_url: q.media_url,
      }));

      return reply.send({
        success: true,
        shortId,
        dropId: submission.drop_id,
        dropDate: drop?.drop_date
          ? new Date(drop.drop_date).toISOString()
          : new Date().toISOString(),
        sharerScore: match ? Math.round(match.similarity_score * 5) : 3,
        sharerTier: oddness?.tier ?? "Common",
        sharerPercentile: oddness?.percentile ?? 50,
        twinCity,
        answers: sanitizedAnswers,
        questions: sanitizedQuestions,
      });
    }
  );
};
