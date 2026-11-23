/**
 * @file tie-breaker.ts
 * @package @oddly/shared
 *
 * 4-Stage Tie-Breaking Pipeline (Stage L3 / Phase 10N / P10N.03 / ADR-046).
 *
 * When candidate pairs share high similarity in today's Drop, this pipeline breaks ties
 * through a strictly ordered 4-stage hierarchy:
 *   Stage 1: Today's Drop Similarity S(u, v) in [0.0, 1.0]
 *   Stage 2: 28-day BitMinHash History Agreement H(u, v) in [0.0, 1.0] (for players with >= 5 shared days)
 *   Stage 3: Cross-Culture Bonus: Preference for different countries I(country_u != country_v)
 *   Stage 4: Deterministic HMAC-SHA256 Cryptographic HashTie(u, v) in [0.0, 1.0)
 *
 * Total Edge Weight:
 *   W(u, v) = S(u, v) + 0.1 * H(u, v) + 0.01 * I(country_u != country_v) + 0.001 * HashTie(u, v)
 *
 * Invariants:
 * - Mathematical Symmetry: W(u, v) == W(v, u) strictly.
 * - Monotonicity: A superior score at an earlier stage strictly dominates lower stages.
 * - Zero Timestamp Bias: Arrival time and submission order have 0 impact on matching.
 */

import { createHmac } from "node:crypto";
import { computeBitMinHashAgreement } from "./bitminhash.js";

export type TieBreakReason =
  | "similarity"
  | "history_agreement"
  | "cross_culture"
  | "deterministic_hash";

export interface CandidateHistoryProfile {
  signature?: Uint8Array | null;
  historyDays?: number;
  country?: string | null;
}

export const MIN_HISTORY_DAYS_FOR_TIEBREAK = 5;
export const TIE_EPSILON = 0.01;

/**
 * Computes a deterministic pseudo-random symmetric score in [0.0, 1.0) for a pair (u, v)
 * using HMAC-SHA256 keyed on drop_id.
 *
 * Guaranteed symmetric: HashTie(u, v) === HashTie(v, u).
 */
export function computeHmacPairTie(
  dropId: string,
  playerAId: string,
  playerBId: string
): number {
  const [p1, p2] = playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
  const message = `${p1}:${p2}`;
  const hmac = createHmac("sha256", dropId || "oddly_default_drop_seed");
  hmac.update(message);
  const digest = hmac.digest();
  // Read first 32-bit unsigned integer (big-endian)
  const uint32 = digest.readUInt32BE(0);
  return uint32 / 0xffffffff;
}

/**
 * Evaluates the 28-day BitMinHash agreement score H(u, v).
 * If both players have at least MIN_HISTORY_DAYS_FOR_TIEBREAK (5) days, uses BitMinHash agreement.
 * Otherwise returns a neutral 0.5 prior.
 */
export function evaluateHistoryAgreement(
  profileA?: CandidateHistoryProfile,
  profileB?: CandidateHistoryProfile
): { agreement: number; qualified: boolean } {
  const daysA = profileA?.historyDays ?? 0;
  const daysB = profileB?.historyDays ?? 0;

  if (
    daysA >= MIN_HISTORY_DAYS_FOR_TIEBREAK &&
    daysB >= MIN_HISTORY_DAYS_FOR_TIEBREAK &&
    profileA?.signature &&
    profileB?.signature
  ) {
    return {
      agreement: computeBitMinHashAgreement(profileA.signature, profileB.signature),
      qualified: true,
    };
  }

  return {
    agreement: 0.5,
    qualified: false,
  };
}

/**
 * Checks whether two candidates represent different countries (cross-cultural bonus).
 */
export function evaluateCrossCultureBonus(
  countryA?: string | null,
  countryB?: string | null
): number {
  const cA = countryA?.trim().toUpperCase();
  const cB = countryB?.trim().toUpperCase();
  if (cA && cB && cA !== "UNKNOWN" && cB !== "UNKNOWN") {
    return cA !== cB ? 1.0 : 0.0;
  }
  return 0.0;
}

/**
 * Computes the unified edge weight W(u, v) combining all 4 stages.
 *
 * W(u, v) = S(u, v) + 0.1 * H(u, v) + 0.01 * I(country_u != country_v) + 0.001 * HashTie(u, v)
 */
export function computeTieBreakWeight(
  dropId: string,
  playerAId: string,
  playerBId: string,
  todaySimilarity: number,
  profileA?: CandidateHistoryProfile,
  profileB?: CandidateHistoryProfile
): {
  weight: number;
  todaySimilarity: number;
  historyAgreement: number;
  crossCulture: number;
  hashTie: number;
} {
  const { agreement: historyAgreement } = evaluateHistoryAgreement(profileA, profileB);
  const crossCulture = evaluateCrossCultureBonus(profileA?.country, profileB?.country);
  const hashTie = computeHmacPairTie(dropId, playerAId, playerBId);

  const weight =
    todaySimilarity +
    0.1 * historyAgreement +
    0.01 * crossCulture +
    0.001 * hashTie;

  return {
    weight,
    todaySimilarity,
    historyAgreement,
    crossCulture,
    hashTie,
  };
}

/**
 * Compares two candidates A and B for a target player and identifies which of the 4 stages
 * made the winning determination.
 */
export function determineTieBreakReason(
  scoreA: {
    todaySimilarity: number;
    historyAgreement: number;
    crossCulture: number;
    hashTie: number;
  },
  scoreB: {
    todaySimilarity: number;
    historyAgreement: number;
    crossCulture: number;
    hashTie: number;
  }
): TieBreakReason {
  if (Math.abs(scoreA.todaySimilarity - scoreB.todaySimilarity) > 1e-6) {
    return "similarity";
  }
  if (Math.abs(scoreA.historyAgreement - scoreB.historyAgreement) > 1e-6) {
    return "history_agreement";
  }
  if (Math.abs(scoreA.crossCulture - scoreB.crossCulture) > 1e-6) {
    return "cross_culture";
  }
  return "deterministic_hash";
}

/**
 * Computes the size of the tie group T for a player:
 * Count of candidates whose similarity is within epsilon (default 0.01) of the highest similarity.
 */
export function computeTieGroupSize(
  similarityScores: number[],
  peakSimilarity: number,
  epsilon = TIE_EPSILON
): number {
  if (!similarityScores || similarityScores.length === 0) {
    return 1;
  }
  let count = 0;
  const threshold = peakSimilarity - epsilon;
  for (const s of similarityScores) {
    if (s >= threshold) {
      count++;
    }
  }
  return Math.max(1, count);
}

