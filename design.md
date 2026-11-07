# Design Specification — Oddly v1

Project: Oddly v1 | Last updated: 2026-11-07 | Owner: Founder + AI agent
Purpose of this file: Complete visual language, tokens, typography, component states, motion specs, accessibility guidelines, and screen-by-screen UI blueprints.

---

## 1. Design Concept and Core Principles

### 1.1 The Concept: "Two Circles, One Overlap"

Oddly's visual identity is anchored on two luminous, overlapping circles:

- **Circle 1 (Violet):** Represents you—your idiosyncratic, personal choices.
- **Circle 2 (Coral):** Represents the world—the vast sea of global strangers.
- **The Overlap (Mint):** The magical point of convergence where two strangers are in sync.

> **The Mint Rule:** The color **Mint** is strictly reserved for _matches, shared picks, success states, and rarity celebrations_. Whenever a user sees Mint in the interface, it unambiguously communicates: _"You and someone out there are in sync."_ Mint is never used for generic decorations or ordinary primary buttons.

### 1.2 Core Principles

1. **One Decision Per Screen:** Eliminate cognitive overload. Each screen presents a single clear choice.
2. **The Result is the Reward:** No sign-up walls, banner ads, or newsletter popups interrupt the core journey from landing to the twin reveal.
3. **Thumb-Driven Zone:** All primary tap targets reside in the lower 60% of the mobile viewport, comfortably reachable on modern 6-inch smartphones.
4. **Tactile & Bouncy:** Tiles feel physical—subtle scale springs on press, crisp border highlights on selection, and gentle haptic ticks.
5. **Honest & Grounded:** Weak matches are presented warmly without inflated celebratory confetti.
6. **Delight is Fast:** Micro-interactions execute in $\le 200 \text{ ms}$; the longest ambient animation (searching) is strictly capped at $1.5 \text{ s}$ and is instantly skippable.
7. **Zero Dark Patterns:** No countdown countdown guilt, no fake urgency counters, and no hidden subscriptions.

---

## 2. Color Tokens and System

### 2.1 Palette Tokens

| Token            | Light Theme | Dark Theme (Default) | Role / Usage                                                                                       | WCAG Contrast vs Background            |
| ---------------- | ----------- | -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `--midnight`     | `#14123A`   | `#14123A`            | Dark canvas background, primary dark surface, share card base                                      | > 14:1 vs white/cream                  |
| `--violet`       | `#6C4CF1`   | `#8B72FF`            | Primary brand accent, primary CTA buttons, links, Circle 1                                         | 4.8:1 (Dark) / 5.2:1 (Light)           |
| `--violet-press` | `#5538D6`   | `#6C4CF1`            | Pressed state for primary buttons                                                                  | Passed (> 4.5:1)                       |
| `--coral`        | `#FF6B5E`   | `#FF8176`            | Accent color, streak flame, Circle 2, soft destructive alerts                                      | Passed (> 3.5:1 graphical)             |
| `--mint`         | `#1FBF93`   | `#3DDBB0`            | Reserved for matches, success, rarity tags. In light mode: `#1FBF93` for text; `#3DDBB0` for fills | 4.6:1 (Light text) / 8.9:1 (Dark fill) |
| `--cream`        | `#FFF8F0`   | n/a                  | Warm paper light theme background                                                                  | Base surface                           |
| `--lavender`     | `#EEEAFE`   | n/a                  | Light theme card background and subtle fill                                                        | Base card fill                         |
| `--bg`           | `#FFF8F0`   | `#14123A`            | Dynamic root application background                                                                | Canvas                                 |
| `--surface`      | `#FFFFFF`   | `#1E1B4B`            | Standard card container surface                                                                    | Layer 1 surface                        |
| `--surface-2`    | `#EEEAFE`   | `#28245E`            | Raised surfaces, selected answer tiles, tab bar                                                    | Layer 2 surface                        |
| `--border`       | `#DDD6FA`   | `#3A3580`            | Subtle hairline dividers and unselected tile outlines                                              | 1.8:1 non-text boundary                |
| `--text`         | `#14123A`   | `#F4F1FF`            | High-emphasis primary headings and body copy                                                       | 13.5:1 (Dark) / 14.1:1 (Light)         |
| `--text-muted`   | `#5B5780`   | `#B3AEE0`            | Secondary subtitles, helper copy, captions                                                         | 5.1:1 (Dark) / 4.7:1 (Light)           |
| `--danger`       | `#D93C4B`   | `#FF6B7A`            | Form validation errors and destructive actions                                                     | 4.9:1 (Dark) / 4.6:1 (Light)           |
| `--warning`      | `#E69A1A`   | `#FFC857`            | Skewed question warnings in admin, status alerts                                                   | 4.5:1                                  |
| `--success`      | `#1FBF93`   | `#3DDBB0`            | Success banners, confirmations, toast indicators                                                   | 4.6:1 (Light) / 8.9:1 (Dark)           |

