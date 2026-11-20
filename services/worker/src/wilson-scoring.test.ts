/**
 * @file wilson-scoring.test.ts
 * @package @oddly/worker
 *
 * Wilson Scoring Worker Unit & Integration Tests (Stage M3 / Phase 10G / P10G.05).
 * ADR 043:
 * - 95% Wilson confidence score calculation
 * - 200 rater minimum threshold before score is non-zero
 * - Batch update idempotency
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { WilsonScoringJob } from "./jobs/wilson-scoring.job.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Wilson Score Calculation Worker (P10G.05)", () => {
  let prisma: PrismaClient;
  let testAuthorId: string;
  let templateId: string;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    // 1. Create test player
    const player = await prisma.player.create({
      data: {
        did: `did-wilson-${randomUUID().slice(0, 8)}`,
        region: "IN",
        age_band: "18-24",
      },
    });
    testAuthorId = player.id;

    // 2. Create test template
    const template = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-wilson-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "chart_divergent_bars",
        aspect: "1:1",
        alt_text_i18n: { en: "A chart showing divergent bars" },
        license_note: "Test license",
      },
    });
    templateId = template.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdSubmissionIds.length > 0) {
      await prisma.memeStat.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeSubmission.deleteMany({
        where: { id: { in: createdSubmissionIds } },
      });
    }
    if (templateId) {
      await prisma.memeTemplate.delete({ where: { id: templateId } }).catch(() => {});
    }
    if (testAuthorId) {
      await prisma.player.delete({ where: { id: testAuthorId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("holds wilson_lb at 0.0 when raters < 200 (ADR 043 threshold guard)", async () => {
    const sub = await prisma.memeSubmission.create({
      data: {
        author_player_id: testAuthorId,
        template_id: templateId,
        caption_text: "Low rater count caption",
        status: "approved",
        stats: {
          create: {
            impressions: 150,
            raters: 150,
            funny_count: 140, // 93% funny but only 150 raters (< 200)
            not_for_me_count: 10,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(sub.id);

    const result = await WilsonScoringJob.runBatchWilsonScoring({ minRaters: 200 });

    expect(result.minRatersThreshold).toBe(200);

    const updatedStat = await prisma.memeStat.findUnique({
      where: { submission_id: sub.id },
    });
    expect(updatedStat?.wilson_lb).toBe(0.0);
  });

  it("calculates non-zero Wilson lower bound when raters >= 200 and promotes high scoring candidates", async () => {
    const sub = await prisma.memeSubmission.create({
      data: {
        author_player_id: testAuthorId,
        template_id: templateId,
        caption_text: "High rater high funny caption",
        status: "approved",
        stats: {
          create: {
            impressions: 300,
            raters: 250,
            funny_count: 225, // 90% positive with 250 raters
            not_for_me_count: 25,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(sub.id);

    const result = await WilsonScoringJob.runBatchWilsonScoring({
      minRaters: 200,
      candidateThreshold: 0.70,
    });

    const updatedStat = await prisma.memeStat.findUnique({
      where: { submission_id: sub.id },
    });

    // For 225/250, Wilson lower bound is ~0.856
    expect(updatedStat?.wilson_lb).toBeGreaterThan(0.80);
    expect(updatedStat?.wilson_lb).toBeLessThan(0.95);
    expect(result.eligibleCandidates).toBeGreaterThanOrEqual(1);
  });

  it("properly scores memes with low positive ratio above threshold", async () => {
    const sub = await prisma.memeSubmission.create({
      data: {
        author_player_id: testAuthorId,
        template_id: templateId,
        caption_text: "High rater low funny caption",
        status: "approved",
        stats: {
          create: {
            impressions: 250,
            raters: 210,
            funny_count: 30, // ~14% funny
            not_for_me_count: 180,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(sub.id);

    await WilsonScoringJob.runBatchWilsonScoring({ minRaters: 200 });

    const updatedStat = await prisma.memeStat.findUnique({
      where: { submission_id: sub.id },
    });

    // Wilson score lower bound for 30/210 is ~0.10
    expect(updatedStat?.wilson_lb).toBeGreaterThan(0.05);
    expect(updatedStat?.wilson_lb).toBeLessThan(0.25);
  });
});

