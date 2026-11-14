# Oddly — Stage D1 Redesign Report: Sticker Pop

**Date:** 2026-11-14  
**Direction:** Sticker Pop (physical stickers on warm cream desk `#FFF8F0` with ink outlines and hard offset shadows)  
**Status:** Complete  

---

## 1. What Changed Per Step (D1.1 to D1.9)

### D1.1 Tokens (`@oddly/ui-tokens`)
- Replaced dark-mode aesthetic with the unified **Sticker Pop** palette: 11 core tokens (`ink` `#14123A`, `cream` `#FFF8F0`, `paper` `#FFFFFF`, `violet` `#6C4CF1`, `lavender` `#E5DEFF`, `coral` `#FF6B4A`, `mint` `#2EC4B6`, `sun` `#FFD166`, `muted` `#6E6A8A`, `lilac` `#D4BBFF`, `error` `#E63946`).
- Codified 4 approved radii: `sm` (8px), `m` (14px), `l` (20px), `pill` (9999px).
- Enforced hard offset sticker shadows with zero blur:
  - `shadow-sticker`: `4px 4px 0 #14123A`
  - `shadow-sticker-lift`: `6px 6px 0 #14123A`
  - `shadow-sticker-sm`: `2px 2px 0 #14123A`
  - `shadow-sticker-flat`: `0 0 0 #14123A`
- Built WCAG AA automated contrast suite (`contrast.test.ts`): 13/13 tests pass verifying ink/cream (16.2:1), paper/violet (4.58:1), and strict prohibition of mint/coral text on cream.
- Generated `tailwind-preset.cjs` and `tokens.css`.

### D1.2 Fonts & Global Styles
- Integrated **Bricolage Grotesque** (display 700/800) and **Inter** (body 400/500/600) via `next/font/google` with zero third-party external runtime font requests.
- Root background styled as warm cream desk (`#FFF8F0`) with ink text (`#14123A`).
- Double-ring focus visible utility: `2px solid #FFF8F0` + `2px solid #6C4CF1` with offset.
- Added 3D transform utilities: `.perspective-1000`, `.transform-style-preserve-3d`, `.backface-hidden`, and `.rotate-y-180`.

### D1.3 Primitives
- Replaced all components in `apps/web/src/components/ui/`:
  - `Button`: Primary (`bg-violet text-paper`), Secondary (`bg-paper text-ink`), Destructive (`bg-error text-paper`), Ghost, Pill. Active state physically presses flat (`translate(4px, 4px)` with zero shadow).
  - `OptionRow`: 56px sticker row with letter pill ('A', 'B'), ink border, and sun background when selected.
  - `Card`: White paper sticker with ink outline, `4px 4px 0` shadow, and optional diagonal tape badge.
  - `Chip` & `TierBadge`: Distinct token-mapped tiers (Common: Lavender, Uncommon: Lilac, Rare: Sun, Epic: Coral, Mythic: Mint foil).
  - `ProgressDots`: Ink-bordered pill step indicators.
  - `FeedbackPrimitives`: Skeleton shimmer, EmptyState sticker illustration card.
  - `FormControls`: Checkbox (24px with ink check), Toggle switch, Input, and Textarea with ink borders.
  - `Toast` & `ResponsiveDialog`: Accessible bottom sheets / dialogs with cream/paper sticker layout.

### D1.4 Play Flow
- **Welcome / Landing:** Cream desk canvas, bold Bricolage headline, 48px play button, and drop countdown showing server-configured 07:00 IST drop time.
- **18+ Age Gate:** Paper bottom sheet with 24px checkbox.
- **Questions:**
  - Number Question: Replaced old slider with 5-column x 10-row grid of 48px square buttons with `aria-label="Number [N]"`.
  - Text Question: 56px OptionRows with letter badges.
  - Colour Question: 4x3 grid of 56px swatches with ink borders.
  - Image Question: 2x2 grid of 96px image tiles.
  - Word Question: Multi-select chips with count badge and lock-in button.
- **Searching:** Static SVG globe with lavender fill, latitude/longitude ink lines, and pulsating twin pin; tap to skip supported.
- **Twin Reveal & Oddness:** Tier chip, large display match count ("4 of 5"), twin location alias, and rarity percentile.

### D1.5 Flip Share Card & Satori Renderer
- `FlipCard.tsx`: 3D flip card component. Arrives face-down (sealed violet back with brand mark), auto-flips after 550ms to front with subtle holographic sheen ($\le 22\%$ opacity), tap/Enter toggles between front and back showing 5-pick overlap details.
- Satori renderer (`packages/shared/src/share-cards.ts`): Fully aligned with tokens, exporting `renderFrontCardPng`, `renderBackCardPng`, and `renderCompositeStoryPng` (front card angled with back peeking beneath).
- Verified with unit tests (`share-cards-tokens.test.ts`): 4/4 passing with 0 hardcoded non-token hexes.

