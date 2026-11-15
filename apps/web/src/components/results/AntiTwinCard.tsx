"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { feedback } from "@/lib/feedback";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";
import { Sparkles, Clock, Compass, Share2, RotateCw } from "lucide-react";
import type { AntiTwinResponse } from "@oddly/api-client";

interface AntiTwinCardProps {
  dropId: string;
  onShare?: () => void;
  className?: string;
}

export function AntiTwinCard({ dropId, onShare, className = "" }: AntiTwinCardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AntiTwinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function fetchAntiTwin() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.antitwin.get(dropId);
        if (mounted) {
          setData(res);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : "Failed to load anti-twin";
          setError(msg);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (dropId) {
      void fetchAntiTwin();
    }

    return () => {
      mounted = false;
    };
  }, [dropId]);

  const handleFlip = () => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    setIsFlipped(!isFlipped);
  };

  if (loading) {
    return (
      <div
        className={`w-full max-w-sm mx-auto p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4 animate-pulse ${className}`}
        aria-busy="true"
        aria-label="Loading your opposite today"
      >
        <div className="h-6 w-32 bg-lavender rounded-pill border-[1.5px] border-ink mx-auto" />
        <div className="h-10 w-48 bg-lavender rounded-m mx-auto" />
        <div className="h-4 w-40 bg-lavender rounded-pill mx-auto" />
        <div className="space-y-2 pt-2">
          <div className="h-12 bg-cream rounded-m border-[1.5px] border-ink" />
          <div className="h-12 bg-cream rounded-m border-[1.5px] border-ink" />
        </div>
      </div>
    );
  }

  // Low pool graceful hide with honest notice
  if (data?.pool_insufficient) {
    return (
      <div
        className={`w-full max-w-sm mx-auto p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker text-center space-y-4 ${className}`}
        role="region"
        aria-label="Anti-twin pool notice"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lavender text-ink rounded-pill border-[1.5px] border-ink font-display font-bold text-xs uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Pool Still Gathering</span>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Opposites Need a Crowd
          </h2>
          <p className="font-body text-sm text-muted leading-relaxed">
            {data.notice || "Not enough players yet today to find a genuine opposite. Check back this evening."}
          </p>
        </div>

        <div className="p-3 bg-cream rounded-m border-[1.5px] border-ink text-xs font-medium text-muted">
          Only {data.pool_count ?? 0} submissions today so far. We never fabricate fake opposites.
        </div>
      </div>
    );
  }

  if (error || !data || !data.ok) {
    return (
      <div
        className={`w-full max-w-sm mx-auto p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker text-center space-y-3 ${className}`}
        role="alert"
      >
        <p className="font-body text-sm text-error font-medium">
          {error || data?.notice || "Unable to load Anti-Twin for this drop."}
        </p>
      </div>
    );
  }

  const differedCount = data.differed_count ?? 0;
  const sampleSize = data.sample_size ?? 2000;
  const oppositeRegion = data.opposite?.region || "Global";
  const oppositeAge = data.opposite?.age_band || "18+";
  const ownDiffered = data.own_differed_questions || [];

  return (
    <div className={`w-full max-w-sm mx-auto perspective-1000 ${className}`}>
      {/* 3D Flip Card Container */}
      <div
        className={`relative w-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front Face: Warm cream/paper desk with coral accent */}
        <div
          className={`w-full p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-5 select-none ${
            isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "relative"
          }`}
          role="region"
          aria-label="Anti-twin card front face"
        >
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-coral text-ink border-[1.5px] border-ink rounded-pill font-display font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Your Opposite Today</span>
            </span>

            <button
              type="button"
              onClick={handleFlip}
              className="p-1.5 rounded-m bg-cream border-[1.5px] border-ink text-ink hover:bg-lavender transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer sticker-press"
              title="Flip to sealed back"
              aria-label="Flip card to back"
            >
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Hero Difference Display */}
          <div className="text-center space-y-1">
            <h2 className="font-display text-display-m sm:text-display-l font-extrabold text-ink tracking-tight">
              Differed on {differedCount} of 5
            </h2>

            {/* Coarse Location & Demographics Pill */}
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-cream border-[1.5px] border-ink rounded-pill font-display font-bold text-xs text-ink">
              <Compass className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
              <span>Someone in {oppositeRegion} • {oppositeAge}</span>
            </div>
          </div>

          {/* User's Own Differed Questions Breakdown (Zero Opposite Picks Exposed) */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-display font-bold text-muted uppercase tracking-wider">
              Where your instincts diverged:
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ownDiffered.map((q) => (
                <div
                  key={q.question_id}
                  className="p-2.5 rounded-m bg-cream border-[1.5px] border-ink text-left space-y-0.5"
                >
                  <p className="font-body text-xs text-muted truncate">
                    Q{q.position}: {q.prompt}
                  </p>
                  <p className="font-display text-xs font-bold text-ink">
                    Your pick: <span className="text-violet">{q.your_answer}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Playful Affirmation Note */}
          <p className="font-body text-xs text-center text-muted italic px-2">
            {data.note || "Different instincts make the world interesting. Opposite paths today!"}
          </p>

          {/* Honest Sampling Footnote */}
          <div className="text-center pt-1 border-t border-ink/10">
            <p className="font-body text-caption text-muted">
              Sampled from {sampleSize.toLocaleString()} players today.
            </p>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-2 pt-2">
            {onShare && (
              <Button
                variant="primary"
                size="md"
                onClick={onShare}
                className="flex-1 bg-coral hover:bg-coral text-ink border-[2.5px] border-ink shadow-sticker"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Share Opposite</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={handleFlip}
              className="px-3"
            >
              <span>Flip</span>
            </Button>
          </div>
        </div>

        {/* Back Face: Coral Sealed Back with Brand Mark */}
        <div
          className={`w-full p-6 rounded-l bg-coral text-ink border-[2.5px] border-ink shadow-sticker flex flex-col items-center justify-between min-h-[380px] text-center select-none rotate-y-180 ${
            !isFlipped ? "pointer-events-none opacity-0 absolute inset-0" : "relative"
          }`}
          role="region"
          aria-label="Anti-twin card back face"
        >
          <div className="w-full flex justify-end">
            <button
              type="button"
              onClick={handleFlip}
              className="p-1.5 rounded-m bg-paper border-[1.5px] border-ink text-ink hover:bg-cream transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer sticker-press"
              title="Flip to front"
              aria-label="Flip card to front"
            >
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="my-auto space-y-3">
            <div className="w-16 h-16 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center mx-auto">
              <BrandMark size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-extrabold text-ink">
                oddly opposite
              </h3>
              <p className="font-body text-xs font-bold text-ink/80 max-w-[200px] mx-auto">
                Celebrating the other end of the human spectrum.
              </p>
            </div>
          </div>

          <div className="w-full pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFlip}
              className="w-full bg-paper"
            >
              <span>Back to Breakdown</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
