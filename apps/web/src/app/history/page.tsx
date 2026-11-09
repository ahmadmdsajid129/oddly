"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, Trophy, Share2, Sparkles } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [selectedCardUrl, setSelectedCardUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["player-history"],
    queryFn: () => api.history.get({ limit: 30 }),
    staleTime: 60 * 1000,
  });

  const items = data?.items || [];
  const streak = data?.streak || {
    current: 0,
    longest: 0,
    total_played: 0,
    next_milestone: 7,
  };

  return (
    <main className="min-h-screen relative flex flex-col p-4 sm:p-6 max-w-2xl mx-auto">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between py-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-text-muted hover:text-text pl-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Button>

        <h1 className="font-heading text-lg font-bold text-text">
          Twin Archive
        </h1>

        <StreakFlame
          streak={streak.current}
          longestStreak={streak.longest}
          nextMilestone={streak.next_milestone}
        />
      </header>

      {/* Stats Summary Strip */}
      <div className="relative z-20 grid grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-2xl bg-surface border border-border text-center shadow-xs">
          <div className="text-xs text-text-muted mb-0.5">Current Streak</div>
          <div className="font-heading text-xl font-bold text-flame flex items-center justify-center gap-1">
            <span>🔥 {streak.current}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border text-center shadow-xs">
          <div className="text-xs text-text-muted mb-0.5">Best Streak</div>
          <div className="font-heading text-xl font-bold text-text flex items-center justify-center gap-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{streak.longest}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border text-center shadow-xs">
          <div className="text-xs text-text-muted mb-0.5">Total Sealed</div>
          <div className="font-heading text-xl font-bold text-mint flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span>{streak.total_played}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 flex-1 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-surface-2 animate-pulse border border-border"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card variant="elevated" className="p-8 text-center space-y-4 mt-6">
            <div className="w-12 h-12 rounded-full bg-surface-2 mx-auto flex items-center justify-center text-text-muted">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base font-bold text-text">
                No past twins sealed yet
              </h3>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
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
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.submissionId}
                className="p-4 rounded-2xl bg-surface border border-border hover:border-violet/40 transition-all shadow-xs flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-muted">
                      {item.dropDate}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet/10 text-violet font-semibold">
                      {item.sharerTier} ({item.sharerPercentile}%)
                    </span>
                  </div>

                  <div className="font-heading text-sm font-bold text-text">
                    Stranger in {item.twinCity}
                  </div>

                  <div className="text-xs text-text-muted">
                    Match score: {item.sharerScore}/5 picks aligned
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.shareCardUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCardUrl(item.shareCardUrl)}
                      className="p-2 text-text-muted hover:text-text"
                      title="View card"
                    >
                      <Share2 className="w-4 h-4" />
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
          className="fixed inset-0 z-50 bg-midnight/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedCardUrl(null)}
        >
          <div className="max-w-xs w-full rounded-2xl overflow-hidden shadow-2xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedCardUrl}
              alt="Past Oddly Card"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
