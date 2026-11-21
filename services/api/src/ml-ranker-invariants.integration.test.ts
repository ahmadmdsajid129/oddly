/**
 * @file ml-ranker-invariants.integration.test.ts
 * @package @oddly/api
 *
 * Integration & Invariants Test Suite for Stage M7 (Phase 10J): ML Ranker & Kill Switch.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildServer } from "./server.js";
import { prisma } from "./db/client.js";
import { randomUUID } from "node:crypto";

describe("Stage M7 (Phase 10J): ML Ranker Invariants & Kill Switch Integration", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  const testId = randomUUID().slice(0, 8);
  let createdModelId = "";

  beforeAll(async () => {
    app = await buildServer({ logger: false, testing: true });
    await app.ready();
  });

  afterAll(async () => {
    if (createdModelId) {
      await prisma.mLShadowPrediction.deleteMany({
        where: { model_id: createdModelId },
      });
      await prisma.mLModel.deleteMany({
        where: { id: createdModelId },
      });
    }
    await app.close();
  });

  it("POST /v1/admin/ml-ranker/train trains an explainable model, runs audit, and saves artifact", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/ml-ranker/train",
      payload: {
        version: `v1-test-${testId}`,
        pairs: [
          {
            id: `pair_1_${testId}`,
            features: {
              meme_wilson_lb: 0.82,
              meme_raters_log: 0.6,
              tag_affinity: 0.75,
              caption_length_norm: 0.4,
              author_funny_rate: 0.7,
              hour_of_day_norm: 0.5,
            },
            target: 1,
            region: "IN",
          },
          {
            id: `pair_2_${testId}`,
            features: {
              meme_wilson_lb: 0.25,
              meme_raters_log: 0.3,
              tag_affinity: 0.3,
              caption_length_norm: 0.8,
              author_funny_rate: 0.2,
              hour_of_day_norm: 0.5,
            },
            target: 0,
            region: "IN",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.model.version).toBe(`v1-test-${testId}`);
    expect(json.model.algorithm).toBe("logistic_regression");
    expect(json.auditReport.passed).toBe(true);

    createdModelId = json.model.id;
  });

  it("GET /v1/admin/ml-ranker/status returns active model, explainable metrics, and live audit report", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/ml-ranker/status",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.activeModel).not.toBeNull();
    expect(json.activeModel.id).toBe(createdModelId);

    // Rule 14 Invariant: Proves sensitive attributes are absent
    expect(json.auditReport).not.toBeNull();
    expect(json.auditReport.sensitiveAttributeAudit.passed).toBe(true);
    expect(json.auditReport.sensitiveAttributeAudit.prohibitedAttributesDetected).toHaveLength(0);
  });

  it("POST /v1/admin/ml-ranker/toggle-shadow activates shadow evaluation mode", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/ml-ranker/toggle-shadow",
      payload: { enabled: true },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.mode).toBe("shadow");
    expect(json.enabled).toBe(true);

    // Verify app_config updated
    const flag = await prisma.appConfig.findUnique({ where: { key: "feature.ml_ranker" } });
    expect(flag?.value).toBe("true");
  });

  it("POST /v1/admin/ml-ranker/kill-switch instantly halts ML ranking and reverts 100% to Wilson scoring", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/ml-ranker/kill-switch",
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.killed).toBe(true);
    expect(json.mode).toBe("off");

    // Invariant: Immediate config fallback
    const [flag, mode, model] = await Promise.all([
      prisma.appConfig.findUnique({ where: { key: "feature.ml_ranker" } }),
      prisma.appConfig.findUnique({ where: { key: "ml_ranker.mode" } }),
      prisma.mLModel.findUnique({ where: { id: createdModelId } }),
    ]);

    expect(flag?.value).toBe("false");
    expect(mode?.value).toBe('"off"');
    expect(model?.status).toBe("killed");
  });
});

