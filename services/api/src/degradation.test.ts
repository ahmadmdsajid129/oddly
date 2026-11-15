/**
 * @file degradation.test.ts
 * @package @oddly/api
 *
 * Automated Test Suite for R2.5: Five-Level Degradation Ladder Engine
 * Tests L0 through L4 behavior, headers, hysteresis, and load shedding
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildServer } from "./server.js";
import { DegradationManager } from "./resilience/degradation.js";
import { DegradationController } from "@oddly/shared";

describe("Stage R2.5: Degradation Ladder Wiring (L0 to L4)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ testing: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    DegradationManager.setManualOverride(null);
    DegradationController.setLevel(0);
  });

  describe("API Header & Level Exposure", () => {
    it("attaches x-oddly-degradation-level: 0 on normal operations", async () => {
      DegradationManager.setManualOverride(0);
      const res = await app.inject({ method: "GET", url: "/v1/time" });
      expect(res.headers["x-oddly-degradation-level"]).toBe("0");
    });

    it("attaches x-oddly-degradation-level: 2 when level is elevated", async () => {
      DegradationManager.setManualOverride(2);
      const res = await app.inject({ method: "GET", url: "/v1/time" });
      expect(res.headers["x-oddly-degradation-level"]).toBe("2");
    });
  });

  describe("L2 Degradation Behaviors: Low-Priority Load Shedding", () => {
    it("sheds low-priority report endpoint under L2 with 503 OVERLOADED and Retry-After", async () => {
      DegradationManager.setManualOverride(2);

      const res = await app.inject({
        method: "POST",
        url: "/v1/reports",
        payload: {
          target_type: "drop",
          target_id: "drop_1",
          reason: "other",
          note: "Low priority report during drop crunch",
        },
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers["retry-after"]).toBe("30");
      const body = JSON.parse(res.body);
      expect(body.error).toBe("OVERLOADED");
      expect(body.degradation_level).toBe(2);
    });

    it("allows low-priority reports under L0 and L1", async () => {
      DegradationManager.setManualOverride(1);

      const res = await app.inject({
        method: "POST",
        url: "/v1/reports",
        payload: {
          target_type: "drop",
          target_id: "drop_1",
          reason: "other",
          note: "Low priority report under L1",
        },
      });

      if (res.statusCode !== 200) {
        console.error("L3 SUBMISSION ERROR RESPONSE:", res.body);
      }
      expect(res.statusCode).toBe(200);
    });
  });

  describe("L3 Degradation Behaviors: Sign-up Pausing & Deferred Matching", () => {
    it("pauses new account creation under L3 while guest play continues", async () => {
      DegradationManager.setManualOverride(3);

      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/oauth",
        payload: {
          provider: "google",
          id_token: "mock-google-token",
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("SIGNUPS_TEMPORARILY_PAUSED");
      expect(body.message).toContain("New account creation is temporarily paused");
    });

    it("defers synchronous matching under L3, returning match: null (finding your twin)", async () => {
      DegradationManager.setManualOverride(3);

      const uniqueReqId = `req_l3_${Date.now()}`;
      const uniquePlayerId = crypto.randomUUID();

      const { prisma } = await import("./db/client.js");
      const validDropId = "99999999-8888-7777-6666-555555555555";
      const validQids = [
        "10000000-0000-0000-0000-000000000001",
        "10000000-0000-0000-0000-000000000002",
        "10000000-0000-0000-0000-000000000003",
        "10000000-0000-0000-0000-000000000004",
        "10000000-0000-0000-0000-000000000005",
      ];

      // Ensure drop with valid UUID questions exists
      await prisma.question.deleteMany({ where: { drop_id: validDropId } });
      await prisma.drop.deleteMany({ where: { id: validDropId } });
      await prisma.drop.create({
        data: {
          id: validDropId,
          drop_date: new Date("2028-12-25"),
          opens_at: new Date(Date.now() - 3600000),
          closes_at: new Date(Date.now() + 3600000),
          status: "live",
          questions: {
            create: validQids.map((qid, idx) => ({
              id: qid,
              position: idx + 1,
              type: "text",
              payload: {},
            })),
          },
        },
      });

      // POST submission under L3
      const res = await app.inject({
        method: "POST",
        url: "/v1/submissions",
        payload: {
          drop_id: validDropId,
          player_id: uniquePlayerId,
          request_id: uniqueReqId,
          answers: [
            { question_id: validQids[0]!, value: "Morning", type: "text" },
            { question_id: validQids[1]!, value: "Green", type: "text" },
            { question_id: validQids[2]!, value: "42", type: "text" },
            { question_id: validQids[3]!, value: "Coffee", type: "text" },
            { question_id: validQids[4]!, value: "Books", type: "text" },
          ],
        },
      });

      if (res.statusCode !== 200) {
        console.error("L3 SUBMISSION ERROR RESPONSE:", res.body);
      }
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.oddness).toBeDefined();
      // Matching is deferred: returns null
      expect(body.match).toBeNull();
    });
  });

  describe("Hysteresis & Anti-Flapping (Up Fast, Down Slow)", () => {
    it("requires 1 full minute (6 ticks) of continuous strain to escalate level (Up Fast)", () => {
      DegradationController.setLevel(0);

      const strainedSignals = {
        eventLoopDelayMs: 65, // > 50ms (L2 trigger)
        p95SubmitLatencyMs: 400,
        queueDepth: 100,
        errorRatePercent: 0.1,
      };

      // Ticks 1 through 5: should NOT escalate yet (anti-flapping)
      for (let i = 1; i <= 5; i++) {
        const result = DegradationController.tick(strainedSignals);
        expect(result.level).toBe(0);
        expect(result.changed).toBe(false);
      }

      // Tick 6 (60 seconds): escalates to L2
      const tick6 = DegradationController.tick(strainedSignals);
      expect(tick6.level).toBe(2);
      expect(tick6.changed).toBe(true);
    });

    it("requires 5 consecutive healthy minutes (30 ticks) to step down 1 level (Down Slow)", () => {
      DegradationController.setLevel(2);

      const healthySignals = {
        eventLoopDelayMs: 5,
        p95SubmitLatencyMs: 120,
        queueDepth: 10,
        errorRatePercent: 0,
      };

      // Ticks 1 through 29: maintains L2
      for (let i = 1; i <= 29; i++) {
        const result = DegradationController.tick(healthySignals);
        expect(result.level).toBe(2);
        expect(result.changed).toBe(false);
      }

      // Tick 30 (300 seconds = 5 minutes): de-escalates to L1
      const tick30 = DegradationController.tick(healthySignals);
      expect(tick30.level).toBe(1);
      expect(tick30.changed).toBe(true);
    });
  });
});