### 2.2 Gradients and Glows

- `--grad-hero`: `radial-gradient(ellipse at 20% 0%, rgba(108, 76, 241, 0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255, 107, 94, 0.20) 0%, transparent 60%), #14123A`
- `--grad-match`: `linear-gradient(135deg, #6C4CF1 0%, #3DDBB0 100%)`
- `--grad-mythic`: `conic-gradient(from 180deg at 50% 50%, #6C4CF1, #FF6B5E, #FFD23F, #3DDBB0, #6C4CF1)`
- `--glow-mint`: `0 0 32px rgba(61, 219, 176, 0.45)`
- `--glow-violet`: `0 0 32px rgba(108, 76, 241, 0.50)`

### 2.3 The Accessible 12-Colour Palette (Question Type 3)

Each swatch tile displays a crisp circular color swatch alongside its human-readable text label, guaranteeing full accessibility for color-blind users:

| Label        | Hex Value | Color Blindness Distinction       |
| ------------ | --------- | --------------------------------- |
| **Crimson**  | `#D7263D` | Vivid red, high contrast vs green |
| **Coral**    | `#FF6B5E` | Warm pinkish orange               |
| **Amber**    | `#F59E0B` | Deep golden amber                 |
| **Sunshine** | `#FFD23F` | Bright warm yellow                |
| **Lime**     | `#8BC34A` | Distinct yellow-green             |
| **Mint**     | `#3DDBB0` | Cool cyan-green (brand accent)    |
| **Teal**     | `#0F9D9A` | Deep ocean teal                   |
| **Sky**      | `#4CC9F0` | Vivid cerulean light blue         |
| **Indigo**   | `#3F37C9` | Deep saturated blue               |
| **Violet**   | `#8E5CF6` | Rich royal purple                 |
| **Pink**     | `#F472B6` | Soft vibrant magenta              |
| **Slate**    | `#64748B` | Neutral steel blue-grey           |

### 2.4 Tier Visual Styles

- **Common (0–49.9%):** Flat slate/lavender badge, no glow, subtle border.
- **Uncommon (50–79.9%):** Crisp mint outline badge with bold tabular percentage.
- **Rare (80–94.9%):** Violet-to-mint gradient fill with soft ambient glow (`--glow-mint`).
- **Mythic (95–100%):** Conic gradient badge with subtle animated border shimmer and particle sparkles (disabled if reduced motion is requested).

---

## 3. Typography Scale

Oddly pairs **Space Grotesk** (geometric, quirky, high-character headings and numbers) with **Inter** (ultra-legible, neutral, accessible body text). Both are self-hosted via `next/font` with zero third-party runtime requests.

| Style         | Mobile (Size / Line Height) | Desktop (Size / Line Height) | Font Family & Weight      | Tracking              | Purpose                               |
| ------------- | --------------------------- | ---------------------------- | ------------------------- | --------------------- | ------------------------------------- |
| **Display**   | `44px / 48px`               | `64px / 68px`                | Space Grotesk 700         | `-0.02em`             | Landing headline, massive match score |
| **H1**        | `32px / 38px`               | `44px / 50px`                | Space Grotesk 700         | `-0.01em`             | Screen titles, question prompts       |
| **H2**        | `24px / 30px`               | `30px / 36px`                | Space Grotesk 500         | `0`                   | Card headers, section dividers        |
| **H3**        | `20px / 26px`               | `22px / 28px`                | Space Grotesk 500         | `0`                   | Answer tile text, option labels       |
| **Body L**    | `18px / 28px`               | `18px / 28px`                | Inter 400                 | `0`                   | Lead paragraphs, brand story text     |
| **Body**      | `16px / 24px`               | `16px / 24px`                | Inter 400                 | `0`                   | Default body copy, explanations       |
| **Small**     | `14px / 20px`               | `14px / 20px`                | Inter 500                 | `+0.01em`             | Form labels, captions, metadata       |
| **Micro**     | `12px / 16px`               | `12px / 16px`                | Inter 600                 | `+0.04em` (Uppercase) | Category pills, tier badges           |
| **Number XL** | `72px / 72px`               | `96px / 96px`                | Space Grotesk 700 Tabular | `-0.03em`             | Oddness percentile, countdown clock   |

