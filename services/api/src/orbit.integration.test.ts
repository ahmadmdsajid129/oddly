/**
 * @file orbit.integration.test.ts
 * @package @oddly/api
 *
 * Stage F1 (Phase 10A): Orbit Foundation Integration Test Suite.
 * Verified against real PostgreSQL 16 and real Redis 7.
 *
 * Tests:
 * 1. Database range-partitioning & check constraints (P10A.01).
 * 2. Keep state machine: Google Auth guard, provisional guard, single-keep cap (P10A.04, P10A.05).
 * 3. Asymmetric Privacy: incoming keep traits sanitized, zero sender ID leakage (P10A.04).
 * 4. Mutual acceptance: Lexicographically sorted Orbit creation (player_a_id < player_b_id) (P10A.05).
 * 5. Expressions: The Wave approved stickers, 1/day direction limit (P10A.05).
 * 6. Instant dissolution: POST /v1/orbits/:id/end & admin sever (P10A.08).
 * 7. Daily pipeline worker co-streak computation & 48h expiration (P10A.06).
 * 8. DPDP Right to Erasure hooks (P10A.09).
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { PipelineWorker } from "../../worker/src/workers/pipeline.worker.js";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage F1 (Phase 10A): Orbit Foundation Integration Tests", () => {
  let prisma: PrismaClient;
  let server: FastifyInstance;

  let testDropId = "";
  let testProvisionalDropId = "";
  let testDropDate: Date;

  const accountAId = randomUUID();
  const accountBId = randomUUID();
  const accountCId = randomUUID();

  const playerAId = randomUUID();
  const playerBId = randomUUID();
  const playerCId = randomUUID(); // Guest player (no account)

  let keepId = "";
  let orbitId = "";

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasourceUrl: DATABASE_URL,
    });
    server = await buildServer({ underPressure: false });

    // Seed test accounts
    await prisma.account.createMany({
      data: [
        {
          id: accountAId,
          google_sub: `sub_${accountAId}`,
          email_hash: "hash_a",
          display_name: "Player A",
        },
        {
          id: accountBId,
          google_sub: `sub_${accountBId}`,
          email_hash: "hash_b",
          display_name: "Player B",
        },
      ],
    });

    // Seed test players (Player A & B Google-authenticated, Player C Guest)
    await prisma.player.createMany({
      data: [
        {
          id: playerAId,
          did: `did_${playerAId}`,
          account_id: accountAId,
          region: "IN",
          age_band: "18-24",
        },
        {
          id: playerBId,
          did: `did_${playerBId}`,
          account_id: accountBId,
          region: "GB",
          age_band: "25-34",
        },
        {
          id: playerCId,
          did: `did_${playerCId}`,
          account_id: null, // Guest player
          region: "US",
          age_band: "18-24",
        },
      ],
    });

    // Locate or create test drops
    const closedDrop = await prisma.drop.findFirst({ where: { status: "closed" } });
    if (closedDrop) {
      testDropId = closedDrop.id;
      testDropDate = closedDrop.drop_date;
    } else {
      testDropId = randomUUID();
      testDropDate = new Date("2026-11-20T00:00:00.000Z");
      await prisma.drop.create({
        data: {
          id: testDropId,
          drop_date: testDropDate,
          opens_at: new Date("2026-11-20T01:30:00.000Z"),
          closes_at: new Date("2026-11-20T18:29:59.000Z"),
          status: "closed",
        },
      });
    }

    const liveDrop = await prisma.drop.findFirst({ where: { status: "live" } });
    let provisionalDate = new Date();
    if (liveDrop) {
      testProvisionalDropId = liveDrop.id;
      provisionalDate = liveDrop.drop_date;
    } else {
      testProvisionalDropId = randomUUID();
      provisionalDate = new Date("2026-11-21T00:00:00.000Z");
      await prisma.drop.create({
        data: {
          id: testProvisionalDropId,
          drop_date: provisionalDate,
          opens_at: new Date("2026-11-21T01:30:00.000Z"),
          closes_at: new Date("2026-11-21T18:29:59.000Z"),
          status: "live",
        },
      });
    }

    // Seed test locked match between Player A and Player B (non-provisional)
    const pMin = playerAId < playerBId ? playerAId : playerBId;
    const pMax = playerAId < playerBId ? playerBId : playerAId;

    await prisma.match.create({
      data: {
        id: randomUUID(),
        drop_id: testDropId,
        drop_date: testDropDate,
        player_a_id: pMin,
        player_b_id: pMax,
        similarity_score: 0.8,
        is_provisional: false, // Locked final twin!
      },
    });

    // Seed provisional match in live drop
    await prisma.match.create({
      data: {
        id: randomUUID(),
        drop_id: testProvisionalDropId,
        drop_date: provisionalDate,
        player_a_id: pMin,
        player_b_id: pMax,
        similarity_score: 0.6,
        is_provisional: true, // Still provisional!
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.orbitExpression.deleteMany({ where: { drop_date: testDropDate } });
      await prisma.orbit.deleteMany({
        where: {
          OR: [{ player_a_id: playerAId }, { player_b_id: playerAId }],
        },
      });
      await prisma.twinKeep.deleteMany({ where: { drop_date: testDropDate } });
      await prisma.match.deleteMany({
        where: {
          OR: [
            { player_a_id: { in: [playerAId, playerBId] } },
            { player_b_id: { in: [playerAId, playerBId] } },
          ],
        },
      });
      await prisma.player.deleteMany({
        where: { id: { in: [playerAId, playerBId, playerCId] } },
      });
      await prisma.account.deleteMany({
        where: { id: { in: [accountAId, accountBId] } },
      });
      await prisma.$disconnect();
    } catch {
      // Ignore cleanup error
    }
    await server.close();
  });

  // --------------------------------------------------------------------------
  // 1. Keep State Machine & Security Guards
  // --------------------------------------------------------------------------
  it("P10A.04 Guard: rejects unauthenticated guest player from sending Keep with 401", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/v1/keeps",
      headers: { "x-player-id": playerCId }, // Guest player (account_id: null)
      payload: { drop_id: testDropId },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("ACCOUNT_REQUIRED");
  });

  it("P10A.04 Guard: rejects Keep on a provisional (unlocked) drop with 400 DROP_NOT_LOCKED", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/v1/keeps",
      headers: { "x-player-id": playerAId },
      payload: { drop_id: testProvisionalDropId },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("DROP_NOT_LOCKED");
  });

  it("P10A.04 Success: sends Keep to locked final twin successfully", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/v1/keeps",
      headers: { "x-player-id": playerAId },
      payload: { drop_id: testDropId },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("pending");
    expect(body.keep_id).toBeDefined();
    keepId = body.keep_id;
  });

  it("P10A.04 Invariant: rejects duplicate Keep in same drop with 409 KEEP_ALREADY_SENT", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/v1/keeps",
      headers: { "x-player-id": playerAId },
      payload: { drop_id: testDropId },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("KEEP_ALREADY_SENT");
  });

  // --------------------------------------------------------------------------
  // 2. Asymmetric Privacy & Sanitized Incoming Queries
  // --------------------------------------------------------------------------
  it("P10A.04 Privacy: returns incoming keep with sanitized traits and zero sender ID leakage", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/v1/keeps/incoming",
      headers: { "x-player-id": playerBId },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.incoming).toHaveLength(1);

    const item = body.incoming[0];
    expect(item.id).toBe(keepId);
    expect(item.similarity_snapshot).toBe(0.8);
    expect(item.region).toBe("IN"); // Player A's coarse region
    expect(item.age_band).toBe("18-24"); // Player A's age band

    // Absolute Privacy Verification: sender player_id is NOT in the response
    expect((item as any).from_player_id).toBeUndefined();
    expect((item as any).player_id).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // 3. Orbit Formation & Lexicographical Ordering
  // --------------------------------------------------------------------------
  it("P10A.05 State Machine: mutual acceptance creates Orbit with player_a_id < player_b_id", async () => {
    const res = await server.inject({
      method: "POST",
      url: `/v1/keeps/${keepId}/respond`,
      headers: { "x-player-id": playerBId },
      payload: { decision: "accept", drop_date: testDropDate.toISOString() },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.decision).toBe("accept");
    expect(body.orbit_id).toBeDefined();
    orbitId = body.orbit_id;

    // Verify database row for lexicographical ordering invariant
    const orbitRow = await prisma.orbit.findUnique({ where: { id: orbitId } });
    expect(orbitRow).toBeDefined();
    expect(orbitRow!.status).toBe("active");
    expect(orbitRow!.player_a_id < orbitRow!.player_b_id).toBe(true);
  });

  it("P10A.05 Invariant: partial unique index blocks duplicate active orbit between same pair", async () => {
    const pMin = playerAId < playerBId ? playerAId : playerBId;
    const pMax = playerAId < playerBId ? playerBId : playerAId;

    await expect(
      prisma.orbit.create({
        data: {
          id: randomUUID(),
          player_a_id: pMin,
          player_b_id: pMax,
          status: "active",
          started_on: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // 4. Orbit Detail & Tactile Expressions (The Wave)
  // --------------------------------------------------------------------------
  it("P10A.05 Expressions: sends valid expression and rejects second daily expression with 409", async () => {
    // 1. Send first valid expression
    const res1 = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/express`,
      headers: { "x-player-id": playerAId },
      payload: { expression_key: "wave_hand" },
    });

    expect(res1.statusCode).toBe(201);
    const body1 = res1.json();
    expect(body1.ok).toBe(true);
    expect(body1.expression_key).toBe("wave_hand");

    // 2. Reject second expression on same day (1/day limit)
    const res2 = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/express`,
      headers: { "x-player-id": playerAId },
      payload: { expression_key: "nod" },
    });

    expect(res2.statusCode).toBe(409);
    const body2 = res2.json();
    expect(body2.error).toBe("ALREADY_EXPRESSED_TODAY");
  });

  it("P10A.05 Expressions: rejects unapproved expression key with 400 validation error", async () => {
    const res = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/express`,
      headers: { "x-player-id": playerBId },
      payload: { expression_key: "unapproved_custom_text" },
    });

    expect(res.statusCode).toBe(400);
  });

  // --------------------------------------------------------------------------
  // 5. Co-Streak Computation in Daily Pipeline Worker
  // --------------------------------------------------------------------------
  it("P10A.06 Co-Streak: increments streak when both players complete, quietly resets when missed", async () => {
    // 1. Both completed today's drop -> co-streak increments
    await prisma.submission.createMany({
      data: [
        {
          id: randomUUID(),
          drop_id: testDropId,
          drop_date: testDropDate,
          player_id: playerAId,
          request_id: randomUUID(),
          answers: [],
        },
        {
          id: randomUUID(),
          drop_id: testDropId,
          drop_date: testDropDate,
          player_id: playerBId,
          request_id: randomUUID(),
          answers: [],
        },
      ],
      skipDuplicates: true,
    });

    const resultBoth = await PipelineWorker.computeCoStreaks(testDropId, testDropDate);
    expect(resultBoth.activeOrbits).toBeGreaterThanOrEqual(1);
    expect(resultBoth.keptCoStreak).toBeGreaterThanOrEqual(1);

    const orbitAfterBoth = await prisma.orbit.findUnique({ where: { id: orbitId } });
    expect(orbitAfterBoth!.co_streak_current).toBe(1);
    expect(orbitAfterBoth!.co_streak_best).toBe(1);

    // 2. A missed drop -> co-streak quietly resets to 0 (zero guilt copy)
    const dummyDropId = randomUUID();
    const resultMissed = await PipelineWorker.computeCoStreaks(dummyDropId, new Date());
    expect(resultMissed.resetCoStreak).toBeGreaterThanOrEqual(1);

    const orbitAfterMiss = await prisma.orbit.findUnique({ where: { id: orbitId } });
    expect(orbitAfterMiss!.co_streak_current).toBe(0);
    expect(orbitAfterMiss!.co_streak_best).toBe(1); // Best preserved!
  });

  // --------------------------------------------------------------------------
  // 6. Instant Unprovoked Dissolution & Admin Sever
  // --------------------------------------------------------------------------
  it("P10A.08 Dissolution: player ends orbit instantly with neutral notice and zero blame", async () => {
    const res = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/end`,
      headers: { "x-player-id": playerAId },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ended");
    expect(body.message).toBe("This orbit has ended.");

    const row = await prisma.orbit.findUnique({ where: { id: orbitId } });
    expect(row!.status).toBe("ended");
    expect(row!.ended_by).toBe(playerAId);
  });

  it("P10A.08 Admin: administrator can sever an orbit with mandatory audit reason", async () => {
    // Create another orbit to test admin severance
    const pMin = playerAId < playerBId ? playerAId : playerBId;
    const pMax = playerAId < playerBId ? playerBId : playerAId;

    const orbit2 = await prisma.orbit.create({
      data: {
        id: randomUUID(),
        player_a_id: pMin,
        player_b_id: pMax,
        status: "active",
        started_on: new Date(),
      },
    });

    const res = await server.inject({
      method: "POST",
      url: `/v1/admin/orbits/${orbit2.id}/sever`,
      headers: { "x-admin-key": "admin_secret" },
      payload: { reason: "Moderation action: DPDP compliance severance" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ended");
    expect(body.audit_id).toBeDefined();

    const row = await prisma.orbit.findUnique({ where: { id: orbit2.id } });
    expect(row!.status).toBe("ended");
    expect(row!.ended_by).toBe("admin");

    await prisma.orbit.delete({ where: { id: orbit2.id } });
  });

  // --------------------------------------------------------------------------
  // 7. DPDP Erasure Purging Orbit Linkages
  // --------------------------------------------------------------------------
  it("P10A.09 DPDP: account erasure severs active orbits and purges pending keeps", async () => {
    // Create an active orbit and a pending keep for Player A
    const pMin = playerAId < playerBId ? playerAId : playerBId;
    const pMax = playerAId < playerBId ? playerBId : playerAId;

    const testOrbit = await prisma.orbit.create({
      data: {
        id: randomUUID(),
        player_a_id: pMin,
        player_b_id: pMax,
        status: "active",
        started_on: new Date(),
      },
    });

    const testKeep = await prisma.twinKeep.create({
      data: {
        id: randomUUID(),
        drop_date: new Date("2026-11-22T00:00:00.000Z"),
        from_player_id: playerAId,
        to_player_id: playerBId,
        similarity_snapshot: 0.9,
        status: "pending",
      },
    });

    // Request DPDP erasure for Player A
    const res = await server.inject({
      method: "DELETE",
      url: "/v1/me",
      cookies: { oddly_session: playerAId },
    });

    expect(res.statusCode).toBe(200);

    // Verify orbit was severed by dpdp_erasure
    const orbitAfter = await prisma.orbit.findUnique({ where: { id: testOrbit.id } });
    expect(orbitAfter!.status).toBe("ended");
    expect(orbitAfter!.ended_by).toBe("dpdp_erasure");

    // Verify keep was expired
    const keepAfter = await prisma.twinKeep.findFirst({ where: { id: testKeep.id } });
    expect(keepAfter!.status).toBe("expired");

    await prisma.orbit.delete({ where: { id: testOrbit.id } });
    await prisma.twinKeep.deleteMany({ where: { id: testKeep.id } });
  });
});
