/**
 * @file player-taste.test.ts
 * @package @oddly/worker
 *
 * Player Taste Calculation Worker Unit & Integration Tests (Stage M4 / Phase 10H / P10H.02).
 * Verifies:
 * - Bayesian smoothed affinity score calculation with 30-day exponential recency weighting.
 * - Consent-gated execution (Rule 13: only active 'personalisation' consent).
 * - Minimum sample size threshold guard ($n \ge 20$).
 * - Instant persistence in `player_taste` table.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient, EVERYDAY_LANE_ID } from "@oddly/shared";
import { PlayerTasteJob } from "./jobs/player-taste.job.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M4 (Phase 10H): Player Taste Calculation Worker (P10H.02)", () => {
  describe("Mathematical Formula & Smoothing Unit Tests", () => {
    it("returns default 0.50 for empty ratings", () => {
      const res = PlayerTasteJob.computeSmoothedAffinity([]);
      expect(res.affinityScore).toBe(0.5);
      expect(res.sampleSize).toBe(0);
    });

    it("smooths 20 positive ratings to ~0.9545", () => {
      const now = new Date();
      const ratings = Array.from({ length: 20 }, () => ({
        rating: "funny",
        createdAt: now,
      }));

      const res = PlayerTasteJob.computeSmoothedAffinity(ratings, { now });
      expect(res.sampleSize).toBe(20);
      // (20*1 + 1) / (20 + 2) = 21/22 = 0.9545
      expect(res.affinityScore).toBeCloseTo(0.9545, 3);
    });

    it("smooths 20 negative ratings to ~0.0455", () => {
      const now = new Date();
      const ratings = Array.from({ length: 20 }, () => ({
        rating: "not_for_me",
        createdAt: now,
      }));

      const res = PlayerTasteJob.computeSmoothedAffinity(ratings, { now });
      expect(res.sampleSize).toBe(20);
      // (0 + 1) / (20 + 2) = 1/22 = 0.0455
      expect(res.affinityScore).toBeCloseTo(0.0455, 3);
    });

    it("smooths 10 positive and 10 negative ratings to 0.5000", () => {
      const now = new Date();
      const ratings = [
        ...Array.from({ length: 10 }, () => ({ rating: "funny", createdAt: now })),
        ...Array.from({ length: 10 }, () => ({ rating: "not_for_me", createdAt: now })),
      ];

      const res = PlayerTasteJob.computeSmoothedAffinity(ratings, { now });
      expect(res.sampleSize).toBe(20);
      // (10 + 1) / (20 + 2) = 11/22 = 0.5
      expect(res.affinityScore).toBe(0.5);
    });

    it("weights recent ratings higher than older ratings", () => {
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400 * 1000);

      // Case A: 10 old funny + 10 recent not_for_me -> score drops below 0.5
      const oldFunnyRecentBad = [
        ...Array.from({ length: 10 }, () => ({ rating: "funny", createdAt: sixtyDaysAgo })),
        ...Array.from({ length: 10 }, () => ({ rating: "not_for_me", createdAt: now })),
      ];

      const resA = PlayerTasteJob.computeSmoothedAffinity(oldFunnyRecentBad, { now });
      expect(resA.affinityScore).toBeLessThan(0.40);

      // Case B: 10 old not_for_me + 10 recent funny -> score rises above 0.6
      const oldBadRecentFunny = [
        ...Array.from({ length: 10 }, () => ({ rating: "not_for_me", createdAt: sixtyDaysAgo })),
        ...Array.from({ length: 10 }, () => ({ rating: "funny", createdAt: now })),
      ];

      const resB = PlayerTasteJob.computeSmoothedAffinity(oldBadRecentFunny, { now });
      expect(resB.affinityScore).toBeGreaterThan(0.60);
    });
  });

  describe("Batch Database Pipeline & Invariant Integration Tests", () => {
    let prisma: PrismaClient;
    let playerNoConsentId: string;
    let playerLowSampleId: string;
    let playerEligibleId: string;
    let templateId: string;
    let questionId: string;
    let tagId: string;
    const submissionIds: string[] = [];

    beforeAll(async () => {
      prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
      await prisma.$connect();

      // 1. Create a neutral test subject tag
      const tag = await prisma.tag.create({
        data: {
          id: `tag-test-${randomUUID().slice(0, 8)}`,
          key: `taste_humour_${randomUUID().slice(0, 6)}`,
          category: "humour",
          label_i18n: { en: "Humour & Wit" },
        },
      });
      tagId = tag.id;

      // 2. Create test meme template
      const tmpl = await prisma.memeTemplate.create({
        data: {
          id: `tmpl-taste-${randomUUID().slice(0, 8)}`,
          key: `taste-tmpl-${randomUUID().slice(0, 6)}`,
          illustration_registry_key: "chart_taste_test",
          alt_text_i18n: { en: "A taste test meme template" },
          license_note: "Oddly Original",
        },
      });
      templateId = tmpl.id;

      // 3. Create test drop and question linking template to tag
      const dropDate = new Date("2026-11-25T00:00:00.000Z");
      const drop = await prisma.drop.upsert({
        where: {
          lane_id_drop_date: {
            lane_id: EVERYDAY_LANE_ID,
            drop_date: dropDate,
          },
        },
        update: {},
        create: {
          drop_date: dropDate,
          lane_id: EVERYDAY_LANE_ID,
          opens_at: new Date("2026-11-25T01:30:00.000Z"),
          closes_at: new Date("2026-11-25T18:29:00.000Z"),
          status: "pending",
        },
      });

      const question = await prisma.question.create({
        data: {
          id: `q-taste-${randomUUID().slice(0, 8)}`,
          drop_id: drop.id,
          position: 1,
          type: "text",
          render_variant: "standard",
          template_id: templateId,
          payload: {
            prompt_i18n: { en: "Which meme matches your vibe?" },
            options: [{ id: "A", text: "A" }, { id: "B", text: "B" }],
          },
        },
      });
      questionId = question.id;

      await prisma.questionTag.create({
        data: {
          question_id: questionId,
          tag_id: tagId,
        },
      });

      // 4. Create players
      // Player A: No consent
      const p1 = await prisma.player.create({
        data: {
          did: `did-noconsent-${randomUUID().slice(0, 8)}`,
          region: "IN",
          age_band: "18-24",
        },
      });
      playerNoConsentId = p1.id;

      // Player B: Consented, but low sample (< 20 ratings)
      const p2 = await prisma.player.create({
        data: {
          did: `did-lowsample-${randomUUID().slice(0, 8)}`,
          region: "IN",
          age_band: "18-24",
        },
      });
      playerLowSampleId = p2.id;
      await prisma.consent.create({
        data: {
          player_id: playerLowSampleId,
          purpose: "personalisation",
          policy_version: 1,
        },
      });

      // Player C: Consented, eligible ($n = 20$ ratings)
      const p3 = await prisma.player.create({
        data: {
          did: `did-eligible-${randomUUID().slice(0, 8)}`,
          region: "IN",
          age_band: "18-24",
        },
      });
      playerEligibleId = p3.id;
      await prisma.consent.create({
        data: {
          player_id: playerEligibleId,
          purpose: "personalisation",
          policy_version: 1,
        },
      });

      // 5. Create 20 test meme submissions
      for (let i = 0; i < 20; i++) {
        const sub = await prisma.memeSubmission.create({
          data: {
            author_player_id: playerNoConsentId,
            template_id: templateId,
            caption_text: `Test caption for taste evaluation ${i}`,
            status: "approved",
          },
        });
        submissionIds.push(sub.id);
      }

      // 6. Player B rates 5 memes (below threshold)
      for (let i = 0; i < 5; i++) {
        await prisma.memeRating.create({
          data: {
            submission_id: submissionIds[i],
            rater_player_id: playerLowSampleId,
            rating: "funny",
            drop_date: dropDate,
          },
        });
      }

      // 7. Player C rates all 20 memes (16 funny, 4 not_for_me)
      for (let i = 0; i < 20; i++) {
        await prisma.memeRating.create({
          data: {
            submission_id: submissionIds[i],
            rater_player_id: playerEligibleId,
            rating: i < 16 ? "funny" : "not_for_me",
            drop_date: dropDate,
          },
        });
      }
    });

    afterAll(async () => {
      // Cleanup
      const playerIds = [playerNoConsentId, playerLowSampleId, playerEligibleId].filter(Boolean);
      if (playerIds.length > 0) {
        await prisma.playerTaste.deleteMany({
          where: { player_id: { in: playerIds } },
        });
        await prisma.consent.deleteMany({
          where: { player_id: { in: playerIds } },
        });
      }
      if (submissionIds.length > 0) {
        await prisma.memeRating.deleteMany({
          where: { submission_id: { in: submissionIds } },
        });
        await prisma.memeSubmission.deleteMany({
          where: { id: { in: submissionIds } },
        });
      }
      if (questionId) {
        await prisma.questionTag.deleteMany({
          where: { question_id: questionId },
        });
        await prisma.question.deleteMany({
          where: { id: questionId },
        });
      }
      if (templateId) {
        await prisma.memeTemplate.delete({
          where: { id: templateId },
        }).catch(() => {});
      }
      if (tagId) {
        await prisma.tag.delete({
          where: { id: tagId },
        }).catch(() => {});
      }
      if (playerIds.length > 0) {
        await prisma.player.deleteMany({
          where: { id: { in: playerIds } },
        });
      }
      await prisma.$disconnect();
    });

    it("executes batch taste scoring with strict consent and sample size guards", async () => {
      const result = await PlayerTasteJob.runBatchTasteScoring({ minSamples: 20 });

      expect(result.consentedPlayers).toBeGreaterThanOrEqual(2);
      expect(result.minSamplesThreshold).toBe(20);
      expect(result.updatedTastes).toBeGreaterThanOrEqual(1);

      // Verify Player A (no consent): 0 records in player_taste
      const tasteA = await prisma.playerTaste.findUnique({
        where: {
          player_id_tag_id: {
            player_id: playerNoConsentId,
            tag_id: tagId,
          },
        },
      });
      expect(tasteA).toBeNull();

      // Verify Player B (low sample, 5 < 20): 0 records in player_taste
      const tasteB = await prisma.playerTaste.findUnique({
        where: {
          player_id_tag_id: {
            player_id: playerLowSampleId,
            tag_id: tagId,
          },
        },
      });
      expect(tasteB).toBeNull();

      // Verify Player C (eligible, 20 ratings): Computed and saved!
      const tasteC = await prisma.playerTaste.findUnique({
        where: {
          player_id_tag_id: {
            player_id: playerEligibleId,
            tag_id: tagId,
          },
        },
      });
      expect(tasteC).not.toBeNull();
      expect(tasteC?.sample_size).toBe(20);
      // 16 funny out of 20 -> smoothed score should be ~ (16 + 1) / (20 + 2) = 17/22 = 0.7727
      expect(tasteC?.affinity_score).toBeCloseTo(0.7727, 2);
    });
  });
});