---

## 4. Spacing, Elevation, and Layout Grid

### 4.1 Spacing Scale (4px Base Unit)

- `4px` (`space-1`), `8px` (`space-2`), `12px` (`space-3`), `16px` (`space-4`), `20px` (`space-5`), `24px` (`space-6`), `32px` (`space-8`), `40px` (`space-10`), `48px` (`space-12`), `64px` (`space-16`).
- **Screen Margins:** `20px` on mobile (< 640px), `32px` on tablet/desktop.
- **Max Content Width:** Centered container capped at `480px` for play and result flows; `960px` for marketing and historical archives.

### 4.2 Breakpoints

- **sm:** `360px` (Minimum target: Android phone)
- **md:** `640px` (Phablet / small tablet)
- **lg:** `1024px` (Desktop / tablet landscape)
- **xl:** `1280px` (Large display)

### 4.3 Corner Radii

- `xs`: `6px` | `sm`: `10px` | `md`: `16px` (Tiles, inputs) | `lg`: `24px` (Cards) | `xl`: `32px` (Bottom sheets, modals) | `full`: `9999px` (Pills, circular buttons)

### 4.4 Elevation and Shadows

- **Shadow 1 (Subtle):** `0 1px 2px rgba(20, 18, 58, 0.08)`
- **Shadow 2 (Card Lift):** `0 8px 24px rgba(20, 18, 58, 0.12)`
- **Shadow 3 (Floating):** `0 20px 48px rgba(108, 76, 241, 0.25)`
- **Dark Mode Elevation:** Dark mode replaces heavy dropped shadows with surface brightening (`--surface-2`) and ambient radial glows (`--glow-mint`, `--glow-violet`).

---

## 5. Atmosphere and Ambient Backgrounds

### 5.1 Dynamic Question Atmospheres

To convey a sensation of progression across the five picks, the ambient background glow shifts hue according to the active question type:

- **Type 1 (Text Pick One):** Royal Violet glow (`rgba(108, 76, 241, 0.15)`)
- **Type 2 (Number):** Warm Coral glow (`rgba(255, 107, 94, 0.15)`)
- **Type 3 (Colour):** Crisp Mint glow (`rgba(61, 219, 176, 0.15)`)
- **Type 4 (Image):** Sky Blue glow (`rgba(76, 201, 240, 0.15)`)
- **Type 5 (Word):** Golden Amber glow (`rgba(245, 158, 11, 0.15)`)

---

## 6. Iconography and Asset Library

### 6.1 Lucide Icon Mappings

Standard UI actions use `lucide-react` at `24px` (or `20px` inside buttons), stroke width `2px`:

- Close: `X` | Back: `ChevronLeft` | Forward: `ChevronRight`
- Share: `Share2` | Copy Link: `Link2` | Download: `Download`
- Settings: `Settings` | History: `CalendarDays` | Today: `Sparkles`
- Profile / Me: `UserRound` | Notifications: `Bell` | Sound: `Volume2` / `VolumeX`
- Theme: `Sun` / `Moon` | Report: `Flag` | Verified / Success: `Check`
- Warning: `AlertTriangle` | Delete / Clear: `Trash2` | Menu: `MoreHorizontal`
- Challenge: `Users` | External Link: `ExternalLink` | PWA Install: `Smartphone`

### 6.2 Custom SVG Assets (Public Directory & React Components)

- `BrandMark`: Two overlapping translucent circles (Violet and Coral) with Mint intersection.
- `StreakFlame`: Stylized multi-tone flame icon (Coral to Amber gradient).
- `TierBadges`: 4 custom SVG vector badges (Common, Uncommon, Rare, Mythic).
- `SearchGlobe`: Minimal dark world dot-matrix map for the 1.5s search animation.
- `ImageQuestionTiles (28 Illustrated SVGs):` Curated flat vector illustrations utilizing brand palette tones:
  - 4 Sky conditions: Sunrise, Thunderstorm, Starry Night, Overcast
  - 4 Doors: Red door, Carved wooden door, Glass modern door, Tiny garden door
  - 4 Urban pathways: Mumbai Chai lane, Quiet green park path, Tokyo neon alleyway, Coastal beach promenade
  - 4 Desert island essentials: Vintage book, Acoustic guitar, Heavy-duty torch, Blank notebook
  - 4 Weekend plans: Indie cinema, Open highway road trip, Long afternoon nap, Bustling street food crawl
  - 4 Market stalls: Fresh fruit mound, Old book stack, Glass bangles, Traditional sweets
  - 4 Horizon vistas: Golden dawn, Mist mountain sunrise, Ocean sunset, Twilight horizon

