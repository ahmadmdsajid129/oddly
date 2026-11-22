# Oddly — Graceful Degradation Ladder and Playbook

<!-- visual:start degradation-ladder-visual -->
| Level | Name | Trigger | Action Summary |
|---|---|---|---|
| 🟢 **L0** | Normal | Healthy | Full system capability across all lanes |
| 🟡 **L1** | Conserve | p95 > 400ms / CPU > 70% | Cache counters 60s, double refresh, sample analytics 50% |
| 🟠 **L2** | Protect Core | p95 > 800ms / lag > 2m | Pause real-time arcs, lock admin writes, serve stale settings |
| 🔴 **L3** | Survive | Error > 2% / DB saturated | **Mode B async persist**, defer matching, Everyday lane only |
| ⚫ **L4** | Static | Origin down | CDN edge fallback shell, local storage on device |
<!-- visual:end degradation-ladder-visual -->



> **Purpose:** Detailed operational guide for the five-stage Graceful Degradation Ladder (L0 to L4), including automated triggers, manual admin controls, hysteresis rules, and user-facing communications.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative Operational Policy (Stage 0.5)

---

## 1. Degradation Ladder Matrix

| Level | Name | Automatic Trigger Threshold | Architectural State & Shedding Actions | User-Facing UI Experience |
|---|---|---|---|---|
| **L0** | **Normal** | All systems healthy: submit p95 < 400 ms, CPU < 70%, queue lag < 30 s | Full feature set active: live provisional percentiles, instant card generation, full telemetry, real-time push | Standard brand UI with zero warning banners |
| **L1** | **Conserve** | submit p95 > 400 ms, or CPU > 70%, or queue lag > 30 s | - Live player count served from 60 s edge cache<br>- Provisional twin refresh interval stretched (5 min -> 10 min)<br>- Analytics events sampled at 50%<br>- Card pre-render deprioritized to low priority queue | Nothing visibly broken; live player counters marked with subtle freshness timestamp |
| **L2** | **Protect Core** | submit p95 > 800 ms, or event-loop delay > 25 ms, or queue lag > 2 min | - Twin upgrade push notifications paused<br>- History, settings, and world stats served stale (up to 10 min)<br>- Share cards generated strictly on-demand<br>- New account sign-ups and guest merges queued<br>- Admin write actions blocked | Top status banner: *"Busy right now. Your picks are safe."* Secondary numbers marked *"updated a few minutes ago"* |
| **L3** | **Survive** | Error rate > 2%, or database write saturation, or Redis failover | - **Mode B (Asynchronous Persist)** activated<br>- Matching deferred; provisional reveal shows pending animation<br>- Guest play strictly enforced (Google SSO disabled)<br>- Analytics ingestion disabled (HTTP 202 discard)<br>- Push alerts paused except critical Drop Live | Main screen: *"Saved! Finding your stranger twin... This may take a minute."* Looping two-dot animation |
| **L4** | **Static Fallback** | Origin unreachable, catastrophic database or region failure | - Cloudflare CDN serves cached app shell and last Drop JSON<br>- Client service worker stores picks locally in IndexedDB / localStorage<br>- Client auto-retries submission with jitter for up to 6 hours<br>- Founder can extend drop window by $N$ hours | Full banner: *"We are having trouble reaching our servers. Your picks are safely saved on this device and will submit automatically."* |

---

## 2. Hysteresis and Step-Down Rules

- **Rapid Escalation:** The system or on-call operator can elevate the degradation level immediately upon detecting trigger conditions.
- **Conservative Recovery (Hysteresis):** To prevent rapid cycling and thundering herds, stepping down a level requires **at least 5 consecutive minutes** of healthy metrics below the threshold.
- **Dynamic Configuration:** The current level is stored in the database `app_config` (`key = 'degradation_level'`) and reflected on `GET /v1/config/public` with an edge `s-maxage=30`.

---

## 3. How to Force or Override a Degradation Level

### Via Admin REST API
```bash
curl -X PUT "https://api.oddly.game/v1/admin/config/degradation_level" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"level": "L2", "reason": "Anticipated morning push spike"}'
```

### Via Direct Database SQL (Emergency)
```sql
UPDATE app_config
SET value = '"L2"'::jsonb, updated_at = NOW()
WHERE key = 'degradation_level';
```

---

## 4. Testing the Degradation Ladder
Automated tests in `services/api` and `apps/web` must verify that forcing each level (`L1` through `L4`) immediately engages the corresponding code path and renders the verified user-facing fallback screens without runtime errors.

