/**
 * @file replica-routing.test.ts
 * @package @oddly/api
 *
 * Comprehensive integration test suite for Task P8.11:
 * Database Read Replica Routing for History Archive and World Stats (Architecture Sec 8.1 & Scaling Plan T2).
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildServer } from "./server.js";
import {
  setReplicaClientForTest,
  getReplicaMetrics,
  resetReplicaMetrics,
  isReplicaConfigured,
} from "./db/client.js";
import { DegradationManager } from "./resilience/degradation.js";
import { PrismaClient } from "@oddly/shared";

describe("P8.11: Database Read Replica Routing & Failover Resilience", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterEach(() => {
    setReplicaClientForTest(null);
    resetReplicaMetrics();
    DegradationManager.setLevel(0);
    vi.restoreAllMocks();
  });

  describe("Replica Routing Configuration & Headers", () => {
    it("reports replica configured status correctly", () => {
      expect(isReplicaConfigured()).toBe(false);

      const mockReplica = {} as unknown as PrismaClient;
      setReplicaClientForTest(mockReplica);
      expect(isReplicaConfigured()).toBe(true);
    });

    it("attaches x-oddly-routed-to header indicating primary when no replica is configured", async () => {
      setReplicaClientForTest(null);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history",
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["x-oddly-routed-to"]).toBe("primary");
    });

    it("attaches x-oddly-routed-to: replica when replica is active", async () => {
      const mockReplica = {
        player: {
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
        submission: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        match: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaClient;

      setReplicaClientForTest(mockReplica);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history",
        cookies: {
          oddly_session: "plyr_test_replica_header",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["x-oddly-routed-to"]).toBe("replica");
    });
  });

  describe("P8.11: GET /v1/history Read Replica Query Execution", () => {
    it("routes player history queries through read replica client", async () => {
      const mockPlayerId = "plyr_replica_123";
      const dropDate = new Date("2026-11-22T00:00:00.000Z");

      const mockReplica = {
        player: {
          findUnique: vi.fn().mockResolvedValue({
            id: mockPlayerId,
            account_id: "acc_replica_999",
          }),
          findMany: vi.fn().mockResolvedValue([{ id: mockPlayerId }]),
        },
        submission: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "sub_replica_1",
              drop_id: "drop_replica_1",
              player_id: mockPlayerId,
              submitted_at: new Date("2026-11-22T07:15:00.000Z"),
              drop: {
                id: "drop_replica_1",
                drop_date: dropDate,
              },
              oddnessScore: {
                tier: "Rare",
                percentile: 88,
              },
              shareCards: [
                {
                  storage_key: "card_replica_1.png",
                },
              ],
            },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
        match: {
          findFirst: vi.fn().mockResolvedValue({
            id: "match_replica_1",
            drop_id: "drop_replica_1",
            similarity_score: 0.8,
          }),
        },
      } as unknown as PrismaClient;

      setReplicaClientForTest(mockReplica);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history?limit=10",
        cookies: {
          oddly_session: mockPlayerId,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(data.items.length).toBe(1);
      expect(data.items[0].submissionId).toBe("sub_replica_1");
      expect(data.items[0].sharerTier).toBe("Rare");
      expect(data.items[0].sharerScore).toBe(4); // 0.8 * 5

      // Assert queries were handled by replica
      expect(mockReplica.player.findUnique).toHaveBeenCalledTimes(1);
      expect(mockReplica.submission.findMany).toHaveBeenCalledTimes(1);
      expect(mockReplica.submission.count).toHaveBeenCalledTimes(1);
    });
  });

  describe("P8.11: GET /v1/world/:dropId Read Replica Routing", () => {
    it("routes world statistics aggregations through read replica client", async () => {
      const dropId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

      const mockReplica = {
        submission: {
          count: vi.fn().mockResolvedValue(4200),
        },
        oddnessScore: {
          findMany: vi.fn().mockResolvedValue([
            { tier: "Common" },
            { tier: "Common" },
            { tier: "Rare" },
            { tier: "Mythic" },
          ]),
        },
        answerStat: {
          findMany: vi.fn().mockResolvedValue([
            {
              question_id: "q_rare_1",
              value: "Midnight Blue",
              count: 42,
            },
          ]),
        },
      } as unknown as PrismaClient;

      setReplicaClientForTest(mockReplica);

      const res = await app.inject({
        method: "GET",
        url: `/v1/world/${dropId}`,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.drop_id).toBe(dropId);
      expect(data.total_players).toBe(4200);
      expect(data.tier_distribution.Common).toBe(2);
      expect(data.tier_distribution.Rare).toBe(1);
      expect(data.tier_distribution.Mythic).toBe(1);
      expect(data.rarest_pick.value).toBe("Midnight Blue");
      expect(data.rarest_pick.count).toBe(42);

      // Verify queries hit the replica
      expect(mockReplica.submission.count).toHaveBeenCalledWith({
        where: { drop_id: dropId },
      });
      expect(mockReplica.oddnessScore.findMany).toHaveBeenCalledTimes(1);
      expect(mockReplica.answerStat.findMany).toHaveBeenCalledTimes(1);
      expect(res.headers["x-oddly-routed-to"]).toBe("replica");
    });
  });

  describe("P8.11: Transparent Failover on Replica Outage", () => {
    it("automatically fails over to primary database if replica throws error", async () => {
      // Mock replica that crashes with connection timeout
      const mockFailingReplica = {
        player: {
          findUnique: vi.fn().mockRejectedValue(new Error("Connection terminated unexpectedly on replica")),
        },
        submission: {
          count: vi.fn().mockRejectedValue(new Error("Replica lag timeout")),
        },
      } as unknown as PrismaClient;

      setReplicaClientForTest(mockFailingReplica);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history",
        cookies: {
          oddly_session: "plyr_failover_test",
        },
      });

      // Request succeeds via primary failover or in-memory fallback
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);

      // Verifies fallback count metric incremented
      const metrics = getReplicaMetrics();
      expect(metrics.fallbackCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Architecture Sec 8.1 & Sec 12: Degradation Level L2+ Load Shedding & Caching", () => {
    it("sheds GET /v1/history under Level L2 degradation with 503 OVERLOADED", async () => {
      DegradationManager.setLevel(2);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history",
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers["retry-after"]).toBe("30");
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(false);
      expect(data.error).toBe("OVERLOADED");
      expect(data.degradation_level).toBe(2);
    });

    it("sheds GET /v1/history under Level L3 emergency shedding", async () => {
      DegradationManager.setLevel(3);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history",
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers["retry-after"]).toBe("30");
      const data = JSON.parse(res.body);
      expect(data.error).toBe("OVERLOADED");
    });

    it("serves GET /v1/history normally under Level L0 and L1", async () => {
      DegradationManager.setLevel(0);
      const res0 = await app.inject({ method: "GET", url: "/v1/history" });
      expect(res0.statusCode).toBe(200);

      DegradationManager.setLevel(1);
      const res1 = await app.inject({ method: "GET", url: "/v1/history" });
      expect(res1.statusCode).toBe(200);
    });

    it("extends GET /v1/world/:dropId Cache-Control up to 10 minutes under Level L2", async () => {
      const dropId = "b2c3d4e5-f6a7-8901-bcde-fa2345678901";

      // Normal operations (L0): 30s cache
      DegradationManager.setLevel(0);
      const resL0 = await app.inject({ method: "GET", url: `/v1/world/${dropId}` });
      expect(resL0.headers["cache-control"]).toContain("max-age=30");

      // Peak drop crunch (L2): 10 minutes (600s) cache
      DegradationManager.setLevel(2);
      const resL2 = await app.inject({ method: "GET", url: `/v1/world/${dropId}` });
      expect(resL2.headers["cache-control"]).toContain("max-age=600");
    });
  });
});
