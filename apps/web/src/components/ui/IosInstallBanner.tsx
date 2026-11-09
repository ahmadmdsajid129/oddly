/**
 * @file IosInstallBanner.tsx
 * @package @oddly/web
 *
 * iOS Safari Home-Screen Installation Instruction Banner (P10.07).
 * Guides iOS Safari users on tapping the Share sheet icon and selecting "Add to Home Screen".
 */

"use client";

import React, { useEffect, useState } from "react";
import { Share, PlusSquare, X } from "lucide-react";

export function IosInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Detect standalone display mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

    // Only show on iOS browser when not already installed
    if (isIos && !isStandalone) {
      const dismissed = localStorage.getItem("oddly_ios_install_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    }
  }, []);

  if (!showBanner) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem("oddly_ios_install_dismissed", "true");
    } catch {
      // ignore
    }
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto p-4 rounded-2xl bg-surface border border-border shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="w-9 h-9 rounded-full bg-violet/10 text-violet flex items-center justify-center shrink-0 mt-0.5">
        <Share className="w-4 h-4" />
      </div>

      <div className="flex-1 space-y-1 text-left">
        <div className="text-xs font-bold text-text">Install Oddly on iOS</div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Tap the <strong className="text-text">Share</strong> button below and select{" "}
          <strong className="text-text inline-flex items-center gap-1">
            <PlusSquare className="w-3 h-3" /> Add to Home Screen
          </strong>{" "}
          for daily drop notifications.
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded-full text-text-muted hover:text-text cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
