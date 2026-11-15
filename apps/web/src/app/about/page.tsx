"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";
import { ArrowLeft, Compass, Heart, Globe } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back</span>
        </Button>

        <h1 className="font-display text-display-m font-extrabold text-ink">
          About Oddly
        </h1>

        <div className="w-12" />
      </header>

      <div className="space-y-6">
        {/* Brand Emblem */}
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-20 h-20 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center">
            <BrandMark size={44} />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Someone out there is oddly like you
            </h2>
            <p className="font-display text-base text-violet font-bold">
              Five picks. About 30 seconds. One stranger twin anywhere in the world.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-6 leading-relaxed">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-ink font-display font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4 text-violet stroke-[2.5]" />
              <span>The Ritual</span>
            </div>
            <p className="font-body text-sm text-muted leading-relaxed">
              Every day at <strong>07:00 IST</strong>, Oddly drops five fresh intuition questions across the globe. Each question takes a few seconds to answer. When you lock in your choices, our real-time matching engine scans for your closest candidate twin.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-ink font-display font-bold text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4 text-violet stroke-[2.5]" />
              <span>Global Stranger Twins</span>
            </div>
            <p className="font-body text-sm text-muted leading-relaxed">
              Oddly matches you with a real stranger across countries and cultures based purely on how your intuition aligns. You see which answers you shared, where in the world they are, and your final rarity tier.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-ink font-display font-bold text-xs uppercase tracking-wider">
              <Heart className="w-4 h-4 text-coral stroke-[2.5]" />
              <span>Zero Social Fatigue</span>
            </div>
            <p className="font-body text-sm text-muted leading-relaxed">
              No endless feeds, no follower counts, no algorithmic rage bait. Just a daily moment of serendipity connecting you to another human mind somewhere on Earth.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
