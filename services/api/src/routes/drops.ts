/**
 * @file drops.ts
 * @package @oddly/api
 *
 * Daily Drop retrieval endpoints (GET /v1/drop/today, GET /v1/drop/:date).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  getTwinDay,
  isDayOpen,
  secondsUntilNextDrop,
} from "@oddly/shared";
import { DropsRepository } from "../db/drops.repo.js";

export const dropsRoutes: FastifyPluginAsyncZod = async (app) => {

  // GET /v1/drop/today
  app.get(
    "/v1/drop/today",
    {
      schema: {
        description: "Fetch today's active drop and its 5 polymorphic questions",
        tags: ["Drops"],
        response: {
          200: z.object({
            id: z.string(),
            drop_date: z.string(),
            opens_at: z.string(),
            closes_at: z.string(),
            is_open: z.boolean(),
            seconds_until_open: z.number(),
            questions: z.array(
              z.object({
                id: z.string(),
                position: z.number(),
                type: z.string(),
                payload: z.any(),
                answer_options: z.array(
                  z.object({
                    id: z.string(),
                    label: z.string(),
                    value: z.string(),
                    display_order: z.number(),
                    illustration_key: z.string().nullable().optional(),
                  })
                ),
              })
            ),
          }),
        },
      },
    },
    async (_req, reply) => {
      const todayIst = getTwinDay(new Date());
      const drop = await DropsRepository.getTodayDrop(todayIst);

      if (!drop) {
        reply.status(404).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: `No active drop scheduled for ${todayIst}.`,
        });
        return;
      }

      // Edge caching header
      reply.header(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );

      const isOpen = isDayOpen(todayIst);
      const countdown = secondsUntilNextDrop();

      return {
        id: drop.id,
        drop_date: todayIst,
        opens_at: drop.opens_at.toISOString(),
        closes_at: drop.closes_at.toISOString(),
        is_open: isOpen,
        seconds_until_open: countdown,
        questions: drop.questions.map((q) => ({
          id: q.id,
          position: q.position,
          type: q.type,
          payload: q.payload,
          answer_options: q.answerOptions.map((opt) => ({
            id: opt.id,
            label: opt.label,
            value: opt.value,
            display_order: opt.display_order,
            illustration_key: opt.illustration_key,
          })),
        })),
      };
    }
  );

  // GET /v1/drop/:date
  app.get<{ Params: { date: string } }>(
    "/v1/drop/:date",
    {
      schema: {
        description: "Fetch a specific drop by IST date (YYYY-MM-DD)",
        tags: ["Drops"],
        params: z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        }),
      },
    },
    async (req, reply) => {
      const drop = await DropsRepository.getTodayDrop(req.params.date);

      if (!drop) {
        reply.status(404).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: `No drop found for date ${req.params.date}.`,
        });
        return;
      }

      return {
        id: drop.id,
        drop_date: req.params.date,
        opens_at: drop.opens_at.toISOString(),
        closes_at: drop.closes_at.toISOString(),
        is_open: isDayOpen(req.params.date),
        questions: drop.questions.map((q) => ({
          id: q.id,
          position: q.position,
          type: q.type,
          payload: q.payload,
          answer_options: q.answerOptions.map((opt) => ({
            id: opt.id,
            label: opt.label,
            value: opt.value,
            display_order: opt.display_order,
            illustration_key: opt.illustration_key,
          })),
        })),
      };
    }
  );
};
