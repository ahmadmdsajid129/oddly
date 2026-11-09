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
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
          isActive
            ? "bg-flame/15 border-flame/30 text-flame shadow-[0_0_12px_rgba(255,107,107,0.25)] hover:bg-flame/20"
            : "bg-surface-2 border-border text-text-muted hover:text-text"
        }`}
        aria-label={`${streak} day streak`}
        title={`${streak} day streak`}
      >
        <Flame
          className={`w-4 h-4 transition-transform ${
            isActive ? "text-flame animate-pulse" : "text-text-muted"
          }`}
        />
        <span className="font-heading text-xs font-bold tracking-tight">
          {streak}
        </span>
      </button>

      {/* Hover / Tap Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-48 p-2.5 rounded-2xl bg-surface border border-border shadow-xl text-left pointer-events-none backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
            <Flame className="w-3.5 h-3.5 text-flame" />
            <span>{isActive ? `${streak} Day Streak!` : "No Active Streak"}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">
            {isActive
              ? daysRemaining > 0
                ? `${daysRemaining} more days until your ${nextMilestone}-day milestone.`
                : "Milestone achieved today!"
              : "Play today's drop to start a new daily streak."}
          </p>
          {longestStreak !== undefined && longestStreak > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50 text-[10px] text-text-muted">
              Best record: <strong className="text-text">{longestStreak} days</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
