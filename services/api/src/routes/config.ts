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
import { handleConditionalRequest } from "../cache/etag.js";

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
            degradation_level: z.number().default(0),
            banner_copy_key: z.string().nullable().default(null),
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
    async (req, reply) => {
      const [configs, tiers] = await Promise.all([
        prisma.appConfig.findMany().catch(() => []),
        prisma.tierDefinition.findMany({
          orderBy: { min_percentile: "asc" },
        }).catch(() => []),
      ]);

      const features: Record<string, unknown> = {};
      const timing: Record<string, unknown> = {};
      let degradationLevel = 0;
      let bannerCopyKey: string | null = null;

      for (const cfg of configs) {
        if (cfg.key.startsWith("features.")) {
          features[cfg.key.replace("features.", "")] = cfg.value;
        } else if (cfg.key.startsWith("timing.")) {
          timing[cfg.key.replace("timing.", "")] = cfg.value;
        } else if (cfg.key === "degradation_level") {
          degradationLevel = Number(cfg.value) || 0;
        } else if (cfg.key === "banner_copy_key") {
          bannerCopyKey = String(cfg.value);
        }
      }

      reply.header(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      );

      const payload = {
        features,
        timing,
        degradation_level: degradationLevel,
        banner_copy_key: bannerCopyKey,
        tiers: tiers.map((t) => ({
          tier: t.tier,
          min_percentile: t.min_percentile,
          max_percentile: t.max_percentile,
          label: t.label,
          description: t.description,
          badge_color: t.badge_color,
        })),
      };

      if (handleConditionalRequest(req, reply, payload)) {
        return;
      }

      return payload;
    }
  );
};

