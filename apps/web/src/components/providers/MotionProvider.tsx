"use client";

import React from "react";
import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Global LazyMotion Provider (Stage R2-PATCH-2 Item 3)
 * Provides `domAnimation` features tree-shaken across all child components,
 * reducing Framer Motion runtime from ~50.7 KB gzip to ~15 KB gzip.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

