"use client";

import React, { useRef } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { DynamicIllustration } from "@/components/illustrations";
import { colors } from "@oddly/ui-tokens";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ==============================================================================
// 1. Text Pick One Tile (Question Type 1)
// ==============================================================================
export interface TextOption {
  id: string;
  text: string;
}

export function AnswerTile({
  option,
  selected = false,
  onSelect,
  className,
}: {
  option: TextOption;
  selected?: boolean;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        feedback.triggerHaptic("select");
        feedback.playSound("tick");
        onSelect(option.id);
      }}
      className={cn(
        "relative w-full min-h-[72px] p-5 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-3 focus-visible:ring-mint",
        selected
          ? "bg-surface-2 border-violet border-2 shadow-md"
          : "bg-surface border-border hover:border-violet/60 hover:-translate-y-0.5 hover:shadow-sm",
        className
      )}
    >
      <span className="font-heading text-base sm:text-lg font-medium text-text pr-8 leading-snug">
        {option.text}
      </span>

      <div
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          selected ? "bg-violet border-violet text-white shadow-sm" : "border-border bg-transparent"
        )}
      >
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-mint" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ==============================================================================
// 2. Number Picker with Dial & Controls (Question Type 2)
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const setNumber = (newVal: number) => {
    const clamped = Math.max(min, Math.min(max, newVal));
    if (clamped !== value) {
      feedback.triggerHaptic("select");
      feedback.playSound("tick");
      onChange(clamped);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-2">
      {/* Big Circular Glass Dial */}
      <div className="relative w-36 h-36 rounded-full bg-surface-2 border-2 border-border/80 flex items-center justify-center shadow-lg mb-6">
        <span className="font-heading text-6xl font-bold tabular-nums text-text">{value}</span>
        <div className="absolute inset-0 rounded-full border border-violet/30 pointer-events-none" />
      </div>

      {/* Adjuster Touch Buttons */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => setNumber(value - 1)}
          disabled={value <= min}
          aria-label="Decrease number"
          className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text hover:bg-violet/10 hover:border-violet active:scale-95 disabled:opacity-30 cursor-pointer"
        >
          <Minus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Snapping Horizontal Slider Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto py-2 px-3 max-w-[200px] no-scrollbar scroll-smooth"
        >
          {Array.from({ length: max - min + 1 }).map((_, i) => {
            const num = min + i;
            const isSelected = num === value;
            return (
              <button
                key={num}
                type="button"
                onClick={() => setNumber(num)}
                className={cn(
                  "w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-heading text-sm font-semibold transition-all cursor-pointer",
                  isSelected
                    ? "bg-violet text-white shadow-sm scale-110"
                    : "bg-surface text-text-muted hover:text-text border border-border"
                )}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setNumber(value + 1)}
          disabled={value >= max}
          aria-label="Increase number"
          className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text hover:bg-violet/10 hover:border-violet active:scale-95 disabled:opacity-30 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Confirm CTA button */}
      {onConfirm && (
        <Button variant="primary" size="lg" onClick={onConfirm} className="w-full max-w-xs">
          Confirm Number
        </Button>
      )}
    </div>
  );
}

// ==============================================================================
// 3. 12-Colour Swatch Grid (Question Type 3)
// ==============================================================================
export function ColourSwatchGrid({
  selectedHex,
  onSelect,
}: {
  selectedHex?: string;
  onSelect: (swatch: { label: string; hex: string }) => void;
}) {
  const swatches = colors.palette12;

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4 py-2 select-none justify-items-center">
      {swatches.map((swatch) => {
        const isSelected = selectedHex === swatch.hex;
        return (
          <button
            key={swatch.label}
            type="button"
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(swatch);
            }}
            className="flex flex-col items-center gap-1.5 group cursor-pointer outline-none"
          >
            <div
              className={cn(
                "relative w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-transform duration-150 flex items-center justify-center shadow-sm",
                isSelected
                  ? "scale-105 ring-4 ring-text ring-offset-3 ring-offset-bg"
                  : "group-hover:scale-105"
              )}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && <Check className="w-6 h-6 stroke-[3] text-white drop-shadow-md" />}
            </div>
            <span
              className={cn(
                "text-[10px] font-heading tracking-wider uppercase transition-colors text-center",
                isSelected ? "font-bold text-text" : "text-text-muted group-hover:text-text"
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
// 4. Image Pick One Grid (Question Type 4)
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 py-2 select-none">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(opt.id);
            }}
            className={cn(
              "relative rounded-2xl p-3 bg-surface border transition-all duration-150 flex flex-col items-center text-center cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-mint",
              isSelected
                ? "border-violet border-2 shadow-lg ring-2 ring-mint ring-offset-2 ring-offset-bg scale-[1.02]"
                : "border-border hover:border-violet/60 hover:-translate-y-0.5"
            )}
          >
            <DynamicIllustration assetKey={opt.assetKey} size={84} className="mb-2" />
            <span className="font-heading text-xs sm:text-sm font-semibold text-text line-clamp-1">
              {opt.caption}
            </span>

            {/* Check badge top-right */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-mint text-midnight flex items-center justify-center shadow-sm">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ==============================================================================
// 5. Word Chips Grid (Question Type 5)
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
    <div className="grid grid-cols-2 gap-3 py-2 select-none">
      {words.map((word) => {
        const isSelected = selectedWord === word;
        return (
          <motion.button
            key={word}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onSelect(word);
            }}
            className={cn(
              "h-14 px-4 rounded-2xl border font-heading text-base font-semibold transition-all duration-150 flex items-center justify-center cursor-pointer select-none outline-none focus-visible:ring-3 focus-visible:ring-mint",
              isSelected
                ? "bg-violet text-white border-violet shadow-md scale-102"
                : "bg-surface-2 text-text border-border hover:border-violet/60 hover:text-violet"
            )}
          >
            {word}
          </motion.button>
        );
      })}
    </div>
  );
}
