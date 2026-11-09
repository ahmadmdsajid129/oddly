/**
 * @file triggers.ts
 * @package @oddly/worker
 *
 * Push Notification Triggers & Event Evaluators (P10.06).
 * - Twin Upgrade push trigger: ΔS ≥ 0.10 OR matched picks jump (e.g., from 3 to 4 or 5).
 * - Strict capping: maximum 1 twin upgrade push per player per day.
 */

export const MIN_SIMILARITY_DELTA = 0.10; // 10% improvement in similarity
export const MAX_UPGRADE_PUSHES_PER_DAY = 1;

export interface MatchSnapshot {
  similarity: number;        // e.g. 0.65 (range 0.0 to 1.0)
  matchedCount: number;      // e.g. 3 (range 0 to 5)
  partnerId?: string;
  partnerCity?: string;
  partnerCountry?: string;
}

export interface TwinUpgradeEvaluationParams {
  playerId: string;
  previousMatch?: MatchSnapshot | null;
  newMatch: MatchSnapshot;
  upgradePushesToday: number;
}

export interface TwinUpgradeDecision {
  shouldTrigger: boolean;
  reason: string;
  deltaS: number;
  isPickJump: boolean;
}

/**
 * Evaluates whether an updated provisional twin match warrants a "Twin Upgrade" push alert.
 * Criteria (P10.06):
 * 1. Player has not already received a Twin Upgrade push today (max 1/day).
 * 2. ΔS ≥ 0.10 (similarity increased by at least 10 percentage points), OR
 * 3. Matched picks jumped to a higher tier (e.g., from ≤3 to 4 or 5, or from 4 to 5).
 */
export function shouldTriggerTwinUpgrade(
  params: TwinUpgradeEvaluationParams
): TwinUpgradeDecision {
  const { previousMatch, newMatch, upgradePushesToday } = params;

  // 1. Max 1 twin upgrade push per day cap
  if (upgradePushesToday >= MAX_UPGRADE_PUSHES_PER_DAY) {
    return {
      shouldTrigger: false,
      reason: `Maximum twin upgrade pushes reached today (${upgradePushesToday}/${MAX_UPGRADE_PUSHES_PER_DAY}).`,
      deltaS: 0,
      isPickJump: false,
    };
  }

  // If no previous match existed, this is the initial reveal, not an upgrade
  if (!previousMatch) {
    return {
      shouldTrigger: false,
      reason: "No previous match exists; initial reveal does not trigger upgrade push.",
      deltaS: 0,
      isPickJump: false,
    };
  }

  const deltaS = Math.round((newMatch.similarity - previousMatch.similarity) * 1000) / 1000;
  
  // Pick jump: higher count reaching at least 4 out of 5 picks
  const isPickJump =
    newMatch.matchedCount > previousMatch.matchedCount &&
    newMatch.matchedCount >= 4;

  const isSimilarityJump = deltaS >= MIN_SIMILARITY_DELTA;

  if (isPickJump || isSimilarityJump) {
    const reasons: string[] = [];
    if (isSimilarityJump) {
      reasons.push(`Similarity improved by +${(deltaS * 100).toFixed(1)}% (≥ 10%)`);
    }
    if (isPickJump) {
      reasons.push(
        `Shared picks jumped from ${previousMatch.matchedCount}/5 to ${newMatch.matchedCount}/5`
      );
    }

    return {
      shouldTrigger: true,
      reason: reasons.join(" and "),
      deltaS,
      isPickJump,
    };
  }

  return {
    shouldTrigger: false,
    reason: `Upgrade criteria not met (ΔS = +${(deltaS * 100).toFixed(1)}% < 10%, no significant pick jump).`,
    deltaS,
    isPickJump: false,
  };
}
