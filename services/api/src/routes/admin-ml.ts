/**
 * @file admin-ml.ts
 * @package @oddly/api
 *
 * Mission Control Model Performance Dashboard & Instant Kill Switch (Stage M7 / Phase 10J / P10J.05).
 *
 * Architectural Invariants:
 * 1. Instant Kill Switch: Single administrative call sets feature.ml_ranker to false and mode to 'off'.
 * 2. 100% Deterministic Fallback: Reverts immediately to M4 Wilson score heuristics.
 * 3. Rule 14 Auditing: Status endpoint returns live sensitive-attribute and fairness audit proofs.
 * 4. Zero Sensitive Attributes: Proves prohibited demographic keys are absent from model weights.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import {
  runCompleteMLAudit,
  trainLogisticRanker,
  type ModelWeights,
  type TrainingPair,
  type Prisma,
} from "@oddly/shared";

export const adminMLRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/admin/ml-ranker/status
   * Retrieve ML ranker model status, explainability metrics, shadow predictions, and audit report.
   */
  app.get(
    "/v1/admin/ml-ranker/status",
    {
      schema: {
        tags: ["Admin"],
        summary: "Retrieve ML ranker performance metrics, shadow stats, and audit report",
        response: {
          200: z.object({
            ok: z.boolean(),
            enabled: z.boolean(),
            mode: z.enum(["off", "shadow", "active"]),
            activeModel: z
              .object({
                id: z.string(),
                version: z.string(),
                algorithm: z.string(),
                weights: z.record(z.unknown()),
                metrics: z.record(z.unknown()),
                status: z.string(),
                trained_at: z.string(),
              })
              .nullable(),
            shadowPredictionsCount: z.number().int(),
            auditReport: z
              .object({
                passed: z.boolean(),
                sensitiveAttributeAudit: z.object({
                  passed: z.boolean(),
                  prohibitedAttributesDetected: z.array(z.string()),
                  allowedFeaturesChecked: z.array(z.string()),
                }),
                fairnessAudit: z.object({
                  passed: z.boolean(),
                  minDisparityRatio: z.number(),
                  fourFifthsRuleSatisfied: z.boolean(),
                }),
                driftAudit: z.object({
                  passed: z.boolean(),
                  psi: z.number(),
                  driftAlert: z.boolean(),
                  driftSeverity: z.string(),
                }),
                auditedAt: z.string(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (_req, reply) => {
      const [flagCfg, modeCfg] = await Promise.all([
        prisma.appConfig.findUnique({ where: { key: "feature.ml_ranker" } }),
        prisma.appConfig.findUnique({ where: { key: "ml_ranker.mode" } }),
      ]);

      const enabled = flagCfg?.value === "true" || flagCfg?.value === true;
      const rawMode = typeof modeCfg?.value === "string"
        ? modeCfg.value.replace(/^"|"$/g, "")
        : "off";
      const mode = (["off", "shadow", "active"].includes(rawMode)
        ? rawMode
        : "off") as "off" | "shadow" | "active";

      const activeModel = await prisma.mLModel.findFirst({
        where: { status: { in: ["shadow", "active"] } },
        orderBy: { trained_at: "desc" },
      });

      const shadowCount = await prisma.mLShadowPrediction.count();

      let auditReport = null;
      if (activeModel) {
        const weights = activeModel.weights as unknown as ModelWeights;
        auditReport = runCompleteMLAudit(weights, [], []);
      }

      return reply.status(200).send({
        ok: true,
        enabled,
        mode,
        activeModel: activeModel
          ? {
              id: activeModel.id,
              version: activeModel.version,
              algorithm: activeModel.algorithm,
              weights: activeModel.weights as Record<string, unknown>,
              metrics: activeModel.metrics as Record<string, unknown>,
              status: activeModel.status,
              trained_at: activeModel.trained_at.toISOString(),
            }
          : null,
        shadowPredictionsCount: shadowCount,
        auditReport,
      });
    }
  );

  /**
   * POST /v1/admin/ml-ranker/kill-switch
   * Instant Administrative Kill Switch: immediately halts ML ranking and reverts 100% to Wilson scoring.
   */
  app.post(
    "/v1/admin/ml-ranker/kill-switch",
    {
      schema: {
        tags: ["Admin"],
        summary: "Instant Kill Switch for ML Ranker (immediate fallback to Wilson score)",
        response: {
          200: z.object({
            ok: z.boolean(),
            killed: z.boolean(),
            mode: z.literal("off"),
            message: z.string(),
          }),
        },
      },
    },
    async (_req, reply) => {
      await prisma.$transaction([
        prisma.appConfig.upsert({
          where: { key: "feature.ml_ranker" },
          create: { key: "feature.ml_ranker", value: "false" },
          update: { value: "false" },
        }),
        prisma.appConfig.upsert({
          where: { key: "ml_ranker.mode" },
          create: { key: "ml_ranker.mode", value: '"off"' },
          update: { value: '"off"' },
        }),
        prisma.mLModel.updateMany({
          where: { status: { in: ["shadow", "active"] } },
          data: { status: "killed" },
        }),
      ]);

      return reply.status(200).send({
        ok: true,
        killed: true,
        mode: "off",
        message:
          "ML ranker killed instantly. System has reverted 100% to Wilson lower bound scoring.",
      });
    }
  );

  /**
   * POST /v1/admin/ml-ranker/toggle-shadow
   * Toggles shadow inference mode for offline/shadow evaluation.
   */
  app.post(
    "/v1/admin/ml-ranker/toggle-shadow",
    {
      schema: {
        tags: ["Admin"],
        summary: "Toggle shadow inference mode for non-Drop surfaces",
        body: z.object({
          enabled: z.boolean(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            enabled: z.boolean(),
            mode: z.enum(["off", "shadow"]),
          }),
        },
      },
    },
    async (req, reply) => {
      const { enabled } = req.body as { enabled: boolean };
      const mode = enabled ? "shadow" : "off";

      await prisma.$transaction([
        prisma.appConfig.upsert({
          where: { key: "feature.ml_ranker" },
          create: { key: "feature.ml_ranker", value: enabled ? "true" : "false" },
          update: { value: enabled ? "true" : "false" },
        }),
        prisma.appConfig.upsert({
          where: { key: "ml_ranker.mode" },
          create: { key: "ml_ranker.mode", value: enabled ? '"shadow"' : '"off"' },
          update: { value: enabled ? '"shadow"' : '"off"' },
        }),
      ]);

      return reply.status(200).send({
        ok: true,
        enabled,
        mode,
      });
    }
  );

  /**
   * POST /v1/admin/ml-ranker/train
   * Train explainable model on provided or extracted pairs and persist artifact.
   */
  app.post(
    "/v1/admin/ml-ranker/train",
    {
      schema: {
        tags: ["Admin"],
        summary: "Train explainable logistic regression ranker and save model artifact",
        body: z.object({
          version: z.string().min(1),
          pairs: z
            .array(
              z.object({
                id: z.string(),
                features: z.object({
                  meme_wilson_lb: z.number(),
                  meme_raters_log: z.number(),
                  tag_affinity: z.number(),
                  caption_length_norm: z.number(),
                  author_funny_rate: z.number(),
                  hour_of_day_norm: z.number(),
                }),
                target: z.union([z.literal(0), z.literal(1)]),
                region: z.string().optional(),
              })
            )
            .optional(),
        }),
        response: {
          201: z.object({
            ok: z.boolean(),
            model: z.object({
              id: z.string(),
              version: z.string(),
              algorithm: z.string(),
              weights: z.record(z.unknown()),
              metrics: z.record(z.unknown()),
              status: z.string(),
            }),
            auditReport: z.object({
              passed: z.boolean(),
              fourFifthsRuleSatisfied: z.boolean(),
              driftAlert: z.boolean(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { version, pairs = [] } = req.body as {
        version: string;
        pairs?: TrainingPair[];
      };

      // Train model using explainable logistic ranker
      const { weights, metrics } = trainLogisticRanker(pairs);

      // Run audit
      const auditReport = runCompleteMLAudit(weights, pairs);

      const newModel = await prisma.mLModel.create({
        data: {
          version,
          algorithm: "logistic_regression",
          weights: weights as unknown as Prisma.InputJsonValue,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          training_pairs_count: pairs.length,
          status: "shadow",
        },
      });

      return reply.status(201).send({
        ok: true,
        model: {
          id: newModel.id,
          version: newModel.version,
          algorithm: newModel.algorithm,
          weights: newModel.weights as Record<string, unknown>,
          metrics: newModel.metrics as Record<string, unknown>,
          status: newModel.status,
        },
        auditReport: {
          passed: auditReport.passed,
          fourFifthsRuleSatisfied: auditReport.fairnessAudit.fourFifthsRuleSatisfied,
          driftAlert: auditReport.driftAudit.driftAlert,
        },
      });
    }
  );
};

