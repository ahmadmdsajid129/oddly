"use client";

import React, { useState } from "react";
import { Flame } from "lucide-react";

interface StreakFlameProps {
  streak: number;
  longestStreak?: number;
  nextMilestone?: number;
  onFlameClick?: () => void;
  className?: string;
}

// Section 7: Streak chip = coral with a flame icon. Display 700 12, padding 4x10, radius-pill, outline-thin, ink text on its fill.
export function StreakFlame({
  streak,
  longestStreak,
  nextMilestone = 7,
  onFlameClick,
  className = "",
}: StreakFlameProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isActive = streak > 0;
  const daysRemaining = Math.max(0, nextMilestone - streak);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={onFlameClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill border-[1.5px] border-ink font-display font-bold text-chip select-none cursor-pointer sticker-press min-h-[36px] ${
          isActive
            ? "bg-coral text-ink shadow-sm"
            : "bg-paper text-muted"
        }`}
        aria-label={`${streak} day streak`}
        title={`${streak} day streak`}
      >
        <Flame
          className={`w-3.5 h-3.5 stroke-[2.5] ${
            isActive ? "text-ink" : "text-muted"
          }`}
        />
        <span className="tabular-nums">
          {streak}
        </span>
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-m bg-paper border-[1.5px] border-ink shadow-sticker text-ink text-caption font-bold whitespace-nowrap"
        >
          {isActive ? (
            <span>{streak} day streak • {daysRemaining} days to next milestone</span>
          ) : (
            <span>Start your streak today!</span>
          )}
        </div>
      )}
    </div>
  );
}
