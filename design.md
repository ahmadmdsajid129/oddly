# Oddly: design.md (design system and UI redesign prompt)

Direction: **Sticker pop** (v1.4), with a subtle holographic sheen on the share card front.
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

<!-- visual:start palette-svg -->
![Oddly Colour Palette](docs/assets/palette.svg)
<!-- visual:end palette-svg -->


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
| 🟪 Common | 0 to 50 | `lavender` | `ink` |
| 🟪 Uncommon | 50 to 80 | `lilac` | `ink` |
| 🟨 Rare | 80 to 95 | `sun` | `ink` |
| 🌈 Mythic | 95 to 100 | rainbow strip `coral → sun → mint → violet` (45° linear) | `ink` |

Tier is always shown as **text plus colour**, never colour alone.

### 2.4 Dark mode

Not in v1. Do not build it. The system is cream-only. Respect `prefers-color-scheme` by ignoring it for now. (Revisit after the first 10k users; a dark variant would be the "Holo night" palette from the design review.)

## 3. Typography

Fonts (self-host with `next/font`, no runtime Google requests; subset to Latin + Devanagari fallback to system):

| Role | Font | Weights | Used for |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700, 800 | Questions, headings, buttons, chips, numbers, share-card text |
| Body | **Inter** | 400, 500, 600 | Paragraphs, helper text, legal, admin tables |

<!-- visual:start typography-specimen -->
| Scale | Token | Specimen (Size / Leading) | Family | Usage Role |
|---|---|---|---|---|
| 🔠 56px | `display-xl` | **Aa** `clamp(40, 12vw, 56)` (1.0) | Bricolage Grotesque 800 | Share-card hero number ("4 of 5") |
| 🔠 32px | `display-l` | **Aa** `clamp(26, 7vw, 32)` (1.1) | Bricolage Grotesque 800 | Question text |
| 🔠 20px | `display-m` | **Aa** 20px (1.2) | Bricolage Grotesque 700 | Screen titles |
| 🔠 16px | `button` | **Aa** 16px (1.0) | Bricolage Grotesque 700 | All buttons and option rows |
| 🔡 12px | `chip` | **Aa** 12px (1.0) | Bricolage Grotesque 700 | Chips, badges |
| 📝 16px | `body` | Aa 16px (1.5) | Inter 400 | Paragraphs |
| 📝 14px | `body-s` | Aa 14px (1.5) | Inter 400/500 | Helper text |
| 📝 12px | `caption` | Aa 12px (1.4) | Inter 500 | Footnotes, never below 12 |
<!-- visual:end typography-specimen -->

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
| 🟢 Rest | As above |
| 🟡 Hover (only inside `@media (hover:hover) and (pointer:fine)`) | `transform: translate(-2px,-2px)`; shadow becomes `shadow-sticker-lift` |
| 🟠 Pressed / `:active` (touch and mouse) | `transform: translate(4px,4px)`; shadow becomes `shadow-sticker-flat`. This is the signature feel. Must not depend on hover. |
| 🔵 Focus-visible | Keep the outline, add `outline: 3px solid violet; outline-offset: 3px` (a second ring outside the ink outline). Never remove focus styles. |
| ⏳ Loading | Label replaced by 3 bouncing dots (CSS only); width locked; `aria-busy="true"`; keep enabled but ignore repeat taps |
| ⚪ Disabled | **Avoid disabling.** If unavoidable: fill `lavender`, label `muted`, no shadow, outline `muted`, `aria-disabled` and a visible reason line |
| ✨ Success flash | After a successful action, shadow flashes `mint` for 300 ms (optional) |

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

## 12A. Detailed Design Specifications for Connection Features (F18 to F21)

All components strictly use existing `@oddly/ui-tokens` constants, 4 approved radii (`sm: 8px`, `m: 14px`, `l: 20px`, `pill: 9999px`), hard sticker shadows (`shadow-sticker`: `4px 4px 0 #14123A`), and Bricolage Grotesque / Inter typography. No new colors or blur shadows.

### 12A.1 Keep & Orbit Surfaces

1. **"Keep this twin" Button:**
   - **Placements:** Card back (below pick matches) and Recap Screen (`/recap`).
   - **Styling:** Secondary sticker button (`bg-paper text-ink border-[2.5px] border-ink shadow-sticker rounded-m min-h-[48px] px-6 font-display font-extrabold text-button`). Hover: `shadow-sticker-lift -translate-x-[2px] -translate-y-[2px]`. Active: `shadow-sticker-flat translate-x-[4px] translate-y-[4px]`.
   - **States:**
     - *Default:* `app_content: "orbit.action.keep"` ("Keep this twin") with small violet heart icon (`stroke-[2.5]`).
     - *Pending / Sent:* `bg-lavender text-ink opacity-90` ("Waiting for twin...") with clock icon.
     - *Accepted / Active:* `bg-mint text-ink` ("In Orbit") with check badge.
     - *Disabled (Expired / Already at Cap):* `bg-paper text-muted border-ink/40 opacity-60 cursor-not-allowed`.

2. **Orbit Request Card (Incoming Sheet / Notification):**
   - **Layout:** Paper sticker card (`bg-paper border-[2.5px] border-ink shadow-sticker rounded-l p-5 space-y-4 max-w-sm mx-auto`).
   - **Header:** Chip badge (`bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-3 py-0.5 text-chip font-bold`) reading "Orbit Request".
   - **Body:** Coarse location pill (e.g. "Someone in Western Europe"), age band (e.g. "25 to 34"), and match summary ("Matched 4 of 5 picks with you today").
   - **Actions:** Two buttons side-by-side:
     - Primary: "Accept" (`Button variant="primary" bg-violet text-paper flex-1 min-h-[44px]`).
     - Secondary: "Not now" (`Button variant="secondary" bg-paper text-ink flex-1 min-h-[44px]`).

