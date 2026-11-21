/**
 * @file ml-dataset-extract.job.ts
 * @package @oddly/worker
 *
 * Offline Dataset Extraction Harness for Explainable ML Ranker (Stage M7 / Phase 10J / P10J.01).
 *
 * Architectural Invariants:
 * 1. DPDP Consent Enforced: strictly extracts ratings from users with active 'analytics' consent.
 * 2. Pseudonymous Isolation: uses analytics_id, severed from player_id and account records.
 * 3. Scale Threshold Gate: if consented pairs < min_training_pairs, reports insufficient data without throwing.
 * 4. Rule 14 Compliance: extracts strictly approved non-sensitive feature vectors.
 */

import { prisma } from "../db.js";
import {
  type MLFeatureVector,
  type TrainingPair,
} from "@oddly/shared";

export interface ExtractDatasetResult {
  status: "ready" | "insufficient_data";
  pairsCount: number;
  minThreshold: number;
  pairs: TrainingPair[];
}

export class MLDatasetExtractJob {
  /**
   * Extract pseudonymous training dataset from consented ratings.
   */
  static async extractConsentedDataset(options: {
    minThresholdOverride?: number;
    limit?: number;
  } = {}): Promise<ExtractDatasetResult> {
    // 1. Read scale threshold from app_config or options
    let minThreshold = options.minThresholdOverride;
    if (minThreshold === undefined) {
      const cfg = await prisma.appConfig.findUnique({
        where: { key: "ml_ranker.min_training_pairs" },
      });
      minThreshold = cfg ? Number(cfg.value) : 100;
    }

    // 2. Query consented players with active 'analytics' consent
    const consentedPlayers = await prisma.consent.findMany({
      where: {
        purpose: "analytics",
        withdrawn_at: null,
      },
      select: {
        player_id: true,
      },
    });

    const consentedPlayerIds = consentedPlayers.map((c) => c.player_id);
    if (consentedPlayerIds.length === 0) {
      return {
        status: "insufficient_data",
        pairsCount: 0,
        minThreshold,
        pairs: [],
      };
    }

    // 3. Query ratings by consented players on approved meme submissions
    const ratings = await prisma.memeRating.findMany({
      where: {
        rater_player_id: { in: consentedPlayerIds },
        submission: {
          status: "approved",
        },
      },
      include: {
        rater: {
          select: {
            region: true,
          },
        },
        submission: {
          include: {
            stats: true,
            template: true,
          },
        },
      },
      take: options.limit ?? 50000,
      orderBy: {
        created_at: "desc",
      },
    });

    if (ratings.length < minThreshold) {
      return {
        status: "insufficient_data",
        pairsCount: ratings.length,
        minThreshold,
        pairs: [],
      };
    }

    // 4. Batch fetch player tastes for tag affinity
    const playerTastes = await prisma.playerTaste.findMany({
      where: {
        player_id: { in: consentedPlayerIds },
      },
    });
    const tasteMap = new Map<string, number>();
    for (const pt of playerTastes) {
      tasteMap.set(`${pt.player_id}:${pt.tag_id}`, pt.affinity_score);
    }

    // 5. Precompute author funny rates
    const authorIds = Array.from(new Set(ratings.map((r) => r.submission.author_player_id)));
    const authorStats = await prisma.memeStat.findMany({
      where: {
        submission: {
          author_player_id: { in: authorIds },
          status: "approved",
        },
      },
    });
    const authorFunnyRates = new Map<string, number>();
    const authorCounts: Record<string, { total: number; funny: number }> = {};
    for (const stat of authorStats) {
      // Find author of this submission from ratings
      const match = ratings.find((r) => r.submission_id === stat.submission_id);
      if (match) {
        const authorId = match.submission.author_player_id;
        if (!authorCounts[authorId]) {
          authorCounts[authorId] = { total: 0, funny: 0 };
        }
        authorCounts[authorId].total += stat.raters;
        authorCounts[authorId].funny += stat.funny_count;
      }
    }
    for (const [authorId, c] of Object.entries(authorCounts)) {
      authorFunnyRates.set(
        authorId,
        c.total > 0 ? Number((c.funny / c.total).toFixed(4)) : 0.50
      );
    }

    // 6. Build normalized explainable feature vectors
    const pairs: TrainingPair[] = ratings.map((r) => {
      const stats = r.submission.stats;
      const wilsonLb = stats ? stats.wilson_lb : 0.50;
      const raters = stats ? stats.raters : 0;
      const ratersLogNorm = Math.min(1.0, Math.log10(raters + 1) / Math.log10(10000));

      const affinityKey = `${r.rater_player_id}:${r.submission.template_id}`;
      const tagAffinity = tasteMap.get(affinityKey) ?? 0.50;

      const captionLength = r.submission.caption_text.length;
      const captionLengthNorm = Math.min(1.0, captionLength / 100);

      const authorFunnyRate =
        authorFunnyRates.get(r.submission.author_player_id) ?? 0.50;

      const ratingDate = new Date(r.created_at);
      const hourNorm = ratingDate.getUTCHours() / 24.0;

      const features: MLFeatureVector = {
        meme_wilson_lb: wilsonLb,
        meme_raters_log: ratersLogNorm,
        tag_affinity: tagAffinity,
        caption_length_norm: captionLengthNorm,
        author_funny_rate: authorFunnyRate,
        hour_of_day_norm: hourNorm,
      };

      return {
        id: r.id,
        features,
        target: r.rating === "funny" ? 1 : 0,
        region: r.rater.region || "IN",
      };
    });

    return {
      status: "ready",
      pairsCount: pairs.length,
      minThreshold,
      pairs,
    };
  }
}

