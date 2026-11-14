"use client";

import React, { useEffect } from "react";
import { m, useReducedMotion } from "framer-motion";
import { feedback } from "@/lib/feedback";

export function SearchMapAnimation({ onComplete }: { onComplete: () => void }) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    feedback.playSound("tick");
    const timer = setTimeout(
      () => {
        onComplete();
      },
      shouldReduceMotion ? 100 : 1800
    );

    return () => clearTimeout(timer);
  }, [onComplete, shouldReduceMotion]);

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0 z-40 bg-cream flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none overflow-hidden"
    >
      {/* Section 12: Static SVG Globe with lavender fill, ink dots, and pulsing pin */}
      <div className="relative w-64 h-64 mb-6 flex items-center justify-center">
        {/* Globe Base Circle */}
        <div className="w-56 h-56 rounded-pill bg-lavender border-[2.5px] border-ink shadow-sticker relative overflow-hidden flex items-center justify-center">
          {/* Static SVG Map Land Grid */}
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full text-ink opacity-40 pointer-events-none"
            aria-hidden="true"
          >
            {/* Latitude/Longitude grid lines */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="100" cy="100" rx="80" ry="36" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="1.5" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="1.5" />

            {/* Ink Land Dots */}
            <circle cx="68" cy="74" r="3" fill="currentColor" />
            <circle cx="82" cy="62" r="3.5" fill="currentColor" />
            <circle cx="94" cy="70" r="3" fill="currentColor" />
            <circle cx="120" cy="80" r="3.5" fill="currentColor" />
            <circle cx="138" cy="94" r="3" fill="currentColor" />
            <circle cx="75" cy="115" r="3" fill="currentColor" />
            <circle cx="130" cy="130" r="3.5" fill="currentColor" />
            <circle cx="105" cy="140" r="3" fill="currentColor" />
          </svg>

          {/* User's Pin (Violet with ink outline) */}
          <div className="absolute top-[38%] left-[36%] w-7 h-7 rounded-pill bg-violet border-[2px] border-ink flex items-center justify-center shadow-sticker z-10">
            <div className="w-2.5 h-2.5 rounded-pill bg-paper" />
          </div>

          {/* Searching / Twin Pin (Coral with ink outline & pulsing ping) */}
          {!shouldReduceMotion && (
            <m.div
              animate={{ scale: [1, 2], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
              className="absolute top-[52%] right-[28%] w-8 h-8 rounded-pill bg-coral border-[1.5px] border-ink"
            />
          )}

          <div className="absolute top-[52%] right-[28%] w-7 h-7 rounded-pill bg-coral border-[2px] border-ink flex items-center justify-center shadow-sticker z-10">
            <div className="w-2.5 h-2.5 rounded-pill bg-paper" />
          </div>
        </div>
      </div>

      <h2 className="font-display text-xl sm:text-2xl font-extrabold text-ink mb-2 tracking-tight">
        Looking across the world for your twin...
      </h2>

      <span className="text-caption font-bold text-muted mt-3">Tap to skip</span>
    </div>
  );
}
