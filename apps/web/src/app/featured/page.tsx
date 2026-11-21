"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Share2, Award, Calendar, MapPin } from "lucide-react";
import { BrandMark } from "@/components/icons";
import { DynamicIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";
import type { FeaturedMemeItem } from "@oddly/api-client";

export default function FeaturedMemesPage() {
  const { success, info } = useToast();
  const [currentWeek, setCurrentWeek] = useState<FeaturedMemeItem | null>(null);
  const [archive, setArchive] = useState<FeaturedMemeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFeatured() {
      try {
        setIsLoading(true);
        const res = await api.memes.getFeatured();
        if (isMounted && res && res.ok) {
          setCurrentWeek(res.current_week);
          setArchive(res.archive || []);
        }
      } catch (err) {
        console.error("Failed to load featured memes:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleShare = async (meme: FeaturedMemeItem) => {
    feedback.triggerHaptic("select");
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://oddly.app/featured";
    const shareText = `Featured on Oddly this week: "${meme.caption_text}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Oddly Featured Meme",
          text: shareText,
          url: shareUrl,
        });
        success("Shared successfully!");
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      info("Link copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink p-4 sm:p-6 pb-24 max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b-[2.5px] border-ink pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-paper border-[2px] border-ink shadow-sticker text-xs font-display font-extrabold hover:translate-x-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <BrandMark className="w-6 h-6" />
          <span className="font-display font-black text-sm tracking-tight">Oddly Featured</span>
        </div>

        <div className="w-16" />
      </header>

      {/* Hero Badge Intro */}
      <div className="text-center space-y-2 py-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-sun border-[1.5px] border-ink text-xs font-display font-extrabold text-ink shadow-sticker-flat">
          <Award className="w-3.5 h-3.5" />
          <span>Meme of the Week</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
          Curated Showcase
        </h1>
        <p className="font-display text-xs text-muted max-w-md mx-auto">
          Honoring community wit and absurd instinct. Zero public leaderboards, zero competitive ranking walls.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-4 animate-pulse">
          <div className="h-6 bg-cream border border-ink/20 rounded-pill w-1/3 mx-auto" />
          <div className="h-48 bg-cream border border-ink/20 rounded-m max-w-sm mx-auto" />
          <div className="h-8 bg-cream border border-ink/20 rounded-pill w-2/3 mx-auto" />
        </div>
      ) : currentWeek ? (
        /* Current Week Featured Hero Card */
        <div className="rounded-l bg-paper border-[2.5px] border-ink shadow-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
            <span className="flex items-center gap-1 text-xs font-display font-extrabold text-violet">
              <Sparkles className="w-4 h-4" />
              <span>Week of {currentWeek.week_start_date}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-cream border border-ink text-xs font-display font-bold text-muted">
              <MapPin className="w-3 h-3 text-coral" />
              <span>{currentWeek.author_region}</span>
            </span>
          </div>

          {/* Illustration Container */}
          <div className="rounded-m bg-cream border-[2px] border-ink p-6 flex flex-col items-center justify-center relative shadow-inner">
            <DynamicIllustration
              assetKey={currentWeek.template.illustration_registry_key}
              size={176}
              className="w-44 h-44 object-contain"
            />
            <div className="mt-4 p-4 rounded-m bg-paper border-[2px] border-ink shadow-sticker text-center max-w-md w-full">
              <p className="font-display text-base font-extrabold text-ink leading-snug">
                &ldquo;{currentWeek.caption_text}&rdquo;
              </p>
            </div>
          </div>

          {/* Curator Note */}
          {currentWeek.curator_notes && (
            <div className="p-3.5 rounded-m bg-cream border-[1.5px] border-ink space-y-1">
              <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-muted block">
                Curator Note
              </span>
              <p className="font-display text-xs text-ink italic">
                {currentWeek.curator_notes}
              </p>
            </div>
          )}

          {/* Card Footer: Consensus & Share */}
          <div className="pt-2 border-t-[1.5px] border-ink/20 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-mint text-ink border border-ink text-xs font-display font-black">
              <span>{currentWeek.funny_percentage}% Funny</span>
              <span className="font-normal text-[10px] text-ink/80">({currentWeek.raters_count} raters)</span>
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleShare(currentWeek)}
              className="inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-2">
          <p className="font-display text-sm font-bold text-ink">
            No featured meme published for this week yet.
          </p>
          <p className="font-display text-xs text-muted">
            The next curated Meme of the Week will be announced every Monday.
          </p>
        </div>
      )}

      {/* Past Archive Grid */}
      {archive.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="font-display text-lg font-black text-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet" />
            <span>Past Featured Memes</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {archive.map((item) => (
              <div
                key={item.id}
                className="rounded-m bg-paper border-[2px] border-ink shadow-card p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-display font-bold text-muted border-b border-ink/10 pb-1.5">
                    <span>{item.week_start_date}</span>
                    <span>{item.author_region}</span>
                  </div>

                  <div className="p-3 rounded-s bg-cream border border-ink flex items-center justify-center">
                    <DynamicIllustration
                      assetKey={item.template.illustration_registry_key}
                      size={80}
                      className="w-20 h-20 object-contain"
                    />
                  </div>

                  <p className="font-display text-xs font-bold text-ink text-center line-clamp-3">
                    &ldquo;{item.caption_text}&rdquo;
                  </p>
                </div>

                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[11px] font-display font-extrabold">
                  <span className="text-violet">{item.funny_percentage}% Funny</span>
                  <button
                    type="button"
                    onClick={() => void handleShare(item)}
                    className="text-muted hover:text-ink underline underline-offset-2"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
