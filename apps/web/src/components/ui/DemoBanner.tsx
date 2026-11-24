"use client";

import React, { useEffect, useState } from "react";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_ODDLY_DEMO === "1" ||
      typeof window !== "undefined" && window.location.search.includes("demo=1")
    ) {
      setIsDemo(true);
    }
  }, []);

  if (!isDemo) return null;

  return (
    <div
      data-testid="demo-banner"
      className="sticky top-0 z-50 flex items-center justify-center bg-sun px-4 py-1.5 border-b-[2.5px] border-ink text-ink font-display text-xs font-extrabold uppercase tracking-widest shadow-sticker"
    >
      <span>⚡ DEMO MODE — Synthetic Simulation Data Only</span>
    </div>
  );
}
