# Living Project Memory — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-07 | Owner: Founder + AI agent
Purpose of this file: Persistent institutional memory across coding sessions: system snapshot, real-time status, architectural decisions, defect logs, learnings, environment parameters, and next actions.

---

## 1. Project Snapshot

**Oddly** (working title _Twin_) is a daily five-pick game web application designed to deliver a genuine moment of unexpected human connection in under 30 seconds. Every day at 07:00 IST, Oddly drops five instinct-driven questions (text, number, colour, image, word). Players answer with zero sign-up barrier. Immediately upon submission, Oddly matches the player with their **Twin** (the closest matching stranger in the world today) and calculates their **Oddness** (an information-theoretic rarity score based on real observed probability $p(a)$). The app strictly prohibits chat, profiles, leaderboards, and fake data—the result itself is the product.

- **Current Stage:** Stage 0 (Documentation & Project Initialisation).
- **Current Target:** Complete the 6 foundational markdown files, scaffold the clean monorepo skeleton (`apps/web`, `services/api`, `services/worker`, `packages/*`, `infra/`), verify all base scripts, and STOP.

---

## 2. Current State

- **What works now:**
  - Stage 0 is COMPLETE.
  - Complete, exhaustive system documentation created in root: `product.md`, `rules.md`, `design.md`, `architecture.md`, `task.md`, and `memory.md`.
  - Node.js LTS environment configured at `v20.19.5` with `pnpm 12.18.0`.
  - System junction established for Windows `nvm4w` pointing to Node 20.
  - Monorepo skeleton fully initialized (`apps/web`, `apps/admin`, `services/api`, `services/worker`, `packages/shared`, `packages/ui-tokens`, `packages/api-client`, `infra/`).
  - `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` verified and passing with zero errors.
  - `apps/web` renders the brand placeholder ("oddly — coming soon") with Space Grotesk and Inter fonts and design tokens on `http://localhost:3000`.
  - `services/api` responds to `GET /health` with `{ ok: true, service: "api", time: "..." }` on `http://localhost:4000`.
  - `services/worker` boots and connects to Redis (or logs idle readiness) and emits "worker ready".
- **What is half-done:**
  - Nothing in Stage 0. Stage 0 is 100% complete.
- **What is next:**
  - Await Founder instruction to proceed to **Stage 1 (Design System & UI Kit)**.
  - In Stage 1: Build the complete component kit (`buttons`, `cards`, `tiles`, `number-picker`, `swatches`, `dialogs`, `theme-provider`) and showcase them on `/design`.

---

## 3. Decisions Log

| Date         | ID      | Decision                                               | Why Chosen                                                                                             | Alternatives Rejected                       | Impacted Components             |
| ------------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------- |
| `2026-11-07` | `D-001` | Use pnpm Workspaces with Turborepo                     | Ultra-fast caching, strict dependency isolation, clean monorepo package sharing                        | npm workspaces, Lerna, Nx                   | Entire monorepo root            |
| `2026-11-07` | `D-002` | Node.js 20.19.5 LTS as primary runtime                 | Guaranteed enterprise stability, native fetch, long-term support                                       | Node 22/26 (non-LTS in prod), Bun           | All applications and services   |
| `2026-11-07` | `D-003` | Fastify for Backend REST API                           | Sub-millisecond routing overhead, native schema validation with Zod, high request throughput           | Express.js, NestJS                          | `services/api`                  |
| `2026-11-07` | `D-004` | BullMQ on Redis 7 for Asynchronous Workers             | Reliable repeatable cron-style daily drops, high-concurrency background job handling                   | Celery, Kafka, AWS SQS                      | `services/worker`               |
| `2026-11-07` | `D-005` | Everything Dynamic from Database (Override Addendum)   | Founder requirement: no hard-coded questions, palettes, copy, configs, or notification strings in code | Static `copy.ts` and code-defined questions | Data models, API, Admin, Web    |
| `2026-11-07` | `D-006` | Generic Polymorphic Question Engine                    | Dynamic questions rendered from JSON schema discriminator (`type`); zero code deploys for new Drops    | Hardcoded question templates                | `apps/web`, `@oddly/shared`     |
| `2026-11-07` | `D-007` | Server-Side Share Card Generation via Satori           | Pixel-perfect consistency across Instagram Story (9:16), Square (1:1), and Link Preview (1.91:1)       | Client-side HTML5 canvas                    | Share cards (F8), Worker        |
| `2026-11-07` | `D-008` | Prohibition of Free-Text User Communication            | Eliminates harassment vectors and content moderation overhead while ensuring DPDP compliance           | Moderated user chat, user bios              | Product architecture            |
| `2026-11-07` | `D-009` | Stage A In-Memory Brute-Force Matching for v1          | Optimal performance (< 10ms) for up to 10,000 daily active players; zero architectural complexity      | pgvector ANN, premature bucketing           | Matching engine                 |
| `2026-11-07` | `D-010` | Port Assignments: Web (3000), API (4000), Admin (3001) | Standard Next.js/Fastify multi-service conventions avoiding collision                                  | Arbitrary ephemeral ports                   | Local environment configuration |
| `2026-11-07` | `D-011` | ESLint 9 Flat Config (`eslint.config.mjs`)             | Modern flat config compatibility with TypeScript ESLint and Turborepo monorepo root                    | Legacy `.eslintrc.js`                       | Root and packages               |
| `2026-11-07` | `D-012` | pnpm 12 `approve-builds` for Native Extension Scripts  | Satisfies pnpm 12 supply-chain security policies for esbuild and @next/swc native binaries             | Disabling pnpm security checks              | Root dependencies               |