---

## 7. Interactive Components and States

Every interactive element defines 8 consistent states: `default`, `hover`, `focus-visible`, `active/pressed`, `disabled`, `loading`, `error`, `success`.

### 7.1 Primary Button

- **Dimensions:** Height `52px` (Large) / `44px` (Medium) / `36px` (Small). Full width on mobile flow steps. Radius: `9999px` (Pill).
- **Default:** Background `--violet`, text Inter 600 `16px` white, subtle inset top highlight.
- **Hover:** Background lifts (`--violet` + 8% white), `transform: translateY(-1px)`, `--shadow-3`.
- **Focus-Visible:** `outline: 3px solid var(--mint); outline-offset: 3px`.
- **Active / Pressed:** `transform: scale(0.97)`, background `--violet-press`, shadow collapsed.
- **Disabled:** `opacity: 0.4`, `pointer-events: none`, `aria-disabled="true"`.
- **Loading:** Label replaced with two orbiting mint/violet dots (`20px`), width locked to prevent layout shifting.

### 7.2 Secondary Button

- **Default:** Transparent background, `2px` solid `--violet` border, text `--violet` (Dark: `--lavender`).
- **Hover:** Filled with 10% opacity `--violet`.
- **Active:** Filled with 16% opacity `--violet`, `transform: scale(0.97)`.
- **Focus-Visible:** 3px Mint outline ring.

### 7.3 Ghost / Tertiary Button

- **Default:** No border, transparent background, text `--text-muted`.
- **Hover:** Text `--text`, underline, 8% violet background tint.
- **Active:** `transform: scale(0.96)`.

### 7.4 Destructive Button

- **Default:** Background `--danger`, text white.
- **Confirmation Requirement:** Used solely for account deletion; triggered through a two-tap modal sheet confirmation.

### 7.5 Answer Tile (Text Pick One)

- **Dimensions:** Width 100%, Min-height `72px`, radius `16px` (`--radius-md`), padding `16px 20px`.
- **Default:** Surface `--surface`, `1px` border `--border`, text H3 Space Grotesk.
- **Hover:** Border `--violet`, `transform: translateY(-2px)`, `--shadow-2`.
- **Selected:** `2px` solid `--violet` border, background `--surface-2`, scale-in check badge (Mint) in top-right corner.
- **Pressed:** `transform: scale(0.98)`.

### 7.6 Number Picker (Dial & Strip)

- **Hero Display:** Centered `96px` tabular Space Grotesk number in a circular glass dial.
- **Snapping Strip:** Horizontal scroll strip of numbers 1 to 50 with magnetic snap points.
- **Manual Adjusters:** Dedicated `-` and `+` touch buttons (`44x44px`) and keyboard arrow support.
- **Haptic:** `navigator.vibrate(5)` fires on every integer tick.
- **Confirm CTA:** Sticky "Confirm Number" primary button below dial.

### 7.7 Colour Swatch Grid

- **Layout:** 4 columns x 3 rows grid of `64px` circular swatches.
- **Label:** Micro uppercase font directly under each circle (e.g., "CRIMSON", "MINT").
- **Selected:** `3px` solid `--text` ring around circle, internal checkmark icon, bold text label, and ambient background glow shifts to the chosen color for 600ms.

### 7.8 Progress Dots

- **Structure:** Five indicator pills centered at top of screen.
- **States:** Completed: filled Violet circle (`10px`). Active: expanded animated pill (`28px` wide). Upcoming: subtle outline circle (`10px`).
- **Interaction:** Tapping any completed dot navigates back to that question before final submission.

### 7.9 Bottom Sheet & Modal

- **Mobile (< 640px):** Slides up from bottom edge, top corners radius `32px`, drag handle bar (`40x4px`), swipe-down to dismiss.
- **Desktop (≥ 640px):** Centered floating dialog, radius `24px`, backdrop blur `8px` with dark overlay (`rgba(20, 18, 58, 0.6)`).
- **Accessibility:** Radix Dialog primitive with trapped focus and `Escape` key listener.

---

