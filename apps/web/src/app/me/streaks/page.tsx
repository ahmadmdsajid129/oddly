"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";

export default function StreaksPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["player-streaks"],
    queryFn: () => api.me.getStreaks(),
    staleTime: 60 * 1000,
  });

  const overall = data?.overall || {
    current: 0,
    longest: 0,
    total_played: 0,
    next_milestone: 7,
    days_to_next_milestone: 7,
  };

  const lanes = data?.lanes || {
    everyday: { current: 0, longest: 0, total_played: 0, next_milestone: 7 },
    memes: { current: 0, longest: 0, total_played: 0, next_milestone: 7 },
  };

  const milestones = [
    { days: 7, label: "7-Day Pulse", desc: "One full week of twin instinct" },
    { days: 30, label: "30-Day Orbit", desc: "A full calendar month aligned" },
    { days: 100, label: "100-Day Centurion", desc: "Deep habitual wavelength" },
    { days: 365, label: "365-Day Solar", desc: "Full year of honest answers" },
  ];

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/me")}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Settings</span>
        </Button>

        <h1 className="font-display text-display-m font-extrabold text-ink">
          Streaks &amp; Milestones
        </h1>

        <div className="w-12" />
      </header>

      <div className="space-y-6">
        {/* Overall Streak Hero Card */}
        <div className="p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-display font-extrabold text-muted uppercase tracking-wider">
                Overall Activity
              </span>
              <h2 className="font-display text-display-l font-extrabold text-ink flex items-center gap-2 mt-0.5">
                <Flame className="w-8 h-8 stroke-[2.5] text-coral fill-coral/20" />
                <span>{overall.current} Day Streak</span>
              </h2>
            </div>

            <div className="text-right">
              <span className="text-caption font-display font-bold text-muted">Next Target</span>
              <div className="font-display text-display-s font-extrabold text-violet">
                {overall.next_milestone} Days
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t-[1.5px] border-ink/10">
            <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink text-center">
              <div className="text-caption font-display font-bold text-muted">All-Time Longest</div>
              <div className="font-display text-base font-extrabold text-ink flex items-center justify-center gap-1 mt-0.5">
                <Trophy className="w-4 h-4 stroke-[2.5] text-sun" />
                <span>{overall.longest} days</span>
              </div>
            </div>

            <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink text-center">
              <div className="text-caption font-display font-bold text-muted">Total Days Played</div>
              <div className="font-display text-base font-extrabold text-ink flex items-center justify-center gap-1 mt-0.5">
                <Sparkles className="w-4 h-4 stroke-[2.5] text-violet" />
                <span>{overall.total_played} drops</span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-Lane Streaks Section (Decision D4) */}
        <div className="space-y-3">
          <h3 className="font-display text-display-s font-extrabold text-ink">
            Per-Lane Streaks
          </h3>
          <p className="font-body text-body-s text-muted">
            Each lane tracks its own daily momentum. You only receive at most one reminder push per day across all lanes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Everyday Lane Streak Card */}
            <div className="p-4 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-pill bg-lavender text-ink font-display text-xs font-extrabold border-[1.5px] border-ink shadow-sticker-flat">
                  Everyday
                </span>
                <span className="text-xs font-mono font-bold text-muted">07:00 IST</span>
              </div>

              <div>
                <div className="font-display text-display-m font-extrabold text-ink flex items-center gap-1.5">
                  <Flame className="w-5 h-5 stroke-[2.5] text-coral" />
                  <span>{lanes.everyday?.current ?? 0} days</span>
                </div>
                <div className="text-caption font-body text-muted mt-0.5">
                  Best: {lanes.everyday?.longest ?? 0}d &bull; Total: {lanes.everyday?.total_played ?? 0} played
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/?lane=everyday")}
                className="w-full text-xs font-bold"
              >
                Play Everyday
              </Button>
            </div>

            {/* Memes Lane Streak Card */}
            <div className="p-4 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-pill bg-sun text-ink font-display text-xs font-extrabold border-[1.5px] border-ink shadow-sticker-flat">
                  Memes
                </span>
                <span className="text-xs font-mono font-bold text-muted">07:00 IST</span>
              </div>

              <div>
                <div className="font-display text-display-m font-extrabold text-ink flex items-center gap-1.5">
                  <Flame className="w-5 h-5 stroke-[2.5] text-coral" />
                  <span>{lanes.memes?.current ?? 0} days</span>
                </div>
                <div className="text-caption font-body text-muted mt-0.5">
                  Best: {lanes.memes?.longest ?? 0}d &bull; Total: {lanes.memes?.total_played ?? 0} played
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/?lane=memes")}
                className="w-full text-xs font-bold"
              >
                Play Memes
              </Button>
            </div>
          </div>
        </div>

        {/* Milestone Progression Roadmap */}
        <div className="p-5 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 stroke-[2.5] text-violet" />
            <h3 className="font-display text-display-s font-extrabold text-ink">
              Milestone Badges
            </h3>
          </div>

          <div className="space-y-2.5">
            {milestones.map((m) => {
              const achieved = overall.current >= m.days || overall.longest >= m.days;
              return (
                <div
                  key={m.days}
                  className={`p-3 rounded-m border-[1.5px] border-ink flex items-center justify-between transition-all ${
                    achieved
                      ? "bg-mint/30 shadow-sticker-flat"
                      : "bg-cream/60 opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-pill border-[1.5px] border-ink flex items-center justify-center font-display font-bold text-xs ${
                        achieved ? "bg-mint text-ink" : "bg-paper text-muted"
                      }`}
                    >
                      {achieved ? (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5] text-ink" />
                      ) : (
                        <span>{m.days}d</span>
                      )}
                    </div>
                    <div>
                      <div className="font-display text-sm font-extrabold text-ink">
                        {m.label}
                      </div>
                      <div className="font-body text-caption text-muted">
                        {m.desc}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-muted">
                    {achieved ? "Unlocked" : `${Math.max(0, m.days - overall.current)}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
