# Oddly: design.md (design system and UI redesign prompt)

Direction: **Sticker pop**, with a subtle holographic sheen on the share card front.
Status: this file is the single source of truth for how Oddly looks and moves. It is also the prompt for Stage D1 (full UI redesign).

> Rule for every future stage: before touching any UI, read this file. After touching UI, confirm in your stage report that you followed it. If a request conflicts with this file, say so and stop; do not silently drift.

---

## 0. How to use this file

1. **Part A (sections 1 to 12)** is the permanent design pattern. Never delete it. Update it only when the owner approves a change, and add a dated line to the change log (section 22).
2. **Part B (sections 13 to 21)** is the Stage D1 redesign prompt: what to change now, in what order, with acceptance checks.
3. Do not invent new colours, radii, shadows, fonts or motion. If something is missing, propose an addition in the stage report; do not add it silently.

---

# PART A: THE DESIGN PATTERN

## 1. Personality in one paragraph

Oddly feels like a stack of physical stickers on a cream desk. Everything tappable has an ink outline and a hard offset shadow. It is playful and confident, never childish and never corporate. Tapping physically presses a sticker flat. The share card is the hero: it arrives face-down, flips, and is the thing people screenshot and post. Rarity is celebrated; being "odd" is the brand.

Do: flat colour, thick ink outlines, hard shadows, big friendly display type, short copy.
Do not: soft blurry shadows, gradients on UI chrome (the only gradient allowed is the Mythic chip and the share-card sheen), glassmorphism, neon glow, thin grey hairlines, drop-shadow on text.

## 2. Colour tokens

All colours live in `@oddly/ui-tokens`. Components and share-card renderers must import from it. **No hex literals anywhere else** (lint rule, see 19).

### 2.1 Core palette

| Token | Hex | Role |
|---|---|---|
| `ink` | `#14123A` | All text on light, all outlines, all hard shadows |
| `cream` | `#FFF8F0` | Page background, `manifest.json` `background_color` |
| `paper` | `#FFFFFF` | Cards, option rows, sheets |
| `violet` | `#6C4CF1` | Primary action, brand, focus ring |
| `lavender` | `#EEEAFE` | Soft fills, Common tier chip, progress track |
| `coral` | `#FF6B5E` | Streak chip, warnings that are not errors, "different" accents |
| `mint` | `#3DDBB0` | Success, "match", answered dot |
| `sun` | `#FFD23F` | Selected state, Rare tier chip, highlights |
| `muted` | `#5B5780` | Secondary text only (never on coloured fills) |
| `lilac` | `#CDBFFF` | Uncommon tier chip |
| `error` | `#D92D4B` | Errors only, always paired with an icon and text |

### 2.2 Verified contrast (WCAG)

| Pair | Ratio | Use |
|---|---|---|
| ink on cream | 16.93 | body text |
| ink on paper | 17.84 | body text |
| paper (white) on violet | 5.33 | primary button label (passes AA for normal text) |
| ink on sun | 12.35 | selected option, Rare chip |
| ink on coral | 6.38 | streak chip |
| ink on mint | 10.16 | success chip |
| ink on lavender | 15.15 | Common chip |
| ink on lilac | 10.61 | Uncommon chip |
| muted on cream | 6.39 | secondary text |
| muted on paper | 6.73 | secondary text |
| violet on cream | 5.06 | links, focus ring, icons (not small body text on dark) |

**Hard rules from the audit:**
- **Never** put text or icons in mint or coral onto cream. Both failed contrast before. Mint and coral are *fills* with ink on top, never text colour.
- Never use `muted` on a coloured fill. Use `ink`.
- Every new colour pair must be run through the contrast script and added to this table before use.

### 2.3 Tier colours (oddness)

| Tier | Percentile | Chip fill | Chip text |
|---|---|---|---|
| Common | 0 to 50 | `lavender` | `ink` |
| Uncommon | 50 to 80 | `lilac` | `ink` |
| Rare | 80 to 95 | `sun` | `ink` |
| Mythic | 95 to 100 | rainbow strip `coral → sun → mint → violet` (45° linear) | `ink` |

