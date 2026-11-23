"use client";

import React, { useState, useEffect } from "react";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface Slider7CardProps {
  questionId: string;
  leftLabel: string;
  rightLabel: string;
  midLabel?: string | null;
  value?: number;
  onChange: (val: number) => void;
  onLockIn?: (val: number) => void;
  className?: string;
}

/**
 * Slider7Card (Stage L2 / Phase 10M / P10M.04 & P10M.05)
 *
 * Rules:
 * - 7 discrete positions (1 to 7 continuum).
 * - Endpoints labeled with words (e.g. "Early bird" to "Night owl").
 * - NO numbers displayed as "scores" (per Spec F33 & Design Guidelines).
 * - 7 clickable discrete tap notches (>= 44x44 px touch targets).
 * - Physical sticker track and tactile thumb with hard offset shadow.
 * - ArrowLeft / ArrowRight keyboard navigation.
 * - Full ARIA slider attributes with descriptive valuetext.
 */
export function Slider7Card({
  questionId,
  leftLabel,
  rightLabel,
  midLabel,
  value = 4,
  onChange,
  onLockIn,
  className,
}: Slider7CardProps) {
  const [currentVal, setCurrentVal] = useState<number>(() => Math.max(1, Math.min(7, value)));

  useEffect(() => {
    if (value >= 1 && value <= 7) {
      setCurrentVal(value);
    }
  }, [value]);

  const selectPosition = (pos: number) => {
    const clamped = Math.max(1, Math.min(7, pos));
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    setCurrentVal(clamped);
    onChange(clamped);
  };

  const getAriaValueText = (pos: number): string => {
    if (pos === 1) return `Extremely ${leftLabel}`;
    if (pos === 2) return `Very ${leftLabel}`;
    if (pos === 3) return `Somewhat ${leftLabel}`;
    if (pos === 4) return midLabel || `Balanced between ${leftLabel} and ${rightLabel}`;
    if (pos === 5) return `Somewhat ${rightLabel}`;
    if (pos === 6) return `Very ${rightLabel}`;
    if (pos === 7) return `Extremely ${rightLabel}`;
    return `${leftLabel} to ${rightLabel}`;
  };

  // Percentage for thumb position: (pos - 1) / 6 * 100%
  const thumbPercent = ((currentVal - 1) / 6) * 100;

  return (
    <div
      role="group"
      aria-label="Spectrum spectrum slider"
      className={cn("w-full flex flex-col space-y-6 select-none py-2", className)}
    >
      {/* Semantic Word Endpoint Labels (Top) */}
      <div className="flex items-center justify-between px-1 text-sm font-display font-bold text-ink">
        <span className="text-left max-w-[38%] leading-tight text-ink">
          {leftLabel}
        </span>
        {midLabel && (
          <span className="text-center text-xs text-muted leading-tight px-1">
            {midLabel}
          </span>
        )}
        <span className="text-right max-w-[38%] leading-tight text-ink">
          {rightLabel}
        </span>
      </div>

      {/* Interactive Slider Track Container */}
      <div className="relative w-full py-4 px-2 flex flex-col items-center">
        {/* Background Track Line */}
        <div className="relative w-full h-3 bg-paper rounded-pill border-[2.5px] border-ink shadow-[2px_2px_0px_#14123A] flex items-center">
          {/* Active Fill Track */}
          <div
            className="h-full bg-sun rounded-pill transition-all duration-120 border-r-[2px] border-ink"
            style={{ width: `${thumbPercent}%` }}
          />
        </div>

        {/* 7 Discrete Clickable Notch Buttons (>= 44x44px touch targets) */}
        <div className="absolute inset-x-0 top-0 bottom-0 flex justify-between items-center px-0">
          {[1, 2, 3, 4, 5, 6, 7].map((point) => {
            const isActive = currentVal === point;
            return (
              <button
                key={point}
                type="button"
                data-testid={`slider7-notch-${point}`}
                onClick={() => selectPosition(point)}
                aria-label={`Position ${point} of 7: ${getAriaValueText(point)}`}
                className="w-11 h-11 flex items-center justify-center cursor-pointer outline-none relative group"
              >
                {/* Visual Notch Pin */}
                <span
                  className={cn(
                    "w-3 h-3 rounded-pill border-[2px] border-ink transition-transform",
                    isActive
                      ? "bg-ink scale-125 shadow-[1px_1px_0px_#14123A]"
                      : "bg-paper group-hover:scale-110"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Floating Tactile Sticker Thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={1}
          aria-valuemax={7}
          aria-valuenow={currentVal}
          aria-valuetext={getAriaValueText(currentVal)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              selectPosition(currentVal - 1);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              selectPosition(currentVal + 1);
            } else if (e.key === "Home") {
              e.preventDefault();
              selectPosition(1);
            } else if (e.key === "End") {
              e.preventDefault();
              selectPosition(7);
            }
          }}
          style={{ left: `calc(${thumbPercent}% - 18px)` }}
          className="absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-pill bg-sun border-[2.5px] border-ink shadow-sticker sticker-press flex items-center justify-center cursor-pointer pointer-events-none transition-all duration-120"
        >
          <div className="w-2.5 h-2.5 rounded-pill bg-ink" />
        </div>
      </div>

      {/* Screen Reader Live Announcement */}
      <div aria-live="polite" className="sr-only">
        {getAriaValueText(currentVal)}
      </div>

      {/* Descriptive Status Pill (Words Only, No Numeric Scores) */}
      <div className="flex justify-center">
        <div className="px-4 py-1.5 rounded-pill bg-paper border-[2px] border-ink font-display font-bold text-xs text-ink shadow-[2px_2px_0px_#14123A] text-center">
          {getAriaValueText(currentVal)}
        </div>
      </div>

      {/* Lock in Button */}
      {onLockIn && (
        <button
          type="button"
          onClick={() => onLockIn(currentVal)}
          className="w-full min-h-[48px] py-3 px-4 rounded-pill bg-sun text-ink border-[2.5px] border-ink font-display font-bold text-button shadow-sticker sticker-press cursor-pointer mt-2"
        >
          Lock in position
        </button>
      )}
    </div>
  );
}

