/**
 * @file explainable-ranker.ts
 * @package @oddly/shared
 *
 * Explainable Pointwise ML Ranker for Optional Non-Drop Surfaces (Stage M7 / Phase 10J / P10J.02).
 *
 * Architectural Invariants:
 * 1. Strictly explainable: explicit feature coefficients and bias, zero black-box LLMs or neural networks.
 * 2. Non-Drop surfaces only: Drop questions remain 100% identical globally (Rule 12).
 * 3. Zero sensitive attributes: strictly non-protected metadata (Rule 14).
 * 4. Pointwise logistic regression with L2 regularization and sigmoid probability scoring.
 */

export interface MLFeatureVector {
  meme_wilson_lb: number;       // [0, 1] Wilson score lower bound
  meme_raters_log: number;      // [0, 1] log10(raters + 1) / log10(10000)
  tag_affinity: number;         // [0, 1] smoothed player_taste affinity (default 0.50)
  caption_length_norm: number;  // [0, 1] caption char length / 100
  author_funny_rate: number;    // [0, 1] author historical funny rating ratio
  hour_of_day_norm: number;     // [0, 1] engagement hour UTC / 24.0
}

export const ALLOWED_FEATURE_KEYS: (keyof MLFeatureVector)[] = [
  "meme_wilson_lb",
  "meme_raters_log",
  "tag_affinity",
  "caption_length_norm",
  "author_funny_rate",
  "hour_of_day_norm",
];

export interface ModelWeights {
  bias: number;
  weights: Record<keyof MLFeatureVector, number>;
}

export interface TrainingPair {
  id: string;
  features: MLFeatureVector;
  target: 0 | 1; // 1 = funny, 0 = not_for_me
  region?: string;
}

export interface ModelMetrics {
  train_loss: number;
  train_auc: number;
  baseline_auc: number;
  accuracy: number;
  pairs_count: number;
  iterations: number;
}

export interface TrainRankerOptions {
  learningRate?: number;
  l2Lambda?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

/**
 * Sigmoid activation function.
 */
export function sigmoid(z: number): number {
  if (z > 20) return 1.0;
  if (z < -20) return 0.0;
  return 1.0 / (1.0 + Math.exp(-z));
}

/**
 * Predict ranking probability score using explainable linear model.
 * score = sigma(w . x + b)
 */
export function predictRankScore(
  features: MLFeatureVector,
  model: ModelWeights
): number {
  let logit = model.bias;
  for (const key of ALLOWED_FEATURE_KEYS) {
    const val = features[key] ?? 0.5;
    logit += (model.weights[key] ?? 0.0) * val;
  }
  return sigmoid(logit);
}

/**
 * Compute Binary Cross-Entropy (Log-Loss) with L2 regularization penalty.
 */
export function computeLoss(
  pairs: TrainingPair[],
  model: ModelWeights,
  l2Lambda: number
): number {
  if (pairs.length === 0) return 0;
  let totalLoss = 0;
  for (const pair of pairs) {
    const p = Math.max(1e-15, Math.min(1 - 1e-15, predictRankScore(pair.features, model)));
    const loss = -(pair.target * Math.log(p) + (1 - pair.target) * Math.log(1 - p));
    totalLoss += loss;
  }
  let reg = 0;
  for (const key of ALLOWED_FEATURE_KEYS) {
    reg += (model.weights[key] ?? 0) ** 2;
  }
  return totalLoss / pairs.length + (l2Lambda / 2) * reg;
}

/**
 * Compute ROC-AUC (Concordance Metric / Mann-Whitney U test).
 */
export function computeAuc(
  scores: { score: number; target: number }[]
): number {
  const positives = scores.filter((s) => s.target === 1);
  const negatives = scores.filter((s) => s.target === 0);

  if (positives.length === 0 || negatives.length === 0) {
    return 0.5;
  }

  let concordant = 0;
  let ties = 0;

  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos.score > neg.score) {
        concordant++;
      } else if (pos.score === neg.score) {
        ties += 0.5;
      }
    }
  }

  return (concordant + ties) / (positives.length * negatives.length);
}

/**
 * Train explainable logistic regression ranker using gradient descent.
 */
export function trainLogisticRanker(
  pairs: TrainingPair[],
  options: TrainRankerOptions = {}
): { weights: ModelWeights; metrics: ModelMetrics } {
  const lr = options.learningRate ?? 0.05;
  const l2 = options.l2Lambda ?? 0.01;
  const maxIter = options.maxIterations ?? 200;
  const tol = options.convergenceThreshold ?? 1e-5;

  // Initialize weights
  const weights: Record<keyof MLFeatureVector, number> = {
    meme_wilson_lb: 0.5,
    meme_raters_log: 0.1,
    tag_affinity: 0.3,
    caption_length_norm: 0.0,
    author_funny_rate: 0.2,
    hour_of_day_norm: 0.0,
  };
  let bias = 0.0;

  if (pairs.length === 0) {
    return {
      weights: { bias, weights },
      metrics: {
        train_loss: 0,
        train_auc: 0.5,
        baseline_auc: 0.5,
        accuracy: 0.5,
        pairs_count: 0,
        iterations: 0,
      },
    };
  }

  let prevLoss = computeLoss(pairs, { bias, weights }, l2);
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations++;
    const gradWeights: Record<keyof MLFeatureVector, number> = {
      meme_wilson_lb: 0,
      meme_raters_log: 0,
      tag_affinity: 0,
      caption_length_norm: 0,
      author_funny_rate: 0,
      hour_of_day_norm: 0,
    };
    let gradBias = 0;

    for (const pair of pairs) {
      const pred = predictRankScore(pair.features, { bias, weights });
      const error = pred - pair.target;

      gradBias += error;
      for (const key of ALLOWED_FEATURE_KEYS) {
        const x = pair.features[key] ?? 0.5;
        gradWeights[key] += error * x;
      }
    }

    const n = pairs.length;
    bias -= lr * (gradBias / n);
    for (const key of ALLOWED_FEATURE_KEYS) {
      weights[key] -= lr * (gradWeights[key] / n + l2 * weights[key]);
    }

    const currentLoss = computeLoss(pairs, { bias, weights }, l2);
    if (Math.abs(prevLoss - currentLoss) < tol) {
      break;
    }
    prevLoss = currentLoss;
  }

  // Evaluate model vs baseline (pure Wilson score)
  const predictions = pairs.map((pair) => ({
    score: predictRankScore(pair.features, { bias, weights }),
    target: pair.target,
  }));
  const baselinePredictions = pairs.map((pair) => ({
    score: pair.features.meme_wilson_lb,
    target: pair.target,
  }));

  const trainAuc = computeAuc(predictions);
  const baselineAuc = computeAuc(baselinePredictions);

  const correct = predictions.filter(
    (p) => (p.score >= 0.5 ? 1 : 0) === p.target
  ).length;

  return {
    weights: { bias, weights },
    metrics: {
      train_loss: Number(prevLoss.toFixed(4)),
      train_auc: Number(trainAuc.toFixed(4)),
      baseline_auc: Number(baselineAuc.toFixed(4)),
      accuracy: Number((correct / pairs.length).toFixed(4)),
      pairs_count: pairs.length,
      iterations,
    },
  };
}

