import type { Config } from "tailwindcss";
import { colors, radius, spacing, shadows } from "./tokens";

export const oddlyTailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Canonical 11 Sticker Pop tokens (Section 2.1)
        ink: colors.ink,
        cream: colors.cream,
        paper: colors.paper,
        violet: colors.violet,
        lavender: colors.lavender,
        coral: colors.coral,
        mint: colors.mint,
        sun: colors.sun,
        muted: colors.muted,
        lilac: colors.lilac,
        error: colors.error,

        // Semantic aliases for Sticker Pop design system
        bg: colors.cream,
        surface: colors.paper,
        "surface-2": colors.lavender,
        border: colors.ink,
        text: {
          DEFAULT: colors.ink,
          muted: colors.muted,
        },
        danger: colors.error,
        warning: colors.sun,
        success: colors.mint,
      },
      borderRadius: {
        s: radius.s,
        m: radius.m,
        l: radius.l,
        pill: radius.pill,
        full: radius.pill,
      },
      boxShadow: {
        sticker: shadows.sticker,
        "sticker-lift": shadows["sticker-lift"],
        "sticker-flat": shadows["sticker-flat"],
        card: shadows.card,
      },
      spacing: spacing,
      fontFamily: {
        display: ["var(--font-bricolage)", "sans-serif"],
        heading: ["var(--font-bricolage)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(40px, 12vw, 56px)", { lineHeight: "1.0", fontWeight: "800" }],
        "display-l": ["clamp(26px, 7vw, 32px)", { lineHeight: "1.1", fontWeight: "800" }],
        "display-m": ["20px", { lineHeight: "1.2", fontWeight: "700" }],
        button: ["16px", { lineHeight: "1.0", fontWeight: "700" }],
        chip: ["12px", { lineHeight: "1.0", fontWeight: "700" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-s": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
};

export * from "./tokens";
