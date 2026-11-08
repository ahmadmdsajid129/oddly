/**
 * @file config.ts
 * @package @oddly/api
 *
 * Public application configuration endpoint (GET /v1/config/public).
 * All runtime flags & limits are sourced from the app_config table (D-005).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";

export const configRoutes: FastifyPluginAsyncZod = async (app) => {

  app.get(
    "/v1/config/public",
    {
      schema: {
        description: "Fetch public runtime configurations and feature flags",
        tags: ["Config"],
        response: {
          200: z.object({
            features: z.record(z.unknown()),
            timing: z.record(z.unknown()),
            tiers: z.array(
              z.object({
                tier: z.string(),
                min_percentile: z.number(),
                max_percentile: z.number(),
                label: z.string(),
                description: z.string(),
                badge_color: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (_req, reply) => {
      const [configs, tiers] = await Promise.all([
        prisma.appConfig.findMany(),
        prisma.tierDefinition.findMany({
          orderBy: { min_percentile: "asc" },
        }),
      ]);

      const features: Record<string, unknown> = {};
      const timing: Record<string, unknown> = {};

      for (const cfg of configs) {
        if (cfg.key.startsWith("features.")) {
          features[cfg.key.replace("features.", "")] = cfg.value;
        } else if (cfg.key.startsWith("timing.")) {
          timing[cfg.key.replace("timing.", "")] = cfg.value;
        }
      }

      reply.header(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );

      return {
        features,
        timing,
        tiers: tiers.map((t) => ({
          tier: t.tier,
          min_percentile: t.min_percentile,
          max_percentile: t.max_percentile,
          label: t.label,
          description: t.description,
          badge_color: t.badge_color,
        })),
      };
    }
  );
};

