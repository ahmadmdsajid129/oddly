"use client";

import React, { useEffect, useState } from "react";
import { Lock, Sparkles, Compass } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { api } from "@/lib/api";
import type { OrbitSubjectSyncItem } from "@oddly/api-client";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SubjectSyncCardProps {
  orbitId: string;
  className?: string;
}

export function SubjectSyncCard({ orbitId, className }: SubjectSyncCardProps) {
  const [syncItems, setSyncItems] = useState<OrbitSubjectSyncItem[]>([]);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchSync() {
      try {
        setIsLoading(true);
        setHasError(false);
        const res = await api.orbits.subjectSync(orbitId);
        if (isMounted && res && res.ok) {
          setSyncItems(res.sync_items || []);
          setMinThreshold(res.min_shared_threshold || 5);
        }
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (orbitId) {
      void fetchSync();
    }

    return () => {
      isMounted = false;
    };
  }, [orbitId]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-3 animate-pulse select-none",
          className
        )}
      >
        <div className="h-4 bg-cream border border-ink/20 rounded-pill w-1/3" />
        <div className="h-12 bg-cream border border-ink/20 rounded-m" />
        <div className="h-12 bg-cream border border-ink/20 rounded-m" />
      </div>
    );
  }

  if (hasError || syncItems.length === 0) {
    return null; // Gracefully degrade if no mutual drops or feature unavailable
  }

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-m bg-violet text-paper border-[1.5px] border-ink">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <span className="font-display text-xs font-bold text-muted uppercase tracking-wider block">
              Taste Alignment
            </span>
            <h3 className="font-display text-base font-extrabold text-ink leading-tight">
              Subject Sync
            </h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-cream border border-ink text-[11px] font-display font-extrabold text-ink">
          <Sparkles className="w-3 h-3 text-violet" />
          <span>Rule 19 Zero-Leak</span>
        </div>
      </div>

      {/* Sync Rows */}
      <div className="space-y-3">
        {syncItems.map((item) => {
          const isUnlocked = item.status === "unlocked";
          const label =
            item.label_i18n?.en ||
            item.tag_key.charAt(0).toUpperCase() + item.tag_key.slice(1);
          const pct = item.agreement_percentage ?? 0;

          return (
            <div
              key={item.tag_id}
              className="p-3.5 rounded-m bg-cream border-[1.5px] border-ink space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-extrabold text-ink">
                    {label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-pill bg-paper border border-ink/40 text-[10px] font-display font-bold text-muted uppercase">
                    {item.category}
                  </span>
                </div>

                {isUnlocked ? (
                  <span className="px-2.5 py-0.5 rounded-pill bg-violet text-paper border border-ink text-xs font-display font-black shadow-sticker-flat">
                    {pct}% Sync
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-paper border border-ink/40 text-[11px] font-display font-bold text-muted">
                    <Lock className="w-3 h-3 text-muted" />
                    <span>Locked</span>
                  </span>
                )}
              </div>

              {isUnlocked ? (
                <div>
                  {/* Progress track */}
                  <div className="h-3 w-full bg-paper border border-ink rounded-pill overflow-hidden relative">
                    <div
                      className="h-full bg-violet transition-all duration-500 rounded-pill"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-display font-bold text-muted">
                    <span>
                      Agreed on {item.agreement_count} of {item.shared_questions} questions
                    </span>
                    <span>k ≥ {minThreshold}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-display font-medium text-muted flex items-center gap-1.5 pt-0.5">
                  <span>🔒</span>
                  <span>
                    Play {Math.max(1, minThreshold - item.shared_questions)} more drop
                    {Math.max(1, minThreshold - item.shared_questions) === 1 ? "" : "s"}{" "}
                    together to unlock {label} sync ({item.shared_questions}/{minThreshold})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

