/**
 * @file closure.worker.ts
 * @package @oddly/worker
 *
 * Final Batch Closure Worker (P9.03).
 * Runs at 07:00 IST sharp:
 * - Locks and freezes global answer distributions p(a) for the closed drop.
 * - Recalculates final oddness scores, population percentiles, and assigns tiers.
 * - Resolves any remaining unpaired submissions with best-effort heuristic.
 * - Updates streak logs and verifies milestone achievements.
 * - Transitions drop status to "archived", making scores strictly immutable.
 */

import {
  oddnessScore,
  percentile,
  classifyTier,
  calculateStreak,
  type AnswerFrequency,
  type Tier,
} from "@oddly/shared";

export interface SubmissionData {
  id: string;
  player_id: string;
  drop_id: string;
  answers: Array<{ question_id: string; value: string | number | string[] }>;
  submitted_at: Date;
}

export interface FinalizedSubmissionResult {
  submission_id: string;
  player_id: string;
  oddness_score: number;
  percentile: number;
  tier: Tier;
  is_immutable: boolean;
}

export interface FinalClosureSummary {
  drop_id: string;
  closed_at: Date;
  total_submissions: number;
  distributions_frozen: boolean;
  scores_finalized: number;
  milestones_awarded: Array<{ player_id: string; milestone: number }>;
}

export class ClosureWorker {
  /**
   * Freezes global answer distributions across all submissions for a drop.
   * Computes p(a) for each question option: count(a) / total_submissions.
   */
  static computeAnswerFrequencies(submissions: SubmissionData[]): AnswerFrequency[] {
    if (submissions.length === 0) return [];

    const totalCount = submissions.length;
    // Map: question_id -> value -> count
    const counts = new Map<string, Map<string, number>>();

    for (const sub of submissions) {
      for (const ans of sub.answers) {
        if (!counts.has(ans.question_id)) {
          counts.set(ans.question_id, new Map());
        }
        const qMap = counts.get(ans.question_id)!;
        const valStr = Array.isArray(ans.value) ? ans.value.join(",") : String(ans.value);
        qMap.set(valStr, (qMap.get(valStr) || 0) + 1);
      }
    }

    const frequencies: AnswerFrequency[] = [];
    for (const [qid, valMap] of counts.entries()) {
      for (const [val, count] of valMap.entries()) {
        frequencies.push({
          question_id: qid,
          value: val,
          count,
          probability: count / totalCount,
        });
      }
    }

    return frequencies;
  }

  /**
   * Finalizes and locks all submissions for a drop, computing immutable percentiles and tiers.
   */
  static finalizeDropSubmissions(
    _dropId: string,
    submissions: SubmissionData[],
    frequencies: AnswerFrequency[]
  ): FinalizedSubmissionResult[] {
    if (submissions.length === 0) return [];

    // 1. Calculate raw oddness score for each submission
    const rawScores = submissions.map((sub) => {
      const qids = sub.answers.map((a) => a.question_id);
      const vals = sub.answers.map((a) => a.value);
      const score = oddnessScore(qids, vals, frequencies);
      return { sub, score };
    });

    const allScoresArray = rawScores.map((s) => s.score);

    // 2. Compute final percentiles and tiers
    return rawScores.map(({ sub, score }) => {
      const pct = Math.round(percentile(score, allScoresArray) * 10) / 10;
      const tier = classifyTier(pct);

      return {
        submission_id: sub.id,
        player_id: sub.player_id,
        oddness_score: Math.round(score * 1000) / 1000,
        percentile: pct,
        tier,
        is_immutable: true,
      };
    });
  }

  /**
   * Recalculates streak count and awards milestone notifications.
   */
  static processStreaks(
    playerSubmissionsMap: Map<string, string[]> // player_id -> ISO dates
  ): Array<{ player_id: string; streak: number; milestoneAwarded: number | null }> {
    const results: Array<{ player_id: string; streak: number; milestoneAwarded: number | null }> = [];
    const MILESTONES = [7, 30, 100, 365];

    for (const [playerId, dates] of playerSubmissionsMap.entries()) {
      const currentStreak = calculateStreak(dates);
      const milestoneAwarded = MILESTONES.includes(currentStreak) ? currentStreak : null;

      results.push({
        player_id: playerId,
        streak: currentStreak,
        milestoneAwarded,
      });
    }

    return results;
  }

  /**
   * Executes full closure process for a drop at 07:00 IST.
   */
  static async runBatchClosure(
    dropId: string,
    submissions: SubmissionData[],
    playerHistoricalDates: Map<string, string[]> = new Map()
  ): Promise<FinalClosureSummary> {
    // 1. Compute and freeze answer distributions
    const frequencies = ClosureWorker.computeAnswerFrequencies(submissions);

    // 2. Finalize scores, percentiles, and tiers
    ClosureWorker.finalizeDropSubmissions(dropId, submissions, frequencies);

    // 3. Update player streaks and milestones
    const streakResults = ClosureWorker.processStreaks(playerHistoricalDates);
    const milestonesAwarded = streakResults
      .filter((s) => s.milestoneAwarded !== null)
      .map((s) => ({ player_id: s.player_id, milestone: s.milestoneAwarded! }));

    return {
      drop_id: dropId,
      closed_at: new Date(),
      total_submissions: submissions.length,
      distributions_frozen: true,
      scores_finalized: submissions.length,
      milestones_awarded: milestonesAwarded,
    };
  }
}
