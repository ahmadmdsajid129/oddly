/**
 * @file player-taste.job.ts
 * @package @oddly/worker
 *
 * Nightly worker job for computing smoothed player_taste affinity scores (Stage M4 / Phase 10H / P10H.02).
 *
 * Invariants:
 * 1. Rule 13 (Consent Gate): Only players with active 'personalisation' consent are processed.
 * 2. Minimum Sample Size ($n \ge 20$): Requires at least 20 ratings per tag cluster before storing affinity.
 * 3. Recency Weighting: Exponential decay weighting (30-day half-life) giving recent reactions higher weight.
 * 4. Laplace / Bayesian Smoothing: Centered at neutral 0.50 with pseudo-counts to prevent outlier skew.
 * 5. Rule 14 (No Sensitive Inference): Operates exclusively on neutral lifestyle subject taxonomy tags.
 */

import { prisma } from "../db.js";

export interface RatingRecord {
  rating: string; // 'funny' | 'not_for_me'
  createdAt: Date;
}

export interface PlayerTasteScoringResult {
  consentedPlayers: number;
  processedPlayerTags: number;
  updatedTastes: number;
  skippedLowSample: number;
  minSamplesThreshold: number;
}

export class PlayerTasteJob {
  /**
   * Exponential decay rate for 30-day half-life in milliseconds.
   * lambda = ln(2) / (30 * 86400 * 1000)
   */
  static readonly DEFAULT_HALF_LIFE_DAYS = 30;

  /**
   * Computes smoothed affinity score from ratings with exponential recency decay.
   * Formula:
   *   w_i = exp(-lambda * delta_t)
   *   Smoothed score = (sum(w_i * is_funny) + 1.0) / (sum(w_i) + 2.0)
   */
  static computeSmoothedAffinity(
    ratings: RatingRecord[],
    options?: { halfLifeDays?: number; now?: Date }
  ): { affinityScore: number; sampleSize: number } {
    const sampleSize = ratings.length;
    if (sampleSize === 0) {
      return { affinityScore: 0.5, sampleSize: 0 };
    }

    const halfLifeDays = options?.halfLifeDays ?? this.DEFAULT_HALF_LIFE_DAYS;
    const nowMs = (options?.now ?? new Date()).getTime();
    const halfLifeMs = halfLifeDays * 86400 * 1000;
    const lambda = Math.LN2 / halfLifeMs;

    let weightedPositives = 0.0;
    let totalWeight = 0.0;

    for (const r of ratings) {
      const deltaMs = Math.max(0, nowMs - r.createdAt.getTime());
      const weight = Math.exp(-lambda * deltaMs);
      const isFunny = r.rating === "funny" ? 1.0 : 0.0;

      weightedPositives += weight * isFunny;
      totalWeight += weight;
    }

    // Laplace / Bayesian prior (+1 positive, +2 total pseudo-observations)
    const rawScore = (weightedPositives + 1.0) / (totalWeight + 2.0);
    const affinityScore = Math.round(rawScore * 10000) / 10000;

    return {
      affinityScore,
      sampleSize,
    };
  }

  /**
   * Runs the nightly batch calculation across all consented players.
   */
  static async runBatchTasteScoring(options?: {
    minSamples?: number;
    halfLifeDays?: number;
    now?: Date;
  }): Promise<PlayerTasteScoringResult> {
    const minSamples = options?.minSamples ?? 20;
    const halfLifeDays = options?.halfLifeDays ?? this.DEFAULT_HALF_LIFE_DAYS;
    const now = options?.now ?? new Date();

    // 1. Fetch all players with active 'personalisation' consent
    const consentedPlayers = await prisma.consent.findMany({
      where: {
        purpose: "personalisation",
        withdrawn_at: null,
      },
      select: {
        player_id: true,
      },
    });

    if (consentedPlayers.length === 0) {
      return {
        consentedPlayers: 0,
        processedPlayerTags: 0,
        updatedTastes: 0,
        skippedLowSample: 0,
        minSamplesThreshold: minSamples,
      };
    }

    const consentedPlayerIds = consentedPlayers.map((c) => c.player_id);

    // 2. Query ratings joined with template questions and tags
    // Meme -> Template -> Questions -> QuestionTags -> Tag
    const ratingsWithTags = await prisma.$queryRaw<
      Array<{
        player_id: string;
        tag_id: string;
        rating: string;
        created_at: Date;
      }>
    >`
      SELECT 
        mr.rater_player_id AS player_id,
        qt.tag_id,
        mr.rating,
        mr.created_at
      FROM meme_ratings mr
      JOIN meme_submissions ms ON ms.id = mr.submission_id
      JOIN questions q ON q.template_id = ms.template_id
      JOIN question_tags qt ON qt.question_id = q.id
      WHERE mr.rater_player_id = ANY(${consentedPlayerIds})
      ORDER BY mr.created_at ASC;
    `;

    // Group ratings by `${player_id}:${tag_id}`
    const grouped = new Map<string, { playerId: string; tagId: string; ratings: RatingRecord[] }>();

    for (const row of ratingsWithTags) {
      const key = `${row.player_id}:${row.tag_id}`;
      let entry = grouped.get(key);
      if (!entry) {
        entry = { playerId: row.player_id, tagId: row.tag_id, ratings: [] };
        grouped.set(key, entry);
      }
      entry.ratings.push({
        rating: row.rating,
        createdAt: new Date(row.created_at),
      });
    }

    let updatedTastes = 0;
    let skippedLowSample = 0;

    for (const entry of grouped.values()) {
      if (entry.ratings.length < minSamples) {
        skippedLowSample++;
        continue;
      }

      const { affinityScore, sampleSize } = this.computeSmoothedAffinity(entry.ratings, {
        halfLifeDays,
        now,
      });

      const lastEngaged = entry.ratings[entry.ratings.length - 1]?.createdAt ?? now;

      await prisma.playerTaste.upsert({
        where: {
          player_id_tag_id: {
            player_id: entry.playerId,
            tag_id: entry.tagId,
          },
        },
        create: {
          player_id: entry.playerId,
          tag_id: entry.tagId,
          affinity_score: affinityScore,
          sample_size: sampleSize,
          last_engaged_at: lastEngaged,
          updated_at: now,
        },
        update: {
          affinity_score: affinityScore,
          sample_size: sampleSize,
          last_engaged_at: lastEngaged,
          updated_at: now,
        },
      });

      updatedTastes++;
    }

    return {
      consentedPlayers: consentedPlayers.length,
      processedPlayerTags: grouped.size,
      updatedTastes,
      skippedLowSample,
      minSamplesThreshold: minSamples,
    };
  }
}

