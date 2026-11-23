"use client";

import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface Pick2Option {
  label: string;
  value: string;
  illustration_key?: string | null;
}

export interface Pick2Of6CardProps {
  questionId: string;
  options: Pick2Option[];
  selectedValue?: string[];
  onChange: (value: [string, string]) => void;
  onLockIn?: (value: [string, string]) => void;
  className?: string;
}

/**
 * Pick2Of6Card (Stage L2 / Phase 10M / P10M.04 & P10M.05)
 *
 * Rules:
 * - Tap exactly 2 of 6 items.
 * - Displays selected count badge: (0/2, 1/2, 2/2).
 * - Third pick is blocked when 2 are already chosen (prompts to deselect first).
 * - Clear button provided.
 * - Sticker pop physical tactile styling with warm cream desk metaphor.
 * - Full ARIA multiselectable & keyboard controls (Enter/Space to toggle).
 * - Reduced motion fallbacks.
 */
export function Pick2Of6Card({
  questionId,
  options,
  selectedValue = [],
  onChange,
  onLockIn,
  className,
}: Pick2Of6CardProps) {
  const [selected, setSelected] = useState<string[]>(selectedValue);
  const [wiggleBlocked, setWiggleBlocked] = useState<string | null>(null);

  useEffect(() => {
    setSelected(selectedValue);
  }, [selectedValue]);

  const handleToggle = (val: string) => {
    if (selected.includes(val)) {
      // Deselect
      feedback.triggerHaptic("select");
      feedback.playSound("tick");
      const next = selected.filter((v) => v !== val);
      setSelected(next);
      if (next.length === 2) {
        onChange([next[0], next[1]]);
      }
    } else {
      if (selected.length >= 2) {
        // Block 3rd pick: trigger tactile warning
        feedback.triggerHaptic("error");
        setWiggleBlocked(val);
        setTimeout(() => setWiggleBlocked(null), 400);
        return;
      }
      feedback.triggerHaptic("select");
      feedback.playSound("tick");
      const next = [...selected, val];
      setSelected(next);
      if (next.length === 2) {
        onChange([next[0], next[1]]);
      }
    }
  };

  const handleClear = () => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    setSelected([]);
  };

  const isComplete = selected.length === 2;

  return (
    <div
      role="group"
      aria-label="Pick exactly 2 of 6 options"
      className={cn("w-full flex flex-col space-y-4 select-none", className)}
    >
      {/* Header Status & Counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-muted">
            Selection
          </span>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-pill font-mono font-bold text-xs border-[2px] border-ink transition-colors",
              isComplete
                ? "bg-sun text-ink shadow-[2px_2px_0px_#14123A]"
                : "bg-paper text-ink shadow-[2px_2px_0px_#14123A]"
            )}
          >
            {`${selected.length} / 2 chosen`}
          </span>
        </div>

        {selected.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-display font-bold text-muted hover:text-ink underline flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Clear selected options"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Screen Reader Live Region */}
      <div aria-live="polite" className="sr-only">
        {isComplete
          ? "2 of 2 options selected. Ready to lock in."
          : `${selected.length} of 2 options selected.`}
      </div>

      {/* 6 Options Grid (2 cols mobile, 3 cols desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.slice(0, 6).map((opt, idx) => {
          const isChosen = selected.includes(opt.value);
          const isBlocked = wiggleBlocked === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              data-testid={`pick2-option-${opt.value}`}
              aria-pressed={isChosen}
              aria-label={`${opt.label}${isChosen ? " (selected)" : ""}`}
              onClick={() => handleToggle(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggle(opt.value);
                }
              }}
              className={cn(
                "relative min-h-[58px] p-3 rounded-l border-[2.5px] border-ink text-left flex flex-col justify-between transition-all duration-150 cursor-pointer outline-none sticker-press",
                isChosen
                  ? "bg-sun text-ink shadow-sticker ring-2 ring-ink"
                  : "bg-paper text-ink shadow-sticker hover:bg-cream",
                isBlocked && "animate-wiggle",
                idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
              )}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="font-display font-bold text-sm leading-snug line-clamp-2">
                  {opt.label}
                </span>

                {isChosen && (
                  <span className="w-5 h-5 rounded-pill bg-ink text-paper flex items-center justify-center shrink-0 border-[1.5px] border-ink">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper Warning */}
      {selected.length === 2 && onLockIn && (
        <button
          type="button"
          onClick={() => onLockIn([selected[0], selected[1]])}
          className="w-full min-h-[48px] py-3 px-4 rounded-pill bg-sun text-ink border-[2.5px] border-ink font-display font-bold text-button shadow-sticker sticker-press cursor-pointer mt-2"
        >
          Lock in choice
        </button>
      )}
    </div>
  );
}
