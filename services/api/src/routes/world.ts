/**
 * @file world.ts
 * @package @oddly/api
 *
 * Aggregate global drop statistics endpoint (GET /v1/world/:dropId) (P3.08, P8.11).
 * Provides the global community recap data after drops close.
 * Routed to read replica with transparent primary failover and degradation caching.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { executeReplicaQueryWithFallback, isReplicaConfigured } from "../db/client.js";
import { handleConditionalRequest } from "../cache/etag.js";
import { DegradationManager } from "../resilience/degradation.js";

export const worldRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get<{ Params: { dropId: string } }>(
    "/v1/world/:dropId",
    {
      schema: {
        description: "Fetch aggregate global statistics for a drop",
        tags: ["World"],
        params: z.object({
          dropId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            drop_id: z.string(),
            total_players: z.number(),
            tier_distribution: z.record(z.number()),
            rarest_pick: z
              .object({
                question_id: z.string(),
                value: z.string(),
                count: z.number(),
                percentage: z.number(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (req, reply) => {
      const dropId = req.params.dropId;
      const level = await DegradationManager.getLevel();

      // Under L2+ crunch, extend cache headers to 10 minutes to minimize DB load (Architecture Sec 8.1 & Sec 12)
      reply.header(
        "Cache-Control",
        level >= 2
          ? "public, max-age=600, s-maxage=600, stale-while-revalidate=1200"
          : "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      );
      reply.header("x-oddly-routed-to", isReplicaConfigured() ? "replica" : "primary");

      // Route heavy analytical aggregation queries to read replica with automatic primary failover (P8.11)
      const data = await executeReplicaQueryWithFallback(async (db) => {
        const totalPlayers = await db.submission.count({
          where: { drop_id: dropId },
        });

        const oddnessScores = await db.oddnessScore.findMany({
          where: { submission: { drop_id: dropId } },
          select: { tier: true },
        });

        interface RawStat {
          question_id: string;
          value: string;
          count: number;
        }

        const frequencies = await db.answerStat.findMany({
          where: { drop_id: dropId },
          orderBy: { count: "asc" },
          take: 1,
        }).catch(async () => {
          return (await db.$queryRawUnsafe<RawStat[]>(
            "SELECT question_id, value, count FROM answer_stats WHERE drop_id = $1 ORDER BY count ASC LIMIT 1",
            dropId
          )) || [];
        });

        return {
          totalPlayers,
          oddnessScores,
          frequencies,
        };
      }).catch(() => ({
        totalPlayers: 0,
        oddnessScores: [],
        frequencies: [],
      }));

      const tierDistribution: Record<string, number> = {
        Common: 0,
        Uncommon: 0,
        Rare: 0,
        Mythic: 0,
      };

      for (const s of data.oddnessScores) {
        tierDistribution[s.tier] = (tierDistribution[s.tier] ?? 0) + 1;
      }

      const rarest = data.frequencies[0];
      const rarestPick = rarest
        ? {
            question_id: rarest.question_id,
            value: rarest.value,
            count: rarest.count,
            percentage:
              data.totalPlayers > 0
                ? Number(((rarest.count / data.totalPlayers) * 100).toFixed(1))
                : 0,
          }
        : null;

      const payload = {
        drop_id: dropId,
        total_players: data.totalPlayers,
        tier_distribution: tierDistribution,
        rarest_pick: rarestPick,
      };

      if (handleConditionalRequest(req, reply, payload)) {
        return;
      }

      return payload;
    }
  );
};
