/**
 * @file super-twin.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B2: Super Twin Cross-Lane Alignment Engine (Stage L7 / F38).
 *
 * Requirements & Invariants:
 * 1. Multi-lane alignment: Evaluates when two players play >= 2 lanes on the same day.
 * 2. High threshold: Mean similarity across all shared lanes >= 0.80.
 * 3. Rare celebratory outcome: Triggers special Super Twin recognition and card.
 * 4. Configurable via `super.min_lanes` (2) and `super.min_similarity` (0.80).
 */

export interface SuperTwinConfig {
  minLanes: number;
  minSimilarity: number;
}

export const DEFAULT_SUPER_TWIN_CONFIG: SuperTwinConfig = {
  minLanes: 2,
  minSimilarity: 0.8,
};

export interface LaneScoreEntry {
  laneId: string;
  laneSlug: string;
  similarity: number;
}

export interface SuperTwinEvaluationParams {
  playerId: string;
  candidateId: string;
  dropDate: string;
  sharedLaneScores: LaneScoreEntry[];
  config?: Partial<SuperTwinConfig>;
}

export interface SuperTwinResult {
  isSuperTwin: boolean;
  playerId: string;
  candidateId: string;
  dropDate: string;
  sharedLanes: string[];
  meanSimilarity: number;
  qualifies: boolean;
}

/**
 * Evaluates whether a candidate pair achieves Super Twin status.
 */
export function evaluateSuperTwin(
  params: SuperTwinEvaluationParams
): SuperTwinResult {
  const minLanes = params.config?.minLanes ?? DEFAULT_SUPER_TWIN_CONFIG.minLanes;
  const minSim =
    params.config?.minSimilarity ?? DEFAULT_SUPER_TWIN_CONFIG.minSimilarity;

  const sharedLanes = params.sharedLaneScores.map((s) => s.laneSlug);
  const lanesCount = params.sharedLaneScores.length;

  if (lanesCount < minLanes) {
    return {
      isSuperTwin: false,
      playerId: params.playerId,
      candidateId: params.candidateId,
      dropDate: params.dropDate,
      sharedLanes,
      meanSimilarity: 0,
      qualifies: false,
    };
  }

  const sumSim = params.sharedLaneScores.reduce((acc, s) => acc + s.similarity, 0);
  const meanSimilarity = sumSim / lanesCount;
  const qualifies = meanSimilarity >= minSim;

  return {
    isSuperTwin: qualifies,
    playerId: params.playerId,
    candidateId: params.candidateId,
    dropDate: params.dropDate,
    sharedLanes,
    meanSimilarity,
    qualifies,
  };
}
