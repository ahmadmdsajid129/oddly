"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePlayStore } from "@/lib/play-store";
import { useToast } from "@/components/ui/Toast";
import { getLaneIcon } from "./LaneChip";
import { Bell, Check, Clock, Users, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LaneSummary } from "@oddly/shared";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface LanePickerProps {
  selectedSlug?: string;
  lastPlayedLaneSlug?: string;
  playedLanesToday?: string[];
  onSelectLane: (lane: LaneSummary, mode?: "play" | "view_twin") => void;
  className?: string;
}

const ACCENT_BORDER_COLORS: Record<string, string> = {
  violet: "border-l-violet",
  sun: "border-l-sun",
  mint: "border-l-mint",
  coral: "border-l-coral",
  lavender: "border-l-lavender",
  lilac: "border-l-lilac",
};

/**
 * Responsive LanePicker Home UI (Stage B0 / Slice A1 / Decision D1)
 * Follows Sticker Pop guidelines: cream desk, paper stickers, ink outlines, hard shadows.
 */
export function LanePicker({
  selectedSlug,
  lastPlayedLaneSlug,
  playedLanesToday = [],
  onSelectLane,
  className,
}: LanePickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const completedResults = usePlayStore((state) => state.completedResults);
  const [interestedLanes, setInterestedLanes] = useState<Record<string, boolean>>({});

  // Fetch all lanes
  const { data, isLoading } = useQuery({
    queryKey: ["lanes-catalogue"],
    queryFn: async () => {
      const res = await api.lanes.list();
      return res.lanes;
    },
    staleTime: 60 * 1000,
  });

  const interestMutation = useMutation({
    mutationFn: async (laneId: string) => {
      return api.lanes.expressInterest(laneId, true);
    },
    onSuccess: (_, laneId) => {
      setInterestedLanes((prev) => ({ ...prev, [laneId]: true }));
      toast("Interest Noted! We'll let you know as soon as this lane opens.", "success");
      void queryClient.invalidateQueries({ queryKey: ["lanes-catalogue"] });
    },
    onError: () => {
      toast("Could not save preference. Please check your network and try again.", "error");
    },
  });

  if (isLoading || !data) {
    return (
      <div className={cn("w-full max-w-xl mx-auto space-y-4 px-4 py-2", className)}>
        <div className="h-6 w-32 bg-paper/60 rounded-pill animate-pulse border-[1.5px] border-ink" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Find last played lane if available
  const lastPlayedLane = lastPlayedLaneSlug
    ? data.find((l) => l.slug === lastPlayedLaneSlug)
    : undefined;

  // Sort lanes: open/preview first, then planned; prioritize selected or last played
  const sortedLanes = [...data].sort((a, b) => {
    if (a.slug === selectedSlug) return -1;
    if (b.slug === selectedSlug) return 1;
    if ((a.status === "open" || a.status === "preview") && b.status === "planned") return -1;
    if (a.status === "planned" && (b.status === "open" || b.status === "preview")) return 1;
    return a.sort_order - b.sort_order;
  });

  return (
    <section aria-label="Subject Lanes" className={cn("w-full max-w-xl mx-auto px-4 py-2 space-y-4", className)}>
      {/* Top Banner: Continue in Last Lane (D1) */}
      {lastPlayedLane && (lastPlayedLane.status === "open" || lastPlayedLane.status === "preview") && (
        <div className="bg-paper border-[2.5px] border-ink rounded-l shadow-sticker p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
              <span>Welcome Back</span>
            </span>
            <h3 className="font-display text-base font-extrabold text-ink">
              Continue in {lastPlayedLane.name_key}
            </h3>
            <p className="text-xs text-muted">
              {playedLanesToday.includes(lastPlayedLane.slug)
                ? "You've completed today's 5 picks in this lane."
                : "Today's fresh 5 questions are waiting for you."}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onSelectLane(
                lastPlayedLane,
                playedLanesToday.includes(lastPlayedLane.slug) ? "view_twin" : "play"
              )
            }
            className="px-4 py-2 bg-sun text-ink font-display text-xs font-bold rounded-pill border-[2px] border-ink shadow-sticker sticker-press flex items-center gap-1.5 shrink-0"
          >
            <span>
              {playedLanesToday.includes(lastPlayedLane.slug) ? "View Twin" : "Play Now"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet stroke-[2.5]" />
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-muted">
            Choose Your Lane
          </h2>
        </div>
        <span className="text-xs font-mono text-muted">07:00 IST – 06:59 IST Cycle</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {sortedLanes.map((lane) => {
          const Icon = getLaneIcon(lane.icon_key, lane.slug);
          const isSelected = lane.slug === selectedSlug;
          const isPlanned = lane.status === "planned";
          const isResting = lane.status === "resting";
          const isOpen = lane.status === "open";
          const isPreview = lane.status === "preview";
          const isEarlyLane = isOpen && (lane.players_today ?? 0) < 500;
          const isPlayedToday = playedLanesToday.includes(lane.slug);
          const isInterested = interestedLanes[lane.id];
          const borderAccent = ACCENT_BORDER_COLORS[lane.accent_token.toLowerCase()] || "border-l-lavender";

          // Coming Soon card for planned lanes
          if (isPlanned) {
            return (
              <div
                key={lane.id}
                data-testid={`lane-card-${lane.slug}`}
                className={cn(
                  "bg-cream border-[2px] border-dashed border-ink/40 rounded-l p-4 flex flex-col justify-between gap-3 opacity-90 transition-all",
                  "hover:opacity-100"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-muted stroke-[2]" />
                      <h3 className="font-display text-base font-extrabold text-ink capitalize">
                        {lane.name_key}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold font-display px-2 py-0.5 rounded-pill bg-paper border border-ink text-muted">
                      Coming Soon
                    </span>
                  </div>
                  <p className="font-sans text-xs text-muted line-clamp-2">
                    {lane.description_key}
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isInterested || interestMutation.isPending}
                    onClick={() => interestMutation.mutate(lane.id)}
                    className={cn(
                      "w-full min-h-[44px] px-3 py-1.5 rounded-pill border-[2px] border-ink font-display text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      isInterested
                        ? "bg-mint text-ink cursor-default"
                        : "bg-paper text-ink hover:bg-cream sticker-press cursor-pointer shadow-sticker active:translate-x-1 active:translate-y-1 active:shadow-none"
                    )}
                  >
                    {isInterested ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Subscribed ✓</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 stroke-[2]" />
                        <span>Tell me when it opens</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          }

          // Active, Preview, or Resting lane card
          return (
            <div
              key={lane.id}
              data-testid={`lane-card-${lane.slug}`}
              className={cn(
                "w-full text-left bg-paper border-[2.5px] border-ink shadow-card rounded-l p-4 flex flex-col justify-between gap-2.5 relative transition-all min-h-[120px]",
                "border-l-[6px]",
                borderAccent,
                isSelected && "ring-2 ring-violet ring-offset-2",
                isResting
                  ? "opacity-60 cursor-not-allowed bg-cream/70"
                  : "cursor-pointer sticker-press active:translate-x-1 active:translate-y-1 active:shadow-none hover:-translate-y-0.5"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-ink stroke-[2.5]" />
                    <span className="font-display text-lg font-extrabold text-ink capitalize">
                      {lane.name_key}
                    </span>
                  </div>

                  {/* Status chip */}
                  {isResting ? (
                    <span className="bg-cream text-muted border-[1.5px] border-muted rounded-pill px-2 py-0.5 text-[11px] font-bold">
                      Resting
                    </span>
                  ) : isPlayedToday ? (
                    <span className="bg-mint text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-[11px] font-extrabold shadow-sticker-flat flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Played today</span>
                    </span>
                  ) : isEarlyLane ? (
                    <span className="bg-sun text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-[11px] font-extrabold shadow-sticker-flat">
                      Early Lane
                    </span>
                  ) : isPreview ? (
                    <span className="bg-lavender text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-[11px] font-bold">
                      Preview
                    </span>
                  ) : (
                    <span className="bg-mint text-ink border-[1.5px] border-ink rounded-pill px-2 py-0.5 text-[11px] font-extrabold shadow-sticker-flat">
                      Open
                    </span>
                  )}
                </div>

                <p className="font-sans text-xs text-muted line-clamp-2">
                  {lane.description_key}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-[11px]">
                {isResting ? (
                  <span className="font-mono text-muted">Resumes next cycle</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 font-mono text-muted">
                      <Users className="w-3 h-3 text-muted" />
                      <span>{lane.players_today ?? 0} playing today</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectLane(lane, isPlayedToday ? "view_twin" : "play")}
                      className={cn(
                        "px-3 py-1 rounded-pill border-[1.5px] border-ink font-display text-xs font-bold transition-all shadow-sticker sticker-press",
                        isPlayedToday
                          ? "bg-lavender text-ink hover:bg-lilac"
                          : "bg-sun text-ink hover:bg-sun/90"
                      )}
                    >
                      {isPlayedToday ? "View Twin" : "Play now"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
