"use client";

import React from "react";
import { Check } from "lucide-react";
import { DynamicIllustration } from "@/components/illustrations";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SceneOption {
  label: string;
  value: string;
  illustration_key?: string | null;
  caption?: string | null;
}

export interface SceneCardProps {
  questionId: string;
  cards: SceneOption[];
  selectedValue?: string;
  onSelect: (val: string) => void;
  className?: string;
}

/**
 * SceneCard (Stage L2 / Phase 10M / P10M.04 & P10M.05)
 *
 * Rules:
 * - Pick 1 of 3 to 5 reaction cards.
 * - Used by Situations Lane (F36).
 * - Physical sticker reaction cards on cream desk.
 * - Shows illustration / icon, label, and reaction text.
 * - Single-tap selection with tactile press flat and ink outline.
 * - ARIA radiogroup / radio pattern.
 */
export function SceneCard({
  questionId,
  cards,
  selectedValue,
  onSelect,
  className,
}: SceneCardProps) {
  const handleSelect = (val: string) => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onSelect(val);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Reaction scene cards"
      className={cn("w-full flex flex-col space-y-3 select-none", className)}
    >
      <div className="flex flex-col gap-3">
        {cards.map((card, idx) => {
          const isSelected = selectedValue === card.value;

          return (
            <button
              key={card.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`scene-card-${card.value}`}
              onClick={() => handleSelect(card.value)}
              className={cn(
                "relative w-full min-h-[72px] p-4 rounded-l border-[2.5px] border-ink text-left flex items-center justify-between gap-4 transition-all duration-120 cursor-pointer outline-none sticker-press",
                isSelected
                  ? "bg-sun text-ink shadow-sticker ring-2 ring-ink"
                  : "bg-paper text-ink shadow-sticker hover:bg-cream",
                idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
              )}
            >
              {/* Left Illustration / Thumbnail + Text */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {card.illustration_key && (
                  <div className="w-12 h-12 rounded-m border-[2px] border-ink bg-cream flex items-center justify-center shrink-0 overflow-hidden">
                    <DynamicIllustration assetKey={card.illustration_key} size={36} />
                  </div>
                )}

                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-display font-bold text-base leading-snug line-clamp-1">
                    {card.label}
                  </span>
                  {card.caption && (
                    <span className="font-body text-xs text-muted leading-tight mt-0.5 line-clamp-2">
                      {card.caption}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Selection Radio Circle */}
              <div
                className={cn(
                  "w-7 h-7 rounded-pill border-[2px] border-ink flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-ink text-paper" : "bg-paper"
                )}
              >
                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

