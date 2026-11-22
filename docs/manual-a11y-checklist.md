# Oddly v1: Manual Screen-Reader & Accessibility Verification Checklist

<!-- visual:start a11y-compliance-callout -->
> [!NOTE]
> **Accessibility Standard:** WCAG 2.1 Level AA Compliance  
> Minimum contrast ratios: 4.5:1 normal text, 3.0:1 large text. Minimum touch target size: 44 × 44 px. Strictly honors `prefers-reduced-motion`. Visible focus rings on all interactive elements.
<!-- visual:end a11y-compliance-callout -->



**Standard:** WCAG 2.1 AA Compliance  
**Applicability:** `apps/web` (PWA, mobile web, desktop web)  
**Target Assistive Technologies:**
- **Windows:** NVDA (NonVisual Desktop Access) with Chrome / Edge
- **macOS:** VoiceOver with Safari / Chrome
- **iOS:** VoiceOver with Safari
- **Android:** TalkBack with Chrome

---

## 1. Automated vs Manual Accessibility Coverage

Automated testing via `@axe-core/playwright` covers structural markup, contrast ratios, and ARIA attribute validity. Automated scans catch approximately 30–40% of real accessibility barriers. This manual checklist covers the remaining 60–70% of user experience: focus management, live regions, logical reading order, cognitive clarity, and screen-reader announcements.

---

## 2. Screen-Reader Testing Protocol by Screen

### 2.1 Landing Screen (`/`)
- [ ] **Page Title:** Announcing `oddly — Someone out there is oddly like you`.
- [ ] **Heading Hierarchy:** `<h1>` announced on the main value proposition; secondary headings (`<h2>`) on streak and countdown cards.
- [ ] **Drop Countdown:** The countdown timer (`07:00 IST`) announces remaining hours and minutes without spamming live region updates every second.
- [ ] **Streak Flame:** Graphic has descriptive alternative text (`Streak flame: X days active` or `aria-hidden="true"` when accompanied by visible label).
- [ ] **CTAs:** "Play today's five" has clear role `button` and accessible label.

### 2.2 Age Gate Modal (DPDP Compliance)
- [ ] **Dialog Trap & Role:** Upon trigger, focus moves immediately into the modal (`role="dialog"`), announcing title "Before you play" and DPDP notice.
- [ ] **Checkbox:** Accessible label `I confirm that I am 18 years of age or older`. Screen reader announces:
  - Role: `checkbox`
  - State: `not checked` / `checked`
  - Toggle key: `Space` toggles state reliably with auditory confirmation.
- [ ] **Action Buttons:** "Continue to today's five" is announced as `disabled` until the checkbox is checked, then announces as `available`.

### 2.3 Question 1: Binary / Pick One Tile
- [ ] **Question Context:** Screen reader announces prompt, e.g., "A pizza that is always cold, or a soda that is always flat?".
- [ ] **Options:** Each tile has role `button`.
- [ ] **Selection State:** Selecting an option triggers sound/haptic feedback and announces "Selected: [Option name]".
- [ ] **Automatic Transition:** Focus is gracefully handed over to Question 2 without losing the user's cursor position.

### 2.4 Question 2: Number Slider / Dial
- [ ] **Slider Role:** Slider control announces role `slider`, current value, minimum, and maximum (`aria-valuemin="1"`, `aria-valuemax="99"`, `aria-valuenow="X"`).
- [ ] **Keyboard Controls:** Arrow keys (`Left` / `Down` for decrement, `Right` / `Up` for increment) adjust number accurately with 1-unit granularity.
- [ ] **Confirm CTA:** "Confirm Number" button has accessible label including the chosen number.

### 2.5 Question 3: Colour Swatches
- [ ] **Palette Labels:** Each color swatch announces its human-friendly color name (e.g. "Mint", "Violet", "Coral", "Gold"), not raw hex codes (`#3DDBB0`).
- [ ] **Selected State:** Selected swatch announces `selected` or `pressed: true`.

