"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, User, Flame } from "lucide-react";
import { ProceduralAvatar } from "./ProceduralAvatar";
import type { OrbitListItem } from "@oddly/api-client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface OrbitListRowProps {
  orbit: OrbitListItem;
  index: number;
  className?: string;
}

export function OrbitListRow({ orbit, index, className }: OrbitListRowProps) {
  const isEnded = orbit.status === "ended";

  return (
    <Link
      href={`/orbit/${orbit.orbit_id}`}
      className={cn(
        "block p-4 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker",
        "hover:bg-cream transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat",
        "focus-visible:ring-3 focus-visible:ring-violet focus-visible:outline-none min-h-[56px]",
        isEnded && "opacity-60 bg-cream/50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Procedural Avatar + Anonymous Partner Info */}
        <div className="flex items-center gap-3 min-w-0">
          <ProceduralAvatar seed={orbit.orbit_id} size={44} />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-base font-extrabold text-ink truncate">
                Twin #{index + 1}
              </h4>
              {isEnded ? (
                <span className="text-[10px] font-display font-bold text-muted bg-cream px-2 py-0.5 rounded-pill border border-ink">
                  Ended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-display font-extrabold text-ink bg-coral px-2 py-0.5 rounded-pill border border-ink shadow-sticker-flat">
                  <Flame className="w-3 h-3 fill-ink stroke-ink" />
                  <span>{orbit.co_streak_current}d</span>
                </span>
              )}
              {orbit.lane_slug && (
                <span
                  className={cn(
                    "text-[10px] font-display font-extrabold px-2 py-0.5 rounded-pill border-[1.5px] border-ink shadow-sticker-flat",
                    orbit.lane_slug === "memes"
                      ? "bg-sun text-ink"
                      : "bg-lavender text-ink"
                  )}
                >
                  {orbit.lane_slug === "memes" ? "Memes" : "Everyday"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-display font-bold text-muted mt-1 truncate">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-violet stroke-[2.5] flex-shrink-0" />
                <span className="truncate">{orbit.partner.region}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <User className="w-3 h-3 flex-shrink-0" />
                <span>{orbit.partner.age_band}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Chevron */}
        <div className="flex-shrink-0 text-ink/70">
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>
    </Link>
  );
}

