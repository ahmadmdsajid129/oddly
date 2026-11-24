/**
 * @file bonus-rounds.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B1: Bonus Rounds Engine (Stage L9 / Feature F40).
 *
 * Requirements & Invariants:
 * 1. Additive Result Invariant: Locked daily twins are NEVER altered or overwritten.
 *    Bonus results are stored additively in `bonus_results`.
 * 2. Eligibility: Offered only when tie group size >= min_tie_size (default 3) and feature flag is enabled.
 * 3. 3-question additive challenge: Evaluates additional matches (0..3) among tied participants.
 * 4. Controlled by `feature.bonus_rounds` flag (default false / OFF in v1 until Founder toggles).
 */

import { createHmac } from "node:crypto";

export interface BonusRoundConfig {
  flagEnabled: boolean;
  minTieSize: number;
  questionsPerRound: number;
}

export const DEFAULT_BONUS_CONFIG: BonusRoundConfig = {
  flagEnabled: false,
  minTieSize: 3,
  questionsPerRound: 3,
};

export interface ShouldOfferBonusParams {
  tieGroupSize: number;
  flagEnabled?: boolean;
  minTieSize?: number;
}

/**
 * Determine if a player qualifies for an optional tie-breaker bonus round.
 */
export function shouldOfferBonusRound(params: ShouldOfferBonusParams): boolean {
  const flagEnabled = params.flagEnabled ?? DEFAULT_BONUS_CONFIG.flagEnabled;
  const minTieSize = params.minTieSize ?? DEFAULT_BONUS_CONFIG.minTieSize;

  if (!flagEnabled) return false;
  return params.tieGroupSize >= minTieSize;
}

export interface BonusParticipantAnswer {
  playerId: string;
  answers: Record<string, string>; // questionId -> answerKey
}

export interface BonusMatchResult {
  playerId: string;
  closestPeerId: string | null;
  bonusMatches: number;
  similarityScore: number;
}

/**
 * Score bonus round answers among tied participants.
 * Invariant: Returns additive closest peer without touching base twin results.
 */
export function evaluateBonusRound(
  targetPlayerId: string,
  participants: BonusParticipantAnswer[],
  salt = "oddly-bonus-salt"
): BonusMatchResult {
  const target = participants.find((p) => p.playerId === targetPlayerId);
  if (!target) {
    return {
      playerId: targetPlayerId,
      closestPeerId: null,
      bonusMatches: 0,
      similarityScore: 0,
    };
  }

  let bestMatches = -1;
  let candidates: { peerId: string; matches: number; hash: string }[] = [];

  for (const peer of participants) {
    if (peer.playerId === targetPlayerId) continue;

    let matches = 0;
    let totalQuestions = 0;

    for (const [qId, ans] of Object.entries(target.answers)) {
      if (peer.answers[qId] !== undefined) {
        totalQuestions++;
        if (peer.answers[qId] === ans) {
          matches++;
        }
      }
    }

    const hash = createHmac("sha256", salt)
      .update(`${targetPlayerId}:${peer.playerId}`)
      .digest("hex");

    if (matches > bestMatches) {
      bestMatches = matches;
      candidates = [{ peerId: peer.playerId, matches, hash }];
    } else if (matches === bestMatches) {
      candidates.push({ peerId: peer.playerId, matches, hash });
    }
  }

  if (candidates.length === 0) {
    return {
      playerId: targetPlayerId,
      closestPeerId: null,
      bonusMatches: 0,
      similarityScore: 0,
    };
  }

  // Break ties lexicographically using deterministic HMAC hash
  candidates.sort((a, b) => (a.hash < b.hash ? -1 : 1));
  const chosen = candidates[0];

  return {
    playerId: targetPlayerId,
    closestPeerId: chosen.peerId,
    bonusMatches: chosen.matches,
    similarityScore: chosen.matches / 3.0,
  };
}
