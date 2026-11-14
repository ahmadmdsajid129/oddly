"use client";

import React from "react";
import { m } from "framer-motion";
import { BrandMark } from "@/components/icons";
import { Button } from "./Button";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// 1. Five Progress Dots - Section 6:
// 5 dots, 10px; answered = mint with ink outline, current = 28px wide pill in violet with ink outline, upcoming = lavender with ink outline.
export interface ProgressDotsProps {
  total?: number;
  current: number; // 0 to 4
  onDotClick?: (index: number) => void;
  className?: string;
}

export function ProgressDots({
  total = 5,
  current,
  onDotClick,
  className,
}: ProgressDotsProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 py-2 select-none", className)}
      role="group"
      aria-label={`Question ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;

        return (
          <button
            key={index}
            type="button"
            disabled={!isCompleted || !onDotClick}
            onClick={() => {
              if (isCompleted && onDotClick) {
                feedback.triggerHaptic("select");
                onDotClick(index);
              }
            }}
            aria-label={`Question ${index + 1} of ${total}${isCompleted ? " (Answered)" : isCurrent ? " (Current)" : ""}`}
            className="group relative p-1 outline-none rounded-full disabled:cursor-default"
          >
            {isCurrent ? (
              <m.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-7 h-2.5 rounded-pill bg-violet border-[1.5px] border-ink"
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            ) : (
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-pill border-[1.5px] border-ink transition-colors duration-200",
                  isCompleted
                    ? "bg-mint group-hover:scale-110 cursor-pointer"
                    : "bg-lavender"
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// 2. Skeleton Component - Section 7:
// lavender blocks with outline-thin (1.5px solid ink), a gentle opacity pulse (not shimmer gradients).
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-m bg-lavender border-[1.5px] border-ink animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  );
}

// 3. Empty State Component - Section 7:
// an illustration made of three overlapping circles (the logo motif), one line of invitation copy, one primary button.
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto", className)}>
      {/* Brand mark in soft circle with outline */}
      <div className="w-16 h-16 rounded-pill bg-lavender border-[2.5px] border-ink shadow-sticker flex items-center justify-center mb-6">
        <BrandMark size={32} />
      </div>

      <h3 className="font-display text-display-m font-bold text-ink mb-2">{title}</h3>
      <p className="font-body text-body-s text-muted mb-6 leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