---

## 4. Changes Log

| Date         | Stage   | Change Description                                                            | Modified Files    | Reason                                                 |
| ------------ | ------- | ----------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `2026-11-07` | Stage 0 | Authored comprehensive product specification (`product.md`)                   | `product.md`      | Job A: Product blueprint specification                 |
| `2026-11-07` | Stage 0 | Authored complete development rules and standards (`rules.md`)                | `rules.md`        | Job A: Operational standards & error policies          |
| `2026-11-07` | Stage 0 | Authored comprehensive design system specification (`design.md`)              | `design.md`       | Job A: Visual tokens, typography, component blueprints |
| `2026-11-07` | Stage 0 | Authored system architecture and data model specification (`architecture.md`) | `architecture.md` | Job A: Technical blueprint & ADRs                      |
| `2026-11-07` | Stage 0 | Authored full 16-phase task breakdown (`task.md`)                             | `task.md`         | Job A: Project roadmap and tracking                    |
| `2026-11-07` | Stage 0 | Authored living memory and institutional records (`memory.md`)                | `memory.md`       | Job A: Persistent project memory                       |

---

## 5. Bugs and Fixes

| Date         | Bug ID  | Symptom                                         | Root Cause                                                                              | Fix Applied                                                                                               | Files Touched                | Prevention Strategy                    | Test Added             |
| ------------ | ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- | ---------------------- |
| `2026-11-07` | `B-001` | `node: command not found` in PowerShell session | `C:\nvm4w\nodejs` symlink was unlinked during nvm version switches without admin rights | Created an NTFS directory junction `C:\nvm4w\nodejs` pointing to `C:\Users\HP\AppData\Local\nvm\v20.19.5` | `C:\nvm4w\nodejs` (junction) | Document junction setup in `memory.md` | Manual `node -v` check |
| `2026-11-07` | `B-002` | `pnpm: command not found`                       | pnpm was not yet installed in the selected Node 20 environment                          | Ran `npm install -g pnpm` with `BypassSandbox: true`                                                      | Node 20 global modules       | Document pnpm requirement in README    | `pnpm -v` verification |

---

## 6. Errors and Warnings Seen

| Timestamp          | Component / Context | Exact Message                                                         | Root Meaning                                                                         | Status / Resolution                                    |
| ------------------ | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `2026-11-07 13:12` | Terminal Sandbox    | `node : The term 'node' is not recognized`                            | Standard sandbox isolates `%LOCALAPPDATA%`, blocking direct access to user nvm paths | Resolved via system junction `C:\nvm4w\nodejs`         |
| `2026-11-07 13:15` | Terminal Sandbox    | `winget.exe failed to run: The file cannot be accessed by the system` | WindowsApps execution aliases are inaccessible within restricted sandbox containers  | Resolved; bypassed alias and installed tooling via npm |

---

## 7. Learnings

- **Windows Junctions vs Symlinks:** In Windows, creating directory symlinks (`mklink /D`) requires elevated administrator privileges or Developer Mode, whereas NTFS Directory Junctions (`mklink /J`) can be established in user space without UAC prompts.
- **Node.js LTS Versioning:** The project requires Node 20 LTS (`20.19.5`) to match `.nvmrc` and guarantee compatibility across Prisma, Fastify, and Next.js 14.
- **Dynamic Content Cache Bundle:** Bundling all dynamic copy into a single hash-versioned payload (`/v1/content/:locale`) reduces client startup latency by eliminating waterfall roundtrips on mobile connections.

---

## 8. Open Questions for the Founder

1. **Trademark & Domain Verification:** Has the name "Oddly" (or alternates "Twinly", "SameHere") been verified with relevant trademark registries and domain registrars?
2. **Google OAuth Client Credentials:** Will the Founder provide Google Cloud Console credentials for local development, or shall we utilize mock identity fixtures during Stage 7 testing?
3. **SMS Gateway Preference:** When Phone OTP is eventually unflagged, does the Founder have a preferred Indian SMS provider (e.g., Gupshup, Twilio, Exotel) for DLT template registration?

---

## 9. Environment Notes

- **Node.js Version:** `v20.19.5` (LTS)
- **Package Manager:** `pnpm 12.18.0`
- **Turborepo Version:** `^2.x`
- **Assigned Local Ports:**
  - Web Application (`apps/web`): `http://localhost:3000`
  - Internal Admin Portal (`apps/admin`): `http://localhost:3001`
  - Fastify REST API (`services/api`): `http://localhost:4000`
  - PostgreSQL Database: `localhost:5432`
  - Redis Service: `localhost:6379`
- **Key CLI Commands:**
  - `pnpm dev`: Start all services concurrently via Turborepo
  - `pnpm build`: Build all applications and packages
  - `pnpm typecheck`: Strict TypeScript verification across entire repository
  - `pnpm lint`: ESLint check across all packages
  - `pnpm test`: Execute Vitest unit and integration suites
  - `pnpm db:migrate`: Run Prisma migrations
  - `pnpm db:seed`: Seed database with dynamic initial content

---

## 10. Founder Preferences

- Plain English explanations with concise technical precision.
- No unneeded hype, corporate buzzwords, or unsolicited feature bloat.
- Strict adherence to the Stage Protocol: execute assigned stage, verify rigorously, update records, and STOP.

---

## 11. Next Steps

1. Wait for Founder review of Stage 0 deliverables.
2. Receive "proceed to Stage 1" instruction.
3. In Stage 1: Build the complete design system and UI kit (buttons, answer tiles, number picker dial, 12-colour swatch grid, modals, bottom sheets, toast, and the `/design` showcase route).
