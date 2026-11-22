# Oddly Documentation Visuals Generator

Plain Node.js 20 ES module generator that produces graphical assets (SVGs, progress bars, donut chart, roadmap, palette, banners, and badges) for the Oddly documentation suite.

## How to Run

```bash
# Generate all visual SVGs into docs/assets/
node scripts/docs-visuals/build.mjs

# Snapshot / verify facts consistency
node scripts/docs-visuals/extract-facts.mjs docs/assets/_facts-after.json
```

## Zero Dependencies

Built purely on Node.js core APIs (`fs`, `path`, `url`). Contains **0 external npm dependencies** in accordance with Rule 9 (no unrecorded dependencies).

## What It Reads

- `task.md`:
  - Parses Master Progress Dashboard numbers (total tasks, completed, in progress, blocked, pending, progress %).
  - Parses Phase Overview Table rows (phase ID, name, priority, status, percent, done/total count, stage).
  - Validates arithmetic parity: asserts that the sum of all phase rows exactly equals the dashboard totals. If numbers disagree, halts with an error.
  - Parses Recommended Execution Order pipeline string.
- `design.md`:
  - Mirrors Section 2.1 Sticker Pop core palette tokens and Section 2.3 oddness tier chips.

## What It Writes

All SVGs are written deterministically to `docs/assets/`:
1. `docs/assets/progress-overall.svg`: Wide master progress bar with mint fill on lavender track and percentage pill.
2. `docs/assets/donut-tasks.svg`: Donut chart of task statuses with central total count and legend.
3. `docs/assets/progress-phases.svg`: Phase-by-phase horizontal progress bars grouped by lifecycle stage (Core, Connection, Memes, Lanes, Admin, Launch).
4. `docs/assets/roadmap-stages.svg`: Sticker roadmap showing execution sequence with status color chips.
5. `docs/assets/palette.svg`: Design system color swatches with hex values, roles, and oddness tier chips.
6. `docs/assets/banner.svg`: Oddly header banner featuring the three overlapping brand circles (violet, coral, mint), wordmark, and tagline.
7. `docs/assets/badges/*.svg`: Offline SVG badges (stage, tasks, stack, license).

## Design System Invariants

- **Metaphor:** Physical paper stickers on a warm cream desk (`#FFF8F0`).
- **Tactile Signature:** 2.5px ink outline (`#14123A`) with 4px hard offset shadow (`#14123A`, 0 blur).
- **Typography:** Uses native system font fallback stack (`system-ui, sans-serif`) for universal offline and GitHub rendering without web font dependencies.
- **Accessible:** Every SVG includes `<title>` and `<desc>` elements and strict WCAG AA contrast pairings.
- **Idempotent:** Produces byte-identical output across consecutive runs (no dynamic timestamps).
