# Oddly v1 — Hard-Coded Content & Configuration Audit

> **Document Type:** Architecture & Dynamic Configuration Audit  
> **Date:** 2026-11-12  
> **Status:** Authoritative  
> **Scope:** Complete census of hardcoded content, questions, option labels, palettes, UI copy, notifications, tier boundaries, and system limits across `apps/`, `services/`, and `packages/`.  
> **Rule:** Code is audited ONLY; no content code has been modified in Stage R2-PATCH-2. All items will be migrated to database-backed dynamic storage in **Stage 11: Admin Tool & Dynamic Content Importer**.

---

## 1. Executive Summary

Oddly is designed to run dynamic daily drops, customizable copy, and configurable operational parameters without requiring code deployments. Currently, sensible fallbacks and mock data exist in frontend and backend code to enable zero-db development and graceful offline behavior.

This audit catalogues every hardcoded element, its source location, the target database table (already provisioned in `packages/shared/prisma/schema.prisma`), and the assigned implementation stage.

---

## 2. Hard-Coded Content Inventory

| Category | Item Description | File & Line | Target Database Table | Planned Stage |
|---|---|---|---|---|
| **Questions & Options** | `FALLBACK_QUESTIONS` (Daily 5: cold pizza / flat soda, browser tabs, mood colour, late-night snack illustrations, friend word chips) | `apps/web/src/app/page.tsx:73-141` | `Question`<br>`AnswerOption`<br>`Drop` | Stage 11 (Admin Tool & Dynamic Importer) |
| **Questions & Options** | Challenge flow comparison question stubs | `apps/web/src/app/c/[shortId]/ChallengeClientView.tsx:64-75` | `Question`<br>`AnswerOption` | Stage 11 (Admin Tool & Dynamic Importer) |
| **Questions & Options** | Design system question showcase data (all 5 question types) | `apps/web/src/app/design/page.tsx:270-405` | Dev Fixtures / `Question` | Stage 11 (Admin Tool & Dynamic Importer) |
| **Colour Palette** | `palette12` (12 hex color codes and descriptive labels: Crimson, Coral, Amber, Sunshine, Lime, Mint, Teal, Sky, Indigo, Violet, Pink, Slate) | `packages/ui-tokens/src/tokens.ts:38-51` | `AppContent` (`group: 'palette'`, `key: 'palette12'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Rarity Tiers** | `DEFAULT_TIER_BOUNDARIES` (Common: 0–60%, Uncommon: 60–85%, Rare: 85–97%, Mythic: 97–100%) | `packages/shared/src/scoring.ts:191-196` | `TierDefinition` | Stage 11 (Admin Tool & Dynamic Importer) |
| **Rarity Tiers** | Share card color themes by tier (`dark`, `light`, `mythic`) | `packages/shared/src/share-cards.ts:75-100` | `TierDefinition` (`theme_config` JSON) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Rarity Tiers** | Rarity badge labels and pill formatting (`★ Rare`, `✦ Mythic`) | `apps/web/src/components/icons/index.tsx:66-115` | `TierDefinition` / `AppContent` | Stage 11 (Admin Tool & Dynamic Importer) |
| **Marketing & Copy** | Landing page headline and sub-copy ("Someone out there is oddly like you", "Five strange questions a day...") | `apps/web/src/app/page.tsx:150-250` | `AppContent` (`group: 'landing'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Marketing & Copy** | Twin reveal announcement copy ("Picks Matched", "Stranger Twin Found") | `apps/web/src/components/play/TwinRevealScreen.tsx:40-80` | `AppContent` (`group: 'reveal'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Marketing & Copy** | Oddness results explanation ("Oddness Score", "Rarer than X% of today's players worldwide") | `apps/web/src/components/play/OddnessScreen.tsx:45-90` | `AppContent` (`group: 'oddness'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Legal Pages** | Complete Terms of Service legal prose and section layout | `apps/web/src/app/terms/page.tsx:1-120` | `Page` (`slug: 'terms'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Legal Pages** | Complete Privacy Policy legal prose (zero trackers, retention, right to erasure) | `apps/web/src/app/privacy/page.tsx:1-120` | `Page` (`slug: 'privacy'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Legal Pages** | About Oddly mission statement, philosophy, and information architecture | `apps/web/src/app/about/page.tsx:1-100` | `Page` (`slug: 'about'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Streak Milestones** | `MILESTONE_CONFIG` (7-day "Bronze Flame", 30-day "Silver Moon", 100-day "Gold Century", 365-day "Mythic Sun" titles and celebration copy) | `apps/web/src/components/ui/MilestoneModal.tsx:18-60` | `AppContent` (`group: 'milestones'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Push Notifications** | Push channel templates (`drop_live`, `smart_nudge`, `twin_upgrade`, `recap`, `streak_at_risk` titles, bodies, and tags) | `services/worker/src/push/templates.ts:61-150` | `AppContent` (`group: 'push_templates'`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Operational Limits** | Default submission rate limit (30/min) and global rate limit (120/min) | `services/api/src/server.ts:35-45` | `AppConfig` (`rate_limits`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Operational Limits** | Matching bucket member cap (200) and candidate clamp ceiling (2,000) | `packages/shared/src/matching.ts:25-30` | `AppConfig` (`matching_caps`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Operational Limits** | Final batch chunk size (5,000) and chunk concurrency (default 4) | `services/worker/src/workers/pipeline.worker.ts:40-50` | `AppConfig` (`batch_settings`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Operational Limits** | Circuit breaker timeout (3,000ms), error threshold (50%), reset timeout (10,000ms) | `services/api/src/resilience/breakers.ts:20-35` | `AppConfig` (`circuit_breakers`) | Stage 11 (Admin Tool & Dynamic Importer) |
| **Operational Limits** | Degradation ladder trigger thresholds (event loop delay, p95 submit latency, queue depth, error rate) | `packages/shared/src/degradation.ts:40-75` | `AppConfig` (`degradation_thresholds`) | Stage 11 (Admin Tool & Dynamic Importer) |

---

## 3. Architecture for Dynamic Loading & Invalidation (Stage 11)

In Stage 11, these hardcoded constants will be replaced by cached dynamic loaders:
1. **Dynamic Content API (`GET /v1/content` & `GET /v1/config`):**
   - Served with `ETag` and HTTP 304 conditional support.
   - Cached in `CACHE_REDIS_URL` with 1-hour TTL.
2. **Admin Mutation & Invalidation Hook:**
   - Any update via Admin CMS triggers `DEL cache:content:*` and emits an invalidation event.
   - Fastify edge nodes reload the updated JSON into memory.
3. **Frontend Hydration & Offline Fallbacks:**
   - TanStack Query loads `/v1/content` and caches in `localStorage`.
   - If the network is offline or the database is unseeded, client gracefully falls back to the embedded minimal fallback constants.

