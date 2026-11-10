/**
 * @file health.ts
 * @package @oddly/api
 *
 * System health and readiness endpoint.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ODDLY_VERSION } from "@oddly/shared";
import { prisma } from "../db/client.js";
import { redis } from "../lib/redis.js";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  // Liveness Probe (GET /health)
  app.get(
    "/health",
    {
      schema: {
        description: "Service liveness check",
        tags: ["System"],
        response: {
          200: z.object({
            ok: z.boolean(),
            service: z.string(),
            version: z.string(),
            time: z.string(),
          }),
        },
      },
    },
    async () => {
      return {
        ok: true,
        service: "oddly-api",
        version: ODDLY_VERSION,
        time: new Date().toISOString(),
      };
    }
  );

  // Readiness Probe (GET /ready) — R1.3
  app.get(
    "/ready",
    {
      schema: {
        description: "Service readiness probe checking PostgreSQL and Redis connectivity",
        tags: ["System"],
        response: {
          200: z.object({
            ok: z.literal(true),
            status: z.literal("ready"),
            database: z.string(),
            redis: z.string(),
          }),
          503: z.object({
            ok: z.literal(false),
            status: z.string(),
            database: z.string(),
            redis: z.string(),
            error: z.string().optional(),
          }),
        },
      },
    },
    async (_req, reply) => {
      // 1. Check if server is currently draining connections for shutdown
      const checkShutdown = (app as unknown as { isShuttingDown?: () => boolean }).isShuttingDown;
      if (checkShutdown && checkShutdown()) {
        reply.status(503).send({
          ok: false,
          status: "shutting_down",
          database: "draining",
          redis: "draining",
          error: "Server is draining in-flight requests for shutdown",
        });
        return;
      }

      // 2. Check Database connectivity with 2-second timeout
      let dbStatus = "unknown";
      try {
        const dbPromise = prisma.$queryRawUnsafe("SELECT 1");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database ping timeout")), 2000)
        );
        await Promise.race([dbPromise, timeoutPromise]);
        dbStatus = "connected";
      } catch (err) {
        dbStatus = `disconnected (${(err as Error).message})`;
      }

      // 3. Check Redis connectivity with 1-second timeout
      let redisStatus = "unknown";
      try {
        const redisPromise = redis.ping();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis ping timeout")), 1000)
        );
        await Promise.race([redisPromise, timeoutPromise]);
        redisStatus = "connected";
      } catch (err) {
        redisStatus = `disconnected (${(err as Error).message})`;
      }

      const isReady = dbStatus === "connected" && redisStatus === "connected";

      if (!isReady) {
        reply.status(503).send({
          ok: false,
          status: "unhealthy",
          database: dbStatus,
          redis: redisStatus,
        });
        return;
      }

      return {
        ok: true,
        status: "ready",
        database: dbStatus,
        redis: redisStatus,
      };
    }
  );
};

