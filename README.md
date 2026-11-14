# Oddly v1 (Web MVP)

> _"Someone out there is oddly like you."_
> Daily five-pick game finding your stranger twin anywhere in the world in under 30 seconds.

---

## 1. What Oddly Is

Oddly drops five instinct-driven questions every day at 07:00 IST—the exact same five for everyone on Earth. You answer with no profiles, no quizzes to study for, and no followers to chase. Immediately, Oddly computes your **Twin**: the one stranger anywhere in the world who answered most like you today. It also computes your **Oddness**: an information-theoretic rarity score based on real observed probability.

Oddly intentionally eliminates chat, public leaderboards, direct messages, and user photos. The result itself is the product. Approved v1 features also include the **Twin Globe** (F18: ambient map of twins forming worldwide), **Keep & Orbit** (F19: mutual anonymous connection to preserve twin bonds across daily drops), **Telepathy** (F20: daily instinct sync inside an Orbit), and **Anti-Twin** (F21: discovering your playful opposite today). Handle swaps, DMs, and contact exchange are permanently Not Planned.

---

## 2. Prerequisites

- **Node.js:** `v20.19.5` LTS (see `.nvmrc`)
- **Package Manager:** `pnpm` (version `12.x` or `>=9.x`)
- **Docker & Docker Compose:** for local PostgreSQL 16 and Redis 7 (or local system instances)
- **Operating System:** Windows, macOS, or Linux

---

## 3. Quick Setup in 6 Commands

```bash
# 1. Clone or navigate to the repository root
cd e:/Oddly

# 2. Ensure Node 20 LTS is active
nvm use 20.19.5

# 3. Copy the environment configuration template
cp .env.example .env

# 4. Install monorepo dependencies
pnpm install

# 5. Start local PostgreSQL and Redis services
docker compose -f infra/docker-compose.yml up -d

# 6. Boot the development services
pnpm dev
```

The web application will be accessible at `http://localhost:3000` and the Fastify REST API at `http://localhost:4000/health`.

---

## 4. How to Run Everything

- `pnpm dev`: Start all apps and services concurrently (`apps/web`, `services/api`, `services/worker`).
- `pnpm build`: Compile all packages and Next.js applications with Turborepo caching.
- `pnpm typecheck`: Run strict TypeScript checks across all workspaces.
- `pnpm lint`: Run ESLint across all projects.
- `pnpm test`: Execute Vitest test runner.
- `pnpm format`: Format all code and markdown files with Prettier.
- `pnpm db:migrate`: Run Prisma database migrations (Stage 2).
- `pnpm db:seed`: Seed database with dynamic content (Stage 2).

---

## 5. Project Living Documentation

The architecture and operational standards are fully articulated across six foundational markdown files located in the root directory:

| Document                   | File Path                              | Core Purpose                                                                                              |
| -------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Product Specification**  | [`product.md`](./product.md)           | Audience, personas, core loop, brand identity, matching maths, F1–F17 specs, and honesty rules.           |
| **Technical Architecture** | [`architecture.md`](./architecture.md) | System overview, topology, complete tech stack, data models, Redis keys, API specs, and ADRs.             |
| **Rules & Standards**      | [`rules.md`](./rules.md)               | 11 absolute rules, coding standards, error handling matrix, security constraints, and Definition of Done. |
| **Design System**          | [`design.md`](./design.md)             | Colors, typography, spacing, component states, motion specs, accessibility, and screen blueprints.        |
| **Task Breakdown**         | [`task.md`](./task.md)                 | 16-phase task tracker (Stage 0 to Stage 15), progress bars, dependencies, and verification checklists.    |
| **Living Memory**          | [`memory.md`](./memory.md)             | Real-time state, architectural decisions, defect logs, learnings, environment notes, and next actions.    |
| **Admin Panel Spec**       | [`docs/admin-panel-spec.md`](./docs/admin-panel-spec.md) | Mission Control authoritative specification: access control, Command Center, ops tools, audit log.     |
| **Connection Features**    | [`docs/connection-features.md`](./docs/connection-features.md) | Architectural analysis, DPDP compliance, scale projections, and threat models for F18–F23.            |

> **Before any admin panel work, read `docs/admin-panel-spec.md` in full. It is the authoritative description of what to build in Phase 11.**

---

## 6. Reliability and Scale

