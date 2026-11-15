/**
 * @file world.ts
 * @package @oddly/api
 *
 * Aggregate global drop statistics endpoint (GET /v1/world/:dropId) (P3.08).
 * Provides the global community recap data after drops close.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { handleConditionalRequest } from "../cache/etag.js";

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

      reply.header(
        "Cache-Control",
        "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      );

      const totalPlayers = await prisma.submission.count({
        where: { drop_id: dropId },
      });

      // Tiers count
      const oddnessScores = await prisma.oddnessScore.findMany({
        where: { submission: { drop_id: dropId } },
        select: { tier: true },
      });

      const tierDistribution: Record<string, number> = {
        Common: 0,
        Uncommon: 0,
        Rare: 0,
        Mythic: 0,
      };

      for (const s of oddnessScores) {
        tierDistribution[s.tier] = (tierDistribution[s.tier] ?? 0) + 1;
      }

      // Find rarest pick
      const frequencies = await prisma.answerStat.findMany({
        where: { drop_id: dropId },
        orderBy: { count: "asc" },
        take: 1,
      }).catch(async () => {
        interface RawStat {
          question_id: string;
          value: string;
          count: number;
        }
        return (await prisma.$queryRawUnsafe<RawStat[]>(
          "SELECT question_id, value, count FROM answer_stats WHERE drop_id = $1 ORDER BY count ASC LIMIT 1",
          dropId
        )) || [];
      });

      const rarest = frequencies[0];
      const rarestPick = rarest
        ? {
            question_id: rarest.question_id,
            value: rarest.value,
            count: rarest.count,
            percentage:
              totalPlayers > 0
                ? Number(((rarest.count / totalPlayers) * 100).toFixed(1))
                : 0,
          }
        : null;

      const payload = {
        drop_id: dropId,
        total_players: totalPlayers,
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

