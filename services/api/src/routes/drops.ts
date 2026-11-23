/**
 * @file drops.ts
 * @package @oddly/api
 *
 * Daily Drop retrieval and time sync endpoints (R2.3 & Addendum Section 5.1).
 *
 * Routes:
 * - GET /v1/drop/today (Cache-Control: s-maxage=5, stale-while-revalidate=30, stale-if-error=3600, ETag + 304)
 * - GET /v1/drops/:id.json (Cache-Control: public, max-age=31536000, immutable)
 * - GET /v1/stats/today (Cache-Control: s-maxage=10, stale-while-revalidate=30)
 * - GET /v1/time (Cache-Control: no-store, precise clock sync)
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  getTwinDay,
  isDayOpen,
  secondsUntilNextDrop,
  RedisKeys,
  getSafeRedisClient,
} from "@oddly/shared";
import { DropsRepository } from "../db/drops.repo.js";
import { prisma } from "../db/client.js";
import { handleConditionalRequest } from "../cache/etag.js";
import { StampedeProtectedCache } from "../cache/stampede.js";

export const dropsRoutes: FastifyPluginAsyncZod = async (app) => {
  // GET /v1/drop/today & GET /v1/drops/today (Lanes supported via ?lane=slug)
  const getTodayDropHandler = async (
    req: any,
    reply: any
  ) => {
    const todayIst = getTwinDay(new Date());
    const laneSlug = req.query?.lane || "everyday";

    const cacheKey =
      laneSlug === "everyday"
        ? RedisKeys.cache.dropToday()
        : `lane:${laneSlug}:drop:${todayIst}`;

    const { data: drop, isStale } = await StampedeProtectedCache.readThroughWithMutex(
      cacheKey,
      async () => {
        const dbDrop = await DropsRepository.getTodayDrop(todayIst, laneSlug);
        if (!dbDrop) {
          // If non-everyday lane, check if lane exists and is resting (Rule L9)
          if (laneSlug !== "everyday") {
            const lane = await prisma.lane.findFirst({
              where: { OR: [{ slug: laneSlug }, { id: laneSlug }] },
            });
            if (lane) {
              return {
                is_resting: true,
                status: "resting",
                lane: {
                  id: lane.id,
                  slug: lane.slug,
                  name_key: lane.name_key,
                  accent_token: lane.accent_token,
                },
                message: "This lane is resting today.",
              };
            }
          }
          return null;
        }

        return {
          id: dbDrop.id,
          drop_date: todayIst,
          lane_id: dbDrop.lane_id,
          opens_at: dbDrop.opens_at.toISOString(),
          closes_at: dbDrop.closes_at.toISOString(),
          is_open: isDayOpen(todayIst),
          seconds_until_open: secondsUntilNextDrop(),
          questions: dbDrop.questions.map((q) => ({
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
      },
      { ttlSeconds: 5, staleTtlSeconds: 3600 }
    );

    if (!drop) {
      return reply.status(404).send({
        ok: false,
        error: "DROP_NOT_FOUND",
        message: `No active drop scheduled for ${todayIst} in lane '${laneSlug}'.`,
      });
    }

    // Edge caching policy: Addendum Section 5.1 / Table 18.9
    reply.header(
      "Cache-Control",
      "public, max-age=5, s-maxage=5, stale-while-revalidate=30, stale-if-error=3600"
    );

    if (isStale) {
      reply.header("Warning", '110 - "Response is Stale"');
    }

    // Conditional request handling (ETag + 304 Not Modified)
    if (handleConditionalRequest(req as any, reply, drop)) {
      return;
    }

    return reply.send(drop);
  };

  app.get(
    "/v1/drop/today",
    {
      schema: {
        description: "Fetch today's active drop with polymorphic questions and edge caching",
        tags: ["Drops"],
        querystring: z.object({
          lane: z.string().optional(),
        }),
      },
    },
    getTodayDropHandler
  );

  app.get(
    "/v1/drops/today",
    {
      schema: {
        description: "Fetch today's active drop (alias with ?lane support)",
        tags: ["Drops"],
        querystring: z.object({
          lane: z.string().optional(),
        }),
      },
    },
    getTodayDropHandler
  );

  // GET /v1/drops/:id.json (Immutable Drop Archive)
  app.get<{ Params: { id: string } }>(
    "/v1/drops/:id.json",
    {
      schema: {
        description: "Fetch immutable daily drop archive JSON by drop ID",
        tags: ["Drops"],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (req, reply) => {
      const dropId = req.params.id;

      const { data: drop } = await StampedeProtectedCache.readThroughWithMutex(
        `cache:drop:archive:${dropId}`,
        async () => {
          const dbDrop = await DropsRepository.getDropById(dropId);
          if (!dbDrop) return null;
          return {
            id: dbDrop.id,
            drop_date: dbDrop.drop_date.toISOString().split("T")[0],
            opens_at: dbDrop.opens_at.toISOString(),
            closes_at: dbDrop.closes_at.toISOString(),
            status: dbDrop.status,
            questions: dbDrop.questions.map((q) => ({
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
        },
        { ttlSeconds: 86400, staleTtlSeconds: 604800 }
      );

      if (!drop) {
        return reply.status(404).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: `Drop ${dropId} not found.`,
        });
      }

      reply.header("Cache-Control", "public, max-age=31536000, immutable");

      if (handleConditionalRequest(req, reply, drop)) {
        return;
      }

      return reply.send(drop);
    }
  );

  // GET /v1/stats/today (Live Submissions Counter)
  app.get(
    "/v1/stats/today",
    {
      schema: {
        description: "Fetch live participation count and stats for today's drop",
        tags: ["Drops"],
      },
    },
    async (req, reply) => {
      const todayIst = getTwinDay(new Date());
      reply.header("Cache-Control", "public, max-age=5, s-maxage=10, stale-while-revalidate=30");

      let total = 0;
      try {
        const countersRedis = getSafeRedisClient("counters");
        const totalKey = RedisKeys.counter.totalSubmissions(`drop_${todayIst}`);
        const countStr = await countersRedis.get(totalKey);
        total = countStr ? parseInt(countStr, 10) : 0;
      } catch {
        // Fallback gracefully to 0
      }

      const responsePayload = {
        ok: true,
        drop_date: todayIst,
        total_participants: total,
        timestamp: new Date().toISOString(),
      };

      if (handleConditionalRequest(req, reply, responsePayload)) {
        return;
      }

      return reply.send(responsePayload);
    }
  );

  // GET /v1/time (Precise Server Time Synchronization)
  app.get(
    "/v1/time",
    {
      schema: {
        description: "Millisecond-precise server clock synchronization for client countdowns",
        tags: ["System"],
      },
    },
    async (_req, reply) => {
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
      const now = new Date();
      return reply.send({
        server_time_utc: now.toISOString(),
        server_time_ms: now.getTime(),
        ist_date: getTwinDay(now),
        seconds_until_next_drop: secondsUntilNextDrop(),
      });
    }
  );

  // GET /v1/drop/:date (Historical Drop Retrieval)
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
        return reply.status(404).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: `No drop found for date ${req.params.date}.`,
        });
      }

      reply.header("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");

      const payload = {
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

      if (handleConditionalRequest(req, reply, payload)) {
        return;
      }

      return reply.send(payload);
    }
  );
};
