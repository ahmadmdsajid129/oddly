"use client";

import React from "react";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/icons";
import { Button } from "./Button";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// 1. Five Progress Dots (Navigation & Feedback)
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
    <div className={cn("flex items-center justify-center gap-2 py-2 select-none", className)}>
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
            aria-label={`Question ${index + 1} of ${total}`}
            className="group relative p-1 outline-none focus-visible:ring-2 focus-visible:ring-mint rounded-full disabled:cursor-default"
          >
            {isCurrent ? (
              <motion.div
                layoutId="active-dot"
                className="w-7 h-2.5 rounded-full bg-violet shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            ) : (
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors duration-200",
                  isCompleted
                    ? "bg-violet/80 group-hover:bg-violet cursor-pointer"
                    : "border-2 border-border bg-transparent"
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// 2. Skeleton Component
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-2 animate-shimmer overflow-hidden",
        className
      )}
      aria-hidden="true"
    />
  );
}

// 3. Empty State Component
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
      {/* Brand mark in soft circle */}
      <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-5 shadow-sm">
        <BrandMark size={32} />
      </div>

      <h3 className="font-heading text-lg font-bold text-text mb-1.5">{title}</h3>
      <p className="font-body text-sm text-text-muted mb-6 leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
