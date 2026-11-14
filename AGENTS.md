# Agent Instructions for Oddly

## Permanent Design System & UI Pattern Rule

Before any UI change read `design.md`; use only `@oddly/ui-tokens`; follow the sticker rules; do not add colours, fonts, radii or shadows.

- **Visual Metaphor:** Physical paper stickers on a warm cream desk (`#FFF8F0`).
- **Cream-only in v1:** No dark mode (`html { background: #FFF8F0; }`).
- **Tactile Signature:** Everything tappable has an ink outline (`2.5px solid #14123A`) and hard offset sticker shadow (`4px 4px 0 #14123A`).
- **Press Flat:** Tapping physically presses flat (`translate(4px, 4px)` with `0 0 0` shadow).
- **Hard Shadows Only:** No soft blurry shadows (`box-shadow` blur must be 0 outside system focus ring and sheet backdrop), no gradients on UI chrome, no glassmorphism, no neon glows.
- **Strict Token Imports:** No hex literals outside `packages/ui-tokens`.
- **Minimum Touch Targets:** $\ge 44 \times 44\text{ px}$ for all interactive elements.

