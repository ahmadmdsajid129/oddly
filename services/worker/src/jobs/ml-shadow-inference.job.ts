/**
 * @file ml-shadow-inference.job.ts
 * @package @oddly/worker
 *
 * Shadow-Mode Inference Pipeline for Non-Drop Surfaces (Stage M7 / Phase 10J / P10J.03).
 *
 * Architectural Invariants:
 * 1. Zero Production Impact: Live production order is strictly governed by M4 Wilson scores.
 * 2. Non-Drop Surfaces Only: Runs exclusively on optional surfaces (Meme Corner, Recap).
 * 3. Shadow Logging: Logs shadow score and rank alongside Wilson score to ml_shadow_predictions.
 * 4. Instant Kill Switch Compliance: Bypasses ML inference instantly when mode is 'off' or feature is disabled.
 */

import { prisma } from "../db.js";
import {
  predictRankScore,
  type MLFeatureVector,
  type ModelWeights,
} from "@oddly/shared";

export interface CandidateMeme {
  id: string;
  template_id: string;
  author_player_id: string;
  caption_text: string;
  wilson_lb: number;
  raters: number;
  author_funny_rate?: number;
}

export interface ShadowInferenceResult {
  mode: "off" | "shadow" | "active";
  modelId: string | null;
  modelVersion: string | null;
  rankedCandidates: CandidateMeme[]; // Strictly M4 Wilson order
  shadowPredictionsLogged: number;
}

export class MLShadowInferenceJob {
  /**
   * Run shadow inference on candidate memes for non-Drop surfaces.
   */
  static async evaluateCandidates(
    candidates: CandidateMeme[],
    targetPlayerId?: string
  ): Promise<ShadowInferenceResult> {
    // 1. Sort strictly by M4 Wilson score lower bound DESC (production invariant)
    const productionRanked = [...candidates].sort(
      (a, b) => b.wilson_lb - a.wilson_lb
    );

    // 2. Read feature flag and mode from app_config
    const [flagCfg, modeCfg] = await Promise.all([
      prisma.appConfig.findUnique({ where: { key: "feature.ml_ranker" } }),
      prisma.appConfig.findUnique({ where: { key: "ml_ranker.mode" } }),
    ]);

    const isEnabled = flagCfg?.value === "true" || flagCfg?.value === true;
    const mode = (
      typeof modeCfg?.value === "string"
        ? modeCfg.value.replace(/^"|"$/g, "")
        : "off"
    ) as "off" | "shadow" | "active";

    // If disabled or mode is 'off', return production ranking immediately
    if (!isEnabled || mode === "off" || candidates.length === 0) {
      return {
        mode: "off",
        modelId: null,
        modelVersion: null,
        rankedCandidates: productionRanked,
        shadowPredictionsLogged: 0,
      };
    }

    // 3. Fetch active or shadow model
    const activeModel = await prisma.mLModel.findFirst({
      where: {
        status: { in: ["shadow", "active"] },
      },
      orderBy: {
        trained_at: "desc",
      },
    });

    if (!activeModel) {
      return {
        mode,
        modelId: null,
        modelVersion: null,
        rankedCandidates: productionRanked,
        shadowPredictionsLogged: 0,
      };
    }

    const modelWeights = activeModel.weights as unknown as ModelWeights;

    // 4. Optionally fetch target player taste for tag affinity
    let tagAffinity = 0.50;
    if (targetPlayerId) {
      const tastes = await prisma.playerTaste.findMany({
        where: { player_id: targetPlayerId },
      });
      if (tastes.length > 0) {
        tagAffinity = tastes[0].affinity_score;
      }
    }

    // 5. Score candidates with explainable ML ranker
    const scoredCandidates = candidates.map((cand) => {
      const ratersLogNorm = Math.min(
        1.0,
        Math.log10(cand.raters + 1) / Math.log10(10000)
      );
      const captionLengthNorm = Math.min(1.0, cand.caption_text.length / 100);
      const hourNorm = new Date().getUTCHours() / 24.0;

      const features: MLFeatureVector = {
        meme_wilson_lb: cand.wilson_lb,
        meme_raters_log: ratersLogNorm,
        tag_affinity: tagAffinity,
        caption_length_norm: captionLengthNorm,
        author_funny_rate: cand.author_funny_rate ?? 0.50,
        hour_of_day_norm: hourNorm,
      };

      const shadowScore = predictRankScore(features, modelWeights);
      return {
        ...cand,
        shadowScore,
      };
    });

    // 6. Compute shadow ranks
    const shadowSorted = [...scoredCandidates].sort(
      (a, b) => b.shadowScore - a.shadowScore
    );
    const shadowRankMap = new Map<string, number>();
    shadowSorted.forEach((c, idx) => {
      shadowRankMap.set(c.id, idx + 1);
    });

    // 7. Log shadow comparison records (fire and log to DB)
    const shadowRecords = productionRanked.map((cand, prodIdx) => {
      const shadowRank = shadowRankMap.get(cand.id) ?? prodIdx + 1;
      const scored = scoredCandidates.find((c) => c.id === cand.id);
      return {
        model_id: activeModel.id,
        submission_id: cand.id,
        wilson_lb: cand.wilson_lb,
        shadow_score: scored ? Number(scored.shadowScore.toFixed(4)) : 0.50,
        wilson_rank: prodIdx + 1,
        shadow_rank: shadowRank,
      };
    });

    try {
      await prisma.mLShadowPrediction.createMany({
        data: shadowRecords,
      });
    } catch {
      // Invariant: Non-fatal shadow logging must never disrupt caller
    }

    return {
      mode,
      modelId: activeModel.id,
      modelVersion: activeModel.version,
      rankedCandidates: productionRanked, // Strictly M4 Wilson order
      shadowPredictionsLogged: shadowRecords.length,
    };
  }
}