3. **Orbit List Row (`/me` and Orbit Drawer):**
   - **Structure:** 64px tall sticker row (`bg-paper border-[2.5px] border-ink shadow-sticker rounded-m p-3 flex items-center justify-between gap-3`).
   - **Avatar:** 44px circle with ink border (`bg-lavender border-[2px] border-ink flex items-center justify-center`). Renders a procedural 2-color geometric glyph derived from the pair's shared picks.
   - **Identity:** Anonymous title (`font-display font-bold text-base text-ink`: "Twin #382") and subtitle (`text-caption text-muted`: "Western Germany • 25-34").
   - **Badges:**
     - Co-streak chip (`bg-coral text-ink border-[1.5px] border-ink rounded-pill px-2.5 py-0.5 text-chip font-bold flex items-center gap-1`): flame icon + tabular number ("5d").
     - Next unlock chip (`bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-caption font-bold`): "Next: Day 7".

4. **Orbit Detail Screen (`/orbit/:id`):**
   - **Header:** Sticky cream bar with back arrow button ($\ge 44\text{px}$) and "End Orbit" quiet kebab option.
   - **Milestone Progress Track:** 5-dot horizontal progress bar:
     - Day 1 (Globe Line), Day 3 (Pick Overlap), Day 7 (Telepathy Sync), Day 14 (Orbit Card), Day 30 (Anniversary Badge).
     - Completed dots: `w-6 h-6 rounded-pill bg-mint border-[2px] border-ink text-ink flex items-center justify-center text-xs font-bold` with check icon.
     - Current dot: `w-7 h-7 rounded-pill bg-sun border-[2.5px] border-ink shadow-sticker-sm`.
     - Future dots: `w-5 h-5 rounded-pill bg-paper border-[1.5px] border-ink/40`.
   - **Co-Streak Display:** Central paper sticker card displaying current streak with celebratory flame graphic and honest zero-pressure subtitle: "Picks aligned for 4 consecutive drops".
   - **Expression Sticker Picker (The Wave):**
     - Horizontal sticker tray of 6 curated stickers: Wave (`👋`), Sparkles (`✨`), Heart (`💜`), High-Five (`🙌`), Coffee (`☕`), Thinking (`🤔`).
     - 48px square buttons with `shadow-sticker` that press flat on tap.
     - If already sent today: Tray shows "Sent today • Refreshes at 07:00 IST" with countdown.

5. **End Orbit Modal:**
   - Neutral dialog (`ResponsiveDialog`): Title "End this orbit?", Body "You and Twin #382 will be disconnected. Neither of you will see each other's updates.", Primary destructive button "End Orbit" (`bg-error text-paper min-h-[44px]`), Cancel button (`min-h-[44px]`).

---

### 12A.2 Twin Globe Screen (`/globe`)

1. **Map Canvas:**
   - Background: `bg-cream`.
   - World Vector: Flat dotted SVG map rendered with `bg-lavender` landmass outlines and `ink` coordinate grid dots at 2px. Strictly zero WebGL or canvas dependencies.
   - Arcs: 2.5px SVG quadratic bezier curves connecting macro-regions. Normal arcs: `stroke-mint opacity-70` with stroke-width 2px. Your Orbit arcs: `stroke-violet opacity-100` with 2.5px ink outline stroke.
   - Pins: 44px circular hit targets with centered 8px visible dot (`bg-violet border-[2px] border-ink` for user, `bg-coral border-[2px] border-ink` for active Orbit partner).

2. **Live / Replay Status Pill:**
   - Placed top-center:
     - *Live:* `bg-paper border-[1.5px] border-ink rounded-pill px-3 py-1 flex items-center gap-2 shadow-sm text-chip font-bold text-ink`. Includes pulsing 8px green dot (`bg-mint rounded-pill border border-ink animate-pulse`). Text: "Live matches".
     - *Replay:* `bg-lavender border-[1.5px] border-ink rounded-pill px-3 py-1 flex items-center gap-2 shadow-sm text-chip font-bold text-ink`. Text: "Replay of yesterday's twins".

3. **Empty & Degraded States:**
   - *Low volume (< 50/window):* Smoothly fades in the replay buffer with subtle status transition: "Quiet right now. Replaying yesterday's twins."
   - *Level L2/L3:* Arcs freeze into static dot network with badge: "Globe paused while servers are busy. Your game is active."

---

### 12A.3 Telepathy Surfaces

1. **Guess Screen:**
   - Rendered inside the Orbit detail view once both players have completed today's Drop.
   - Question Prompt: Display font (`text-xl font-extrabold text-ink tracking-tight`).
   - Options: 2 to 4 `OptionRow` stickers (`bg-paper border-[2.5px] border-ink shadow-sticker min-h-[56px] rounded-m`).
   - Action: "Lock in guess" button (`Button variant="primary" w-full min-h-[48px]`).

