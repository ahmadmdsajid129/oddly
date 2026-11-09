/**
 * @file push.ts
 * @package @oddly/api
 *
 * Web Push Subscription and Delivery Telemetry Routes (P10.02, P10.09).
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { NotificationsRepository } from "../db/notifications.repo.js";
import { getAuthAccount } from "../auth/tokens.js";

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/me/push-subscription
   * Save or update Web Push subscription for authenticated account or guest device (P10.02).
   */
  app.post<{
    Body: z.infer<typeof PushSubscriptionSchema>;
  }>(
    "/v1/me/push-subscription",
    {
      schema: {
        tags: ["Push Notifications"],
        summary: "Register or update a Web Push subscription",
        body: PushSubscriptionSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const auth = await getAuthAccount(req);
      const playerId =
        auth?.accountId ||
        req.cookies.oddly_session ||
        req.cookies.oddly_did ||
        "guest_player";

      await NotificationsRepository.saveSubscription({
        playerId,
        endpoint: req.body.endpoint,
        keys: req.body.keys,
      });

      return reply.send({
        ok: true,
        message: "Push subscription registered successfully.",
      });
    }
  );

  /**
   * POST /v1/push/subscribe (alias)
   */
  app.post<{
    Body: z.infer<typeof PushSubscriptionSchema>;
  }>(
    "/v1/push/subscribe",
    {
      schema: {
        tags: ["Push Notifications"],
        summary: "Register Web Push subscription (alias)",
        body: PushSubscriptionSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const auth = await getAuthAccount(req);
      const playerId =
        auth?.accountId ||
        req.cookies.oddly_session ||
        req.cookies.oddly_did ||
        "guest_player";

      await NotificationsRepository.saveSubscription({
        playerId,
        endpoint: req.body.endpoint,
        keys: req.body.keys,
      });

      return reply.send({
        ok: true,
        message: "Push subscription registered successfully.",
      });
    }
  );

  /**
   * POST /v1/push/track
   * Track push notification interaction (opened or dismissed) (P10.09).
   */
  app.post<{
    Body: {
      channel: string;
      event: "opened" | "dismissed";
      notificationId?: string;
    };
  }>(
    "/v1/push/track",
    {
      schema: {
        tags: ["Push Notifications"],
        summary: "Track push notification open or dismiss telemetry",
        body: z.object({
          channel: z.string(),
          event: z.enum(["opened", "dismissed"]),
          notificationId: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            tracked: z.boolean(),
          }),
        },
      },
    },
    async (req, reply) => {
      const auth = await getAuthAccount(req);
      const playerId =
        auth?.accountId || req.cookies.oddly_session || req.cookies.oddly_did;

      if (req.body.event === "opened") {
        await NotificationsRepository.trackOpen({
          channel: req.body.channel,
          playerId,
          notificationId: req.body.notificationId,
        });
      }

      return reply.send({
        ok: true,
        tracked: true,
      });
    }
  );

  /**
   * GET /v1/push/stats
   * Aggregated delivery and open rates across push channels (P10.09).
   */
  app.get<{
    Querystring: { channel?: string };
  }>(
    "/v1/push/stats",
    {
      schema: {
        tags: ["Push Notifications"],
        summary: "Retrieve push delivery and open rate statistics",
        querystring: z.object({
          channel: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            stats: z.array(
              z.object({
                channel: z.string(),
                totalSent: z.number(),
                totalFailed: z.number(),
                totalSkipped: z.number(),
                totalOpened: z.number(),
                openRatePercent: z.number(),
              })
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const stats = await NotificationsRepository.getStats(req.query.channel);
      return reply.send({
        ok: true,
        stats,
      });
    }
  );
};