Tier is always shown as **text plus colour**, never colour alone.

### 2.4 Dark mode

Not in v1. Do not build it. The system is cream-only. Respect `prefers-color-scheme` by ignoring it for now. (Revisit after the first 10k users; a dark variant would be the "Holo night" palette from the design review.)

## 3. Typography

Fonts (self-host with `next/font`, no runtime Google requests; subset to Latin + Devanagari fallback to system):

| Role | Font | Weights | Used for |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700, 800 | Questions, headings, buttons, chips, numbers, share-card text |
| Body | **Inter** | 400, 500, 600 | Paragraphs, helper text, legal, admin tables |

Type scale (mobile-first; use `clamp` where noted). Sizes in px, line-height in parentheses:

| Token | Size | Font | Use |
|---|---|---|---|
| `display-xl` | `clamp(40, 12vw, 56)` (1.0) | Display 800 | Share-card hero number ("4 of 5") |
| `display-l` | `clamp(26, 7vw, 32)` (1.1) | Display 800 | Question text |
| `display-m` | 20 (1.2) | Display 700 | Screen titles |
| `button` | 16 (1) | Display 700 | All buttons and option rows |
| `chip` | 12 (1) | Display 700 | Chips, badges |
| `body` | 16 (1.5) | Inter 400 | Paragraphs |
| `body-s` | 14 (1.5) | Inter 400/500 | Helper text |
| `caption` | 12 (1.4) | Inter 500 | Footnotes, never below 12 |

Rules: sentence case everywhere, no ALL CAPS except the wordmark logic. Numbers use `font-variant-numeric: tabular-nums` in counters and streaks. Minimum body size 16 on mobile inputs (prevents iOS zoom).

## 4. Shape, outline, shadow, spacing

| Token | Value |
|---|---|
| `outline` | `2.5px solid ink` (tappable things) |
| `outline-thin` | `1.5px solid ink` (non-tappable cards, dividers inside cards) |
| `radius-s` | 10px (chips, small inputs) |
| `radius-m` | 14px (buttons, option rows, inputs) |
| `radius-l` | 20px (cards, sheets) |
| `radius-pill` | 999px (chips, progress dots) |
| `shadow-sticker` | `4px 4px 0 ink` |
| `shadow-sticker-lift` | `6px 6px 0 ink` |
| `shadow-sticker-flat` | `0 0 0 ink` (pressed) |
| `shadow-card` | `4px 4px 0 ink` (same as sticker; no soft shadows exist) |

**Offset shadow only goes on tappable things and on the share card.** Static layout containers use `outline-thin` with no shadow. This keeps screens from getting noisy.

Spacing scale (px): 4, 8, 12, 16, 24, 32, 48. Screen gutter 16 (mobile), 24 (tablet+). Max content width 480 for play flow, 960 for admin and marketing.

**Touch targets: minimum 44 x 44 px for every interactive element** (audit fix). Option rows 56 min height, buttons 48 min height. If an icon is visually smaller, add padding or `::after` hit-slop.

## 5. Buttons

All buttons: Display 700, 16px, `radius-m`, `outline`, min-height 48, full-width on mobile in the play flow.

| Variant | Fill | Label | Outline | Shadow | Use |
|---|---|---|---|---|---|
| **Primary** | `violet` | `paper` | `ink` | `shadow-sticker` | One per screen: Lock in, Reveal, Keep this twin |
| **Secondary** | `paper` | `ink` | `ink` | `shadow-sticker` | Back, Skip, Share another way |
| **Tertiary (text)** | none | `violet` | none, underline on focus | none | Inline links, "Why this?" |
| **Danger** | `paper` | `error` plus icon | `error` | `4px 4px 0 error` | Delete account, Remove twin |
| **Success chip-button** | `mint` | `ink` | `ink` | `shadow-sticker` | Only for confirmed states, e.g. "Kept" |

