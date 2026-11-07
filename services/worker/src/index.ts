import { Redis } from "ioredis";

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
