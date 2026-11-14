"use client";

import React from "react";
import { Check } from "lucide-react";
import { DynamicIllustration } from "@/components/illustrations";
import { palette12 } from "@oddly/ui-tokens";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ==============================================================================
// 1. Text Pick One Tile / Stacked Option Row (Question Type 1 & Telepathy)
// ==============================================================================
export interface TextOption {
  id: string;
  text: string;
}

export function AnswerTile({
  option,
  selected = false,
  locked = false,
  onSelect,
  className,
}: {
  option: TextOption;
  selected?: boolean;
  locked?: boolean;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={`answer-option-${option.id}`}
      aria-pressed={selected}
      disabled={locked}
      onClick={() => {
        if (locked) return;
        feedback.triggerHaptic("select");
        feedback.playSound("tick");
        onSelect(option.id);
      }}
      className={cn(
        "relative w-full min-h-[56px] px-4 py-3 rounded-m border-[2.5px] border-ink text-left flex items-center justify-between gap-3 transition-all duration-120 cursor-pointer select-none outline-none sticker-press",
        selected
          ? "bg-sun text-ink shadow-sticker"
          : "bg-paper text-ink shadow-sticker",
        locked && !selected && "opacity-60 pointer-events-none",
        className
      )}
    >
      <span className="font-display font-bold text-button pr-4 leading-snug">
        {option.text}
      </span>

      {selected && (
        <span className="w-6 h-6 rounded-pill bg-ink text-paper flex items-center justify-center shrink-0 border-[1.5px] border-ink">
          <Check className="w-4 h-4 stroke-[3]" />
        </span>
      )}
    </button>
  );
}

// ==============================================================================
// 2. Number 1 to 50 Grid (Question Type 2) - Section 6:
// Grid of 5 columns x 10 rows of 48px square stickers; selected = sun.
// ==============================================================================
export function NumberPicker({
  value = 25,
  min = 1,
  max = 50,
  onChange,
  onConfirm,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  onConfirm?: () => void;
}) {
  const count = Math.max(1, max - min + 1);
  const numbers = Array.from({ length: count }, (_, i) => min + i);

  const selectNumber = (num: number) => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onChange(num);
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-2 space-y-4">
      {/* Active Selected Big Number Display */}
      <div className="w-full flex items-center justify-between px-2">
        <span className="font-display text-sm font-bold text-muted">Select number:</span>
        <span className="font-display text-2xl font-extrabold text-ink tabular-nums px-3 py-1 bg-sun border-[2px] border-ink rounded-m shadow-sm">
          {value}
        </span>
      </div>

      {/* 5 columns x 10 rows grid of 48px square sticker cells */}
      <div
        className="w-full grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto p-1 rounded-l bg-cream border-[1.5px] border-ink"
        role="radiogroup"
        aria-label="Select a number from 1 to 50"
      >
        {numbers.map((num) => {
          const isSelected = num === value;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Number ${num}`}
              onClick={() => selectNumber(num)}
              className={cn(
                "h-12 w-full rounded-m border-[2.5px] border-ink font-display font-extrabold text-base flex items-center justify-center transition-all duration-120 cursor-pointer outline-none sticker-press",
                isSelected
                  ? "bg-sun text-ink shadow-sticker-lift scale-102"
                  : "bg-paper text-ink shadow-sticker"
              )}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================================================
// 3. 12-Colour Swatch Grid (Question Type 3) - Section 6:
// 4 x 3 grid of 56px swatches with ink outline; selected swatch gets ink check badge and shadow-sticker-lift.
// ==============================================================================
export function ColourSwatchGrid({
  selectedHex,
  onSelect,
}: {
  selectedHex?: string;
  onSelect: (swatch: { label: string; hex: string }) => void;
}) {
  const swatches = palette12;

  return (
    <div
      className="grid grid-cols-4 gap-3 sm:gap-4 py-2 select-none justify-items-center w-full"
      role="radiogroup"
      aria-label="Select a colour"
    >
      {swatches.map((swatch) => {
        const isSelected = selectedHex === swatch.hex;
        return (
          <button
            key={swatch.label}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${swatch.label} swatch`}
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(swatch);
            }}
            className="flex flex-col items-center gap-1.5 group cursor-pointer outline-none sticker-press"
          >
            <div
              className={cn(
                "relative w-14 h-14 rounded-pill border-[2.5px] border-ink transition-all duration-120 flex items-center justify-center",
                isSelected
                  ? "shadow-sticker-lift scale-105"
                  : "shadow-sticker"
              )}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-pill bg-ink text-paper flex items-center justify-center border-[1.5px] border-paper">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
            <span
              className={cn(
                "text-caption font-display font-bold text-center",
                isSelected ? "text-ink" : "text-muted"
              )}
            >
              {swatch.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ==============================================================================
// 4. Image Pick One Grid (Question Type 4) - Section 6:
// 2 x 2 grid, 3:2 images, ink outline, selected = sun frame (6px) plus check badge.
// ==============================================================================
export interface ImageOption {
  id: string;
  assetKey: string;
  caption: string;
}

export function ImageTileGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: ImageOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 py-2 select-none w-full">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            data-testid={`answer-option-${opt.id}`}
            aria-pressed={isSelected}
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(opt.id);
            }}
            className={cn(
              "relative rounded-l p-3.5 bg-paper border-[2.5px] border-ink transition-all duration-120 flex flex-col items-center text-center cursor-pointer outline-none sticker-press min-h-[140px] justify-between",
              isSelected
                ? "ring-4 ring-sun shadow-sticker-lift"
                : "shadow-sticker"
            )}
          >
            <div className="w-full aspect-[3/2] flex items-center justify-center mb-2">
              <DynamicIllustration assetKey={opt.assetKey} size={76} />
            </div>
            <span className="font-display text-sm font-bold text-ink line-clamp-1">
              {opt.caption}
            </span>

            {/* Check badge top-right */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-pill bg-sun text-ink border-[2px] border-ink flex items-center justify-center shadow-sm">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ==============================================================================
// 5. Word Chips Grid (Question Type 5) - Section 6:
// wrap-flow chips at button size (48 min height), paper to sun selected with check.
// ==============================================================================
export function WordChipsGrid({
  words,
  selectedWord,
  onSelect,
}: {
  words: string[];
  selectedWord?: string;
  onSelect: (word: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5 py-2 select-none w-full justify-center">
      {words.map((word) => {
        const isSelected = selectedWord === word;
        return (
          <button
            key={word}
            type="button"
            data-testid={`answer-option-${word}`}
            aria-pressed={isSelected}
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(word);
            }}
            className={cn(
              "min-h-[48px] px-5 py-2.5 rounded-pill border-[2.5px] border-ink font-display font-bold text-base transition-all duration-120 flex items-center justify-center gap-2 cursor-pointer select-none outline-none sticker-press",
              isSelected
                ? "bg-sun text-ink shadow-sticker"
                : "bg-paper text-ink shadow-sticker"
            )}
          >
            <span>{word}</span>
            {isSelected && (
              <span className="w-5 h-5 rounded-pill bg-ink text-paper flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
