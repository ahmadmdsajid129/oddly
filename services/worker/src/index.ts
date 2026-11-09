/**
 * @file index.ts
 * @package @oddly/worker
 *
 * Worker & Daily Pipeline Scheduler entry point (P9.01 - P9.06).
 */

import { Redis } from "ioredis";
import { Worker } from "bullmq";
import { processRenderCardJob } from "./jobs/render-card.js";
import { DailyScheduler } from "./scheduler.js";

export * from "./clock.js";
export * from "./scheduler.js";
export * from "./workers/pairing.worker.js";
export * from "./workers/closure.worker.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

console.log("[Oddly Worker] Initializing worker service & daily pipeline...");

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    // Suppress connection spam in local dev when Redis is not running
  } else {
    console.error("[Oddly Worker] Redis client error:", err.message);
  }
});

export const dailyScheduler = new DailyScheduler();

async function bootstrap() {
  try {
    await redis.connect();
    console.log("[Oddly Worker] Connected to Redis successfully.");

    // 1. Initialize BullMQ Daily Pipeline Scheduler
    dailyScheduler.initQueue(redis);
    await dailyScheduler.registerSchedules();
    console.log("[Oddly Worker] Daily pipeline cron schedules registered.");

    // 2. Start Cards rendering worker
    const cardWorker = new Worker("cards", processRenderCardJob, {
      connection: redis,
      concurrency: 4,
    });

    cardWorker.on("completed", (job) => {
      console.log(`[Oddly Worker] Card rendered for job ${job.id}`);
    });

    cardWorker.on("failed", (job, err) => {
      console.error(`[Oddly Worker] Card rendering failed for job ${job?.id}:`, err);
    });
  } catch (error) {
    console.warn(
      "[Oddly Worker] Redis connection deferred or offline. Starting idle worker:",
      (error as Error).message
    );
  }

  console.log("worker ready");
}

if (process.env.NODE_ENV !== "test") {
  bootstrap().catch((err) => {
    console.error("[Oddly Worker] Bootstrap fatal error:", err);
    process.exit(1);
  });
}
