"use client";

import React from "react";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { feedback } from "@/lib/feedback";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface OptionRowProps {
  label: string;
  selected?: boolean;
  locked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  leftAdornment?: React.ReactNode;
  "data-testid"?: string;
}

export function OptionRow({
  label,
  selected = false,
  locked = false,
  disabled = false,
  onClick,
  className,
  leftAdornment,
  "data-testid": testId,
}: OptionRowProps) {
  const handleClick = () => {
    if (disabled || locked) return;
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onClick?.();
  };

  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      disabled={disabled || locked}
      onClick={handleClick}
      className={cn(
        "w-full min-h-[56px] px-4 py-3 rounded-m border-[2.5px] border-ink font-display font-bold text-button text-ink text-left transition-all duration-120 flex items-center justify-between gap-3 select-none cursor-pointer outline-none sticker-press",
        selected
          ? "bg-sun shadow-sticker"
          : "bg-paper shadow-sticker",
        locked && !selected && "opacity-60 pointer-events-none",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {leftAdornment && <span className="shrink-0">{leftAdornment}</span>}
        <span className="truncate">{label}</span>
      </div>

      {selected && (
        <span className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 stroke-[3]" />
        </span>
      )}
    </button>
  );
}

