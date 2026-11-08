import { Redis } from "ioredis";
import { Worker } from "bullmq";
import { processRenderCardJob } from "./jobs/render-card.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

console.log("[Oddly Worker] Initializing worker service...");

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  // Prevent noisy unhandled error event logs when Redis is not running locally
  if (process.env.NODE_ENV !== "production") {
    // Suppress repeated connection warnings in local dev
  } else {
    console.error("[Oddly Worker] Redis client error:", err.message);
  }
});

async function bootstrap() {
  try {
    await redis.connect();
    console.log("[Oddly Worker] Connected to Redis successfully.");

    // Start Cards rendering worker
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

bootstrap().catch((err) => {
  console.error("[Oddly Worker] Bootstrap fatal error:", err);
  process.exit(1);
});
