# Oddly — Disaster Recovery and Business Continuity Plan

> **Purpose:** Disaster recovery protocol, automated backup topology, step-by-step restoration procedures, and quarterly recovery drill logs.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Status:** Authoritative DR Architecture (Stage 0.5)

---

## 1. Recovery Objectives

- **Recovery Point Objective (RPO):** **< 5 minutes**  
  Maximum acceptable data loss in the event of catastrophic primary infrastructure destruction. Guaranteed via PostgreSQL Continuous Archiving and Write-Ahead Log (WAL) Point-in-Time Recovery (PITR) replicated to an off-site secondary cloud region.
- **Recovery Time Objective (RTO):** **< 30 minutes**  
  Maximum target duration to restore full end-to-end playability in a clean secondary region or new cluster.

---

## 2. Backup Topology & Storage Architecture

1. **PostgreSQL Authoritative Backups:**
   - Daily automated full base backups (03:00 UTC).
   - Continuous WAL archiving shipped to encrypted object storage in secondary region.
   - 30-day retention with immutable object lock.
2. **Redis Ephemeral Snapshots:**
   - AOF persistence enabled (`appendfsync everysec`).
   - Hourly RDB snapshots uploaded to object storage.
   - *Note:* All Redis state (counters and vectors) can be 100% reconstructed from PostgreSQL if Redis suffers catastrophic loss.
3. **Static Pre-Published Drop JSON:**
   - Pre-rendered Drop JSON files (`/drops/:id.json`) stored in Cloudflare R2 with global edge distribution.
4. **App Shell Assets:**
   - Immutable client Next.js build output replicated across global edge points of presence.

---

## 3. Step-by-Step Restoration Procedure (Clean Environment)

1. **Step 1: Provision Clean Infrastructure (T+0 to T+10 min)**
   - Run Terraform declarative deployment against secondary region:
     ```bash
     cd infra/terraform && terraform apply -var-file=dr-secondary.tfvars -auto-approve
     ```
2. **Step 2: Restore PostgreSQL via PITR (T+10 to T+20 min)**
   - Restore latest base backup and replay WAL up to 5 minutes prior to disaster timestamp.
   - Verify table integrity:
     ```sql
     SELECT COUNT(*) FROM drops;
     SELECT COUNT(*) FROM submissions WHERE drop_id = (SELECT id FROM drops WHERE drop_date = CURRENT_DATE);
     ```
3. **Step 3: Initialize Redis & Reconstruct Counters (T+20 to T+25 min)**
   - Start fresh Redis instances.
   - Run reconstruction worker script to rebuild live answer counters from PostgreSQL:
     ```bash
     pnpm --filter @oddly/worker run reconcile:counters
     ```
4. **Step 4: Update Edge Routing (T+25 to T+30 min)**
   - Update Cloudflare Origin DNS records to point to new secondary region ingress endpoints.
   - Verify health probe (`/health`) returns HTTP 200.
   - Verify synthetic play-flow probe succeeds.

---

## 4. Disaster Recovery Drill Log

| Drill Date | Lead Operator | Target RTO / RPO | Achieved RTO / RPO | Findings & Bottlenecks | Sign-Off |
|---|---|---|---|---|---|
| *2026-11-10* | *System Designer* | *30m / 5m* | *Stage 0.5 Baseline* | *Documented initial recovery workflow* | *Founder* |
| *[Planned Stage 14]* | *Lead SRE* | *30m / 5m* | *[Pending Drill]* | *Automated failover script execution* | *Pending* |

