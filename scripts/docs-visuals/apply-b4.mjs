import fs from 'node:fs';

const path = 'architecture.md';
let content = fs.readFileSync(path, 'utf8');

// 1. System Topology Mermaid Diagram in Section 1
if (!content.includes('system-topology-diagram')) {
  const target = `## 1. System Overview & Service Level Objectives (SLOs)`;
  const diagram = `## 1. System Overview & Service Level Objectives (SLOs)

<!-- visual:start system-topology-diagram -->
\`\`\`mermaid
flowchart TD
    CF["Cloudflare CDN & Edge<br/>(DDoS, SSL, Static Assets, Cache)"]
    Web["Next.js 14 PWA<br/>(Client UI, Service Worker, Local Storage)"]
    API["Fastify API Origin<br/>(Stateless, Rate Limiting, Load Shedding)"]
    R2["Cloudflare R2<br/>(Pre-published Drop JSON, Share Cards)"]
    Redis["Redis 7 (Multi-Role)<br/>(Cache, Counters, Vectors, Queues)"]
    PG[("PostgreSQL 16 (Primary)<br/>(Partitions, Relational State)")]
    Worker["BullMQ Worker Fleet<br/>(Async Persist, Matching, Satori Card Render)"]
    Push["Push Gateway<br/>(Web Push & Mobile Notifications)"]

    CF --> Web
    CF --> API
    CF --> R2
    Web --> API
    API --> Redis
    API --> PG
    API --> Worker
    Worker --> Redis
    Worker --> PG
    Worker --> R2
    Worker --> Push
\`\`\`
<!-- visual:end system-topology-diagram -->
`;
  content = content.replace(target, diagram);
}

// 2. Scale Tiers Chart and Emoji Dots in Section 4
if (!content.includes('scale-tiers-chart')) {
  const target = `## 4. Scale Tiers Architecture`;
  const tierBlock = `## 4. Scale Tiers Architecture

<!-- visual:start scale-tiers-chart -->
\`\`\`mermaid
flowchart LR
    T0["🟢 T0<br/>≤ 1k DAU"] --> T1["🟡 T1<br/>1k–10k DAU"]
    T1 --> T2["🟠 T2<br/>10k–100k DAU"]
    T2 --> T3["🔴 T3<br/>100k–1M DAU"]
    T3 --> T4["🟣 T4<br/>> 1M DAU"]
\`\`\`
<!-- visual:end scale-tiers-chart -->
`;
  content = content.replace(target, tierBlock);
}

// Replace Tiers in Table 4
content = content.replace('| **T0** | Up to 1,000 |', '| 🟢 **T0** | Up to 1,000 |');
content = content.replace('| **T1** | 1,000 to 10,000 |', '| 🟡 **T1** | 1,000 to 10,000 |');
content = content.replace('| **T2** | 10,000 to 1,00,000 |', '| 🟠 **T2** | 10,000 to 1,00,000 |');
content = content.replace('| **T3** | 1,00,000 to 10,00,000 |', '| 🔴 **T3** | 1,00,000 to 10,00,000 |');
content = content.replace('| **T4** | > 10,00,000 |', '| 🟣 **T4** | > 10,00,000 |');

// 3. Degradation Ladder Table Emojis in Section 12
content = content.replace('| **L0** | Normal |', '| 🟢 **L0** | Normal |');
content = content.replace('| **L1** | Conserve |', '| 🟡 **L1** | Conserve |');
content = content.replace('| **L2** | Protect Core |', '| 🟠 **L2** | Protect Core |');
content = content.replace('| **L3** | Survive |', '| 🔴 **L3** | Survive |');
content = content.replace('| **L4** | Static |', '| ⚫ **L4** | Static |');

// 4. Submit Mode A vs B Sequence Diagram in Section 8.3
if (!content.includes('submit-mode-sequence')) {
  const target = `### 8.3 Ingestion Persistence Modes (A vs. B)`;
  const seq = `### 8.3 Ingestion Persistence Modes (A vs. B)

<!-- visual:start submit-mode-sequence -->
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Player as Player Client
    participant API as Fastify API
    participant PG as PostgreSQL
    participant Redis as Redis 7
    participant Worker as BullMQ Worker

    alt Mode A: Synchronous (Default: L0–L2)
        Player->>API: POST /v1/submissions
        API->>PG: BEGIN tx (insert submission & answers)
        API->>Redis: Atomic incr C(a) & update player vector
        PG-->>API: COMMIT tx
        API-->>Player: 200 OK (Provisional Twin)
    else Mode B: Asynchronous (Survive: L3 / Peak Overload)
        Player->>API: POST /v1/submissions
        API->>Redis: SET idempotency & HSET vector
        API->>Redis: LPUSH submit-persist queue
        API-->>Player: 202 Accepted ("Saved. Finding twin...")
        Worker->>Redis: RPOP submit-persist
        Worker->>PG: Micro-batch bulk INSERT (zero data loss)
    end
\`\`\`
<!-- visual:end submit-mode-sequence -->
`;
  content = content.replace(target, seq);
}