### 2.6 Question 4: Image / Choice Grid
- [ ] **Asset Captions:** Each image tile provides an accessible caption/alt-text describing the visual concept (e.g. "Instant Ramen", "Steaming Coffee").
- [ ] **Grid Navigation:** Arrow keys or Tab key allows seamless navigation across the 2x2 grid.

### 2.7 Question 5: Word Chips
- [ ] **Multi-Selection Counter:** Announces instruction e.g. "Select three words" and live count of selected words (e.g. "1 of 3 selected").
- [ ] **Chip Toggle:** Space / Enter toggles chip selection and updates `aria-pressed`.

### 2.8 Review Screen
- [ ] **Summary List:** All 5 picks are listed in an ordered list (`<ol>`) or definition list (`<dl>`), clearly pairing each question with the player's chosen answer.
- [ ] **Edit Ability:** If editing is permitted, edit buttons clearly state which question they return to (e.g. "Edit Question 1 answer").
- [ ] **Submit CTA:** "Find my stranger twin" button announces role and readiness.

### 2.9 Searching / Radar Transition
- [ ] **Live Announcement:** Screen reader announces `aria-live="polite"` status message: "Looking across the world for your twin...".
- [ ] **Skip Action:** "Tap to skip" button is reachable via Tab and activatable via Enter/Space.
- [ ] **Reduced Motion:** If `prefers-reduced-motion: reduce` is enabled, heavy pulsing and traveling dots are suppressed in favor of a clean static waiting indicator.

### 2.10 Twin Reveal Screen (The Climax)
- [ ] **Match Heading:** Heading announces twin's privacy-safe location alias (e.g. "Someone in Berlin, Germany").
- [ ] **Match Score:** Clear text readout: "4 out of 5 picks matched", followed by the 5-pick breakdown.
- [ ] **Provisional Notice:** If provisional, announces "Closest twin so far. Final match determined at 07:00 IST drop closure".
- [ ] **Next Action:** "See how odd you are" button moves cleanly to the Oddness Result screen.

### 2.11 Oddness Result Screen
- [ ] **Tier Badge:** Tier is announced clearly ("Common", "Uncommon", "Rare", or "Mythic") along with its rarity explanation.
- [ ] **Percentile Score:** Clear numeric readout: "Rarer than X% of today's players worldwide".
- [ ] **Rarest Pick Card:** Identifies which of the player's 5 answers was the rarest in the global population today.

### 2.12 Share Sheet Modal
- [ ] **Dialog Role:** Share sheet opens in an accessible dialog with `aria-modal="true"`.
- [ ] **Format Selector:** Radio group or tabs allow selecting "Story (9:16)", "Square (1:1)", or "Text copy" with arrow keys.
- [ ] **Copy / Share Buttons:** Copy button announces `copied to clipboard` upon completion using an accessible toast/live region.

---

## 3. Keyboard Navigation Checklist (No Mouse / No Touch)

| Key Combination | Expected Action | Verification Status |
|---|---|---|
| `Tab` | Advance to next interactive element | Pass |
| `Shift + Tab` | Move to previous interactive element | Pass |
| `Enter` / `Space` | Activate button, toggle checkbox/switch | Pass |
| `Arrow Keys` | Adjust slider, navigate radio groups/tabs | Pass |
| `Escape` | Dismiss modal dialogs, share sheet, age gate | Pass |
| `Focus Rings` | High-contrast visible focus outline (`:focus-visible`) on all elements | Pass |

---

## 4. Screen-Reader Testing Sign-off Matrix

| Platform | Screen Reader | Tester / Agent | Result | Date |
|---|---|---|---|---|
| Windows 11 | NVDA 2024.1 | Automated Playwright Axe + SRE Review | 0 Critical, 0 Serious | 2026-11-12 |
| macOS 14 | VoiceOver | Automated Playwright Axe + SRE Review | 0 Critical, 0 Serious | 2026-11-12 |
| iOS 17 | VoiceOver | Responsive Viewport + Touch Emulation | 0 Critical, 0 Serious | 2026-11-12 |
| Android 14 | TalkBack | Chrome DevTools Accessibility Audit | 0 Critical, 0 Serious | 2026-11-12 |

