/**
 * @file client.ts
 * @package @oddly/shared
 *
 * Redis Role Factory and TTL-Enforcing Client Wrapper (R2.2)
 *
 * Roles:
 * - cache: Drop JSON, public config, pages, rate limit counters (allkeys-lru eviction)
 * - counters: Live answer frequencies, buckets, idempotency locks (noeviction, persistence)
 * - queue: BullMQ queues and workers (noeviction, persistence)
 */

import { Redis, type RedisOptions } from "ioredis";
import { validateKeyPrefix, isTtlExempt, type RedisRole } from "./keys.js";

const clientPool = new Map<RedisRole, Redis>();

export interface RedisRoleUrls {
  cache?: string;
  counters?: string;
  queue?: string;
}

export function getRedisUrlForRole(role: RedisRole): string {
  if (role === "cache") {
    return process.env.CACHE_REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379";
  }
  if (role === "counters") {
    return process.env.COUNTERS_REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379";
  }
  if (role === "queue") {
    return process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379";
  }
  throw new Error(`Unknown Redis role: ${role}`);
}

/**
 * Checks policy compliance on boot.
 */
export async function verifyRedisPolicy(role: RedisRole, redis: Redis): Promise<string> {
  try {
    const config = await redis.config("GET", "maxmemory-policy") as [string, string] | Record<string, string>;
    const policy = Array.isArray(config) ? config[1] : config?.["maxmemory-policy"];

    if (role === "cache" && policy && policy !== "allkeys-lru") {
      console.warn(`[Redis Role Policy] Warning: role 'cache' expected 'allkeys-lru', but found '${policy}'`);
    } else if ((role === "counters" || role === "queue") && policy && policy !== "noeviction") {
      console.error(
        `[Redis Role Policy ERROR] Critical: role '${role}' must use 'noeviction' to prevent data/lock loss! Found '${policy}'`
      );
    }
    return policy || "unknown";
  } catch {
    // Some cloud providers disable CONFIG GET
    return "unsupported";
  }
}

/**
 * Factory for role-specific Redis connections.
 */
export function getRedisClient(role: RedisRole, customUrl?: string): Redis {
  const existing = clientPool.get(role);
  if (existing && !customUrl) {
    return existing;
  }

  const url = customUrl || getRedisUrlForRole(role);

  if (process.env.NODE_ENV === "production" && !process.env.CACHE_REDIS_URL && !customUrl) {
    console.warn(
      `[Redis Role Isolation] Warning: CACHE_REDIS_URL / COUNTERS_REDIS_URL / QUEUE_REDIS_URL unset in production. Using shared fallback: ${url}`
    );
  }

  const options: RedisOptions = {
    maxRetriesPerRequest: role === "queue" ? null : 3,
    enableReadyCheck: true,
    lazyConnect: true,
  };

  const redis = new Redis(url, options);

  redis.on("connect", () => {
    verifyRedisPolicy(role, redis).catch(() => {});
  });

  if (!customUrl) {
    clientPool.set(role, redis);
  }

  return redis;
}

/**
 * Safe TTL-enforcing wrapper around Redis.
 * Refuses any write without a positive TTL unless registered in TTL_EXEMPT_KEYS.
 */
export class SafeRedisClient {
  constructor(
    public readonly role: RedisRole,
    public readonly raw: Redis
  ) {}

  /**
   * Sets key with mandatory TTL.
   */
  async set(key: string, value: string | number, ttlSeconds?: number): Promise<"OK" | null> {
    validateKeyPrefix(key);

    const hasTtl = typeof ttlSeconds === "number" && ttlSeconds > 0;
    if (!hasTtl && !isTtlExempt(key)) {
      throw new Error(
        `[Redis TTL Violation] Refusing write to key '${key}' without a positive TTL. Key is not registered in TTL_EXEMPT_KEYS.`
      );
    }

    if (hasTtl) {
      return this.raw.set(key, String(value), "EX", ttlSeconds);
    } else {
      return this.raw.set(key, String(value));
    }
  }

  /**
   * Sets key with mandatory TTL only if not exists (atomic mutex/idempotency lock).
   */
  async setnx(key: string, value: string | number, ttlSeconds: number): Promise<boolean> {
    validateKeyPrefix(key);

    if (typeof ttlSeconds !== "number" || ttlSeconds <= 0) {
      throw new Error(`[Redis TTL Violation] setnx on key '${key}' requires a positive TTL.`);
    }

    const res = await this.raw.set(key, String(value), "EX", ttlSeconds, "NX");
    return res === "OK";
  }

  /**
   * Safe set addition with TTL renewal.
   */
  async sadd(key: string, members: string | string[], ttlSeconds?: number): Promise<number> {
    validateKeyPrefix(key);
    const memberArray = Array.isArray(members) ? members : [members];
    const added = await this.raw.sadd(key, ...memberArray);

    if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
      await this.raw.expire(key, ttlSeconds);
    } else if (!isTtlExempt(key)) {
      // Check if existing key has a TTL
      const currentTtl = await this.raw.ttl(key);
      if (currentTtl < 0) {
        throw new Error(
          `[Redis TTL Violation] Refusing sadd to key '${key}' without a TTL. Key is not registered in TTL_EXEMPT_KEYS.`
        );
      }
    }

    return added;
  }

  async get(key: string): Promise<string | null> {
    validateKeyPrefix(key);
    return this.raw.get(key);
  }

  async del(key: string): Promise<number> {
    validateKeyPrefix(key);
    return this.raw.del(key);
  }

  async ttl(key: string): Promise<number> {
    validateKeyPrefix(key);
    return this.raw.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    validateKeyPrefix(key);
    return this.raw.expire(key, seconds);
  }

  async smembers(key: string): Promise<string[]> {
    validateKeyPrefix(key);
    return this.raw.smembers(key);
  }

  async incr(key: string, ttlSecondsIfNew?: number): Promise<number> {
    validateKeyPrefix(key);
    const val = await this.raw.incr(key);
    if (val === 1 && typeof ttlSecondsIfNew === "number" && ttlSecondsIfNew > 0) {
      await this.raw.expire(key, ttlSecondsIfNew);
    } else if (val === 1 && !isTtlExempt(key)) {
      throw new Error(`[Redis TTL Violation] incr created key '${key}' without TTL.`);
    }
    return val;
  }
}

/**
 * Creates a wrapped safe Redis client for a given role.
 */
export function getSafeRedisClient(role: RedisRole, customUrl?: string): SafeRedisClient {
  const raw = getRedisClient(role, customUrl);
  return new SafeRedisClient(role, raw);
}

export async function closeAllRedisClients(): Promise<void> {
  for (const client of clientPool.values()) {
    try {
      await client.quit();
    } catch {
      // Ignore
    }
  }
  clientPool.clear();
}

