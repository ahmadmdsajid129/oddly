"use client";

import React, { useEffect } from "react";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { Button } from "@/components/ui/Button";
import { feedback } from "@/lib/feedback";
import { Flame, Trophy, Award, Crown, Sparkles } from "lucide-react";

export type MilestoneTier = 7 | 30 | 100 | 365;

interface MilestoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneTier;
  onShare?: () => void;
}

const MILESTONE_CONFIG: Record<
  MilestoneTier,
  {
    title: string;
    subtitle: string;
    description: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  7: {
    title: "7-Day Bronze Flame",
    subtitle: "One full week of stranger twin matches",
    description:
      "You've shown up every day for 7 days straight. Only 18% of all players reach this dedication.",
    color: "from-amber-500 to-flame",
    icon: Flame,
  },
  30: {
    title: "30-Day Silver Moon",
    subtitle: "One entire calendar month",
    description:
      "A complete month of daily five-pick rituals across the globe. You're now in the top 5% of all twin seekers.",
    color: "from-slate-300 to-indigo-400",
    icon: Award,
  },
  100: {
    title: "100-Day Gold Century",
    subtitle: "Century Club Legend",
    description:
      "100 consecutive days of unearthing human coincidences. An extraordinary milestone in Oddly history.",
    color: "from-yellow-400 to-amber-600",
    icon: Trophy,
  },
  365: {
    title: "365-Day Solar Eclipse",
    subtitle: "One Full Trip Around The Sun",
    description:
      "A perfect year of stranger connections. You have unlocked the immutable obsidian permanent badge.",
    color: "from-purple-500 to-mint",
    icon: Crown,
  },
};

export function MilestoneModal({
  open,
  onOpenChange,
  milestone,
  onShare,
}: MilestoneModalProps) {
  const config = MILESTONE_CONFIG[milestone] || MILESTONE_CONFIG[7];
  const IconComponent = config.icon;

  useEffect(() => {
    if (open) {
      feedback.playSound("chime");
      feedback.triggerHaptic("reveal");
    }
  }, [open]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col items-center text-center px-2 py-4">
        {/* Glow Badge */}
        <div
          className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${config.color} p-0.5 shadow-2xl mb-5 flex items-center justify-center animate-bounce`}
        >
          <div className="w-full h-full rounded-[22px] bg-surface flex items-center justify-center">
            <IconComponent className="w-10 h-10 text-flame" />
          </div>
        </div>

        {/* Milestone Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-flame/10 border border-flame/20 text-flame text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{milestone} Consecutive Days</span>
        </div>

        {/* Headline */}
        <h2 className="font-heading text-2xl font-bold text-text mb-1">
          {config.title}
        </h2>
        <p className="font-heading text-sm text-mint font-semibold mb-3">
          {config.subtitle}
        </p>

        {/* Description */}
        <p className="text-sm font-body text-text-muted max-w-sm mb-6 leading-relaxed">
          {config.description}
        </p>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-3">
          {onShare && (
            <Button variant="primary" size="lg" onClick={onShare} className="w-full">
              Share Milestone Card
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={() => onOpenChange(false)}
            className="w-full text-text-muted hover:text-text"
          >
            Keep the streak going
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
