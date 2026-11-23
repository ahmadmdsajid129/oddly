"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface RankItem {
  label: string;
  value: string;
}

export interface Rank3CardProps {
  questionId: string;
  items: RankItem[];
  currentOrder?: string[];
  onChange: (orderedValues: [string, string, string]) => void;
  onLockIn?: (orderedValues: [string, string, string]) => void;
  className?: string;
}

/**
 * Rank3Card (Stage L2 / Phase 10M / P10M.04 & P10M.05)
 *
 * Rules:
 * - Order exactly 3 items from 1st to 3rd position.
 * - Mobile default: Tap-to-order / swap via Up/Down buttons (min 44px touch target).
 * - Desktop: Reorder via drag & drop or tap.
 * - Numbered sticker badges: [1], [2], [3].
 * - Full keyboard navigation: ArrowUp/ArrowDown to swap.
 * - ARIA live region announcing current ranking.
 * - Tactile sticker styling on cream desk.
 */
export function Rank3Card({
  questionId,
  items,
  currentOrder,
  onChange,
  onLockIn,
  className,
}: Rank3CardProps) {
  // Initialize order from currentOrder or default items order
  const [orderedItems, setOrderedItems] = useState<RankItem[]>(() => {
    if (currentOrder && currentOrder.length === 3) {
      const itemMap = new Map(items.map((it) => [it.value, it]));
      const sorted = currentOrder.map((val) => itemMap.get(val)).filter(Boolean) as RankItem[];
      if (sorted.length === 3) return sorted;
    }
    return items.slice(0, 3);
  });

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (currentOrder && currentOrder.length === 3) {
      const itemMap = new Map(items.map((it) => [it.value, it]));
      const sorted = currentOrder.map((val) => itemMap.get(val)).filter(Boolean) as RankItem[];
      if (sorted.length === 3) setOrderedItems(sorted);
    }
  }, [currentOrder, items]);

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= orderedItems.length) return;
    feedback.triggerHaptic("select");
    feedback.playSound("tick");

    const updated = [...orderedItems];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    setOrderedItems(updated);
    onChange([updated[0].value, updated[1].value, updated[2].value]);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    moveItem(draggedIdx, idx);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  return (
    <div
      role="region"
      aria-label="Rank 3 items in order from top to bottom"
      className={cn("w-full flex flex-col space-y-3 select-none", className)}
    >
      {/* Subtitle instructions */}
      <div className="flex items-center justify-between px-1">
        <span className="font-display font-bold text-xs uppercase tracking-wider text-muted">
          Order from 1st to 3rd
        </span>
        <span className="font-display text-xs text-muted">
          Tap arrows or drag to rank
        </span>
      </div>

      {/* Screen reader live announcement */}
      <div aria-live="polite" className="sr-only">
        {`Current order: 1st ${orderedItems[0]?.label}, 2nd ${orderedItems[1]?.label}, 3rd ${orderedItems[2]?.label}`}
      </div>

      {/* 3 Ranked Items List */}
      <div className="flex flex-col gap-3">
        {orderedItems.map((item, idx) => {
          const rankNumber = idx + 1;
          const isFirst = idx === 0;
          const isLast = idx === orderedItems.length - 1;

          return (
            <div
              key={item.value}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              tabIndex={0}
              role="listitem"
              aria-label={`Rank ${rankNumber}: ${item.label}. Use arrow keys to reorder.`}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveItem(idx, idx - 1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveItem(idx, idx + 1);
                }
              }}
              className={cn(
                "relative min-h-[64px] p-3.5 rounded-l border-[2.5px] border-ink bg-paper text-ink shadow-sticker flex items-center justify-between gap-3 transition-transform cursor-grab active:cursor-grabbing",
                draggedIdx === idx && "opacity-50 scale-95",
                idx === 0 && "bg-[#FFF9EA]" // Subtle gold tint for 1st place
              )}
            >
              {/* Left Rank Badge + Content */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-8 h-8 rounded-pill border-[2px] border-ink flex items-center justify-center font-mono font-black text-sm shrink-0",
                    rankNumber === 1
                      ? "bg-sun text-ink shadow-[2px_2px_0px_#14123A]"
                      : "bg-paper text-ink shadow-[2px_2px_0px_#14123A]"
                  )}
                >
                  {rankNumber}
                </span>

                <span className="font-display font-bold text-base text-ink line-clamp-2">
                  {item.label}
                </span>
              </div>

              {/* Right Controls: Accessible Up/Down Buttons + Grip */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => moveItem(idx, idx - 1)}
                    aria-label={`Move ${item.label} up`}
                    className={cn(
                      "w-8 h-8 rounded-m border-[1.5px] border-ink bg-paper text-ink flex items-center justify-center hover:bg-cream transition-colors sticker-press",
                      isFirst && "opacity-30 pointer-events-none"
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => moveItem(idx, idx + 1)}
                    aria-label={`Move ${item.label} down`}
                    className={cn(
                      "w-8 h-8 rounded-m border-[1.5px] border-ink bg-paper text-ink flex items-center justify-center hover:bg-cream transition-colors sticker-press",
                      isLast && "opacity-30 pointer-events-none"
                    )}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="hidden sm:flex text-muted cursor-grab pl-1">
                  <GripVertical className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lock in button */}
      {onLockIn && (
        <button
          type="button"
          onClick={() =>
            onLockIn([orderedItems[0].value, orderedItems[1].value, orderedItems[2].value])
          }
          className="w-full min-h-[48px] py-3 px-4 rounded-pill bg-sun text-ink border-[2.5px] border-ink font-display font-bold text-button shadow-sticker sticker-press cursor-pointer mt-2"
        >
          Lock in ranking
        </button>
      )}
    </div>
  );
}

