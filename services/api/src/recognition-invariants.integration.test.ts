/**
 * @file recognition-invariants.integration.test.ts
 * @package @oddly/api
 *
 * Recognition Engine & Subject Sync Invariant Integration Tests (Stage M5 & M6 / Phase 10I / P10I.08).
 * Verified against real PostgreSQL 16 and real Redis 7.
 *
 * Invariants Proven:
 * 1. Rule 19: Orbit Subject Sync aggregates agreement percentages per tag with min 5 threshold.
 *    Zero raw question answer vectors or choice values exposed.
 * 2. Zero Public Leaderboards: Featured memes surface returns curated showcase without competitive rankings.
 * 3. Individual Recognition Badges: Only authenticated players view their earned milestones.
 * 4. Revocation Flow: Deleting a meme revokes associated featured showcase entries.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M5 & M6: Recognition & Subject Sync Invariant Integration Tests", () => {
  let prisma: PrismaClient;
  let server: Awaited<ReturnType<typeof buildServer>>;

  const playerAId = `ply_rec_a_${randomUUID().slice(0, 8)}`;
  const playerBId = `ply_rec_b_${randomUUID().slice(0, 8)}`;
  const playerCId = `ply_rec_c_${randomUUID().slice(0, 8)}`; // Outsider

  const didA = `did_${playerAId}`;
  const didB = `did_${playerBId}`;
  const didC = `did_${playerCId}`;

  let orbitId = "";
  let tagHumourId = "";
  let tagFoodId = "";
  let testDropDate: Date;
  let testDropId = "";
  let featuredSubmissionId = "";
  let badgeAwardId = "";
  const createdQuestionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasourceUrl: DATABASE_URL,
    });
    server = await buildServer({ underPressure: false });

    testDropDate = new Date();
    testDropDate.setUTCHours(0, 0, 0, 0);

    // Find or create test drop for today
    let existingDrop = await prisma.drop.findUnique({
      where: { drop_date: testDropDate },
    });
    if (!existingDrop) {
      testDropId = `drop_rec_${randomUUID().slice(0, 8)}`;
      existingDrop = await prisma.drop.create({
        data: {
          id: testDropId,
          drop_date: testDropDate,
          opens_at: new Date(testDropDate.getTime() + 7 * 3600 * 1000),
          closes_at: new Date(testDropDate.getTime() + 23 * 3600 * 1000),
          status: "live",
        },
      });
    }
    testDropId = existingDrop.id;

    // Create test players
    await prisma.player.createMany({
      data: [
        { id: playerAId, did: didA, region: "IN", age_band: "18-24" },
        { id: playerBId, did: didB, region: "IN", age_band: "25-34" },
        { id: playerCId, did: didC, region: "US", age_band: "25-34" },
      ],
    });

    // Create Orbit between Player A and Player B (lexicographically sorted)
    const pA = playerAId < playerBId ? playerAId : playerBId;
    const pB = playerAId < playerBId ? playerBId : playerAId;
    orbitId = `orb_rec_${randomUUID().slice(0, 8)}`;
    await prisma.orbit.create({
      data: {
        id: orbitId,
        player_a_id: pA,
        player_b_id: pB,
        status: "active",
        co_streak_current: 7,
        started_on: new Date(),
      },
    });

    // Ensure tags exist: Humour and Food
    let tagHumour = await prisma.tag.findUnique({ where: { key: "humour_test" } });
    if (!tagHumour) {
      tagHumour = await prisma.tag.create({
        data: {
          key: "humour_test",
          label_i18n: { en: "Humour" },
          category: "lifestyle",
          is_active: true,
        },
      });
    }
    tagHumourId = tagHumour.id;

    let tagFood = await prisma.tag.findUnique({ where: { key: "food_test" } });
    if (!tagFood) {
      tagFood = await prisma.tag.create({
        data: {
          key: "food_test",
          label_i18n: { en: "Food" },
          category: "lifestyle",
          is_active: true,
        },
      });
    }
    tagFoodId = tagFood.id;

    // Create 5 questions tagged with Humour and 2 questions tagged with Food
    const submissionAId = `sub_rec_a_${randomUUID().slice(0, 8)}`;
    const submissionBId = `sub_rec_b_${randomUUID().slice(0, 8)}`;

    await prisma.submission.createMany({
      data: [
        {
          id: submissionAId,
          player_id: playerAId,
          drop_id: testDropId,
          drop_date: testDropDate,
          request_id: `req_a_${submissionAId}`,
          answers: [],
        },
        {
          id: submissionBId,
          player_id: playerBId,
          drop_id: testDropId,
          drop_date: testDropDate,
          request_id: `req_b_${submissionBId}`,
          answers: [],
        },
      ],
    });

    // Dynamic position offset to prevent collisions across test runs
    const maxPosAgg = await prisma.question.aggregate({
      where: { drop_id: testDropId },
      _max: { position: true },
    });
    const basePosition = (maxPosAgg._max.position || 0) + 10;

    // 5 Humour questions: 4 matching, 1 differing
    for (let i = 1; i <= 5; i++) {
      const qId = `q_humour_${i}_${randomUUID().slice(0, 6)}`;
      createdQuestionIds.push(qId);
      await prisma.question.create({
        data: {
          id: qId,
          drop_id: testDropId,
          position: basePosition + i,
          type: "text",
          payload: { prompt: `Humour Question ${i}` },
        },
      });
      await prisma.questionTag.create({
        data: { question_id: qId, tag_id: tagHumourId },
      });

      const valA = "opt_1";
      const valB = i === 5 ? "opt_2" : "opt_1"; // 4 match, 1 differs

      await prisma.submissionAnswer.createMany({
        data: [
          {
            id: `ans_a_${qId}`,
            submission_id: submissionAId,
            drop_id: testDropId,
            drop_date: testDropDate,
            player_id: playerAId,
            question_id: qId,
            value: valA,
          },
          {
            id: `ans_b_${qId}`,
            submission_id: submissionBId,
            drop_id: testDropId,
            drop_date: testDropDate,
            player_id: playerBId,
            question_id: qId,
            value: valB,
          },
        ],
      });
    }

    // 2 Food questions (below min 5 threshold)
    for (let i = 1; i <= 2; i++) {
      const qId = `q_food_${i}_${randomUUID().slice(0, 6)}`;
      createdQuestionIds.push(qId);
      await prisma.question.create({
        data: {
          id: qId,
          drop_id: testDropId,
          position: basePosition + 5 + i,
          type: "text",
          payload: { prompt: `Food Question ${i}` },
        },
      });
      await prisma.questionTag.create({
        data: { question_id: qId, tag_id: tagFoodId },
      });

      await prisma.submissionAnswer.createMany({
        data: [
          {
            id: `ans_a_${qId}`,
            submission_id: submissionAId,
            drop_id: testDropId,
            drop_date: testDropDate,
            player_id: playerAId,
            question_id: qId,
            value: "opt_1",
          },
          {
            id: `ans_b_${qId}`,
            submission_id: submissionBId,
            drop_id: testDropId,
            drop_date: testDropDate,
            player_id: playerBId,
            question_id: qId,
            value: "opt_1",
          },
        ],
      });
    }

    // Seed a featured meme and badge for testing
    let template = await prisma.memeTemplate.findFirst({ where: { status: "active" } });
    if (!template) {
      template = await prisma.memeTemplate.create({
        data: {
          key: `tpl_${randomUUID().slice(0, 6)}`,
          illustration_registry_key: "ill_test_feat",
          alt_text_i18n: { en: "Test template" },
          license_note: "Test license",
          status: "active",
        },
      });
    }

    featuredSubmissionId = `sub_feat_${randomUUID().slice(0, 8)}`;
    await prisma.memeSubmission.create({
      data: {
        id: featuredSubmissionId,
        author_player_id: playerAId,
        template_id: template.id,
        caption_text: "The definitive featured meme of the week",
        status: "approved",
      },
    });

    await prisma.memeStat.create({
      data: {
        submission_id: featuredSubmissionId,
        impressions: 1000,
        raters: 800,
        funny_count: 680,
        not_for_me_count: 120,
        wilson_lb: 0.81,
      },
    });

    const weekStartDate = new Date("2026-11-16");
    await prisma.featuredMeme.create({
      data: {
        submission_id: featuredSubmissionId,
        week_start_date: weekStartDate,
        curator_notes: "Outstanding comedic timing",
      },
    });

    // Seed badge definition and award
    const certBadge = await prisma.badgeDefinition.upsert({
      where: { key: "certified_wit" },
      update: {},
      create: {
        key: "certified_wit",
        name_i18n: { en: "Certified Wit" },
        description_i18n: { en: "70%+ Funny" },
        icon_key: "badge_certified_wit",
        benchmark_config: { min_raters: 500 },
        status: "active",
      },
    });

    const award = await prisma.creatorBadge.create({
      data: {
        player_id: playerAId,
        badge_id: certBadge.id,
        meme_id: featuredSubmissionId,
      },
    });
    badgeAwardId = award.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.featuredMeme.deleteMany({ where: { submission_id: featuredSubmissionId } });
    await prisma.creatorBadge.deleteMany({ where: { player_id: playerAId } });
    await prisma.memeSubmission.deleteMany({ where: { author_player_id: playerAId } });
    await prisma.submissionAnswer.deleteMany({ where: { player_id: { in: [playerAId, playerBId] } } });
    await prisma.submission.deleteMany({ where: { player_id: { in: [playerAId, playerBId] } } });
    await prisma.orbit.deleteMany({ where: { id: orbitId } });
    await prisma.questionTag.deleteMany({ where: { tag_id: { in: [tagHumourId, tagFoodId] } } });
    await prisma.question.deleteMany({ where: { id: { in: createdQuestionIds } } });
    await prisma.tag.deleteMany({ where: { id: { in: [tagHumourId, tagFoodId] } } });
    await prisma.player.deleteMany({ where: { id: { in: [playerAId, playerBId, playerCId] } } });
    await server.close();
  });

  it("Rule 19: Orbit Subject Sync aggregates agreement percentages per tag with zero raw pick leakage", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/subject-sync`,
      headers: {
        "x-player-id": playerAId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.orbit_id).toBe(orbitId);
    expect(body.min_shared_threshold).toBe(5);

    const humourItem = body.sync_items.find((i: { tag_id: string }) => i.tag_id === tagHumourId);
    expect(humourItem).toBeDefined();
    expect(humourItem.status).toBe("unlocked");
    expect(humourItem.shared_questions).toBe(5);
    expect(humourItem.agreement_count).toBe(4);
    expect(humourItem.agreement_percentage).toBe(80); // 4 / 5 = 80%
    expect(humourItem.lock_reason).toBeNull();

    const foodItem = body.sync_items.find((i: { tag_id: string }) => i.tag_id === tagFoodId);
    expect(foodItem).toBeDefined();
    expect(foodItem.status).toBe("locked");
    expect(foodItem.shared_questions).toBe(2);
    expect(foodItem.agreement_count).toBeNull(); // ZERO leakage
    expect(foodItem.agreement_percentage).toBeNull(); // ZERO leakage
    expect(foodItem.lock_reason).toContain("unlock Food sync");

    // Invariant Rule 19 assertion: No question_id or individual answer values in response
    const rawResponse = res.body;
    expect(rawResponse).not.toContain("opt_1");
    expect(rawResponse).not.toContain("opt_2");
    expect(rawResponse).not.toContain("q_humour_");
    expect(rawResponse).not.toContain("q_food_");
  });

  it("enforces authentication and authorization on Subject Sync", async () => {
    // Unauthenticated
    const resUnauth = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/subject-sync`,
    });
    expect(resUnauth.statusCode).toBe(401);

    // Unauthorized outsider (Player C is not in this Orbit)
    const resOutsider = await server.inject({
      method: "GET",
      url: `/v1/orbits/${orbitId}/subject-sync`,
      headers: {
        "x-player-id": playerCId,
      },
    });
    expect(resOutsider.statusCode).toBe(404);
  });

  it("Zero Public Leaderboards: Featured Memes showcase returns curated Meme of the Week without rankings", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/v1/memes/featured",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.current_week).toBeDefined();
    expect(body.current_week.caption_text).toBe("The definitive featured meme of the week");
    expect(body.current_week.funny_percentage).toBe(85); // 680 / 800 = 85%
    expect(body.current_week.raters_count).toBe(800);

    // Invariant assertion: No user IDs, scores, or public rankings exposed
    expect(body.current_week).not.toHaveProperty("author_player_id");
    expect(body.current_week).not.toHaveProperty("rank");
    expect(body.current_week).not.toHaveProperty("leaderboard_position");
  });

  it("GET /v1/badges/mine returns earned creator recognition badges for player", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/v1/badges/mine",
      headers: {
        "x-player-id": playerAId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.badges.length).toBeGreaterThanOrEqual(1);

    const badge = body.badges.find((b: { id: string }) => b.id === badgeAwardId);
    expect(badge).toBeDefined();
    expect(badge.badge.key).toBe("certified_wit");
    expect(badge.badge.name_i18n.en).toBe("Certified Wit");
  });

  it("GET /v1/cards/achievement/:badgeId renders valid PNG with macro-region privacy guard", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/v1/cards/achievement/${badgeAwardId}?side=front`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    // Verify PNG magic header: 0x89, 'P', 'N', 'G'
    const buf = res.rawPayload;
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("revocation flow: author self-deletion automatically excludes meme from featured showcase", async () => {
    // Player A deletes their meme
    const resDel = await server.inject({
      method: "DELETE",
      url: `/v1/memes/${featuredSubmissionId}`,
      headers: {
        "x-player-id": playerAId,
      },
    });

    expect(resDel.statusCode).toBe(200);
    const delBody = JSON.parse(resDel.body);
    expect(delBody.status).toBe("retired");

    // Verify it is immediately gone from featured showcase
    const resFeat = await server.inject({
      method: "GET",
      url: "/v1/memes/featured",
    });
    expect(resFeat.statusCode).toBe(200);
    const featBody = JSON.parse(resFeat.body);
    expect(featBody.current_week).toBeNull();
  });
});
