"use client";

import React, { useState, useEffect } from "react";
import { Clock, RefreshCw, AlertCircle, Hourglass, ZapOff } from "lucide-react";
import { Button } from "./Button";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/**
 * 1. FreshnessLabel (Task P1.22)
 * Subtle sticker indicator displayed when cached, degraded, or stale data
 * is served to the player (Level L1/L2 or offline fallback).
 */
export interface FreshnessLabelProps {
  timestamp?: Date | string | number;
  label?: string;
  isStale?: boolean;
  className?: string;
}

export function FreshnessLabel({
  timestamp,
  label,
  isStale = false,
  className,
}: FreshnessLabelProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");

  useEffect(() => {
    if (!timestamp) return;

    function format() {
      const date = new Date(timestamp!);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      if (diffMin < 1) {
        setRelativeTime("just now");
      } else if (diffMin === 1) {
        setRelativeTime("1m ago");
      } else if (diffMin < 60) {
        setRelativeTime(`${diffMin}m ago`);
      } else {
        const diffHours = Math.floor(diffMin / 60);
        setRelativeTime(`${diffHours}h ago`);
      }
    }

    format();
    const interval = setInterval(format, 30000);
    return () => clearInterval(interval);
  }, [timestamp]);

  const displayLabel = label || (relativeTime ? `Updated ${relativeTime}` : "Cached data");

  return (
    <span
      role="status"
      data-testid="freshness-label"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[11px] font-bold border-[1.5px] border-ink select-none shadow-xs",
        isStale
          ? "bg-sun text-ink"
          : "bg-paper text-muted",
        className
      )}
    >
      <Clock className="w-3 h-3 text-ink shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}

/**
 * 2. RateLimitScreen (429 Too Many Requests - Task P1.22)
 * Friendly, non-punitive sticker card showing live countdown to retry.
 */
export interface RateLimitScreenProps {
  retryAfterSeconds?: number;
  onRetry?: () => void;
  className?: string;
}

export function RateLimitScreen({
  retryAfterSeconds = 15,
  onRetry,
  className,
}: RateLimitScreenProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    setSecondsRemaining(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const isReady = secondsRemaining === 0;

  return (
    <div
      data-testid="rate-limit-screen"
      className={cn(
        "min-h-[60vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none",
        className
      )}
    >
      <div className="w-full max-w-md bg-paper border-[2.5px] border-ink shadow-card rounded-xl p-6 sm:p-8 flex flex-col items-center gap-5">
        {/* Playful Sticker Badge */}
        <div className="w-16 h-16 rounded-pill bg-sun border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-ink">
          <Hourglass className="w-8 h-8 text-ink animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-cream border border-ink text-[11px] font-extrabold uppercase text-ink">
            <span>HTTP 429 • Catch Your Breath</span>
          </div>

          <h2 className="font-display text-display-m font-extrabold text-ink">
            Whoa, slow down a notch!
          </h2>

          <p className="font-body text-body-s text-muted max-w-xs mx-auto leading-relaxed">
            You've made a few too many taps in a short moment. Give the desk a second to catch up before trying again.
          </p>
        </div>

        {/* Live Countdown Display */}
        <div className="bg-cream border-[2px] border-ink rounded-m p-3 w-full flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-ink" />
          <span className="font-display font-extrabold text-ink text-sm sm:text-base">
            {isReady ? "Ready to try again!" : `Retry available in ${secondsRemaining}s`}
          </span>
        </div>

        {/* Action Button */}
        {onRetry && (
          <Button
            variant={isReady ? "primary" : "secondary"}
            size="md"
            disabled={!isReady}
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="w-full min-h-[48px]"
          >
            {isReady ? "Try again" : `Please wait (${secondsRemaining}s)`}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 3. ServiceOverloadScreen (503 Service Unavailable / Peak Overload - Task P1.22)
 * Friendly, transparent overload feedback screen with countdown and retry.
 */
export interface ServiceOverloadScreenProps {
  retryAfterSeconds?: number;
  onRetry?: () => void;
  className?: string;
}

export function ServiceOverloadScreen({
  retryAfterSeconds = 30,
  onRetry,
  className,
}: ServiceOverloadScreenProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    setSecondsRemaining(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const isReady = secondsRemaining === 0;

  return (
    <div
      data-testid="service-overload-screen"
      className={cn(
        "min-h-[60vh] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none",
        className
      )}
    >
      <div className="w-full max-w-md bg-paper border-[2.5px] border-ink shadow-card rounded-xl p-6 sm:p-8 flex flex-col items-center gap-5">
        {/* Overload Glyph */}
        <div className="w-16 h-16 rounded-pill bg-coral border-[2.5px] border-ink shadow-sticker flex items-center justify-center text-paper">
          <ZapOff className="w-8 h-8 text-paper" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-cream border border-ink text-[11px] font-extrabold uppercase text-ink">
            <span>HTTP 503 • High Rush Hour</span>
          </div>

          <h2 className="font-display text-display-m font-extrabold text-ink">
            Everyone's playing Oddly right now
          </h2>

          <p className="font-body text-body-s text-muted max-w-xs mx-auto leading-relaxed">
            Our servers are handling peak morning traffic. Your session is held in line and will reconnect cleanly.
          </p>
        </div>

        {/* Ticker Box */}
        <div className="bg-cream border-[2px] border-ink rounded-m p-3 w-full flex items-center justify-center gap-2">
          <RefreshCw className={cn("w-4 h-4 text-ink", !isReady && "animate-spin")} />
          <span className="font-display font-extrabold text-ink text-sm sm:text-base">
            {isReady ? "Ready to reconnect" : `Reconnecting in ${secondsRemaining}s`}
          </span>
        </div>

        {/* Reconnect Action */}
        {onRetry && (
          <Button
            variant="primary"
            size="md"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="w-full min-h-[48px]"
          >
            {isReady ? "Reconnect now" : "Retry now anyway"}
          </Button>
        )}
      </div>
    </div>
  );
}
