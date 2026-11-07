"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type AtmosphereMode = "hero" | "text" | "number" | "colour" | "image" | "word";

interface AtmosphereProps {
  mode?: AtmosphereMode;
  className?: string;
  activeColorHex?: string; // Optional custom tint for colour question select
}

export function Atmosphere({ mode = "hero", className = "", activeColorHex }: AtmosphereProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div
        className={`fixed inset-0 pointer-events-none -z-10 bg-bg transition-colors duration-500 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Question Type Hue Glow Map
  const questionGlowMap: Record<AtmosphereMode, { color1: string; color2: string }> = {
    hero: { color1: "rgba(108, 76, 241, 0.22)", color2: "rgba(255, 107, 94, 0.18)" },
    text: { color1: "rgba(108, 76, 241, 0.20)", color2: "rgba(139, 114, 255, 0.12)" },
    number: { color1: "rgba(255, 107, 94, 0.20)", color2: "rgba(255, 129, 118, 0.12)" },
    colour: {
      color1: activeColorHex ? `${activeColorHex}33` : "rgba(61, 219, 176, 0.20)",
      color2: "rgba(31, 191, 147, 0.14)",
    },
    image: { color1: "rgba(76, 201, 240, 0.20)", color2: "rgba(63, 55, 201, 0.14)" },
    word: { color1: "rgba(245, 158, 11, 0.20)", color2: "rgba(255, 210, 63, 0.12)" },
  };

  const currentColors = questionGlowMap[mode] || questionGlowMap.hero;

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${className}`}
      aria-hidden="true"
    >
      {/* Drifting Circle 1 (Violet / Accent 1) */}
      <motion.div
        animate={{
          x: [0, 24, -16, 0],
          y: [0, -32, 16, 0],
          scale: [1, 1.08, 0.94, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-75"
        style={{ background: currentColors.color1 }}
      />

      {/* Drifting Circle 2 (Coral / Accent 2) */}
      <motion.div
        animate={{
          x: [0, -28, 20, 0],
          y: [0, 24, -20, 0],
          scale: [1, 0.92, 1.06, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-65"
        style={{ background: currentColors.color2 }}
      />

      {/* Hero Overlap Mint Luminous Glow (on hero screen) */}
      {mode === "hero" && (
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl bg-mint pointer-events-none"
        />
      )}
    </div>
  );
}
