# Agent Instructions for Oddly

## Start Here (2026-11-25)

Read `product.md §0` (the current product definition up to chat unlock) and `task.md` Phase 10V (Stage C0) before any work. Rules 36–41 in `rules.md` apply: no invented data on player screens, one matching formula, blocks are absolute, the server decides thresholds, age band is display only, and "done" means a real player can reach it. When asked for a report, change nothing except the report file.

## Permanent Design System & UI Pattern Rule

Before any UI change read `design.md`; use only `@oddly/ui-tokens`; follow the sticker rules; do not add colours, fonts, radii or shadows.

- **Visual Metaphor:** Physical paper stickers on a warm cream desk (`#FFF8F0`).
- **Cream-only in v1:** No dark mode (`html { background: #FFF8F0; }`).
- **Tactile Signature:** Everything tappable has an ink outline (`2.5px solid #14123A`) and hard offset sticker shadow (`4px 4px 0 #14123A`).
- **Press Flat:** Tapping physically presses flat (`translate(4px, 4px)` with `0 0 0` shadow).
- **Hard Shadows Only:** No soft blurry shadows (`box-shadow` blur must be 0 outside system focus ring and sheet backdrop), no gradients on UI chrome, no glassmorphism, no neon glows.
- **Strict Token Imports:** No hex literals outside `packages/ui-tokens`.
- **Minimum Touch Targets:** $\ge 44 \times 44\text{ px}$ for all interactive elements.

## Admin Panel Engineering Rule

Admin work: read `docs/admin-panel-spec.md` first. It is the authoritative description of what to build in Phase 11.

## Memes, Signals & Insights Rule

Never personalise Drop questions; analytics only with consent; no sensitive inference.

## Lanes & Matching Isolation Rule

Lanes isolate matching; Drops are identical within a lane; typed answers only behind Gate G4; no politics; never shame a player.

After any change to task.md counts, run `node scripts/docs-visuals/build.mjs` and commit the updated SVGs. Follow `docs/DOCS-STYLE.md`. Never change a fact to make a visual look nicer.