## 8. Motion, Sound, and Haptic Specs

### 8.1 Motion Durations & Easings

- **Micro Interactions:** `140ms – 180ms` (Button press, hover transitions) — `ease-out`.
- **Standard Transitions:** `220ms – 260ms` (Sheet entry, tile selection).
- **Emphasis / Reveal:** `400ms – 600ms` (Card entry, score reveal).
- **Searching Animation:** `1500ms` (Map dot journey) — tap to skip.
- **Spring Physics (Framer Motion):** `stiffness: 380, damping: 28`.

### 8.2 Reveal Choreography

1. **0.0s – 1.5s:** Searching animation runs (glowing dots travel across dot matrix; brand circles converge).
2. **1.5s:** Twin card springs upward (`24px` translate, fade in).
3. **1.8s:** Matched pick dots ignite sequentially with Mint illumination (`120ms` stagger).
4. **2.2s:** Big score counts up from 0 to final score over `900ms`.
5. **2.8s:** Confetti bursts once if score is 4/5 or 5/5.
6. **3.2s:** Oddness card cascades in from below with percentile count-up and tier badge pop.

### 8.3 Prefers-Reduced-Motion Override

When `prefers-reduced-motion: reduce` is detected or toggled in Settings:

- All transform animations and sliding sheets become instant opacity fades (`80ms`).
- Count-up numbers render immediately at final value.
- Particle confetti and drifting background hero circles are completely disabled.

### 8.4 Sound and Haptics

- **Sound (Off by Default):** Soft, harmonic chime on reveal; subtle tick on tile select. Toggled via Settings.
- **Haptics:** `navigator.vibrate(5)` on answer selection; `navigator.vibrate(20)` on successful twin reveal.

---

## 9. Share-Card Templates (Server-Rendered via Satori)

All share cards are generated on the server using `satori` and rendered to PNG via `@resvg/resvg-js`. Three aspect ratios:

### 9.1 Story Format (1080 x 1920 px — 9:16)

- **Top Safe Zone (140px):** Wordmark "oddly" and two-circle brand mark in top-left.
- **Center Hero:** Two large intersecting circles (Violet & Coral) with glowing Mint overlap containing large score `"4/5"`.
- **Main Headline:** Space Grotesk 700: _"You matched 4 of 5 with someone in Lagos."_
- **Subline:** Inter 400: _"Only 0.4% of today's players did."_
- **Rarity Pill:** Tier badge centered with Mint highlight (e.g., `RARE TIER · 84%`).
- **Shared Pick Tag:** _"Matched on: Violet for Monday Morning"_.
- **Streak Callout:** If streak $\ge 3$, displays Coral flame icon and `"12-Day Streak"`.
- **Bottom Safe Zone (200px):** Date stamp, _"Beat my match today"_, shortened URL (`oddly.app/c/xyz123`), and high-contrast rounded QR code.

### 9.2 Square Format (1080 x 1080 px — 1:1)

- Rebalanced for Instagram feed and WhatsApp status.
- Left column: Wordmark, Headline, Rarity details, QR code.
- Right column: Large intersecting circles with score and streak flame.

### 9.3 Link Preview / Twitter Card (1200 x 630 px — 1.91:1)

- Horizontal presentation optimized for Open Graph metadata.
- Score and brand mark prominently positioned on right; dynamic social title on left.

---

## 10. Screen-by-Screen Layout Blueprints

### S1: Landing / Today (Drop Live, Not Played)

```
┌──────────────────────────────────────────┐
│ [Brand Mark] oddly         [Flame 12] [☼]│
│                                          │
│                                          │
│      Someone out there is                │
│         oddly like you.                  │
│                                          │
│    Five picks. About 30 seconds.         │
│               One twin.                  │
│                                          │
│      ┌────────────────────────────┐      │
│      │  ● 3,482 players today     │      │
│      └────────────────────────────┘      │
│                                          │
│      ┌────────────────────────────┐      │
│      │   ★  Play today's five     │      │
│      └────────────────────────────┘      │
│                                          │
│          18+ only. No account needed.    │
│                  About Oddly             │
└──────────────────────────────────────────┘
```

- **Tap "Play today's five":** Checks for stored adult confirmation. If not found, opens Age Gate bottom sheet. If found, navigates directly to Question 1.

### S2: Countdown (Drop Not Yet Live)

