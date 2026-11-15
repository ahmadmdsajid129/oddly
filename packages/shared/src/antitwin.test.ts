import { describe, it, expect } from "vitest";
import {
  computeAntiTwin,
  isAntiTwinCandidatePreferred,
  getAntiTwinAffirmation,
  type AntiTwinCandidate,
} from "./antitwin.js";

describe("AntiTwin Domain Engine (Stage F4 / Phase 10D)", () => {
  const optionMap = new Map<string, string[]>([
    ["q1", ["A", "B"]],
    ["q2", ["A", "B", "C"]],
    ["q3", ["A", "B"]],
    ["q4", ["A", "B", "C", "D"]],
    ["q5", ["A", "B"]],
  ]);

  const target: AntiTwinCandidate = {
    submission_id: "sub-target",
    player_id: "player-target",
    country: "IN",
    region: "IN",
    age_band: "25-34",
    answers: [
      { question_id: "q1", answer_key: "A" },
      { question_id: "q2", answer_key: "A" },
      { question_id: "q3", answer_key: "A" },
      { question_id: "q4", answer_key: "A" },
      { question_id: "q5", answer_key: "A" },
    ],
  };

  it("selects the candidate with the lowest similarity score (most opposite)", () => {
    const candidateSimilar: AntiTwinCandidate = {
      submission_id: "sub-1",
      player_id: "player-1",
      country: "IN",
      answers: [
        { question_id: "q1", answer_key: "A" },
        { question_id: "q2", answer_key: "A" },
        { question_id: "q3", answer_key: "A" },
        { question_id: "q4", answer_key: "A" },
        { question_id: "q5", answer_key: "B" }, // 4 matches
      ],
    };

    const candidateOpposite: AntiTwinCandidate = {
      submission_id: "sub-2",
      player_id: "player-2",
      country: "IN",
      answers: [
        { question_id: "q1", answer_key: "B" },
        { question_id: "q2", answer_key: "B" },
        { question_id: "q3", answer_key: "B" },
        { question_id: "q4", answer_key: "B" },
        { question_id: "q5", answer_key: "B" }, // 0 matches (5 differed)
      ],
    };

    const result = computeAntiTwin(target, [candidateSimilar, candidateOpposite], optionMap, "drop-1");
    expect(result).not.toBeNull();
    expect(result!.opposite_submission_ref).toBe("sub-2");
    expect(result!.differed_count).toBe(5);
    expect(result!.differed_question_ids).toHaveLength(5);
    expect(result!.sample_size).toBe(2);
  });

  it("strictly enforces zero opposite pick exposure in result payload", () => {
    const candidateOpposite: AntiTwinCandidate = {
      submission_id: "sub-opp",
      player_id: "player-opp",
      country: "DE",
      region: "DE",
      age_band: "18-24",
      answers: [
        { question_id: "q1", answer_key: "B" },
        { question_id: "q2", answer_key: "C" },
        { question_id: "q3", answer_key: "B" },
        { question_id: "q4", answer_key: "D" },
        { question_id: "q5", answer_key: "B" },
      ],
    };

    const result = computeAntiTwin(target, [candidateOpposite], optionMap, "drop-1");
    expect(result).not.toBeNull();
    // Invariant: Result contains differed question IDs and aggregate counts, NEVER the opposite user's answer keys
    expect(result).not.toHaveProperty("opposite_answers");
    expect(result).not.toHaveProperty("answers");
    expect(result).not.toHaveProperty("opposite_picks");
    expect(result!.opposite_region).toBe("DE");
    expect(result!.opposite_age_band).toBe("18-24");
  });

  it("tie-breaking prefers a candidate from a different country first", () => {
    const candidateSameCountry: AntiTwinCandidate = {
      submission_id: "sub-in",
      player_id: "player-in",
      country: "IN",
      answers: [
        { question_id: "q1", answer_key: "B" },
        { question_id: "q2", answer_key: "B" },
        { question_id: "q3", answer_key: "A" },
        { question_id: "q4", answer_key: "A" },
        { question_id: "q5", answer_key: "A" },
      ],
    };

    const candidateDiffCountry: AntiTwinCandidate = {
      submission_id: "sub-jp",
      player_id: "player-jp",
      country: "JP",
      answers: [
        { question_id: "q1", answer_key: "B" },
        { question_id: "q2", answer_key: "B" },
        { question_id: "q3", answer_key: "A" },
        { question_id: "q4", answer_key: "A" },
        { question_id: "q5", answer_key: "A" },
      ],
    };

    const preferred = isAntiTwinCandidatePreferred(
      target,
      candidateDiffCountry,
      0.4,
      candidateSameCountry,
      0.4,
      "drop-1"
    );
    expect(preferred).toBe(true);

    const result = computeAntiTwin(target, [candidateSameCountry, candidateDiffCountry], optionMap, "drop-1");
    expect(result?.opposite_submission_ref).toBe("sub-jp");
  });

  it("bounds candidate sample size to bounded limit (e.g. 2000)", () => {
    const candidates: AntiTwinCandidate[] = [];
    for (let i = 0; i < 2500; i++) {
      candidates.push({
        submission_id: `sub-${i}`,
        player_id: `player-${i}`,
        country: "US",
        answers: [
          { question_id: "q1", answer_key: "B" },
          { question_id: "q2", answer_key: "B" },
          { question_id: "q3", answer_key: "B" },
          { question_id: "q4", answer_key: "B" },
          { question_id: "q5", answer_key: "B" },
        ],
      });
    }

    const result = computeAntiTwin(target, candidates, optionMap, "drop-1", 2000);
    expect(result).not.toBeNull();
    expect(result!.sample_size).toBe(2000);
  });

  it("filters out self submission and self player", () => {
    const selfCandidate: AntiTwinCandidate = {
      submission_id: target.submission_id,
      player_id: target.player_id,
      country: target.country,
      answers: target.answers,
    };

    const result = computeAntiTwin(target, [selfCandidate], optionMap, "drop-1");
    expect(result).toBeNull();
  });

  it("returns kind, affirming microcopy for various differed levels", () => {
    expect(getAntiTwinAffirmation(5, 5)).toContain("yin to your yang");
    expect(getAntiTwinAffirmation(4, 5)).toContain("instincts aligned on one pick");
    expect(getAntiTwinAffirmation(3, 5)).toContain("Different instincts make the world interesting");
    expect(getAntiTwinAffirmation(1, 5)).toContain("closest opposites share common ground");
  });
});