States (mouse and touch):

| State | Behaviour |
|---|---|
| Rest | As above |
| Hover (only inside `@media (hover:hover) and (pointer:fine)`) | `transform: translate(-2px,-2px)`; shadow becomes `shadow-sticker-lift` |
| Pressed / `:active` (touch and mouse) | `transform: translate(4px,4px)`; shadow becomes `shadow-sticker-flat`. This is the signature feel. Must not depend on hover. |
| Focus-visible | Keep the outline, add `outline: 3px solid violet; outline-offset: 3px` (a second ring outside the ink outline). Never remove focus styles. |
| Loading | Label replaced by 3 bouncing dots (CSS only); width locked; `aria-busy="true"`; keep enabled but ignore repeat taps |
| Disabled | **Avoid disabling.** If unavoidable: fill `lavender`, label `muted`, no shadow, outline `muted`, `aria-disabled` and a visible reason line |
| Success flash | After a successful action, shadow flashes `mint` for 300 ms (optional) |

Transition: `transform 120ms ease-out, box-shadow 120ms ease-out`. Under `prefers-reduced-motion: reduce` remove the translate and show only the shadow change.

## 6. Answer option rows (the core play control)

An option is a full-width button row: `paper` fill, `outline`, `radius-m`, `shadow-sticker`, min-height 56, padding 12 x 16, Display 700 16.

| State | Look |
|---|---|
| Rest | paper |
| Hover (fine pointers only) | lift as buttons |
| Pressed | flat as buttons |
| **Selected** | fill `sun`, check icon on the right (24px, ink), `aria-pressed="true"`. Selection never relies on colour alone: the check icon is required. |
| After lock | other rows fade to 60% opacity; selected stays |

**Question types** (keep the existing API shapes; only the visuals change):
- Binary and 2 to 4 option questions: stacked rows (Telepathy questions use these).
- Number 1 to 50: grid of 5 columns x 10 rows of 48px square stickers; selected = sun. (Replaces the slider whose thumb failed hit-slop.) Provide a number-pad style keyboard fallback for screen readers: each cell is a button with `aria-label="Number 7"`.
- Colour (12 swatches): 4 x 3 grid of 56px swatches, each with ink outline; selected swatch gets a ink check badge in the corner and `shadow-sticker-lift`. Swatch names exposed as `aria-label` (colour must not be the only identifier).
- Photo pick (4 images): 2 x 2 grid, 3:2 images, ink outline, selected = sun frame (6px) plus check badge.
- One-word pick (6 to 8 words): wrap-flow chips at button size (48 min height), same selected style.

Progress dots above the question: 5 dots, 10px; answered = `mint` with ink outline, current = 28px wide pill in `violet`, upcoming = `lavender`. Add `aria-label="Question 3 of 5"`.

## 7. Chips, badges, inputs, sheets, toasts

- **Chip**: Display 700 12, padding 4 x 10, `radius-pill`, `outline-thin`, ink text on its fill. Streak chip = coral with a flame icon.
- **Tier badge**: see 2.3.
- **Input**: paper fill, `outline`, `radius-m`, min-height 48, Inter 16; focus = violet focus ring (same double ring as buttons); error = `error` outline plus an icon plus text below (never colour only). Labels always visible above (no placeholder-only labels).
- **Bottom sheet**: paper, `radius-l` top corners only, `outline`, grab handle 40 x 5 ink, slides up 240ms ease-out with the first focusable element focused; trap focus; Esc and backdrop tap close. Backdrop `ink` at 40% (the only translucent colour allowed).
- **Toast**: paper, `outline`, `shadow-sticker`, top of screen below the safe area, 3s auto-dismiss, `role="status"`. Error toasts use `role="alert"` and stay until dismissed.
- **Empty states**: an illustration made of three overlapping circles (the logo motif), one line of invitation copy, one primary button.
- **Skeletons**: lavender blocks with `outline-thin`, a gentle opacity pulse (not shimmer gradients).

