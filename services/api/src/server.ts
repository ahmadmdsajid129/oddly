/**
 * @file server.ts
 * @package @oddly/api
 *
 * Fastify server factory configuring security, correlation IDs,
 * Zod validation, OpenAPI docs, cookies, and rate limits.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { randomUUID } from "node:crypto";
import { redis } from "./lib/redis.js";
import { healthRoutes } from "./routes/health.js";
import { dropsRoutes } from "./routes/drops.js";
import { contentRoutes } from "./routes/content.js";
import { pagesRoutes } from "./routes/pages.js";
import { configRoutes } from "./routes/config.js";
import { identityRoutes } from "./routes/identity.js";
import { submissionsRoutes } from "./routes/submissions.js";
import { resultsRoutes } from "./routes/results.js";
import { worldRoutes } from "./routes/world.js";
import { cardsRoutes } from "./routes/cards.js";
import { sharesRoutes } from "./routes/shares.js";
import { authRoutes } from "./routes/auth.js";
import { historyRoutes } from "./routes/history.js";
import { meRoutes } from "./routes/me.js";
import { reportsRoutes } from "./routes/reports.js";
import { pushRoutes } from "./routes/push.js";

export interface ServerOptions {
  logger?: boolean;
  isShuttingDown?: () => boolean;
  underPressure?: {
    maxEventLoopDelay?: number;
    maxHeapUsedBytes?: number;
    maxRssBytes?: number;
    sampleInterval?: number;
  };
}

export async function buildServer(
  opts: ServerOptions = {}
) {
  const app = Fastify({
    logger: opts.logger ?? {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
    // Fastify HTTP connection and request timeouts (R1.3)
    connectionTimeout: 5000,
    keepAliveTimeout: 5000,
    requestTimeout: 10000,
    genReqId: (req) => {
      return (
        (req.headers["x-request-id"] as string) ||
        (req.headers["x-correlation-id"] as string) ||
        randomUUID()
      );
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  }).withTypeProvider<ZodTypeProvider>();

  // Decorate server with shutdown check function for /ready probe
  app.decorate("isShuttingDown", opts.isShuttingDown || (() => false));

  // 1. Configure Zod validation & serialization
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // 2. Load shedding with @fastify/under-pressure (R1.3)
  const maxDelay =
    opts.underPressure?.maxEventLoopDelay ??
    (Number(process.env.UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY_MS) ||
      (process.env.NODE_ENV === "test" ? 2000 : 250));
  const maxHeap =
    opts.underPressure?.maxHeapUsedBytes ??
    (Number(process.env.UNDER_PRESSURE_MAX_HEAP_BYTES) || 1024 * 1024 * 1024);
  const maxRss =
    opts.underPressure?.maxRssBytes ??
    (Number(process.env.UNDER_PRESSURE_MAX_RSS_BYTES) || 1536 * 1024 * 1024);

  await app.register(underPressure, {
    maxEventLoopDelay: maxDelay,
    maxHeapUsedBytes: maxHeap,
    maxRssBytes: maxRss,
    sampleInterval: opts.underPressure?.sampleInterval ?? 1000,
    pressureHandler: (_req, rep) => {
      rep.header("Retry-After", "5");
      rep.status(503).send({
        ok: false,
        error: "OVERLOADED",
        message: "Server is temporarily overloaded. Please try again shortly.",
        retry_after: 5,
      });
    },
  });

  // 3. Security headers (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === "production",
  });

  // 4. CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost in development, or requests without origin (cURL, mobile PWA)
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".oddly.game") ||
        origin === "https://oddly.game"
      ) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  });

  // 5. Secure signed cookies
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || "oddly_dev_cookie_secret_at_least_32_chars!",
    parseOptions: {},
  });

  // 6. Redis-backed rate limiting (R1.4)
  await app.register(rateLimit, {
    redis: redis.status === "ready" ? redis : undefined,
    max: 120, // 120 requests per minute default
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      const deviceId =
        (req.headers["x-device-id"] as string) ||
        (req.cookies.oddly_did as string) ||
        "anon";
      return `${deviceId}:${req.ip}`;
    },
    allowList: process.env.NODE_ENV === "production" ? [] : ["127.0.0.1", "localhost"],
  });

  // 6. OpenAPI / Swagger Documentation (P3.11)
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Oddly REST API",
        description:
          "Public and internal API for Oddly — the daily five-pick stranger twin game.",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:4000",
          description: "Local development server",
        },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "oddly_at",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // 7. Register domain routes
  await app.register(healthRoutes);
  await app.register(dropsRoutes);
  await app.register(contentRoutes);
  await app.register(pagesRoutes);
  await app.register(configRoutes);
  await app.register(identityRoutes);
  await app.register(submissionsRoutes);
  await app.register(resultsRoutes);
  await app.register(worldRoutes);
  await app.register(cardsRoutes);
  await app.register(sharesRoutes);
  await app.register(authRoutes);
  await app.register(historyRoutes);
  await app.register(meRoutes);
  await app.register(reportsRoutes);
  await app.register(pushRoutes);

  // 8. Propagate correlation requestId header on all responses
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // 9. Global error handler mapping Zod errors cleanly
  app.setErrorHandler((error, request, reply) => {
    const err = error as {
      code?: string;
      validation?: unknown;
      issues?: unknown;
      name?: string;
      message?: string;
      statusCode?: number;
    };

    if (
      hasZodFastifySchemaValidationErrors(error) ||
      error.validation ||
      error.name === "ZodError" ||
      err.code === "FST_ERR_VALIDATION"
    ) {
      reply.status(400).send({
        ok: false,
        error: "VALIDATION_ERROR",
        message: error.message || "Request validation failed",
        details: err.validation || err.issues,
      });
      return;
    }

    request.log.error(error);
    reply.status(error.statusCode || 500).send({
      ok: false,
      error: error.name || "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : error.message,
    });
  });

  return app;
}
