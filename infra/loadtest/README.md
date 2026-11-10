# Oddly — Load Testing Infrastructure (`infra/loadtest`)

> **Purpose:** Houses k6 load test scripts, synthetic load scenarios, and chaos injection tooling for Oddly.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Active Implementation Stage:** Formally scripted and executed in **Stage 13 (Phase 13: End-to-End QA, Load Tests & Audits)**.

---

## Planned Load Test Scenarios (k6)

1. **Launch Spike:** Ramp from 0 to 1,100 submissions/sec (planned peak) in 30 seconds, hold for 10 minutes.
2. **2x Peak:** 2,200 submissions/sec stress test verifying SLO targets.
3. **5x Peak (Stress):** 5,500 submissions/sec validating degradation ladder L1 -> L3.
4. **Breaking Point:** Step-up every 2 minutes until p95 > 1,000 ms or error rate > 2%.
5. **Soak Test:** 30% peak load for 2 hours checking memory leaks and connection pools.
6. **Final Batch Race:** 1,000,000 synthetic submissions finalizing at 07:00 IST while live traffic hits the new Drop.
7. **Viral Share Spike:** 2,000 req/s across 50 distinct share links verifying CDN edge caching.
8. **Dependency Chaos:** Toxiproxy injection of DB failover, Redis latency, and worker restarts.

