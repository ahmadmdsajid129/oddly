# Oddly — Incident Response Runbooks

<!-- visual:start runbook-incident-matrix -->
| Severity | Impact | Pager Duty SLA | Operational Action |
|---|---|---|---|
| 🔴 **SEV-1** | Drop unavailable or submit error rate > 5% | 5 minutes | Immediate rollback, switch to Mode B, fail over CDN |
| 🟠 **SEV-2** | Latency p95 > 1,500ms or background queue lag | 15 minutes | Step degradation ladder to L2, scale workers |
| 🟡 **SEV-3** | Non-critical feature degraded (cards/stats) | 60 minutes | Shed non-essential priority routes |
| 🟢 **SEV-4** | Minor telemetry or non-blocking bug | Next business day | Log ticket, normal development cycle |
<!-- visual:end runbook-incident-matrix -->



> **Purpose:** Operational playbooks, triage procedures, and incident response runbooks for on-call engineers and operators.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative Incident Manual (Stage 0.5)

---

## 1. On-Call Protocol & Severity Definitions

| Severity | Definition | Response Expectation | Escalation Trigger |
|---|---|---|---|
| **SEV-1 (Critical)** | Core play path broken; Drop not live; data loss risk; 07:00 IST outage | **Immediate (< 5 minutes)** | Founder notified immediately |
| **SEV-2 (High)** | Latency degraded (> 800 ms); queue backlog stalled; degradation at L2/L3 | **< 15 minutes** | Lead Engineer notified |
| **SEV-3 (Medium)** | Background tasks delayed (share cards, push notifications); L1 engaged | **< 1 hour** | Business hours triage |
| **SEV-4 (Low)** | Minor cosmetic or non-impacting telemetry bug | Next business sprint | Standard ticket |

---

## 2. Emergency Operational Playbooks

### 2.1 Playbook: Drop Not Live at 07:00:00 IST
- **Symptom:** Client shows countdown expired or HTTP 404/409 on `GET /v1/drop/today`.
- **Triage Steps:**
  1. Check database `drops` status: `SELECT id, drop_date, status, opens_at FROM drops WHERE drop_date = CURRENT_DATE;`
  2. If status is `scheduled`: execute emergency status flip:
     ```sql
     UPDATE drops SET status = 'live', opens_at = NOW() WHERE drop_date = CURRENT_DATE;
     ```
  3. Purge Cloudflare edge cache for `/v1/drop/today`:
     ```bash
     curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" -H "Authorization: Bearer $CF_TOKEN" -d '{"files":["https://oddly.game/v1/drop/today"]}'
     ```
  4. Verify pointer endpoint returns HTTP 200 with today's 5 questions.

### 2.2 Playbook: Elevated Submission Error Rate (> 1%)
- **Symptom:** `SubmitErrorRateHigh` alert firing; users receiving error toast on submit.
- **Triage Steps:**
  1. Check API logs for error codes: `SELECT message, COUNT(*) FROM logs WHERE route = '/v1/submissions' AND status >= 500 GROUP BY 1;`
  2. If database connection timeout: elevate degradation to **Level L3 (Mode B Async Persist)** in `app_config`:
     ```sql
     UPDATE app_config SET value = '"L3"'::jsonb WHERE key = 'degradation_level';
     ```
  3. Scale up API container instances by 50%.
  4. Once error rate normalizes (< 0.2%) for 5 consecutive minutes, step down degradation.

### 2.3 Playbook: Database Saturation or Primary Failover
- **Symptom:** DB pool wait > 100 ms; CPU > 85%; read-only errors during failover.
- **Triage Steps:**
  1. Verify primary node health in cloud database console.
  2. If failover is in progress: API will automatically retry transactions with jitter.
  3. Immediately restrict non-essential traffic by engaging **Level L2**:
     ```sql
     UPDATE app_config SET value = '"L2"'::jsonb WHERE key = 'degradation_level';
     ```
  4. Route history queries and admin reads strictly to read replica if not already routed.

### 2.4 Playbook: Redis Memory Exhaustion or Failover
- **Symptom:** Redis writes return `OOM command not allowed`; latency p99 > 20 ms.
- **Triage Steps:**
  1. Check memory breakdown across key prefixes: `INFO memory`.
  2. If `cache` keys are filling instance: execute flush on cache namespace (`SCAN 0 MATCH cache:*`).
  3. If Redis crashed: API automatically falls back to database-only Mode A without live percentiles.
  4. Trigger background reconciliation job after Redis recovers:
     ```bash
     pnpm --filter @oddly/worker run reconcile:counters
     ```

### 2.5 Playbook: Final Batch Delayed Past 07:10:00 IST
- **Symptom:** `FinalBatchDelayed` alert fires; yesterday's final recap not ready.
- **Triage Steps:**
  1. Check batch progress table: `SELECT chunk_id, status, error FROM batch_runs WHERE drop_date = CURRENT_DATE - 1;`
  2. If chunk failed due to transient timeout: restart worker process; failed chunk will automatically resume.
  3. Ensure live 07:00 drop traffic is not blocked: yesterday's recap screen gracefully displays provisional twin labeled *"Finalizing across all players... Ready in a few minutes"*.

### 2.6 Playbook: Emergency Question Pull
- **Symptom:** Live question contains offensive typo, broken formatting, or major complaint.
- **Triage Steps:**
  1. Log into Admin portal -> Question Actions -> Emergency Pull.
  2. Or execute via SQL:
     ```sql
     UPDATE questions SET status = 'pulled' WHERE id = '$QUESTION_ID';
     ```
  3. The API and client automatically fall back to remaining 4 questions for provisional matching without crashing.

### 2.7 Playbook: Faulty Deployment Rollback
- **Symptom:** Error rates spike immediately following a new release.
- **Triage Steps:**
  1. Trigger instant container rollback to previous immutable image digest (target: < 2 minutes).
  2. Revert client edge bundle in Cloudflare if frontend is affected.
  3. Announce incident status on public status page.

---

## 3. Incident Communication Templates

### In-App Status Banner (Level L2 / L3)
> *"Lots of strangers are playing right now! Your picks are safely received. Finding your twin may take a moment."*

### Critical Maintenance Screen (Level L4)
> *"Oddly is taking a short breather. Your picks have been securely saved on your device and will be sent automatically the moment we are back."*

