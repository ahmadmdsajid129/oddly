"use client";

import React, { useEffect, useState } from "react";

export interface StatusBannerProps {
  level: number;
  bannerCopyKey?: string | null;
  onDismiss?: () => void;
}

const DEGRADATION_COPY: Record<number, { title: string; message: string; severity: "info" | "warning" | "alert" }> = {
  1: {
    title: "Heavy Traffic",
    message: "Lots of players online right now. Stats update slightly slower.",
    severity: "info",
  },
  2: {
    title: "Peak Drop Traffic",
    message: "Community matching is running at high capacity. Twin upgrades may take a moment.",
    severity: "warning",
  },
  3: {
    title: "High Demand — Background Matching",
    message: "Your picks are safely stored. We're finding your stranger twin in the background!",
    severity: "alert",
  },
  4: {
    title: "Offline Mode",
    message: "Oddly is running in offline mode. Your picks are securely saved on your device.",
    severity: "alert",
  },
};

export const StatusBanner: React.FC<StatusBannerProps> = ({ level, bannerCopyKey, onDismiss }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  if (level <= 0) return null;

  const copy = DEGRADATION_COPY[level] || DEGRADATION_COPY[1]!;

  const bgColors = {
    info: "bg-blue-900/40 border-blue-500/40 text-blue-200",
    warning: "bg-amber-900/40 border-amber-500/40 text-amber-200",
    alert: "bg-rose-900/50 border-rose-500/50 text-rose-100",
  }[copy.severity];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full border-b py-2 px-4 flex items-center justify-between backdrop-blur-md transition-opacity ${bgColors} ${
        prefersReducedMotion ? "transition-none" : "duration-300"
      }`}
    >
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
        <span className="w-2 h-2 rounded-full animate-pulse bg-current" aria-hidden="true" />
        <span>
          <strong>{copy.title}:</strong> {bannerCopyKey || copy.message}
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs opacity-70 hover:opacity-100 ml-4 underline focus:outline-none focus:ring-1 focus:ring-current rounded"
          aria-label="Dismiss status banner"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export interface FriendlyErrorScreenProps {
  status: 429 | 503;
  retryAfterSeconds?: number;
  onRetry?: () => void;
}

export const FriendlyErrorScreen: React.FC<FriendlyErrorScreenProps> = ({
  status,
  retryAfterSeconds = 30,
  onRetry,
}) => {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const title = status === 429 ? "A Little Too Fast!" : "Oddly is Catching Its Breath";
  const message =
    status === 429
      ? "Too many requests from this device or network. Please pause a moment before retrying."
      : "The 07:00 IST morning rush is massive right now. We are safely shedding load to prevent crashes.";

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold mb-4">
        {remaining > 0 ? remaining : "✓"}
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
      <p className="text-sm text-neutral-400 mb-6">{message}</p>
      <button
        disabled={remaining > 0}
        onClick={onRetry}
        className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
          remaining > 0
            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            : "bg-white text-black hover:bg-neutral-200"
        }`}
      >
        {remaining > 0 ? `Retrying in ${remaining}s...` : "Retry Now"}
      </button>
    </div>
  );
};

