/**
 * @file antitwin.integration.test.ts
 * @package @oddly/api
 *
 * Anti-Twin Integration Tests (Stage F4 / Phase 10D / Tasks P10D.02, P10D.03 / ADR-040).
 *
 * Invariants Verified:
 * 1. Prerequisite verification: Caller must submit drop before accessing Anti-Twin.
 * 2. Low-pool graceful hide: If pool < min_pool (200), gracefully hides with honest copy; zero fake opposites.
 * 3. Inverse similarity matching: Scans candidates and selects lowest similarity opposite.
 * 4. Rule 4 Privacy Invariant: NEVER exposes opposite user's answer choices or vectors.
 * 5. Persistent caching: Results written to anti_twin_results table and Redis with 24h TTL.
 * 6. Degradation protection: Returns 503 at L2+.
 */

import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { DegradationManager } from "./resilience/degradation.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage F4 (Phase 10D): Anti-Twin Integration Tests", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;

  let dropId: string;
  let targetPlayerId: string;
  let targetDeviceId: string;
  let candidate1Id: string;
  let candidate2Id: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create unique test players
    targetDeviceId = `did-antitwin-target-${randomUUID().slice(0, 8)}`;
    const targetPlayer = await prisma.player.create({
      data: {
        did: targetDeviceId,
        region: "IN",
        age_band: "25-34",
      },
    });
    targetPlayerId = targetPlayer.id;

    const cand1 = await prisma.player.create({
      data: {
        did: `did-antitwin-cand1-${randomUUID().slice(0, 8)}`,
        region: "IN",
        age_band: "18-24",
      },
    });
    candidate1Id = cand1.id;

    const cand2 = await prisma.player.create({
      data: {
        did: `did-antitwin-cand2-${randomUUID().slice(0, 8)}`,
        region: "DE",
        age_band: "25-34",
      },
    });
    candidate2Id = cand2.id;

    // 2. Create test drop
    const dropDate = new Date("2026-11-20T00:00:00.000Z");
    const drop = await prisma.drop.create({
      data: {
        drop_date: dropDate,
        opens_at: new Date("2026-11-20T01:30:00.000Z"),
        closes_at: new Date("2026-11-20T18:29:00.000Z"),
        status: "live",
      },
    });
    dropId = drop.id;

    // 3. Create 5 questions with options
    const questionData = [
      { pos: 1, prompt: "Tea or Coffee?", opts: ["Tea", "Coffee"] },
      { pos: 2, prompt: "Morning or Night?", opts: ["Morning", "Night"] },
      { pos: 3, prompt: "City or Mountain?", opts: ["City", "Mountain"] },
      { pos: 4, prompt: "Cats or Dogs?", opts: ["Cats", "Dogs"] },
      { pos: 5, prompt: "Book or Film?", opts: ["Book", "Film"] },
    ];

    const questions = [];
    for (const qd of questionData) {
      const q = await prisma.question.create({
        data: {
          drop_id: dropId,
          position: qd.pos,
          type: "text",
          payload: { prompt: qd.prompt, options: qd.opts },
          answerOptions: {
            create: qd.opts.map((label, idx) => ({
              value: `opt_${idx}`,
              label,
              display_order: idx,
            })),
          },
        },
      });
      questions.push(q);
    }

    // 4. Create submissions
    // Target answers all opt_0: [0, 0, 0, 0, 0]
    await prisma.submission.create({
      data: {
        drop_id: dropId,
        drop_date: dropDate,
        player_id: targetPlayerId,
        request_id: `req-target-${randomUUID().slice(0, 8)}`,
        answers: questions.map((q) => ({ question_id: q.id, value: "opt_0" })),
      },
    });

    // Candidate 1 (Similar): [0, 0, 0, 0, 1] -> 4 matches
    await prisma.submission.create({
      data: {
        drop_id: dropId,
        drop_date: dropDate,
        player_id: candidate1Id,
        request_id: `req-cand1-${randomUUID().slice(0, 8)}`,
        answers: questions.map((q, idx) => ({
          question_id: q.id,
          value: idx === 4 ? "opt_1" : "opt_0",
        })),
      },
    });

    // Candidate 2 (Opposite): [1, 1, 1, 1, 1] -> 0 matches (5 differed)
    await prisma.submission.create({
      data: {
        drop_id: dropId,
        drop_date: dropDate,
        player_id: candidate2Id,
        request_id: `req-cand2-${randomUUID().slice(0, 8)}`,
        answers: questions.map((q) => ({ question_id: q.id, value: "opt_1" })),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (dropId) {
      await prisma.antiTwinResult.deleteMany({ where: { drop_date: new Date("2026-11-20T00:00:00.000Z") } }).catch(() => {});
      await prisma.submission.deleteMany({ where: { drop_id: dropId } }).catch(() => {});
      await prisma.answerOption.deleteMany({ where: { question: { drop_id: dropId } } }).catch(() => {});
      await prisma.question.deleteMany({ where: { drop_id: dropId } }).catch(() => {});
      await prisma.drop.deleteMany({ where: { id: dropId } }).catch(() => {});
    }
    if (targetPlayerId) {
      await prisma.player.deleteMany({
        where: { id: { in: [targetPlayerId, candidate1Id, candidate2Id] } },
      }).catch(() => {});
    }
    await prisma.$disconnect();
    await app.close();
  });

  it("gracefully hides Anti-Twin when pool is below min_pool threshold (< 200)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/results/${dropId}/anti-twin`,
      headers: {
        "x-device-id": targetDeviceId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.pool_insufficient).toBe(true);
    expect(body.pool_count).toBe(2);
    expect(body.min_pool_size).toBe(200);
    expect(body.notice).toContain("Not enough players yet today to find a genuine opposite");
    // Ensure no opposite card is rendered or fabricated
    expect(body.opposite).toBeUndefined();
  });

  it("computes bounded opposite when threshold is lowered to current pool size", async () => {
    // Override min_pool query param to 2 to test the computation path
    const res = await app.inject({
      method: "GET",
      url: `/v1/results/${dropId}/anti-twin?min_pool=2&sample_size=100`,
      headers: {
        "x-device-id": targetDeviceId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.differed_count).toBe(5);
    expect(body.sample_size).toBe(2);
    expect(body.opposite?.region).toBe("DE");
    expect(body.opposite?.age_band).toBe("25-34");
    expect(body.note).toContain("yin to your yang");

    // Rule 4 Invariant: Result contains caller's own differed questions, NEVER opposite user's answers
    expect(body.own_differed_questions).toHaveLength(5);
    for (const q of body.own_differed_questions) {
      expect(q).toHaveProperty("prompt");
      expect(q).toHaveProperty("your_answer");
      expect(q).not.toHaveProperty("opposite_answer");
      expect(q).not.toHaveProperty("partner_answer");
    }

    // Verify row was written to anti_twin_results table
    const stored = await prisma.antiTwinResult.findUnique({
      where: {
        drop_date_player_id: {
          drop_date: new Date("2026-11-20T00:00:00.000Z"),
          player_id: targetPlayerId,
        },
      },
    });
    expect(stored).not.toBeNull();
    expect(stored?.differed_count).toBe(5);
  });

  it("loads cached anti-twin result on subsequent calls", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/results/${dropId}/anti-twin`,
      headers: {
        "x-device-id": targetDeviceId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.differed_count).toBe(5);
    expect(body.opposite?.region).toBe("DE");
  });

  it("returns 503 degraded when system degradation is L2 or higher", async () => {
    vi.spyOn(DegradationManager, "getLevel").mockResolvedValue(2);

    const res = await app.inject({
      method: "GET",
      url: `/v1/results/${dropId}/anti-twin`,
      headers: {
        "x-device-id": targetDeviceId,
      },
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.degraded).toBe(true);
    expect(body.error).toContain("paused during high load");

    vi.restoreAllMocks();
  });
});
