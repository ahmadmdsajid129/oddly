/**
 * @file orbits.ts
 * @package @oddly/api
 *
 * Orbit API Endpoints (Stage F1 / Phase 10A / Tasks P10A.05, P10A.08).
 * - GET /v1/orbits: List active Orbits for the player
 * - GET /v1/orbits/:id: Detail of a specific Orbit and today's expressions
 * - POST /v1/orbits/:id/express: Send a daily tactile expression (The Wave)
 * - POST /v1/orbits/:id/end: Instant unprovoked dissolution
 * - POST /v1/admin/orbits/:id/sever: Admin severance tool with audit reason
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { OrbitsRepository, APPROVED_EXPRESSIONS } from "../db/orbits.repo.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import { sendOrbitNotification } from "../notifications/orbit-push.js";
import { prisma } from "../db/client.js";

export const orbitsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/orbits
   * List all active Orbits for the authenticated player.
   */
  app.get(
    "/v1/orbits",
    {
      schema: {
        tags: ["Orbit"],
        summary: "List active Orbits for the player",
        response: {
          200: z.object({
            ok: z.literal(true),
            orbits: z.array(
              z.object({
                orbit_id: z.string(),
                status: z.enum(["active", "ended"]),
                started_on: z.string(),
                co_streak_current: z.number(),
                co_streak_best: z.number(),
                last_co_date: z.string().nullable(),
                partner: z.object({
                  region: z.string(),
                  age_band: z.string(),
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
          message: "Authentication required to view Orbits.",
        });
      }

      const orbits = await OrbitsRepository.listActiveOrbitsForPlayer(player.id);
      return reply.send({
        ok: true,
        orbits,
      });
    }
  );

  /**
   * GET /v1/orbits/:id
   * Get single Orbit detail and today's expressions.
   */
  app.get<{
    Params: { id: string };
  }>(
    "/v1/orbits/:id",
    {
      schema: {
        tags: ["Orbit"],
        summary: "Get Orbit detail and expression status",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            orbit: z.object({
              id: z.string(),
              status: z.enum(["active", "ended"]),
              started_on: z.string(),
              co_streak_current: z.number(),
              co_streak_best: z.number(),
              partner: z.object({
                region: z.string(),
                age_band: z.string(),
              }),
              today_expressions: z.array(
                z.object({
                  id: z.string(),
                  is_from_me: z.boolean(),
                  expression_key: z.string(),
                  created_at: z.string(),
                })
              ),
              can_express_today: z.boolean(),
            }),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          403: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
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
          message: "Authentication required to view Orbit.",
        });
      }

      const { id } = req.params;
      const orbit = await OrbitsRepository.getOrbitForPlayer(id, player.id);
      if (!orbit) {
        return reply.status(404).send({
          ok: false,
          error: "ORBIT_NOT_FOUND",
          message: "Orbit not found or access denied.",
        });
      }

      const partner = orbit.player_a_id === player.id ? orbit.player_b : orbit.player_a;
      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);

      const expressions = await OrbitsRepository.getTodayExpressions(orbit.id, todayDate);
      const mySentToday = expressions.some((e) => e.from_player_id === player.id);

      return reply.send({
        ok: true,
        orbit: {
          id: orbit.id,
          status: orbit.status as "active" | "ended",
          started_on: orbit.started_on.toISOString().split("T")[0]!,
          co_streak_current: orbit.co_streak_current,
          co_streak_best: orbit.co_streak_best,
          partner: {
            region: partner?.region || "Unknown",
            age_band: partner?.age_band || "18-24",
          },
          today_expressions: expressions.map((e) => ({
            id: e.id,
            is_from_me: e.from_player_id === player.id,
            expression_key: e.expression_key,
            created_at: e.created_at.toISOString(),
          })),
          can_express_today: !mySentToday && orbit.status === "active",
        },
      });
    }
  );

  /**
   * POST /v1/orbits/:id/express
   * Send a daily tactile expression (The Wave) in this Orbit.
   */
  app.post<{
    Params: { id: string };
    Body: { expression_key: string };
  }>(
    "/v1/orbits/:id/express",
    {
      schema: {
        tags: ["Orbit"],
        summary: "Send a daily expression (The Wave)",
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          expression_key: z.enum(APPROVED_EXPRESSIONS),
        }),
        response: {
          201: z.object({
            ok: z.literal(true),
            expression_key: z.string(),
            created_at: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      // Degradation check
      if (await DegradationManager.checkLowPriorityShedding(req, reply)) {
        return reply;
      }

      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to send expressions.",
        });
      }

      const { id } = req.params;
      const { expression_key } = req.body;

      const orbit = await OrbitsRepository.getOrbitForPlayer(id, player.id);
      if (!orbit) {
        return reply.status(404).send({
          ok: false,
          error: "ORBIT_NOT_FOUND",
          message: "Orbit not found or access denied.",
        });
      }

      if (orbit.status !== "active") {
        return reply.status(400).send({
          ok: false,
          error: "ORBIT_ENDED",
          message: "Cannot send expressions in an ended Orbit.",
        });
      }

      const todayDate = new Date();
      todayDate.setUTCHours(0, 0, 0, 0);

      try {
        const expression = await OrbitsRepository.addExpression(
          orbit.id,
          player.id,
          todayDate,
          expression_key
        );

        const partnerId = orbit.player_a_id === player.id ? orbit.player_b_id : orbit.player_a_id;
        void sendOrbitNotification({
          playerId: partnerId,
          type: "expression_received",
          orbitId: orbit.id,
        });

        return reply.status(201).send({
          ok: true,
          expression_key: expression.expression_key,
          created_at: expression.created_at.toISOString(),
          message: "Expression sent.",
        });
      } catch (err: unknown) {
        // Unique constraint violation: already expressed today
        const msg = String(err);
        if (msg.includes("Unique constraint") || msg.includes("duplicate key")) {
          return reply.status(409).send({
            ok: false,
            error: "ALREADY_EXPRESSED_TODAY",
            message: "You have already sent an expression in this Orbit today.",
          });
        }
        throw err;
      }
    }
  );

  /**
   * POST /v1/orbits/:id/end
   * Instant unprovoked dissolution.
   * Safety invariant: zero blame attribution, neutral message.
   */
  app.post<{
    Params: { id: string };
  }>(
    "/v1/orbits/:id/end",
    {
      schema: {
        tags: ["Orbit"],
        summary: "End an Orbit instantly (unprovoked dissolution)",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            status: z.literal("ended"),
            message: z.string(),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
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
          message: "Authentication required to end Orbit.",
        });
      }

      const { id } = req.params;
      const orbit = await OrbitsRepository.getOrbitForPlayer(id, player.id);
      if (!orbit) {
        return reply.status(404).send({
          ok: false,
          error: "ORBIT_NOT_FOUND",
          message: "Orbit not found or access denied.",
        });
      }

      await OrbitsRepository.endOrbit(orbit.id, player.id);

      return reply.send({
        ok: true,
        status: "ended",
        message: "This orbit has ended.",
      });
    }
  );

  /**
   * POST /v1/admin/orbits/:id/sever
   * Administrative severance tool with mandatory audit reason (Task P10A.08 / Spec Sec 7).
   */
  app.post<{
    Params: { id: string };
    Body: { reason: string };
  }>(
    "/v1/admin/orbits/:id/sever",
    {
      schema: {
        tags: ["Admin", "Orbit"],
        summary: "Administrative severance of an Orbit",
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          reason: z.string().min(5, "Must provide a clear administrative reason"),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            status: z.literal("ended"),
            audit_id: z.string(),
            message: z.string(),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      // Check admin authorization
      const authHeader = req.headers.authorization;
      const metricsToken = process.env.METRICS_BEARER_TOKEN;
      const isAuthorized =
        (metricsToken && authHeader === `Bearer ${metricsToken}`) ||
        (process.env.NODE_ENV !== "production" && req.headers["x-admin-key"] === "admin_secret");

      if (!isAuthorized) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Admin authorization required.",
        });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const orbit = await prisma.orbit.findUnique({ where: { id } });
      if (!orbit) {
        return reply.status(404).send({
          ok: false,
          error: "ORBIT_NOT_FOUND",
          message: "Specified orbit does not exist.",
        });
      }

      await OrbitsRepository.endOrbit(orbit.id, "admin");

      req.log.warn(
        { orbitId: id, adminReason: reason },
        "[Admin Audit] Orbit severed administratively"
      );

      return reply.send({
        ok: true,
        status: "ended",
        audit_id: `audit_sever_${Date.now()}`,
        message: "Orbit successfully severed by administrator.",
      });
    }
  );
};
