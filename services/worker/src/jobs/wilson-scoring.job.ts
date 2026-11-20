/**
 * @file wilson-scoring.job.ts
 * @package @oddly/worker
 *
 * Batch recalculation worker job for meme Wilson score lower bounds (Stage M3 / Phase 10G / P10G.05).
 * Enforces ADR 043:
 * - Computes Wilson 95% confidence lower bound from positive ("funny") and total ratings.
 * - Submissions with raters < minRaters (default 200) retain wilson_lb = 0.0.
 * - Identifies candidates with wilson_lb >= candidateThreshold (default 0.70) for Drop candidate curation.
 */

import { prisma } from "../db.js";
import { calculateWilsonScore } from "@oddly/shared";

export interface WilsonScoringResult {
  processed: number;
  updated: number;
  eligibleCandidates: number;
  minRatersThreshold: number;
}

export class WilsonScoringJob {
  /**
   * Run batch Wilson score calculation across all meme stats.
   *
   * @param options.minRaters Minimum raters required to receive non-zero Wilson score (default: 200).
   * @param options.candidateThreshold Wilson score threshold to qualify as candidate (default: 0.70).
   */
  static async runBatchWilsonScoring(options?: {
    minRaters?: number;
    candidateThreshold?: number;
  }): Promise<WilsonScoringResult> {
    const minRaters = options?.minRaters ?? 200;
    const candidateThreshold = options?.candidateThreshold ?? 0.70;

    // Fetch all stats records with raters > 0
    const statsList = await prisma.memeStat.findMany({
      where: {
        raters: { gt: 0 },
      },
      select: {
        submission_id: true,
        raters: true,
        funny_count: true,
        not_for_me_count: true,
        wilson_lb: true,
      },
    });

    let updated = 0;
    let eligibleCandidates = 0;

    for (const stat of statsList) {
      let newScore = 0.0;
      if (stat.raters >= minRaters) {
        newScore = calculateWilsonScore(stat.funny_count, stat.raters);
      }

      if (newScore >= candidateThreshold) {
        eligibleCandidates++;
      }

      // Check if score changed by at least 1e-4
      if (Math.abs(newScore - stat.wilson_lb) > 0.0001) {
        await prisma.memeStat.update({
          where: { submission_id: stat.submission_id },
          data: { wilson_lb: newScore },
        });
        updated++;
      }
    }

    return {
      processed: statsList.length,
      updated,
      eligibleCandidates,
      minRatersThreshold: minRaters,
    };
  }
}

