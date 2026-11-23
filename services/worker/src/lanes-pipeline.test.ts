/**
 * @file lanes-pipeline.test.ts
 * @package @oddly/worker
 *
 * Stage L1: Lanes Plumbing & Daily Pipeline Tests (P10L.03).
 * Verifies per-lane Drop staging, opening, closure, and lane-keyed Redis cache.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Redis } from "ioredis";
import { PipelineWorker } from "./workers/pipeline.worker.js";
import { DailyScheduler } from "./scheduler.js";
import { prisma } from "./db.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const TEST_DATE = "2026-11-29"; // Distinct test twin day

describe("Stage L1: Lanes Plumbing Pipeline & Scheduling (P10L.03)", () => {
  let redis: Redis;
  let testEverydayDropId: string;
  let testMemesDropId: string;
  let everydayLaneId: string;
  let memesLaneId: string;

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);

    // 1. Fetch or ensure Everyday and Memes lanes exist
    const everyday = await prisma.lane.upsert({
      where: { slug: "everyday" },
      create: {
        id: "00000000-0000-4000-a000-000000000001",
        slug: "everyday",
        name_key: "lane.everyday.name",
        description_key: "lane.everyday.desc",
        accent_token: "violet",
        icon_key: "sparkles",
        status: "open",
        sort_order: 1,
      },
      update: { status: "open" },
    });
    everydayLaneId = everyday.id;

    const memes = await prisma.lane.upsert({
      where: { slug: "memes" },
      create: {
        id: "00000000-0000-4000-a000-000000000002",
        slug: "memes",
        name_key: "lane.memes.name",
        description_key: "lane.memes.desc",
        accent_token: "sun",
        icon_key: "laugh",
        status: "open",
        sort_order: 2,
      },
      update: { status: "open" },
    });
    memesLaneId = memes.id;

    // 2. Clean any prior test drops for TEST_DATE
    const existingDrops = await prisma.drop.findMany({
      where: { drop_date: new Date(`${TEST_DATE}T00:00:00.000Z`) },
    });
    for (const d of existingDrops) {
      await prisma.answerOption.deleteMany({ where: { question: { drop_id: d.id } } });
      await prisma.question.deleteMany({ where: { drop_id: d.id } });
      await prisma.drop.delete({ where: { id: d.id } });
    }

    // 3. Create Everyday test drop with 5 questions
    const evDrop = await prisma.drop.create({
      data: {
        drop_date: new Date(`${TEST_DATE}T00:00:00.000Z`),
        opens_at: new Date(`${TEST_DATE}T01:30:00.000Z`),
        closes_at: new Date(`${TEST_DATE}T18:29:00.000Z`),
        status: "pending",
        lane_id: everydayLaneId,
      },
    });
    testEverydayDropId = evDrop.id;

    for (let pos = 1; pos <= 5; pos++) {
      const q = await prisma.question.create({
        data: {
          drop_id: testEverydayDropId,
          lane_id: everydayLaneId,
          position: pos,
          type: "text",
          format: "pick1",
          payload: { prompt: `Everyday Question ${pos}` },
        },
      });
      await prisma.answerOption.createMany({
        data: [
          { question_id: q.id, label: "Option A", value: "A", display_order: 1 },
          { question_id: q.id, label: "Option B", value: "B", display_order: 2 },
        ],
      });
    }

    // 4. Create Memes test drop with 5 questions
    const memeDrop = await prisma.drop.create({
      data: {
        drop_date: new Date(`${TEST_DATE}T00:00:00.000Z`),
        opens_at: new Date(`${TEST_DATE}T01:30:00.000Z`),
        closes_at: new Date(`${TEST_DATE}T18:29:00.000Z`),
        status: "pending",
        lane_id: memesLaneId,
      },
    });
    testMemesDropId = memeDrop.id;

    for (let pos = 1; pos <= 5; pos++) {
      const q = await prisma.question.create({
        data: {
          drop_id: testMemesDropId,
          lane_id: memesLaneId,
          position: pos,
          type: "image",
          format: "pick1",
          payload: { prompt: `Meme Question ${pos}` },
        },
      });
      await prisma.answerOption.createMany({
        data: [
          { question_id: q.id, label: "Meme Choice 1", value: "M1", display_order: 1 },
          { question_id: q.id, label: "Meme Choice 2", value: "M2", display_order: 2 },
        ],
      });
    }

    // Clear test Redis keys
    await redis.del(
      `cache:drop:${TEST_DATE}:pre_cache`,
      `cache:drop:${TEST_DATE}:status`,
      `lane:everyday:drop:${TEST_DATE}`,
      `lane:everyday:drop:${TEST_DATE}:status`,
      `lane:memes:drop:${TEST_DATE}`,
      `lane:memes:drop:${TEST_DATE}:status`
    );
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEverydayDropId) {
      await prisma.answerOption.deleteMany({ where: { question: { drop_id: testEverydayDropId } } });
      await prisma.question.deleteMany({ where: { drop_id: testEverydayDropId } });
      await prisma.drop.delete({ where: { id: testEverydayDropId } });
    }
    if (testMemesDropId) {
      await prisma.answerOption.deleteMany({ where: { question: { drop_id: testMemesDropId } } });
      await prisma.question.deleteMany({ where: { drop_id: testMemesDropId } });
      await prisma.drop.delete({ where: { id: testMemesDropId } });
    }

    await redis.del(
      `cache:drop:${TEST_DATE}:pre_cache`,
      `cache:drop:${TEST_DATE}:status`,
      `lane:everyday:drop:${TEST_DATE}`,
      `lane:everyday:drop:${TEST_DATE}:status`,
      `lane:memes:drop:${TEST_DATE}`,
      `lane:memes:drop:${TEST_DATE}:status`
    );
    await redis.quit();
  });

  it("stages drop with lane-keyed Redis cache (lane:everyday:drop:DATE and lane:memes:drop:DATE)", async () => {
    // Stage all drops for TEST_DATE
    const res = await PipelineWorker.executeStageDrop(redis, TEST_DATE);
    expect(res.ok).toBe(true);
    expect(res.lanesStaged).toBeGreaterThanOrEqual(2);

    // Verify lane-keyed Redis cache
    const evCached = await redis.get(`lane:everyday:drop:${TEST_DATE}`);
    expect(evCached).not.toBeNull();
    const parsedEv = JSON.parse(evCached!);
    expect(parsedEv.id).toBe(testEverydayDropId);
    expect(parsedEv.lane_slug).toBe("everyday");
    expect(parsedEv.questions.length).toBe(5);

    const memesCached = await redis.get(`lane:memes:drop:${TEST_DATE}`);
    expect(memesCached).not.toBeNull();
    const parsedMemes = JSON.parse(memesCached!);
    expect(parsedMemes.id).toBe(testMemesDropId);
    expect(parsedMemes.lane_slug).toBe("memes");
    expect(parsedMemes.questions.length).toBe(5);

    // Verify legacy cache compatibility for Everyday lane
    const legacyPre = await redis.get(`cache:drop:${TEST_DATE}:pre_cache`);
    expect(legacyPre).not.toBeNull();
  });

  it("proves stage drop idempotency per lane", async () => {
    const res = await PipelineWorker.executeStageDrop(redis, TEST_DATE, "memes");
    expect(res.ok).toBe(true);
    expect(res.alreadyStaged).toBe(true);
    expect(res.laneSlug).toBe("memes");
  });

  it("transitions drop to live and sets lane-keyed live status", async () => {
    const res = await PipelineWorker.executeOpenDrop(redis, TEST_DATE);
    expect(res.ok).toBe(true);
    expect(res.lanesOpened).toBeGreaterThanOrEqual(2);

    // Verify live status in Redis
    const evStatus = await redis.get(`lane:everyday:drop:${TEST_DATE}:status`);
    expect(evStatus).toBe("live");

    const memesStatus = await redis.get(`lane:memes:drop:${TEST_DATE}:status`);
    expect(memesStatus).toBe("live");

    // Verify DB updated
    const dEv = await prisma.drop.findUnique({ where: { id: testEverydayDropId } });
    expect(dEv?.status).toBe("live");
    const dMemes = await prisma.drop.findUnique({ where: { id: testMemesDropId } });
    expect(dMemes?.status).toBe("live");
  });

  it("proves open drop idempotency per lane", async () => {
    const res = await PipelineWorker.executeOpenDrop(redis, TEST_DATE, "everyday");
    expect(res.ok).toBe(true);
    expect(res.alreadyOpen).toBe(true);
  });

  it("closes drop and sets closed status in DB and lane-keyed Redis cache", async () => {
    const res = await PipelineWorker.executeCloseDrop(redis, TEST_DATE);
    expect(res.ok).toBe(true);
    expect(res.lanesClosed).toBeGreaterThanOrEqual(2);

    const evStatus = await redis.get(`lane:everyday:drop:${TEST_DATE}:status`);
    expect(evStatus).toBe("closed");
    const memesStatus = await redis.get(`lane:memes:drop:${TEST_DATE}:status`);
    expect(memesStatus).toBe("closed");

    const dEv = await prisma.drop.findUnique({ where: { id: testEverydayDropId } });
    expect(dEv?.status).toBe("closed");
  });

  it("DailyScheduler can trigger per-lane staging and opening", async () => {
    const scheduler = new DailyScheduler();
    scheduler.initQueue(redis);

    expect(typeof scheduler.triggerStageDrop).toBe("function");
    expect(typeof scheduler.triggerOpenDrop).toBe("function");
    expect(typeof scheduler.triggerDropClosure).toBe("function");
  });
});

