"use client";

import React, { useEffect, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "@/components/ui/Card";
import { feedback } from "@/lib/feedback";
import { fireConfetti } from "@/components/icons";
import { ArrowLeft, Share2, Users, Flame, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export interface OddnessData {
  percentile: number;
  tier: "Common" | "Uncommon" | "Rare" | "Mythic" | "Legendary";
  raw_score?: number;
  rarest_pick?: {
    prompt: string;
    value_label: string;
    frequency_pct: number;
  };
}

interface OddnessScreenProps {
  oddness: OddnessData;
  onBackToTwin: () => void;
  onShare?: () => void;
  onChallenge?: () => void;
  onHome?: () => void;
  onAntiTwin?: () => void;
}

export function OddnessScreen({
  oddness,
  onBackToTwin,
  onShare,
  onChallenge,
  onHome,
  onAntiTwin,
}: OddnessScreenProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const targetPercentile = Math.round(oddness.percentile);
  const [displayPercentile, setDisplayPercentile] = useState<number>(
    shouldReduceMotion ? targetPercentile : 0
  );

  // Animate percentile count-up
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayPercentile(targetPercentile);
      return;
    }

    feedback.playSound("celebrate");
    if (targetPercentile >= 85) {
      fireConfetti();
    }

    let current = 0;
    const step = Math.max(1, Math.floor(targetPercentile / 25));
    const interval = setInterval(() => {
      current += step;
      if (current >= targetPercentile) {
        setDisplayPercentile(targetPercentile);
        clearInterval(interval);
      } else {
        setDisplayPercentile(current);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [targetPercentile, shouldReduceMotion]);

  const rarestPick = oddness.rarest_pick ?? {
    prompt: "Pick the colour that best describes your energy",
    value_label: "Luminous Violet",
    frequency_pct: 3.1,
  };

  return (
    <div
      data-testid="oddness-card"
      className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none bg-cream"
    >
      <Atmosphere />

      {/* Screen Reader Summary */}
      <div aria-live="polite" className="sr-only">
        Oddness Score: Rarer than {targetPercentile}% of today&apos;s players. Tier: {oddness.tier}.
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
        <button
          type="button"
          onClick={onBackToTwin}
          aria-label="Back to twin match"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer text-xs font-display font-bold min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Twin Match</span>
        </button>

        <span className="font-display text-xs font-extrabold uppercase tracking-widest text-muted">
          Oddness Score
        </span>

        {onShare ? (
          <button
            type="button"
            onClick={onShare}
            aria-label="Share card"
            className="p-2.5 rounded-pill border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </header>

      {/* Main Oddness Card Content */}
      <main className="relative z-20 w-full max-w-md mx-auto my-auto flex flex-col items-center text-center space-y-6 py-2">
        {/* Tier Badge with spring pop animation */}
        <div className="pt-2">
          <TierBadge tier={oddness.tier} />
        </div>

        {/* Big Percentile Display */}
        <div className="space-y-2">
          <div
            className="font-display text-6xl sm:text-7xl font-extrabold text-ink tracking-tight tabular-nums"
          >
            {displayPercentile}%
          </div>
          <p className="text-body font-body text-muted max-w-xs mx-auto">
            Rarer than <strong className="text-ink font-bold">{targetPercentile}%</strong> of today&apos;s players worldwide.
          </p>
        </div>

        {/* Rarest Pick Card - Section 4: paper, outline 2.5px solid ink, shadow-sticker */}
        <div className="w-full p-5 text-left space-y-3 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-coral stroke-[2.5]" />
            <span className="text-caption font-display font-extrabold uppercase tracking-wider text-coral">
              Your Rarest Pick Today
            </span>
          </div>

          <p className="text-body-s font-body text-muted leading-tight">
            {rarestPick.prompt}
          </p>

          <div className="p-3.5 rounded-m bg-cream border-[1.5px] border-ink flex items-center justify-between gap-3">
            <span className="font-display font-extrabold text-sm sm:text-base text-ink truncate">
              {rarestPick.value_label}
            </span>
            {/* Audit fix: Mint is fill with ink text, never mint text on light! */}
            <span className="text-caption font-display font-extrabold text-ink bg-mint border-[1.5px] border-ink px-2.5 py-1 rounded-pill shrink-0">
              Only {rarestPick.frequency_pct}%
            </span>
          </div>
        </div>

        {/* Share & Challenge CTAs */}
        <div className="w-full space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              feedback.playSound("tick");
              if (onShare) onShare();
            }}
          >
            <Share2 className="w-5 h-5 stroke-[2.5]" />
            <span>Share my card</span>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              feedback.playSound("tick");
              if (onChallenge) onChallenge();
            }}
          >
            <Users className="w-5 h-5 stroke-[2.5]" />
            <span>Challenge a friend</span>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full bg-paper text-ink border-[2.5px] border-ink shadow-sticker hover:bg-cream"
            onClick={() => {
              feedback.playSound("tick");
              if (onAntiTwin) {
                onAntiTwin();
              } else {
                router.push("/anti-twin");
              }
            }}
          >
            <Sparkles className="w-5 h-5 text-coral stroke-[2.5]" />
            <span>See your opposite today</span>
          </Button>

          {onHome && (
            <button
              type="button"
              onClick={onHome}
              className="text-body-s font-display font-bold text-muted hover:text-ink transition-colors pt-1 cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              Back to Home
            </button>
          )}
        </div>
      </main>

      <footer className="relative z-20 text-center pb-2 text-caption text-muted">
        Shannon Entropy Engine • Computed across today&apos;s active player distribution
      </footer>
    </div>
  );
}