2. **Result Pair of Stickers:**
   - Once locked, reveals two side-by-side sticker cards:
     - Card A: "Your Guess" (`bg-paper border-[2px] border-ink rounded-m p-3 text-center`).
     - Card B: "Their Pick" (`bg-paper border-[2px] border-ink rounded-m p-3 text-center`).
   - Match Indicator:
     - *Match:* `bg-mint text-ink border-[2px] border-ink rounded-pill px-3 py-1 font-bold text-sm flex items-center justify-center gap-1.5`. Icon: Checkmark (`✓`).
     - *Miss:* `bg-coral text-ink border-[2px] border-ink rounded-pill px-3 py-1 font-bold text-sm flex items-center justify-center gap-1.5`. Icon: Circle with slash (`⊘`). (Different shape and icon; never differentiated by color alone).
   - Baseline Caption: Displayed below stickers in `text-caption font-medium text-muted`: "Strangers agree 32% of the time on this question. You two agreed today!"
   - Sync Score: Appears after 5 rounds as a radial pill badge (`bg-sun text-ink border-[2px] border-ink rounded-pill px-4 py-1.5 font-display font-bold text-base`).

---

### 12A.4 Anti-Twin Surfaces

1. **Anti-Twin Result Card:**
   - Follows the identical 210:290 aspect ratio as the Twin share card.
   - Header: Coral accent badge (`bg-coral text-ink border-[1.5px] border-ink rounded-pill px-3 py-1 text-chip font-bold`): "Your Opposite Today".
   - Hero Number: Large Bricolage Grotesque display: "Differed on 4 of 5" (`display-xl` font size).
   - Location: Coarse region and age band pill (`bg-paper border-[1.5px] border-ink text-ink font-bold text-sm px-3 py-1 rounded-pill`).
   - Breakdown: Displays which of **your own** questions differed (e.g. "Q1, Q2, Q4, Q5"), accompanied by kind copy: "Picks completely in sync on question 3. Different instincts make the world interesting." Strictly zero pick labels of the other user are exposed.
   - Sampling note: `text-caption text-muted text-center`: "Sampled from 2,000 players today."

2. **Anti-Twin Share Card Export (Satori):**
   - Same flip card anatomy.
   - Front: Coral accent header ("Opposite Today"), large display text, coarse location, warm cream desk background.
   - Back: Sealed coral back with brand mark.

---

### 12A.5 Accessibility & Motion Standards

1. **Touch Targets:** Every interactive element (pins, buttons, sticker cells, expression icons, close buttons) is strictly $\ge 44 \times 44\text{ px}$.
2. **Focus Rings:** Double-ring focus visible utility (`2px solid #FFF8F0` inner offset + `2px solid #6C4CF1` outer) applied to all keyboard focus states.
3. **Reduced Motion:** When `prefers-reduced-motion: reduce` is detected:
   - Globe arcs do not animate; rendered as static lines.
   - Glowing Orbit lines use a static solid stroke rather than opacity pulsing.
   - Card flip uses instant cross-fade instead of 3D rotation.
4. **ARIA Live Regions:** Screen reader announcements via `aria-live="polite"` for Orbit request status updates, expression receipts, and Telepathy guess reveals.

---

## 12B. Detailed Design Specifications for Memes, Signals & Insights (F24 to F31)

All components strictly use existing `@oddly/ui-tokens` constants, 4 approved radii (`sm: 8px`, `m: 14px`, `l: 20px`, `pill: 9999px`), hard sticker shadows (`shadow-sticker`: `4px 4px 0 #14123A`), and Bricolage Grotesque / Inter typography. Strictly no new colours or soft blur shadows.

### 12B.1 Meme Question Card (`render_variant = "meme"`)

1. **Card Layout:**
   - Container: `bg-paper border-[2.5px] border-ink shadow-card rounded-l p-4 sm:p-6 space-y-4 select-none`.
   - Subject Tag Pill: Placed above illustration: `bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-3 py-1 text-chip font-bold uppercase tracking-wider inline-flex items-center gap-1`.
   - Template Illustration Container: 1:1 or 16:9 aspect box (`bg-cream border-[2px] border-ink rounded-m overflow-hidden flex items-center justify-center p-3 sm:p-4`).
   - SVG Template: Vector graphic loaded from illustration registry (`D-015`). Includes descriptive `aria-label` matching `alt_text_i18n`.
   - Prompt & Live Caption Options: 2 to 4 options rendered via `OptionRow` component (`bg-paper border-[2.5px] border-ink shadow-sticker rounded-m min-h-[56px] p-4 text-body font-bold text-ink cursor-pointer`).
   - Selected State: `bg-lavender border-ink` with check badge sticker (`bg-violet text-paper rounded-pill p-1`).
   - Tactile Signature: Hover: `shadow-sticker-lift -translate-x-[2px] -translate-y-[2px]`. Active / Press Flat: `shadow-sticker-flat translate-x-[4px] translate-y-[4px]`.

### 12B.2 Meme Corner Card (Optional Post-Drop Surface, M3)

1. **Card Presentation:**
   - Placed below the reveal/recap sheet on non-Drop surface.
   - Container: `bg-cream border-[2.5px] border-ink shadow-card rounded-l p-5 space-y-4`.
   - Header Row: `font-display font-extrabold text-h3 text-ink flex items-center justify-between`: "Meme Corner" with `bg-sun text-ink border-[1.5px] border-ink rounded-pill px-2.5 py-0.5 text-chip font-bold` badge ("Community Pick").
   - Meme Display: Vector SVG template container + live caption rendered in prominent display font (`font-display text-lg font-bold text-ink leading-snug`).
   - Reaction Buttons: Two side-by-side sticker buttons ($\ge 44\text{ px}$ target):
     - **"Funny" Button:** `bg-mint text-ink border-[2px] border-ink shadow-sticker rounded-m min-h-[48px] px-4 font-display font-extrabold flex-1 flex items-center justify-center gap-2 hover:shadow-sticker-lift active:shadow-sticker-flat`.
     - **"Not for me" Button:** `bg-paper text-muted border-[2px] border-ink shadow-sticker rounded-m min-h-[48px] px-4 font-display font-bold flex-1 flex items-center justify-center gap-2 hover:shadow-sticker-lift active:shadow-sticker-flat`.
   - Post-Rating State: Replaces buttons with playful ink micro-stamp: `bg-paper border-[2px] border-ink rounded-pill px-4 py-2 font-display font-extrabold text-ink inline-block mx-auto` ("Rated!").

