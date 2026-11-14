"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type CardVariant = "default" | "elevated" | "interactive" | "glass";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({
  variant = "default",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  // Static layout containers use outline-thin (1.5px) with no shadow.
  // Tappable containers use outline (2.5px solid ink) with shadow-sticker.
  const isInteractive = interactive || variant === "interactive";

  return (
    <div
      className={cn(
        "rounded-l p-5 sm:p-6 bg-paper text-ink",
        isInteractive
          ? "border-[2.5px] border-ink shadow-sticker sticker-press cursor-pointer"
          : "border-[1.5px] border-ink",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Section 7: Chip: Display 700 12, padding 4 x 10, radius-pill, outline-thin, ink text on its fill.
export function Chip({
  selected = false,
  fill = "lavender",
  onClick,
  className,
  children,
}: {
  selected?: boolean;
  fill?: "lavender" | "coral" | "mint" | "sun" | "lilac" | "paper";
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const fillStyles: Record<string, string> = {
    lavender: "bg-lavender text-ink",
    coral: "bg-coral text-ink",
    mint: "bg-mint text-ink",
    sun: "bg-sun text-ink",
    lilac: "bg-lilac text-ink",
    paper: "bg-paper text-ink",
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-pill font-display font-bold text-chip border-[1.5px] border-ink transition-all duration-120 select-none cursor-pointer sticker-press min-h-[44px]",
          selected ? "bg-sun shadow-sticker" : cn(fillStyles[fill], "shadow-sticker"),
          className
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-pill font-display font-bold text-chip border-[1.5px] border-ink select-none",
        fillStyles[fill],
        className
      )}
    >
      {children}
    </span>
  );
}

// Section 2.3: Tier Badge (Common, Uncommon, Rare, Mythic)
export function TierBadge({
  tier,
  className,
}: {
  tier: "Common" | "Uncommon" | "Rare" | "Mythic" | string;
  className?: string;
}) {
  const normalized = tier.toLowerCase();

  if (normalized === "mythic") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill font-display font-bold text-chip text-ink border-[1.5px] border-ink shadow-sm bg-gradient-to-r from-coral via-sun via-mint to-violet",
          className
        )}
      >
        <span>Mythic</span>
      </span>
    );
  }

  if (normalized === "rare") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill font-display font-bold text-chip text-ink border-[1.5px] border-ink bg-sun",
          className
        )}
      >
        <span>Rare</span>
      </span>
    );
  }

  if (normalized === "uncommon") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill font-display font-bold text-chip text-ink border-[1.5px] border-ink bg-lilac",
          className
        )}
      >
        <span>Uncommon</span>
      </span>
    );
  }

  // Common default
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill font-display font-bold text-chip text-ink border-[1.5px] border-ink bg-lavender",
        className
      )}
    >
      <span>Common</span>
    </span>
  );
}

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: "default" | "mint" | "violet" | "coral";
  className?: string;
  children: React.ReactNode;
}) {
  const variantStyles = {
    default: "bg-lavender text-ink border-[1.5px] border-ink",
    mint: "bg-mint text-ink border-[1.5px] border-ink",
    violet: "bg-violet text-paper border-[1.5px] border-ink",
    coral: "bg-coral text-ink border-[1.5px] border-ink",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-pill text-chip font-display font-bold border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
