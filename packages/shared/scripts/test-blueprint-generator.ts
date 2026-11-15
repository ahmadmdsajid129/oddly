/**
 * @file test-blueprint-generator.ts
 * Implements and verifies the calibrated Blueprint Synthetic Generator for Stage R2-PATCH-3.
 */

import type { SubmissionForMatching, StoredAnswer } from "../src/types.js";

// Number of states: Kh = 13,200 head states, Kt = 22,500 tail states (Total = 35,700)
const Kh = 13200;
const Kt = 22500;
const TOTAL_STATES = Kh + Kt;
const a = 0.663;
const c = 42;
const tw = 0.091;

// 1. Build discrete distribution P
const raw_h: number[] = [];
for (let i = 1; i <= Kh; i++) {
  raw_h.push(Math.pow(i + c, -a));
}
const sum_h = raw_h.reduce((acc, v) => acc + v, 0);
const P_head = raw_h.map(v => (v / sum_h) * (1 - tw));

const P_tail: number[] = [];
for (let i = 1; i <= Kt; i++) {
  P_tail.push(tw / Kt);
}

const P: number[] = P_head.concat(P_tail);

// Compute Whole-Set Shannon Entropy:
export function computeWholeSetEntropy(): number {
  return -P.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
}

// 2. Precompute Cumulative Distribution for fast binary-search sampling
const cumP = new Float64Array(P.length);
let acc = 0;
for (let i = 0; i < P.length; i++) {
  acc += P[i]!;
  cumP[i] = acc;
}
cumP[P.length - 1] = 1.0;

function sampleState(r: number): number {
  let low = 0;
  let high = cumP.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumP[mid]! < r) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// 3. Deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 4. Domains for the 5 questions
const Q1_OPTIONS = ["Always cold pizza", "Always flat soda"];
const Q2_OPTIONS = Array.from({ length: 50 }, (_, i) => `${i + 1}`);
const Q3_OPTIONS = [
  "Mint", "Violet", "Coral", "Sky", "Amber", "Sunshine",
  "Teal", "Indigo", "Pink", "Crimson", "Lime", "Slate"
];
const Q4_OPTIONS = ["snack_ramen", "snack_cereal", "snack_sandwich", "snack_leftovers"];
// 20 combinations of 3 from 6 words:
const WORDS = ["loyalty", "humour", "honesty", "spontaneity", "empathy", "ambition"];
const Q5_TRIPLETS: string[] = [];
for (let i = 0; i < WORDS.length; i++) {
  for (let j = i + 1; j < WORDS.length; j++) {
    for (let k = j + 1; k < WORDS.length; k++) {
      Q5_TRIPLETS.push(`${WORDS[i]},${WORDS[j]},${WORDS[k]}`);
    }
  }
}

// 5. Precompute unique answer vector for each of the 35,700 states
// We map each state index `s` to a unique 5-tuple:
// Total state space = 2 * 50 * 12 * 4 * 20 = 96,000 combinations.
// We use a deterministic linear congruential permutation into the 96,000 space:
const M = 96000;
// Coprime to 96000 (96000 = 2^8 * 3 * 5^3): a = 7919 (prime)
const A = 7919;
const B = 1013904223;

interface AnswerTuple {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
}

const stateAnswerMap: AnswerTuple[] = new Array(TOTAL_STATES);

for (let s = 0; s < TOTAL_STATES; s++) {
  // Compute deterministic index in [0, M-1]
  const permIdx = (Math.imul(s, A) + B) >>> 0;
  const comboIdx = permIdx % M;

  const q1Idx = comboIdx % 2;
  let rem = Math.floor(comboIdx / 2);
  const q4Idx = rem % 4;
  rem = Math.floor(rem / 4);
  const q3Idx = rem % 12;
  rem = Math.floor(rem / 12);
  const q5Idx = rem % 20;
  rem = Math.floor(rem / 20);
  const q2Idx = rem % 50;

  stateAnswerMap[s] = {
    q1: Q1_OPTIONS[q1Idx]!,
    q2: Q2_OPTIONS[q2Idx]!,
    q3: Q3_OPTIONS[q3Idx]!,
    q4: Q4_OPTIONS[q4Idx]!,
    q5: Q5_TRIPLETS[q5Idx]!,
  };
}

export function generateCalibratedPlayer(
  index: number,
  rng: () => number
): SubmissionForMatching {
  const s = sampleState(rng());
  const answers = stateAnswerMap[s]!;

  return {
    player_id: `player_${index}`,
    submission_id: `sub_${index}`,
    drop_id: "drop_blueprint_calibrated",
    answers: [
      { question_id: "q1", value: answers.q1 },
      { question_id: "q2", value: answers.q2 },
      { question_id: "q3", value: answers.q3 },
      { question_id: "q4", value: answers.q4 },
      { question_id: "q5", value: answers.q5 },
    ],
    submitted_at: new Date(1700000000000 + index * 1000),
  };
}

export function runBlueprintComparison() {
  const H = computeWholeSetEntropy();
  console.log("================================================================================");
  console.log("STAGE R2-PATCH-3 ITEM 1: BLUEPRINT MATCH-QUALITY REPRODUCTION TABLE");
  console.log("================================================================================");
  console.log(`Whole-Set Shannon Entropy: ${H.toFixed(2)} bits (Blueprint target: ~13.67 bits)\n`);

  console.log("| Metric / Pool Size | Blueprint Target | Calibrated Generator (Analytical) | Calibrated Generator (Empirical Simulation) |");
  console.log("|---|---|---|---|");

  // Analytical expectations
  let ana1k = 0;
  let ana10k = 0;
  let ana100k = 0;
  for (const p of P) {
    ana1k += p * (1 - Math.exp(-999 * p));
    ana10k += p * (1 - Math.exp(-9999 * p));
    ana100k += p * (1 - Math.exp(-99999 * p));
  }

  // Empirical simulation
  const checkEmpirical = (N: number) => {
    const rng = mulberry32(424242);
    const counts = new Map<number, number>();
    const stateList: number[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const s = sampleState(rng());
      stateList[i] = s;
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    let matchCount = 0;
    for (let i = 0; i < N; i++) {
      if ((counts.get(stateList[i]!) || 0) > 1) {
        matchCount++;
      }
    }
    return (matchCount / N) * 100;
  };

  const emp1k = checkEmpirical(1000);
  const emp10k = checkEmpirical(10000);
  const emp100k = checkEmpirical(100000);

  console.log(`| Entropy (bits) | ~13.67 bits | ${H.toFixed(2)} bits | ${H.toFixed(2)} bits |`);
  console.log(`| 1,000 players (% best twin shares all 5) | ~13% | ${(ana1k * 100).toFixed(1)}% | ${emp1k.toFixed(1)}% |`);
  console.log(`| 10,000 players (% best twin shares all 5) | ~56% | ${(ana10k * 100).toFixed(1)}% | ${emp10k.toFixed(1)}% |`);
  console.log(`| 100,000 players (% best twin shares all 5) | ~93% | ${(ana100k * 100).toFixed(1)}% | ${emp100k.toFixed(1)}% |`);
  console.log("================================================================================\n");
}

runBlueprintComparison();
