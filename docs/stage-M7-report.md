# Stage M7 Report: ML Ranker for Optional Surfaces (Phase 10J)

**Date:** 2026-11-21  
**Branch:** `main` (synchronized with `origin/main`)  
**Commit Milestone:** `stage-M7-complete`  
**Prerequisites:** Stage M5 & M6 (Phase 10I: Taste Dimension & Recognition Engine)  
**Status:** **COMPLETE (5/5 Tasks Delivered, 100% Monorepo Verification)**

---

## 1. Executive Summary

Phase 10J (Stage M7) implements the **ML Ranker for Optional Surfaces**, delivering an explainable statistical pointwise ranker, offline consented dataset extraction harness, shadow-mode inference pipeline, automated bias/drift audit suite, and a Mission Control dashboard with an instant administrative kill switch.

The implementation strictly satisfies:
- **`product.md` F30 & Non-Goals:** Operates **strictly on non-Drop optional surfaces** (Post-Drop Meme Corner, Recap suggestions). Daily Drop questions are governed by Rule 12 and remain 100% identical globally for all players.
- **Explainable Model Invariant (Zero Black-Box LLMs):** The model is a pointwise logistic regression ranker with explicit, human-auditable feature weights ($w \in \mathbb{R}^d$) and bias ($b \in \mathbb{R}$). Zero generative hallucination, zero black-box neural networks.
- **`rules.md` Rule 14 (No Sensitive Inference):** The model feature matrix strictly ingests non-protected attributes (`meme_wilson_lb`, `meme_raters_log`, `tag_affinity`, `caption_length_norm`, `author_funny_rate`, `hour_of_day_norm`). Prohibited attributes (age, gender, sex, race, religion, caste, sexual orientation, political ideology) are programmatically rejected by the audit suite.
- **Zero Production Impact (Shadow Mode):** Candidates are scored in shadow mode while live production ordering is 100% determined by battle-tested M4 Wilson score lower bounds.
- **Instant Kill Switch Invariant:** Calling `POST /v1/admin/ml-ranker/kill-switch` instantly halts ML ranking and falls back 100% to Wilson scoring with 0ms delay.

---

## 2. Deliverables & Verification Matrix

| Task ID | Deliverable | Spec Reference | Status | Verification |
|---|---|---|---|---|
| `P10J.01` | **Offline Dataset Extraction Harness**: `MLDatasetExtractJob` | `product.md` F30, `ml-dataset-extract.job.ts` | **DONE** | Extracts pseudonymous pairs from consented ratings (`analytics = true`). Enforces scale gate (`ml_ranker.min_training_pairs`). Tested in `ml-ranker.test.ts`. |
| `P10J.02` | **Explainable Statistical Model**: `trainLogisticRanker` & `predictRankScore` | `explainable-ranker.ts` | **DONE** | Pointwise logistic regression with L2 regularization, gradient descent, explicit feature coefficients, log-loss, and ROC-AUC metrics. Tested in `explainable-ranker.test.ts`. |
| `P10J.03` | **Shadow-Mode Inference Pipeline**: `MLShadowInferenceJob` | `ml-shadow-inference.job.ts` | **DONE** | Evaluates live candidates on non-Drop surfaces; logs comparisons to `ml_shadow_predictions` while returning candidates strictly in M4 Wilson order. Tested in `ml-ranker.test.ts`. |
| `P10J.04` | **Automated Bias, Drift & Sensitive-Inference Audit Suite**: `runCompleteMLAudit` | Rule 14, `audit.ts` | **DONE** | 3-tier automated audit: Rule 14 sensitive key check, Four-Fifths regional fairness disparity check, and Population Stability Index (PSI) drift check. Tested in `explainable-ranker.test.ts`. |
| `P10J.05` | **Mission Control Model Dashboard & Kill Switch**: `admin-ml.ts` | `admin-ml.ts`, `policy.registry.ts` | **DONE** | Endpoints `GET /v1/admin/ml-ranker/status`, `POST /v1/admin/ml-ranker/kill-switch`, `POST /v1/admin/ml-ranker/toggle-shadow`, `POST /v1/admin/ml-ranker/train`. Tested in `ml-ranker-invariants.integration.test.ts`. |

---

## 3. Core Architectural Invariants Proven

### 1. Rule 14 Zero Sensitive Inference Invariant
- Verified in `explainable-ranker.test.ts` & `ml-ranker-invariants.integration.test.ts`:
  - Scans model feature names and weight dictionaries for forbidden keys (`["age", "gender", "sex", "race", "religion", "caste", "ethnicity", "sexual_orientation", "political", "income", "health", "disability"]`).
  - Proves that `auditReport.sensitiveAttributeAudit.passed === true` and `prohibitedAttributesDetected` is empty.
  - Proves that injecting a protected attribute into the weights dictionary triggers an immediate test assertion failure.

### 2. Four-Fifths Regional Fairness Invariant
- Verified in `explainable-ranker.test.ts`:
  - Evaluates positive prediction rate across macro-regions ($k \ge 20$).
  - Enforces the Four-Fifths Rule: minimum disparity ratio $\ge 0.80$ across regional cohorts.
  - Skewed regional cohorts ($< 0.80$ disparity) fail the audit and prevent model activation.

### 3. Population Stability Index (PSI) Drift Detection
- Verified in `explainable-ranker.test.ts`:
  - Evaluates feature distribution stability between training pairs and live shadow inference pairs.
  - $\text{PSI} \le 0.10$ indicates stable distribution; $\text{PSI} > 0.25$ triggers a drift alert (`driftAlert: true`).

### 4. Zero Production Disruption & Instant Kill Switch
- Verified in `ml-ranker.test.ts` & `ml-ranker-invariants.integration.test.ts`:
  - Candidates evaluated in shadow mode are returned in 100% deterministic M4 Wilson score order (`wilson_lb DESC`).
  - Triggering `POST /v1/admin/ml-ranker/kill-switch` updates `app_config` (`feature.ml_ranker = false`, `ml_ranker.mode = 'off'`) and sets model status to `'killed'`, guaranteeing instant 0ms fallback to Wilson scoring.

---

## 4. Test & Quality Proofs Across Monorepo

| Verification Layer | Target Scope | Result | Details |
|---|---|---|---|
| **Typecheck** | All 6 monorepo packages | **PASS (0 errors)** | `pnpm typecheck` (tsc `--noEmit` across all packages) |
| **Linting** | All 6 monorepo packages | **PASS (0 warnings, 0 errors)** | `pnpm lint` (ESLint strict check) |
| **Production Build** | `web`, `api`, `worker` | **PASS (Clean)** | Next.js App Router 20 static/dynamic routes compiled |
| **Shared Unit Tests** | `@oddly/shared` | **PASS (18/18 files, 182 tests)** | Math, scoring, matching, privacy, explainable ranker, and audit suites |
| **Worker Unit & Integration** | `@oddly/worker` | **PASS (10/10 files, 63 tests)** | Dataset extraction, shadow inference, Wilson scoring, and retention |
| **API Invariant Integration** | `@oddly/api` | **PASS (22/22 files, 170 tests)** | Real PostgreSQL 16 & Redis 7 integration and kill switch proofs |

---

## 5. Next Actions

Stage M7 (Phase 10J) is fully complete. The monorepo is ready to proceed to:
1. **Phase 10K (Stage M8):** Premium Groundwork (Provider-agnostic entitlements data model and guardrail monitors).
2. **Phase 11 (Stage 11):** Admin Panel ("Mission Control") per `docs/admin-panel-spec.md`.
