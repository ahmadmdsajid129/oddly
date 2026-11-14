"use client";

import React from "react";

export type AtmosphereMode = "hero" | "text" | "number" | "colour" | "image" | "word";

interface AtmosphereProps {
  mode?: AtmosphereMode;
  className?: string;
  activeColorHex?: string;
}

// Section 1: Personality - Cream desk background, no blurry glow or ambient chrome gradients
export function Atmosphere({ className = "" }: AtmosphereProps) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-10 bg-cream ${className}`}
      aria-hidden="true"
    />
  );
}
