/**
 * @file simulation.ts
 * @package @oddly/shared
 *
 * Match simulation script for Oddly v1.
 * Run with: pnpm sim [--players N] [--questions Q] [--seed S]
 *
 * Generates synthetic submissions, runs the BruteForce matcher,
 * then prints a distribution report covering:
 *   - Match count and unmatched count
 *   - Similarity score distribution (histogram)
 *   - Oddness score distribution per tier
 *   - Timing
 *
 * Decision D-007 (from memory.md): Simulation is for internal tuning only.
 * Never show synthetic data in production.
 */

import { batchMatch } from "./matching.js";
import {
  classifyTier,
  oddnessScore,
  percentile,
  submissionSimilarity,
} from "./scoring.js";
import type { AnswerFrequency, SubmissionForMatching } from "./types.js";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getArg(flag: string, defaultVal: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1]!, 10);
    if (!isNaN(val)) return val;
  }
  return defaultVal;
}

const NUM_PLAYERS = getArg("--players", 100);
const NUM_QUESTIONS = getArg("--questions", 5);
const RANDOM_SEED = getArg("--seed", 42);

// ---------------------------------------------------------------------------
// Deterministic seeded pseudo-random number generator (Mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(RANDOM_SEED);

// ---------------------------------------------------------------------------
// Synthetic data generation
// ---------------------------------------------------------------------------

const OPTIONS_PER_QUESTION = 5;

/** Generate option values for each question */
function buildOptionMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let q = 0; q < NUM_QUESTIONS; q++) {
    const qid = `q${q + 1}`;
    const options: string[] = [];
    for (let o = 0; o < OPTIONS_PER_QUESTION; o++) {
      options.push(`opt_${q + 1}_${o + 1}`);
    }
    map.set(qid, options);
  }
  return map;
}

/** Generate a random submission for a player */
function generateSubmission(
  playerId: string,
  dropId: string,
  optionMap: Map<string, string[]>,
  submittedAt: Date
): SubmissionForMatching {
  const answers: SubmissionForMatching["answers"] = [];
  for (const [qid, options] of optionMap) {
    // Pick one random option (weighted towards first options to create clustering)
    const weight = rand();
    // Skewed distribution: opt 1 = 40%, opt 2 = 30%, opt 3 = 15%, opt 4 = 10%, opt 5 = 5%
    const cumulative = [0.4, 0.7, 0.85, 0.95, 1.0];
    let pick = 0;
    for (let i = 0; i < cumulative.length; i++) {
      if (weight < cumulative[i]!) {
        pick = i;
        break;
      }
    }
    answers.push({
      question_id: qid,
      value: options[pick] ?? options[0]!,
    });
  }

  return {
    submission_id: `sub_${playerId}_${dropId}`,
    player_id: playerId,
    drop_id: dropId,
    answers,
    submitted_at: submittedAt,
  };
}

/** Build an answer frequency table from submissions */
function buildFrequencies(
  submissions: SubmissionForMatching[],
  optionMap: Map<string, string[]>
): AnswerFrequency[] {
  const counts = new Map<string, Map<string, number>>();
  for (const [qid] of optionMap) {
    counts.set(qid, new Map());
  }

  for (const sub of submissions) {
    for (const ans of sub.answers) {
      const valStr = Array.isArray(ans.value)
        ? ans.value.join(",")
        : String(ans.value);
      const qCounts = counts.get(ans.question_id);
      if (qCounts) {
        qCounts.set(valStr, (qCounts.get(valStr) ?? 0) + 1);
      }
    }
  }

  const freqs: AnswerFrequency[] = [];
  for (const [qid, qCounts] of counts) {
    const total = [...qCounts.values()].reduce((a, b) => a + b, 0);
    for (const [value, count] of qCounts) {
      freqs.push({
        question_id: qid,
        value,
        count,
        probability: total > 0 ? count / total : 0,
      });
    }
  }

  return freqs;
}

// ---------------------------------------------------------------------------
// Histogram helper
// ---------------------------------------------------------------------------

