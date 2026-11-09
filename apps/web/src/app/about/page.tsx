"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Sparkles, Compass, Heart, Globe } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between py-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text pl-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <h1 className="font-heading text-lg font-bold text-text">
          About Oddly
        </h1>

        <div className="w-12" />
      </header>

      <div className="relative z-20 space-y-6 text-text">
        {/* Brand Emblem */}
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="flex items-center justify-center -space-x-4">
            <div className="w-16 h-16 rounded-full bg-violet/30 border-2 border-violet backdrop-blur-sm" />
            <div className="w-16 h-16 rounded-full bg-mint/30 border-2 border-mint backdrop-blur-sm shadow-[0_0_25px_rgba(46,234,177,0.4)]" />
          </div>

          <div className="space-y-1">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text">
              Someone out there is oddly like you
            </h2>
            <p className="font-heading text-base text-mint font-semibold">
              Five picks. About 30 seconds. One stranger twin anywhere in the world.
            </p>
          </div>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 leading-relaxed">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-violet font-heading font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>The Ritual</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Every day at <strong>07:00 IST</strong>, Oddly drops five seemingly trivial, delightfully odd questions. You answer instinctively in 30 seconds. No essays. No self-conscious profile curation. Just your unfiltered, quirky human preferences.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-mint font-heading font-bold text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>The Mathematics of Serendipity</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Behind the curtain, our pairing engine computes multidimensional vector distances across every player on the planet who made their picks today. We find the one soul whose exact choices aligned closest with yours. They might be in Berlin, Tokyo, São Paulo, or Mumbai.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-flame font-heading font-bold text-xs uppercase tracking-wider">
              <Heart className="w-4 h-4" />
              <span>Anti-Doomscroll Philosophy</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Modern internet apps are engineered to trap your attention for hours in endless feeds. Oddly is the opposite: <strong>a 30-second daily punctuation mark</strong> of wonder. Once your twin is revealed, you&apos;re done for the day. No infinite scroll. No algorithms trying to make you outraged. Just a gentle reminder that across billions of humans, you are never truly alone.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Zero Account Required</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              You don&apos;t even need an account to play. Oddly was built on DPDP principles: zero plaintext email storage, absolute data minimisation, and zero ads.
            </p>
          </section>

          <div className="pt-4 border-t border-border flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/")}
              className="w-full sm:w-auto"
            >
              Play Today&apos;s Five
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
