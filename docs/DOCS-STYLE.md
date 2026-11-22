# Oddly Documentation Style Guide (DOCS-STYLE)

<!-- visual:start doc-style-banner -->
> [!NOTE]
> **Core Principle:** Facts live in plain text and tables. Visuals decorate. Never alter a fact, number, status, or rule to make a visual look nicer.
<!-- visual:end doc-style-banner -->

## 1. The Oddly Documentation Palette

All documentation SVGs and visual badges mirror the "Sticker pop" brand design tokens from `design.md`:

| Token | Hex | Role in Documentation |
|---|---|---|
| `ink` | `#14123A` | All text, 2.5px solid outlines, 4px hard offset shadows |
| `cream` | `#FFF8F0` | Warm desk background |
| `paper` | `#FFFFFF` | Card background fill |
| `violet` | `#6C4CF1` | Primary accent, hero banners, Rare tier chips |
| `lavender` | `#EEEAFE` | Soft badge backgrounds, Common tier chips |
| `lilac` | `#CDBFFF` | Secondary badge backgrounds, Uncommon tier chips |
| `mint` | `#3DDBB0` | Completed stages, success states, active features |
| `sun` | `#FFD23F` | In-progress indicators, selected states |
| `coral` | `#FF6B5E` | Warnings, todo accents, streak chips |
| `muted` | `#5B5780` | Secondary metadata labels |
| `error` | `#D92D4B` | Critical blockers and error highlights |

## 2. Standard Emoji Legends

### 2.1 Task & Phase Status
- 🟢 `DONE` / `OPEN` / `COMPLETE`: Finished or actively live.
- 🟡 `IN PROGRESS` / `PREVIEW` / `PARTIAL`: Actively building or in testing.
- ⚪ `TODO` / `PLANNED`: Queued for execution.
- 🔴 `BLOCKED`: Dependency or gating blocker.
- 😴 `RESTING`: Scheduled resting state.
- 📄 `DOCUMENTED`: Architectural specification only.

### 2.2 Task Priority
- 🔴 `Critical`: P1 core path blocker.
- 🟠 `High`: P2 major feature deliverable.
- 🟡 `Medium`: P3 standard operational enhancement.
- 🟢 `Low`: P4 polish or non-blocking improvement.

### 2.3 Route & Telemetry Priority Lanes
- 🔴 `Critical`: Submit path, un-sheddable.
- 🟠 `Core` / `high`: Play path, cached fallback.
- 🟡 `Medium` / `normal`: Standard user operations.
- ⚪ `Low` / `background`: Background telemetry, shed first.

### 2.4 Degradation Levels
- 🟢 `L0 Normal`: Standard healthy operation.
- 🟡 `L1 Conserve`: High-traffic conservation mode.
- 🟠 `L2 Protect Core`: Pause real-time arcs, lock admin writes.
- 🔴 `L3 Survive`: Mode B async persist active, single-lane play.
- ⚫ `L4 Static`: Origin down, cached shell fallback.

### 2.5 Rule Categories
- 🛑 `Stop & Scope`: Stage boundary halts and scope guards.
- 🔒 `Privacy & Safety`: Anonymity, DPDP compliance, zero harassment.
- 🧪 `Testing & Quality`: Honest verification and linting.
- 🗄️ `Data & Migrations`: Append-only records and schema evolution.
- 🎨 `Design & Motion`: Sticker pop design system and reduced-motion rules.
- 💸 `Money & Pressure`: 100% free core loop, zero coercive monetization.
- 🛤️ `Lanes & Drops`: Matching isolation and identical Drop invariants.

## 3. Regenerating Documentation Visuals

All SVGs in `docs/assets/` are generated deterministically by plain Node 20 standard library (zero npm dependencies):

```bash
node scripts/docs-visuals/build.mjs
```

### Visual Assets Inventory
1. `docs/assets/progress-overall.svg`: Main project completion bar with ink borders.
2. `docs/assets/donut-tasks.svg`: Task distribution donut chart.
3. `docs/assets/progress-phases.svg`: Horizontal progress breakdown across all 36 phases.
4. `docs/assets/roadmap-stages.svg`: Recommended execution order stage tiles.
5. `docs/assets/palette.svg`: Swatches of all brand colour tokens.
6. `docs/assets/banner.svg`: Oddly header banner card.
7. `docs/assets/badges/*.svg`: Offline SVG status badges for Stage, Tasks, Stack, and License.

## 4. Visual Block Markup

Wrap decorative content inside marked HTML comment blocks so future automated agents can differentiate between visual decorations and factual specifications:

```markdown
<!-- visual:start <name> -->
[Visual content, Mermaid diagram, or generated SVG]
<!-- visual:end <name> -->
```