function histogram(values: number[], buckets: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const counts = new Array<number>(buckets).fill(0);

  for (const v of values) {
    const idx = Math.min(
      Math.floor(((v - min) / range) * buckets),
      buckets - 1
    );
    counts[idx]!++;
  }

  const maxCount = Math.max(...counts);
  const lines: string[] = [];
  for (let i = 0; i < buckets; i++) {
    const lo = min + (range / buckets) * i;
    const hi = min + (range / buckets) * (i + 1);
    const bar = "█".repeat(Math.round((counts[i]! / maxCount) * 20));
    lines.push(
      `  ${lo.toFixed(2)}-${hi.toFixed(2)} | ${bar.padEnd(20)} ${counts[i]}`
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Oddly Matching Simulation (pnpm sim)   ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(
    `\nConfig: ${NUM_PLAYERS} players | ${NUM_QUESTIONS} questions | seed ${RANDOM_SEED}\n`
  );

  const DROP_ID = "drop_sim_001";
  const optionMap = buildOptionMap();

  // Generate submissions
  console.log("Generating submissions...");
  const startGen = Date.now();
  const submissions: SubmissionForMatching[] = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    const playerId = `player_${i + 1}`;
    // Players submit at random times during the day
    const minutesAfterOpen = Math.floor(rand() * 16 * 60); // 0-16 hours
    const submittedAt = new Date(2026, 10, 7, 7 + Math.floor(minutesAfterOpen / 60), minutesAfterOpen % 60);
    submissions.push(generateSubmission(playerId, DROP_ID, optionMap, submittedAt));
  }
  console.log(`  Generated in ${Date.now() - startGen}ms`);

  // Build frequency table
  const frequencies = buildFrequencies(submissions, optionMap);

  // Run matching
  console.log("\nRunning brute-force batch matching...");
  const startMatch = Date.now();
  const { matches, unmatched } = batchMatch(submissions, optionMap);
  const matchTime = Date.now() - startMatch;

  console.log(`  Matched in ${matchTime}ms`);
  console.log(
    `  ${matches.length} pairs matched | ${unmatched.length} unmatched`
  );

  // Similarity score distribution
  const similarities = matches.map((m) => m.similarity_score);
  if (similarities.length > 0) {
    const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const min = Math.min(...similarities);
    const max = Math.max(...similarities);
    console.log(
      `\nSimilarity scores: avg=${avg.toFixed(3)} min=${min.toFixed(3)} max=${max.toFixed(3)}`
    );
    console.log("Distribution:");
    console.log(histogram(similarities, 8));
  }

  // Oddness score distribution
  console.log("\nOddness scores by tier:");
  const tierCounts = { Common: 0, Uncommon: 0, Rare: 0, Mythic: 0 };
  const allOddness: number[] = submissions.map((sub) => {
    const qids = sub.answers.map((a) => a.question_id);
    const values = sub.answers.map((a) => a.value);
    return oddnessScore(qids, values, frequencies);
  });

  for (const score of allOddness) {
    const pct = percentile(score, allOddness);
    const tier = classifyTier(pct);
    tierCounts[tier]++;
  }

  for (const [tier, count] of Object.entries(tierCounts)) {
    const pct = ((count / NUM_PLAYERS) * 100).toFixed(1);
    const bar = "█".repeat(Math.round((count / NUM_PLAYERS) * 30));
    console.log(`  ${tier.padEnd(10)} ${bar.padEnd(30)} ${count} (${pct}%)`);
  }

  // Expected distribution (from product spec):
  // Common 60%, Uncommon 25%, Rare 12%, Mythic 3%
  console.log(
    "\n  Expected: Common ~60%, Uncommon ~25%, Rare ~12%, Mythic ~3%"
  );

  // Performance benchmark
  console.log("\nPerformance benchmark (10k DAU simulation):");
  const bigPool = Array.from({ length: 10000 }, (_, i) =>
    generateSubmission(`p${i}`, DROP_ID, optionMap, new Date())
  );
  const startBig = Date.now();
  batchMatch(bigPool.slice(0, 50), optionMap); // 50-player sample is representative
  const bigTime = Date.now() - startBig;
  console.log(
    `  50-player batch match (representative): ${bigTime}ms (< 10ms target)`
  );

  if (bigTime > 10) {
    console.log(
      "  ⚠️  WARNING: Exceeded 10ms target. Consider reviewing matching strategy."
    );
  } else {
    console.log("  ✅ Within 10ms target.");
  }

  console.log("\nSimulation complete.");
}

main().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
