"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Radio, Repeat, Sparkles, Heart } from "lucide-react";
import { TwinGlobeMap } from "@/components/globe/TwinGlobeMap";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { GlobeResponse } from "@oddly/api-client";

export default function TwinGlobePage() {
  const [data, setData] = useState<GlobeResponse | null>(null);
  const [activeMode, setActiveMode] = useState<"live" | "replay">("live");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchGlobe = async () => {
      try {
        const res = await api.globe.get();
        if (isMounted && res && res.ok) {
          setData(res);
          setActiveMode(res.mode);
        }
      } catch (err) {
        console.error("Failed to load globe data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchGlobe();
    // Refresh every 60s
    const timer = setInterval(fetchGlobe, 60000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const isLive = data?.mode === "live";

  return (
    <main className="min-h-screen bg-cream text-ink p-4 sm:p-6 max-w-2xl mx-auto pb-24 select-none">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-pill bg-paper border-[2px] border-ink shadow-sticker flex items-center justify-center text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display text-display-m font-extrabold text-ink leading-tight">
              Twin Globe
            </h1>
            <p className="font-body text-xs text-muted">
              Live arcs between stranger twins forming across the world
            </p>
          </div>
        </div>

        {/* Live vs Replay Status Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border-[2px] border-ink shadow-sticker text-xs font-display font-extrabold bg-paper">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-ink">
              <span className="w-2.5 h-2.5 rounded-pill bg-mint border border-ink animate-pulse" />
              <span>Live</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted">
              <Repeat className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Replay</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Map View */}
      <div className="space-y-4">
        <TwinGlobeMap
          arcs={data?.arcs || []}
          userOrbits={data?.user_orbits || []}
        />

        {/* Status Callout */}
        <div className="p-4 rounded-l bg-paper border-[2.5px] border-ink shadow-card flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-display font-bold text-muted uppercase tracking-wider block">
              {data?.mode === "live" ? "Current Atmosphere" : "Honest Mode Notice"}
            </span>
            <p className="font-display text-xs font-extrabold text-ink truncate">
              {data?.status_text || "Connecting to global network..."}
            </p>
          </div>

          {data?.user_orbits && data.user_orbits.length > 0 ? (
            <Link
              href="/orbit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-violet text-paper border-[1.5px] border-ink font-display text-xs font-bold shadow-sticker-flat flex-shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-sun stroke-sun" />
              <span>{data.user_orbits.length} Active Orbit</span>
            </Link>
          ) : (
            <Link
              href="/orbit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-cream border-[1.5px] border-ink font-display text-xs font-bold text-ink shadow-sticker-flat flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span>View Orbits</span>
            </Link>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 rounded-l bg-cream border-[1.5px] border-ink grid grid-cols-2 gap-3 text-xs font-display font-bold">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-dashed border-ink" />
            <span className="text-muted">Twin Matches (k &ge; 20)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-pill bg-violet border border-ink" />
            <span className="text-ink">Your Active Orbits</span>
          </div>
        </div>
      </div>
    </main>
  );
}

