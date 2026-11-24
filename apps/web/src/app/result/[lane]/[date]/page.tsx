"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "@/components/ui/Card";
import { LaneChip } from "@/components/lanes/LaneChip";
import { ShareSheet } from "@/components/share/ShareSheet";
import { getCompletedResult } from "@/lib/play-state";
import {
  ArrowLeft,
  Share2,
  Users,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Compass,
  History,
} from "lucide-react";

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

interface WhyItem {
  question_id: string;
  value: unknown;
  rarity_percent: number;
}

export default function ResultLaneDatePage() {
  const router = useRouter();
  const params = useParams();
  const lane = (params?.lane as string) || "everyday";
  const date = (params?.date as string) || new Date().toISOString().slice(0, 10);

  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Retrieve stored result from local play-store for this lane
  const stored = (getCompletedResult<any>(lane) ||
    getCompletedResult<any>(date)) as any;

  const isMemes = lane.toLowerCase() === "memes";
  const laneDisplayName = isMemes ? "Memes" : "Everyday";

  const oddness = stored?.oddness || {
    raw_score: 0.72,
    percentile: 78,
    tier: "Rare",
  };

  const match = stored?.match || {
    twin_token: "stranger_twin",
    similarity_score: 0.8,
    is_mutual: true,
    is_provisional: false,
    tie_group_size: 1,
    history_days: 0,
    why_you_two: [
      { question_id: "q1", value: "Midnight Instant Noodles", rarity_percent: 14 },
      { question_id: "q3", value: "Phone in Airplane Mode", rarity_percent: 22 },
    ],
  };

  const matchedPicks = Math.round((match.similarity_score ?? 0.8) * 5);
  const likenessPct = Math.round((match.similarity_score ?? 0.8) * 100);

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-xl mx-auto pb-16">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Lanes</span>
        </Button>

        <div className="flex items-center gap-2">
          <LaneChip
            name={laneDisplayName}
            slug={lane}
            accent={isMemes ? "sun" : "violet"}
          />
          <span className="font-mono text-xs font-bold text-muted">{date}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsShareOpen(true)}
          className="p-2"
          title="Share"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
        </Button>
      </header>

      <div className="space-y-4">
        {/* Oddness Summary Banner */}
        <div className="p-4 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-display font-extrabold text-muted uppercase tracking-wider">
              Today&apos;s Oddness
            </span>
            <div className="font-display text-display-m font-extrabold text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet stroke-[2.5]" />
              <span>{oddness.percentile}% Odd</span>
            </div>
          </div>
          <TierBadge tier={oddness.tier} />
        </div>

        {/* Twin Reveal Card */}
        <div className="p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-display font-extrabold text-muted uppercase tracking-wider">
              {laneDisplayName} Twin Match
            </span>
            <h2 className="font-display text-display-l font-extrabold text-ink">
              {likenessPct}% Aligned
            </h2>
            <p className="font-body text-body-s text-muted">
              {matchedPicks} of 5 instincts mirrored exactly today
            </p>
          </div>

          {/* Badges Strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {match.is_mutual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-mint text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat">
                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Mutual Twin</span>
              </span>
            )}

            {match.tie_group_size && match.tie_group_size > 1 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-lavender text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat">
                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{match.tie_group_size} people matched you this way</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-lavender text-ink font-display text-xs font-bold border-[1.5px] border-ink shadow-sticker-flat">
                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>1 of 1 unique pair</span>
              </span>
            )}
          </div>

          {/* Why you two? Accordion */}
          {match.why_you_two && match.why_you_two.length > 0 && (
            <div className="w-full text-left bg-cream rounded-m border-[1.5px] border-ink p-3 space-y-2 mt-2">
              <button
                type="button"
                onClick={() => setIsWhyOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-left font-display text-xs font-extrabold text-ink cursor-pointer"
              >
                <span>Why you two? (Rarest shared answers)</span>
                {isWhyOpen ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>

              {isWhyOpen && (
                <div className="space-y-1.5 pt-2 border-t border-ink/20">
                  {match.why_you_two.map((item: WhyItem, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-s bg-paper border-[1px] border-ink text-xs"
                    >
                      <span className="font-body text-ink truncate max-w-[240px]">
                        {Array.isArray(item.value) ? item.value.join(", ") : String(item.value)}
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
        </div>

        {/* Primary Action: Play another lane (Decision D5) */}
        <div className="p-4 rounded-m bg-sun/30 border-[2.5px] border-ink shadow-sticker space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 stroke-[2.5] text-ink" />
            <h3 className="font-display text-sm font-extrabold text-ink">
              Ready for another perspective?
            </h3>
          </div>
          <p className="font-body text-caption text-muted">
            You can play multiple lanes every day. Each lane has its own questions, its own twin, and its own streak.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/")}
            className="w-full mt-1 bg-sun text-ink hover:bg-sun/90"
          >
            Play Another Lane
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsShareOpen(true)}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>Share Card</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push("/history")}
            className="w-full flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4 stroke-[2.5]" />
            <span>Twin Archive</span>
          </Button>
        </div>
      </div>

      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        dropId={date}
        laneSlug={lane}
        laneName={laneDisplayName}
        laneAccent={isMemes ? "yellow" : "violet"}
        defaultFormat="story"
      />
    </main>
  );
}
