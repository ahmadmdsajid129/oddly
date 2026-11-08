/**
 * @file redis.ts
 * @package @oddly/api
 *
 * Redis client with connection pooling, automatic reconnection, and graceful fallback.
 */

import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export function createRedisClient(): Redis {
  if (globalThis.__redis) {
    return globalThis.__redis;
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop reconnecting after 3 attempts
      }
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    // Only log if not in test environment
    if (process.env.NODE_ENV !== "test") {
      console.warn("⚠️ Redis connection issue:", err.message);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__redis = client;
  }

  return client;
}

export const redis = createRedisClient();
