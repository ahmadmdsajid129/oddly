/**
 * @file reliability.test.ts
 * @package @oddly/api
 *
 * Stage R1: Reliability Remediation Automated Failure Mode & Protection Tests.
 * Covers:
 *   - R1.3: GET /ready probe (draining during shutdown, db/redis disconnection, healthy ready)
 *   - R1.3: Under-pressure load shedding (503 OVERLOADED with Retry-After: 5 header)
 *   - R1.4: Rate limiting (no localhost allowlist in production, 429 status on submissions)
 *   - R1.4: Submissions idempotency lock (409 CONCURRENT_REQUEST and duplicate replay)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildServer } from "./server.js";
import { redis } from "./lib/redis.js";
import { prisma } from "./db/client.js";

describe("Stage R1 Reliability Remediation: API Tests", () => {
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

  describe("R1.4: Rate Limiting & Production Allowlist Policy", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("does not bypass localhost in production mode and limits excessive requests", async () => {
      const app = await buildServer({
        logger: false,
      });
      await app.ready();

      const deviceId = "prod-test-device-" + Date.now();

      // Send 35 rapid requests to POST /v1/submissions
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
  });

  describe("R1.4: Submissions Idempotency & Concurrency Lock", () => {
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

    it("returns duplicate response for existing stored submission with same request_id", async () => {
      const app = await buildServer({
        logger: false,
      });
      await app.ready();

      const requestId = "existing-completed-req-" + Date.now();
      const dropId = "00000000-0000-0000-0000-000000000001";
      const playerId = "00000000-0000-0000-0000-000000000002";

      // Mock DB findUnique returning existing submission
      vi.spyOn(prisma.submission, "findUnique").mockResolvedValue({
        id: "existing-sub-123",
        drop_id: dropId,
        player_id: playerId,
        request_id: requestId,
        submitted_at: new Date(),
        answers: [],
        device_id: "test-device",
        is_guest: true,
      } as unknown as Awaited<ReturnType<typeof prisma.submission.findUnique>>);

      vi.spyOn(prisma.oddnessScore, "findUnique").mockResolvedValue({
        id: "score-123",
        submission_id: "existing-sub-123",
        raw_score: 0.82,
        percentile: 88,
        tier: "Uncommon",
        is_provisional: false,
        computed_at: new Date(),
      } as unknown as Awaited<ReturnType<typeof prisma.oddnessScore.findUnique>>);

      vi.spyOn(prisma.match, "findFirst").mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/v1/submissions",
        headers: {
          "x-device-id": "test-device",
        },
        payload: {
          drop_id: dropId,
          player_id: playerId,
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

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.status).toBe("duplicate");
      expect(body.submission_id).toBe("existing-sub-123");
      expect(body.oddness.raw_score).toBe(0.82);
      expect(body.oddness.tier).toBe("Uncommon");

      vi.restoreAllMocks();
      await app.close();
    });
  });
});
