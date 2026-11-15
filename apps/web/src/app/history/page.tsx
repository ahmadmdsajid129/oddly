"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "@/components/ui/Card";
import { api } from "@/lib/api";
import type { HistoryResponse } from "@oddly/api-client";
import { ArrowLeft, Calendar, Trophy, Share2, Sparkles, Flame } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [selectedCardUrl, setSelectedCardUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["player-history"],
    queryFn: () => api.history.get({ limit: 30 }),
    staleTime: 60 * 1000,
  });

  const items: HistoryResponse["items"] = data?.items || [];
  const streak = data?.streak || {
    current: 0,
    longest: 0,
    total_played: 0,
    next_milestone: 7,
  };

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Home</span>
        </Button>

        <h1 className="font-display text-display-m font-extrabold text-ink">
          Twin Archive
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-coral border-[1.5px] border-ink text-ink font-display text-xs font-bold shadow-xs">
          <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{streak.current}d</span>
        </div>
      </header>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker text-center">
          <div className="text-caption font-display font-bold text-muted mb-0.5">Current Streak</div>
          <div className="font-display text-display-m font-extrabold text-ink flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 stroke-[2.5] text-coral" />
            <span>{streak.current}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker text-center">
          <div className="text-caption font-display font-bold text-muted mb-0.5">Best Streak</div>
          <div className="font-display text-display-m font-extrabold text-ink flex items-center justify-center gap-1">
            <Trophy className="w-4 h-4 text-sun stroke-[2.5]" />
            <span>{streak.longest}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker text-center">
          <div className="text-caption font-display font-bold text-muted mb-0.5">Total Sealed</div>
          <div className="font-display text-display-m font-extrabold text-ink flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-violet stroke-[2.5]" />
            <span>{streak.total_played}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-m bg-lavender border-[2px] border-ink animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker text-center space-y-4 mt-4">
            <div className="w-12 h-12 rounded-pill bg-cream border-[2px] border-ink mx-auto flex items-center justify-center text-ink">
              <Calendar className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-display-m font-extrabold text-ink">
                No past twins sealed yet
              </h3>
              <p className="font-body text-body-s text-muted max-w-xs mx-auto">
                Play today&apos;s 5 questions to meet your first stranger twin and start your streak.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/")}
              className="mx-auto"
            >
              Play Today&apos;s Five
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.submissionId}
                className="p-4 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-display font-bold text-muted">
                      {item.dropDate}
                    </span>
                    <TierBadge tier={item.sharerTier} />
                  </div>

                  <div className="font-display text-base font-extrabold text-ink">
                    Stranger in {item.twinCity}
                  </div>

                  <div className="font-body text-caption text-muted">
                    Match score: {item.sharerScore}/5 picks aligned ({item.sharerPercentile}% odd)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.shareCardUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedCardUrl(item.shareCardUrl)}
                      className="p-2"
                      title="View card"
                    >
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Image Preview Modal if opened */}
      {selectedCardUrl && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedCardUrl(null)}
        >
          <div className="max-w-xs w-full rounded-l overflow-hidden border-[2.5px] border-ink shadow-card bg-paper p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedCardUrl}
              alt="Past Oddly Card"
              className="w-full h-auto object-contain rounded-m"
            />
          </div>
        </div>
      )}
    </main>
  );
}
