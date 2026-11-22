import fs from 'node:fs';
import path from 'node:path';

const docsDir = 'docs';

// 1. degradation-playbook.md
{
  const p = path.join(docsDir, 'degradation-playbook.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('degradation-ladder-visual')) {
      const visual = `<!-- visual:start degradation-ladder-visual -->
| Level | Name | Trigger | Action Summary |
|---|---|---|---|
| 🟢 **L0** | Normal | Healthy | Full system capability across all lanes |
| 🟡 **L1** | Conserve | p95 > 400ms / CPU > 70% | Cache counters 60s, double refresh, sample analytics 50% |
| 🟠 **L2** | Protect Core | p95 > 800ms / lag > 2m | Pause real-time arcs, lock admin writes, serve stale settings |
| 🔴 **L3** | Survive | Error > 2% / DB saturated | **Mode B async persist**, defer matching, Everyday lane only |
| ⚫ **L4** | Static | Origin down | CDN edge fallback shell, local storage on device |
<!-- visual:end degradation-ladder-visual -->

`;
      // insert after first paragraph or header
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated degradation-playbook.md');
    }
  }
}

// 2. capacity-model.md
{
  const p = path.join(docsDir, 'capacity-model.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('capacity-flowchart')) {
      const visual = `<!-- visual:start capacity-flowchart -->
\`\`\`mermaid
flowchart TD
    D0["06:30 IST: Staging<br/>Pre-warm CDN & R2, pre-create partitions"] --> D1["07:00 IST: Drop Opens<br/>Peak window: 1,100 to 2,200 submissions/sec"]
    D1 --> D2["07:00 – 23:00 IST: Live Play<br/>Provisional matching & BullMQ ingestion"]
    D2 --> D3["06:59 IST D+1: Close Window<br/>Freeze submissions, snapshot counters"]
    D3 --> D4["07:00 – 07:10 IST: Final Batch<br/>5,000-user chunks, mutual pairing, recap dispatch"]
\`\`\`
<!-- visual:end capacity-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated capacity-model.md');
    }
  }
}

// 3. admin-panel-spec.md
{
  const p = path.join(docsDir, 'admin-panel-spec.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('admin-priority-legend')) {
      const visual = `<!-- visual:start admin-priority-legend -->
| Priority | SLA / Weight | Scope | Focus Areas |
|---|---|---|---|
| 🔴 **P1** | Critical / Immediate | Phase 11 Core | Auth, Command Center, Drop Management, Audit Log |
| 🟠 **P2** | Essential Operations | Phase 11 Importer | Bulk Question Import, Content Editor, Safety Flags |
| 🟡 **P3** | Advanced Tooling | Post-Launch Tools | Telemetry Viewer, Batch Analytics, Export Tools |
<!-- visual:end admin-priority-legend -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated admin-panel-spec.md');
    }
  }
}