## 8. Iconography

Outline icons only (use one set, 24px grid, 2px stroke, ink). Icons are never the sole label of a control: add `aria-label`. Decorative icons get `aria-hidden`.

## 9. Brand mark and PWA assets (audit fix: icons were missing)

- Logo motif: three overlapping circles (violet, coral, with a mint lens where they overlap) plus the lowercase wordmark "oddly" in Display 800.
- Create and ship: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (motif centred inside the 80% safe zone on a violet background), `apple-touch-icon.png` (180), `favicon.svg`, `favicon-32.png`, `og-default.png` (1200 x 630).
- `manifest.json`: `background_color: #FFF8F0`, `theme_color: #6C4CF1`, `display: standalone`, icons list incl. maskable, `start_url` carries no PII.
- All generated from the tokens (script in `packages/ui-tokens/scripts/make-icons`), so colours never diverge.

## 10. Motion

Principles: motion explains cause and effect, is quick, and is never required to understand a screen. Animate **only `transform` and `opacity`** (plus `box-shadow` on the 120ms sticker press, which is cheap at this size). No animated `filter`, `blur`, `clip-path` or layout properties.

| Token | Value |
|---|---|
| `dur-press` | 120 ms |
| `dur-ui` | 200 ms |
| `dur-sheet` | 240 ms |
| `dur-flip` | 750 ms |
| `ease-out` | `cubic-bezier(.2,.8,.2,1)` |
| `ease-snap` | `cubic-bezier(.3,1.4,.5,1)` (use sparingly, small overshoot) |

Standard moments:
- Screen change: new screen slides 16px and fades in, 200ms.
- Answer lock: row presses flat, check pops in with `ease-snap` 160ms.
- Progress dot fill: scale 0.6 to 1 and colour swap, 200ms.
- Streak increment: number rolls up (translateY), chip does one small bounce.
- Mythic reveal: add 600ms of confetti (max 24 CSS-animated particles, transform only) after the flip lands. Rare gets a single burst of 8.

**Reduced motion** (`prefers-reduced-motion: reduce`): no translate, no flip (cross-fade 200ms instead), no confetti, no bounces. Everything still works.

## 11. The flip share card (hero component)

### 11.1 Behaviour

1. **Arrival**: the card appears **face-down** showing the sealed back (violet fill, wordmark, caption "Your twin card").
2. After ~550 ms it **flips to the front** (`rotateY(180deg)` to `0`, 750 ms, `ease-out`). Haptic tick on mobile where supported (`navigator.vibrate(10)`).
3. The front shows the reveal: tier chip, big number ("4 of 5"), one-line location or descriptor, rarity line ("Only 0.4% of players matched you today"), "Tap to flip" hint.
4. **Tap or Enter/Space flips to the back**: the overlap details (what matched, what differed, mini overlap graphic, optional Telepathy/Orbit prompt). Tap again flips back.
5. On the public share link page the card runs steps 1 and 2 automatically on load, so viewers get the same reveal. It is not interactive beyond tap-to-flip.

### 11.2 Implementation notes (CSS only, no JS animation library)

```css
.card-scene { perspective: 900px; }
.card { position: relative; transform-style: preserve-3d;
        transition: transform var(--dur-flip) var(--ease-out); }
.card[data-side="back"] { transform: rotateY(180deg); }
.face { position: absolute; inset: 0; backface-visibility: hidden;
        -webkit-backface-visibility: hidden; }
.face--back { transform: rotateY(180deg); }
```

