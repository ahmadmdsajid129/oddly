/**
 * @file confetti.ts
 *
 * Isolated dynamic confetti trigger (Stage R2-PATCH-2 Item 3)
 * Lazy-loads canvas-confetti only when a high match or streak celebration occurs,
 * completely removing canvas-confetti from the initial bundle.
 */

import { colors } from "@oddly/ui-tokens";

export async function fireConfetti(): Promise<void> {
  if (typeof window === "undefined") return;

  const confettiModule = await import("canvas-confetti");
  const confetti = confettiModule.default || confettiModule;

  const count = 120;
  const defaults = {
    origin: { y: 0.65 },
    colors: [colors.violet, colors.coral, colors.mint, colors.sun, colors.paper],
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.6),
    spread: 60,
  });

  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.4),
    spread: 100,
    decay: 0.91,
    scalar: 1.2,
  });
}

