/**
 * @file matching.ts
 * @package @oddly/shared
 *
 * Matching engine for Oddly v1.
 *
 * Strategy pattern:
 *   MatchingStrategy interface → swappable algorithm
 *   BruteForceMatchingStrategy → Stage A, O(n) scan per player, < 10ms for 10k DAU
 *
 * Decision D-009: Stage A uses in-memory brute-force pairwise matching.
 * We revisit with a spatial index (Annoy / pgvector) at ~50k DAU.
 */

import type { MatchResult, SubmissionForMatching } from "./types.js";
import { submissionSimilarity } from "./scoring.js";

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

/**
 * A matching strategy finds the best-match counterpart for a submission
 * from a pool of other submissions.
 *
 * Implementations must be:
 *  - Deterministic (same input → same output)
 *  - Self-match safe (never return a match to the same player)
 *  - Null-safe (return null if no valid match exists)
 */
export interface MatchingStrategy {
  /**
   * Find the best match for a submission from the pool.
   *
   * @param submission - The submission to match
   * @param pool       - All other (unmatched) submissions for the same drop
   * @param optionMap  - question_id → sorted array of all possible values
   * @returns The best MatchResult, or null if no valid partner found
   */
  findBestMatch(
    submission: SubmissionForMatching,
    pool: SubmissionForMatching[],
    optionMap: Map<string, string[]>
  ): MatchResult | null;
}

// ---------------------------------------------------------------------------
// BruteForceMatchingStrategy
// ---------------------------------------------------------------------------

/**
 * O(n) linear scan: compare every candidate, pick highest similarity.
 * Tie-break: earlier submission_at wins (more committed player).
 *
 * Complexity: O(n × Q) where Q = 5 questions.
 * At 10k DAU: ~50k comparisons per player → < 10ms in JS.
 */
export class BruteForceMatchingStrategy implements MatchingStrategy {
  findBestMatch(
    submission: SubmissionForMatching,
    pool: SubmissionForMatching[],
    optionMap: Map<string, string[]>
  ): MatchResult | null {
    if (pool.length === 0) return null;

    // Filter out the submission itself (self-match prevention)
    const candidates = pool.filter(
      (c) =>
        c.player_id !== submission.player_id &&
        c.submission_id !== submission.submission_id
    );

    if (candidates.length === 0) return null;

    let bestCandidate: SubmissionForMatching | null = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      const score = submissionSimilarity(
        submission.answers,
        candidate.answers,
        optionMap
      );

      if (
        score > bestScore ||
        // Tie-break: pick earlier submission (more committed)
        (score === bestScore &&
          bestCandidate !== null &&
          candidate.submitted_at < bestCandidate.submitted_at)
      ) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate === null) return null;

    return {
      player_a_id: submission.player_id,
      player_b_id: bestCandidate.player_id,
      submission_a_id: submission.submission_id,
      submission_b_id: bestCandidate.submission_id,
      similarity_score: bestScore,
      matched_at: new Date(),
    };
  }
}

// ---------------------------------------------------------------------------
// Batch matcher: match all submissions in a drop
// ---------------------------------------------------------------------------

export interface BatchMatchResult {
  matches: MatchResult[];
  unmatched: string[]; // submission_ids with no partner
}

/**
 * Match all submissions in a drop in a single O(n²) pass.
 *
 * Uses a greedy approach:
 *   1. Sort submissions by submission time (earliest first).
 *   2. For each unmatched submission, find its best partner from remaining unmatched.
 *   3. Remove both from the pool.
 *   4. Repeat until pool is empty or only 1 left.
 *
 * This is NOT globally optimal (a perfect bipartite matching would be),
 * but it's fast and fair for v1 (D-009).
 *
 * @param submissions - All submissions for a drop
 * @param optionMap   - question_id → all possible values
 * @param strategy    - Matching strategy (default: BruteForce)
 * @returns Matches and list of unmatched submission_ids
 */
export function batchMatch(
  submissions: SubmissionForMatching[],
  optionMap: Map<string, string[]>,
  strategy: MatchingStrategy = new BruteForceMatchingStrategy()
): BatchMatchResult {
  if (submissions.length === 0) {
    return { matches: [], unmatched: [] };
  }

  if (submissions.length === 1) {
    return { matches: [], unmatched: [submissions[0]!.submission_id] };
  }

  // Sort by submission time — earlier submissions get priority in matching
  const pool = [...submissions].sort(
    (a, b) => a.submitted_at.getTime() - b.submitted_at.getTime()
  );

  const matched = new Set<string>(); // submission_ids already matched
  const matches: MatchResult[] = [];

  for (const submission of pool) {
    if (matched.has(submission.submission_id)) continue;

    // Build candidate pool: unmatched submissions only
    const candidates = pool.filter(
      (s) =>
        !matched.has(s.submission_id) &&
        s.submission_id !== submission.submission_id
    );

    const result = strategy.findBestMatch(submission, candidates, optionMap);

    if (result !== null) {
      matches.push(result);
      matched.add(result.submission_a_id);
      matched.add(result.submission_b_id);
    }
  }

  // Find unmatched
  const unmatched = pool
    .filter((s) => !matched.has(s.submission_id))
    .map((s) => s.submission_id);

  return { matches, unmatched };
}
