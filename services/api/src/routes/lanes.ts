/**
 * @file lanes.ts
 * @package @oddly/api
 *
 * Subject Lanes REST Endpoints (Stage L1 / Phase 10L):
 * - GET /v1/lanes: Catalogue of all lanes with live counters & ETag (P10L.04)
 * - GET /v1/lanes/:id: Single lane status, today's drop, and Gate L-A resting evaluation (P10L.04, P10L.09)
 * - POST /v1/lanes/:id/interest: "Tell me when it opens" opt-in with consent & rate limiting (P10L.05)
 * - GET /v1/me/lane-prefs: Player per-lane notification preferences (P10L.08)
 * - PUT /v1/me/lane-prefs: Update player per-lane notification preferences (P10L.08)
 * - GET /v1/lanes/:id/gate-status: Gate L-A runtime evaluation & runway inspection (P10L.09)
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { redis } from "../lib/redis.js";
import { handleConditionalRequest } from "../cache/etag.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { getTwinDay } from "@oddly/shared";

const LaneSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name_key: z.string(),
  description_key: z.string(),
  accent_token: z.string(),
  icon_key: z.string(),
  status: z.enum(["planned", "preview", "open", "resting", "retired"]),
  sort_order: z.number().int(),
  age_rating: z.string(),
  formats_allowed: z.array(z.string()),
  text_enabled: z.boolean(),
  super_twin_enabled: z.boolean(),
  subscribers_count: z.number().int().optional(),
  players_today: z.number().int().optional(),
  opened_at: z.string().nullable().optional(),
});

export const lanesRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/lanes
   * Public lane catalogue with ETag and 60-second caching (P10L.04).
   */
  app.get(
    "/v1/lanes",
    {
      schema: {
        tags: ["Lanes"],
        summary: "List all subject lanes with live status and subscriber metrics",
        response: {
          200: z.object({
            lanes: z.array(LaneSchema),
          }),
        },
      },
    },
    async (req, reply) => {
      reply.header("Cache-Control", "public, max-age=60");

      const lanes = await prisma.lane.findMany({
        orderBy: { sort_order: "asc" },
      });

      const today = getTwinDay(new Date());

      const enrichedLanes = await Promise.all(
        lanes.map(async (lane) => {
          let playersToday = 0;
          let subscribersCount = 0;

          if (lane.status === "open" || lane.status === "preview") {
            const liveCount = await redis.get(`lane:${lane.slug}:players_today`);
            playersToday = liveCount ? parseInt(liveCount, 10) : 0;
          }

          if (lane.status === "planned" || lane.status === "preview") {
            subscribersCount = await prisma.laneInterest.count({
              where: { lane_id: lane.id },
            });
          }

          return {
            id: lane.id,
            slug: lane.slug,
            name_key: lane.name_key,
            description_key: lane.description_key,
            accent_token: lane.accent_token,
            icon_key: lane.icon_key,
            status: lane.status as "planned" | "preview" | "open" | "resting" | "retired",
            sort_order: lane.sort_order,
            age_rating: lane.age_rating,
            formats_allowed: (Array.isArray(lane.formats_allowed)
              ? lane.formats_allowed
              : ["pick1"]) as string[],
            text_enabled: lane.text_enabled,
            super_twin_enabled: lane.super_twin_enabled,
            players_today: playersToday,
            subscribers_count: subscribersCount,
            opened_at: lane.opened_at ? lane.opened_at.toISOString() : null,
          };
        })
      );

      const responsePayload = { lanes: enrichedLanes };

      if (handleConditionalRequest(req, reply, responsePayload)) {
        return;
      }

      return reply.status(200).send(responsePayload);
    }
  );

  /**
   * GET /v1/lanes/:id
   * Single lane details with today's drop and Gate L-A resting evaluation (P10L.04, P10L.09).
   */
  app.get(
    "/v1/lanes/:id",
    {
      schema: {
        tags: ["Lanes"],
        summary: "Get lane details, drop status, and Gate L-A resting state",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            lane: LaneSchema.extend({
              is_resting: z.boolean(),
              resting_message_key: z.string().nullable().optional(),
              current_drop: z
                .object({
                  id: z.string(),
                  drop_date: z.string(),
                  status: z.string(),
                  opens_at: z.string(),
                  closes_at: z.string(),
                  question_count: z.number(),
                })
                .nullable()
                .optional(),
            }),
          }),
          404: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const todayStr = getTwinDay(new Date());
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      // 1. Resolve lane by UUID or by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const lane = await prisma.lane.findFirst({
        where: isUuid ? { id } : { slug: id },
      });

      if (!lane) {
        return reply.status(404).send({
          error: {
            code: "LANE_NOT_FOUND",
            message: `Lane '${id}' does not exist.`,
          },
        });
      }

      reply.header("Cache-Control", "public, max-age=60");

      // 2. Gate L-A & Rule L9: Resting evaluation
      let isResting = false;
      let restingMessageKey: string | null = null;
      let currentDropPayload = null;

      if (lane.status === "open" || lane.status === "preview") {
        const drop = await prisma.drop.findFirst({
          where: {
            drop_date: todayDate,
            lane_id: lane.id,
          },
          include: {
            questions: true,
          },
        });

        // Rule L9: If lane is open but has no valid 5-question drop today, it rests safely
        if (!drop || drop.questions.length !== 5) {
          isResting = true;
          restingMessageKey = "lane.resting.message"; // "Resting today. Come back tomorrow or play Everyday!"
        } else {
          currentDropPayload = {
            id: drop.id,
            drop_date: todayStr,
            status: drop.status,
            opens_at: drop.opens_at.toISOString(),
            closes_at: drop.closes_at.toISOString(),
            question_count: drop.questions.length,
          };
        }
      }

      const subscribersCount =
        lane.status === "planned" || lane.status === "preview"
          ? await prisma.laneInterest.count({ where: { lane_id: lane.id } })
          : 0;

      const livePlayers =
        lane.status === "open" || lane.status === "preview"
          ? parseInt((await redis.get(`lane:${lane.slug}:players_today`)) || "0", 10)
          : 0;

      const responsePayload = {
        lane: {
          id: lane.id,
          slug: lane.slug,
          name_key: lane.name_key,
          description_key: lane.description_key,
          accent_token: lane.accent_token,
          icon_key: lane.icon_key,
          status: (isResting
            ? "resting"
            : lane.status) as "planned" | "preview" | "open" | "resting" | "retired",
          sort_order: lane.sort_order,
          age_rating: lane.age_rating,
          formats_allowed: (Array.isArray(lane.formats_allowed)
            ? lane.formats_allowed
            : ["pick1"]) as string[],
          text_enabled: lane.text_enabled,
          super_twin_enabled: lane.super_twin_enabled,
          subscribers_count: subscribersCount,
          players_today: livePlayers,
          opened_at: lane.opened_at ? lane.opened_at.toISOString() : null,
          is_resting: isResting,
          resting_message_key: restingMessageKey,
          current_drop: currentDropPayload,
        },
      };

      if (handleConditionalRequest(req, reply, responsePayload)) {
        return;
      }

      return reply.status(200).send(responsePayload);
    }
  );

  /**
   * POST /v1/lanes/:id/interest
   * "Tell me when it opens" opt-in with DPDP consent and rate limiting (P10L.05).
   */
  app.post(
    "/v1/lanes/:id/interest",
    {
      schema: {
        tags: ["Lanes"],
        summary: "Register subscriber interest for a planned or preview lane",
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          guest_id: z.string().max(100).optional(),
          consent_notifications: z.boolean(),
        }),
        response: {
          201: z.object({
            ok: z.boolean(),
            lane_id: z.string(),
            registered: z.boolean(),
            total_interest: z.number().int(),
          }),
          400: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          404: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { guest_id, consent_notifications } = req.body;

      if (!consent_notifications) {
        return reply.status(400).send({
          error: {
            code: "CONSENT_REQUIRED",
            message: "Explicit notification consent is required to subscribe to lane opening alerts.",
          },
        });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const lane = await prisma.lane.findFirst({
        where: isUuid ? { id } : { slug: id },
      });

      if (!lane) {
        return reply.status(404).send({
          error: {
            code: "LANE_NOT_FOUND",
            message: `Lane '${id}' not found.`,
          },
        });
      }

      const player = await resolveAuthenticatedPlayer(req);
      const playerId = player?.id || null;
      const effectiveGuestId = playerId ? null : (guest_id || `g_${Date.now()}`);

      // Upsert interest idempotently
      if (playerId) {
        await prisma.laneInterest.upsert({
          where: {
            lane_id_player_id: {
              lane_id: lane.id,
              player_id: playerId,
            },
          },
          create: {
            lane_id: lane.id,
            player_id: playerId,
          },
          update: {},
        });
      } else if (effectiveGuestId) {
        const existing = await prisma.laneInterest.findFirst({
          where: {
            lane_id: lane.id,
            guest_id: effectiveGuestId,
          },
        });
        if (!existing) {
          await prisma.laneInterest.create({
            data: {
              lane_id: lane.id,
              guest_id: effectiveGuestId,
            },
          });
        }
      }

      const totalInterest = await prisma.laneInterest.count({
        where: { lane_id: lane.id },
      });

      return reply.status(201).send({
        ok: true,
        lane_id: lane.id,
        registered: true,
        total_interest: totalInterest,
      });
    }
  );

  /**
   * GET /v1/me/lane-prefs
   * Get authenticated player's per-lane notification preferences (P10L.08).
   */
  app.get(
    "/v1/me/lane-prefs",
    {
      schema: {
        tags: ["Lanes", "Player"],
        summary: "Get player per-lane push notification opt-in preferences",
        response: {
          200: z.object({
            preferences: z.array(
              z.object({
                lane_id: z.string(),
                lane_slug: z.string(),
                notify: z.boolean(),
                last_played_at: z.string().nullable(),
                plays_count: z.number().int(),
              })
            ),
          }),
          401: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to read lane preferences.",
          },
        });
      }

      const [allLanes, playerPrefs] = await Promise.all([
        prisma.lane.findMany({ orderBy: { sort_order: "asc" } }),
        prisma.playerLanePref.findMany({ where: { player_id: player.id } }),
      ]);

      const prefMap = new Map(playerPrefs.map((p) => [p.lane_id, p]));

      const preferences = allLanes.map((lane) => {
        const pref = prefMap.get(lane.id);
        return {
          lane_id: lane.id,
          lane_slug: lane.slug,
          // Rule L8: Default ON for Everyday, default OFF for other lanes
          notify: pref ? pref.notify : lane.slug === "everyday",
          last_played_at: pref?.last_played_at ? pref.last_played_at.toISOString() : null,
          plays_count: pref ? pref.plays_count : 0,
        };
      });

      return reply.status(200).send({ preferences });
    }
  );

  /**
   * PUT /v1/me/lane-prefs
   * Update authenticated player's per-lane notification preference (P10L.08).
   */
  app.put(
    "/v1/me/lane-prefs",
    {
      schema: {
        tags: ["Lanes", "Player"],
        summary: "Update per-lane push notification preference",
        body: z.object({
          lane_id: z.string(),
          notify: z.boolean(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            lane_id: z.string(),
            notify: z.boolean(),
          }),
          401: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to update lane preferences.",
          },
        });
      }

      const { lane_id, notify } = req.body;

      await prisma.playerLanePref.upsert({
        where: {
          player_id_lane_id: {
            player_id: player.id,
            lane_id,
          },
        },
        create: {
          player_id: player.id,
          lane_id,
          notify,
        },
        update: {
          notify,
        },
      });

      return reply.status(200).send({
        ok: true,
        lane_id,
        notify,
      });
    }
  );

  /**
   * GET /v1/lanes/:id/gate-status
   * Gate L-A runtime evaluation & runway inspection (P10L.09).
   */
  app.get(
    "/v1/lanes/:id/gate-status",
    {
      schema: {
        tags: ["Lanes", "Admin"],
        summary: "Check Gate L-A runtime evaluation status and drop runway count",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            lane_id: z.string(),
            slug: z.string(),
            status: z.string(),
            approved_future_drops: z.number().int(),
            min_required_runway: z.number().int(),
            has_sufficient_runway: z.boolean(),
            missing_drop_within_24h: z.boolean(),
            gate_l_a_passed: z.boolean(),
          }),
          404: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const lane = await prisma.lane.findFirst({
        where: isUuid ? { id } : { slug: id },
      });

      if (!lane) {
        return reply.status(404).send({
          error: {
            code: "LANE_NOT_FOUND",
            message: `Lane '${id}' not found.`,
          },
        });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // 1. Count future approved drops for this lane
      const futureDrops = await prisma.drop.findMany({
        where: {
          lane_id: lane.id,
          drop_date: { gte: today },
        },
        include: { questions: true },
      });

      // Filter to fully approved drops (having 5 questions)
      const validDrops = futureDrops.filter((d) => d.questions.length === 5);
      const approvedCount = validDrops.length;

      // Sourced from app_config (architecture.md 18.2.4)
      const minRunwayConfig = await prisma.appConfig.findUnique({
        where: { key: "lane.min_approved_drops_to_open" },
      });
      const minRunway = minRunwayConfig ? (minRunwayConfig.value as number) : 8;

      // 2. Check if drop for next 24 hours exists
      const tomorrow = new Date(today.getTime() + 86400000);
      const hasDropNext24h = validDrops.some(
        (d) => d.drop_date.getTime() === today.getTime() || d.drop_date.getTime() === tomorrow.getTime()
      );

      const hasSufficientRunway = approvedCount >= minRunway;
      const gatePassed = hasSufficientRunway && hasDropNext24h;

      return reply.status(200).send({
        lane_id: lane.id,
        slug: lane.slug,
        status: lane.status,
        approved_future_drops: approvedCount,
        min_required_runway: minRunway,
        has_sufficient_runway: hasSufficientRunway,
        missing_drop_within_24h: !hasDropNext24h,
        gate_l_a_passed: gatePassed,
      });
    }
  );
};
