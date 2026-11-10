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
          (candidate.submitted_at < bestCandidate.submitted_at ||
            (candidate.submitted_at.getTime() === bestCandidate.submitted_at.getTime() &&
              candidate.submission_id.localeCompare(bestCandidate.submission_id) < 0)))
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
// Bounded Hash-Bucket Matching Strategy (R1.2)
// ---------------------------------------------------------------------------

function serializeAnswer(a: { question_id: string; value: unknown }): string {
  const valStr = Array.isArray(a.value) ? a.value.join(",") : String(a.value);
  return `${a.question_id}:${valStr}`;
}

export interface SubHashesResult {
  hash5: string;
  hashes4: string[];
  hashes3: string[];
}

/**
 * Computes deterministic 5-answer, 4-of-5 sub-hashes, and 3-of-5 sub-hashes for a submission.
 */
export function computeAnswerSubHashes(
  answers: Array<{ question_id: string; value: unknown }>
): SubHashesResult {
  const sorted = [...answers].sort((a, b) => a.question_id.localeCompare(b.question_id));
  const serialized = sorted.map(serializeAnswer);

  // Exact 5-of-5 hash (similarity = 1.0)
  const hash5 = serialized.join("|");

  // 4-of-5 sub-hashes (5 combinations)
  const hashes4: string[] = [];
  for (let i = 0; i < serialized.length; i++) {
    const sub = serialized.filter((_, idx) => idx !== i);
    hashes4.push(sub.join("|"));
  }

  // 3-of-5 sub-hashes (10 combinations)
  const hashes3: string[] = [];
  for (let i = 0; i < serialized.length; i++) {
    for (let j = i + 1; j < serialized.length; j++) {
      const sub = serialized.filter((_, idx) => idx !== i && idx !== j);
      hashes3.push(sub.join("|"));
    }
  }

  return { hash5, hashes4, hashes3 };
}

/**
 * Selects candidate submissions prioritized by answer-hash buckets, capped at maxCandidates.
 * Exact 5-match bucket first, then 4-of-5, then 3-of-5.
 */
export function selectBoundedCandidates(
  target: SubmissionForMatching,
  pool: SubmissionForMatching[],
  maxCandidates = 2000
): SubmissionForMatching[] {
  // Exclude target itself
  const validPool = pool.filter(
    (c) => c.player_id !== target.player_id && c.submission_id !== target.submission_id
  );

  if (validPool.length <= maxCandidates) {
    return validPool;
  }

  const targetHashes = computeAnswerSubHashes(target.answers);

  // Index pool into bucket maps
  const b5Map = new Map<string, SubmissionForMatching[]>();
  const b4Map = new Map<string, SubmissionForMatching[]>();
  const b3Map = new Map<string, SubmissionForMatching[]>();

  for (const candidate of validPool) {
    const cHashes = computeAnswerSubHashes(candidate.answers);

    // 5-hash
    if (!b5Map.has(cHashes.hash5)) b5Map.set(cHashes.hash5, []);
    b5Map.get(cHashes.hash5)!.push(candidate);

    // 4-hashes
    for (const h4 of cHashes.hashes4) {
      if (!b4Map.has(h4)) b4Map.set(h4, []);
      b4Map.get(h4)!.push(candidate);
    }

    // 3-hashes
    for (const h3 of cHashes.hashes3) {
      if (!b3Map.has(h3)) b3Map.set(h3, []);
      b3Map.get(h3)!.push(candidate);
    }
  }

  const selectedSet = new Set<string>();
  const selectedCandidates: SubmissionForMatching[] = [];

  const addCandidate = (c: SubmissionForMatching) => {
    if (!selectedSet.has(c.submission_id) && selectedCandidates.length < maxCandidates) {
      selectedSet.add(c.submission_id);
      selectedCandidates.push(c);
    }
  };

  // 1. Exact 5-of-5 bucket matches
  const exact5 = b5Map.get(targetHashes.hash5) || [];
  for (const c of exact5) {
    addCandidate(c);
    if (selectedCandidates.length >= maxCandidates) break;
  }

  // 2. 4-of-5 sub-hash bucket matches
  if (selectedCandidates.length < maxCandidates) {
    for (const h4 of targetHashes.hashes4) {
      const match4 = b4Map.get(h4) || [];
      for (const c of match4) {
        addCandidate(c);
        if (selectedCandidates.length >= maxCandidates) break;
      }
      if (selectedCandidates.length >= maxCandidates) break;
    }
  }

  // 3. 3-of-5 sub-hash bucket matches
  if (selectedCandidates.length < maxCandidates) {
    for (const h3 of targetHashes.hashes3) {
      const match3 = b3Map.get(h3) || [];
      for (const c of match3) {
        addCandidate(c);
        if (selectedCandidates.length >= maxCandidates) break;
      }
      if (selectedCandidates.length >= maxCandidates) break;
    }
  }

  // 4. Fallback: if zero high-similarity candidates matched, sample from pool up to maxCandidates
  if (selectedCandidates.length === 0) {
    for (let i = 0; i < Math.min(validPool.length, maxCandidates); i++) {
      selectedCandidates.push(validPool[i]);
    }
  }

  return selectedCandidates;
}

/**
 * Bounded Hash-Bucket Matching Strategy (R1.2)
 * Caps candidate comparisons to maxCandidates (default 2000) while selecting
 * candidates via 5-, 4-of-5, and 3-of-5 answer-hash buckets.
 */
export class BoundedHashBucketMatchingStrategy implements MatchingStrategy {
  private maxCandidates: number;

  constructor(maxCandidates = 2000) {
    this.maxCandidates = maxCandidates;
  }

  findBestMatch(
    submission: SubmissionForMatching,
    pool: SubmissionForMatching[],
    optionMap: Map<string, string[]>
  ): MatchResult | null {
    if (pool.length === 0) return null;

    const boundedCandidates = selectBoundedCandidates(
      submission,
      pool,
      this.maxCandidates
    );

    if (boundedCandidates.length === 0) return null;

    let bestCandidate: SubmissionForMatching | null = null;
    let bestScore = -1;

    for (const candidate of boundedCandidates) {
      const score = submissionSimilarity(
        submission.answers,
        candidate.answers,
        optionMap
      );

      if (
        score > bestScore ||
        // Deterministic tie-break: earlier submitted_at, then lexical submission_id
        (score === bestScore &&
          bestCandidate !== null &&
          (candidate.submitted_at < bestCandidate.submitted_at ||
            (candidate.submitted_at.getTime() === bestCandidate.submitted_at.getTime() &&
              candidate.submission_id.localeCompare(bestCandidate.submission_id) < 0)))
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

