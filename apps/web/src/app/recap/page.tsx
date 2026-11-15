/**
 * @file page.tsx
 * @package @oddly/web
 *
 * S9 Morning Recap Screen (P9.04).
 * Surfaces yesterday's sealed Stranger Twin, final immutable Oddness score & tier,
 * global rarity distribution stat, and seamless CTA to today's fresh drop.
 * Styled with Sticker Pop.
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "@/components/ui/Card";
import { BrandMark } from "@/components/icons";
import { ShareSheet } from "@/components/share/ShareSheet";
import { KeepButton } from "@/components/orbit/KeepButton";
import {
  Sparkles,
  Share2,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  XCircle,
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
      question: "Coffee vs Chai on a rainy morning",
      playerPick: "Chai",
      twinPick: "Chai",
      isMatched: true,
    },
    {
      question: "Number intuition 1 to 50",
      playerPick: "27",
      twinPick: "27",
      isMatched: true,
    },
    {
      question: "Comfort palette swatch",
      playerPick: "Midnight Violet",
      twinPick: "Midnight Violet",
      isMatched: true,
    },
    {
      question: "Window seat or aisle seat",
      playerPick: "Window",
      twinPick: "Window",
      isMatched: true,
    },
    {
      question: "One word for your ideal Sunday",
      playerPick: "Stillness",
      twinPick: "Wander",
      isMatched: false,
    },
  ],
};

export default function MorningRecapPage() {
  const router = useRouter();
  const [data] = useState<RecapData>(DEFAULT_RECAP_DATA);
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto pb-12 select-none">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-display font-extrabold text-lg text-ink">oddly recap</span>
        </div>
        <span className="text-caption font-display font-bold text-muted bg-paper px-3 py-1 rounded-pill border-[1.5px] border-ink">
          Drop #{data.dropNumber} Sealed
        </span>
      </header>

      {/* Main Content Container */}
      <div className="space-y-4 my-auto">
        {/* Hero Sealed Twin Card */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4">
          <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
            <div className="space-y-0.5">
              <span className="text-caption font-display font-bold text-muted uppercase tracking-wider">
                Yesterday&apos;s Match
              </span>
              <div className="font-display text-lg font-extrabold text-ink flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-violet stroke-[2.5]" />
                <span>Stranger in {data.twinCity}</span>
              </div>
            </div>
            <TierBadge tier={data.tier} />
          </div>

          {/* Big Score Display */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-display text-display-xl font-extrabold text-ink leading-none">
                {data.matchedPicks} of {data.totalPicks}
              </div>
              <p className="font-body text-body-s text-muted mt-1">
                Shared choices locked at 07:00 IST
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-flex items-center gap-1 text-xs font-display font-bold text-ink bg-sun px-2.5 py-1 rounded-pill border border-ink">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{data.percentile.toFixed(1)}% Odd</span>
              </div>
              <p className="text-[11px] font-display font-bold text-muted">
                Top tier connection
              </p>
            </div>
          </div>

          {/* Global Rarity Callout */}
          <div className="p-3.5 rounded-m bg-cream border-[2px] border-ink flex items-center gap-3">
            <div className="w-8 h-8 rounded-pill bg-paper border-[1.5px] border-ink flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-violet stroke-[2.5]" />
            </div>
            <p className="font-body text-caption text-ink">
              Only <strong>{data.globalMatchRate}%</strong> of players found a 4-or-5 pick twin yesterday.
            </p>
          </div>

          {/* 5 Picks Breakdown */}
          <div className="space-y-2 pt-2 border-t-[1.5px] border-ink/20">
            <span className="text-caption font-display font-bold text-muted uppercase tracking-wider block mb-1">
              Choice Breakdown
            </span>
            {data.picksSummary.map((pick, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-caption font-display font-bold p-2.5 rounded-s bg-cream border-[1.5px] border-ink"
              >
                <div className="truncate max-w-[200px] sm:max-w-xs text-ink">
                  {i + 1}. {pick.question}
                </div>
                {pick.isMatched ? (
                  <span className="inline-flex items-center gap-1 text-ink px-2 py-0.5 rounded-pill bg-mint border border-ink text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    Matched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted px-2 py-0.5 rounded-pill bg-lavender border border-ink text-xs font-bold">
                    <XCircle className="w-3 h-3 stroke-[2]" />
                    Differs
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Keep Twin & Share Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <KeepButton dropId={data.dropId} isProvisional={false} />
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsShareOpen(true)}
            >
              <Share2 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Share Yesterday&apos;s Card</span>
            </Button>
          </div>
        </div>

        {/* Seamless Forward CTA to Today's Drop */}
        <div className="p-5 rounded-l bg-sun/40 border-[2.5px] border-ink shadow-sticker text-center space-y-3">
          <div className="space-y-0.5">
            <h2 className="font-display text-display-m font-extrabold text-ink">
              Today&apos;s Drop is Live!
            </h2>
            <p className="font-body text-body-s text-ink/80 max-w-xs mx-auto">
              5 new questions are waiting. Meet your new stranger twin today.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/")}
            >
              <span>Play Today&apos;s Five</span>
              <ArrowRight className="w-4 h-4 stroke-[3] shrink-0" />
            </Button>
          </div>
        </div>
      </div>

      {/* Share Sheet */}
      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        dropId={data.dropId}
      />
    </main>
  );
}
