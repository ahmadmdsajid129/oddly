# Oddly v1 (Web MVP)

> _"Someone out there is oddly like you."_
> Daily five-pick game finding your stranger twin anywhere in the world in under 30 seconds.

---

## 1. What Oddly Is

Oddly drops five instinct-driven questions every day at 07:00 IST—the exact same five for everyone on Earth. You answer with no profiles, no quizzes to study for, and no followers to chase. Immediately, Oddly computes your **Twin**: the one stranger anywhere in the world who answered most like you today. It also computes your **Oddness**: an information-theoretic rarity score based on real observed probability.

Oddly intentionally eliminates chat, public leaderboards, direct messages, and user photos. The result itself is the product.

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

---

## 6. Monorepo Structure

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