```
┌──────────────────────────────────────────┐
│ [Brand Mark] oddly                    [☼]│
│                                          │
│          Today's five drop at            │
│               7:00 AM IST                │
│                                          │
│         ┌────┐ ┌────┐ ┌────┐             │
│         │ 04 │:│ 22 │:│ 18 │             │
│         └────┘ └────┘ └────┘             │
│          HRS    MIN    SEC               │
│                                          │
│      ┌────────────────────────────┐      │
│      │    See yesterday's recap   │      │
│      └────────────────────────────┘      │
│                                          │
│      ┌────────────────────────────┐      │
│      │  Install Oddly for alerts  │      │
│      └────────────────────────────┘      │
└──────────────────────────────────────────┘
```

### S3: Question Screen (Generic Framework for All 5 Types)

```
┌──────────────────────────────────────────┐
│ [←]         ● ── ● ── ○ ── ○ ── ○     [✕]│
│                                          │
│ PICK ONE                                 │
│ A pizza that is always cold, or a        │
│ coffee that is always lukewarm?          │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ A pizza that is always cold          │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ A coffee that is always lukewarm     │ │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

- **Tap an answer tile:** Highlights with 2px Violet border, pops checkmark, vibrates 5ms, and auto-advances to next question after 350ms.
- **Tap [←]:** Navigates back to previous question.
- **Tap [✕]:** Opens exit confirmation dialog (_"Leave? Your progress will be saved on this device."_).

### S4: Review Screen

```
┌──────────────────────────────────────────┐
│ [←]                                      │
│                                          │
│ Ready?                                   │
│ Your picks are locked once you submit.   │
│                                          │
│ 1. Pizza cold                  [Edit] ──>│
│ 2. Number: 27                  [Edit] ──>│
│ 3. Colour: Violet              [Edit] ──>│
│ 4. Sky: Starry Night           [Edit] ──>│
│ 5. Word: Cozy                  [Edit] ──>│
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │          Find my twin                │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### S5: Searching Animation Screen

```
┌──────────────────────────────────────────┐
│                                          │
│             ·   ·   ·   ·                │
│           ·   (🟣)───→ ·   ·             │
│             ·   ·    ↖                   │
│           ·   ·   ·   (🟠)  ·            │
│                                          │
│      Looking across the world            │
│          for your twin...                │
│                                          │
│              [Tap to skip]               │
└──────────────────────────────────────────┘
```

### S6: Twin Reveal Screen

```
┌──────────────────────────────────────────┐
│ [Brand Mark]                  [Share] [✕]│
│                                          │
│              (🟣 🟢 🟠)                  │
│                 4 / 5                    │
│                                          │
│         Closest so far:                  │
│  Someone in Lagos, age 18 to 24          │
│                                          │
│       ●      ●      ●      ●      ○      │
│     Pizza   #27   Violet  Night  Word    │
│     (Mint) (Mint) (Mint)  (Mint) (Grey)  │
│                                          │
│ ℹ️ More people are still playing. Final  │
│    twin locks tomorrow at 7:00 AM.       │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │         See how odd you are          │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### S7: Oddness Rarity Screen

```
┌──────────────────────────────────────────┐
│ [← Back to Twin]                  [Share]│
│                                          │
│             [ RARE TIER ]                │
│                                          │
│                 84%                      │
│                                          │
│      Rarer than 84% of today's players.  │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Your rarest pick:                    │ │
│ │ Violet for Monday morning            │ │
│ │ Only 3.1% chose this today.          │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │           Share my card              │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │         Challenge a friend           │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### S8: Share Sheet (Bottom Sheet)

```
┌──────────────────────────────────────────┐
│ ─── (Drag Handle) ────────────────────── │
│ Share your match                    [✕]  │
│                                          │
│   [ Story ]     [ Square ]    [ Link ]   │
│                                          │
│        ┌────────────────────────┐        │
│        │ [Preview of Card Image]│        │
│        └────────────────────────┘        │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │         Share via...                 │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │         Copy challenge link          │ │
│ └──────────────────────────────────────┘ │
│                 Save image               │
└──────────────────────────────────────────┘
```

### Login Panel (Soft Sign-In Sheet)

```
┌──────────────────────────────────────────┐
│ ─── (Drag Handle) ────────────────────── │
│ [Brand Mark]                             │
│                                          │
│ Save your streak                         │
│ Your picks and streak stay with you on   │
│ any device.                              │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │  [G]  Continue with Google           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│                Not now                   │
│                                          │
│ By continuing, you agree to our Terms.   │
└──────────────────────────────────────────┘
```
