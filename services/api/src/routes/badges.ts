/**
 * @file badges.ts
 * @package @oddly/api
 *
 * Creator Recognition Badges API (Stage M5 & M6 / Phase 10I / P10I.04, P10I.07).
 * - GET /v1/badges/mine: Authenticated player's earned creator recognition badges.
 *
 * Invariants:
 * - Zero public leaderboards, zero competitive ranking walls.
 * - Only private, earned individual milestone badges returned.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";

export const badgesRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/badges/mine
   * Returns list of earned recognition badges for the authenticated player.
   */
  app.get(
    "/v1/badges/mine",
    {
      schema: {
        tags: ["Recognition", "Badges"],
        summary: "Get earned creator recognition badges for player",
        response: {
          200: z.object({
            ok: z.literal(true),
            badges: z.array(
              z.object({
                id: z.string(),
                awarded_at: z.string(),
                meme_id: z.string().nullable(),
                badge: z.object({
                  id: z.string(),
                  key: z.string(),
                  name_i18n: z.record(z.string()),
                  description_i18n: z.record(z.string()),
                  icon_key: z.string(),
                  status: z.string(),
                }),
              })
            ),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to view your earned badges.",
        });
      }

      const creatorBadges = await prisma.creatorBadge.findMany({
        where: {
          player_id: player.id,
        },
        include: {
          badge: true,
        },
        orderBy: { awarded_at: "desc" },
      });

      return reply.send({
        ok: true,
        badges: creatorBadges.map((cb) => ({
          id: cb.id,
          awarded_at: cb.awarded_at.toISOString(),
          meme_id: cb.meme_id,
          badge: {
            id: cb.badge.id,
            key: cb.badge.key,
            name_i18n: cb.badge.name_i18n as Record<string, string>,
            description_i18n: cb.badge.description_i18n as Record<string, string>,
            icon_key: cb.badge.icon_key,
            status: cb.badge.status,
          },
        })),
      });
    }
  );
};

