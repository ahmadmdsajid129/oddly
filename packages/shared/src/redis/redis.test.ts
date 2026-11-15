/**
 * @file redis.test.ts
 * @package @oddly/shared
 *
 * Automated Test Suite for R2.2: Redis Roles, Key Hygiene, and TTL Enforcement
 * Tests against real Redis 7
 */

import { describe, expect, it, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  RedisKeys,
  validateKeyPrefix,
} from "./keys.js";
import {
  getSafeRedisClient,
  closeAllRedisClients,
} from "./client.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

describe("Stage R2.2: Redis Roles, Key Hygiene & TTL Enforcement", () => {
  afterAll(async () => {
    await closeAllRedisClients();
  });

  describe("Key Prefix Validation", () => {
    it("accepts valid role prefixes", () => {
      expect(validateKeyPrefix("cache:drop:today")).toBe("cache");
      expect(validateKeyPrefix("counter:lock:sub:1:2")).toBe("counters");
      expect(validateKeyPrefix("queue:drop_pipeline")).toBe("queue");
    });

    it("rejects keys missing mandatory role prefix", () => {
      expect(() => validateKeyPrefix("unprefixed_key")).toThrow(
        /Redis Hygiene Violation/
      );
      expect(() => validateKeyPrefix("drop:today")).toThrow(
        /Redis Hygiene Violation/
      );
    });
  });

  describe("TTL Enforcement Wrapper", () => {
    it("refuses set without a positive TTL for non-exempt keys", async () => {
      const safe = getSafeRedisClient("cache", REDIS_URL);
      await expect(safe.set("cache:test:no_ttl", "value")).rejects.toThrow(
        /Refusing write to key 'cache:test:no_ttl' without a positive TTL/
      );
    });

    it("allows write without TTL for registered exempt keys", async () => {
      const safe = getSafeRedisClient("cache", REDIS_URL);
      const res = await safe.set("cache:config:system_defaults", "bootstrap_value");
      expect(res).toBe("OK");
    });

    it("sets key with positive TTL and verifies TTL is active", async () => {
      const safe = getSafeRedisClient("cache", REDIS_URL);
      const key = RedisKeys.cache.dropToday();
      await safe.set(key, JSON.stringify({ id: "d1" }), 60);

      const ttl = await safe.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it("enforces TTL on setnx locks", async () => {
      const safe = getSafeRedisClient("counters", REDIS_URL);
      const lockKey = RedisKeys.counter.requestLock("req_test_ttl");
      const acquired = await safe.setnx(lockKey, "1", 30);
      expect(acquired).toBe(true);

      const ttl = await safe.ttl(lockKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(30);

      // Second acquire fails (locked)
      const secondAcquire = await safe.setnx(lockKey, "2", 30);
      expect(secondAcquire).toBe(false);

      await safe.del(lockKey);
    });

    it("enforces TTL on sadd bucket sets", async () => {
      const safe = getSafeRedisClient("counters", REDIS_URL);
      const bucketKey = RedisKeys.counter.bucket("drop_1", "hash123");
      await safe.sadd(bucketKey, ["p1", "p2"], 120);

      const members = await safe.smembers(bucketKey);
      expect(members.sort()).toEqual(["p1", "p2"]);

      const ttl = await safe.ttl(bucketKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);

      await safe.del(bucketKey);
    });
  });

  describe("Role Isolation & Fault Scenarios", () => {
    it("fills cache role keys and verifies counters keys remain untouched", async () => {
      const cacheClient = getSafeRedisClient("cache", REDIS_URL);
      const counterClient = getSafeRedisClient("counters", REDIS_URL);

      const counterKey = RedisKeys.counter.answer("drop_iso", "q1", "ValA");
      await counterClient.set(counterKey, 42, 300);

      // Write cache entries
      for (let i = 0; i < 50; i++) {
        await cacheClient.set(`cache:stress:${i}`, `payload_${i}`, 60);
      }

      // Verify counter value remains strictly untouched
      const val = await counterClient.get(counterKey);
      expect(val).toBe("42");

      // Cleanup
      await counterClient.del(counterKey);
    });

    it("simulates cache role unavailable while counters remain operational", async () => {
      // Create separate simulated invalid connection for cache
      const deadCacheClient = getSafeRedisClient("cache", "redis://127.0.0.1:6370"); // dead port
      const workingCounterClient = getSafeRedisClient("counters", REDIS_URL);

      // Cache read fails or throws
      let cacheFailed = false;
      try {
        await deadCacheClient.raw.get("cache:dummy");
      } catch {
        cacheFailed = true;
      }
      expect(cacheFailed).toBe(true);

      // Submission / counter operations succeed independently
      const lockKey = RedisKeys.counter.submissionLock("drop_alive", "player_alive");
      const locked = await workingCounterClient.setnx(lockKey, "1", 30);
      expect(locked).toBe(true);
      await workingCounterClient.del(lockKey);
    });
  });

  describe("Codebase Hygiene Scan", () => {
    it("verifies all keys used across codebase conform to role prefixes and hygiene", () => {
      const projectRoot = path.resolve(__dirname, "../../../");
      const targetDirs = [
        path.join(projectRoot, "services/api/src"),
        path.join(projectRoot, "services/worker/src"),
        path.join(projectRoot, "packages/shared/src"),
      ];

      const rawWritePattern = /\.set\(\s*["'`][^"'`]+["'`]\s*,\s*[^,)]+\s*\)/g;
      const violations: string[] = [];

      function scanDir(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "generated") {
            scanDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            let match;
            while ((match = rawWritePattern.exec(content)) !== null) {
              // Ignore safe client implementation itself
              if (fullPath.includes("client.ts") && fullPath.includes("redis")) continue;
              violations.push(`${path.relative(projectRoot, fullPath)}: ${match[0]}`);
            }
          }
        }
      }

      for (const d of targetDirs) {
        scanDir(d);
      }

      expect(violations).toEqual([]);
    });
  });
});
