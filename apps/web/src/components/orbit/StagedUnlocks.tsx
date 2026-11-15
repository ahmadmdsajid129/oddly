"use client";

import React from "react";
import { Check, Lock, Sparkles, Trophy } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface Milestone {
  day: number;
  title: string;
  description: string;
}

export const ORBIT_MILESTONES: Milestone[] = [
  { day: 1, title: "Globe Line", description: "Glowing violet connection on the Twin Globe" },
  { day: 3, title: "Pick Overlap", description: "Inspect full history of shared choices" },
  { day: 7, title: "Telepathy Sync", description: "Guess each other's pick on daily drops" },
  { day: 14, title: "Orbit Card", description: "Collectible holographic pair card" },
  { day: 30, title: "Co-Anniversary", description: "Exclusive 30-day bond badge" },
];

export interface StagedUnlocksProps {
  currentStreak: number;
  bestStreak?: number;
  className?: string;
}

export function StagedUnlocks({
  currentStreak,
  bestStreak = 0,
  className,
}: StagedUnlocksProps) {
  // Find next milestone
  const nextMilestone = ORBIT_MILESTONES.find((m) => currentStreak < m.day) || null;
  const daysRemaining = nextMilestone ? nextMilestone.day - currentStreak : 0;

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4 select-none",
        className
      )}
    >
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
        <div>
          <span className="font-display text-xs font-bold text-muted uppercase tracking-wider block">
            Staged Unlocks
          </span>
          <h3 className="font-display text-base font-extrabold text-ink mt-0.5">
            Co-Streak Milestones
          </h3>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-coral border-[1.5px] border-ink text-xs font-display font-extrabold text-ink shadow-sticker-flat">
          <span>🔥</span>
          <span>{currentStreak} Day Co-Streak</span>
        </div>
      </div>

      {/* Horizontal Progression Track */}
      <div className="relative py-3">
        {/* Connecting track line */}
        <div className="absolute top-7 left-4 right-4 h-1 bg-cream border-[1px] border-ink z-0" />

        {/* 5 Nodes */}
        <div className="relative z-10 flex items-start justify-between">
          {ORBIT_MILESTONES.map((milestone) => {
            const isUnlocked = currentStreak >= milestone.day;
            const isNext = nextMilestone?.day === milestone.day;

            return (
              <div
                key={milestone.day}
                className="flex flex-col items-center text-center max-w-[56px] space-y-1.5"
              >
                {/* Milestone Node Circle */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-pill border-[2px] border-ink flex items-center justify-center font-display text-xs font-extrabold transition-all",
                    isUnlocked
                      ? "bg-mint text-ink shadow-sticker-flat"
                      : isNext
                      ? "bg-sun text-ink shadow-sticker animate-pulse"
                      : "bg-paper text-muted opacity-80"
                  )}
                  title={`${milestone.title} (Day ${milestone.day})`}
                >
                  {isUnlocked ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isNext ? (
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 stroke-[2]" />
                  )}
                </div>

                {/* Day Badge */}
                <span
                  className={cn(
                    "text-[10px] font-display font-bold leading-tight",
                    isUnlocked ? "text-ink" : "text-muted"
                  )}
                >
                  Day {milestone.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Unlock Banner */}
      {nextMilestone ? (
        <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-pill bg-paper border-[1.5px] border-ink flex items-center justify-center flex-shrink-0">
            <Trophy className="w-3.5 h-3.5 text-coral stroke-[2.5]" />
          </div>
          <div className="text-xs">
            <span className="font-display font-extrabold text-ink">
              Next Unlock: {nextMilestone.title}
            </span>
            <p className="font-body text-muted leading-tight mt-0.5">
              {daysRemaining} more {daysRemaining === 1 ? "day" : "days"} to unlock:{" "}
              {nextMilestone.description}.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-m bg-mint/20 border-[1.5px] border-ink text-center text-xs font-display font-bold text-ink">
          🎉 All core milestones unlocked! Co-streak champion!
        </div>
      )}
    </div>
  );
}
