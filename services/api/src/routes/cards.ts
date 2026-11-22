import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  renderCardWithPool,
  renderAntiTwinCardPng,
  renderOrbitCardPng,
  renderAchievementCardPng,
  computeCardContentHash,
  computeCardStorageKey,
  getCardStorage,
  type ShareFormat,
  type ShareTheme,
  type Tier,
} from "@oddly/shared";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  prisma,
  SubmissionsRepository,
  DropsRepository,
  MatchesRepository,
  SharesRepository,
} from "../db/index.js";

const CardQuerySchema = z.object({
  format: z.enum(["story", "square", "link"]).default("story"),
  theme: z.enum(["dark", "light", "mythic"]).default("dark"),
});

// Single-flight in-flight map deduplicating concurrent on-demand renders (P6.12, Architecture Sec 5.2)
const inFlightRenders = new Map<string, Promise<string>>();

export const cardsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/results/:dropId/card
   * Retrieves or on-demand renders a share card for the requesting player's submission.
   */
  app.get<{
    Params: { dropId: string };
    Querystring: { format?: ShareFormat; theme?: ShareTheme };
  }>(
    "/v1/results/:dropId/card",
    {
      schema: {
        tags: ["Cards"],
        summary: "Get or generate share card PNG for a drop submission",
        params: z.object({
          dropId: z.string(),
        }),
        querystring: CardQuerySchema,
        response: {
          200: z.object({
            success: z.boolean(),
            format: z.string(),
            theme: z.string(),
            cardUrl: z.string(),
            storageKey: z.string(),
            shortId: z.string(),
          }),
          401: z.object({
            error: z.string(),
            message: z.string(),
          }),
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
          503: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const playerId = req.cookies.oddly_session;
      const { dropId } = req.params;
      const format = (req.query.format as ShareFormat) || "story";
      const theme = (req.query.theme as ShareTheme) || "dark";

      // 1. Fetch submission if player has active session, or use provisional guest context
      let submission = playerId
        ? await SubmissionsRepository.findByPlayerAndDrop(playerId, dropId).catch(() => null)
        : null;
      const drop = await DropsRepository.getDropById(dropId).catch(() => null);
      const match = playerId
        ? await MatchesRepository.getMatchForPlayer(dropId, playerId).catch(() => null)
        : null;
      const oddness = submission
        ? await prisma.oddnessScore.findUnique({
            where: {
              submission_id_drop_date: {
                submission_id: submission.id,
                drop_date: submission.drop_date,
              },
            },
          }).catch(() => null)
        : null;

      const submissionId = submission?.id || `guest-${dropId.slice(-8)}`;
      let shortId = "xK9mP2";
      if (submission) {
        try {
          const link = await SharesRepository.createShortLink(submission.id);
          shortId = link.short_id;
        } catch {
          // fallback shortId
        }
      }

      const score = match ? Math.round(match.similarity_score * 5) : 4;
      const tier = ((oddness?.tier as Tier) || "Rare") as Tier;
      const percentile = oddness?.percentile ?? 84;

      const twinPlayer = match
        ? match.player_a_id === playerId
          ? match.player_b
          : match.player_a
        : null;

      let twinCity = "Berlin, Germany";
      if (twinPlayer?.region === "IN") twinCity = "Mumbai, India";
      else if (twinPlayer?.region === "US") twinCity = "New York, USA";
      else if (twinPlayer?.region === "GB") twinCity = "London, UK";
      else if (twinPlayer?.region === "DE") twinCity = "Berlin, Germany";

      // 3. Compute storage key
      const contentHash = computeCardContentHash({
        submissionId,
        format,
        theme,
        score,
        tier,
        percentile,
      });

      const storageKey = computeCardStorageKey(
        submissionId,
        format,
        theme,
        contentHash
      );

      const storage = getCardStorage();
      const exists = await storage.hasCard(storageKey);

      let publicUrl: string;
      if (exists) {
        publicUrl = storage.getPublicUrl(storageKey);
      } else {
        // Load shedding defense (P6.12, Architecture Sec 12):
        // If system is under L3/L4 load shedding and card is not yet rendered, shed on-demand CPU load
        const degradationLevel = await DegradationManager.getLevel();
        if (degradationLevel >= 3) {
          reply.header("Retry-After", "30");
          return reply.status(503).send({
            error: "SERVICE_DEGRADED",
            message: "On-demand card rendering deferred during peak load shedding",
          });
        }

        // Single-flight promise coalescing (P6.12, Architecture Sec 5.2):
        // If a render for this exact storageKey is already in progress, await it rather than duplicating work
        if (inFlightRenders.has(storageKey)) {
          publicUrl = await inFlightRenders.get(storageKey)!;
        } else {
          const dateStr = drop?.drop_date
            ? new Date(drop.drop_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Nov 8, 2026";

          const renderPromise = (async () => {
            try {
              // Offload Satori + Resvg rendering to Piscina worker thread pool (P6.11, Architecture Sec 9)
              const pngBuffer = await renderCardWithPool({
                score,
                total: 5,
                tier,
                percentile,
                twinCity,
                streak: 1,
                dateStr,
                shortId,
                format,
                theme,
              });

              const url = await storage.putCard(storageKey, pngBuffer);
              if (submission) {
                await SharesRepository.saveShareCard(
                  submission.id,
                  format,
                  storageKey,
                  submission.drop_date
                ).catch(() => {});
              }
              return url;
            } finally {
              inFlightRenders.delete(storageKey);
            }
          })();

          inFlightRenders.set(storageKey, renderPromise);
          publicUrl = await renderPromise;
        }
      }

      // Set CDN immutable caching
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");

      return reply.send({
        success: true,
        format,
        theme,
        cardUrl: publicUrl,
        storageKey,
        shortId,
      });
    }
  );

  /**
   * GET /v1/cards/*
   * Raw image streaming endpoint serving PNG buffers from storage.
   */
  app.get<{ Params: { "*": string } }>(
    "/v1/cards/*",
    async (req, reply) => {
      const wildcard = req.params["*"];
      const storageKey = `cards/${wildcard}`;

      const storage = getCardStorage();
      const buffer = await storage.getCard(storageKey);

      if (!buffer) {
        return reply.status(404).send("Card not found");
      }

      reply.header("Content-Type", "image/png");
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return reply.send(buffer);
    }
  );

  /**
   * GET /v1/results/:dropId/anti-twin/card
   * On-demand renders Anti-Twin PNG (P10D.05)
   */
  app.get(
    "/v1/results/:dropId/anti-twin/card",
    {
      schema: {
        tags: ["Cards", "AntiTwin"],
        summary: "Render Anti-Twin share card PNG",
        params: z.object({ dropId: z.string() }),
        querystring: z.object({
          side: z.enum(["front", "back"]).default("front"),
        }),
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
      }

      const { dropId } = req.params as { dropId: string };
      const { side } = req.query as { side?: "front" | "back" };

      const drop = await prisma.drop.findUnique({ where: { id: dropId } });
      if (!drop) {
        return reply.status(404).send({ error: "NotFound", message: "Drop not found" });
      }

      const antiTwin = await prisma.antiTwinResult.findUnique({
        where: {
          drop_date_player_id: {
            drop_date: drop.drop_date,
            player_id: player.id,
          },
        },
      });

      const png = await renderAntiTwinCardPng({
        differedCount: antiTwin?.differed_count ?? 4,
        total: 5,
        oppositeLocation: "Global Opposite",
        oppositeAgeBand: "18+",
        sampleSize: antiTwin?.sample_size ?? 2000,
        shortId: `at-${dropId.slice(0, 6)}`,
        side: side || "front",
      });

      reply.header("Content-Type", "image/png");
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return reply.send(png);
    }
  );

  /**
   * GET /v1/orbits/:id/card
   * On-demand renders Orbit milestone PNG for Day 14 or Day 30 (P10D.06)
   */
  app.get(
    "/v1/orbits/:id/card",
    {
      schema: {
        tags: ["Cards", "Orbit"],
        summary: "Render Orbit milestone share card PNG",
        params: z.object({ id: z.string() }),
        querystring: z.object({
          milestone: z.coerce.number().default(14),
          side: z.enum(["front", "back"]).default("front"),
        }),
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
      }

      const { id } = req.params as { id: string };
      const { milestone, side } = req.query as { milestone: number; side?: "front" | "back" };

      const orbit = await prisma.orbit.findUnique({
        where: { id },
        include: {
          player_a: true,
          player_b: true,
        },
      });

      if (!orbit) {
        return reply.status(404).send({ error: "NotFound", message: "Orbit not found" });
      }

      const partner = orbit.player_a_id === player.id ? orbit.player_b : orbit.player_a;
      const milestoneDay = milestone === 30 ? 30 : 14;

      const png = await renderOrbitCardPng({
        milestoneDay,
        coStreakDays: orbit.co_streak_current || milestoneDay,
        partnerLocation: partner?.region || "Orbit Partner",
        partnerAgeBand: partner?.age_band || "18+",
        shortId: `orb-${id.slice(0, 6)}`,
        side: side || "front",
      });

      reply.header("Content-Type", "image/png");
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return reply.send(png);
    }
  );

  /**
   * GET /v1/cards/achievement/:badgeId
   * On-demand renders Satori 3D flip card visual achievement renderer (P10I.05).
   * Invariant: macro-region only exposed if k >= 20.
   */
  app.get<{
    Params: { badgeId: string };
    Querystring: { side?: "front" | "back" };
  }>(
    "/v1/cards/achievement/:badgeId",
    {
      schema: {
        tags: ["Cards", "Recognition"],
        summary: "Render Satori achievement badge card PNG",
        params: z.object({ badgeId: z.string() }),
        querystring: z.object({
          side: z.enum(["front", "back"]).default("front"),
        }),
      },
    },
    async (req, reply) => {
      const { badgeId } = req.params;
      const { side } = req.query;

      const badgeAward = await prisma.creatorBadge.findUnique({
        where: { id: badgeId },
        include: {
          badge: true,
          player: true,
          meme: {
            include: { stats: true },
          },
        },
      });

      if (!badgeAward) {
        return reply.status(404).send({ error: "NotFound", message: "Achievement badge award not found." });
      }

      // Check macro-region k >= 20 privacy rule
      // Regional player counts
      const playerRegion = badgeAward.player.region || "IN";
      const regionCount = await prisma.player.count({
        where: { region: playerRegion },
      });
      const safeRegion = regionCount >= 20 ? playerRegion : undefined;

      const badgeTitle =
        ((badgeAward.badge.name_i18n as Record<string, string>)?.en) ||
        badgeAward.badge.key;
      const badgeDesc =
        ((badgeAward.badge.description_i18n as Record<string, string>)?.en) ||
        "";

      let statLabel: string | undefined;
      let statValue: string | undefined;

      if (badgeAward.meme?.stats) {
        statLabel = "Community Ratings";
        statValue = `${badgeAward.meme.stats.raters} Raters (${Math.round(
          (badgeAward.meme.stats.funny_count / Math.max(1, badgeAward.meme.stats.raters)) * 100
        )}% Funny)`;
      }

      const png = await renderAchievementCardPng({
        badgeTitle,
        badgeDescription: badgeDesc,
        badgeIconKey: badgeAward.badge.icon_key,
        creatorAlias: `Twin #${badgeAward.player.id.slice(0, 4)}`,
        macroRegion: safeRegion,
        awardedDateStr: badgeAward.awarded_at.toISOString().split("T")[0]!,
        shortId: `ach-${badgeAward.id.slice(0, 6)}`,
        side: side || "front",
        statLabel,
        statValue,
      });

      reply.header("Content-Type", "image/png");
      reply.header("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      return reply.send(png);
    }
  );
};