- Card is a single `<button>` wrapper with `aria-pressed` and `aria-label="Twin card. Press to see details"`; the hidden face gets `aria-hidden="true"` and `inert`.
- Aspect ratio 210:290 (about 0.72), width `min(86vw, 320px)`.
- Both faces: `paper` (front) / `violet` sealed (initial back state) then details-back is `paper`; `outline`, `radius-l`, `shadow-card`.
- **Holographic sheen on the front only**: a pseudo-element with a 115° linear gradient (coral, sun, mint, lilac at about 18 to 22% opacity). On pointer devices the gradient position follows the pointer via a single CSS variable, transform-only (`translateX` of the pseudo-element). On touch, it drifts slowly via a one-time 1.2s sweep after the flip lands. The sheen never covers text contrast (keep opacity at or below 22%).
- Do not use `will-change` permanently; set it only during the flip.
- The Mythic front adds the rainbow edge strip and the confetti.

### 11.3 Export (what people actually post)

The shared image must work without the flip:
- Generate **two PNGs** with the existing Satori + Resvg pipeline: `front` and `back`, plus an Instagram-story-size (1080 x 1920) composite with the front large and the back peeking beneath. Offer "Share front" (default) and "Share both" (a 2-slide carousel on platforms that accept it).
- Satori cannot import CSS tokens, so the renderer imports the **same** `@oddly/ui-tokens` TypeScript constants (audit fix: share-card hex divergence). A unit test asserts that every colour used in the card renderer exists in the token list.
- The link page `og:image` is the front PNG. A short looping WebM or animated preview of the flip is a post-v1 nice-to-have; do not build it now.

## 12. Surfaces for the new features (style only; behaviour is in the product spec)

- **Twin Globe**: page background `cream`; globe fill `lavender`; land dots `ink` at 2px; your pin `violet` with ink outline; kept twins `coral` pins; Orbit lines are 2.5px `violet` strokes with a slow dash animation (transform-only via an animated `stroke-dashoffset` is not allowed; use a pulsing opacity on a duplicated line instead). Pins are 44px hit targets with a smaller visible dot. Pause all globe motion when off-screen or reduced-motion is on. Replace the old repaint-heavy radar (audit finding) with a static SVG plus the single pulsing pin.
- **Orbit**: each kept twin is a sticker row: avatar circle (procedural from their picks), handle or "Twin #", day-count chip, next-unlock chip (`lavender`). Unlock milestones (day 1, 3, 7, 14, 30) show as 5 dots on a track.
- **Telepathy**: question shown in Display, 2 to 4 option rows; after guessing, show two stickers side by side: "You guessed" and "They picked", match = `mint` check, miss = `coral` with a different-shape icon (not colour alone). Show the luck baseline as a small caption ("2 options: chance is 50%").
- **Anti-twin**: same card pattern, `coral` accent chip "Opposite", never shown as negative or hostile.
- **Oddly Deck (v1.5)**: collectible cards use the share-card anatomy at small size (140px wide); art is procedural from the user's picks, limited to the token palette. Rarity border: Common ink, Uncommon lilac inner frame, Rare sun inner frame, Mythic rainbow inner frame.

---

# PART B: STAGE D1: UI REDESIGN PROMPT

## 13. Instructions to the agent

You are redesigning the Oddly UI to match Part A. **Change presentation only.** Do not change game logic, scoring, API response shapes, database schema, routes, copy that comes from the database, or `data-testid` attributes. Report at the end and STOP. Do not start any other stage.

Read first, in this order: `DESIGN_AUDIT.md` (from stage D0), `packages/ui-tokens`, this `design.md`, then the components you will touch.

## 14. Constraints (do not break)

