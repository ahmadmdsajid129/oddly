/**
 * @file page.tsx
 * @package @oddly/web
 *
 * S9 Morning Recap Screen (P9.04).
 * Surfaces yesterday's sealed Stranger Twin, final immutable Oddness score & tier,
 * global rarity distribution stat, and seamless CTA to today's fresh drop.
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/icons";
import { ShareSheet } from "@/components/share/ShareSheet";
import {
  Sparkles,
  Trophy,
  Share2,
  Calendar,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export interface RecapData {
  yesterdayDate: string;
  dropNumber: number;
  dropId: string;
  matchedPicks: number;
  totalPicks: number;
  twinCity: string;
  percentile: number;
  tier: "Common" | "Uncommon" | "Rare" | "Mythic";
  globalMatchRate: number; // e.g., 4.8 (%)
  picksSummary: Array<{
    question: string;
    playerPick: string;
    twinPick: string;
    isMatched: boolean;
  }>;
}

const DEFAULT_RECAP_DATA: RecapData = {
  yesterdayDate: new Date(Date.now() - 86400000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  dropNumber: 42,
  dropId: "yesterday-drop-sealed",
  matchedPicks: 4,
  totalPicks: 5,
  twinCity: "Tokyo, Japan",
  percentile: 84.6,
  tier: "Rare",
  globalMatchRate: 4.8,
  picksSummary: [
    {
      question: "Midnight snack craving",
      playerPick: "Warm toast with butter",
      twinPick: "Warm toast with butter",
      isMatched: true,
    },
    {
      question: "Phone battery panic threshold",
      playerPick: "Below 20%",
      twinPick: "Below 20%",
      isMatched: true,
    },
    {
      question: "Weekend morning vibe",
      playerPick: "Slow coffee in silence",
      twinPick: "Slow coffee in silence",
      isMatched: true,
    },
    {
      question: "Subway seat strategy",
      playerPick: "Corner seat facing window",
      twinPick: "Stand by the door",
      isMatched: false,
    },
    {
      question: "Favourite evening sound",
      playerPick: "Distant thunderstorms",
      twinPick: "Distant thunderstorms",
      isMatched: true,
    },
  ],
};

export default function MorningRecapPage() {
  const router = useRouter();
  const [recap] = useState<RecapData>(DEFAULT_RECAP_DATA);
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <main className="min-h-screen relative flex flex-col p-4 sm:p-6 max-w-xl mx-auto">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between pb-6 border-b border-border/40">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-heading font-black tracking-tight text-xl text-text">
            oddly
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet/10 border border-violet/30 text-xs font-semibold text-violet">
          <Calendar className="w-3.5 h-3.5" />
          <span>Morning Recap</span>
        </div>
      </header>

      {/* Content Body */}
      <div className="relative z-20 flex-1 space-y-6 py-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text">
            Yesterday&apos;s Match Sealed
          </h1>
          <p className="text-xs sm:text-sm text-text-muted">
            The results are locked in. Here is how you connected with the world.
          </p>
        </div>

        {/* Hero Sealed Card */}
        <Card variant="elevated" className="p-6 space-y-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-violet via-mint to-coral" />

          {/* Twin match announcement */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint/10 border border-mint/30 text-mint text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>{recap.matchedPicks} of {recap.totalPicks} picks matched</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-text font-heading text-xl font-bold">
              <MapPin className="w-5 h-5 text-coral" />
              <span>Stranger in {recap.twinCity}</span>
            </div>
          </div>

          {/* Rarity & Tier pill */}
          <div className="flex items-center justify-center gap-3 py-2 border-y border-border/60">
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-text-muted">Final Tier</div>
              <div className="text-sm font-bold text-violet">{recap.tier} Tier</div>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-text-muted">Oddness</div>
              <div className="text-sm font-bold text-mint">{recap.percentile}% Rarity</div>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-text-muted">Rarity Stat</div>
              <div className="text-sm font-bold text-coral">Top {recap.globalMatchRate}%</div>
            </div>
          </div>

          {/* Stat highlight */}
          <div className="p-3 rounded-xl bg-surface-2 border border-border/60 flex items-center justify-center gap-2 text-xs text-text-muted">
            <TrendingUp className="w-4 h-4 text-mint flex-shrink-0" />
            <span>Only <strong className="text-text">{recap.globalMatchRate}%</strong> of all players matched 4 or more picks yesterday!</span>
          </div>

          {/* Share CTA */}
          <Button
            variant="secondary"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="w-4 h-4 text-violet" />
            <span>Share Yesterday&apos;s Sealed Card</span>
          </Button>
        </Card>

        {/* Detailed picks comparison */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
            Question-by-Question Alignment
          </h2>

          <div className="space-y-2">
            {recap.picksSummary.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5 max-w-[70%]">
                  <div className="text-text-muted font-medium truncate">{item.question}</div>
                  <div className="text-text font-semibold truncate">{item.playerPick}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.isMatched ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-mint bg-mint/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matched
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                      Differs
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Drop CTA */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 rounded-full shadow-lg"
            onClick={() => router.push("/")}
          >
            <Sparkles className="w-5 h-5 text-mint" />
            <span>Play Today&apos;s Fresh Five</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        dropId={recap.dropId}
      />
    </main>
  );
}