### 12B.3 Consent Notice and Settings Toggles (M2)

1. **First-Run Consent Notice Banner:**
   - Fixed or sticky bottom banner: `bg-paper border-[2.5px] border-ink shadow-card rounded-m p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`.
   - Text: `font-body text-sm font-medium text-ink`: *"We use anonymous, consented analytics to find confusing questions. No personal data."*
   - Actions: Primary button "Got it" (`Button variant="primary" size="sm"`) and subtle text link "Customize" (`text-violet underline font-bold`).
2. **Settings Screen Toggles (`/me`):**
   - Two separate toggle rows:
     - Toggle A: *"Anonymous question-quality analytics"* (`app_content: "settings.consent.analytics"`).
     - Toggle B: *"Personalised taste on bonus cards"* (`app_content: "settings.consent.personalisation"`).
   - Switch Primitive: Accessible Radix switch (`w-12 h-7 bg-paper border-[2px] border-ink rounded-pill p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet`).
   - Active State: `bg-mint`. Switch Thumb: `w-5 h-5 bg-ink rounded-pill transition-transform`.

### 12B.4 Meme Lab Composer & Status Cards (M3)

1. **Caption Composer Screen (`/memes/new`):**
   - Template Selector: Horizontal sticker carousel with `snap-x` scrolling of approved vector templates.
   - Selected Template Preview: `bg-cream border-[2.5px] border-ink rounded-m p-3 aspect-square max-w-xs mx-auto`.
   - Caption Input Area: `bg-paper border-[2.5px] border-ink rounded-m p-3 text-body font-medium text-ink w-full min-h-[96px] focus:outline-none focus:ring-2 focus:ring-violet`.
   - Live Character Counter: `text-right text-caption text-muted font-bold`: `X / 100`.
   - Originality Checkbox: Custom sticker checkbox (`w-6 h-6 border-[2px] border-ink rounded-s bg-paper checked:bg-violet flex items-center justify-center text-paper font-bold cursor-pointer`) with label: *"I wrote this caption myself"*.
   - Submit Button: `Button variant="primary" size="lg" w-full min-h-[48px]`: *"Submit to Meme Lab"*.
2. **Author Submission Status Cards (`/me/memes`):**
   - **Queued Card:** `bg-sun/20 border-[2px] border-ink shadow-sticker rounded-m p-4 space-y-1` with yellow status pill "In Review".
   - **Approved Card:** `bg-mint/20 border-[2px] border-ink shadow-sticker rounded-m p-4 space-y-1` with green status pill "Approved". Shows live stats: *"N ratings, Wilson score X.XX"*.
   - **Rejected Card:** `bg-paper border-[2px] border-ink/40 shadow-sticker rounded-m p-4 space-y-1 text-muted` with gray status pill "Retired". Kind microcopy: *"Didn't fit this time, but keep creating!"*

### 12B.5 Creator Badge Chip & Achievement Cards (M6)

1. **Badge Chip:**
   - Compact inline pill: `bg-sun text-ink border-[2px] border-ink shadow-sticker rounded-pill px-3 py-1 text-chip font-extrabold flex items-center gap-1.5`.
   - Renders 16px geometric badge SVG icon + badge name (e.g. *"Certified Wit"*).
2. **Achievement Card (Satori Flip Card):**
   - Form factor: 210:290 aspect ratio, 3D flip card with holographic sheen on front.
   - Front Face: Ink border, cream desk background, hero illustration, badge title in `display-l` font, creator alias, and coarse macro-region ($k \ge 20$).
   - Back Face: Card flip reveals milestone statistics: *"78% rated Funny across 640 players. Oddly Meme Lab."*
   - Export: Satori SSR PNG generator at 1080x1920 (Story), 1080x1080 (Square), and 1200x630 (Link).

### 12B.6 Featured Memes Surface (M6)

1. **Showcase Layout (`/featured`):**
   - Header: `font-display font-extrabold text-display-m text-ink`: *"Meme of the Week"*.
   - Featured Sticker Hero: `bg-paper border-[2.5px] border-ink shadow-card rounded-l p-6 space-y-4 max-w-md mx-auto`.
   - Template SVG + large caption text (`font-display text-xl font-bold text-ink`).
   - Creator Credit: `bg-cream border-[1.5px] border-ink rounded-pill px-3 py-1 text-sm font-bold text-ink inline-block`: *"By [Alias], [Macro-Region]"*.

### 12B.7 Subject-Sync Row in Orbit View (M5)

1. **Agreement Metric Row:**
   - Rendered in Orbit detail view under "Instinct Sync":
   - Row: `bg-paper border-[2px] border-ink shadow-sticker rounded-m p-3.5 flex items-center justify-between gap-3`.
   - Tag Label: `font-display font-bold text-body text-ink`: e.g. *"Humour (5 shared drops)"*.
   - Percentage Pill: `bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-2.5 py-0.5 font-extrabold text-sm`: *"80% Sync"*.
   - Progress Track: `w-24 h-2.5 bg-cream border-[1.5px] border-ink rounded-pill overflow-hidden`.
   - Progress Fill: `bg-violet h-full rounded-pill transition-all`.

