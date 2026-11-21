# Oddly v1 (Web MVP)

> _"Someone out there is oddly like you."_
> Daily five-pick game finding your stranger twin anywhere in the world in under 30 seconds.

---

## 1. What Oddly Is

Oddly drops five instinct-driven questions every day at 07:00 IST per subject **Lane** (Everyday, Memes, and future planned tracks). Within a lane, questions are identical for all players globally (Rule L1). First-time visitors route straight into the Everyday Drop in ~30 seconds with zero login or survey (Rule L10). Returning players can pick any open lane. Matching is strictly lane-isolated (Rule L2): your Memes twin is someone who also played Memes today.

Richer question formats (`pick2of6`, `rank3`, `slider7`, `scene`) expand the answer outcome space, while 28-day BitMinHash history tie-breaking and greedy mutual pairing ensure authentic, bidirectional twins and transparent honest group sizes ("312 people matched you this way"). Approved connection features include the **Twin Globe** (F19: ambient map of twins forming worldwide), **Keep & Orbit** (F18: mutual anonymous connection preserving twin bonds across daily drops), **Telepathy** (F20: daily instinct sync inside an Orbit), **Anti-Twin** (F22: discovering your playful opposite today), **Super Twin** (F38: rare same-day cross-lane alignment), and **Signals Foundation** (F25: consented first-party question-quality telemetry). Handle swaps, DMs, image uploads, dating/contact features, and political topics are permanently Not Planned.

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
| **Admin Panel Spec**       | [`docs/admin-panel-spec.md`](./docs/admin-panel-spec.md) | Mission Control authoritative specification: access control, Command Center, ops tools, audit log, and Addendum A. |
| **Connection Features**    | [`docs/connection-features.md`](./docs/connection-features.md) | Architectural analysis, DPDP compliance, scale projections, and threat models for F18–F23.            |
| **Event Dictionary**       | [`docs/event-dictionary.md`](./docs/event-dictionary.md) | Allowlisted event dictionary, telemetry schemas, priority lanes, and DPDP consent policies for F25.    |
| **Memes & Insights Features** | [`docs/meme-and-insights-features.md`](./docs/meme-and-insights-features.md) | Feasibility analysis, legal review requirements, Wilson scoring, and capacity math for F24–F31.        |
| **Lanes & Matching Specification** | [`docs/lanes-and-matching.md`](./docs/lanes-and-matching.md) | Full mathematical derivations, format similarity functions, synthetic tie-size simulation tables, and greedy mutual pairing algorithm for F32–F34. |
| **Say It Text Answers Specification** | [`docs/say-it-text-answers.md`](./docs/say-it-text-answers.md) | End-to-end 7-step pipeline, self-hosted ONNX model benchmarks, Gate G4 criteria, and DPDP retention lifecycle for F37. |
| **Situations Lane Guidelines** | [`docs/situations-lane-guidelines.md`](./docs/situations-lane-guidelines.md) | Rule L7 editorial guide, scenario checklist, approved style labels, and zero-shaming invariants for F36. |
| **Stage L0 Report** | [`docs/stage-L0-report.md`](./docs/stage-L0-report.md) | Authoritative analysis and delivery report for Stage L0 (Lanes, Richer Formats, Twin Depth, and Text Answers). |

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
