"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Smile, Meh, Sparkles, Check, ArrowRight } from "lucide-react";
import { Card, Chip } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DynamicIllustration } from "@/components/illustrations";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";

export interface MemeCornerData {
  id: string;
  template_key: string;
  illustration_registry_key: string;
  caption_text: string;
  author_alias?: string;
  author_region?: string;
}

const DEFAULT_MEME: MemeCornerData = {
  id: "meme-corner-daily-1",
  template_key: "chai-urgency",
  illustration_registry_key: "path-chai",
  caption_text: "When they say 'two minutes' but the chai has not even started boiling yet",
  author_alias: "Fellow Stranger",
  author_region: "Mumbai, IN",
};

interface MemeCornerCardProps {
  meme?: MemeCornerData;
  onRate?: (memeId: string, rating: "funny" | "not_for_me") => Promise<void> | void;
  className?: string;
}

export function MemeCornerCard({
  meme: initialMeme,
  onRate,
  className = "",
}: MemeCornerCardProps) {
  const [activeMeme, setActiveMeme] = useState<MemeCornerData>(initialMeme || DEFAULT_MEME);
  const [selectedRating, setSelectedRating] = useState<"funny" | "not_for_me" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMeme) {
      setActiveMeme(initialMeme);
      return;
    }
    // Fetch tailored recommendation from exposure engine (P10G.06)
    api.memes
      .getCorner()
      .then((res) => {
        if (res?.ok && res.meme) {
          setActiveMeme({
            id: res.meme.id,
            template_key: res.meme.template_key,
            illustration_registry_key: res.meme.illustration_registry_key,
            caption_text: res.meme.caption_text,
          });
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_MEME smoothly
      });
  }, [initialMeme]);

  const handleRate = async (rating: "funny" | "not_for_me") => {
    if (selectedRating || isSubmitting) return;

    setSelectedRating(rating);
    setIsSubmitting(true);
    feedback.triggerHaptic("select");
    feedback.playSound("tick");

    try {
      if (onRate) {
        await onRate(activeMeme.id, rating);
      } else {
        // Fallback default rating ingestion if available
        try {
          await api.memes.rate(activeMeme.id, rating);
        } catch {
          // Non-blocking for UI preview
        }
      }
    } catch {
      // Ignored for smooth non-blocking UI
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      data-testid="meme-corner-card"
      className={`p-5 sm:p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker text-ink flex flex-col gap-4 relative overflow-hidden ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip fill="sun" className="text-caption font-bold tracking-wider uppercase">
            Meme Corner
          </Chip>
          <span className="text-caption font-display font-bold text-muted">
            Community Pick
          </span>
        </div>

        {activeMeme.author_region && (
          <span className="text-[11px] font-mono font-bold text-muted bg-cream px-2.5 py-0.5 rounded-pill border-[1.5px] border-ink">
            {activeMeme.author_region}
          </span>
        )}
      </div>

      {/* Meme Visual Sticker Frame */}
      <div className="w-full p-4 bg-cream rounded-m border-[2px] border-ink shadow-inner flex flex-col items-center justify-center text-center">
        <div className="py-2">
          <DynamicIllustration
            assetKey={activeMeme.illustration_registry_key}
            size={120}
            className="mx-auto drop-shadow-sm"
          />
        </div>

        {/* Live DOM Caption */}
        <p
          data-testid="meme-corner-caption"
          className="font-display text-body-l sm:text-display-s font-extrabold text-ink leading-snug mt-2 max-w-sm px-1 break-words"
        >
          &ldquo;{activeMeme.caption_text}&rdquo;
        </p>
      </div>

      {/* Feedback & Voting Section */}
      <div className="flex flex-col gap-3 pt-1">
        {selectedRating ? (
          /* Post-Vote Confirmation State */
          <div
            data-testid="rating-confirmed"
            className="flex items-center justify-between p-3 rounded-m bg-mint/20 border-[2px] border-ink animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2 text-ink">
              <Check className="w-4 h-4 text-ink stroke-[3]" />
              <span className="font-display text-body-s font-bold">
                {selectedRating === "funny" ? "Marked as Funny! 😂" : "Feedback noted! 👍"}
              </span>
            </div>
            <span className="text-caption font-body text-muted">
              Thanks for curating
            </span>
          </div>
        ) : (
          /* Interactive Voting Buttons (>= 44x44px touch targets) */
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              data-testid="rate-funny-btn"
              onClick={() => handleRate("funny")}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-m border-[2.5px] border-ink bg-sun/40 hover:bg-sun text-ink font-display font-bold text-body-s flex items-center justify-center gap-2 shadow-sticker active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-120 touch-manipulation cursor-pointer"
              aria-label="Rate funny"
            >
              <Smile className="w-5 h-5 stroke-[2.5]" />
              <span>Funny</span>
            </button>

            <button
              type="button"
              data-testid="rate-not-for-me-btn"
              onClick={() => handleRate("not_for_me")}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-m border-[2.5px] border-ink bg-paper hover:bg-lavender/50 text-ink font-display font-bold text-body-s flex items-center justify-center gap-2 shadow-sticker active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-120 touch-manipulation cursor-pointer"
              aria-label="Rate not for me"
            >
              <Meh className="w-5 h-5 stroke-[2.5]" />
              <span>Not for me</span>
            </button>
          </div>
        )}

        {/* CTA to Meme Lab Caption Composer */}
        <div className="flex items-center justify-between pt-1 border-t-[1.5px] border-ink/20 text-caption font-body">
          <span className="text-muted">Have a funnier idea?</span>
          <Link
            href="/memes/new"
            className="inline-flex items-center gap-1 font-display font-bold text-violet hover:underline touch-manipulation py-1"
          >
            <span>Write a caption</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