### 12B.8 Accessibility, Touch Targets & Motion

1. **Touch Targets:** All interactive buttons, reaction stickers, template carousel thumbnails, and consent switches are strictly $\ge 44 \times 44\text{ px}$.
2. **Focus Rings:** Double-ring focus visible utility (`2px solid #FFF8F0` inner offset + `2px solid #6C4CF1` outer) applied to all interactive elements.
3. **Reduced Motion:** When `prefers-reduced-motion: reduce` is active:
   - Reaction button stamps render immediately without pop animation.
   - Template carousel slides without smooth transition.
   - Achievement cards use instant cross-fade instead of 3D card flip.
4. **Color Tokens:** Zero custom hex literals; all fills, outlines, and text use imported `@oddly/ui-tokens`.


---

## 12C. Lanes, Formats, Twin Depth & Say It (Stage L0 UI Specifications)

### 12C.1 Design Token Invariants
- **Visual Metaphor:** Physical paper stickers on a warm cream desk (`#FFF8F0`).
- **Cream-Only:** Zero dark mode (`html { background: #FFF8F0; }`).
- **Tactile Signature:** Ink outline (`2.5px solid #14123A`), hard offset sticker shadow (`4px 4px 0 #14123A`, blur 0).
- **Press Flat:** Active state translates flat (`translate(4px, 4px)`, shadow `0 0 0`).
- **Touch Targets:** Minimum $44 \times 44\text{ px}$ for all interactive elements.
- **Tokens Only:** Strictly zero hex literals outside `packages/ui-tokens`.

---

### 12C.2 Lane Picker (Home View)
1. **Layout & Placement:**
   - Displayed on returning visits below the header date/countdown.
   - Grid on desktop (`grid-cols-2 gap-4 max-w-xl mx-auto`), vertical stack on mobile (`flex flex-col gap-3.5 px-4`).
2. **Lane Card Anatomy (Sticker Pop):**
   - Container: `bg-paper border-[2.5px] border-ink shadow-card rounded-l p-4 flex flex-col gap-2 relative transition-all active:translate-x-1 active:translate-y-1 active:shadow-none`.
   - Accent Edge: Left border or top pill using lane accent token (`bg-violet`, `bg-sun`, `bg-mint`, `bg-coral`).
   - Header Row:
     - Lane Icon (`w-6 h-6` from illustration registry).
     - Lane Title: `font-display text-xl font-extrabold text-ink`.
     - Status Chip:
       - Open: `bg-mint text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-xs font-bold`.
       - Early Lane: `bg-sun text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-xs font-bold`.
       - Resting: `bg-cream text-muted border-[1.5px] border-muted rounded-pill px-2 py-0.5 text-xs font-bold`.
       - Played: `bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-xs font-bold flex items-center gap-1`: *"Played ✓"*.
   - Description: `font-sans text-sm text-muted line-clamp-2`.
   - Time Remaining Pill: `text-xs font-mono text-muted`: *"Closes in 14h 22m"*.
3. **"Coming Soon" Tile (Planned Lanes):**
   - Container: `bg-cream border-[2px] border-dashed border-ink/40 rounded-l p-4 flex flex-col gap-2 opacity-80`.
   - Title: `font-display text-lg font-bold text-muted`: e.g. *"Gaming (Coming Soon)"*.
   - Action: "Tell me when it opens" button (`bg-paper hover:bg-cream border-[2px] border-ink rounded-pill px-3 py-1.5 text-xs font-bold text-ink min-h-[44px] flex items-center justify-center`).
4. **Ordering & Personalization:**
   - Order: Last-played lane card rendered first; remaining open lanes sorted by `sort_order` (the only personalized element per Rule L1).

---

### 12C.3 Lane Chip (Universal Indicator)
- **Visuals:** `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border-[1.5px] border-ink text-xs font-extrabold shadow-sticker` with background matching lane accent (`bg-violet`, `bg-sun`, `bg-mint`, etc.).
- **Usage Surfaces:**
  - Result view header.
  - Satori share cards (top-left sticker badge).
  - Challenge links (preview card).
  - Twin Globe filter pills.
  - Orbit header tag.

---

### 12C.4 Richer Format Components

#### 1. `pick2of6` (Multi-Selection Option Grid)
- **Grid Layout:** `grid grid-cols-2 gap-2.5 max-w-sm mx-auto`.
- **Item State:**
  - Unselected: `bg-paper border-[2.5px] border-ink shadow-sticker rounded-m p-3 text-center font-display font-bold text-body min-h-[56px] flex items-center justify-center active:translate-x-1 active:translate-y-1 active:shadow-none`.
  - Selected (Max 2): `bg-sun border-[2.5px] border-ink shadow-none translate-x-1 translate-y-1 font-extrabold`.
  - Disabled (when 2 are already picked): Unpicked items drop opacity to 50% with `pointer-events-none`.
- **Status Indicator & Clear Action:**
  - Selection Counter: `text-sm font-mono font-bold text-ink`: *"Pick 2 of 6 (1/2 selected)"*.
  - Clear Button: `text-xs text-muted underline min-h-[44px] flex items-center`: *"Clear picks"*.

