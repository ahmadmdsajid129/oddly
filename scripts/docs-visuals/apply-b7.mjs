import fs from 'node:fs';

const path = 'memory.md';
let content = fs.readFileSync(path, 'utf8');

const doc1Section = `
---

## 35. Stage DOC1: Visual Documentation (2026-11-22)

- **Completed:** Stage DOC1 (Make markdown files colourful and visual, docs and tooling only).
- **Core Principle Maintained:** Content and facts completely invariant. Zero rule, number, task ID, status, copy key, or config value modified. Facts snapshot verified with automated parity check.
- **Key Deliverables:**
  - **Tooling & Generation (Section A):** Zero-dependency Node 20 script (\`scripts/docs-visuals/build.mjs\`) generating tactile "Sticker pop" SVGs (\`banner.svg\`, \`progress-overall.svg\`, \`donut-tasks.svg\`, \`progress-phases.svg\`, \`roadmap-stages.svg\`, \`palette.svg\`, and offline badges). All SVGs adhere to ink outlines, offset hard shadows, and the 20 KB budget.
  - **README Visuals (Section B1):** Hero banner, offline badges, "Where We Are" live progress indicators, and visual document index table with topic emojis.
  - **Task Dashboard & Phase Tracking (Section B2):** Overall progress SVG and task status donut chart under dashboard; phases progress bar SVG above Phase Overview; 10-square emoji progress bars (\`🟩/⬜\`); task table priority (\`🔴/🟠/🟡/🟢\`) and status (\`✅/🟡/⚪/🔴\`) chips; mini progress bars above stage checklists; visual stage roadmap.
  - **Product Specification (Section B3):** "Product at a glance" callout block; Master Lane Catalogue status chips and accent color indicators; Mermaid flowcharts for Decision Gates (G0–G3, L-A, G4), Player Core Loop, Daily Timeline, and Similarity/Tie-Break pipeline; Oddness tier chip row; F32–F39 feature status cards.
  - **Technical Architecture (Section B4):** Mermaid system topology diagram; scale tiers T0–T4 flow diagram and color dots; degradation ladder L0–L4 color indicators (\`🟢/🟡/🟠/🔴/⚫\`); submit path Mode A vs Mode B Mermaid sequence diagram; Section 18 lanes \`erDiagram\`; 4-step database migration flowchart; Per-Route Policy table priority indicators.
  - **Design System (Section B5):** Embedded \`palette.svg\` token preview; oddness tier chip previews; typography specimen table; component states table with tactile interaction emojis.
  - **Rules & Standards (Section B6):** Rule 1 callout (\`> [!IMPORTANT]\`); Absolute Rules theme legend and rule prefixes (\`🛑/🔒/🧪/🗄️/🎨/💸/🛤️\`); Rule 17 "No Pressure to Pay" callout; Section 9.1 Forbidden Topics callout; Error Matrix log level indicators (\`🟢/🟡/🔴\`).
`;

if (!content.includes('## 35. Stage DOC1: Visual Documentation')) {
  content = content.trimEnd() + '\n' + doc1Section;
  fs.writeFileSync(path, content, 'utf8');
  console.log('Appended Section 35 to memory.md');
}
