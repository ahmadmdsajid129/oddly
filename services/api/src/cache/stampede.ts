/**
 * @file stampede.ts
 * @package @oddly/api
 *
 * Cache-First Reads with Single-Flight Stampede Protection (R2.3)
 *
 * Pattern:
 * 1. Check Redis cache role first.
 * 2. On miss, acquire a short-lived single-flight mutex lock.
 * 3. Lock winner reads from Postgres and populates cache (and stale backup).
 * 4. Concurrent callers poll cache or wait on the single-flight winner.
 * 5. If Postgres query fails, serve stale cached content (stale-if-error at app level).
 * 6. Admin invalidateContent() hook.
 */

import { getSafeRedisClient, RedisKeys } from "@oddly/shared";

export interface CacheReadOptions {
  ttlSeconds: number;
  staleTtlSeconds?: number;
  lockTimeoutSeconds?: number;
}

export class StampedeProtectedCache {
  private static getCacheClient() {
    return getSafeRedisClient("cache");
  }

  /**
   * Reads from Redis cache first; falls back to fetcher with single-flight mutex lock.
   */
  static async readThroughWithMutex<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheReadOptions
  ): Promise<{ data: T; isStale: boolean; fromCache: boolean }> {
    const redis = this.getCacheClient();
    const ttlSeconds = options.ttlSeconds;
    const staleKey = `${key}:stale`;

    // 1. Check fast cache
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return { data: JSON.parse(cached) as T, isStale: false, fromCache: true };
      }
    } catch {
      // Redis transient read issue, continue to fetcher
    }

    // 2. Cache miss: attempt single-flight lock
    const lockKey = RedisKeys.cache.lockStampede(key);
    const lockAcquired = await redis.setnx(lockKey, "1", options.lockTimeoutSeconds ?? 5);

    if (lockAcquired) {
      try {
        // Winner executes fetcher
        const freshData = await fetcher();
        const serialized = JSON.stringify(freshData);

        // Populate primary cache and stale backup (1 hour TTL)
        await redis.set(key, serialized, ttlSeconds);
        await redis.set(staleKey, serialized, options.staleTtlSeconds ?? 3600);

        return { data: freshData, isStale: false, fromCache: false };
      } catch (fetchError) {
        // Stale-if-error: if database fails, check stale backup key
        try {
          const staleData = await redis.get(staleKey);
          if (staleData !== null) {
            console.warn(`[Cache Stale-if-Error] Serving stale content for ${key} due to DB error:`, fetchError);
            return { data: JSON.parse(staleData) as T, isStale: true, fromCache: true };
          }
        } catch {
          // Fall through to throw original error
        }
        throw fetchError;
      } finally {
        // Release lock
        await redis.del(lockKey).catch(() => {});
      }
    } else {
      // Lock not acquired: another process is fetching. Poll with jitter up to 10 times.
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
        const polled = await redis.get(key);
        if (polled !== null) {
          return { data: JSON.parse(polled) as T, isStale: false, fromCache: true };
        }
      }

      // If lock holder timed out without writing, execute fetcher directly
      const direct = await fetcher();
      return { data: direct, isStale: false, fromCache: false };
    }
  }

  /**
   * Invalidates content keys and their stale backups.
   * Invoked on drop/content publish by Stage 11 admin API.
   */
  static async invalidateContent(keys: string | string[]): Promise<number> {
    const redis = this.getCacheClient();
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let count = 0;

    for (const k of keyArray) {
      const deletedPrimary = await redis.del(k);
      const deletedStale = await redis.del(`${k}:stale`);
      count += deletedPrimary + deletedStale;
    }

    return count;
  }
}

