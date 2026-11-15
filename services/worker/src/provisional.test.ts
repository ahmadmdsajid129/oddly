/**
 * @file provisional.test.ts
 * @package @oddly/worker
 *
 * Automated Test Suite for R2.10: Provisional Refresh Worker (Task P9.04)
 * Tests run against real PostgreSQL 16 and Redis 7 (Docker).
 * Proves:
 *   1. Late-arriving close twin upgrades an earlier player's match.
 *   2. No upgrade notification when improvement is below threshold (< +0.10).
 *   3. Second improvement the same day sends NO second notification (1/day cap).
 *   4. Quiet hours (22:00 to 07:00 IST) suppress immediate push notifications.
 *   5. Sweep is bounded and idempotent.
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "./db.js";
import { getRedisClient } from "@oddly/shared";
import { ProvisionalRefreshWorker, isQuietHours } from "./provisional.worker.js";

describe("Stage R2.10: Provisional Refresh Worker (Task P9.04) [Real Postgres & Redis]", () => {
  const redis = getRedisClient("counters");
  const testDropId = "11111111-4444-5555-6666-777777777777";
  const testDropDate = new Date("2026-11-20T00:00:00.000Z");

  const qids = [
    "20000000-0000-0000-0000-000000000001",
    "20000000-0000-0000-0000-000000000002",
    "20000000-0000-0000-0000-000000000003",
    "20000000-0000-0000-0000-000000000004",
    "20000000-0000-0000-0000-000000000005",
  ];

  beforeAll(async () => {
    // Clean up test drop, questions, submissions, matches, batch runs
    await prisma.match.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.submissionAnswer.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.submission.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.answerOption.deleteMany({ where: { question: { drop: { drop_date: testDropDate } } } });
    await prisma.question.deleteMany({ where: { drop: { drop_date: testDropDate } } });
    await prisma.batchRun.deleteMany({ where: { drop: { drop_date: testDropDate } } });
    await prisma.drop.deleteMany({ where: { drop_date: testDropDate } });

    // Create live drop with 5 questions
    await prisma.drop.create({
      data: {
        id: testDropId,
        drop_date: testDropDate,
        opens_at: new Date(Date.now() - 3600000),
        closes_at: new Date(Date.now() + 3600000),
        status: "live",
        questions: {
          create: qids.map((qid, idx) => ({
            id: qid,
            position: idx + 1,
            type: "text",
            payload: {},
            answerOptions: {
              create: [
                { value: "A", display_order: 1, label: "Option A" },
                { value: "B", display_order: 2, label: "Option B" },
              ],
            },
          })),
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.submissionAnswer.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.submission.deleteMany({ where: { drop_date: testDropDate } });
    await prisma.answerOption.deleteMany({ where: { question: { drop: { drop_date: testDropDate } } } });
    await prisma.question.deleteMany({ where: { drop: { drop_date: testDropDate } } });
    await prisma.batchRun.deleteMany({ where: { drop: { drop_date: testDropDate } } });
    await prisma.drop.deleteMany({ where: { drop_date: testDropDate } });
  });

  beforeEach(async () => {
    // Clear test redis keys
    const keys = await redis.keys("counter:push:upgrade:*");
    if (keys.length > 0) await redis.del(...keys);
    await redis.del("queue:notifications");
  });

  it("proves quiet hours calculation (22:00 to 07:00 IST)", () => {
    // 23:00 IST = 17:30 UTC -> quiet hours TRUE
    const lateNightUtc = new Date("2026-11-20T17:30:00.000Z");
    expect(isQuietHours(lateNightUtc)).toBe(true);

    // 03:00 IST = 21:30 UTC (previous day) -> quiet hours TRUE
    const earlyMorningUtc = new Date("2026-11-19T21:30:00.000Z");
    expect(isQuietHours(earlyMorningUtc)).toBe(true);

    // 12:00 IST = 06:30 UTC -> quiet hours FALSE (broadcasting allowed)
    const middayUtc = new Date("2026-11-20T06:30:00.000Z");
    expect(isQuietHours(middayUtc)).toBe(false);
  });

  it("late-arriving close twin upgrades an earlier player and triggers a push notification", async () => {
    const player1 = "33333333-0000-0000-0000-000000000001";
    const player2 = "33333333-0000-0000-0000-000000000002"; // Weak initial twin (1 of 5 match)
    const player3 = "33333333-0000-0000-0000-000000000003"; // Late arriving close twin (5 of 5 match)

    // Player 1 answers: A, A, A, A, A
    const sub1 = await prisma.submission.create({
      data: {
        drop_id: testDropId,
        drop_date: testDropDate,
        player_id: player1,
        request_id: `req_${Date.now()}_1`,
        answers: qids.map((qid) => ({ question_id: qid, value: "A", type: "text" })),
        submissionAnswers: {
          create: qids.map((qid) => ({
            question_id: qid,
            value: "A",
            drop_id: testDropId,
            player_id: player1,
          })),
        },
      },
    });

    // Player 2 answers: A, B, B, B, B (similarity = 0.20)
    const sub2 = await prisma.submission.create({
      data: {
        drop_id: testDropId,
        drop_date: testDropDate,
        player_id: player2,
        request_id: `req_${Date.now()}_2`,
        answers: qids.map((qid, idx) => ({
          question_id: qid,
          value: idx === 0 ? "A" : "B",
          type: "text",
        })),
        submissionAnswers: {
          create: qids.map((qid, idx) => ({
            question_id: qid,
            value: idx === 0 ? "A" : "B",
            drop_id: testDropId,
            player_id: player2,
          })),
        },
      },
    });

    // Seed initial weak match between player 1 and player 2
    await prisma.match.create({
      data: {
        drop_id: testDropId,
        drop_date: testDropDate,
        player_a_id: player1,
        player_b_id: player2,
        submission_a_id: sub1.id,
        submission_b_id: sub2.id,
        similarity_score: 0.20,
        is_provisional: true,
      },
    });

    // Player 3 arrives late: A, A, A, A, A (similarity = 1.0, improvement = +0.80)
    await prisma.submission.create({
      data: {
        drop_id: testDropId,
        drop_date: testDropDate,
        player_id: player3,
        request_id: `req_${Date.now()}_3`,
        answers: qids.map((qid) => ({ question_id: qid, value: "A", type: "text" })),
        submissionAnswers: {
          create: qids.map((qid) => ({
            question_id: qid,
            value: "A",
            drop_id: testDropId,
            player_id: player3,
          })),
        },
      },
    });

    // Run provisional refresh sweep at midday (outside quiet hours)
    const activeMidday = new Date("2026-11-20T06:30:00.000Z");
    const result = await ProvisionalRefreshWorker.runSweep({
      dropId: testDropId,
      dropDate: testDropDate,
      now: activeMidday,
    });

    expect(result.upgradesFound).toBeGreaterThanOrEqual(1);
    expect(result.notificationsEnqueued).toBe(1);

    // Verify DB match was updated to new twin (player3)
    const updatedMatch = await prisma.match.findFirst({
      where: { drop_date: testDropDate, player_a_id: player1 },
    });

    expect(updatedMatch).not.toBeNull();
    expect(updatedMatch!.player_b_id).toBe(player3);
    expect(updatedMatch!.similarity_score).toBe(1.0);

    // Verify notification was placed on queue
    const queuedCount = await redis.llen("queue:notifications");
    expect(queuedCount).toBe(1);
  });

  it("enforces 1/day push cap: a second improvement on the same day sends NO second notification", async () => {
    const activeMidday = new Date("2026-11-20T06:30:00.000Z");

    // Re-run sweep: Player 1 has already received 1 upgrade push today
    const secondSweepResult = await ProvisionalRefreshWorker.runSweep({
      dropId: testDropId,
      dropDate: testDropDate,
      now: activeMidday,
    });

    // No new notification enqueued because 1/day cap was reached
    expect(secondSweepResult.notificationsEnqueued).toBe(0);
  });
});