1. All existing `data-testid` attributes stay on the same logical elements. Existing tests must still pass.
2. API shapes unchanged. Frontend still renders whatever the API returns.
3. Copy from the database stays database-driven. In particular, **remove the hardcoded "Daily drop at 09:00 UTC"** string; the Drop time shown to users must come from the server config and must show **07:00 IST** (it is also shown in the user's local time when it differs). Report if you cannot find the source.
4. Play-route JS stays within the approved **159.5 KB** budget. Do not add UI libraries. CSS-only for the sticker and flip effects. framer-motion stays as it is (LazyMotion), and is not extended to new screens unless needed for something CSS cannot do.
5. 18+ gate, consent and legal copy are not reworded.
6. No dark mode, no new fonts, no new colours beyond the tokens.

## 15. Work breakdown (do it in this order, one commit per step)

**D1.1 Tokens.** Rewrite `@oddly/ui-tokens` to the values in sections 2 to 4 and 10 (colour, type scale, radius, outline, shadow, spacing, motion). Export TypeScript constants and a generated CSS variables file. Make Tailwind consume the tokens (extend `theme`, remove duplicate or conflicting definitions; the audit found conflicting token sets: resolve to one). Add the contrast table as a test that computes ratios from the tokens and fails if any listed pair drops below 4.5 (normal text) or 3 (large text and UI components).

**D1.2 Fonts and global styles.** Add Bricolage Grotesque and Inter via `next/font` (self-hosted, `display: swap`, subset). Set base styles, focus-visible double ring, `prefers-reduced-motion` global fallback, `html { background: cream }`. Remove hardcoded hex values from CSS and TSX.

**D1.3 Primitives.** Build or restyle: `Button` (primary, secondary, tertiary, danger, success), `OptionRow`, `Chip`, `TierBadge`, `ProgressDots`, `Input`, `BottomSheet`, `Toast`, `EmptyState`, `Skeleton`. Each with the states in section 5 to 7. Hover only under `@media (hover:hover) and (pointer:fine)`. Enforce 44 x 44 minimum hit area (fix the audit's sub-44px targets).

**D1.4 Play flow.** Restyle welcome, 18+ gate, Drop intro, the five question screens, lock-in, waiting, and results entry using the primitives. Replace the number slider with the 5 x 10 grid (section 6). Colour, photo and word questions per section 6. Keep the answer submission payloads identical.

**D1.5 Flip share card.** Implement section 11 as a `FlipCard` component used on the results screen and the public link page. Include the sealed back, auto-flip on arrival, tap to flip, the sheen, reduced-motion cross-fade, haptic tick, a11y wiring. Update the Satori renderer to use tokens and produce front and back PNGs plus the story composite. Add the unit test that every renderer colour is a token.

**D1.6 PWA assets.** Generate the icon set and fix `manifest.json` per section 9 (the audit found missing icons and a wrong manifest background).

**D1.7 Secondary screens.** Streak, history, settings, delete account, legal pages, error and 404 pages, offline page. Same primitives.

**D1.8 New-feature shells (style only).** If Globe, Orbit, Telepathy, Anti-twin or Deck components already exist, restyle per section 12. If they do not exist yet, create only a Storybook-free `/dev/ui` route listing the primitives and card states for review; do **not** build their logic.

**D1.9 Admin.** Out of scope for D1. Admin uses Inter plus the same tokens but is restyled in its own stage.

## 16. Audit findings that must be fixed (map to the D0 audit)

| # | Problem | Fix location |
|---|---|---|
| 1 | Contrast failures (mint and coral text on cream) | D1.1, 2.2 rules |
| 2 | Missing PWA icons | D1.6 |
| 3 | Touch targets under 44px | D1.3 |
| 4 | Hardcoded hex values in components | D1.1, D1.2, lint rule |
| 5 | Conflicting token definitions | D1.1 |
| 6 | Slider hit-slop and small thumb | D1.4, number grid |
| 7 | Inconsistent border radii | section 4, only 4 radii allowed |
| 8 | Share-card hex colours diverge from the app | D1.5 |
| 9 | Repaint-heavy radar animation | section 12, Globe |
| 10 | `manifest.json` background mismatch | D1.6 |
| 11 | Hover-dependent effects on touch | D1.3, media query rule |
| 12 | Colour-only state indicators | sections 2.3, 6, 12 |
| 13 | Missing focus-visible styles | D1.2, D1.3 |
| 14 | Drop-time copy (09:00 UTC vs 07:00 IST) | constraint 3 |
| 15 | No reduced-motion handling | section 10, D1.2 |

If the D0 audit's numbering differs from this table, match by description and note the mapping in the report.

## 17. Accessibility requirements

- WCAG 2.2 AA for all play-flow screens.
- Everything operable by keyboard; visible focus; logical focus order; sheets trap focus and restore it on close.
- Flip card: operable via Enter/Space, announces the new side, hidden face is `inert`.
- No information by colour alone (icon or text always accompanies).
- Live regions: lock-in confirmation `role="status"`; errors `role="alert"`.
- Text can scale to 200% without clipping; layouts use `min-height`, not fixed heights, for text containers.
- Test with iOS VoiceOver and Android TalkBack where possible, otherwise state that this was not tested.

## 18. Performance requirements

- No layout-affecting animation. Transform and opacity only (box-shadow only for the 120ms sticker press).
- Confetti is CSS-only, at most 24 elements, removed from the DOM 1.5s after it ends.
- Sheen is one pseudo-element, no per-frame JS; pointer-follow updates a CSS variable at most once per animation frame.
- Report the play-route bundle size before and after; it must stay at or under 159.5 KB.
- Lighthouse mobile on the welcome and results screens: report Performance, Accessibility and Best Practices scores (target 90+ for Accessibility and Best Practices; report honestly if Performance is lower).

## 19. Guard rails to keep the pattern from drifting

1. ESLint or a custom check: **fail the build on any hex colour literal** outside `packages/ui-tokens`, and on any `border-radius` value not in the token set.
2. Stylelint (or an equivalent): forbid `box-shadow` values with blur greater than 0 outside an allow-list (focus ring, sheet backdrop).
3. A `/dev/ui` page (dev only) rendering every primitive in every state, used for visual review and for Playwright screenshots (one baseline image per state).
4. A short `DESIGN_RULES.md` snippet at the top of the UI package README that points here.
5. Add to the repository's agent instructions file (for example `CLAUDE.md` or `AGENTS.md`): "Before any UI change read `design.md`; use only `@oddly/ui-tokens`; follow the sticker rules; do not add colours, fonts, radii or shadows."

## 20. Acceptance checklist (report each as PASS / FAIL / NOT TESTED with evidence)

- [ ] Tokens package matches sections 2 to 4 and 10; one source of truth; contrast test passes.
- [ ] Fonts self-hosted; no third-party font requests in the network log.
- [ ] No hex literals outside tokens (lint passes).
- [ ] Primary and secondary buttons match section 5 in all states; hover only on fine pointers; press-flat works on touch.
- [ ] All interactive elements at least 44 x 44 px (report any exception).
- [ ] Number question uses the grid; colour, photo, word questions restyled; payloads unchanged.
- [ ] Share card: arrives face-down, auto-flips, taps to the back and back again; reduced-motion shows a cross-fade; front and back PNG exports render and match tokens; link page auto-flips.
- [ ] Mythic confetti and sheen present, within limits.
- [ ] PWA icons present (192, 512, maskable, apple-touch); manifest `background_color` is `#FFF8F0`; installability check passes.
- [ ] Drop time text comes from config and reads 07:00 IST.
- [ ] Existing tests pass; `data-testid` list unchanged (attach a diff of the list).
- [ ] Play-route bundle at or under 159.5 KB (before and after numbers).
- [ ] Screenshots: welcome, a question of each type, locked state, results flip (3 frames: sealed, mid-flip, front), card back, link page, 375 px and 768 px widths.
- [ ] Known gaps and anything deferred listed honestly.

## 21. Final report format, then STOP

Write `design-d1/REPORT.md` containing: what changed per step D1.1 to D1.8, the acceptance checklist with evidence, bundle and Lighthouse numbers, the `data-testid` diff, any deviations from this file with reasons, and open questions. End with the line **"Stage D1 complete."** and stop. Do not begin any other stage.

---

## 22. Change log

- 2026-11-14: v1.0. Sticker pop direction chosen by the owner. Palette, type, buttons, flip card, and D1 redesign stage defined.
