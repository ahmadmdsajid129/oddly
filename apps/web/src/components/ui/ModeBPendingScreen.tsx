"use client";

import React from "react";
import { m, useReducedMotion } from "framer-motion";
import { Button } from "./Button";
import { RefreshCw, Home, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ModeBPendingScreenProps {
  onCheckStatus?: () => void;
  onHome?: () => void;
  isPolling?: boolean;
  requestId?: string;
  className?: string;
}

/**
 * ModeBPendingScreen (Task P1.21)
 * Asynchronous transition screen for Mode B persistence (Level L3 Surge / HTTP 202).
 * Calming two-dot animation with strict reduced-motion support.
 */
export function ModeBPendingScreen({
  onCheckStatus,
  onHome,
  isPolling = false,
  requestId,
  className,
}: ModeBPendingScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      data-testid="mode-b-pending-screen"
      className={cn(
        "min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none",
        className
      )}
    >
      <div className="w-full max-w-md bg-paper border-[2.5px] border-ink shadow-card rounded-xl p-6 sm:p-8 flex flex-col items-center gap-6">
        {/* Animated Two-Dot Motif */}
        <div
          className="relative w-32 h-24 flex items-center justify-center"
          aria-hidden="true"
        >
          {shouldReduceMotion ? (
            // Static accessible fallback for reduced-motion users
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-pill bg-mint border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-xs font-black text-ink">
                You
              </div>
              <div className="h-0.5 w-6 border-t-2 border-dashed border-ink" />
              <div className="w-10 h-10 rounded-pill bg-violet border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-xs font-black text-paper">
                Twin
              </div>
            </div>
          ) : (
            // Dynamic looping two-dot animation
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Dot A (Player / Mint) */}
              <m.div
                className="absolute w-10 h-10 rounded-pill bg-mint border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-xs font-black text-ink"
                animate={{
                  x: [-24, 0, -24],
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                You
              </m.div>

              {/* Dot B (Stranger Twin / Violet) */}
              <m.div
                className="absolute w-10 h-10 rounded-pill bg-violet border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-xs font-black text-paper"
                animate={{
                  x: [24, 0, 24],
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.1,
                }}
              >
                Twin
              </m.div>
            </div>
          )}
        </div>

        {/* Messaging */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-lavender border-[1.5px] border-ink text-xs font-extrabold text-ink uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-ink" />
            <span>Picks Received</span>
          </div>

          <h2 className="font-display text-display-m font-extrabold text-ink">
            Saved! Finding your twin...
          </h2>

          <p className="font-body text-body-s text-muted max-w-xs mx-auto leading-relaxed">
            Lots of strangers are playing right now. Your picks are safe, and our matching worker is pairing you in the background. This may take a minute.
          </p>
        </div>

        {/* Tracking ID Badge */}
        {requestId && (
          <div className="font-mono text-[11px] text-muted/70 bg-cream border border-ink/20 rounded-pill px-3 py-1">
            Ticket: {requestId.slice(0, 12)}...
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
          {onCheckStatus && (
            <Button
              variant="primary"
              size="md"
              isLoading={isPolling}
              onClick={onCheckStatus}
              leftIcon={<RefreshCw className={cn("w-4 h-4", isPolling && "animate-spin")} />}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {isPolling ? "Checking..." : "Check status"}
            </Button>
          )}

          {onHome && (
            <Button
              variant="secondary"
              size="md"
              onClick={onHome}
              leftIcon={<Home className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Back home
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