// 5. Section 18 Lanes ER Diagram and Migration Flowchart
if (!content.includes('lanes-er-diagram')) {
  const target = `### 18.2 Relational Data Model Proposal`;
  const er = `### 18.2 Relational Data Model Proposal

<!-- visual:start lanes-er-diagram -->
\`\`\`mermaid
erDiagram
    lanes ||--o{ drops : "schedules"
    lanes ||--o{ questions : "contains"
    lanes ||--o{ submissions : "receives"
    lanes ||--o{ lane_interest : "tracks"
    lanes ||--o{ player_lane_prefs : "configures"
    lanes ||--o{ lane_history_signature : "summarizes"
    drops ||--o{ submissions : "records"
    submissions ||--o{ answer_text : "optional typed answer"
    answer_text }o--|| text_archetypes : "classifies"
    text_archetypes }o--o{ style_tags : "tags"
    submissions ||--o{ super_twin_results : "participates"
\`\`\`
<!-- visual:end lanes-er-diagram -->
`;
  content = content.replace(target, er);
}

if (!content.includes('migration-steps-flowchart')) {
  const target = `#### 18.2.3 Migration Order, Rollback Strategy & Idempotent Backfill`;
  const flow = `#### 18.2.3 Migration Order, Rollback Strategy & Idempotent Backfill

<!-- visual:start migration-steps-flowchart -->
\`\`\`mermaid
flowchart TD
    S1["Step 1: Expand Migration<br/>012_lanes_foundation.sql<br/>New tables & nullable lane_id"] --> S2["Step 2: Idempotent Backfill<br/>Assign historical data to Everyday lane<br/>Batches of 5,000 with pg_sleep(0.05)"]
    S2 --> S3["Step 3: Verification Check<br/>Assert zero NULL lane_id in DB"]
    S3 --> S4["Step 4: Contract Migration<br/>013_lanes_constraints.sql<br/>Apply NOT NULL & composite unique indexes"]
\`\`\`
<!-- visual:end migration-steps-flowchart -->
`;
  content = content.replace(target, flow);
}

// 6. Per-Route Policy Table Priority Lane Emojis (7.1 & 18.9)
// Table 7.1
content = content.replace('| **Critical** | Switch to Mode B async at L3 |', '| 🔴 **Critical** | Switch to Mode B async at L3 |');
content = content.replace(/\| Core \| Never shed \|/g, '| 🟠 Core | Never shed |');
content = content.replace('| Core | Serve stale from CDN if down |', '| 🟠 Core | Serve stale from CDN if down |');
content = content.replace('| Core | Served directly from CDN/R2 |', '| 🟠 Core | Served directly from CDN/R2 |');
content = content.replace('| Core | Return provisional if matching slow |', '| 🟠 Core | Return provisional if matching slow |');
content = content.replace('| Core | Clock synchronization header |', '| 🟠 Core | Clock synchronization header |');
content = content.replace('| Core | Reflects active degradation level |', '| 🟠 Core | Reflects active degradation level |');
content = content.replace('| Core | Serve last-known-good cached bundle |', '| 🟠 Core | Serve last-known-good cached bundle |');

content = content.replace(/\| Medium \|/g, '| 🟡 Medium |');
content = content.replace(/\| Low \|/g, '| ⚪ Low |');

// Table 18.9
content = content.replace('| false | normal | Returns cached lane catalogue', '| false | 🟡 normal | Returns cached lane catalogue');
content = content.replace('| false | normal | Returns signed Drop JSON', '| false | 🟡 normal | Returns signed Drop JSON');
content = content.replace('| true | high | Accepts lane submission', '| true | 🟠 high | Accepts lane submission');
content = content.replace('| false | normal | Returns lane twin', '| false | 🟡 normal | Returns lane twin');
content = content.replace('| true | normal | Records player interest', '| true | 🟡 normal | Records player interest');
content = content.replace('| true | normal | Updates per-lane push opt-in', '| true | 🟡 normal | Updates per-lane push opt-in');
content = content.replace('| false | background | Returns Super twin', '| false | ⚪ background | Returns Super twin');
content = content.replace('| false | normal | Returns lane-filtered arcs', '| false | 🟡 normal | Returns lane-filtered arcs');
content = content.replace('| true | background | Submits typed `say_it`', '| true | ⚪ background | Submits typed `say_it`');

fs.writeFileSync(path, content, 'utf8');
console.log('Applied B4 visuals to architecture.md');
