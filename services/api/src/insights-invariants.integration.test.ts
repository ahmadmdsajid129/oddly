/**
 * @file insights-invariants.integration.test.ts
 * @package @oddly/api
 *
 * Insights Engine & Invariants Integration Suite (Stage M4 / Phase 10H / Tasks P10H.04 - P10H.09).
 *
 * Invariants Verified:
 * 1. Rule 12 (Identical Drop Rule): Daily Drop questions returned to users with opposite taste profiles are 100% IDENTICAL.
 * 2. Rule 14 (No Sensitive Inference): Build-fail test verifying zero taxonomy overlap with Section 9.1 forbidden topics.
 * 3. P10H.04 (Category Performance): Aggregates completions, viral share lift, and dwell times by tag.
 * 4. P10H.05 (Question Quality Flags): Automated flags for high dwell (>12s), high abandon (>3%), report spikes.
 * 5. P10H.07 (Drop Planning Advisory): Fatigue warnings triggered when a tag is scheduled > 2 times in 4 consecutive days.
 * 6. P10H.08 (Personalized Ranking): Non-drop Meme Corner favors matching taste affinity without affecting Drop ritual.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { MemesRepository } from "./db/memes.repo.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

// Forbidden topic keywords from Spec Section 9.1 / Rule 14
const FORBIDDEN_TOPIC_KEYWORDS = [
  "religion",
  "hindu",
  "muslim",
  "christian",
  "sikh",
  "jain",
  "buddhist",
  "caste",
  "brahmin",
  "dalit",
  "politics",
  "bjp",
  "congress",
  "election",
  "modi",
  "rahul",
  "sexual_orientation",
  "lgbtq",
  "illness",
  "depression",
  "suicide",
  "salary",
  "wealth",
  "income",
];

describe("Stage M4 (Phase 10H): Insights Engine & Invariants Test Suite", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let repo: MemesRepository;

  let playerHumourFanId: string;
  let playerQuirksFanId: string;
  let deviceHumour: string;
  let deviceQuirks: string;

  let tagHumourId: string;
  let tagQuirksId: string;
  let dropId: string;
  let dropDate: Date;
  let questionIds: string[] = [];
  let templateHumourId: string;
  let templateQuirksId: string;
  let submissionHumourId: string;
  let submissionQuirksId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
    repo = new MemesRepository(prisma);

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Seed two neutral tags
    const t1 = await prisma.tag.create({
      data: {
        id: `tag-inv-${randomUUID().slice(0, 8)}`,
        key: `humour_${randomUUID().slice(0, 6)}`,
        category: "humour",
        label_i18n: { en: "Humour & Wit" },
        is_active: true,
      },
    });
    tagHumourId = t1.id;

    const t2 = await prisma.tag.create({
      data: {
        id: `tag-inv-${randomUUID().slice(0, 8)}`,
        key: `quirks_${randomUUID().slice(0, 6)}`,
        category: "quirks",
        label_i18n: { en: "Daily Quirks" },
        is_active: true,
      },
    });
    tagQuirksId = t2.id;

    // 2. Create isolated test Drop on 2026-11-28
    const dropDateStr = "2026-11-28";
    dropDate = new Date(`${dropDateStr}T00:00:00.000Z`);

    const drop = await prisma.drop.upsert({
      where: { drop_date: dropDate },
      update: { status: "live" },
      create: {
        drop_date: dropDate,
        opens_at: new Date(Date.now() - 3600000),
        closes_at: new Date(Date.now() + 36000000),
        status: "live",
      },
    });
    dropId = drop.id;

    // Clean any prior questions on this test drop
    const existingQ = await prisma.question.findMany({ where: { drop_id: dropId } });
    if (existingQ.length > 0) {
      const qIds = existingQ.map((q) => q.id);
      await prisma.answerOption.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.questionTag.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.question.deleteMany({ where: { drop_id: dropId } });
    }

    // 3. Create Drop questions
    for (let pos = 1; pos <= 5; pos++) {
      const q = await prisma.question.create({
        data: {
          id: `q-inv-${pos}-${randomUUID().slice(0, 6)}`,
          drop_id: dropId,
          position: pos,
          type: "text",
          render_variant: "standard",
          payload: {
            prompt_i18n: { en: `Invariant Drop Question ${pos}` },
            options: [
              { id: "opt_1", text: "Option A" },
              { id: "opt_2", text: "Option B" },
            ],
          },
        },
      });
      questionIds.push(q.id);

      // Link Question 1 to Humour tag
      if (pos === 1) {
        await prisma.questionTag.create({
          data: { question_id: q.id, tag_id: tagHumourId },
        });
      }
    }

    // 4. Create players with opposite tastes
    deviceHumour = `did-humour-${randomUUID().slice(0, 8)}`;
    const p1 = await prisma.player.create({
      data: { did: deviceHumour, region: "IN", age_band: "18-24" },
    });
    playerHumourFanId = p1.id;

    deviceQuirks = `did-quirks-${randomUUID().slice(0, 8)}`;
    const p2 = await prisma.player.create({
      data: { did: deviceQuirks, region: "IN", age_band: "18-24" },
    });
    playerQuirksFanId = p2.id;

    // Consents
    await prisma.consent.createMany({
      data: [
        { player_id: playerHumourFanId, purpose: "personalisation", policy_version: 1 },
        { player_id: playerQuirksFanId, purpose: "personalisation", policy_version: 1 },
      ],
    });

    // Populate opposite taste records
    await prisma.playerTaste.createMany({
      data: [
        { player_id: playerHumourFanId, tag_id: tagHumourId, affinity_score: 0.95, sample_size: 25 },
        { player_id: playerHumourFanId, tag_id: tagQuirksId, affinity_score: 0.05, sample_size: 25 },
        { player_id: playerQuirksFanId, tag_id: tagHumourId, affinity_score: 0.05, sample_size: 25 },
        { player_id: playerQuirksFanId, tag_id: tagQuirksId, affinity_score: 0.95, sample_size: 25 },
      ],
    });

    // 5. Create templates and meme submissions for Meme Corner ranking
    const tmpl1 = await prisma.memeTemplate.create({
      data: {
        id: `tmpl-h-${randomUUID().slice(0, 8)}`,
        key: `tmpl-humour-${randomUUID().slice(0, 6)}`,
        illustration_registry_key: "chart_divergent_bars",
        alt_text_i18n: { en: "Humour template" },
        license_note: "Test",
      },
    });
    templateHumourId = tmpl1.id;

    const tmpl2 = await prisma.memeTemplate.create({
      data: {
        id: `tmpl-q-${randomUUID().slice(0, 8)}`,
        key: `tmpl-quirks-${randomUUID().slice(0, 6)}`,
        illustration_registry_key: "chart_distribution_bell",
        alt_text_i18n: { en: "Quirks template" },
        license_note: "Test",
      },
    });
    templateQuirksId = tmpl2.id;

    // Connect templates to tags via separate dummy drop to avoid position collision
    const tmplDropDate = new Date("2026-10-15T00:00:00.000Z");
    const tmplDrop = await prisma.drop.upsert({
      where: { drop_date: tmplDropDate },
      update: {},
      create: {
        drop_date: tmplDropDate,
        opens_at: tmplDropDate,
        closes_at: tmplDropDate,
        status: "closed",
      },
    });

    const existingTmplQ = await prisma.question.findMany({ where: { drop_id: tmplDrop.id } });
    if (existingTmplQ.length > 0) {
      const qIds = existingTmplQ.map((q) => q.id);
      await prisma.answerOption.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.questionTag.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.question.deleteMany({ where: { drop_id: tmplDrop.id } });
    }

    const qTmpl1 = await prisma.question.create({
      data: {
        id: `q-tmpl-1-${randomUUID().slice(0, 6)}`,
        drop_id: tmplDrop.id,
        position: 1,
        type: "text",
        template_id: templateHumourId,
        payload: { prompt_i18n: { en: "Tmpl1" }, options: [{ id: "1", text: "1" }] },
      },
    });
    await prisma.questionTag.create({ data: { question_id: qTmpl1.id, tag_id: tagHumourId } });
    questionIds.push(qTmpl1.id);

    const qTmpl2 = await prisma.question.create({
      data: {
        id: `q-tmpl-2-${randomUUID().slice(0, 6)}`,
        drop_id: tmplDrop.id,
        position: 2,
        type: "text",
        template_id: templateQuirksId,
        payload: { prompt_i18n: { en: "Tmpl2" }, options: [{ id: "1", text: "1" }] },
      },
    });
    await prisma.questionTag.create({ data: { question_id: qTmpl2.id, tag_id: tagQuirksId } });
    questionIds.push(qTmpl2.id);

    // Create 2 approved meme submissions with equal Wilson scores (0.80)
    const sub1 = await prisma.memeSubmission.create({
      data: {
        author_player_id: playerHumourFanId,
        template_id: templateHumourId,
        caption_text: "Humour Meme: Coding at 3am",
        status: "approved",
      },
    });
    submissionHumourId = sub1.id;

    await prisma.memeStat.create({
      data: {
        submission_id: sub1.id,
        impressions: 50,
        raters: 250,
        funny_count: 220,
        not_for_me_count: 30,
        wilson_lb: 0.80,
      },
    });

    const sub2 = await prisma.memeSubmission.create({
      data: {
        author_player_id: playerQuirksFanId,
        template_id: templateQuirksId,
        caption_text: "Quirks Meme: Organized desk chaos",
        status: "approved",
      },
    });
    submissionQuirksId = sub2.id;

    await prisma.memeStat.create({
      data: {
        submission_id: sub2.id,
        impressions: 50,
        raters: 250,
        funny_count: 220,
        not_for_me_count: 30,
        wilson_lb: 0.80,
      },
    });
  });

  afterAll(async () => {
    const subIds = [submissionHumourId, submissionQuirksId].filter(Boolean);
    if (subIds.length > 0) {
      await prisma.memeStat.deleteMany({
        where: { submission_id: { in: subIds } },
      });
      await prisma.memeExposure.deleteMany({
        where: { submission_id: { in: subIds } },
      });
      await prisma.memeSubmission.deleteMany({
        where: { id: { in: subIds } },
      });
    }
    const pIds = [playerHumourFanId, playerQuirksFanId].filter(Boolean);
    if (pIds.length > 0) {
      await prisma.playerTaste.deleteMany({
        where: { player_id: { in: pIds } },
      });
      await prisma.consent.deleteMany({
        where: { player_id: { in: pIds } },
      });
    }
    if (questionIds.length > 0) {
      await prisma.questionTag.deleteMany({
        where: { question_id: { in: questionIds } },
      });
      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }
    const tmplIds = [templateHumourId, templateQuirksId].filter(Boolean);
    if (tmplIds.length > 0) {
      await prisma.memeTemplate.deleteMany({
        where: { id: { in: tmplIds } },
      });
    }
    const tIds = [tagHumourId, tagQuirksId].filter(Boolean);
    if (tIds.length > 0) {
      await prisma.tag.deleteMany({
        where: { id: { in: tIds } },
      });
    }
    if (pIds.length > 0) {
      await prisma.player.deleteMany({
        where: { id: { in: pIds } },
      });
    }
    await app.close();
    await prisma.$disconnect();
  });

  // ==========================================================================
  // Invariant 1: Rule 12 (Identical Drop Rule)
  // ==========================================================================
  it("Rule 12: Daily Drop questions returned to users with opposite taste profiles are 100% IDENTICAL", async () => {
    const dropDateStr = "2026-11-28";

    // Player 1 (loves humour, hates quirks) requests today's drop
    const res1 = await app.inject({
      method: "GET",
      url: `/v1/drop/${dropDateStr}`,
      headers: { "x-device-id": deviceHumour },
    });
    expect(res1.statusCode).toBe(200);
    const body1 = res1.json();

    // Player 2 (hates humour, loves quirks) requests today's drop
    const res2 = await app.inject({
      method: "GET",
      url: `/v1/drop/${dropDateStr}`,
      headers: { "x-device-id": deviceQuirks },
    });
    expect(res2.statusCode).toBe(200);
    const body2 = res2.json();

    // Assert absolute identical payload structure
    expect(body1.id).toBe(body2.id);
    expect(body1.drop_date).toBe(body2.drop_date);
    expect(body1.questions.length).toBe(body2.questions.length);

    for (let i = 0; i < body1.questions.length; i++) {
      const q1 = body1.questions[i];
      const q2 = body2.questions[i];

      expect(q1.id).toBe(q2.id);
      expect(q1.position).toBe(q2.position);
      expect(q1.payload).toEqual(q2.payload);
      expect(q1.render_variant).toBe(q2.render_variant);
    }
  });

  // ==========================================================================
  // Invariant 2: Rule 14 (Zero Sensitive Inferences in Taxonomy)
  // ==========================================================================
  it("Rule 14: Verifies zero taxonomy overlap with Section 9.1 forbidden topics", async () => {
    const allTags = await prisma.tag.findMany({ select: { key: true, category: true, label_i18n: true } });

    for (const tag of allTags) {
      const labelText = JSON.stringify(tag.label_i18n).toLowerCase();
      const tagKey = tag.key.toLowerCase();
      const category = tag.category.toLowerCase();

      for (const forbidden of FORBIDDEN_TOPIC_KEYWORDS) {
        expect(tagKey).not.toContain(forbidden);
        expect(category).not.toContain(forbidden);
        expect(labelText).not.toContain(forbidden);
      }
    }
  });

  // ==========================================================================
  // Invariant 3: P10H.04 Category Performance Analytics
  // ==========================================================================
  it("P10H.04: Category performance API returns completion, viral share lift, and dwell time", async () => {
    // Seed some tag_stats_daily for tagHumour
    await prisma.tagStatsDaily.upsert({
      where: {
        drop_date_tag_id: {
          drop_date: dropDate,
          tag_id: tagHumourId,
        },
      },
      create: {
        drop_date: dropDate,
        tag_id: tagHumourId,
        completions: 100,
        share_count: 20,
        dwell_p50_ms: 4500,
      },
      update: {
        completions: 100,
        share_count: 20,
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/insights/tags/performance?days=14",
      headers: { "x-admin-id": "admin-1", "x-admin-role": "admin" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.tags.length).toBeGreaterThanOrEqual(1);

    const humourStat = body.tags.find((t: { tagId: string }) => t.tagId === tagHumourId);
    expect(humourStat).toBeDefined();
    expect(humourStat.completions).toBe(100);
    expect(humourStat.shareCount).toBe(20);
    expect(humourStat.viralShareLift).toBeGreaterThan(0);
  });

  // ==========================================================================
  // Invariant 4: P10H.05 Question Quality Flagging Engine
  // ==========================================================================
  it("P10H.05: Question quality flagging detects high dwell (>12s) and high abandon (>3%)", async () => {
    // Seed high friction & high abandonment on Question 1
    await prisma.questionStatsDaily.upsert({
      where: {
        drop_date_question_id: {
          drop_date: dropDate,
          question_id: questionIds[0],
        },
      },
      create: {
        drop_date: dropDate,
        question_id: questionIds[0],
        shown_count: 50,
        answered_count: 45,
        dwell_p50_ms: 14500, // > 12s -> HIGH_FRICTION
        dwell_p90_ms: 22000,
        change_rate: 0.40, // > 35% -> HIGH_FRICTION
        back_rate: 0.10,
        abandon_rate: 0.05, // > 3.0% -> HIGH_ABANDONMENT
        report_rate: 0.0,
        entropy: 0.85,
      },
      update: {
        dwell_p50_ms: 14500,
        change_rate: 0.40,
        abandon_rate: 0.05,
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/v1/admin/insights/questions/flags?min_submissions=20&drop_date=${dropDate.toISOString().split("T")[0]}`,
      headers: { "x-admin-id": "admin-1", "x-admin-role": "admin" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.questions.length).toBeGreaterThanOrEqual(1);

    const flagged = body.questions.find((q: { questionId: string }) => q.questionId === questionIds[0]);
    expect(flagged).toBeDefined();

    const flagTypes = flagged.flags.map((f: { type: string }) => f.type);
    expect(flagTypes).toContain("HIGH_FRICTION");
    expect(flagTypes).toContain("HIGH_ABANDONMENT");
  });

  // ==========================================================================
  // Invariant 5: P10H.07 Drop Planning Advisory & Fatigue Lint
  // ==========================================================================
  it("P10H.07: Drop planning advisory detects fatigue when tag scheduled > 2 times in 4 days", async () => {
    // Schedule tagHumour across 3 drops in consecutive days (2026-11-26, 2026-11-27, 2026-11-28)
    const d1 = new Date("2026-11-26T00:00:00.000Z");
    const d2 = new Date("2026-11-27T00:00:00.000Z");

    const dropPast1 = await prisma.drop.upsert({
      where: { drop_date: d1 },
      update: {},
      create: { drop_date: d1, opens_at: d1, closes_at: d1, status: "closed" },
    });
    // Clean any prior questions on dropPast1
    const past1Q = await prisma.question.findMany({ where: { drop_id: dropPast1.id } });
    if (past1Q.length > 0) {
      const qIds = past1Q.map((q) => q.id);
      await prisma.answerOption.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.questionTag.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.question.deleteMany({ where: { drop_id: dropPast1.id } });
    }

    const q1 = await prisma.question.create({
      data: {
        id: `q-fatigue-1-${randomUUID().slice(0, 6)}`,
        drop_id: dropPast1.id,
        position: 1,
        type: "text",
        payload: { prompt_i18n: { en: "Q1" }, options: [{ id: "1", text: "1" }] },
      },
    });
    await prisma.questionTag.create({ data: { question_id: q1.id, tag_id: tagHumourId } });

    const dropPast2 = await prisma.drop.upsert({
      where: { drop_date: d2 },
      update: {},
      create: { drop_date: d2, opens_at: d2, closes_at: d2, status: "closed" },
    });
    // Clean any prior questions on dropPast2
    const past2Q = await prisma.question.findMany({ where: { drop_id: dropPast2.id } });
    if (past2Q.length > 0) {
      const qIds = past2Q.map((q) => q.id);
      await prisma.answerOption.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.questionTag.deleteMany({ where: { question_id: { in: qIds } } });
      await prisma.question.deleteMany({ where: { drop_id: dropPast2.id } });
    }

    const q2 = await prisma.question.create({
      data: {
        id: `q-fatigue-2-${randomUUID().slice(0, 6)}`,
        drop_id: dropPast2.id,
        position: 1,
        type: "text",
        payload: { prompt_i18n: { en: "Q2" }, options: [{ id: "1", text: "1" }] },
      },
    });
    await prisma.questionTag.create({ data: { question_id: q2.id, tag_id: tagHumourId } });

    // Generate suggestions for today's drop
    const genRes = await app.inject({
      method: "POST",
      url: "/v1/admin/insights/suggestions/generate",
      headers: { "x-admin-id": "admin-1", "x-admin-role": "admin" },
      payload: {
        target_date: dropDate.toISOString().split("T")[0],
      },
    });

    expect(genRes.statusCode).toBe(201);
    const body = genRes.json();
    expect(body.ok).toBe(true);

    const fatigueWarning = body.suggestions.find(
      (s: { suggestionType: string; tagId: string }) =>
        s.suggestionType === "fatigue_warning" && s.tagId === tagHumourId
    );
    expect(fatigueWarning).toBeDefined();
    expect(fatigueWarning.message).toContain("fatigue threshold");

    // Clean up extra questions
    await prisma.questionTag.deleteMany({ where: { question_id: { in: [q1.id, q2.id] } } });
    await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
  });

  // ==========================================================================
  // Invariant 6: P10H.08 Personalised Ranking on Non-Drop Surfaces
  // ==========================================================================
  it("P10H.08: Meme Corner selects matching taste meme on exploitation branch", async () => {
    // For Player 1 (loves humour tag): exploitation should favor the humour meme submission
    const selected = await repo.selectMemeForPlayer(playerHumourFanId, {
      explorationRate: 0.0, // Force exploitation
      minRatersThreshold: 200,
    });

    expect(selected).not.toBeNull();
    // Since playerHumourFan is author of sub1, author exclusion applies so sub2 (quirks) is selected
    // Let's create a 3rd party player to evaluate taste preference directly
    const evaluator = await prisma.player.create({
      data: { did: `did-eval-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
    });
    await prisma.consent.create({
      data: { player_id: evaluator.id, purpose: "personalisation", policy_version: 1 },
    });
    // Evaluator has high affinity for humour (0.95), low for quirks (0.10)
    await prisma.playerTaste.createMany({
      data: [
        { player_id: evaluator.id, tag_id: tagHumourId, affinity_score: 0.95, sample_size: 25 },
        { player_id: evaluator.id, tag_id: tagQuirksId, affinity_score: 0.10, sample_size: 25 },
      ],
    });

    const evalSelected = await repo.selectMemeForPlayer(evaluator.id, {
      explorationRate: 0.0, // Force exploitation
      minRatersThreshold: 200,
    });

    expect(evalSelected).not.toBeNull();
    // Both memes had identical Wilson score (0.80), but humour meme gets boosted by 0.95 affinity
    expect(evalSelected?.id).toBe(submissionHumourId);

    // Cleanup evaluator
    await prisma.memeExposure.deleteMany({ where: { player_id: evaluator.id } });
    await prisma.playerTaste.deleteMany({ where: { player_id: evaluator.id } });
    await prisma.consent.deleteMany({ where: { player_id: evaluator.id } });
    await prisma.player.delete({ where: { id: evaluator.id } });
  });
});
