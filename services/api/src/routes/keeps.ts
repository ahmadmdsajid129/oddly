/**
 * @file keeps.ts
 * @package @oddly/api
 *
 * Keep API Endpoints (Stage F1 / Phase 10A / Tasks P10A.04, P10A.05).
 * - POST /v1/keeps: Send a Keep to today's locked twin
 * - GET /v1/keeps/incoming: List incoming pending keeps with sanitized traits
 * - POST /v1/keeps/:id/respond: Accept or decline an incoming keep
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { KeepsRepository } from "../db/keeps.repo.js";
import { OrbitsRepository } from "../db/orbits.repo.js";
import { MatchesRepository } from "../db/matches.repo.js";
import { prisma } from "../db/client.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { getOrbitConfig } from "../config/orbit.config.js";
import { DegradationManager } from "../resilience/degradation.js";
import { sendOrbitNotification } from "../notifications/orbit-push.js";

export const keepsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/keeps
   * Send a Keep request to today's final locked twin.
   */
  app.post<{
    Body: {
      drop_id: string;
    };
  }>(
    "/v1/keeps",
    {
      schema: {
        tags: ["Orbit"],
        summary: "Send a Keep request to today's locked twin",
        body: z.object({
          drop_id: z.string().uuid(),
        }),
        response: {
          201: z.object({
            ok: z.literal(true),
            keep_id: z.string(),
            status: z.string(),
            message: z.string(),
          }),
          400: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
            details: z.unknown().optional(),
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
          409: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          429: z.object({
            ok: z.boolean(),
            error: z.string(),
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

      // Feature flag check
      const config = await getOrbitConfig();
      if (!config.enabled) {
        return reply.status(403).send({
          ok: false,
          error: "FEATURE_DISABLED",
          message: "Orbit feature is currently disabled.",
        });
      }

      // Google authentication guard
      const player = await resolveAuthenticatedPlayer(req);
      if (!player || !player.isGoogleAuthenticated) {
        return reply.status(401).send({
          ok: false,
          error: "ACCOUNT_REQUIRED",
          message: "Google sign-in is required to keep a twin.",
        });
      }

      const { drop_id } = req.body;

      // Find drop
      const drop = await prisma.drop.findUnique({
        where: { id: drop_id },
      });
      if (!drop) {
        return reply.status(404).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: "Specified drop does not exist.",
        });
      }

      // Find match for player
      const match = await MatchesRepository.getMatchForPlayer(drop_id, player.id);
      if (!match) {
        return reply.status(404).send({
          ok: false,
          error: "MATCH_NOT_FOUND",
          message: "No twin match found for you in this drop.",
        });
      }

      // Invariant: Final batch lock check (cannot keep provisional twin)
      if (match.is_provisional) {
        return reply.status(400).send({
          ok: false,
          error: "DROP_NOT_LOCKED",
          message: "Twin cannot be kept until the final batch locks at 07:05 IST.",
        });
      }

      const targetPlayerId = match.player_a_id === player.id ? match.player_b_id : match.player_a_id;

      // Invariant: Cannot keep yourself
      if (targetPlayerId === player.id) {
        return reply.status(400).send({
          ok: false,
          error: "INVALID_TARGET",
          message: "Cannot keep yourself.",
        });
      }

      // Invariant: Single Keep per drop
      const alreadySent = await KeepsRepository.hasSentKeepForDrop(match.drop_date, player.id);
      if (alreadySent) {
        return reply.status(409).send({
          ok: false,
          error: "KEEP_ALREADY_SENT",
          message: "You have already kept a twin for this drop.",
        });
      }

      // Invariant: Active Orbits Cap (max 3)
      const activeOrbits = await OrbitsRepository.countActiveOrbits(player.id);
      if (activeOrbits >= config.maxActivePerPlayer) {
        return reply.status(400).send({
          ok: false,
          error: "ORBIT_CAP_REACHED",
          message: `Maximum active orbits (${config.maxActivePerPlayer}) reached. End an orbit before starting a new one.`,
        });
      }

      // Invariant: 30-day cooldown between same pair
      const inCooldown = await KeepsRepository.hasRecentCooldown(
        player.id,
        targetPlayerId,
        config.cooldownDays
      );
      if (inCooldown) {
        return reply.status(400).send({
          ok: false,
          error: "COOLDOWN_ACTIVE",
          message: "A cooldown period is active with this twin.",
        });
      }

      // Invariant: Target incoming daily cap (max 3 pending per day)
      const incomingCount = await KeepsRepository.countIncomingPendingToday(
        targetPlayerId,
        match.drop_date
      );
      if (incomingCount >= config.maxIncomingPerDay) {
        return reply.status(429).send({
          ok: false,
          error: "TARGET_BUSY",
          message: "This twin has received their maximum connection requests for today.",
        });
      }

      // Check if target already sent a keep to this player for today (instant mutual match!)
      const reverseKeep = await prisma.twinKeep.findFirst({
        where: {
          drop_date: match.drop_date,
          from_player_id: targetPlayerId,
          to_player_id: player.id,
          status: "pending",
        },
      });

      if (reverseKeep) {
        // Mutual Keep! Accept reverse keep and form Orbit immediately
        await KeepsRepository.respondToKeep(reverseKeep.id, reverseKeep.drop_date, player.id, "accept");
        await OrbitsRepository.createOrbit(player.id, targetPlayerId);

        return reply.status(201).send({
          ok: true,
          keep_id: reverseKeep.id,
          status: "accepted",
          message: "Mutual keep! Your Orbit is now active.",
        });
      }

      // Create new pending Keep
      const keep = await KeepsRepository.createKeep({
        dropDate: match.drop_date,
        fromPlayerId: player.id,
        toPlayerId: targetPlayerId,
        similaritySnapshot: match.similarity_score,
      });

      // Dispatch non-blocking push notification (P10A.07)
      void sendOrbitNotification({ playerId: targetPlayerId, type: "keep_received" });

      return reply.status(201).send({
        ok: true,
        keep_id: keep.id,
        status: "pending",
        message: "Keep request sent. Waiting for twin to respond within 48 hours.",
      });
    }
  );

  /**
   * GET /v1/keeps/incoming
   * List incoming pending keeps for the authenticated player.
   */
  app.get(
    "/v1/keeps/incoming",
    {
      schema: {
        tags: ["Orbit"],
        summary: "List incoming pending connection requests",
        response: {
          200: z.object({
            ok: z.literal(true),
            incoming: z.array(
              z.object({
                id: z.string(),
                drop_date: z.string(),
                similarity_snapshot: z.number(),
                region: z.string(),
                age_band: z.string(),
                created_at: z.string(),
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
      if (!player || !player.isGoogleAuthenticated) {
        return reply.status(401).send({
          ok: false,
          error: "ACCOUNT_REQUIRED",
          message: "Google sign-in is required to view connection requests.",
        });
      }

      const incoming = await KeepsRepository.getIncomingPendingKeeps(player.id);
      return reply.send({
        ok: true,
        incoming,
      });
    }
  );

  /**
   * POST /v1/keeps/:id/respond
   * Accept or decline an incoming Keep request.
   */
  app.post<{
    Params: { id: string };
    Body: {
      decision: "accept" | "decline";
      drop_date?: string;
    };
  }>(
    "/v1/keeps/:id/respond",
    {
      schema: {
        tags: ["Orbit"],
        summary: "Respond to an incoming Keep request",
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          decision: z.enum(["accept", "decline"]),
          drop_date: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            decision: z.enum(["accept", "decline"]),
            orbit_id: z.string().optional(),
            message: z.string(),
          }),
          400: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
            details: z.unknown().optional(),
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
      if (!player || !player.isGoogleAuthenticated) {
        return reply.status(401).send({
          ok: false,
          error: "ACCOUNT_REQUIRED",
          message: "Google sign-in is required to respond to a connection request.",
        });
      }

      const { id } = req.params;
      const { decision, drop_date } = req.body;
      const dropDate = drop_date ? new Date(drop_date) : undefined;

      const keep = await KeepsRepository.getKeepById(id, dropDate);
      if (!keep) {
        return reply.status(404).send({
          ok: false,
          error: "KEEP_NOT_FOUND",
          message: "Specified connection request does not exist.",
        });
      }

      // Invariant: Must be the recipient
      if (keep.to_player_id !== player.id) {
        return reply.status(403).send({
          ok: false,
          error: "NOT_AUTHORIZED",
          message: "You are not authorized to respond to this request.",
        });
      }

      // Invariant: Must still be pending
      if (keep.status !== "pending") {
        return reply.status(400).send({
          ok: false,
          error: "ALREADY_DECIDED",
          message: `This request has already been ${keep.status}.`,
        });
      }

      const config = await getOrbitConfig();

      if (decision === "accept") {
        // Check active orbits cap for both players
        const myActive = await OrbitsRepository.countActiveOrbits(player.id);
        if (myActive >= config.maxActivePerPlayer) {
          return reply.status(400).send({
            ok: false,
            error: "ORBIT_CAP_REACHED",
            message: `You have reached your maximum active orbits (${config.maxActivePerPlayer}).`,
          });
        }

        const senderActive = await OrbitsRepository.countActiveOrbits(keep.from_player_id);
        if (senderActive >= config.maxActivePerPlayer) {
          return reply.status(400).send({
            ok: false,
            error: "SENDER_CAP_REACHED",
            message: "The sender has reached their maximum active orbits.",
          });
        }

        await KeepsRepository.respondToKeep(keep.id, keep.drop_date, player.id, "accept");
        const orbit = await OrbitsRepository.createOrbit(keep.from_player_id, player.id);

        // Dispatch push notification to sender (P10A.07)
        void sendOrbitNotification({
          playerId: keep.from_player_id,
          type: "orbit_established",
          orbitId: orbit.id,
        });

        return reply.send({
          ok: true,
          decision: "accept",
          orbit_id: orbit.id,
          message: "Orbit connected! You can now send expressions and play Telepathy together.",
        });
      } else {
        // Silent decline: sender sees nothing, request transitions silently
        await KeepsRepository.respondToKeep(keep.id, keep.drop_date, player.id, "decline");
        return reply.send({
          ok: true,
          decision: "decline",
          message: "Request declined.",
        });
      }
    }
  );
};