Oddly is engineered for high-concurrency burst traffic: everyone on Earth is invited to play at the exact same minute (the 07:00 IST morning Drop).

### Core Service Level Objectives (SLOs)
- **Play Path Availability:** 99.9% monthly; 99.95% inside the 07:00 to 08:00 IST drop window.
- **Drop Payload (`GET /v1/drop/today`):** p95 < 100 ms with > 99% CDN edge hit ratio.
- **Submissions (`POST /v1/submissions`):** p95 < 500 ms, p99 < 1.5 s, error rate < 0.5% at planned peak (1,100–2,200 submits/sec).
- **Durability:** 100% of acknowledged submissions persisted in PostgreSQL (zero data loss).

### Progressive Scale Tiers (T0 to T4)

| Tier | Scale (Daily Active Players) | Peak Submits/sec | Primary Architecture | Ingestion Mode |
|---|---|---|---|---|
| **T0: Dev/Test** | < 1k DAU | < 5 submits/sec | Local Docker Compose (single DB, single Redis) | Mode A (Direct synchronous DB transaction) |
| **T1: Launch** | 1k – 25k DAU | 25 – 35 submits/sec | Single Postgres (managed), 1 Redis instance, 2 API containers | Mode A (Direct synchronous DB transaction) |
| **T2: Growth** | 25k – 100k DAU | 35 – 220 submits/sec | Managed Postgres + read replica, dedicated Redis instances (cache, queues, counters) | Mode A with connection pooling |
| **T3: Planned Target** | 100k – 10 lakh DAU | 220 – 1,100 (burst 2,200) | Clustered Postgres + PgBouncer, partitioned daily tables, 3 dedicated Redis instances | Mode B (Redis buffer queue + batched worker ingestion) |
| **T4: Beyond Planned** | > 10 lakh DAU | > 2,200 submits/sec | Sharded PostgreSQL, distributed Redis clusters, global edge compute | Mode B with multi-region ingestion |

### Authoritative Operational Documentation

For detailed architectural runbooks, load testing protocols, and incident response procedures, consult the [`docs/`](./docs/) directory:
- [`docs/scaling-plan.md`](./docs/scaling-plan.md): Comprehensive T0–T4 scaling progression, component upgrade triggers, and cost guardrails.
- [`docs/capacity-model.md`](./docs/capacity-model.md): Mathematical derivations for 10 lakh DAU, 4,400 peak RPS, and memory models.
- [`docs/slo.md`](./docs/slo.md): Formal Service Level Objectives, error budgets, and resource allocation priority ranking.
- [`docs/failure-modes.md`](./docs/failure-modes.md): 21 failure modes, blast radiuses, circuit breaker topologies, and automated recovery actions.
- [`docs/load-testing.md`](./docs/load-testing.md): k6 stress scripts, `pnpm loadgen` simulation CLI, and 15 required verification scenarios.
- [`docs/runbook.md`](./docs/runbook.md): On-call SEV-1 to SEV-4 alert triage playbooks and emergency intervention procedures.
- [`docs/degradation-playbook.md`](./docs/degradation-playbook.md): Five-level degradation ladder (L0 to L4) with 5-minute hysteresis recovery.
- [`docs/disaster-recovery.md`](./docs/disaster-recovery.md): RTO < 30 min, RPO < 5 min recovery protocols and clean-slate restore runbooks.

### Load Testing & Performance Validation
- Load test scripts and scenarios: [`infra/loadtest/`](./infra/loadtest/)
- Synthetic player traffic simulation: `pnpm loadgen` (Stage 16)

---

## 7. Monorepo Structure

```
oddly/
├── apps/
│   ├── web/                     # Public player web application (Next.js 14 App Router)
│   └── admin/                   # Internal question authoring & review tool (Stage 11)
├── services/
│   ├── api/                     # High-throughput Fastify REST API (Port 4000)
│   └── worker/                  # BullMQ background worker service (Redis-driven)
├── packages/
│   ├── shared/                  # Scoring algorithms, Zod schemas, types, copy keys
│   ├── ui-tokens/               # Design tokens, Tailwind preset, color constants
│   └── api-client/              # Universal typed HTTP client
├── infra/                       # Docker Compose for local PostgreSQL 16 & Redis 7
├── prisma/                      # Prisma schema and migrations (Stage 2)
└── seed/                        # Seed JSON files (questions, palettes, content)
```
