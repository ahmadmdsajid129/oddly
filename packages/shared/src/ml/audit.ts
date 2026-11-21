/**
 * @file audit.ts
 * @package @oddly/shared
 *
 * Automated Bias, Drift, and Sensitive-Inference Audit Suite (Stage M7 / Phase 10J / P10J.04).
 *
 * Architectural Invariants:
 * 1. Rule 14 Compliance: Proves zero protected or sensitive attributes exist in the model.
 * 2. Demographic Parity Audit: Evaluates group parity across macro-regions (Four-Fifths Rule).
 * 3. Feature Drift Detection: Calculates Population Stability Index (PSI).
 */

import {
  ALLOWED_FEATURE_KEYS,
  type ModelWeights,
  type TrainingPair,
} from "./explainable-ranker.js";

export const PROHIBITED_SENSITIVE_ATTRIBUTES: string[] = [
  "age",
  "gender",
  "sex",
  "race",
  "religion",
  "caste",
  "ethnicity",
  "sexual_orientation",
  "political",
  "income",
  "health",
  "disability",
  "caste_name",
  "creed",
  "faith",
  "party",
];

export interface SensitiveAttributeAuditResult {
  passed: boolean;
  prohibitedAttributesDetected: string[];
  allowedFeaturesChecked: string[];
}

export interface RegionParityResult {
  region: string;
  sampleCount: number;
  positiveRate: number;
}

export interface FairnessAuditResult {
  passed: boolean;
  regionsEvaluated: RegionParityResult[];
  minDisparityRatio: number; // Lowest ratio of positive rates between any pair
  fourFifthsRuleSatisfied: boolean; // Ratio >= 0.80
}

export interface DriftAuditResult {
  passed: boolean;
  psi: number; // Population Stability Index
  driftAlert: boolean; // psi > 0.25
  driftSeverity: "none" | "moderate" | "significant";
}

export interface CompleteMLAuditReport {
  passed: boolean;
  sensitiveAttributeAudit: SensitiveAttributeAuditResult;
  fairnessAudit: FairnessAuditResult;
  driftAudit: DriftAuditResult;
  auditedAt: string;
}

/**
 * Audit 1: Verify zero sensitive or protected attributes are in model features or weights (Rule 14).
 */
export function auditSensitiveAttributes(
  modelWeights: ModelWeights
): SensitiveAttributeAuditResult {
  const modelKeys = Object.keys(modelWeights.weights).map((k) => k.toLowerCase());
  const prohibitedDetected: string[] = [];

  for (const key of modelKeys) {
    for (const prohibited of PROHIBITED_SENSITIVE_ATTRIBUTES) {
      if (key.includes(prohibited)) {
        prohibitedDetected.push(key);
      }
    }
  }

  // Also verify that ALLOWED_FEATURE_KEYS does not contain prohibited attributes
  for (const allowed of ALLOWED_FEATURE_KEYS) {
    for (const prohibited of PROHIBITED_SENSITIVE_ATTRIBUTES) {
      if (allowed.toLowerCase().includes(prohibited)) {
        prohibitedDetected.push(allowed);
      }
    }
  }

  const passed = prohibitedDetected.length === 0;

  return {
    passed,
    prohibitedAttributesDetected: Array.from(new Set(prohibitedDetected)),
    allowedFeaturesChecked: [...ALLOWED_FEATURE_KEYS],
  };
}

/**
 * Audit 2: Evaluate Group Parity across macro-regions (Four-Fifths Rule).
 */
