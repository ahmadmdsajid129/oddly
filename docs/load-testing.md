# Oddly — Load Testing Strategy and Scenarios

> **Purpose:** Test harness design, scenario specifications, pass/fail criteria, and execution templates for k6 load and chaos testing.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Stage 0.5 Specification (To be formally implemented and executed in Stage 13)

---

## 1. Load Testing Tooling & Setup

- **Load Driver:** k6 (scripted in JavaScript/TypeScript under `infra/loadtest/`).
- **Synthetic Player Generator (`pnpm loadgen`):** Generates $N$ synthetic players with realistic multinomial distributions and correlated lifestyle answers.
- **Chaos Injection Engine:** Toxiproxy for injecting network latency, packet loss, and connection drops on staging.
- **Profiling & Hotspots:** Node.js native profiler / `clinic.js` for identifying event-loop blocking and memory leaks.

---

## 2. Mandatory Test Scenarios & Pass Criteria

| Scenario | Load Profile | Pass Criteria |
|---|---|---|
| **1. Launch Spike** | Ramp 0 to 1,100 submits/sec in 30 seconds; hold for 10 minutes | Submissions p95 < 500 ms; error rate < 0.5%; zero lost submissions; CDN hit ratio > 95% on Drop & shell |
| **2. 2x Peak (Headroom)** | Ramp 0 to 2,200 submits/sec in 60 seconds; hold for 10 minutes | SLOs maintained or degradation ladder engages cleanly (L1); zero data loss |
| **3. 5x Peak (Extreme Stress)** | Ramp to 5,500 submits/sec; hold for 5 minutes | Graceful degradation to L2/L3; `@fastify/under-pressure` sheds excess load cleanly; no process crashes; recovery to L0 within 10 min |
| **4. Breaking Point Test** | Step up load by 200 req/s every 2 minutes until failure | Determine exact saturation threshold; log max sustainable throughput per tier |
| **5. Endurance / Soak** | 350 submits/sec sustained continuously for 2 hours | No unbounded heap growth (zero memory leaks); DB pool connections return to baseline; latency remains stable |
| **6. Final Batch Overlap Race** | 10,00,000 synthetic submissions finalized at 07:00 IST while live traffic takes 1,100 req/s on new Drop | Final batch finishes by 07:10 IST; live submission p95 latency remains < 500 ms; no DB connection starvation |
| **7. Viral Share Spike** | 2,000 req/s on 50 distinct `/c/:shortId` links, then on cold link | Edge hit ratio > 95%; origin CPU < 40%; response p95 < 200 ms |
| **8. Client Retry Storm** | Inject 50% simulated failures for 2 minutes with real client retry logic | Request amplification does not exceed 1.2x baseline; recovery is smooth without thrashing |
| **9. Dependency Chaos** | Kill Redis primary; kill DB primary (failover); kill worker process during active peak load | Zero data loss; client retries transparently; automatic recovery within 60 seconds; alerts fire |
| **10. Mode B Correctness** | Force async persist (`PERSIST_MODE=async`) at 2,200 req/s | Zero lost submissions; reconciliation job verifies 100% parity between acknowledged and stored IDs |
| **11. Migration Under Load** | Execute expand DDL migration concurrently while running 1,100 req/s | Zero failed requests; table lock waits < 100 ms |
| **12. Deploy Under Load** | Execute rolling container update at 1,100 req/s | Zero HTTP 502/503 errors during container rotation; graceful connection draining verified |
| **13. Disaster Recovery Drill** | Restore fresh database and Redis from cold backup | Recovery completed within RTO < 30 min and RPO < 5 min |
| **14. Degradation Level Tests** | Force levels L1, L2, L3, and L4 via `app_config` | Each level engages defined fallbacks; banners render correctly; UI never crashes |
| **15. Mobile Reality Test** | Emulated low-end Android device over throttled 3G/4G | Play screen interactive in < 2.5 s; INP < 200 ms |

---

## 3. Load Test Results Log Template

Every execution must be documented in this format prior to scale-tier promotion:

```markdown
### Load Test Run: [YYYY-MM-DD] — Scenario [Name]
- **Target Tier:** [T0 / T1 / T2 / T3]
- **Git Commit Hash:** `[commit-hash]`
- **Target Load:** [X] submissions/sec
- **Achieved Peak Throughput:** [X] req/s
- **Latency Metrics:** p50: [X] ms | p95: [X] ms | p99: [X] ms
- **Error Rate:** [X]%
- **Database Metrics:** Peak Connections: [X] | Max CPU: [X]% | Replication Lag: [X] ms
- **Redis Metrics:** Memory Peak: [X] MB | Command Latency p99: [X] ms
- **Degradation State:** [L0 / L1 / L2 / L3]
- **Pass / Fail Assessment:** [PASS / FAIL]
- **Actionable Architectural Decisions:**
  1. ...
```

