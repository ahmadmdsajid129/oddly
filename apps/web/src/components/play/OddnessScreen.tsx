"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CommonBadge,
  UncommonBadge,
  RareBadge,
  MythicBadge,
  fireConfetti,
} from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { feedback } from "@/lib/feedback";
import { ArrowLeft, Share2, Users, Flame } from "lucide-react";

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
}

export function OddnessScreen({
  oddness,
  onBackToTwin,
  onShare,
  onChallenge,
  onHome,
}: OddnessScreenProps) {
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

  const renderTierBadge = () => {
    const tier = oddness.tier.toLowerCase();
    if (tier === "mythic" || tier === "legendary") {
      return <MythicBadge percentile={oddness.percentile} />;
    }
    if (tier === "rare") {
      return <RareBadge percentile={oddness.percentile} />;
    }
    if (tier === "uncommon") {
      return <UncommonBadge percentile={oddness.percentile} />;
    }
    return <CommonBadge percentile={oddness.percentile} />;
  };

  const rarestPick = oddness.rarest_pick ?? {
    prompt: "Pick the colour that best describes your energy",
    value_label: "Luminous Violet",
    frequency_pct: 3.1,
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none">
      <Atmosphere mode="hero" />

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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer text-xs font-heading font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Twin Match</span>
        </button>

        <span className="font-heading text-xs font-bold uppercase tracking-widest text-text-muted">
          Oddness Score
        </span>

        {onShare && (
          <button
            type="button"
            onClick={onShare}
            aria-label="Share card"
            className="p-2 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Main Oddness Card Content */}
      <main className="relative z-20 w-full max-w-md mx-auto my-auto flex flex-col items-center text-center space-y-6 py-2">
        {/* Tier Badge with spring pop animation */}
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
          className="pt-2"
        >
          {renderTierBadge()}
        </motion.div>

        {/* Big Percentile Display */}
        <div className="space-y-2">
          <motion.div
            key={displayPercentile}
            className="font-heading text-6xl sm:text-7xl font-extrabold text-text tracking-tight tabular-nums"
          >
            {displayPercentile}%
          </motion.div>
          <p className="text-sm sm:text-base font-body text-text-secondary max-w-xs mx-auto">
            Rarer than <strong className="text-text font-semibold">{targetPercentile}%</strong> of today&apos;s players worldwide.
          </p>
        </div>

        {/* Rarest Pick Card */}
        <Card variant="glass" className="w-full p-5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-coral" />
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-coral">
              Your Rarest Pick Today
            </span>
          </div>

          <p className="text-xs text-text-muted leading-tight">
            {rarestPick.prompt}
          </p>

          <div className="p-3 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
            <span className="font-heading font-bold text-sm sm:text-base text-text">
              {rarestPick.value_label}
            </span>
            <span className="text-xs font-semibold text-mint bg-mint/10 border border-mint/20 px-2.5 py-1 rounded-full">
              Only {rarestPick.frequency_pct}% picked this
            </span>
          </div>
        </Card>

        {/* Share & Challenge CTAs */}
        <div className="w-full space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-base font-bold shadow-lg"
            onClick={() => {
              feedback.playSound("tick");
              if (onShare) onShare();
            }}
          >
            <Share2 className="w-5 h-5 text-midnight" />
            <span>Share my card</span>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => {
              feedback.playSound("tick");
              if (onChallenge) onChallenge();
            }}
          >
            <Users className="w-5 h-5" />
            <span>Challenge a friend</span>
          </Button>

          {onHome && (
            <button
              type="button"
              onClick={onHome}
              className="text-xs text-text-muted hover:text-text transition-colors pt-1 cursor-pointer"
            >
              Back to Home
            </button>
          )}
        </div>
      </main>

      <footer className="relative z-20 text-center pb-2 text-xs text-text-muted">
        Shannon Entropy Engine • Computed across today&apos;s active player distribution
      </footer>
    </div>
  );
}
