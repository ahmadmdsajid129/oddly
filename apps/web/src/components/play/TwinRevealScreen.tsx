"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { BrandMark, fireConfetti } from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { FlipCard, type LaneInfo } from "@/components/share/FlipCard";
import { LaneChip } from "@/components/lanes/LaneChip";
import { feedback } from "@/lib/feedback";
import { Share2, ArrowRight, ChevronDown, ChevronUp, Users, CheckCircle } from "lucide-react";

export interface TwinMatchData {
  matched_picks: number;
  total_picks?: number;
  dice_coefficient: number;
  twin_location: string;
  twin_age_band?: string;
  is_provisional: boolean;
  total_players_today?: number;
  tie_group_size?: number;
  is_mutual?: boolean;
  tie_break_reason?: string;
  history_days?: number;
  why_you_two?: Array<{
    question_id: string;
    value: unknown;
    rarity_percent: number;
  }>;
  pick_matches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
}

interface TwinRevealScreenProps {
  match: TwinMatchData;
  lane?: LaneInfo;
  onSeeOddness: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

export function TwinRevealScreen({
  match,
  lane,
  onSeeOddness,
  onShare,
  onClose,
}: TwinRevealScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isWhyOpen, setIsWhyOpen] = useState(false);
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
          {lane && (
            <LaneChip
              name={lane.name}
              slug={lane.slug}
              accent={lane.accent || "lavender"}
              iconKey={lane.iconKey}
              size="sm"
            />
          )}
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
          lane={lane}
          location={`Stranger in ${match.twin_location}`}
          rarityText={rarityText}
          pickMatches={match.pick_matches}
          autoFlip={true}
        />

        {/* Stage L3 (Phase 10N): Honest Group Size & Mutual Pairing Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {match.is_mutual && (
            <span
              data-testid="badge-mutual-twin"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-mint text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat"
            >
              <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mutual Twin</span>
            </span>
          )}

          {match.total_players_today !== undefined && match.total_players_today < 200 ? (
            <span
              data-testid="badge-closest-so-far"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-sun text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat"
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Closest so far</span>
            </span>
          ) : match.tie_group_size === 1 ? (
            <span
              data-testid="badge-unique-twin"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-lavender text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat"
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>1 of 1 unique pair</span>
            </span>
          ) : match.tie_group_size && match.tie_group_size > 1 ? (
            <span
              data-testid="badge-tie-group"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-lavender text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat"
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{match.tie_group_size} people matched you this way</span>
            </span>
          ) : null}
        </div>

        {/* Stage L3: "Why you two?" Accordion */}
        {match.why_you_two && match.why_you_two.length > 0 && (
          <div
            data-testid="accordion-why-you-two"
            className="w-full max-w-sm text-left bg-paper rounded-m border-[2px] border-ink shadow-card p-3 space-y-2 mt-2"
          >
            <button
              type="button"
              onClick={() => {
                feedback.triggerHaptic("select");
                setIsWhyOpen((prev) => !prev);
              }}
              className="w-full flex items-center justify-between text-left font-display text-xs font-extrabold text-ink select-none cursor-pointer"
              aria-expanded={isWhyOpen}
            >
              <span className="flex items-center gap-1.5">
                <span>Why you two?</span>
                <span className="text-[10px] text-muted font-normal">(rarest shared answers)</span>
              </span>
              {isWhyOpen ? (
                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>

            {isWhyOpen && (
              <div className="space-y-2 pt-2 border-t-[1.5px] border-ink/20">
                {match.why_you_two.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-s bg-cream border-[1.5px] border-ink text-xs"
                  >
                    <span className="font-body text-ink truncate max-w-[190px]">
                      {Array.isArray(item.value)
                        ? item.value.join(", ")
                        : String(item.value)}
                    </span>
                    <span className="px-2 py-0.5 rounded-pill bg-lavender border-[1px] border-ink text-[10px] font-display font-bold text-violet shrink-0">
                      Picked by {item.rarity_percent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
