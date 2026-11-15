/**
 * @file antitwin.ts
 * @package @oddly/api
 *
 * Anti-Twin ("Your Opposite Today") API Endpoints (Stage F4 / Phase 10D / Tasks P10D.02, P10D.03 / ADR-040).
 * - GET /v1/results/:dropId/anti-twin: Bounded candidate sample scan for lowest similarity partner
 *
 * Invariants:
 * 1. Decoupled asynchronous on-demand computation (bounded sample <= 2,000).
 * 2. Low-pool graceful hide: Pool < 200 players returns honest notice and hides opposite card.
 * 3. Zero-pick privacy invariant: NEVER exposes or returns opposite player's pick choices or vectors.
 * 4. Degradation protection: Hidden at L2+.
 * 5. Redis caching: 24h TTL on computed anti-twin results.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { AntiTwinRepository } from "../db/antitwin.repo.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import { redis } from "../lib/redis.js";

const AntiTwinQuestionDetailSchema = z.object({
  question_id: z.string(),
  position: z.number(),
  prompt: z.string(),
  your_answer: z.string(),
});

const AntiTwinResultSchema = z.object({
  ok: z.boolean(),
  drop_id: z.string(),
  drop_date: z.string().optional(),
  pool_insufficient: z.boolean().optional(),
  pool_count: z.number().optional(),
  min_pool_size: z.number().optional(),
  notice: z.string().optional(),
  differed_count: z.number().optional(),
  sample_size: z.number().optional(),
  opposite: z
    .object({
      region: z.string(),
      age_band: z.string(),
    })
    .optional(),
  own_differed_questions: z.array(AntiTwinQuestionDetailSchema).optional(),
  note: z.string().optional(),
  degraded: z.boolean().optional(),
});

export const antiTwinRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    "/v1/results/:dropId/anti-twin",
    {
      schema: {
        description: "Fetch Anti-Twin opposite match for a drop (ADR-040)",
        tags: ["AntiTwin", "Results"],
        params: z.object({
          dropId: z.string(),
        }),
        querystring: z.object({
          sample_size: z.coerce.number().optional().default(2000),
          min_pool: z.coerce.number().optional().default(200),
        }),
        response: {
          200: AntiTwinResultSchema,
          401: z.object({ ok: z.literal(false), error: z.string() }),
          404: z.object({ ok: z.literal(false), error: z.string() }),
          503: z.object({ ok: z.literal(false), error: z.string(), degraded: z.literal(true) }),
        },
      },
    },
    async (request, reply) => {
      // 1. Degradation check: Anti-Twin is hidden/paused at L2+
      const level = await DegradationManager.getLevel();
      if (level >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "Anti-Twin computation temporarily paused during high load.",
          degraded: true,
        });
      }

      // 2. Resolve player identity
      const player = await resolveAuthenticatedPlayer(request);
      if (!player) {
        return reply.status(401).send({ ok: false, error: "Authentication required" });
      }

      const { dropId } = request.params as { dropId: string };
      const { sample_size, min_pool } = (request.query || {}) as { sample_size?: number; min_pool?: number };

      // 3. Check Redis cache first (TTL 24h = 86400s)
      const cacheKey = `cache:antitwin:${dropId}:${player.id}`;
      try {
        if (redis.status === "ready") {
          const cached = await redis.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            return reply.send(parsed);
          }
        }
      } catch (cacheErr) {
        request.log.warn({ err: cacheErr }, "[AntiTwin] Redis cache read failed");
      }

      // 4. Compute or retrieve Anti-Twin
      try {
        const result = await AntiTwinRepository.getOrComputeAntiTwin(
          dropId,
          player.id,
          sample_size,
          min_pool
        );

        // 5. Cache successful result in Redis if pool was sufficient and result computed
        if (result.ok && !result.pool_insufficient && result.opposite) {
          try {
            if (redis.status === "ready") {
              await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);
            }
          } catch (cacheWriteErr) {
            request.log.warn({ err: cacheWriteErr }, "[AntiTwin] Redis cache write failed");
          }
        }

        return reply.send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal error";
        if (message.includes("not found")) {
          return reply.status(404).send({ ok: false, error: message });
        }
        request.log.error({ err }, "[AntiTwin] Computation failed");
        return reply.status(500).send({ ok: false, error: message });
      }
    }
  );
};
