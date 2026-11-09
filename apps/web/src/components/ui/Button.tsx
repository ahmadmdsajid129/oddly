"use client";

import React, { forwardRef } from "react";
import { X as CloseIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { feedback } from "@/lib/feedback";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "icon" | "close";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      feedback.triggerHaptic("select");
      feedback.playSound("tick");
      onClick?.(e);
    };

    // Base button styling
    const baseStyles =
      "relative inline-flex items-center justify-center font-heading font-semibold transition-all duration-150 select-none cursor-pointer outline-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40";

    // Size variants
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "h-9 px-3.5 text-xs rounded-full gap-1.5",
      md: "h-11 px-5 text-sm rounded-full gap-2",
      lg: "h-14 px-8 text-base rounded-full gap-2.5",
    };

    // Variant styling
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[#6C4CF1] text-white shadow-lg shadow-[#6C4CF1]/25 hover:bg-[#5538D6] hover:shadow-xl hover:shadow-[#6C4CF1]/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] border-t border-white/20",
      secondary:
        "bg-transparent border-2 border-violet text-violet dark:text-lavender dark:border-lavender hover:bg-violet/10 active:bg-violet/20 active:scale-[0.97]",
      ghost:
        "bg-transparent text-text-muted hover:text-text hover:bg-surface-2/60 active:scale-[0.96]",
      destructive:
        "bg-danger text-white hover:bg-danger/90 active:scale-[0.97] shadow-sm",
      icon:
        "p-0 w-11 h-11 rounded-full bg-transparent hover:bg-surface-2 text-text active:scale-90",
      close:
        "p-0 w-9 h-9 rounded-full bg-surface-2 border border-border text-text-muted hover:text-text hover:border-violet active:scale-90 group",
    };

    if (variant === "close") {
      return (
        <button
          ref={ref}
          type="button"
          aria-label="Close"
          className={cn(baseStyles, variantStyles.close, className)}
          onClick={handleClick}
          disabled={isDisabled}
          {...props}
        >
          <CloseIcon className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
        </button>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5 py-1">
            <span className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce" />
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
