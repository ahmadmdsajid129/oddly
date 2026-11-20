/**
 * @file insights.ts
 * @package @oddly/api
 *
 * Insights Engine & Mission Control Analytics Endpoints (Stage M4 / Phase 10H / Tasks P10H.04 - P10H.07).
 *
 * Endpoints:
 * - GET  /v1/admin/insights/tags/performance (Category performance analytics - P10H.04)
 * - GET  /v1/admin/insights/questions/flags  (Question quality flagging engine - P10H.05)
 * - GET  /v1/admin/insights/timing           (Cohort notification timing stats - P10H.06)
 * - GET  /v1/admin/insights/suggestions      (Drop planning advisory suggestions - P10H.07)
 * - POST /v1/admin/insights/suggestions/generate (Generate suggestions for target drop date - P10H.07)
 * - POST /v1/admin/insights/suggestions/:id/dismiss (Dismiss advisory suggestion - P10H.07)
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { resolveAuthenticatedAdmin } from "../auth/admin-auth.js";
import { InsightsService } from "../services/insights.service.js";

export const insightsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new InsightsService(prisma);

  /**
   * P10H.04: GET /v1/admin/insights/tags/performance
   * Category performance analytics (completion, viral share lift, dwell by subject tag).
   */
  app.get(
    "/v1/admin/insights/tags/performance",
    {
      schema: {
        summary: "Category performance analytics over trailing 14-day window",
        querystring: z.object({
          days: z.coerce.number().int().min(1).max(90).default(14),
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const { days } = req.query as { days: number };
      const data = await service.getCategoryPerformance(days);

      return reply.send({
        ok: true,
        days: data.daysEvaluated,
        baselineShareRate: data.baselineShareRate,
        tags: data.tags,
      });
    }
  );

  /**
   * P10H.05: GET /v1/admin/insights/questions/flags
   * Question quality flagging engine (detect high dwell, option changes, abandon spikes).
   * Enforces Rule 15: k >= 20 sample noise threshold, zero individual vectors.
   */
  app.get(
    "/v1/admin/insights/questions/flags",
    {
      schema: {
        summary: "Question quality automated flags",
        querystring: z.object({
          drop_date: z.string().optional(),
          min_submissions: z.coerce.number().int().default(20),
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const { drop_date, min_submissions } = req.query as { drop_date?: string; min_submissions: number };
      const dropDate = drop_date ? new Date(drop_date) : undefined;

      const flaggedQuestions = await service.getQuestionQualityFlags({
        dropDate,
        minSubmissions: min_submissions,
      });

      return reply.send({
        ok: true,
        count: flaggedQuestions.length,
        questions: flaggedQuestions,
      });
    }
  );

  /**
   * P10H.06: GET /v1/admin/insights/timing
   * Cohort notification timing distribution (hourly open buckets 0-23 UTC).
   */
  app.get(
    "/v1/admin/insights/timing",
    {
      schema: {
        summary: "Cohort notification timing statistics",
        querystring: z.object({
          cohort_key: z.string().optional(),
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const { cohort_key } = req.query as { cohort_key?: string };

      const stats = await prisma.notificationTimingStat.findMany({
        where: cohort_key ? { cohort_key } : undefined,
        orderBy: [{ cohort_key: "asc" }, { hour_of_day_utc: "asc" }],
      });

      return reply.send({
        ok: true,
        count: stats.length,
        stats,
      });
    }
  );

  /**
   * P10H.07: GET /v1/admin/insights/suggestions
   * Drop planning advisory suggestions list.
   */
  app.get(
    "/v1/admin/insights/suggestions",
    {
      schema: {
        summary: "Drop planning advisory suggestions with fatigue linting",
        querystring: z.object({
          target_date: z.string().optional(),
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const { target_date } = req.query as { target_date?: string };
      const where: { target_drop_date?: Date; dismissed?: boolean } = {
        dismissed: false,
      };

      if (target_date) {
        where.target_drop_date = new Date(target_date);
      }

      const suggestions = await prisma.editorSuggestion.findMany({
        where,
        include: { tag: true },
        orderBy: [{ severity: "desc" }, { created_at: "desc" }],
      });

      return reply.send({
        ok: true,
        count: suggestions.length,
        suggestions,
      });
    }
  );

  /**
   * P10H.07: POST /v1/admin/insights/suggestions/generate
   * Generates next-Drop editorial suggestions and fatigue warnings.
   */
  app.post(
    "/v1/admin/insights/suggestions/generate",
    {
      schema: {
        summary: "Generate Drop planning advisory suggestions for a target drop date",
        body: z.object({
          target_date: z.string(), // YYYY-MM-DD
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const body = req.body as { target_date: string };
      const targetDropDate = new Date(body.target_date);
      const suggestions = await service.generateDropAdvisorySuggestions(targetDropDate);

      return reply.status(201).send({
        ok: true,
        count: suggestions.length,
        suggestions,
      });
    }
  );

  /**
   * P10H.07: POST /v1/admin/insights/suggestions/:id/dismiss
   * Dismisses an editorial suggestion.
   */
  app.post(
    "/v1/admin/insights/suggestions/:id/dismiss",
    {
      schema: {
        summary: "Dismiss an editorial suggestion",
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin) {
        return reply.status(401).send({ error: "UNAUTHORIZED", message: "Admin credentials required" });
      }

      const { id } = req.params as { id: string };

      const suggestion = await prisma.editorSuggestion.update({
        where: { id },
        data: { dismissed: true },
      });

      return reply.send({
        ok: true,
        suggestion,
      });
    }
  );
};
