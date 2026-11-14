"use client";

import React, { forwardRef } from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { feedback } from "@/lib/feedback";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// 1. Toggle Switch (Radix Switch)
export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: ToggleProps) {
  const handleChange = (val: boolean) => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onCheckedChange(val);
  };

  return (
    <div className={cn("flex items-center justify-between gap-4 py-3 select-none", className)}>
      <div className="flex flex-col">
        <span className="text-body font-display font-bold text-ink">{label}</span>
        {description && <span className="text-caption text-muted mt-0.5">{description}</span>}
      </div>
      <SwitchPrimitives.Root
        checked={checked}
        aria-label={label}
        onCheckedChange={handleChange}
        disabled={disabled}
        className={cn(
          "w-14 h-8 rounded-pill border-[2.5px] border-ink transition-colors duration-120 outline-none disabled:opacity-40 cursor-pointer sticker-press shadow-sticker",
          checked ? "bg-violet" : "bg-paper"
        )}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "block w-6 h-6 rounded-pill border-[1.5px] border-ink transition-transform duration-120 will-change-transform",
            checked ? "translate-x-6 bg-paper" : "translate-x-0.5 bg-muted"
          )}
        />
      </SwitchPrimitives.Root>
    </div>
  );
}

// 2. Checkbox (Custom square for Age Gate & Consent)
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, className }: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onChange(e.target.checked);
  };

  return (
    <label
      className={cn(
        "flex items-center gap-3.5 p-3 rounded-m border-[1.5px] border-transparent hover:bg-lavender/50 transition-colors cursor-pointer select-none min-h-[44px]",
        disabled && "pointer-events-none opacity-40",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only peer"
      />
      <div
        className={cn(
          "w-7 h-7 rounded-s border-[2.5px] border-ink flex items-center justify-center transition-all duration-120 shrink-0 pointer-events-none sticker-press",
          checked
            ? "bg-sun text-ink shadow-sticker"
            : "bg-paper"
        )}
        aria-hidden="true"
      >
        {checked && <Check className="w-4 h-4 stroke-[3]" />}
      </div>
      <div className="text-body-s font-body text-ink">{label}</div>
    </label>
  );
}

// 3. Input Component - Section 7:
// paper fill, outline (2.5px solid ink), radius-m (14px), min-height 48, Inter 16; focus = violet focus ring; error = error outline plus icon plus text below.
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display font-bold text-sm text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-[48px] px-4 rounded-m bg-paper border-[2.5px] text-ink placeholder:text-muted/60 text-base font-body outline-none transition-all",
            error
              ? "border-error focus:border-error"
              : "border-ink focus:border-violet",
            className
          )}
          {...props}
        />
        {error && (
          <div className="flex items-center gap-1.5 text-caption font-bold text-error mt-0.5" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// 4. Textarea with character counter (max 140 chars for Report Note)
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  maxLength?: number;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, maxLength = 140, value, onChange, error, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="font-display font-bold text-sm text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          onChange={onChange}
          className={cn(
            "w-full min-h-[96px] p-4 rounded-m bg-paper border-[2.5px] text-ink placeholder:text-muted/60 text-base font-body outline-none transition-all resize-none",
            error
              ? "border-error focus:border-error"
              : "border-ink focus:border-violet",
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between text-caption text-muted">
          <span>
            {error && (
              <span className="flex items-center gap-1 font-bold text-error" role="alert">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </span>
            )}
          </span>
          <span>
            {currentLength}/{maxLength}
          </span>
        </div>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
