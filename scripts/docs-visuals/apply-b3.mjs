import fs from 'node:fs';

const path = 'product.md';
let content = fs.readFileSync(path, 'utf8');
const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// 1. Product at a glance
if (!content.includes('product-at-a-glance')) {
  const target = `## 1. What We Are Making`;
  const glance = `<!-- visual:start product-at-a-glance -->
> [!NOTE]
> **Oddly at a Glance**
> - **Core Loop:** Five instinct-based picks in under 30 seconds every morning at 07:00 IST.
> - **Lanes:** Choose your universe (Everyday, Memes, Situations); matching is strictly lane-isolated.
> - **Honest Matching:** Find your Twin and your Oddness rarity percentile with zero profiles, feeds, or chat.
> - **Safe by Design:** Structured answers, 18+ only, zero shaming, no sensitive inference, non-political.
> - **Tactile Pop:** Physical paper sticker aesthetic on warm cream desk (\`#FFF8F0\`) with ink outlines and hard shadows.
<!-- visual:end product-at-a-glance -->

`;
  content = content.replace(target, glance + target);
}

// 2. Go/No-Go Decision Gates Mermaid Flowchart
if (!content.includes('decision-gates-flowchart')) {
  const target = `### 4.6 Go/No-Go Decision Gates`;
  const chart = `### 4.6 Go/No-Go Decision Gates

<!-- visual:start decision-gates-flowchart -->
\`\`\`mermaid
flowchart TD
    G0["🟢 G0: Private Alpha<br/>50 players · D1 ≥ 40%"] --> G1["🟢 G1: Public Beta<br/>1k players · D7 ≥ 25% · p95 < 2s"]
    G1 --> G2["🟡 G2: Campus Launch<br/>5k players · D30 ≥ 18% · K ≥ 0.3"]
    G2 --> G3["⚪ G3: Monetisation Gate<br/>25k MAU · No paywalls before"]
    
    subgraph LaneGates["Lane & Content Side Branches"]
        GLA["🛤️ Gate L-A: Lane Opening<br/>≥ 3k global DAU · 8 queued Drops"]
        G4["🔒 Gate G4: Free-Text / Say It<br/>Text moderation · Macro-F1 ≥ 0.75"]
    end
    
    G1 -.-> GLA
    GLA -.-> G4
\`\`\`
<!-- visual:end decision-gates-flowchart -->
`;
  content = content.replace(target, chart);
}

// 3. Core Loop and Timeline Flowcharts
if (!content.includes('core-loop-flowchart')) {
  const target = `### 6.1 The Player Core Loop`;
  const loopChart = `### 6.1 The Player Core Loop

<!-- visual:start core-loop-flowchart -->
\`\`\`mermaid
flowchart LR
    D["1. Discovery<br/>(18+ Age Gate)"] --> P["2. Play Drop<br/>(5 instinct picks)"]
    P --> R["3. Instant Reveal<br/>(Twin & Oddness)"]
    R --> E["4. Explore<br/>(Lane carousel)"]
    E --> H["5. Returning Home<br/>(Last played first)"]
    H --> M["6. Morning Recap<br/>(07:05 IST mutual)"]
    M -.-> P
\`\`\`
<!-- visual:end core-loop-flowchart -->
`;
  content = content.replace(target, loopChart);
}

if (!content.includes('timeline-flowchart')) {
  const target = `### 6.2 The Daily "Twin Day" Timeline (All times IST, stored in UTC)`;
  const timeChart = `### 6.2 The Daily "Twin Day" Timeline (All times IST, stored in UTC)

<!-- visual:start timeline-flowchart -->
\`\`\`mermaid
flowchart TD
    T1["07:00 IST<br/>Unified Daily Drop Open"] --> T2["07:00 – 23:00 IST<br/>Active Play Window & On-Demand Provisional Matching"]
    T2 --> T3["07:00 IST (+1 Day)<br/>Drop Close & 24h Window Freeze"]
    T3 --> T4["07:05 IST (+1 Day)<br/>Batch Mutual Pairing · History Tie-Break · Morning Recap"]
\`\`\`
<!-- visual:end timeline-flowchart -->
`;
  content = content.replace(target, timeChart);
}

