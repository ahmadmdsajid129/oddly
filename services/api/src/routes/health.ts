/**
 * @file health.ts
 * @package @oddly/api
 *
 * System health and readiness endpoint.
 */

import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ODDLY_VERSION } from "@oddly/shared";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/health",
    {
      schema: {
        description: "Service health check",
        tags: ["System"],
        response: {
          200: z.object({
            ok: z.boolean(),
            service: z.string(),
            version: z.string(),
            time: z.string(),
          }),
        },
      },
    },
    async () => {
      return {
        ok: true,
        service: "oddly-api",
        version: ODDLY_VERSION,
        time: new Date().toISOString(),
      };
    }
  );
};
