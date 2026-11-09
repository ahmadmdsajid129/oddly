/**
 * @file pairing.worker.ts
 * @package @oddly/worker
 *
 * Provisional Pairing Worker (P9.02).
 * Runs every 5 minutes during live drop hours:
 * - Partitions submissions by age_band (18-24, 25-34, 35+) to enforce strict separation.
 * - Computes similarity and best-pair matches using batchMatch from @oddly/shared.
 * - Generates privacy-preserving location aliases ("Stranger in Berlin, Germany").
 * - Upserts Match records with provisional status.
 */

import {
  batchMatch,
  type SubmissionForMatching,
} from "@oddly/shared";

export interface PairingCandidate extends SubmissionForMatching {
  age_band: string;
  region: string;
  city?: string;
  country?: string;
}

export interface StoredMatchRecord {
  id: string;
  drop_id: string;
  player_a_id: string;
  player_b_id: string;
  submission_a_id: string;
  submission_b_id: string;
  matched_picks: number;
  similarity_score: number;
  twin_location_a: string;
  twin_location_b: string;
  is_provisional: boolean;
  matched_at: Date;
}

// In-memory fallback match repository for tests & offline runs
const inMemoryMatches = new Map<string, StoredMatchRecord>();

export class PairingWorker {
  static clearMemory() {
    inMemoryMatches.clear();
  }

  static getInMemoryMatches(): StoredMatchRecord[] {
    return Array.from(inMemoryMatches.values());
  }

  /**
   * Generates a safe, human-readable twin location alias without exposing device ID or exact IP.
   */
  static formatTwinLocation(city?: string, country?: string, region?: string): string {
    if (city && country) {
      return `Stranger in ${city}, ${country}`;
    }
    if (country) {
      return `Stranger in ${country}`;
    }
    if (region && region !== "UNKNOWN") {
      return `Stranger in ${region}`;
    }
    return "Stranger in the World";
  }

  /**
   * Executes a pairing sweep over candidate submissions for a drop.
   * Enforces strict age band partitioning.
   */
  static async runPairingSweep(
    dropId: string,
    candidates: PairingCandidate[],
    optionMap: Map<string, string[]> = new Map()
  ): Promise<{
    matchedPairsCount: number;
    unmatchedCount: number;
    matches: StoredMatchRecord[];
  }> {
    if (candidates.length === 0) {
      return { matchedPairsCount: 0, unmatchedCount: 0, matches: [] };
    }

    // 1. Partition submissions strictly by age band
    const ageBands = new Map<string, PairingCandidate[]>();
    for (const c of candidates) {
      const band = c.age_band || "18-24";
      if (!ageBands.has(band)) {
        ageBands.set(band, []);
      }
      ageBands.get(band)!.push(c);
    }

    const createdMatches: StoredMatchRecord[] = [];
    let totalUnmatched = 0;

    // 2. Perform matching within each age band independently
    for (const [, bandCandidates] of ageBands.entries()) {
      const { matches, unmatched } = batchMatch(bandCandidates, optionMap);
      totalUnmatched += unmatched.length;

      const candidateMap = new Map(bandCandidates.map((c) => [c.submission_id, c]));

      for (const m of matches) {
        const subA = candidateMap.get(m.submission_a_id);
        const subB = candidateMap.get(m.submission_b_id);

        const locForA = PairingWorker.formatTwinLocation(subB?.city, subB?.country, subB?.region);
        const locForB = PairingWorker.formatTwinLocation(subA?.city, subA?.country, subA?.region);

        // Calculate matched picks count (similarity_score is out of 1.0 or count of matching answers)
        const matchedPicks = Math.round(m.similarity_score * 5);

        const matchRecord: StoredMatchRecord = {
          id: `match_${m.submission_a_id}_${m.submission_b_id}`,
          drop_id: dropId,
          player_a_id: m.player_a_id,
          player_b_id: m.player_b_id,
          submission_a_id: m.submission_a_id,
          submission_b_id: m.submission_b_id,
          matched_picks: matchedPicks,
          similarity_score: m.similarity_score,
          twin_location_a: locForA,
          twin_location_b: locForB,
          is_provisional: true,
          matched_at: new Date(),
        };

        inMemoryMatches.set(matchRecord.id, matchRecord);
        createdMatches.push(matchRecord);
      }
    }

    return {
      matchedPairsCount: createdMatches.length,
      unmatchedCount: totalUnmatched,
      matches: createdMatches,
    };
  }
}