#### 2. `rank3` (Drag & Tap-to-Order Ranking)
- **Stack Layout:** Vertical column of 3 reorderable cards (`space-y-2.5 max-w-sm mx-auto`).
- **Card Anatomy:**
  - Container: `bg-paper border-[2.5px] border-ink shadow-sticker rounded-m p-3 flex items-center justify-between min-h-[56px]`.
  - Rank Badge: `w-7 h-7 rounded-circle bg-violet text-paper font-mono font-black text-sm flex items-center justify-center`: e.g. `#1`, `#2`, `#3`.
  - Label: `font-display font-bold text-body text-ink flex-1 px-3`.
  - Reorder Controls (Accessible Default): Up/Down tap buttons (`min-w-[44px] min-h-[44px] flex items-center justify-center text-ink`).
- **Drag Interaction:** Optional pointer drag handle with tactile spring feedback. ARIA live region announces: *"Option moved to position 1 of 3"*.

#### 3. `slider7` (Labelled Spectrum Slider)
- **Spectrum Layout:** `max-w-sm mx-auto space-y-3 px-2`.
- **Track & Thumb:**
  - Track: `h-3 bg-cream border-[2px] border-ink rounded-pill relative`.
  - 7 Discrete Tick Marks: `w-2 h-2 rounded-circle bg-ink/30 -top-0.5`.
  - Thumb: `w-9 h-9 rounded-circle bg-violet border-[2.5px] border-ink shadow-sticker cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet active:scale-95`.
- **Endpoint Labels:**
  - Left Label: `text-xs font-bold text-muted`: e.g. *"Plan every detail"*.
  - Right Label: `text-xs font-bold text-muted`: e.g. *"Wing it completely"*.
  - Center indicator shows chosen position words, **never numeric scores** (Rule F33).
- **Keyboard Navigation:** Left/Right arrow keys adjust position by 1 point with tactile haptic tick.

#### 4. `scene` (Illustrated Reaction Cards)
- **Scene Hero Illustration:** Centered vector asset (`w-full max-h-48 rounded-m border-[2px] border-ink bg-cream overflow-hidden`).
- **Scenario Text:** `font-display text-lg font-bold text-ink text-center px-2 py-3`.
- **Reaction Options:** 3 to 5 reaction cards rendered as full-width interactive sticker buttons with style tag mapping.

---

### 12C.5 Say It Composer (Stage L6 / Gate G4 — Documented Only)
- **Container:** `bg-paper border-[2.5px] border-ink shadow-card rounded-l p-4 space-y-3 max-w-sm mx-auto`.
- **Input Area:** Textarea (`w-full h-24 p-3 bg-cream border-[2px] border-ink rounded-m font-sans text-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-violet`).
- **Character Counter:** `text-xs font-mono text-muted text-right`: *"42/80 characters"*. Warning in coral when $>80$.
- **Privacy Notice:** Inline callout (`text-xs text-muted flex items-start gap-1.5 p-2 bg-cream/60 rounded-s border-[1px] border-ink/20`):
  *"Nobody else reads this. Our system only compares how answers sound. Deleted automatically after 7 days."*
- **States:**
  - *Idle / Typing:* Standard counter.
  - *Screening Rejection:* Coral toast: *"That one can't be used. Try saying it another way."*
  - *Processing (Provisional):* Banner on results: *"Analyzing your typed answer... match improves when ready."*

---

### 12C.6 Result View & Tie-Group Presentation
1. **Honest Group Size Display (Rule L4):**
   - Subtitle below Twin avatar:
     - $T = 1$: `font-bold text-sm text-ink`: *"You and this person were the only ones who answered like this today."*
     - $2 \le T \le 5$: `font-bold text-sm text-ink`: *"4 of 5 with a person in Lagos, 18 to 24. You matched with them and a few others."*
     - $6 \le T \le 999$: `font-bold text-sm text-ink`: *"4 of 5 with a person in Lagos, 18 to 24. 312 people matched you this way."*
     - $T \ge 1,000$: `font-bold text-sm text-ink`: *"4 of 5 with 1,000+ people. Meet one of them."*
     - Sparse Lane ($N < 200$): `font-bold text-sm text-sun`: *"Closest so far in [Lane Name]. More people are playing."*
2. **"Why You Two?" Disclosure Row:**
   - Accordion trigger: *"Why you two?"*
   - Expanded state reveals the specific questions where both players agreed on rare choices (rarest first), strictly adhering to Rule 4.
3. **Mutual Pairing Indicator:**
   - `is_mutual` state is baked into backend logic and **never displayed as raw jargon** to the player.

---

### 12C.7 Super Twin Card Face (Stage L7 — Built on Command)
- **Anatomy:** Distinct holographic sticker treatment using dual-accent border (`bg-paper border-[3px] border-ink shadow-card rounded-xl p-5`).
- **Header:** `bg-sun border-[1.5px] border-ink rounded-pill px-3 py-1 text-xs font-black text-ink inline-flex items-center gap-1.5`: *"⚡ SUPER TWIN"*.
- **Body:** *"You and [Alias] matched in both Everyday and Memes today!"*
- **Flip Behavior:** Standard 3D CSS card flip revealing joint rarity metrics on back.

---

### 12C.8 Resting & Early Lane States
- **Resting Lane Screen:**
  - Illustration: Resting coffee cup vector from registry.
  - Title: *"Resting today."*
  - Copy: *"[Lane Name] doesn't have a Drop today. Check out Everyday or Memes!"*
  - Action Button: *"Play Everyday Drop"*.
- **Early Lane Pill:** `bg-sun text-ink border-[1.5px] border-ink rounded-pill px-2.5 py-0.5 text-xs font-bold`: *"Early Lane"*.

---

---

