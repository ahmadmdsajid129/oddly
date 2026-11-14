/**
 * @oddly/ui-tokens — Sticker Pop Design System Tokens
 * Source of truth: design.md (v1.0)
 *
 * Core rule: cream desk, physical paper stickers, ink outlines, hard offset shadows.
 * Cream-only, no dark mode in v1. No soft shadows. No gradients on UI chrome.
 */

export const colors = {
  ink: "#14123A",
  cream: "#FFF8F0",
  paper: "#FFFFFF",
  violet: "#6C4CF1",
  lavender: "#EEEAFE",
  coral: "#FF6B5E",
  mint: "#3DDBB0",
  sun: "#FFD23F",
  muted: "#5B5780",
  lilac: "#CDBFFF",
  error: "#D92D4B",
} as const;

export type ColorToken = keyof typeof colors;

export const tiers = {
  common: {
    tier: "Common",
    percentileMin: 0,
    percentileMax: 50,
    fill: colors.lavender,
    text: colors.ink,
  },
  uncommon: {
    tier: "Uncommon",
    percentileMin: 50,
    percentileMax: 80,
    fill: colors.lilac,
    text: colors.ink,
  },
  rare: {
    tier: "Rare",
    percentileMin: 80,
    percentileMax: 95,
    fill: colors.sun,
    text: colors.ink,
  },
  mythic: {
    tier: "Mythic",
    percentileMin: 95,
    percentileMax: 100,
    fill: "linear-gradient(45deg, #FF6B5E, #FFD23F, #3DDBB0, #6C4CF1)",
    text: colors.ink,
  },
} as const;

export type TierKey = keyof typeof tiers;

export const typography = {
  fonts: {
    display: "var(--font-bricolage), sans-serif",
    body: "var(--font-inter), sans-serif",
  },
  weights: {
    display: {
      bold: 700,
      extraBold: 800,
    },
    body: {
      regular: 400,
      medium: 500,
      semiBold: 600,
    },
  },
  scale: {
    "display-xl": {
      fontSize: "clamp(40px, 12vw, 56px)",
      lineHeight: "1.0",
      fontWeight: 800,
      fontFamily: "var(--font-bricolage), sans-serif",
    },
    "display-l": {
      fontSize: "clamp(26px, 7vw, 32px)",
      lineHeight: "1.1",
      fontWeight: 800,
      fontFamily: "var(--font-bricolage), sans-serif",
    },
    "display-m": {
      fontSize: "20px",
      lineHeight: "1.2",
      fontWeight: 700,
      fontFamily: "var(--font-bricolage), sans-serif",
    },
    button: {
      fontSize: "16px",
      lineHeight: "1.0",
      fontWeight: 700,
      fontFamily: "var(--font-bricolage), sans-serif",
    },
    chip: {
      fontSize: "12px",
      lineHeight: "1.0",
      fontWeight: 700,
      fontFamily: "var(--font-bricolage), sans-serif",
    },
    body: {
      fontSize: "16px",
      lineHeight: "1.5",
      fontWeight: 400,
      fontFamily: "var(--font-inter), sans-serif",
    },
    "body-s": {
      fontSize: "14px",
      lineHeight: "1.5",
      fontWeight: 400,
      fontFamily: "var(--font-inter), sans-serif",
    },
    caption: {
      fontSize: "12px",
      lineHeight: "1.4",
      fontWeight: 500,
      fontFamily: "var(--font-inter), sans-serif",
    },
  },
} as const;

export const outlines = {
  outline: "2.5px solid #14123A",
  "outline-thin": "1.5px solid #14123A",
} as const;

export const radius = {
  s: "10px",
  m: "14px",
  l: "20px",
  pill: "999px",
} as const;

export const shadows = {
  sticker: "4px 4px 0 #14123A",
  "sticker-lift": "6px 6px 0 #14123A",
  "sticker-flat": "0 0 0 #14123A",
  card: "4px 4px 0 #14123A",
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
} as const;

export const motion = {
  durations: {
    press: "120ms",
    ui: "200ms",
    sheet: "240ms",
    flip: "750ms",
  },
  easings: {
    out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    snap: "cubic-bezier(0.3, 1.4, 0.5, 1)",
  },
} as const;

export const contrastPairs = [
  { fg: "ink", bg: "cream", minRatio: 4.5, role: "body text" },
  { fg: "ink", bg: "paper", minRatio: 4.5, role: "body text" },
  { fg: "paper", bg: "violet", minRatio: 4.5, role: "primary button label" },
  { fg: "ink", bg: "sun", minRatio: 4.5, role: "selected option, Rare chip" },
  { fg: "ink", bg: "coral", minRatio: 4.5, role: "streak chip" },
  { fg: "ink", bg: "mint", minRatio: 4.5, role: "success chip" },
  { fg: "ink", bg: "lavender", minRatio: 4.5, role: "Common chip" },
  { fg: "ink", bg: "lilac", minRatio: 4.5, role: "Uncommon chip" },
  { fg: "muted", bg: "cream", minRatio: 4.5, role: "secondary text" },
  { fg: "muted", bg: "paper", minRatio: 4.5, role: "secondary text" },
  { fg: "violet", bg: "cream", minRatio: 4.5, role: "links, focus ring, icons" },
] as const;
