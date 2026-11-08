import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { submissionsRepo, dropsRepo, matchesRepo, sharesRepo } from "../db/index.js";

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
      const submission = await submissionsRepo.findByPlayerAndDrop(playerId, dropId);
      if (!submission) {
        return reply.status(404).send({
          error: "SUBMISSION_NOT_FOUND",
          message: "No submission found for this drop",
        });
      }

      const { short_id: shortId } = await sharesRepo.createShortLink(submission.id);

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
      const shortLink = await sharesRepo.findByShortId(shortId);

      if (!shortLink) {
        return reply.status(404).send({
          error: "SHORT_LINK_NOT_FOUND",
          message: "The requested challenge link does not exist",
        });
      }

      // Increment view count asynchronously
      void sharesRepo.incrementViews(shortId);

      // Fetch submission
      const submission = await submissionsRepo.findById(shortLink.submission_id);
      if (!submission) {
        return reply.status(404).send({
          error: "SUBMISSION_NOT_FOUND",
          message: "Original submission has expired",
        });
      }

      // Fetch drop and match details
      const drop = await dropsRepo.findById(submission.drop_id);
      const match = await matchesRepo.findBySubmission(submission.id);

      let twinCity = "Berlin, Germany";
      if (match?.twin_persona && typeof match.twin_persona === "object") {
        const persona = match.twin_persona as Record<string, unknown>;
        if (typeof persona.city === "string" && typeof persona.country === "string") {
          twinCity = `${persona.city}, ${persona.country}`;
        }
      }

      // Map questions and answers cleanly without any player/user references
      const rawAnswers = (submission.answers as any[]) || [];
      const sanitizedAnswers = rawAnswers.map((a: any) => ({
        questionId: a.question_id || a.questionId,
        value: a.value,
      }));

      const rawQuestions = drop?.questions || [];
      const sanitizedQuestions = rawQuestions.map((q: any) => ({
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
        dropDate: drop?.drop_date ? new Date(drop.drop_date).toISOString() : new Date().toISOString(),
        sharerScore: match?.score ?? 3,
        sharerTier: match?.tier ?? "Common",
        sharerPercentile: match?.percentile ?? 50,
        twinCity,
        answers: sanitizedAnswers,
        questions: sanitizedQuestions,
      });
    }
  );
};