### 12C.9 Bundle Size Budget Guardrails
- **Play-Route Budget Constraint:** Maximum `<= 159.5 KB` gzipped.
- **Code-Splitting Strategy:**
  - Core `/play` route imports only `pick1` renderer.
  - `pick2of6`, `rank3`, `slider7`, and `scene` components are dynamic imports (`next/dynamic`) loaded on-demand based on question `format`.
  - Non-default lane cards and Say It composer are lazy-loaded outside the initial critical path.

---

### 12C.10 Situations Style Label Card & Share Card Face (Stage L5)
- **Result Card Face (`SituationsStyleCard`):**
  - Container: `bg-paper border-[2.5px] border-ink shadow-card rounded-xl p-5 text-center flex flex-col items-center gap-3`.
  - Lane Indicator: Universal Lane Chip with Situations accent.
  - Archetype Icon: 64x64 SVG sticker from illustration registry (e.g. `icon-calm-anchor`, `icon-playful-spark`).
  - Style Label Title: `text-xl font-black text-ink uppercase tracking-wide` (e.g. *"The Calm Anchor"*, *"The Playful Spark"*).
  - Descriptive Tone Copy: `text-sm font-medium text-ink/80 max-w-[280px]` (e.g. *"Unfazed, steady, lets the storm pass."*).
  - **Strict Negative Design Invariants:**
    - Absolutely NO percentage numbers (never *"85% Sigma"*, never *"Score: 92%"*).
    - Absolutely NO evaluative or shaming words (no *"simp"*, *"desperate"*, *"loser"*, *"alpha"*).
    - Zero ranking badges, zero leaderboard styling, zero competitiveness.
- **Satori Share Card Export (`SituationsShareCard`):**
  - Canvas: 1200x630 PNG, warm cream background (`#FFF8F0`), physical desk sticker aesthetic.
  - Ink Border: `2.5px solid #14123A` with `4px 4px 0 #14123A` offset shadow.
  - Hero Display: Prominent archetype name and SVG sticker.
  - Subtitle: *"My Reaction Style in Today's Situations Drop"*.
  - Footer: *"Oddly / Play today's Drop at oddly.club"*.

---

### 12C.11 Globe Lane Filter Chips & Orbit Lane Tags
- **Globe Lane Filter Chips (`GlobeLaneFilter`):**
  - Placement: Horizontal scrollable chip bar anchored 16px above the 3D Globe viewport.
  - Active Chip: `bg-ink text-paper border-[2px] border-ink rounded-pill px-3.5 py-1.5 text-xs font-black shadow-none`.
  - Inactive Chip: `bg-paper text-ink border-[2px] border-ink rounded-pill px-3.5 py-1.5 text-xs font-bold shadow-sticker hover:translate-x-[1px] hover:translate-y-[1px]`.
  - Arc Count Badge: Small circle inside chip displaying active arc count (`bg-cream text-ink text-[10px] px-1.5 rounded-full`).
  - Low-Volume Empty State: If selected lane has $< 20$ arcs, displays honest status banner: *"Showing past arcs for [Lane] (quiet today)"*.
- **Orbit Lane Tag (`OrbitLaneTag`):**
  - Rendered in Orbit list items, detail sheets, and sync views.
  - Styling: Mini badge `bg-cream border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-[10px] font-black uppercase text-ink inline-flex items-center gap-1`.
  - Interaction: Tapping chip opens popover detailing: *"Orbit formed in [Lane Name] on [Date]"* and that lane's mutual sync rate.

---

### 12C.12 Reduced-Motion Fallbacks for All New Components
When `@media (prefers-reduced-motion: reduce)` is active:
- **`LanePicker`:** Cards render statically with zero hover translation (`translate(0, 0)`) and fixed `4px 4px 0 #14123A` shadow.
- **`pick2of6`:** Selection instantly applies ink border and background fill without scale pulse or ripple effect.
- **`rank3`:** Drag-and-drop animation is disabled; tap-to-order provides instantaneous DOM index swap.
- **`slider7`:** Slider thumb snaps directly to discrete notches without spring dampening or sliding easing.
- **`scene`:** Card selection highlights border immediately without accordion expansion easing.
- **`SayItComposer`:** Validation error shake animation is replaced by a static red ink border (`2.5px solid #FF6B5E`) and assistive text.
- **`SuperTwinCard`:** 3D CSS flip animation is replaced by an immediate tabbed face swap.
- **`ResultView`:** Numerical count-up animations are bypassed; final match percentage and group size render immediately.
---

## 12D. Bonus Rounds & Badges (Stage L0-ADD UI Specifications)

### 12D.1 Bonus Offer Card
- **Placement:** Positioned on the result screen beneath the Twin Reveal card, rendered only after final recap for eligible tie groups (size >= `bonus.min_tie_size` [2]).
- **Visual Structure:** Physical paper sticker card:
  ```
  bg-paper border-[2.5px] border-ink rounded-m shadow-sticker p-4
  ```
- **Header:** `bonus.offer.title` ("Break the tie?") in Display 700 `16px` ink.
- **Body:** `bonus.offer.body` ("{{count}} people matched you. 3 quick extra questions can find the closest one. Totally optional.") in Inter 400 `14px` ink.
- **Action Controls:**
  - Primary button: *"Play 3 extra"* (`bg-violet text-paper border-[2.5px] border-ink shadow-sticker`, presses flat to `translate(4px, 4px)` with `0 0 0` shadow).
  - Secondary button: *"Not now"* (`bg-paper text-ink border-[2.5px] border-ink shadow-sticker`, presses flat to `translate(4px, 4px)` with `0 0 0` shadow).
  - Target Dimensions: Minimum touch targets strictly >= 44 x 44 px.
