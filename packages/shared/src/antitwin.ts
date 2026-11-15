/**
 * @file antitwin.ts
 * @package @oddly/shared
 *
 * Anti-Twin ("Your Opposite Today") Domain Engine (Stage F4 / Phase 10D / F21 / ADR-040).
 *
 * Invariants:
 * 1. Asynchronous bounded candidate sampling (<= 2,000 candidates).
 * 2. Inverted similarity search: finds candidate with minimum similarity.
 * 3. Tie-breaking: different country first, then deterministic hash seeded by drop and player IDs.
 * 4. Zero-pick privacy invariant: never store or return opposite user's answer choices or vectors.
 * 5. Minimum pool threshold: low pools (< 200 players) are gracefully hidden with honest copy.
 */

import { deterministicPairHash } from "./matching.js";
import { submissionSimilarity } from "./scoring.js";

export interface AntiTwinCandidate {
  submission_id: string;
  player_id: string;
  country?: string;
  region?: string;
  age_band?: string;
  answers: Array<{
    question_id: string;
    answer_key: string;
    value_index?: number;
  }>;
}

export interface AntiTwinCalculationResult {
  opposite_submission_ref: string;
  opposite_player_id: string;
  differed_count: number;
  sample_size: number;
  differed_question_ids: string[];
  opposite_region: string;
  opposite_age_band: string;
  note: string;
}

/**
 * Compares whether candidate A is preferred over candidate B as an Anti-Twin.
 * Priority:
 * 1. Lower similarity score (most different).
 * 2. Equal similarity: prefer different country first.
 * 3. Equal country: deterministic pair hash seeded by drop_id and player IDs.
 * 4. Lexical tie-break on submission_id.
 */
export function isAntiTwinCandidatePreferred(
  target: AntiTwinCandidate,
  candidateA: AntiTwinCandidate,
  scoreA: number,
  candidateB: AntiTwinCandidate,
  scoreB: number,
  dropId: string
): boolean {
  // 1. Lower similarity score is preferred for opposite
  if (scoreA !== scoreB) {
    return scoreA < scoreB;
  }

  // 2. Equal similarity: prefer different country first
  const targetCountry = target.country?.trim().toUpperCase();
  const countryA = candidateA.country?.trim().toUpperCase();
  const countryB = candidateB.country?.trim().toUpperCase();

  if (targetCountry && countryA && countryB) {
    const aDiff = countryA !== targetCountry;
    const bDiff = countryB !== targetCountry;
    if (aDiff && !bDiff) return true;
    if (!aDiff && bDiff) return false;
  } else if (targetCountry) {
    const aDiff = Boolean(countryA && countryA !== targetCountry);
    const bDiff = Boolean(countryB && countryB !== targetCountry);
    if (aDiff && !bDiff) return true;
    if (!aDiff && bDiff) return false;
  }

  // 3. Deterministic pseudo-random choice seeded by drop date / id and both user IDs
  const hashA = deterministicPairHash(dropId, target.player_id, candidateA.player_id);
  const hashB = deterministicPairHash(dropId, target.player_id, candidateB.player_id);

  if (hashA !== hashB) {
    return hashA > hashB;
  }

  // 4. Lexical tie-break
  return candidateA.submission_id.localeCompare(candidateB.submission_id) < 0;
}

/**
 * Generates kind, affirming microcopy for the Anti-twin result card.
 */
export function getAntiTwinAffirmation(differedCount: number, totalQuestions: number): string {
  if (differedCount === totalQuestions) {
    return "Completely opposite instincts across the board. The yin to your yang!";
  }
  if (differedCount === totalQuestions - 1) {
    return "Differed on almost everything, but your instincts aligned on one pick!";
  }
  if (differedCount >= Math.ceil(totalQuestions / 2)) {
    return "Different instincts make the world interesting. Opposite paths today!";
  }
  return "Even our closest opposites share common ground!";
}

/**
 * Computes the Anti-Twin for a target submission against a candidate pool.
 * Decoupled from submit path, scans bounded sample (<= maxSampleSize).
 */
export function computeAntiTwin(
  target: AntiTwinCandidate,
  pool: AntiTwinCandidate[],
  optionMap: Map<string, string[]>,
  dropId: string,
  maxSampleSize: number = 2000
): AntiTwinCalculationResult | null {
  // Exclude self (player_id or submission_id match)
  const eligible = pool.filter(
    (c) =>
      c.player_id !== target.player_id &&
      c.submission_id !== target.submission_id
  );

  if (eligible.length === 0) {
    return null;
  }

  // Bounded sample: take up to maxSampleSize
  const sample = eligible.length > maxSampleSize ? eligible.slice(0, maxSampleSize) : eligible;

  let bestCandidate: AntiTwinCandidate | null = null;
  let bestScore: number = Infinity;

  // Map target answers to scoring format { question_id, value }
  const targetScoringAnswers = target.answers.map((a) => ({
    question_id: a.question_id,
    value: a.answer_key,
  }));

  for (const candidate of sample) {
    const candidateScoringAnswers = candidate.answers.map((a) => ({
      question_id: a.question_id,
      value: a.answer_key,
    }));
    const score = submissionSimilarity(targetScoringAnswers, candidateScoringAnswers, optionMap);

    if (bestCandidate === null) {
      bestCandidate = candidate;
      bestScore = score;
      continue;
    }

    if (isAntiTwinCandidatePreferred(target, candidate, score, bestCandidate, bestScore, dropId)) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  if (!bestCandidate) {
    return null;
  }

  // Determine which of the TARGET's questions differed (zero opposite pick answers revealed)
  const candidateAnswerMap = new Map<string, string>();
  for (const a of bestCandidate.answers) {
    candidateAnswerMap.set(a.question_id, a.answer_key);
  }

  const differedQuestionIds: string[] = [];
  for (const a of target.answers) {
    const oppKey = candidateAnswerMap.get(a.question_id);
    if (!oppKey || oppKey !== a.answer_key) {
      differedQuestionIds.push(a.question_id);
    }
  }

  const totalQuestions = target.answers.length || 5;
  const affirmation = getAntiTwinAffirmation(differedQuestionIds.length, totalQuestions);

  return {
    opposite_submission_ref: bestCandidate.submission_id,
    opposite_player_id: bestCandidate.player_id,
    differed_count: differedQuestionIds.length,
    sample_size: sample.length,
    differed_question_ids: differedQuestionIds,
    opposite_region: bestCandidate.region || "Global",
    opposite_age_band: bestCandidate.age_band || "18+",
    note: affirmation,
  };
}
