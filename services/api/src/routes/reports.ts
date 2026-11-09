/**
 * @file reports.ts
 * @package @oddly/api
 *
 * User moderation and content reporting intake endpoint (P8.07).
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAuthAccount } from "../auth/tokens.js";

export const reportsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/reports
   * Submit an issue report on a drop, question, or twin matchup (P8.07).
   */
  app.post<{
    Body: {
      target_type: "drop" | "question" | "twin" | "other";
      target_id: string;
      reason: "inappropriate" | "offensive" | "bot_abuse" | "technical_glitch" | "other";
      note?: string;
    };
  }>(
    "/v1/reports",
    {
      schema: {
        tags: ["Reporting"],
        summary: "File a content or user conduct report",
        body: z.object({
          target_type: z.enum(["drop", "question", "twin", "other"]),
          target_id: z.string().min(1),
          reason: z.enum([
            "inappropriate",
            "offensive",
            "bot_abuse",
            "technical_glitch",
            "other",
          ]),
          note: z.string().max(140).optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            report_id: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { target_type, target_id, reason, note } = req.body;
      const auth = await getAuthAccount(req);
      const reporterId = auth?.accountId || req.cookies.oddly_session || req.cookies.oddly_did || "anonymous";

      const reportId = `rep_${randomUUID()}`;

      req.log.info(
        {
          reportId,
          reporterId,
          target_type,
          target_id,
          reason,
          noteLength: note?.length ?? 0,
        },
        "User report received for moderation intake"
      );

      return reply.send({
        ok: true,
        report_id: reportId,
        message:
          "Thank you for keeping Oddly safe. Our moderation team has received your report.",
      });
    }
  );
};
