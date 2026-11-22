"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, Radio, WifiOff, X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type DegradationLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export interface DegradationBannerProps {
  level: DegradationLevel;
  dismissible?: boolean;
  onDismiss?: () => void;
  customMessage?: string;
  className?: string;
}

interface LevelConfig {
  badgeLabel: string;
  badgeClass: string;
  defaultMessage: string;
  subMessage?: string;
  icon: React.ReactNode;
  canDismiss: boolean;
}

const LEVEL_CONFIGS: Record<Exclude<DegradationLevel, "L0">, LevelConfig> = {
  L1: {
    badgeLabel: "L1 Conserve",
    badgeClass: "bg-sun text-ink border-[1.5px] border-ink",
    defaultMessage: "High volume right now. Some numbers update every few minutes.",
    subMessage: "All game features remain fully playable.",
    icon: <Activity className="w-4 h-4 text-ink shrink-0" aria-hidden="true" />,
    canDismiss: true,
  },
  L2: {
    badgeLabel: "L2 High Traffic",
    badgeClass: "bg-sun text-ink border-[1.5px] border-ink font-bold",
    defaultMessage: "Busy right now. Your picks are safe.",
    subMessage: "Non-essential features are resting to keep the Drop smooth.",
    icon: <Radio className="w-4 h-4 text-ink shrink-0 animate-pulse" aria-hidden="true" />,
    canDismiss: true,
  },
  L3: {
    badgeLabel: "L3 Surge Active",
    badgeClass: "bg-coral text-paper border-[1.5px] border-ink font-extrabold",
    defaultMessage: "Very high traffic right now. Submissions are queued safely.",
    subMessage: "Matching will finish shortly in the background.",
    icon: <AlertTriangle className="w-4 h-4 text-paper shrink-0 animate-bounce" aria-hidden="true" />,
    canDismiss: false,
  },
  L4: {
    badgeLabel: "L4 Offline Mode",
    badgeClass: "bg-ink text-paper border-[1.5px] border-ink font-black",
    defaultMessage: "We are having trouble reaching our servers.",
    subMessage: "Your picks are safely saved on this device and will submit automatically when reconnected.",
    icon: <WifiOff className="w-4 h-4 text-paper shrink-0" aria-hidden="true" />,
    canDismiss: false,
  },
};

/**
 * DegradationBanner (Task P1.20)
 * Non-alarmist, brand-aligned indicator informing players when the system
 * is operating in Level L1–L4 load shedding (Section 12 & docs/degradation-playbook.md).
 * Completely suppressed at Level L0 (healthy state).
 */
export function DegradationBanner({
  level,
  dismissible,
  onDismiss,
  customMessage,
  className,
}: DegradationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Healthy state renders nothing
  if (level === "L0" || dismissed) {
    return null;
  }

  const config = LEVEL_CONFIGS[level];
  const isDismissible = dismissible !== undefined ? dismissible : config.canDismiss;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={`degradation-banner-${level.toLowerCase()}`}
      className={cn(
        "w-full rounded-m bg-paper border-[2.5px] border-ink shadow-sticker p-3 text-ink transition-all select-none",
        "flex items-start sm:items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
        {/* Level Tag Pill */}
        <span
          className={cn(
            "rounded-pill px-2.5 py-0.5 text-xs font-display flex items-center gap-1.5 shrink-0 shadow-xs",
            config.badgeClass
          )}
        >
          {config.icon}
          <span>{config.badgeLabel}</span>
        </span>

        {/* Message */}
        <div className="text-xs sm:text-sm font-body leading-tight text-ink min-w-0">
          <span className="font-bold">{customMessage || config.defaultMessage}</span>
          {config.subMessage && (
            <span className="hidden sm:inline text-muted font-medium ml-1.5">
              {config.subMessage}
            </span>
          )}
        </div>
      </div>

      {/* Dismiss Button (min 44x44px target) */}
      {isDismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss status banner"
          className="min-w-[44px] min-h-[44px] -mr-1.5 -my-1.5 flex items-center justify-center rounded-m text-ink/70 hover:text-ink active:scale-95 transition-transform"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
