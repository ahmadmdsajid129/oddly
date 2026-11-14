"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { BrandMark, fireConfetti } from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { FlipCard } from "@/components/share/FlipCard";
import { feedback } from "@/lib/feedback";
import { Share2, ArrowRight } from "lucide-react";

export interface TwinMatchData {
  matched_picks: number;
  total_picks?: number;
  dice_coefficient: number;
  twin_location: string;
  twin_age_band?: string;
  is_provisional: boolean;
  total_players_today?: number;
  pick_matches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
}

interface TwinRevealScreenProps {
  match: TwinMatchData;
  onSeeOddness: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

export function TwinRevealScreen({
  match,
  onSeeOddness,
  onShare,
  onClose,
}: TwinRevealScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const matchedPicks = match.matched_picks ?? 4;
  const totalPicks = match.total_picks ?? 5;

  const tier = matchedPicks === 5 ? "Mythic" : matchedPicks >= 4 ? "Rare" : matchedPicks >= 3 ? "Uncommon" : "Common";

  // Confetti trigger - Section 10: Mythic (24 particles), Rare (8 particles)
  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = setTimeout(() => {
      if (tier === "Mythic" || matchedPicks >= 4) {
        fireConfetti();
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [tier, matchedPicks, shouldReduceMotion]);

  const rarityText =
    matchedPicks === 5
      ? "You matched all 5 picks! A true statistical twin."
      : matchedPicks === 4
      ? "Only 0.4% of players matched you today."
      : "A unique connection found in today's drop.";

  return (
    <div
      data-testid="twin-reveal-card"
      className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none bg-cream"
    >
      <Atmosphere />

      {/* Screen Reader Announcement */}
      <div aria-live="polite" className="sr-only">
        Stranger Twin Found. You matched {matchedPicks} of {totalPicks} picks with someone in {match.twin_location}.
      </div>

      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-2">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-display text-xl font-extrabold text-ink">oddly</span>
        </div>

        {onClose && (
          <Button
            variant="close"
            onClick={onClose}
            aria-label="Close"
          />
        )}
      </header>

      {/* Centerpiece: Hero Flip Share Card */}
      <main className="relative z-20 w-full max-w-md mx-auto my-auto flex flex-col items-center text-center space-y-4 py-2">
        <div className="space-y-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-violet px-3 py-1 bg-lavender rounded-pill border-[1.5px] border-ink">
            Stranger Twin Revealed
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink pt-1">
            You have a twin today!
          </h1>
        </div>

        {/* The Hero Flippable Sticker Card */}
        <FlipCard
          matchedPicks={matchedPicks}
          totalPicks={totalPicks}
          tier={tier}
          location={`Stranger in ${match.twin_location}`}
          rarityText={rarityText}
          pickMatches={match.pick_matches}
          autoFlip={true}
        />
      </main>

      {/* Bottom CTAs: See Oddness (Primary) & Share (Secondary) */}
      <footer className="relative z-20 w-full max-w-md mx-auto pb-4 space-y-3">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onSeeOddness}
        >
          <span>See how odd you are</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </Button>

        {onShare && (
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>Share your card</span>
          </Button>
        )}
      </footer>
    </div>
  );
}
