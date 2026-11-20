/**
 * @file server.ts
 * @package @oddly/api
 *
 * Fastify server factory configuring security, correlation IDs,
 * Zod validation, OpenAPI docs, cookies, and rate limits.
 */

import Fastify, { type FastifyInstance } from "fastify";
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
import { keepsRoutes } from "./routes/keeps.js";
import { orbitsRoutes } from "./routes/orbits.js";
import { globeRoutes } from "./routes/globe.js";
import { telepathyRoutes } from "./routes/telepathy.js";
import { antiTwinRoutes } from "./routes/antitwin.js";
import { eventsRoutes } from "./routes/events.js";
import { memeRoutes } from "./routes/memes.js";
import { DegradationManager } from "./resilience/degradation.js";
import { registerMetrics } from "./metrics.js";

export interface ServerOptions {
  logger?: boolean;
  testing?: boolean;
  isShuttingDown?: () => boolean;
  ipRateLimitCeiling?: number;
  allowList?: string[];
  underPressure?: {
    maxEventLoopDelay?: number;
    maxHeapUsedBytes?: number;
    maxRssBytes?: number;
    sampleInterval?: number;
  } | false;
}

export async function buildServer(
  opts: ServerOptions = {}
) {
  const app = Fastify({
    trustProxy: true,
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
  if (opts.underPressure !== false) {
    const upConfig = typeof opts.underPressure === "object" ? opts.underPressure : {};
    const maxDelay =
      upConfig.maxEventLoopDelay ??
      (Number(process.env.UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY_MS) ||
        (process.env.NODE_ENV === "test" ? 2000 : 250));
    const maxHeap =
      upConfig.maxHeapUsedBytes ??
      (Number(process.env.UNDER_PRESSURE_MAX_HEAP_BYTES) || 1024 * 1024 * 1024);
    const maxRss =
      upConfig.maxRssBytes ??
      (Number(process.env.UNDER_PRESSURE_MAX_RSS_BYTES) || 1536 * 1024 * 1024);

    await app.register(underPressure, {
      maxEventLoopDelay: maxDelay,
      maxHeapUsedBytes: maxHeap,
      maxRssBytes: maxRss,
      sampleInterval: upConfig.sampleInterval ?? 1000,
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
  }

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

  // 6. Redis-backed rate limiting (R1.4: deviceId + IP)
  if (redis.status === "wait") {
    try {
      await redis.connect();
    } catch {
      // ignore
    }
  }

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
    allowList: opts.allowList ?? (process.env.NODE_ENV === "production" ? [] : ["127.0.0.1", "localhost"]),
  });

  // 6b. Coarse IP-only ceiling rate limit (R1-PATCH Item 5)
  // Default 600 req/min read from app_config / env.
  // Accommodates Indian CGNAT cellular mobile users sharing tower IP addresses.
  const IP_RATE_LIMIT_CEILING =
    opts.ipRateLimitCeiling ??
    (Number(process.env.IP_RATE_LIMIT_PER_MINUTE) || 600);
  const ipWindowMap = new Map<string, { count: number; expiresAt: number }>();

  app.addHook("onRequest", async (req, reply) => {
    // In test environment, skip unless explicitly testing IP ceiling via opts or production mode
    if (
      process.env.NODE_ENV !== "production" &&
      !opts.ipRateLimitCeiling &&
      (req.ip === "127.0.0.1" || req.ip === "localhost")
    ) {
      return;
    }

    const ip = req.ip || "unknown";

    if (redis.status === "ready") {
      try {
        const ipKey = `ratelimit:ip:${ip}`;
        const count = await redis.incr(ipKey);
        if (count === 1) {
          await redis.expire(ipKey, 60);
        }
        if (count > IP_RATE_LIMIT_CEILING) {
          reply.header("Retry-After", "60");
          reply.status(429).send({
            ok: false,
            error: "IP_RATE_LIMIT_EXCEEDED",
            message: "Too many requests from this network. Please wait a moment.",
            retry_after: 60,
          });
          return;
        }
      } catch {
        // Fall back to in-memory window on Redis error
      }
    } else {
      const now = Date.now();
      const current = ipWindowMap.get(ip);
      if (!current || now > current.expiresAt) {
        ipWindowMap.set(ip, { count: 1, expiresAt: now + 60000 });
      } else {
        current.count++;
        if (current.count > IP_RATE_LIMIT_CEILING) {
          reply.header("Retry-After", "60");
          reply.status(429).send({
            ok: false,
            error: "IP_RATE_LIMIT_EXCEEDED",
            message: "Too many requests from this network. Please wait a moment.",
            retry_after: 60,
          });
          return;
        }
      }
    }
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

  // Degradation Header (R2.5) & Request-ID Correlation Header
  app.addHook("preHandler", async (request, reply) => {
    const level = await DegradationManager.getLevel();
    reply.header("x-oddly-degradation-level", String(level));
    reply.header("x-request-id", request.id);
  });

  // 6.5. Prometheus Metrics Instrumentation (R2.6)
  registerMetrics(app as unknown as FastifyInstance);

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
  await app.register(keepsRoutes);
  await app.register(orbitsRoutes);
  await app.register(globeRoutes);
  await app.register(telepathyRoutes);
  await app.register(antiTwinRoutes);
  await app.register(eventsRoutes);
  await app.register(memeRoutes);

  // 8. Global error handler mapping Zod errors cleanly
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
