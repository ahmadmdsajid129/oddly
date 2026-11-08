/**
 * @file pages.ts
 * @package @oddly/api
 *
 * CMS static pages endpoint (GET /v1/pages/:slug).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";

export const pagesRoutes: FastifyPluginAsyncZod = async (app) => {

  app.get<{ Params: { slug: string } }>(
    "/v1/pages/:slug",
    {
      schema: {
        description: "Fetch CMS markdown page by slug (e.g. privacy, about, faq)",
        tags: ["Pages"],
        params: z.object({
          slug: z.string().min(1).max(100),
        }),
        response: {
          200: z.object({
            slug: z.string(),
            title: z.string(),
            body_md: z.string(),
            updated_at: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const page = await prisma.page.findUnique({
        where: { slug: req.params.slug },
      });

      if (!page) {
        reply.status(404).send({
          ok: false,
          error: "PAGE_NOT_FOUND",
          message: `Page '/${req.params.slug}' does not exist.`,
        });
        return;
      }

      reply.header(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );

      return {
        slug: page.slug,
        title: page.title,
        body_md: page.body_md,
        updated_at: page.updated_at.toISOString(),
      };
    }
  );
};