// 4. Oddness Rarity Tiers Chip Row
if (!content.includes('oddness-tier-chips')) {
  const target = `**Rarity Tiers:**\n\n- **Common:** 0.0% – 49.9%`;
  const altTarget = `**Rarity Tiers:**\r\n\r\n- **Common:** 0.0% – 49.9%`;
  const chipBlock = `**Rarity Tiers:**

<!-- visual:start oddness-tier-chips -->
| Tier | Percentile Range | Visual Accent & Indicator |
|---|---|---|
| **Common** | 0.0% – 49.9% | ⚪ Slate / Ink outline (\`#5B5780\`) |
| **Uncommon** | 50.0% – 79.9% | 🟢 Mint (\`#3DDBB0\`) |
| **Rare** | 80.0% – 94.9% | 🟣 Violet (\`#6C4CF1\`) |
| **Mythic** | 95.0% – 100.0% | 🟡 Sun / Gold foil (\`#FFD23F\`) |
<!-- visual:end oddness-tier-chips -->

- **Common:** 0.0% – 49.9%`;

  if (content.includes(target)) {
    content = content.replace(target, chipBlock);
  } else if (content.includes(altTarget)) {
    content = content.replace(altTarget, chipBlock.replace(/\n/g, '\r\n'));
  }
}

// 5. Similarity and tie-break pipeline
if (!content.includes('tie-break-pipeline-flowchart')) {
  const target = `### 9.6 Tie-Breaking, History Agreement, and Mutual Pairing`;
  const pipeChart = `### 9.6 Tie-Breaking, History Agreement, and Mutual Pairing

<!-- visual:start tie-break-pipeline-flowchart -->
\`\`\`mermaid
flowchart TD
    C["Candidate Pool"] --> S1["Step 1: Top Similarity Score<br/>Filter to peak score within ε = 0.01"]
    S1 --> S2["Step 2: 28-Day Lane History<br/>BitMinHash signature agreement (≥ 5 shared days)"]
    S2 --> S3["Step 3: Cross-Cultural Preference<br/>Prefer candidate from different country"]
    S3 --> S4["Step 4: Deterministic Cryptographic Hash<br/>HMAC_SHA256(drop_id, min || max)"]
    S4 --> S5["Step 5: Greedy Mutual Pairing<br/>Pair reciprocal twins (is_mutual = true)"]
\`\`\`
<!-- visual:end tie-break-pipeline-flowchart -->
`;
  content = content.replace(target, pipeChart);
}

// 6. Master Lane Catalogue emojis and accents
const laneMap = [
  { oldRow: "| `everyday` | Everyday |", newRow: "| `everyday` | 🟪 Everyday |", oldStat: "**Open**", newStat: "🟢 **Open**" },
  { oldRow: "| `memes` | Memes |", newRow: "| `memes` | 🟨 Memes |", oldStat: "**Open**", newStat: "🟢 **Open**" },
  { oldRow: "| `gaming` | Gaming |", newRow: "| `gaming` | 🟩 Gaming |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `screen_sound` | Screen & Sound |", newRow: "| `screen_sound` | 🟪 Screen & Sound |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `food_habits` | Food & Habits |", newRow: "| `food_habits` | 🟧 Food & Habits |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `hot_takes` | Hot Takes |", newRow: "| `hot_takes` | 🟥 Hot Takes |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `how_you_think`| How You Think |", newRow: "| `how_you_think`| 🟪 How You Think |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `situations` | Situations |", newRow: "| `situations` | 🟨 Situations |", oldStat: "Planned", newStat: "⚪ Planned" },
  { oldRow: "| `brain` | Brain |", newRow: "| `brain` | 🟦 Brain |", oldStat: "Documented", newStat: "📄 Documented" }
];

