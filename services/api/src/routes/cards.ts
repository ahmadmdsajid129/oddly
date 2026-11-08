import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  renderShareCardPng,
  computeCardContentHash,
  computeCardStorageKey,
  getCardStorage,
  type ShareFormat,
  type ShareTheme,
  type Tier,
} from "@oddly/shared";
import { submissionsRepo, dropsRepo, matchesRepo, sharesRepo } from "../db/index.js";

const CardQuerySchema = z.object({
  format: z.enum(["story", "square", "link"]).default("story"),
  theme: z.enum(["dark", "light", "mythic"]).default("dark"),
});

export const cardsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/results/:dropId/card
   * Retrieves or on-demand renders a share card for the requesting player's submission.
   */
  app.get<{
    Params: { dropId: string };
    Querystring: { format?: ShareFormat; theme?: ShareTheme };
  }>(
    "/results/:dropId/card",
    {
      schema: {
        tags: ["Cards"],
        summary: "Get or generate share card PNG for a drop submission",
        params: z.object({
          dropId: z.string(),
        }),
        querystring: CardQuerySchema,
        response: {
          200: z.object({
            success: z.boolean(),
            format: z.string(),
            theme: z.string(),
            cardUrl: z.string(),
            storageKey: z.string(),
            shortId: z.string(),
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
          message: "Session cookie required to access personal share card",
        });
      }

      const { dropId } = req.params;
      const format = (req.query.format as ShareFormat) || "story";
      const theme = (req.query.theme as ShareTheme) || "dark";

      // 1. Fetch submission
      const submission = await submissionsRepo.findByPlayerAndDrop(playerId, dropId);
      if (!submission) {
        return reply.status(404).send({
          error: "SUBMISSION_NOT_FOUND",
          message: "No submission found for this drop",
        });
      }

      // 2. Fetch drop & match context
      const drop = await dropsRepo.findById(dropId);
      const match = await matchesRepo.findBySubmission(submission.id);
      const { short_id: shortId } = await sharesRepo.createShortLink(submission.id);

      const score = match?.score ?? 3;
      const tier = (match?.tier || "Common") as Tier;
      const percentile = match?.percentile ?? 50;

      // Extract twin persona if present
      let twinCity = "Berlin, Germany";
      if (match?.twin_persona && typeof match.twin_persona === "object") {
        const persona = match.twin_persona as Record<string, unknown>;
        if (typeof persona.city === "string" && typeof persona.country === "string") {
          twinCity = `${persona.city}, ${persona.country}`;
        }
      }

      // 3. Compute storage key
      const contentHash = computeCardContentHash({
        submissionId: submission.id,
        format,
        theme,
        score,
        tier,
        percentile,
      });

      const storageKey = computeCardStorageKey(
        submission.id,
        format,
        theme,
        contentHash
      );

      const storage = getCardStorage();
      const exists = await storage.hasCard(storageKey);

      let publicUrl: string;
      if (exists) {
        publicUrl = storage.getPublicUrl(storageKey);
      } else {
        // Render on demand
        const dateStr = drop?.drop_date
          ? new Date(drop.drop_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Nov 8, 2026";

        const pngBuffer = await renderShareCardPng({
          score,
          total: 5,
          tier,
          percentile,
          twinCity,
          streak: 1,
          dateStr,
          shortId,
          format,
          theme,
        });

        publicUrl = await storage.putCard(storageKey, pngBuffer);
        await sharesRepo.saveShareCard(submission.id, format, storageKey);
      }

      // Set CDN immutable caching
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");

      return reply.send({
        success: true,
        format,
        theme,
        cardUrl: publicUrl,
        storageKey,
        shortId,
      });
    }
  );

  /**
   * GET /v1/cards/*
   * Raw image streaming endpoint serving PNG buffers from storage.
   */
  app.get<{ Params: { "*": string } }>(
    "/cards/*",
    async (req, reply) => {
      const wildcard = req.params["*"];
      const storageKey = `cards/${wildcard}`;

      const storage = getCardStorage();
      const buffer = await storage.getCard(storageKey);

      if (!buffer) {
        return reply.status(404).send("Card not found");
      }

      reply.header("Content-Type", "image/png");
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return reply.send(buffer);
    }
  );
};
