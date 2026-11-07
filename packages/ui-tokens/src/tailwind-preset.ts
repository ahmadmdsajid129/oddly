import type { Config } from "tailwindcss";
import { colors, radius, spacing, typography } from "./tokens.js";

export const oddlyTailwindPreset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        midnight: "var(--color-midnight)",
        violet: {
          DEFAULT: "var(--color-violet)",
          press: "var(--color-violet-press)",
        },
        coral: "var(--color-coral)",
        mint: "var(--color-mint)",
        cream: "var(--color-cream)",
        lavender: "var(--color-lavender)",
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
        },
        border: "var(--color-border)",
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
      },
      borderRadius: radius,
      spacing: spacing,
      fontFamily: {
        heading: [typography.fontHeading],
        body: [typography.fontBody],
      },
    },
  },
};

export { colors, radius, spacing, typography };
