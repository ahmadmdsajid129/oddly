# Oddly — Infrastructure as Code (`infra/terraform`)

> **Purpose:** Declarative Infrastructure as Code (Terraform / Cloudflare / Cloud Provider) provisioning.  
> **Owner:** Senior System Designer / SRE  
> **Last Updated:** 2026-11-10  
> **Active Implementation Stage:** Formally provisioned in **Stage 14 (Phase 14: Cloud Deployment & Infrastructure)**.

---

## Managed Resources

- **Edge & CDN:** Cloudflare DNS, WAF rules, rate-limiting rules, origin locks, Turnstile keys.
- **Compute:** Autoscaling container clusters across multiple Availability Zones in India (Mumbai region).
- **Database:** Managed PostgreSQL 16 with PgBouncer connection pooler, automated failover, and multi-region PITR backups.
- **Cache & Queues:** Managed Redis 7 with dedicated roles (`cache`, `counters-vectors`, `queues`), AOF persistence, and high-availability replicas.
- **Object Storage:** Cloudflare R2 / AWS S3 storage buckets with lifecycle rules and custom domain CDN routing.

