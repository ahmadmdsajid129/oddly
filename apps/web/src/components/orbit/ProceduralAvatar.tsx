"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Sticker pop color pairs
const PALETTE_PAIRS = [
  { primary: "#6C4CF1", secondary: "#EEEAFE" }, // Violet + Lavender
  { primary: "#3DDBB0", secondary: "#14123A" }, // Mint + Ink
  { primary: "#FF6B5E", secondary: "#FFF8F0" }, // Coral + Cream
  { primary: "#FFD23F", secondary: "#6C4CF1" }, // Sun + Violet
  { primary: "#CDBFFF", secondary: "#FF6B5E" }, // Lilac + Coral
];

export interface ProceduralAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

/** Simple fast deterministic string hash */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function ProceduralAvatar({
  seed,
  size = 48,
  className,
}: ProceduralAvatarProps) {
  const hash = hashString(seed || "oddly-orbit");
  const pair = PALETTE_PAIRS[hash % PALETTE_PAIRS.length]!;
  const patternType = (hash >> 3) % 4;

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-pill border-[2.5px] border-ink shadow-sticker overflow-hidden flex items-center justify-center flex-shrink-0 bg-paper",
        className
      )}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" fill={pair.secondary} />
        {patternType === 0 && (
          // Intersecting double discs
          <>
            <circle cx="18" cy="24" r="14" fill={pair.primary} />
            <circle
              cx="30"
              cy="24"
              r="14"
              fill={pair.secondary}
              stroke="#14123A"
              strokeWidth="2"
              fillOpacity="0.7"
            />
          </>
        )}
        {patternType === 1 && (
          // Concentric geometric ring & diamond
          <>
            <circle cx="24" cy="24" r="16" fill={pair.primary} />
            <rect
              x="17"
              y="17"
              width="14"
              height="14"
              transform="rotate(45 24 24)"
              fill={pair.secondary}
              stroke="#14123A"
              strokeWidth="2"
            />
          </>
        )}
        {patternType === 2 && (
          // Yin-yang / two-tone crescent
          <>
            <path
              d="M24 6 A 18 18 0 0 1 24 42 A 9 9 0 0 1 24 24 A 9 9 0 0 0 24 6"
              fill={pair.primary}
            />
            <circle cx="24" cy="15" r="4" fill={pair.secondary} />
            <circle cx="24" cy="33" r="4" fill={pair.primary} />
          </>
        )}
        {patternType === 3 && (
          // Dual overlapping petals
          <>
            <ellipse
              cx="24"
              cy="24"
              rx="18"
              ry="10"
              transform="rotate(-30 24 24)"
              fill={pair.primary}
            />
            <ellipse
              cx="24"
              cy="24"
              rx="18"
              ry="10"
              transform="rotate(60 24 24)"
              fill={pair.secondary}
              stroke="#14123A"
              strokeWidth="1.5"
              fillOpacity="0.8"
            />
          </>
        )}
      </svg>
    </div>
  );
}