// 4. lanes-and-matching.md
{
  const p = path.join(docsDir, 'lanes-and-matching.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('tie-shrink-table')) {
      const visual = `<!-- visual:start tie-shrink-table -->
| Matching Stage | Candidate Pool Reduction | Metric / Mechanism | Anonymity Guarantee |
|---|---|---|---|
| **1. Peak Similarity** | Top ~100 to 500 candidates | Score within $\\epsilon = 0.01$ | $k \\ge 20$ group threshold |
| **2. 28-Day History** | Filter to top 5–20 candidates | BitMinHash agreement ($\\ge 5$ shared days) | Zero raw vector exposure |
| **3. Cross-Culture** | Filter to 2–5 candidates | Different country preference | Coarse region only |
| **4. Crypto Hash** | Exactly 1 unique Twin | HMAC-SHA256 deterministic tiebreak | Auditable determinism |
| **5. Mutual Pairing** | Reciprocal assignment | Greedy stable matching ($K=32$ candidate subgraph) | \`is_mutual = true\` flag |
<!-- visual:end tie-shrink-table -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated lanes-and-matching.md');
    }
  }
}

// 5. say-it-text-answers.md
{
  const p = path.join(docsDir, 'say-it-text-answers.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('say-it-pipeline-flowchart')) {
      const visual = `<!-- visual:start say-it-pipeline-flowchart -->
\`\`\`mermaid
flowchart TD
    P1["1. Raw Input<br/>Max 80 chars, strictly untracked"] --> P2["2. Local Regex Filter<br/>Screen phone/email/handles"]
    P2 --> P3["3. Content Moderation<br/>Forbidden topics & hate speech check"]
    P3 --> P4["4. CPU ONNX Embedding<br/>all-MiniLM-L6-v2 vector generation"]
    P4 --> P5["5. Archetype Classification<br/>Assign playful archetype & style tag"]
    P5 --> P6["6. Cosine Similarity<br/>Evaluate text component of match"]
    P6 --> P7["7. Ephemeral Cleanup<br/>Drop raw text; keep archetypes only"]
\`\`\`
<!-- visual:end say-it-pipeline-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated say-it-text-answers.md');
    }
  }
}

// 6. situations-lane-guidelines.md
{
  const p = path.join(docsDir, 'situations-lane-guidelines.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('situations-safety-callout')) {
      const visual = `<!-- visual:start situations-safety-callout -->
> [!WARNING]
> **Situations Lane Safety Invariants (Rule L7)**
> - **Zero Shaming:** Archetypes describe playful styles (e.g. *Calm Anchor*, *Impulsive Spark*), never evaluations (*simp*, *loser* are forbidden).
> - **Gender Neutral:** Scenarios never assume or inquire about player gender or orientation.
> - **Respect & Consent:** Zero scenarios depicting pursuit after refusal, following, or pressure.
> - **18+ Non-Dating:** Situations is an instinct game, strictly non-dating with zero direct communication.
<!-- visual:end situations-safety-callout -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated situations-lane-guidelines.md');
    }
  }
}

// 7. runbook.md
{
  const p = path.join(docsDir, 'runbook.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('runbook-incident-matrix')) {
      const visual = `<!-- visual:start runbook-incident-matrix -->
| Severity | Impact | Pager Duty SLA | Operational Action |
|---|---|---|---|
| 🔴 **SEV-1** | Drop unavailable or submit error rate > 5% | 5 minutes | Immediate rollback, switch to Mode B, fail over CDN |
| 🟠 **SEV-2** | Latency p95 > 1,500ms or background queue lag | 15 minutes | Step degradation ladder to L2, scale workers |
| 🟡 **SEV-3** | Non-critical feature degraded (cards/stats) | 60 minutes | Shed non-essential priority routes |
| 🟢 **SEV-4** | Minor telemetry or non-blocking bug | Next business day | Log ticket, normal development cycle |
<!-- visual:end runbook-incident-matrix -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated runbook.md');
    }
  }
}

// 8. connection-features.md
{
  const p = path.join(docsDir, 'connection-features.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('connection-topology-flowchart')) {
      const visual = `<!-- visual:start connection-topology-flowchart -->
\`\`\`mermaid
flowchart TD
    T["Daily Twin Reveal"] --> G["🌐 F18: Twin Globe<br/>Coarse 3D arcs (k ≥ 20)"]
    T --> K["🤝 F19: Keep & Orbit<br/>Mutual opt-in, 1-per-day, max 10"]
    K --> P["🔮 F20: Telepathy<br/>Daily 1-question instinct guess"]
    T --> A["🪞 F21: Anti-Twin<br/>Honest polar opposite reveal"]
\`\`\`
<!-- visual:end connection-topology-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated connection-features.md');
    }
  }
}

// 9. disaster-recovery.md
{
  const p = path.join(docsDir, 'disaster-recovery.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('dr-timeline-flowchart')) {
      const visual = `<!-- visual:start dr-timeline-flowchart -->
\`\`\`mermaid
flowchart LR
    I["🚨 Incident Detected"] --> A["T+2m: Auto-Degrade<br/>Switch to Level L4 static"]
    A --> R["T+10m: Redis/DB Restore<br/>Target RPO < 5 min"]
    R --> S["T+25m: Service Restored<br/>Target RTO < 30 min"]
    S --> V["T+30m: Health Probes Pass<br/>Gradual step down to L0"]
\`\`\`
<!-- visual:end dr-timeline-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated disaster-recovery.md');
    }
  }
}

// 10. dynamic-content-audit.md
{
  const p = path.join(docsDir, 'dynamic-content-audit.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('content-audit-summary')) {
      const visual = `<!-- visual:start content-audit-summary -->
| Surface | Storage Authority | Cache TTL | Rule 11 Compliance |
|---|---|---|---|
| **Daily Drop Questions** | PostgreSQL \`drops\` / \`questions\` | Edge 5s / R2 immutable | 🟢 100% Dynamic |
| **App Copy & Labels** | PostgreSQL \`app_content\` | Edge 60s / Memory cache | 🟢 100% Dynamic |
| **System Feature Flags** | PostgreSQL \`app_config\` | Fastify 30s cache | 🟢 100% Dynamic |
| **Offline Fallback Copy** | Client Service Worker | Stored on device | 🟢 Authorized Fallback |
<!-- visual:end content-audit-summary -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated dynamic-content-audit.md');
    }
  }
}

// 11. event-dictionary.md
{
  const p = path.join(docsDir, 'event-dictionary.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('event-priority-table')) {
      const visual = `<!-- visual:start event-priority-table -->
| Telemetry Priority | Delivery Mechanism | Shedding Threshold | Example Events |
|---|---|---|---|
| 🔴 **Critical** | Synchronous DB record | Never shed | \`drop.submitted\`, \`auth.age_verified\` |
| 🟠 **Core** | Redis queue batch | Shed at L3 | \`twin.revealed\`, \`streak.incremented\` |
| 🟡 **Operational** | Fastify in-memory buffer | Sampled at L1, shed at L2 | \`page.view\`, \`share.clicked\` |
| ⚪ **Telemetry** | Micro-batched analytics | Shed at L2+ | \`animation.skipped\`, \`card.dragged\` |
<!-- visual:end event-priority-table -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated event-dictionary.md');
    }
  }
}

// 12. failure-modes.md
{
  const p = path.join(docsDir, 'failure-modes.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('failure-mode-summary')) {
      const visual = `<!-- visual:start failure-mode-summary -->
| Failure Domain | Primary Defense | Fallback State | Recovery Time |
|---|---|---|---|
| **PostgreSQL Outage** | Mode B async ingestion | Cached static drop, local client retry | RTO < 30m |
| **Redis Outage** | Direct DB fallback mode | Reduced rate limits, provisional delay | RTO < 10m |
| **Worker Overload** | Piscina CPU cap + load shed | Defer non-critical matching jobs | Self-healing |
| **CDN Partition** | Stale-if-error headers | Local browser cached bundle | Instant |
<!-- visual:end failure-mode-summary -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated failure-modes.md');
    }
  }
}

