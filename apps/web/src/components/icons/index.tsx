"use client";

import React from "react";
import confetti from "canvas-confetti";

/**
 * BrandMark: "Two circles, one overlap"
 * Violet circle left, Coral circle right, luminous Mint overlap center.
 */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const height = Math.round((size * 24) / 36);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Oddly brand mark"
    >
      <circle cx="12" cy="12" r="10" fill="#8B72FF" fillOpacity="0.85" />
      <circle cx="24" cy="12" r="10" fill="#FF8176" fillOpacity="0.85" />
      <path
        d="M18 4.2C15.9 6.2 14.6 8.9 14.6 12C14.6 15.1 15.9 17.8 18 19.8C20.1 17.8 21.4 15.1 21.4 12C21.4 8.9 20.1 6.2 18 4.2Z"
        fill="#3DDBB0"
      />
    </svg>
  );
}

/**
 * StreakFlame: Stylized flame with coral-to-amber gradient
 */
export function StreakFlame({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Streak flame"
    >
      <defs>
        <linearGradient id="oddly-flame-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD23F" />
          <stop offset="50%" stopColor="#FF8176" />
          <stop offset="100%" stopColor="#6C4CF1" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C10.5 5 7.5 7.5 7.5 11C7.5 8.5 6 9.5 5 11C4 12.5 3 14.5 3 17C3 20.3 6 22 12 22C18 22 21 20.3 21 17C21 13 18.5 9 14.5 7C14.5 9 13.5 10 12 10C12 7.5 13 4.5 12 2Z"
        fill="url(#oddly-flame-grad)"
      />
      <path
        d="M12 13C10.5 14.5 10 16 10 17.5C10 19.4 11.1 20.5 12 20.5C12.9 20.5 14 19.4 14 17.5C14 16 13.5 14.5 12 13Z"
        fill="#FFF8F0"
        fillOpacity="0.8"
      />
    </svg>
  );
}

/**
 * Common Tier Badge (0 - 49.9%)
 */
export function CommonBadge({ percentile }: { percentile?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
      <span>Common</span>
      {typeof percentile === "number" && <span className="font-mono text-text">{percentile.toFixed(1)}%</span>}
    </span>
  );
}

/**
 * Uncommon Tier Badge (50 - 79.9%)
 */
export function UncommonBadge({ percentile }: { percentile?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-mint/60 text-xs font-semibold text-mint uppercase tracking-wider shadow-[0_0_12px_rgba(61,219,176,0.2)]">
      <span>Uncommon</span>
      {typeof percentile === "number" && <span className="font-mono font-bold text-mint">{percentile.toFixed(1)}%</span>}
    </span>
  );
}

/**
 * Rare Tier Badge (80 - 94.9%)
 */
export function RareBadge({ percentile }: { percentile?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet to-mint text-xs font-bold text-midnight uppercase tracking-wider shadow-[0_0_20px_rgba(61,219,176,0.45)]">
      <span>★ Rare</span>
      {typeof percentile === "number" && <span className="font-mono text-midnight">{percentile.toFixed(1)}%</span>}
    </span>
  );
}

/**
 * Mythic Tier Badge (95 - 100%)
 */
export function MythicBadge({ percentile }: { percentile?: number }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-[0_0_28px_rgba(139,114,255,0.6)] overflow-hidden border border-white/40">
      <span className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#8B72FF,#FF8176,#FFD23F,#3DDBB0,#8B72FF)] opacity-90 animate-spin [animation-duration:8s]" />
      <span className="relative z-10 flex items-center gap-1.5 text-midnight font-extrabold drop-shadow-sm">
        <span>✦ Mythic</span>
        {typeof percentile === "number" && <span className="font-mono">{percentile.toFixed(1)}%</span>}
      </span>
    </span>
  );
}

/**
 * Trigger celebration confetti for high match scores (4/5, 5/5) and streak milestones
 */
export function fireConfetti() {
  if (typeof window === "undefined") return;

  const count = 120;
  const defaults = {
    origin: { y: 0.65 },
    colors: ["#6C4CF1", "#FF6B5E", "#3DDBB0", "#FFD23F", "#FFFFFF"],
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
