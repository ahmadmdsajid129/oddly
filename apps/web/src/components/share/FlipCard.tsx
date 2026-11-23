"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/icons";
import { TierBadge } from "@/components/ui/Card";
import { LaneChip } from "@/components/lanes/LaneChip";
import { KeepButton } from "@/components/orbit/KeepButton";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface LaneInfo {
  name: string;
  slug: string;
  accent?: string;
  iconKey?: string;
}

export interface FlipCardProps {
  matchedPicks: number;
  totalPicks?: number;
  tier?: string;
  location?: string;
  rarityText?: string;
  dropId?: string;
  isProvisional?: boolean;
  lane?: LaneInfo;
  pickMatches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
  autoFlip?: boolean;
  className?: string;
  onFlipped?: (side: "front" | "back") => void;
}

export function FlipCard({
  matchedPicks,
  totalPicks = 5,
  tier = "Rare",
  location = "Stranger in Berlin, Germany",
  rarityText = "Only 0.4% of players matched you today",
  dropId,
  isProvisional = false,
  lane,
  pickMatches,
  autoFlip = true,
  className,
  onFlipped,
}: FlipCardProps) {
  // side state:
  // "sealed" = initially back-facing (violet)
  // "front" = hero reveal face (paper + sheen)
  // "details" = user flipped to back to inspect overlap
  const [currentSide, setCurrentSide] = useState<"sealed" | "front" | "details">("sealed");
  const [sheenX, setSheenX] = useState<number>(0);
  const cardRef = useRef<HTMLButtonElement>(null);

  const isMythic = tier.toLowerCase() === "mythic";

  // Step 2: Auto-flip to front after ~550ms on arrival
  useEffect(() => {
    if (!autoFlip) {
      setCurrentSide("front");
      return;
    }

    const timer = setTimeout(() => {
      setCurrentSide("front");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch {}
      }
      feedback.triggerHaptic("reveal");
      feedback.playSound("celebrate");
    }, 550);

    return () => clearTimeout(timer);
  }, [autoFlip]);

  // Handle pointer tracking for holographic sheen on card front
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch") return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(-40, Math.min(40, ((x / rect.width) - 0.5) * 80));
    setSheenX(pct);
  };

  const handleToggleFlip = () => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");

    setCurrentSide((prev) => {
      const next = prev === "front" ? "details" : "front";
      onFlipped?.(next === "front" ? "front" : "back");
      return next;
    });
  };

  const isBackSide = currentSide === "sealed" || currentSide === "details";

  const defaultPicks = [
    { question_number: 1, label: "Pick 1", matched: matchedPicks >= 1 },
    { question_number: 2, label: "Pick 2", matched: matchedPicks >= 2 },
    { question_number: 3, label: "Pick 3", matched: matchedPicks >= 3 },
    { question_number: 4, label: "Pick 4", matched: matchedPicks >= 4 },
    { question_number: 5, label: "Pick 5", matched: matchedPicks >= 5 },
  ];

  const displayPicks = pickMatches && pickMatches.length === 5 ? pickMatches : defaultPicks;

  return (
    <div className={cn("card-scene flex items-center justify-center p-2 select-none", className)}>
      <button
        ref={cardRef}
        type="button"
        data-testid="twin-card"
        onClick={handleToggleFlip}
        onPointerMove={handlePointerMove}
        aria-pressed={currentSide === "details"}
        aria-label="Twin card. Press to see details"
        className={cn(
          "card-flipper w-[min(86vw,320px)] aspect-[210/290] outline-none cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet focus-visible:ring-offset-2",
          "sticker-press rounded-l"
        )}
        data-side={isBackSide ? "back" : "front"}
      >
        {/* =========================================================================
            FRONT FACE (Revealed Face: Hero number, tier chip, location, sheen)
            ========================================================================= */}
        <div
          className={cn(
            "card-face rounded-l bg-paper border-[2.5px] border-ink shadow-card p-6 flex flex-col justify-between text-ink overflow-hidden text-left",
            isMythic && "border-[3px] border-ink ring-4 ring-sun/40"
          )}
          aria-hidden={isBackSide}
          inert={isBackSide}
        >
          {/* Holographic Sheen Pseudo-Element (Transform-only, max 22% opacity) */}
          <div
            className="card-sheen"
            style={{ "--sheen-x": `${sheenX}%` } as React.CSSProperties}
            aria-hidden="true"
          />

          {/* Top Row: Tier badge, Lane chip & Brand wordmark */}
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <TierBadge tier={tier} />
              {lane && (
                <LaneChip
                  name={lane.name}
                  slug={lane.slug}
                  accent={lane.accent || "lavender"}
                  iconKey={lane.iconKey}
                  size="sm"
                  showIcon={true}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 font-display text-sm font-extrabold text-ink">
              <BrandMark size={20} />
              <span>oddly</span>
            </div>
          </div>

          {/* Center: Big friendly hero number ("4 of 5") */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-2 relative z-10 space-y-1">
            <span className="font-display text-display-xl font-extrabold tracking-tight text-ink leading-none">
              {matchedPicks} of {totalPicks}
            </span>
            <span className="font-display text-sm font-bold text-muted uppercase tracking-wider">
              Shared Answers
            </span>
          </div>

          {/* Bottom Section: Location, rarity line, Tap to flip hint */}
          <div className="flex flex-col space-y-3 relative z-10 pt-2 border-t-[1.5px] border-ink/20">
            <div>
              <p className="font-display text-base font-extrabold text-ink line-clamp-1">
                {location}
              </p>
              <p className="font-body text-xs text-muted leading-tight mt-0.5">
                {rarityText}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-display text-[11px] font-bold text-muted uppercase tracking-wider">
                Tap to flip ↺
              </span>
              {isMythic && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet">
                  <Sparkles className="w-3.5 h-3.5" />
                  Mythic
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            BACK FACE:
            - When sealed initially: violet background, wordmark, caption "Your twin card"
            - When flipped by user: paper background, detailed match breakdown
            ========================================================================= */}
        <div
          className={cn(
            "card-face card-face--back rounded-l border-[2.5px] border-ink shadow-card p-6 flex flex-col justify-between overflow-hidden",
            currentSide === "sealed"
              ? "bg-violet text-paper items-center justify-center text-center"
              : "bg-paper text-ink text-left"
          )}
          aria-hidden={!isBackSide}
          inert={!isBackSide}
        >
          {currentSide === "sealed" ? (
            /* Sealed Back State (Initial arrival before flip) */
            <div className="flex flex-col items-center justify-center space-y-3 p-4">
              <div className="w-16 h-16 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center">
                <BrandMark size={32} />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-paper">
                oddly
              </h2>
              <p className="font-display text-sm font-bold text-lavender uppercase tracking-wider">
                Your twin card
              </p>
            </div>
          ) : (
            /* Details Back State (After user tap to inspect answers) */
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-extrabold text-ink uppercase tracking-wider">
                    Pick Overlap
                  </span>
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
                <span className="font-display text-xs font-bold text-muted">
                  oddly.fun
                </span>
              </div>

              {/* 5 Questions Breakdown */}
              <div className="space-y-2 py-3 my-auto">
                {displayPicks.map((pick) => (
                  <div
                    key={pick.question_number}
                    className="flex items-center justify-between p-2 rounded-m bg-cream border-[1.5px] border-ink text-xs font-display font-bold"
                  >
                    <span className="text-ink">Question {pick.question_number}</span>
                    {pick.matched ? (
                      <span className="inline-flex items-center gap-1 text-ink px-2 py-0.5 rounded-pill bg-mint border-[1px] border-ink">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink px-2 py-0.5 rounded-pill bg-coral border-[1px] border-ink">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        Differs
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Keep this twin action (P10B.01) */}
              {dropId && (
                <div className="py-2">
                  <KeepButton dropId={dropId} isProvisional={isProvisional} />
                </div>
              )}

              {/* Tap to flip back hint */}
              <div className="pt-2 border-t-[1.5px] border-ink/20 flex items-center justify-between text-caption font-display font-bold text-muted">
                <span>Tap to flip front ↺</span>
                <span className="text-violet">oddly.fun</span>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
