/**
 * @file index.ts
 * @package @oddly/api
 *
 * Boot script for Oddly API service with graceful shutdown (R1.3).
 */

import { buildServer } from "./server.js";
import { prisma } from "./db/client.js";
import { redis } from "./lib/redis.js";

export * from "./server.js";
export * from "./db/index.js";

const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 15000;
let isShuttingDown = false;
let serverInstance: Awaited<ReturnType<typeof buildServer>> | null = null;

export async function shutdownApi(signal = "SIGTERM"): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Oddly API] Received ${signal}. Draining connections and shutting down gracefully (grace: ${SHUTDOWN_GRACE_MS}ms)...`);

  const forceExitTimer = setTimeout(() => {
    console.warn("[Oddly API] Shutdown grace period exceeded. Forcing exit.");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  try {
    if (serverInstance) {
      await serverInstance.close();
      console.log("[Oddly API] HTTP server closed cleanly.");
    }
    if (redis.status === "ready") {
      await redis.quit();
      console.log("[Oddly API] Redis connection closed.");
    }
    await prisma.$disconnect();
    console.log("[Oddly API] Database connections disconnected.");

    clearTimeout(forceExitTimer);
    console.log("[Oddly API] Graceful shutdown complete. Exiting cleanly.");
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  } catch (err) {
    console.error("[Oddly API] Error during graceful shutdown:", err);
    clearTimeout(forceExitTimer);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

process.on("SIGTERM", () => shutdownApi("SIGTERM"));
process.on("SIGINT", () => shutdownApi("SIGINT"));

const start = async () => {
  const server = await buildServer({
    isShuttingDown: () => isShuttingDown,
  });
  serverInstance = server;
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info(`Oddly API service running at http://${host}:${port}`);
    server.log.info(`Interactive API docs available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}
