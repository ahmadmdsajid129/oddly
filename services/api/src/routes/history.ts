/**
 * @file history.ts
 * @package @oddly/api
 *
 * Historical drop gameplay archive endpoint (P8.03).
 * Returns past sealed twins, scores, oddness percentiles, and streak summary.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { HistoryRepository } from "../db/history.repo.js";
import { StreaksRepository } from "../db/streaks.repo.js";
import { PlayersRepository } from "../db/players.repo.js";
import { getAuthAccount } from "../auth/tokens.js";

export const historyRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/history
   * Retrieve player's historical game drops, scores, and streak stats.
   */
  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>(
    "/v1/history",
    {
      schema: {
        tags: ["History"],
        summary: "Fetch player's past drop history and sealed twins",
        querystring: z.object({
          limit: z.string().optional(),
          offset: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            items: z.array(
              z.object({
                submissionId: z.string(),
                dropId: z.string(),
                dropDate: z.string(),
                completedAt: z.string(),
                sharerScore: z.number(),
                sharerTier: z.string(),
                sharerPercentile: z.number(),
                twinCity: z.string(),
                shareCardUrl: z.string().nullable(),
                answersCount: z.number(),
              })
            ),
            total: z.number(),
            streak: z.object({
              current: z.number(),
              longest: z.number(),
              total_played: z.number(),
              next_milestone: z.number(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Resolve player ID from auth or guest cookies
      let playerId = req.cookies.oddly_session;

      if (!playerId) {
        const auth = await getAuthAccount(req);
        if (auth?.accountId) {
          const linkedPlayer = await PlayersRepository.findByAccountId(auth.accountId);
          if (linkedPlayer) playerId = linkedPlayer.id;
        }
      }

      if (!playerId && req.cookies.oddly_did) {
        const guest = await PlayersRepository.findByDid(req.cookies.oddly_did);
        if (guest) playerId = guest.id;
      }

      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const offset = Number(req.query.offset) || 0;

      if (!playerId) {
        return reply.send({
          ok: true,
          items: [],
          total: 0,
          streak: {
            current: 0,
            longest: 0,
            total_played: 0,
            next_milestone: 7,
          },
        });
      }

      // 2. Fetch history and streak stats
      const { items, total } = await HistoryRepository.getPlayerHistory(playerId, {
        limit,
        offset,
      });

      const streakSummary = await StreaksRepository.getStreakSummary(playerId);

      return reply.send({
        ok: true,
        items,
        total,
        streak: {
          current: streakSummary.currentStreak,
          longest: streakSummary.longestStreak,
          total_played: total,
          next_milestone: streakSummary.nextMilestone,
        },
      });
    }
  );
};
