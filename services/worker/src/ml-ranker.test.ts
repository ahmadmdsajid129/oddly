/**
 * @file ml-ranker.test.ts
 * @package @oddly/worker
 *
 * Worker Integration Tests for ML Dataset Extraction & Shadow Inference (Stage M7 / Phase 10J).
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "./db.js";
import { MLDatasetExtractJob } from "./jobs/ml-dataset-extract.job.js";
import { MLShadowInferenceJob, type CandidateMeme } from "./jobs/ml-shadow-inference.job.js";
import { randomUUID } from "node:crypto";

describe("Stage M7 (Phase 10J): ML Dataset Extraction & Shadow Inference Worker Tests", () => {
  const testId = randomUUID().slice(0, 8);
  const authorPlayerId = `author_ml_${testId}`;
  const raterPlayerId = `rater_ml_${testId}`;
  const templateId = `template_ml_${testId}`;
  const submissionId = `sub_ml_${testId}`;
  const submission2Id = `sub_ml_2_${testId}`;
  let createdModelId = "";

  beforeAll(async () => {
    // 1. Create players
    await prisma.player.createMany({
      data: [
        { id: authorPlayerId, did: `did_${authorPlayerId}`, region: "IN", age_band: "25-34" },
        { id: raterPlayerId, did: `did_${raterPlayerId}`, region: "IN", age_band: "25-34" },
      ],
    });

    // 2. Create template and submission
    await prisma.memeTemplate.create({
      data: {
        id: templateId,
        key: `tpl_${testId}`,
        illustration_registry_key: "ill_test_ml",
        alt_text_i18n: { en: "Test ML template" },
        license_note: "Test ML license",
        status: "active",
      },
    });

    await prisma.memeSubmission.createMany({
      data: [
        {
          id: submissionId,
          author_player_id: authorPlayerId,
          template_id: templateId,
          caption_text: "ML Ranker test caption",
          status: "approved",
        },
        {
          id: submission2Id,
          author_player_id: authorPlayerId,
          template_id: templateId,
          caption_text: "ML Ranker test caption 2",
          status: "approved",
        },
      ],
    });

    await prisma.memeStat.createMany({
      data: [
        {
          submission_id: submissionId,
          impressions: 100,
          raters: 80,
          funny_count: 60,
          not_for_me_count: 20,
          wilson_lb: 0.65,
        },
        {
          submission_id: submission2Id,
          impressions: 80,
          raters: 60,
          funny_count: 25,
          not_for_me_count: 35,
          wilson_lb: 0.40,
        },
      ],
    });

    // 3. Create test model in ml_models
    const model = await prisma.mLModel.create({
      data: {
        version: `test-v1-${testId}`,
        algorithm: "logistic_regression",
        weights: {
          bias: 0.1,
          weights: {
            meme_wilson_lb: 0.8,
            meme_raters_log: 0.2,
            tag_affinity: 0.3,
            caption_length_norm: 0.1,
            author_funny_rate: 0.4,
            hour_of_day_norm: 0.05,
          },
        },
        metrics: {
          train_loss: 0.42,
          train_auc: 0.78,
          baseline_auc: 0.70,
          accuracy: 0.75,
          pairs_count: 50,
          iterations: 30,
        },
        status: "shadow",
      },
    });
    createdModelId = model.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.mLShadowPrediction.deleteMany({
      where: { model_id: createdModelId },
    });
    await prisma.mLModel.deleteMany({
      where: { id: createdModelId },
    });
    await prisma.memeRating.deleteMany({
      where: { submission_id: { in: [submissionId, submission2Id] } },
    });
    await prisma.consent.deleteMany({
      where: { player_id: raterPlayerId },
    });
    await prisma.memeStat.deleteMany({
      where: { submission_id: { in: [submissionId, submission2Id] } },
    });
    await prisma.memeSubmission.deleteMany({
      where: { id: { in: [submissionId, submission2Id] } },
    });
    await prisma.memeTemplate.deleteMany({
      where: { id: templateId },
    });
    await prisma.player.deleteMany({
      where: { id: { in: [authorPlayerId, raterPlayerId] } },
    });
  });

  it("extractConsentedDataset honors scale threshold and returns 'insufficient_data' cleanly", async () => {
    // Without any consented ratings, scale check reports insufficient data without throwing
    const result = await MLDatasetExtractJob.extractConsentedDataset({
      minThresholdOverride: 50,
    });
    expect(result.status).toBe("insufficient_data");
    expect(result.pairs).toHaveLength(0);
  });

  it("extractConsentedDataset extracts consented pairs with normalized explainable features", async () => {
    // Grant analytics consent for rater
    await prisma.consent.create({
      data: {
        player_id: raterPlayerId,
        purpose: "analytics",
        policy_version: 1,
        granted_at: new Date(),
        withdrawn_at: null,
      },
    });

    // Create rating
    await prisma.memeRating.create({
      data: {
        rater_player_id: raterPlayerId,
        submission_id: submissionId,
        rating: "funny",
        drop_date: new Date(),
      },
    });

    // Extract with low threshold override
    const result = await MLDatasetExtractJob.extractConsentedDataset({
      minThresholdOverride: 1,
    });

    expect(result.status).toBe("ready");
    expect(result.pairsCount).toBeGreaterThanOrEqual(1);

    const found = result.pairs.find((p) => p.target === 1);
    expect(found).toBeDefined();
    expect(found?.features.meme_wilson_lb).toBe(0.65);
    expect(found?.features.meme_raters_log).toBeGreaterThan(0);
    expect(found?.features.caption_length_norm).toBeGreaterThan(0);
  });

  it("evaluateCandidates evaluates in shadow mode without altering production Wilson order", async () => {
    // Ensure shadow mode is active in app_config
    await prisma.appConfig.upsert({
      where: { key: "feature.ml_ranker" },
      create: { key: "feature.ml_ranker", value: "true" },
      update: { value: "true" },
    });
    await prisma.appConfig.upsert({
      where: { key: "ml_ranker.mode" },
      create: { key: "ml_ranker.mode", value: '"shadow"' },
      update: { value: '"shadow"' },
    });

    const candidates: CandidateMeme[] = [
      {
        id: submissionId,
        template_id: templateId,
        author_player_id: authorPlayerId,
        caption_text: "Test caption 1",
        wilson_lb: 0.85,
        raters: 500,
      },
      {
        id: submission2Id,
        template_id: templateId,
        author_player_id: authorPlayerId,
        caption_text: "Test caption 2",
        wilson_lb: 0.40,
        raters: 100,
      },
    ];

    const result = await MLShadowInferenceJob.evaluateCandidates(candidates);

    // Invariant: Production return order is 100% governed by Wilson lower bound DESC
    expect(result.rankedCandidates[0].id).toBe(submissionId);
    expect(result.rankedCandidates[0].wilson_lb).toBe(0.85);
    expect(result.rankedCandidates[1].wilson_lb).toBe(0.40);

    // Invariant: Shadow predictions logged to database
    expect(result.shadowPredictionsLogged).toBe(2);
    expect(result.modelId).toBe(createdModelId);

    // Verify shadow predictions persisted in DB
    const persisted = await prisma.mLShadowPrediction.findMany({
      where: { model_id: createdModelId },
    });
    expect(persisted.length).toBeGreaterThanOrEqual(1);
  });
});

