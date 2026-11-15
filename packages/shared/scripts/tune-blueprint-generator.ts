/**
 * @file tune-blueprint-generator.ts
 * Calibrates the synthetic player generator to reproduce the blueprint's match-quality table:
 * - Whole-set entropy: ~13.67 bits
 * - Share of players whose best twin shares all 5 answers:
 *     - ~13% at 1,000 players
 *     - ~56% at 10,000 players
 *     - ~93% at 100,000 players
 */

// Let's model the 5 question discrete distributions:

// Let's optimize the distribution parameters to hit:
// Whole-set entropy: ~13.67 bits
// N = 1,000 -> ~13%
// N = 10,000 -> ~56%
// N = 100,000 -> ~93%

function entropy(probs: number[]): number {
  return -probs.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
}

// Let's systematically find the exact head & tail shape that hits:
// H ~ 13.67 bits
// 1k ~ 13%
// 10k ~ 56%
// 100k ~ 93%

function testConfig(q1_top: number, q2_top: number, q3_top: number, q4_top: number, q5_top: number) {
  // Q1: binary
  const q1_probs = [q1_top, 1 - q1_top];

  // Q2: 50 numbers (e.g. zipf or exponential)
  // Let's use power law i^(-alpha) for Q2, Q3, Q5
  const q2_raw: number[] = [];
  for (let i = 1; i <= 50; i++) {
    q2_raw.push(Math.pow(i, -q2_top));
  }
  const q2_sum = q2_raw.reduce((a, b) => a + b, 0);
  const q2_probs = q2_raw.map(v => v / q2_sum);

  // Q3: 12 colours
  const q3_raw: number[] = [];
  for (let i = 1; i <= 12; i++) {
    q3_raw.push(Math.pow(i, -q3_top));
  }
  const q3_sum = q3_raw.reduce((a, b) => a + b, 0);
  const q3_probs = q3_raw.map(v => v / q3_sum);

  // Q4: 4 images
  const q4_raw: number[] = [];
  for (let i = 1; i <= 4; i++) {
    q4_raw.push(Math.pow(i, -q4_top));
  }
  const q4_sum = q4_raw.reduce((a, b) => a + b, 0);
  const q4_probs = q4_raw.map(v => v / q4_sum);

  // Q5: 20 word combinations
  const q5_raw: number[] = [];
  for (let i = 1; i <= 20; i++) {
    q5_raw.push(Math.pow(i, -q5_top));
  }
  const q5_sum = q5_raw.reduce((a, b) => a + b, 0);
  const q5_probs = q5_raw.map(v => v / q5_sum);

  const h1 = entropy(q1_probs);
  const h2 = entropy(q2_probs);
  const h3 = entropy(q3_probs);
  const h4 = entropy(q4_probs);
  const h5 = entropy(q5_probs);
  const totalH = h1 + h2 + h3 + h4 + h5;

  let match1k = 0;
  let match10k = 0;
  let match100k = 0;

  for (const p1 of q1_probs) {
    for (const p2 of q2_probs) {
      for (const p3 of q3_probs) {
        for (const p4 of q4_probs) {
          for (const p5 of q5_probs) {
            const p = p1 * p2 * p3 * p4 * p5;
            match1k += p * (1 - Math.exp(999 * Math.log1p(-p)));
            match10k += p * (1 - Math.exp(9999 * Math.log1p(-p)));
            match100k += p * (1 - Math.exp(99999 * Math.log1p(-p)));
          }
        }
      }
    }
  }

  return {
    totalH,
    match1k: match1k * 100,
    match10k: match10k * 100,
    match100k: match100k * 100,
    q1_probs, q2_probs, q3_probs, q4_probs, q5_probs,
  };
}

let bestScore = 999999;
let bestCfg: any = null;

for (let a2 = 0.5; a2 <= 1.2; a2 += 0.1) {
  for (let a3 = 0.5; a3 <= 1.2; a3 += 0.1) {
    for (let a4 = 0.4; a4 <= 1.0; a4 += 0.2) {
      for (let a5 = 0.5; a5 <= 1.2; a5 += 0.1) {
        const res = testConfig(0.60, a2, a3, a4, a5);
        const errH = Math.abs(res.totalH - 13.67);
        const err1k = Math.abs(res.match1k - 13.0);
        const err10k = Math.abs(res.match10k - 56.0);
        const err100k = Math.abs(res.match100k - 93.0);
        const totalErr = errH * 3 + err1k + err10k + err100k;
        if (totalErr < bestScore) {
          bestScore = totalErr;
          bestCfg = { a2, a3, a4, a5, ...res };
          console.log(`NEW BEST: a2=${a2.toFixed(1)}, a3=${a3.toFixed(1)}, a4=${a4.toFixed(1)}, a5=${a5.toFixed(1)} -> H=${res.totalH.toFixed(2)}b, 1k=${res.match1k.toFixed(1)}%, 10k=${res.match10k.toFixed(1)}%, 100k=${res.match100k.toFixed(1)}% (err=${totalErr.toFixed(2)})`);
        }
      }
    }
  }
}
