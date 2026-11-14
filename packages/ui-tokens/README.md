# @oddly/ui-tokens

## Design Rules & Architecture

> **Source of Truth:** [design.md](../../design.md) (v1.0 Sticker Pop Design System)
> **Permanent Design Pattern:** Everything tappable has an ink outline (`2.5px solid #14123A`) and a hard offset sticker shadow (`4px 4px 0 #14123A`). Physical press-flat on active/tap. Cream desk background (`#FFF8F0`) only in v1.

### Core Token Constraints

1. **One Palette Source:** All colours, type scales, radii, outlines, shadows, and motion tokens must be imported from this package.
2. **Zero Drift:** Never hardcode hex codes or arbitrary blur shadows in applications (`apps/web`, `services/api`, or `packages/shared`).
3. **Contrast Enforcement:** All text tokens on backgrounds must meet WCAG 2.2 AA ($4.5:1$ for body, $3.0:1$ for large text/components).
4. **Touch Target Size:** Interactive elements must have a minimum bounding box of $44 \times 44\text{ px}$.

### Exports

- `colors`: 11 core tokens (`ink`, `cream`, `paper`, `violet`, `lavender`, `coral`, `mint`, `sun`, `muted`, `lilac`, `error`) plus `palette12`.
- `tiers`: Common, Uncommon, Rare, Mythic badge configurations.
- `typography`: Scales for `display-xl`, `display-l`, `display-m`, `button`, `chip`, `body`, `body-s`, `caption`.
- `radius`: `s` (10px), `m` (14px), `l` (20px), `pill` (999px).
- `outlines`: `outline` (2.5px solid ink), `outline-thin` (1.5px solid ink).
- `shadows`: `sticker` (4px 4px 0 ink), `sticker-lift` (6px 6px 0 ink), `sticker-flat` (0 0 0 ink), `card` (4px 4px 0 ink).
- `motion`: durations and easings (`dur-press`, `dur-ui`, `dur-sheet`, `dur-flip`, `ease-out`, `ease-snap`).
- `tailwind-preset`: Tailwind CSS theme preset for Next.js app.
- `contrastPairs`: Array of validated contrast relationships.