- **Anti-Urgency Invariants:** Absolutely no countdown timers, no pulsing alert rings, and no "your twin is waiting" copy (Rule 17, Rule B6, Never Do list).

### 12D.2 Bonus Question Flow (Reusing 12C.4 Components)
- **Modal / Container:** Full-screen tactile overlay with cream background (`#FFF8F0`) and paper question card (`#FFFFFF`).
- **Header Badge:** Universal pill indicator (`bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-3 py-1 text-xs font-extrabold`) displaying "Tie-break question {{current}} of {{total}}".
- **Question Layout:** Reuses existing format components from Section 12C.4 (`pick1`, `pick2of6`, `slider7`, `rank3`). Zero redundant DOM elements.
- **Haptics & Transitions:** 120ms ease-out press-flat transitions matching the core Drop interaction signature.

### 12D.3 Result Line & Alone State
- **Presentation:** The narrowed bonus outcome is completely additive, displayed as an extra line, "Closest in your group", directly beneath the unchanged locked twin on the recap view:
  - Narrowed match: `bonus.result.narrowed` ("Tie-break: {{k}} of 3 matched with {{m}} of the {{n}} who played.") in ink on mint fill (`bg-mint/20 border-[1.5px] border-ink`).
  - Single participant: `bonus.result.alone` ("Nobody else from your group played the tie-break. Your twin stays the same.") in ink on lavender fill (`bg-lavender`).
  - Expired session: `bonus.closed` ("This tie-break has ended.") in ink on cream fill.
- **Honesty Guarantee:** Player counts reflect exact database participants (exact below 1,000 per Rule L4). The original locked twin and mutual pairing are never rewritten.

### 12D.4 Badge Face Specification
- **Sticker Aesthetic:** Procedural collectible sticker card:
  ```
  w-28 h-36 bg-paper border-[2.5px] border-ink rounded-m shadow-sticker flex flex-col items-center justify-between p-3
  ```
- **Tier Accents & Foil Frames:**
  - *Collector I (2 lanes):* Lavender corner accent pill (`#EEEAFE`).
  - *Collector II (3 lanes):* Lilac corner accent pill (`#CDBFFF`).
  - *Collector III (5 lanes):* Sun corner accent pill (`#FFD23F`).
  - *All-Lanes:* 45-degree linear rainbow border strip (`coral -> sun -> mint -> violet`).
  - *Super Twin:* Dual-lane iridescent sticker badge with numerical multiplicity tag ("x3").
- **Empty / Locked Slot:** Dotted outline (`2px dashed #5B5780`), paper fill, subtle ink padlock icon, and unearned lane slug label. Never displays rank or failure copy.

### 12D.5 "My Badges" Showcase Page
- **Route:** `/me/badges` (accessible from user drawer and recap badge toasts).
- **Data Sources:** Consolidates creator badges (M6, `GET /v1/badges/mine`) and collector badges (L10, `GET /v1/me/collector-badges`) into distinct album sections.
- **Layout:** Responsive 3-column sticker album grid on warm cream desk (`#FFF8F0`).
- **Strict Privacy Rule (Rule B5):** Visible solely to the authenticated account. No public profile URL, no follower views, no global rarity percentages, and no leaderboards.

### 12D.6 Toasts & Reduced-Motion Specifications
- **Unlock Toast:** Floating result-screen banner (< 600ms, single-tap dismissible, `bg-paper border-[2.5px] border-ink shadow-sticker`).
- **Reduced Motion Fallback:** When `prefers-reduced-motion: reduce` is enabled:
  - Toast slides and bounce animations are completely omitted; toast appears via instantaneous opacity flip.
  - 3-question bonus progression swaps DOM instantly without sliding easing.
  - Badge unlock sparkles and foil gleams are replaced by static icon state updates.

### 12D.7 Bundle Size Budget Evaluation
- **Budget Constraint:** 159.5 KB total JavaScript gzipped budget exception (Section 12C.9).
- **Evaluation:**
  - Reuses the renderers that Stage L2 will provide; Stage L9 depends on L2.
  - Estimate: about 2 to 3 KB gzipped for the Bonus Runner and My Badges, NOT measured (docs-only stage). Must be measured when Stage L9 and L10 are built. The play route must stay at or under the approved 159.5 KB exception.

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

- 2026-11-22: v1.4. Added Section 12D (Bonus Rounds and Badges UI). Zero new colours.
- 2026-11-21: v1.3. Added Section 12C (Lanes, Richer Formats, Twin Depth, Situations style cards, Say It composer, Globe lane filters, Orbit lane tags, reduced-motion fallbacks, and v1.3 bundle budget). Zero new colors outside ui-tokens.
- 2026-11-15: v1.2. Added Section 12B (detailed design specifications for F24-F31: Meme question card, Meme Corner card, consent notice and Settings toggles, Meme Lab composer & status cards, creator badges and achievement cards, featured memes, Orbit subject-sync rows, touch targets $\ge 44\text{px}$, and accessibility). Zero new colours.
- 2026-11-14: v1.1. Added Section 12A (detailed design specifications for F18 Twin Globe, F19 Keep and Orbit, F20 Telepathy, F21 Anti-twin, touch targets, accessibility, and Satori share faces). Reconciled core color tokens: verified `packages/ui-tokens` matches Section 2.1 WCAG AA palette (`#3DDBB0` mint, `#FF6B5E` coral, `#FFD23F` sun, `#EEEAFE` lavender).
- 2026-11-14: v1.0. Sticker pop direction chosen by the owner. Palette, type, buttons, flip card, and D1 redesign stage defined.
