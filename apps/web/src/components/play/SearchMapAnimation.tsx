"use client";

import React, { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/icons";

export function SearchMapAnimation({ onComplete }: { onComplete: () => void }) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, shouldReduceMotion ? 100 : 1500);

    return () => clearTimeout(timer);
  }, [onComplete, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <div
        onClick={onComplete}
        className="fixed inset-0 z-40 bg-bg flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
      >
        <BrandMark size={64} className="mb-6 animate-pulse" />
        <h2 className="font-heading text-xl font-bold text-text mb-2">Looking across the world for your twin...</h2>
        <span className="text-xs text-text-muted mt-4">Tap to skip</span>
      </div>
    );
  }

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0 z-40 bg-bg flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none overflow-hidden"
    >
      {/* Background Dot Matrix Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
        <svg width="400" height="300" viewBox="0 0 400 300" fill="none">
          <pattern id="dot-matrix" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#B3AEE0" />
          </pattern>
          <rect width="400" height="300" fill="url(#dot-matrix)" />
        </svg>
      </div>

      {/* Traveling Dots Converging */}
      <div className="relative w-72 h-44 mb-8 flex items-center justify-center">
        {/* Violet Dot Traveling from Top-Left */}
        <motion.div
          initial={{ x: -110, y: -45, scale: 0.8 }}
          animate={{ x: -10, y: 0, scale: 1.2 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute w-8 h-8 rounded-full bg-violet shadow-[0_0_24px_rgba(108,76,241,0.8)] border border-white/40"
        />

        {/* Coral Dot Traveling from Bottom-Right */}
        <motion.div
          initial={{ x: 110, y: 45, scale: 0.8 }}
          animate={{ x: 10, y: 0, scale: 1.2 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute w-8 h-8 rounded-full bg-coral shadow-[0_0_24px_rgba(255,107,94,0.8)] border border-white/40"
        />

        {/* Central Luminous Brand Mark Burst at Meeting */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
          transition={{ delay: 0.95, duration: 0.5, ease: "easeOut" }}
          className="relative z-10"
        >
          <BrandMark size={56} />
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="font-heading text-lg sm:text-xl font-bold text-text mb-2 tracking-tight"
      >
        Looking across the world for your twin...
      </motion.h2>

      <span className="text-xs text-text-muted mt-3 font-body">Tap to skip</span>
    </div>
  );
}