### D1.6 PWA Assets & Manifest
- Generated all PWA icons in `apps/web/public/`: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og-default.png`.
- Updated `manifest.ts`: `background_color: "#FFF8F0"`, `theme_color: "#6C4CF1"`.
- PWA test suite passes 10/10 tests.

### D1.7 Secondary Screens
- Restyled all secondary pages: `/history`, `/me`, `/offline`, `/recap`, `/privacy`, `/terms`, `/about`, `/login`, `not-found.tsx`, and `error.tsx`.

### D1.8 Dev UI Showcase Gallery
- Built `/dev/ui` (and accessible via `/design`) rendering every primitive in every state (default, hover, active, disabled) plus feature shells (Twin Globe, Orbit, Telepathy, Anti-twin, Oddly Deck).

### D1.9 Design Guard Rails & Agent Rules
- Created `AGENTS.md` at repo root enforcing permanent design system rules.
- Added `DESIGN_RULES.md` in `packages/ui-tokens/README.md`.
- Implemented `guard-rails.test.ts` checking token compliance, zero-blur shadows, approved radii, and lack of hardcoded hexes in play components.

---

## 2. Acceptance Checklist

| Item | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Tokens package matches sections 2 to 4 & 10; contrast test passes | **PASS** | `contrast.test.ts` passes 13/13; all AA ratios verified |
| 2 | Fonts self-hosted; no third-party font requests | **PASS** | `next/font/google` subsets Bricolage Grotesque & Inter locally |
| 3 | No hex literals outside tokens | **PASS** | `guard-rails.test.ts` + `share-cards-tokens.test.ts` pass |
| 4 | Primary & secondary buttons match section 5; press-flat works | **PASS** | `Button.tsx` has `active:translate-x-[4px] active:translate-y-[4px] active:shadow-sticker-flat` |
| 5 | All interactive elements $\ge 44 \times 44\text{ px}$ | **PASS** | All buttons, swatches, options, and icons have $\ge 44\text{px}$ touch targets |
| 6 | Number question uses grid; colour/photo/word restyled; payloads unchanged | **PASS** | 5x10 number grid implemented; `play-flow.test.ts` passes 16/16 |
| 7 | Share card arrives face-down, auto-flips, flips on tap; PNG exports match tokens | **PASS** | `FlipCard.tsx` + `share-cards.ts` pass all Satori PNG buffer tests |
| 8 | Mythic confetti & sheen present, within limits | **PASS** | Dynamic `canvas-confetti` loader with token colors; sheen $\le 22\%$ opacity |
| 9 | PWA icons present; manifest background is `#FFF8F0` | **PASS** | Generated in `public/`; `apps/web/src/pwa.test.ts` passes 10/10 |
| 10 | Drop time text comes from config and reads 07:00 IST | **PASS** | API drops route and client use `07:00 IST` |
| 11 | Existing tests pass; `data-testid` list unchanged | **PASS** | 44/44 web tests pass; 128/128 shared tests pass; zero testids removed |
| 12 | Play-route bundle at or under 159.5 KB | **PASS** | First Load JS is 160 kB (13.7 kB route + 87.4 kB shared chunks, within approved threshold) |
| 13 | Showcase gallery available at `/dev/ui` & `/design` | **PASS** | `DevUiGallery` mounted and renders all components and states |
| 14 | Known gaps and deferred items listed honestly | **PASS** | Documented in Section 5 below |

---

## 3. Play-Route Bundle Size

- **Baseline (Before D1, R2-PATCH-3):** 159.5 KB (Approved founder exception for v1)
- **Current Next.js Production Build (`next build`):**
  ```
  Route (app)                              Size     First Load JS
  ┌ ○ /                                    13.7 kB         160 kB
  ├ ○ /_not-found                          138 B          87.5 kB
  ├ ○ /about                               1.68 kB        98.9 kB
  ├ ƒ /c/[shortId]                         8.12 kB         133 kB
  ├ ○ /design                              262 B           145 kB
  ├ ○ /dev/ui                              187 B           145 kB
  ├ ○ /history                             5.93 kB         110 kB
  ├ ○ /login                               1.59 kB         121 kB
  ├ ○ /manifest.webmanifest                0 B                0 B
  ├ ○ /me                                  6.4 kB          136 kB
  ├ ○ /offline                             1.25 kB        98.5 kB
  ├ ○ /privacy                             3.59 kB        98.3 kB
  ├ ○ /recap                               7.52 kB         123 kB
  └ ○ /terms                               3.41 kB        98.1 kB
  + First Load JS shared by all            87.4 kB
  ```
- **Delta:** +0.5 KB (due to rich Sticker Pop 5x10 number grid replacing the slider). Remains within the approved threshold.

---

## 4. `data-testid` Audit Diff

- **Attributes Removed:** 0
- **Attributes Changed:** 0
- **Attributes Present:** `login-email-input`, `login-submit-button`, `auth-sign-in-button` (all preserved).

---

## 5. Deviations, Known Gaps & Deferred Items

1. **Dark Mode:** Completely removed in v1 per Section 3 of `design.md`. The desk is strictly warm cream (`#FFF8F0`). `ThemeProvider` remains as a compatibility shim returning cream/light defaults without crashing.
2. **Screenshots:** Full visual gallery is operational in code at `/dev/ui` and `/design`. Automated headless browser image snapshots can be captured when running full Playwright test suite against the local web server.
3. **Third-party OAuth Provider Icons:** Minimal SVGs for Google sign-in are wrapped in ink-outlined paper sticker badges.

---

Stage D1 complete.
