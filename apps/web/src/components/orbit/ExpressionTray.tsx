"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles } from "lucide-react";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const APPROVED_EXPRESSIONS = [
  { key: "wave", emoji: "👋", label: "Wave" },
  { key: "sparkles", emoji: "✨", label: "Sparkles" },
  { key: "purple_heart", emoji: "💜", label: "Heart" },
  { key: "raised_hands", emoji: "🙌", label: "Celebrate" },
  { key: "coffee", emoji: "☕", label: "Coffee" },
  { key: "thinking", emoji: "🤔", label: "Wonder" },
] as const;

export interface ExpressionTrayProps {
  canExpressToday: boolean;
  onSend: (expressionKey: string) => Promise<void> | void;
  className?: string;
}

export function ExpressionTray({
  canExpressToday,
  onSend,
  className,
}: ExpressionTrayProps) {
  const [isSending, setIsSending] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<string>("");

  // Calculate countdown until 07:00 IST (01:30 UTC)
  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const nextRefresh = new Date();
      // 07:00 IST is 01:30 UTC
      nextRefresh.setUTCHours(1, 30, 0, 0);
      if (now.getTime() >= nextRefresh.getTime()) {
        nextRefresh.setUTCDate(nextRefresh.getUTCDate() + 1);
      }
      const diffMs = nextRefresh.getTime() - now.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      setTimeUntilRefresh(`${hours}h ${minutes}m`);
    };

    calcTime();
    const interval = setInterval(calcTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSticker = async (key: string) => {
    if (!canExpressToday || isSending) return;
    setIsSending(true);
    setSelectedKey(key);
    feedback.triggerHaptic("select");
    feedback.playSound("tick");

    try {
      await onSend(key);
    } finally {
      setIsSending(false);
      setSelectedKey(null);
    }
  };

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4 select-none",
        className
      )}
    >
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
        <div>
          <span className="font-display text-xs font-bold text-muted uppercase tracking-wider block">
            The Wave
          </span>
          <h3 className="font-display text-base font-extrabold text-ink mt-0.5">
            Daily Tactile Expression
          </h3>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[11px] font-display font-bold text-muted">
            <Clock className="w-3 h-3" />
            <span>1 per day</span>
          </span>
        </div>
      </div>

      {canExpressToday ? (
        <div className="space-y-3">
          <p className="font-body text-xs text-muted">
            Tap a sticker to send to your twin today. It presses flat with physical tactile feedback:
          </p>

          {/* 6 Sticker Grid with >= 44x44px touch targets */}
          <div className="grid grid-cols-6 gap-2">
            {APPROVED_EXPRESSIONS.map((item) => {
              const isChosen = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSelectSticker(item.key)}
                  aria-label={`Send ${item.label}`}
                  className={cn(
                    "min-h-[44px] min-w-[44px] aspect-square rounded-m bg-cream border-[2px] border-ink shadow-sticker",
                    "flex flex-col items-center justify-center text-2xl transition-transform",
                    "hover:bg-lavender active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat",
                    "focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none",
                    isChosen && "translate-x-[2px] translate-y-[2px] shadow-sticker-flat bg-mint"
                  )}
                >
                  <span className="leading-none">{item.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-m bg-cream border-[1.5px] border-ink text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-lavender border-[1px] border-ink text-xs font-display font-extrabold text-ink">
            <Sparkles className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
            <span>Expressed today!</span>
          </div>
          <p className="font-body text-xs text-muted">
            You sent your daily wave to your twin. Refreshes at 07:00 IST ({timeUntilRefresh}).
          </p>
        </div>
      )}
    </div>
  );
}