for (const lm of laneMap) {
  if (content.includes(lm.oldRow)) {
    content = content.replace(lm.oldRow, lm.newRow);
  }
}
// Replace status in lane table
content = content.replace('| `pick1`, `pick2of6`, `rank3`, `slider7`, legacy (max 2) | **Open** |', '| `pick1`, `pick2of6`, `rank3`, `slider7`, legacy (max 2) | 🟢 **Open** |');
content = content.replace('| `pick1`, `pick2of6`, `rank3` | **Open** |', '| `pick1`, `pick2of6`, `rank3` | 🟢 **Open** |');
content = content.replace('| `pick1`, `pick2of6`, `rank3`, `slider7` | Planned | Gate L-A (', '| `pick1`, `pick2of6`, `rank3`, `slider7` | ⚪ Planned | Gate L-A (');
content = content.replace('| `pick1`, `pick2of6`, `rank3`, `slider7` | Planned | Gate L-A |', '| `pick1`, `pick2of6`, `rank3`, `slider7` | ⚪ Planned | Gate L-A |');
content = content.replace('| `pick1`, `pick2of6`, `rank3`, `slider7` | Planned | Gate L-A |', '| `pick1`, `pick2of6`, `rank3`, `slider7` | ⚪ Planned | Gate L-A |');
content = content.replace('| `pick1`, `slider7` | Planned |', '| `pick1`, `slider7` | ⚪ Planned |');
content = content.replace('| `pick1`, `slider7`, `rank3` | Planned |', '| `pick1`, `slider7`, `rank3` | ⚪ Planned |');
content = content.replace('| `scene` (v1), `say_it` (v2 behind G4) | Planned |', '| `scene` (v1), `say_it` (v2 behind G4) | ⚪ Planned |');
content = content.replace('| `pick1`, `pick2of6` | Documented |', '| `pick1`, `pick2of6` | 📄 Documented |');

// 7. Cards for F32 to F39
const fCards = [
  { header: '### F32 Lanes (v1, Stage L1)', id: 'f32', stage: 'Stage L1', status: '🟢 In Progress', flag: '`feature.lanes`' },
  { header: '### F33 Richer Answer Formats (v1, Stage L2)', id: 'f33', stage: 'Stage L2', status: '⚪ Planned', flag: '`feature.richer_formats`' },
  { header: '### F34 Twin Depth & Mutual Pairing (v1, Stage L3)', id: 'f34', stage: 'Stage L3', status: '⚪ Planned', flag: '`feature.twin_depth`' },
  { header: '### F35 Memes Lane Launch (v1, Stage L4)', id: 'f35', stage: 'Stage L4', status: '⚪ Planned', flag: '`feature.memes_lane`' },
  { header: '### F36 Situations Lane (Stage L5, Card Version First)', id: 'f36', stage: 'Stage L5', status: '⚪ Planned', flag: '`feature.situations_lane`' },
  { header: '### F37 Say It: Free-Text Answers (Stage L6, Gated Behind Gate G4)', id: 'f37', stage: 'Stage L6', status: '🔒 Gated (Gate G4)', flag: '`feature.say_it`' },
  { header: '### F38 Super Twin and Lane-Aware Connection Features (Stage L7)', id: 'f38', stage: 'Stage L7', status: '⚪ Planned', flag: '`feature.super_twin`' },
  { header: '### F39 Brain Lane (Stage L8, Documented Only)', id: 'f39', stage: 'Stage L8', status: '📄 Documented Only', flag: '`None (Documented Only)`' }
];

for (const fc of fCards) {
  if (content.includes(fc.header) && !content.includes(`card-${fc.id}`)) {
    const cardBlock = `${fc.header}

<!-- visual:start card-${fc.id} -->
> [!NOTE]
> **Stage:** ${fc.stage} | **Status:** ${fc.status} | **Feature Flag:** ${fc.flag}
<!-- visual:end card-${fc.id} -->
`;
    content = content.replace(fc.header, cardBlock);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Applied B3 visuals to product.md');
