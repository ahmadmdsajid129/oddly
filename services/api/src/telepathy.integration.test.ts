/**
 * @file telepathy.integration.test.ts
 * @package @oddly/api
 *
 * Stage F3 (Phase 10C): Telepathy (Instinct Sync) Integration Test Suite.
 * Verified against real PostgreSQL 16.
 *
 * Covers tasks P10C.04, P10C.05, P10C.06, P10C.08, P10C.09:
 * 1. Auth guards: 401 Unauthorized for unauthenticated, 403 Forbidden for non-members.
 * 2. Prerequisite check: 422 SUBMISSION_REQUIRED before both partners submit today's drop.
 * 3. Scoped Reveal Invariant (Rule 4): Partner pick is strictly hidden (null) until caller locks their guess.
 * 4. Permanent Lock-in: Calling guess endpoint records guess; subsequent attempt returns 409 GUESS_ALREADY_LOCKED.
 * 5. Mathematical Honesty: Baseline luck matches sum(p(a)^2) of options distribution.
 * 6. Composite Sync summary: Unlocks only after 5 completed rounds.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient, calculateLuckBaseline } from "@oddly/shared";
import { buildServer } from "./server.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage F3 (Phase 10C): Telepathy Integration Tests", () => {
  let prisma: PrismaClient;
  let server: Awaited<ReturnType<typeof buildServer>>;

  const dropDateStr = "2025-02-15";
  const dropDateObj = new Date(`${dropDateStr}T00:00:00.000Z`);
  const testDropId = randomUUID();
  const telepathyQuestionId = randomUUID();
  const secondQuestionId = randomUUID();

  const accountAId = randomUUID();
  const accountBId = randomUUID();
  const playerAId = randomUUID();
  const playerBId = randomUUID();
  const outsiderPlayerId = randomUUID();

  let orbitId = "";

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
    server = await buildServer({ underPressure: false });

    // 1. Seed accounts
    await prisma.account.createMany({
      data: [
        { id: accountAId, google_sub: `sub_${accountAId}`, email_hash: "hash_t_a", display_name: "Player A" },
        { id: accountBId, google_sub: `sub_${accountBId}`, email_hash: "hash_t_b", display_name: "Player B" },
      ],
    });

    // 2. Seed players
    await prisma.player.createMany({
      data: [
        { id: playerAId, did: `did_${playerAId}`, account_id: accountAId, region: "IN", age_band: "25-34" },
        { id: playerBId, did: `did_${playerBId}`, account_id: accountBId, region: "DE", age_band: "25-34" },
        { id: outsiderPlayerId, did: `did_${outsiderPlayerId}`, region: "US", age_band: "18-24" },
      ],
    });

    // 3. Create test drop
    await prisma.drop.deleteMany({ where: { drop_date: dropDateObj } });
    await prisma.drop.create({
      data: {
        id: testDropId,
        drop_date: dropDateObj,
        opens_at: new Date("2025-02-15T01:30:00.000Z"),
        closes_at: new Date("2025-02-15T18:29:59.000Z"),
        status: "live",
      },
    });

    // 4. Create Questions for Drop
    await prisma.question.create({
      data: {
        id: telepathyQuestionId,
        drop_id: testDropId,
        position: 1,
        type: "text",
        payload: {
          type: "text",
          prompt: "Morning curse preference:",
          options: [
            { label: "Cold pizza", value: "cold_pizza" },
            { label: "Lukewarm coffee", value: "lukewarm_coffee" },
          ],
        },
        answerOptions: {
          create: [
            { label: "Cold pizza", value: "cold_pizza", display_order: 1 },
            { label: "Lukewarm coffee", value: "lukewarm_coffee", display_order: 2 },
          ],
        },
      },
    });

    // Set telepathy_question_id after question is created
    await prisma.drop.update({
      where: { id: testDropId },
      data: { telepathy_question_id: telepathyQuestionId },
    });

    await prisma.question.create({
      data: {
        id: secondQuestionId,
        drop_id: testDropId,
        position: 2,
        type: "number",
        payload: {
          type: "number",
          prompt: "Pick a number 1-50",
          min: 1,
          max: 50,
          step: 1,
        },
      },
    });

    // 5. Seed answer stats for the telepathy question (60% cold_pizza, 40% lukewarm_coffee)
    // Luck baseline = 0.6^2 + 0.4^2 = 0.36 + 0.16 = 0.52
    await prisma.answerStat.createMany({
      data: [
        {
          id: randomUUID(),
          drop_id: testDropId,
          drop_date: dropDateObj,
          question_id: telepathyQuestionId,
          value: "cold_pizza",
          count: 60,
          probability: 0.6,
        },
        {
          id: randomUUID(),
          drop_id: testDropId,
          drop_date: dropDateObj,
          question_id: telepathyQuestionId,
          value: "lukewarm_coffee",
          count: 40,
          probability: 0.4,
        },
      ],
    });

    // 6. Create active Orbit between Player A and Player B
    const pA = playerAId < playerBId ? playerAId : playerBId;
    const pB = playerAId < playerBId ? playerBId : playerAId;

    const orbit = await prisma.orbit.create({
      data: {
        id: randomUUID(),
        player_a_id: pA,
        player_b_id: pB,
        status: "active",
        started_on: dropDateObj,
        co_streak_current: 7, // Staged unlocks day 7 milestone met
        co_streak_best: 7,
      },
    });
    orbitId = orbit.id;
  });

  afterAll(async () => {
    try {
      await prisma.telepathyGuess.deleteMany({ where: { orbit_id: orbitId } });
      await prisma.submission.deleteMany({ where: { drop_id: testDropId } });
      await prisma.answerStat.deleteMany({ where: { drop_id: testDropId } });
      await prisma.answerOption.deleteMany({ where: { question: { drop_id: testDropId } } });
      await prisma.question.deleteMany({ where: { drop_id: testDropId } });
      await prisma.drop.deleteMany({ where: { id: testDropId } });
      await prisma.orbit.deleteMany({ where: { id: orbitId } });
      await prisma.player.deleteMany({ where: { id: { in: [playerAId, playerBId, outsiderPlayerId] } } });
      await prisma.account.deleteMany({ where: { id: { in: [accountAId, accountBId] } } });
      await prisma.$disconnect();
    } catch {
      // ignore cleanup errors
    }
    await server.close();
  });

  // --------------------------------------------------------------------------
  // Tests
  // --------------------------------------------------------------------------

  it("P10C.04 Guard: rejects unauthenticated request with 401", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy`,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("UNAUTHORIZED");
  });

  it("P10C.04 Guard: rejects outsider who is not an Orbit member with 403", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy`,
      headers: { "x-player-id": outsiderPlayerId },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("FORBIDDEN");
  });

  it("P10C.04 Prerequisite: blocks guess before both players submit today's drop with 422", async () => {
    // Only Player A has submitted so far
    await prisma.submission.create({
      data: {
        id: randomUUID(),
        drop_id: testDropId,
        drop_date: dropDateObj,
        player_id: playerAId,
        request_id: `req_a_${randomUUID()}`,
        answers: [
          { question_id: telepathyQuestionId, value: "cold_pizza" },
          { question_id: secondQuestionId, value: 42 },
        ],
      },
    });

    // Try to guess before Player B submits
    const res = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/telepathy/guess?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
      payload: { guessed_option: "lukewarm_coffee" },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("SUBMISSION_REQUIRED");
  });

  it("P10C.05 Scoped Reveal Invariant (Rule 4): reveals partner pick ONLY after guess lock-in", async () => {
    // Player B now submits their drop (picks "cold_pizza" on telepathy question)
    await prisma.submission.create({
      data: {
        id: randomUUID(),
        drop_id: testDropId,
        drop_date: dropDateObj,
        player_id: playerBId,
        request_id: `req_b_${randomUUID()}`,
        answers: [
          { question_id: telepathyQuestionId, value: "cold_pizza" },
          { question_id: secondQuestionId, value: 7 },
        ],
      },
    });

    // 1. Before locking guess: GET telepathy state
    const beforeRes = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
    });

    expect(beforeRes.statusCode).toBe(200);
    const beforeBody = beforeRes.json();
    expect(beforeBody.ok).toBe(true);
    expect(beforeBody.round.has_both_submitted).toBe(true);
    expect(beforeBody.round.my_guess).toBeNull();
    // Invariant: partner's pick is strictly hidden!
    expect(beforeBody.round.reveal).toBeNull();

    // 2. Lock in Player A's guess: "cold_pizza"
    const lockRes = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/telepathy/guess?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
      payload: { guessed_option: "cold_pizza" },
    });

    expect(lockRes.statusCode).toBe(200);
    const lockBody = lockRes.json();
    expect(lockBody.ok).toBe(true);
    expect(lockBody.round.my_guess.guessed_option).toBe("cold_pizza");

    // Scoped reveal exception now activated:
    expect(lockBody.round.reveal).not.toBeNull();
    expect(lockBody.round.reveal.partner_pick).toBe("cold_pizza");
    expect(lockBody.round.reveal.is_match).toBe(true);
    // Baseline math: 0.6^2 + 0.4^2 = 0.52
    expect(lockBody.round.reveal.baseline_p).toBeCloseTo(0.52, 2);

    // 3. Subsequent GET by Player A shows the locked guess and reveal
    const afterRes = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
    });

    expect(afterRes.statusCode).toBe(200);
    const afterBody = afterRes.json();
    expect(afterBody.round.my_guess.guessed_option).toBe("cold_pizza");
    expect(afterBody.round.reveal.is_match).toBe(true);
  });

  it("P10C.05 Permanent Lock-In: duplicate guess attempt is rejected with 409 GUESS_ALREADY_LOCKED", async () => {
    const res = await server.inject({
      method: "POST",
      url: `/v1/orbits/${orbitId}/telepathy/guess?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
      payload: { guessed_option: "lukewarm_coffee" },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("GUESS_ALREADY_LOCKED");
  });

  it("P10C.08 Composite Sync Summary: unlocks once pair completes 5 rounds", async () => {
    // Current state has 1 round. Check that sync_summary is locked.
    const res1 = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
    });

    const body1 = res1.json();
    expect(body1.round.sync_summary.total_rounds).toBe(1);
    expect(body1.round.sync_summary.unlocked).toBe(false);

    // Insert 4 more past rounds for this orbit
    for (let i = 1; i <= 4; i++) {
      const pastDate = new Date(`2025-02-1${i}T00:00:00.000Z`);
      await prisma.telepathyGuess.create({
        data: {
          id: randomUUID(),
          orbit_id: orbitId,
          drop_date: pastDate,
          guesser_player_id: playerAId,
          question_id: telepathyQuestionId,
          guessed_option_key: i % 2 === 0 ? "cold_pizza" : "lukewarm_coffee",
          partner_option_key: "cold_pizza",
          hit: i % 2 === 0, // 2 hits, 2 misses
          baseline_p: 0.5,
        },
      });
    }

    // Now query telepathy state again: total rounds = 5!
    const res5 = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/telepathy?drop_date=${dropDateStr}`,
      headers: { "x-player-id": playerAId },
    });

    const body5 = res5.json();
    expect(body5.round.sync_summary.total_rounds).toBe(5);
    expect(body5.round.sync_summary.unlocked).toBe(true);
    // Round 1 was a match, rounds 2 and 4 were matches => 3 matches out of 5 = 60% (0.6)
    expect(body5.round.sync_summary.matches).toBe(3);
    expect(body5.round.sync_summary.sync_score).toBe(0.6);
  });
});
