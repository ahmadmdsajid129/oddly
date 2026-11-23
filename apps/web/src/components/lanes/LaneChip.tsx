"use client";

import React from "react";
import {
  Compass,
  Smile,
  Utensils,
  Gamepad2,
  Briefcase,
  Film,
  Music,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface LaneChipProps {
  name: string;
  slug?: string;
  accent?: string;
  iconKey?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

const ACCENT_STYLES: Record<string, string> = {
  violet: "bg-violet text-paper",
  sun: "bg-sun text-ink",
  mint: "bg-mint text-ink",
  coral: "bg-coral text-paper",
  lavender: "bg-lavender text-ink",
  lilac: "bg-lilac text-ink",
};

export function getLaneIcon(iconKey?: string, slug?: string) {
  const key = (iconKey || slug || "").toLowerCase();
  switch (key) {
    case "compass":
    case "everyday":
      return Compass;
    case "laugh":
    case "smile":
    case "memes":
      return Smile;
    case "utensils":
    case "food":
      return Utensils;
    case "gamepad":
    case "gaming":
      return Gamepad2;
    case "briefcase":
    case "work":
      return Briefcase;
    case "film":
    case "movies":
      return Film;
    case "music":
      return Music;
    case "message":
    case "situations":
      return MessageCircle;
    case "brain":
    case "deep":
      return HelpCircle;
    default:
      return Sparkles;
  }
}

/**
 * Universal Lane Chip component (Design System Sec 12C.3 & P10L.06)
 * Sticker Pop styling: ink outline (1.5px solid #14123A), hard sticker shadow (2px or 4px), rounded-pill.
 */
export function LaneChip({
  name,
  slug,
  accent = "lavender",
  iconKey,
  size = "md",
  showIcon = true,
  className,
  onClick,
}: LaneChipProps) {
  const accentClass = ACCENT_STYLES[accent.toLowerCase()] || "bg-lavender text-ink";
  const Icon = getLaneIcon(iconKey, slug);

  const Component = onClick ? "button" : "span";

  return (
    <Component
      data-testid={`lane-chip-${slug || "custom"}`}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border-[1.5px] border-ink font-display font-extrabold select-none transition-all",
        "shadow-sticker active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        accentClass,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        onClick && "cursor-pointer sticker-press",
        className
      )}
    >
      {showIcon && <Icon className={cn("stroke-[2.5] shrink-0", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />}
      <span className="leading-tight capitalize">{name}</span>
    </Component>
  );
}