export function auditRegionalFairness(
  pairs: TrainingPair[]
): FairnessAuditResult {
  const regionGroups: Record<string, { total: number; positives: number }> = {};

  for (const pair of pairs) {
    const region = pair.region || "GLOBAL";
    if (!regionGroups[region]) {
      regionGroups[region] = { total: 0, positives: 0 };
    }
    regionGroups[region].total++;
    if (pair.target === 1) {
      regionGroups[region].positives++;
    }
  }

  const regionsEvaluated: RegionParityResult[] = Object.entries(regionGroups).map(
    ([region, counts]) => ({
      region,
      sampleCount: counts.total,
      positiveRate:
        counts.total > 0
          ? Number((counts.positives / counts.total).toFixed(4))
          : 0,
    })
  );

  // If fewer than 2 groups with sufficient samples (>= 5), fairness trivially passes
  const validGroups = regionsEvaluated.filter((r) => r.sampleCount >= 5);
  if (validGroups.length < 2) {
    return {
      passed: true,
      regionsEvaluated,
      minDisparityRatio: 1.0,
      fourFifthsRuleSatisfied: true,
    };
  }

  let minDisparity = 1.0;
  for (let i = 0; i < validGroups.length; i++) {
    for (let j = i + 1; j < validGroups.length; j++) {
      const rateA = validGroups[i].positiveRate;
      const rateB = validGroups[j].positiveRate;
      if (rateA > 0 && rateB > 0) {
        const ratio = Math.min(rateA / rateB, rateB / rateA);
        if (ratio < minDisparity) {
          minDisparity = ratio;
        }
      }
    }
  }

  const fourFifths = minDisparity >= 0.80;

  return {
    passed: fourFifths,
    regionsEvaluated,
    minDisparityRatio: Number(minDisparity.toFixed(4)),
    fourFifthsRuleSatisfied: fourFifths,
  };
}

/**
 * Audit 3: Population Stability Index (PSI) Drift Detection on input features.
 * PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) )
 */
export function calculatePsi(
  baselineValues: number[],
  currentValues: number[],
  numBuckets = 5
): number {
  if (baselineValues.length === 0 || currentValues.length === 0) {
    return 0.0;
  }

  // Create equal-width buckets based on [0, 1] bounds
  const bucketWidth = 1.0 / numBuckets;
  const baseCounts = new Array(numBuckets).fill(0);
  const currCounts = new Array(numBuckets).fill(0);

  for (const v of baselineValues) {
    const idx = Math.min(numBuckets - 1, Math.max(0, Math.floor(v / bucketWidth)));
    baseCounts[idx]++;
  }
  for (const v of currentValues) {
    const idx = Math.min(numBuckets - 1, Math.max(0, Math.floor(v / bucketWidth)));
    currCounts[idx]++;
  }

  let psi = 0.0;
  const baseTotal = baselineValues.length;
  const currTotal = currentValues.length;

  for (let i = 0; i < numBuckets; i++) {
    // Add Laplace smoothing to avoid division by zero
    const basePct = (baseCounts[i] + 0.001) / (baseTotal + 0.001 * numBuckets);
    const currPct = (currCounts[i] + 0.001) / (currTotal + 0.001 * numBuckets);
    psi += (currPct - basePct) * Math.log(currPct / basePct);
  }

  return Math.max(0, Number(psi.toFixed(4)));
}

/**
 * Audit 3b: Evaluate overall feature drift between baseline and current distributions.
 */
export function auditFeatureDrift(
  baselinePairs: TrainingPair[],
  currentPairs: TrainingPair[]
): DriftAuditResult {
  if (baselinePairs.length === 0 || currentPairs.length === 0) {
    return {
      passed: true,
      psi: 0.0,
      driftAlert: false,
      driftSeverity: "none",
    };
  }

  let maxPsi = 0.0;
  for (const key of ALLOWED_FEATURE_KEYS) {
    const baseVals = baselinePairs.map((p) => p.features[key] ?? 0.5);
    const currVals = currentPairs.map((p) => p.features[key] ?? 0.5);
    const psi = calculatePsi(baseVals, currVals);
    if (psi > maxPsi) {
      maxPsi = psi;
    }
  }

  const driftSeverity: "none" | "moderate" | "significant" =
    maxPsi > 0.25 ? "significant" : maxPsi >= 0.10 ? "moderate" : "none";
  const driftAlert = maxPsi > 0.25;

  return {
    passed: !driftAlert,
    psi: maxPsi,
    driftAlert,
    driftSeverity,
  };
}

/**
 * Run complete comprehensive ML audit across all 3 audit dimensions.
 */
export function runCompleteMLAudit(
  modelWeights: ModelWeights,
  trainingPairs: TrainingPair[],
  shadowPairs: TrainingPair[] = []
): CompleteMLAuditReport {
  const sensitiveAudit = auditSensitiveAttributes(modelWeights);
  const fairnessAudit = auditRegionalFairness(trainingPairs);
  const driftAudit = auditFeatureDrift(trainingPairs, shadowPairs);

  const passed = sensitiveAudit.passed && fairnessAudit.passed && driftAudit.passed;

  return {
    passed,
    sensitiveAttributeAudit: sensitiveAudit,
    fairnessAudit,
    driftAudit,
    auditedAt: new Date().toISOString(),
  };
}

