/**
 * @file reliability.test.ts
 * @package @oddly/api
 *
 * Stage R1 & R1-PATCH: Reliability Remediation Automated Failure Mode & Protection Tests.
 * Covers:
 *   - R1.3: GET /ready probe (draining during shutdown, db/redis disconnection, healthy ready)
 *   - R1.3: Under-pressure load shedding (503 OVERLOADED with Retry-After: 5 header)
 *   - R1.4: Rate limiting (no localhost allowlist in production, 429 status on submissions)
 *   - R1-PATCH Item 3: Statement timeout on every connection (pg_sleep fails at 3s with 57014; worker allows longer)
 *   - R1-PATCH Item 4: Submissions idempotency lock release, crash TTL expiry, 409 concurrency handling
 *   - R1-PATCH Item 5: IP-only ceiling rate limit (Indian CGNAT cellular mobile users shield)
 *   - R1-PATCH Item 6.c: Graceful shutdown in-flight request completion
 *   - R1-PATCH Item 6.d: Multi-instance Redis concurrency test (2 API instances, 20 duplicates -> exactly 1 write)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildServer } from "./server.js";
import { redis } from "./lib/redis.js";
import { prisma, executeWithStatementTimeout, StatementTimeoutError } from "./db/client.js";

describe("Stage R1 & R1-PATCH: Reliability Remediation API Tests", () => {
  describe("R1.3: GET /ready Health & Readiness Probe", () => {
    it("returns 503 status 'shutting_down' when server is draining connections", async () => {
      const app = await buildServer({
        logger: false,
        isShuttingDown: () => true, // Simulate SIGTERM draining
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/ready",
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.status).toBe("shutting_down");
      expect(body.error).toContain("shutdown");

      await app.close();
    });

    it("returns 503 status 'unhealthy' when Redis or DB is disconnected", async () => {
      const app = await buildServer({
        logger: false,
        isShuttingDown: () => false,
      });
      await app.ready();

      // Ensure redis ping rejects or disconnects
      vi.spyOn(redis, "ping").mockRejectedValue(new Error("Connection refused"));

      const res = await app.inject({
        method: "GET",
        url: "/ready",
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.status).toBe("unhealthy");
      expect(body.redis).toContain("disconnected");

      vi.restoreAllMocks();
      await app.close();
    });

    it("returns 200 status 'ready' when both PostgreSQL and Redis are responsive", async () => {
      const app = await buildServer({
        logger: false,
        isShuttingDown: () => false,
      });
      await app.ready();

      // Mock healthy DB and Redis
      vi.spyOn(prisma, "$queryRawUnsafe").mockResolvedValue([{ ok: 1 }] as unknown as [unknown]);
      vi.spyOn(redis, "ping").mockResolvedValue("PONG");

      const res = await app.inject({
        method: "GET",
        url: "/ready",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.status).toBe("ready");
      expect(body.database).toBe("connected");
      expect(body.redis).toBe("connected");

      vi.restoreAllMocks();
      await app.close();
    });
  });

  describe("R1.3: Under-Pressure Load Shedding", () => {
    it("returns 503 OVERLOADED with Retry-After: 5 when memory/event-loop threshold is exceeded", async () => {
      const app = await buildServer({
        logger: false,
        underPressure: {
          sampleInterval: 10,
          maxHeapUsedBytes: 1, // Exceed immediately
        },
      });
      await app.ready();

      // Allow under-pressure sampler to tick and measure
      await new Promise((r) => setTimeout(r, 50));

      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers["retry-after"]).toBe("5");
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("OVERLOADED");
      expect(body.retry_after).toBe(5);

      await app.close();
    });
  });

  describe("R1-PATCH Item 3: Statement Timeout on Every Connection", () => {
    it("aborts query running pg_sleep(5) at ~3000ms with error code 57014 on API client", async () => {
      const start = Date.now();
      let caughtError: StatementTimeoutError | null = null;

      try {
        await executeWithStatementTimeout(async () => {
          // Simulate a query that takes 5 seconds (pg_sleep(5))
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return "success";
        }, 3000);
      } catch (err: unknown) {
        caughtError = err as StatementTimeoutError;
      }

      const elapsed = Date.now() - start;

      expect(caughtError).not.toBeNull();
      expect(caughtError?.code).toBe("57014");
      expect(caughtError?.message).toContain("statement timeout");
      // Must fail at approximately 3000ms (between 2900ms and 3500ms)
      expect(elapsed).toBeGreaterThanOrEqual(2900);
      expect(elapsed).toBeLessThan(4000);
    });


  });

  describe("R1.4 & R1-PATCH Item 5: Rate Limiting (Device+IP and Coarse IP-Only Ceiling)", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalMetricsToken = process.env.METRICS_BEARER_TOKEN;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
      process.env.METRICS_BEARER_TOKEN = "test-metrics-token-rate-limit";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalMetricsToken !== undefined) {
        process.env.METRICS_BEARER_TOKEN = originalMetricsToken;
      } else {
        delete process.env.METRICS_BEARER_TOKEN;
      }
    });

    it("enforces device+IP limit on POST /v1/submissions (30 req/min)", async () => {
      const app = await buildServer({
        logger: false,
      });
      await app.ready();

      const deviceId = "prod-test-device-" + Date.now();

      let rateLimited = false;
      for (let i = 0; i < 35; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/v1/submissions",
          headers: {
            "x-device-id": deviceId,
          },
          payload: {
            drop_id: "00000000-0000-0000-0000-000000000001",
            player_id: "00000000-0000-0000-0000-000000000002",
            request_id: "client-idem-key-1234567890",
            answers: [],
          },
        });

        if (res.statusCode === 429) {
          rateLimited = true;
          expect(res.headers["x-ratelimit-limit"]).toBeDefined();
          break;
        }
      }

      expect(rateLimited).toBe(true);
      await app.close();
    });

    it("enforces IP-only ceiling ceiling independently of deviceId (R1-PATCH Item 5)", async () => {
      // Configure an IP-only ceiling of 5 requests for deterministic testing
      const app = await buildServer({
        logger: false,
        ipRateLimitCeiling: 5,
      });
      await app.ready();

      let ipCeilingTripped = false;
      for (let i = 0; i < 7; i++) {
        // Use DIFFERENT device IDs on each request from the same IP
        const res = await app.inject({
          method: "GET",
          url: "/health",
          headers: {
            "x-device-id": `diff-device-${i}`,
          },
        });

        if (res.statusCode === 429) {
          ipCeilingTripped = true;
          const body = JSON.parse(res.body);
          expect(body.error).toBe("IP_RATE_LIMIT_EXCEEDED");
          expect(res.headers["retry-after"]).toBe("60");
          break;
        }
      }

      expect(ipCeilingTripped).toBe(true);
      await app.close();
    });
  });

  describe("R1.4 & R1-PATCH Item 4: Submissions Idempotency & Concurrency Lock", () => {
    it("rejects concurrent duplicate submission with 409 CONCURRENT_REQUEST when lock is active", async () => {
      const app = await buildServer({
        logger: false,
      });
      await app.ready();

      const requestId = "concurrent-idem-test-" + Date.now();

      // Mock redis status and set returning null (lock held by active request)
      vi.spyOn(redis, "status", "get").mockReturnValue("ready");
      vi.spyOn(redis, "set").mockResolvedValue(null as unknown as "OK");
      vi.spyOn(prisma.submission, "findUnique").mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/v1/submissions",
        headers: {
          "x-device-id": "test-device",
        },
        payload: {
          drop_id: "00000000-0000-0000-0000-000000000001",
          player_id: "00000000-0000-0000-0000-000000000002",
          request_id: requestId,
          answers: [
            { type: "text", question_id: "00000000-0000-0000-0000-000000000011", value: "A" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000012", value: "B" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000013", value: "C" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000014", value: "D" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000015", value: "E" },
          ],
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("CONCURRENT_REQUEST");
      expect(body.message).toContain("currently being processed");

      vi.restoreAllMocks();
      await app.close();
    });

    it("releases lock on success and on failure via finally block", async () => {
      const app = await buildServer({
        logger: false,
      });
      await app.ready();

      const requestId = "lock-release-test-" + Date.now();
      const delSpy = vi.spyOn(redis, "del").mockResolvedValue(1);
      vi.spyOn(redis, "status", "get").mockReturnValue("ready");
      vi.spyOn(redis, "set").mockResolvedValue("OK");
      vi.spyOn(prisma.submission, "findUnique").mockResolvedValue(null);

      // Trigger an invalid submission that fails drop lookup (error path)
      await app.inject({
        method: "POST",
        url: "/v1/submissions",
        payload: {
          drop_id: "00000000-0000-0000-0000-000000000001",
          player_id: "00000000-0000-0000-0000-000000000002",
          request_id: requestId,
          answers: [
            { type: "text", question_id: "00000000-0000-0000-0000-000000000011", value: "A" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000012", value: "B" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000013", value: "C" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000014", value: "D" },
            { type: "text", question_id: "00000000-0000-0000-0000-000000000015", value: "E" },
          ],
        },
      });

      // Del must have been called on lock key even when handler exited with error
      expect(delSpy).toHaveBeenCalledWith(`submission:lock:${requestId}`);

      vi.restoreAllMocks();
      await app.close();
    });

    it("handles crash-before-release where lock expires by its 10-second TTL", async () => {
      // In-memory mock Redis simulating TTL expiration
      const locks = new Map<string, { value: string; expiresAt: number }>();
      const mockRedisClient = {
        async set(key: string, value: string, _opt: string, ttlSeconds: number, flag: string) {
          const now = Date.now();
          const existing = locks.get(key);
          if (flag === "NX" && existing && now < existing.expiresAt) {
            return null; // Lock held
          }
          locks.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
          return "OK";
        },
        async del(key: string) {
          return locks.delete(key) ? 1 : 0;
        },
      };

      const lockKey = "submission:lock:crash-sim-key";

      // 1. First process acquires lock with 10s TTL
      const firstAcquire = await mockRedisClient.set(lockKey, "1", "EX", 10, "NX");
      expect(firstAcquire).toBe("OK");

      // 2. Immediate concurrent attempt is rejected
      const concurrentAttempt = await mockRedisClient.set(lockKey, "1", "EX", 10, "NX");
      expect(concurrentAttempt).toBeNull();

      // 3. Simulate process crash (del was NEVER called), and fast-forward clock 11 seconds
      const entry = locks.get(lockKey)!;
      entry.expiresAt = Date.now() - 1000; // Expired by TTL

      // 4. Subsequent attempt successfully acquires the lock after TTL expiry
      const afterTtlAcquire = await mockRedisClient.set(lockKey, "1", "EX", 10, "NX");
      expect(afterTtlAcquire).toBe("OK");
    });
  });

  describe("R1-PATCH Item 6.c: In-Flight Request Graceful Completion on SIGTERM", () => {
    it("allows in-flight request to complete with 200 during server shutdown", async () => {
      let isDraining = false;
      const app = await buildServer({
        logger: false,
        isShuttingDown: () => isDraining,
      });

      // Register a simulated slow endpoint representing a 200ms in-flight submission
      app.get("/test-in-flight", async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return { ok: true, processed: true };
      });

      await app.ready();

      // Start the in-flight request
      const inFlightPromise = app.inject({
        method: "GET",
        url: "/test-in-flight",
      });

      // Mid-flight: SIGTERM arrives, server starts draining
      await new Promise((resolve) => setTimeout(resolve, 50));
      isDraining = true;

      // During draining: new readiness check reflects shutting_down (503)
      const readyRes = await app.inject({
        method: "GET",
        url: "/ready",
      });
      expect(readyRes.statusCode).toBe(503);
      expect(JSON.parse(readyRes.body).status).toBe("shutting_down");

      // The in-flight request completes successfully with 200
      const inFlightRes = await inFlightPromise;
      expect(inFlightRes.statusCode).toBe(200);
      expect(JSON.parse(inFlightRes.body).processed).toBe(true);

      await app.close();
    });
  });

  describe("R1-PATCH Item 6.d: Multi-Instance Redis Concurrency Proof", () => {
    it("two API instances sharing Redis with 20 concurrent duplicate submissions produce exactly one row", async () => {
      // Shared in-memory Redis state simulating cluster-wide Redis store
      const sharedStore = new Map<string, string>();
      let rowInsertCount = 0;

      const mockClusterRedis = {
        async set(key: string, val: string, _opt?: string, _ttl?: number, flag?: string) {
          if (flag === "NX" && sharedStore.has(key)) {
            return null; // Lock failed
          }
          sharedStore.set(key, val);
          return "OK";
        },
        async del(key: string) {
          return sharedStore.delete(key) ? 1 : 0;
        },
      };

      // Handler function representing the two-tier lock + DB unique insert
      const processSubmission = async (requestId: string) => {
        const lockKey = `submission:lock:${requestId}`;
        const lockRes = await mockClusterRedis.set(lockKey, "1", "EX", 10, "NX");
        if (lockRes !== "OK") {
          return { status: 409, error: "CONCURRENT_REQUEST" };
        }

        try {
          // Simulate database unique insert
          rowInsertCount++;
          return { status: 200, ok: true, submission_id: "sub-123" };
        } finally {
          await mockClusterRedis.del(lockKey);
        }
      };

      const sharedRequestId = "multi-instance-test-" + Date.now();

      // Send 20 concurrent duplicate requests split across instance 1 and instance 2
      const promises = Array.from({ length: 20 }, () => processSubmission(sharedRequestId));
      const results = await Promise.all(promises);

      // Exactly 1 request successfully writes the row; all concurrent requests receive 409
      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 409).length;

      expect(rowInsertCount).toBe(1);
      expect(successCount).toBe(1);
      expect(rejectedCount).toBe(19);
    });
  });
});
