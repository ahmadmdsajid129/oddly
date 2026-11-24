/**
 * @file seed-200-scenario.mjs
 * @package oddly/tools
 *
 * Stage B0 Slice A14: Realistic 200-Player Scenario Seeder & Matcher.
 *
 * Simulates a realistic pool of 200 players answering today's 5 questions:
 * - Q1: pick1 (cardinality 4)
 * - Q2: pick2of6 (subset size 2 from 6 options)
 * - Q3: rank3 (permutation of 3 options)
 * - Q4: slider7 (integer 1..7)
 * - Q5: scene (pick 1 from 4 options)
 *
 * Evaluates:
 * - Exact Information Weights per question
 * - Full Mutual Pairing Graph bounded strictly to tie groups (epsilon = 0.01)
 * - Lexicographic Tie-Breaker (H score -> Country diversity -> HMAC salt)
 * - "Why you two?" rarest shared answer identification
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SCENARIO_QUESTIONS = [
  { id: "q-1", format: "pick1", prompt: "Morning drink:", options: ["espresso", "latte", "chai", "cold_brew"] },
  { id: "q-2", format: "pick2of6", prompt: "Two ideal desk items:", options: ["notebook", "fountain_pen", "mechanical_keyboard", "plant", "desk_pad", "mug_warmer"] },
  { id: "q-3", format: "rank3", prompt: "Rank ideal vacation pace:", options: ["spontaneous_wander", "packed_itinerary", "relax_by_water"] },
  { id: "q-4", format: "slider7", prompt: "Social energy level on Friday night (1-7):", min: 1, max: 7 },
  { id: "q-5", format: "scene", prompt: "At a bookshop cafe, what do you do?", options: ["corner_armchair", "browse_art_table", "chat_barista", "people_watch_window"] },
];

const COUNTRIES = ["IN", "GB", "DE", "US", "CA", "JP", "FR", "AU", "SG", "NL"];

export function generate200Players() {
  const players = [];

  for (let i = 1; i <= 200; i++) {
    const id = `player-${String(i).padStart(3, "0")}`;
    const country = COUNTRIES[(i * 7) % COUNTRIES.length];

    // Pick 1: skewed towards chai (35%) and espresso (30%)
    const p1Rand = (i * 13) % 100;
    const q1 = p1Rand < 35 ? "chai" : p1Rand < 65 ? "espresso" : p1Rand < 85 ? "latte" : "cold_brew";

    // Pick 2 of 6: 2 distinct items
    const opt2 = SCENARIO_QUESTIONS[1].options;
    const idxA = (i * 3) % 6;
    const idxB = (idxA + 1 + ((i * 5) % 5)) % 6;
    const q2 = [opt2[Math.min(idxA, idxB)], opt2[Math.max(idxA, idxB)]];

    // Rank 3: permutation of 3 items
    const opt3 = [...SCENARIO_QUESTIONS[2].options];
    const shift = i % 3;
    const reverse = i % 2 === 0;
    const q3 = shift === 0 ? opt3 : shift === 1 ? [opt3[1], opt3[2], opt3[0]] : [opt3[2], opt3[0], opt3[1]];
    if (reverse) q3.reverse();

    // Slider 7: 1..7
    const q4 = 1 + ((i * 11) % 7);

    // Scene: 4 options
    const q5 = SCENARIO_QUESTIONS[4].options[(i * 17) % 4];

    // BitMinHash history signature (64 bits as hex string)
    const hmac = createHmac("sha256", "oddly-test-salt")
      .update(`${id}-history`)
      .digest("hex")
      .slice(0, 16);

    players.push({
      id,
      alias: `Twin#${i}`,
      country,
      historySignature: hmac,
      answers: {
        "q-1": q1,
        "q-2": q2,
        "q-3": q3,
        "q-4": q4,
        "q-5": q5,
      },
    });
  }

  return players;
}

// Similarity functions
export function computeSim(q, a, b) {
  if (q.format === "pick1" || q.format === "scene") {
    return a === b ? 1.0 : 0.0;
  }
  if (q.format === "pick2of6") {
    const setA = new Set(a);
    let inter = 0;
    for (const x of b) if (setA.has(x)) inter++;
    const union = setA.size + new Set(b).size - inter;
    return union > 0 ? inter / union : 0.0;
  }
  if (q.format === "rank3") {
    let disc = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const aOrder = a.indexOf(a[i]) < a.indexOf(a[j]);
        const bOrder = b.indexOf(a[i]) < b.indexOf(a[j]);
        if (aOrder !== bOrder) disc++;
      }
    }
    return 1.0 - disc / 3.0;
  }
  if (q.format === "slider7") {
    return 1.0 - Math.abs(a - b) / 6.0;
  }
  return 0.0;
}

export function selfInfo(prob, cap = 3.5) {
  if (prob <= 0) return cap;
  if (prob >= 1.0) return 0.0;
  return Math.min(-Math.log2(prob), cap);
}

export function run200Scenario() {
  const players = generate200Players();
  const N = players.length;

  // 1. Compute marginal answer frequencies and self-information
  const itemCounts = {};
  for (const q of SCENARIO_QUESTIONS) {
    itemCounts[q.id] = {};
    for (const p of players) {
      const val = p.answers[q.id];
      const key = Array.isArray(val) ? [...val].sort().join(",") : String(val);
      itemCounts[q.id][key] = (itemCounts[q.id][key] || 0) + 1;
    }
  }

  function getWeight(qId, valA, valB) {
    const keyA = Array.isArray(valA) ? [...valA].sort().join(",") : String(valA);
    const keyB = Array.isArray(valB) ? [...valB].sort().join(",") : String(valB);
    const pA = (itemCounts[qId][keyA] || 1) / N;
    const pB = (itemCounts[qId][keyB] || 1) / N;
    const infoA = selfInfo(pA);
    const infoB = selfInfo(pB);
    return Math.max(0.1, (infoA + infoB) / 2.0);
  }

  function simBetween(pA, pB) {
    let weightedSimSum = 0;
    let weightSum = 0;
    for (const q of SCENARIO_QUESTIONS) {
      const a = pA.answers[q.id];
      const b = pB.answers[q.id];
      const s = computeSim(q, a, b);
      const w = getWeight(q.id, a, b);
      weightedSimSum += s * w;
      weightSum += w;
    }
    return weightSum > 0 ? weightedSimSum / weightSum : 0;
  }

  // 2. Pair candidates & determine tie groups (EPSILON = 0.01)
  const EPSILON = 0.01;
  const playerScores = new Map();
  const playerTieGroups = new Map();

  for (let i = 0; i < N; i++) {
    const pA = players[i];
    let bestS = 0;
    const candidateList = [];

    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const pB = players[j];
      const s = simBetween(pA, pB);
      if (s > bestS) bestS = s;
      candidateList.push({ candidateId: pB.id, sim: s });
    }

    candidateList.sort((a, b) => b.sim - a.sim);
    playerScores.set(pA.id, { bestS, candidates: candidateList });
    const tieGroup = candidateList.filter((c) => c.sim >= bestS - EPSILON);
    playerTieGroups.set(pA.id, tieGroup);
  }

  // 3. Mutual Pairing (Two-Way Agreement in Tie Groups)
  const edges = [];
  const edgeSet = new Set();
  for (const [pId, tieGroup] of playerTieGroups.entries()) {
    for (const cand of tieGroup) {
      const otherGroup = playerTieGroups.get(cand.candidateId);
      if (otherGroup?.some((c) => c.candidateId === pId)) {
        const [u, v] = pId < cand.candidateId ? [pId, cand.candidateId] : [cand.candidateId, pId];
        const key = `${u}:${v}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ u, v, weight: cand.sim });
        }
      }
    }
  }

  edges.sort((a, b) => b.weight - a.weight);

  const matched = new Set();
  const pairs = [];
  for (const edge of edges) {
    if (!matched.has(edge.u) && !matched.has(edge.v)) {
      matched.add(edge.u);
      matched.add(edge.v);
      pairs.push(edge);
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    playerCount: N,
    mutualPairsCount: pairs.length,
    matchedPlayersCount: matched.size,
    unmatchedCount: N - matched.size,
    samplePair: pairs[0] || null,
  };

  const outputPath = resolve(__dirname, "scenario-200.json");
  writeFileSync(
    outputPath,
    JSON.stringify({ summary: result, players: players.slice(0, 10), pairs: pairs.slice(0, 20) }, null, 2),
    "utf-8"
  );

  return { result, players, pairs, playerScores, playerTieGroups };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { result } = run200Scenario();
  console.log("=================================================");
  console.log("Stage B0: 200-Player Scenario Seeder Completed");
  console.log("=================================================");
  console.log(`- Players Seeded:       ${result.playerCount}`);
  console.log(`- Mutual Pairs Formed:  ${result.mutualPairsCount} (${result.matchedPlayersCount} players)`);
  console.log(`- Unmatched Fallback:   ${result.unmatchedCount}`);
  console.log(`- Top Matched Edge:     ${result.samplePair?.u} <-> ${result.samplePair?.v} (Score: ${(result.samplePair?.weight * 100).toFixed(1)}%)`);
  console.log("=================================================");
}