// 13. implementation-status.md
{
  const p = path.join(docsDir, 'implementation-status.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('impl-status-chip-row')) {
      const visual = `<!-- visual:start impl-status-chip-row -->
| Package / Service | Architectural Status | Test Coverage | Key Focus |
|---|---|---|---|
| \`apps/web\` | 🟢 Next.js 14 PWA Complete | Unit & E2E Passing | Core player loop, Sticker Pop UI |
| \`services/api\` | 🟢 Fastify Backend Complete | Integration Passing | High throughput, Mode A/B persist |
| \`services/worker\` | 🟢 BullMQ Workers Complete | Queue Testing Passing | Satori render, final batch match |
| \`packages/shared\` | 🟢 Zod Schemas & Invariants | 100% Invariant Coverage | Math formulas, strict schemas |
<!-- visual:end impl-status-chip-row -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated implementation-status.md');
    }
  }
}

// 14. load-testing.md
{
  const p = path.join(docsDir, 'load-testing.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('load-stages-chart')) {
      const visual = `<!-- visual:start load-stages-chart -->
\`\`\`mermaid
flowchart LR
    S1["1. Warmup<br/>50 req/s · 2 min"] --> S2["2. Plateau<br/>500 req/s · 5 min"]
    S2 --> S3["3. Morning Peak<br/>1,100 req/s · 10 min"]
    S3 --> S4["4. Spike Stress<br/>2,200 req/s · 3 min"]
    S4 --> S5["5. Recovery<br/>100 req/s · 5 min"]
\`\`\`
<!-- visual:end load-stages-chart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated load-testing.md');
    }
  }
}

// 15. manual-a11y-checklist.md
{
  const p = path.join(docsDir, 'manual-a11y-checklist.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('a11y-compliance-callout')) {
      const visual = `<!-- visual:start a11y-compliance-callout -->
> [!NOTE]
> **Accessibility Standard:** WCAG 2.1 Level AA Compliance  
> Minimum contrast ratios: 4.5:1 normal text, 3.0:1 large text. Minimum touch target size: 44 × 44 px. Strictly honors \`prefers-reduced-motion\`. Visible focus rings on all interactive elements.
<!-- visual:end a11y-compliance-callout -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated manual-a11y-checklist.md');
    }
  }
}

// 16. meme-and-insights-features.md
{
  const p = path.join(docsDir, 'meme-and-insights-features.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('meme-lifecycle-flowchart')) {
      const visual = `<!-- visual:start meme-lifecycle-flowchart -->
\`\`\`mermaid
flowchart TD
    M1["1. Submission (Meme Lab)<br/>Creator pairs template + 4 captions"] --> M2["2. Fast Moderation<br/>Admin queue check (Rule 19)"]
    M2 --> M3["3. Drop Queue Staging<br/>Scheduled in admin_lane_drops"]
    M3 --> M4["4. Live Memes Drop<br/>Unified 07:00 IST release"]
    M4 --> M5["5. Recognition & Badges<br/>Anonymous creator credit (Rule 20)"]
\`\`\`
<!-- visual:end meme-lifecycle-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated meme-and-insights-features.md');
    }
  }
}

// 17. reliability-gap-audit.md
{
  const p = path.join(docsDir, 'reliability-gap-audit.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('reliability-gap-callout')) {
      const visual = `<!-- visual:start reliability-gap-callout -->
> [!IMPORTANT]
> **Reliability Invariant:** No acknowledged submission is ever lost. All write paths guarantee idempotency with \`request_id\`. Worker pipelines enforce deterministic job completion and circuit-breaker isolation.
<!-- visual:end reliability-gap-callout -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated reliability-gap-audit.md');
    }
  }
}

// 18. scaling-plan.md
{
  const p = path.join(docsDir, 'scaling-plan.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('scaling-tiers-flowchart')) {
      const visual = `<!-- visual:start scaling-tiers-flowchart -->
\`\`\`mermaid
flowchart TD
    T0["🟢 T0: Up to 1k DAU<br/>Single instance starter stack"] --> T1["🟡 T1: 1k to 10k DAU<br/>2 API instances + managed Postgres"]
    T1 --> T2["🟠 T2: 10k to 100k DAU<br/>Postgres replica + multi-role Redis"]
    T2 --> T3["🔴 T3: 100k to 1M DAU<br/>Redis cluster + Mode B async persist"]
    T3 --> T4["🟣 T4: > 1M DAU<br/>Multi-region reads & sharded counters"]
\`\`\`
<!-- visual:end scaling-tiers-flowchart -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated scaling-plan.md');
    }
  }
}

// 19. slo.md
{
  const p = path.join(docsDir, 'slo.md');
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('slo-summary-table')) {
      const visual = `<!-- visual:start slo-summary-table -->
| Service Boundary | SLO Target | Error Budget (30d) | Key Defense |
|---|---|---|---|
| **Availability** | 🟢 **99.9%** (99.95% Drop peak) | 43.2 minutes | Multi-role redundancy, CDN fallback |
| **Drop Delivery** | 🟢 **p95 < 100ms** | Hit ratio > 99% | Cloudflare CDN edge caching |
| **Submissions** | 🟢 **p95 < 500ms** | Error rate < 0.5% | Stateless Fastify API, Mode B persist |
| **Final Batch** | 🟢 **99% by 07:10 IST** | 100% by 07:20 IST | BullMQ worker chunking (5k batches) |
<!-- visual:end slo-summary-table -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log('Updated slo.md');
    }
  }
}

// 20. Process stage reports & prompts (stage-*.md)
const allDocs = fs.readdirSync(docsDir);
for (const file of allDocs) {
  if (file.startsWith('stage-') && file.endsWith('.md')) {
    const p = path.join(docsDir, file);
    let c = fs.readFileSync(p, 'utf8');
    if (!c.includes('stage-archive-callout')) {
      const visual = `<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for \`${file}\`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->

`;
      const lines = c.split(/\r?\n/);
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) { insertIdx = i + 1; break; }
      }
      lines.splice(insertIdx, 0, '', visual);
      fs.writeFileSync(p, lines.join('\n'), 'utf8');
      console.log(`Updated archive banner in ${file}`);
    }
  }
}

console.log('Applied B8 visuals across all docs/*.md files');
