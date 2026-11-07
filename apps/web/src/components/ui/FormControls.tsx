"use client";

import React, { forwardRef } from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check } from "lucide-react";
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
        <span className="text-sm font-heading font-medium text-text">{label}</span>
        {description && <span className="text-xs text-text-muted mt-0.5">{description}</span>}
      </div>
      <SwitchPrimitives.Root
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled}
        className={cn(
          "w-13 h-8 rounded-full border border-border transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 cursor-pointer",
          checked ? "bg-violet" : "bg-surface-2"
        )}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "block w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 will-change-transform",
            checked ? "translate-x-6 bg-white" : "translate-x-1 bg-text-muted"
          )}
        />
      </SwitchPrimitives.Root>
    </div>
  );
}

// 2. Checkbox (Custom 28px rounded square for Age Gate)
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, className }: CheckboxProps) {
  const handleClick = () => {
    if (disabled) return;
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    onChange(!checked);
  };

  return (
    <label
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3.5 p-3 rounded-xl border border-transparent hover:bg-surface-2/60 transition-colors cursor-pointer select-none",
        disabled && "pointer-events-none opacity-40",
        className
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0",
          checked
            ? "bg-violet border-violet text-white shadow-sm scale-102"
            : "border-border bg-surface hover:border-violet/60"
        )}
      >
        {checked && <Check className="w-4 h-4 stroke-[3]" />}
      </div>
      <div className="text-sm font-body text-text">{label}</div>
    </label>
  );
}

// 3. Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <input
          ref={ref}
          className={cn(
            "w-full h-12 px-4 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted/60 text-sm font-body outline-none transition-all focus:border-violet focus:ring-2 focus:ring-violet/30 disabled:opacity-40",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// 4. Textarea with character counter (max 140 chars for Report Note)
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength = 140, value, onChange, error, ...props }, ref) => {
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full flex flex-col gap-1.5">
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          onChange={onChange}
          className={cn(
            "w-full h-24 p-4 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted/60 text-sm font-body outline-none transition-all focus:border-violet focus:ring-2 focus:ring-violet/30 resize-none disabled:opacity-40",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{error && <span className="text-danger font-medium">{error}</span>}</span>
          <span>
            {currentLength}/{maxLength}
          </span>
        </div>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
