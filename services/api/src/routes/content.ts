/**
 * @file content.ts
 * @package @oddly/api
 *
 * Dynamic UI copy endpoints (GET /v1/content/:locale).
 * All user-facing text is sourced dynamically from the app_content table (D-005).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {

  app.get<{ Params: { locale: string } }>(
    "/v1/content/:locale",
    {
      schema: {
        description: "Fetch dynamic UI strings dictionary for a locale",
        tags: ["Content"],
        params: z.object({
          locale: z.string().min(2).max(10).default("en"),
        }),
        response: {
          200: z.object({
            locale: z.string(),
            strings: z.record(z.string()),
          }),
        },
      },
    },
    async (req, reply) => {
      const requestedLocale = req.params.locale.toLowerCase();

      // Fetch strings for requested locale
      let items = await prisma.appContent.findMany({
        where: { locale: requestedLocale },
        select: { key: true, value: true },
      });

      // Fallback to English if not found
      let effectiveLocale = requestedLocale;
      if (items.length === 0 && requestedLocale !== "en") {
        items = await prisma.appContent.findMany({
          where: { locale: "en" },
          select: { key: true, value: true },
        });
        effectiveLocale = "en";
      }

      const strings: Record<string, string> = {};
      for (const item of items) {
        strings[item.key] = item.value;
      }

      // Edge caching header: 1 hour edge cache, 24h stale revalidate
      reply.header(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );

      return {
        locale: effectiveLocale,
        strings,
      };
    }
  );

  // Fallback GET /v1/content defaults to en
  app.get<{ Querystring: { locale?: string } }>("/v1/content", async (req, reply) => {
    const locale = req.query?.locale || "en";
    reply.redirect(`/v1/content/${locale}`);
  });
};

