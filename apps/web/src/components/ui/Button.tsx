"use client";

import React, { forwardRef } from "react";
import { X as CloseIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { feedback } from "@/lib/feedback";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "destructive"
  | "success"
  | "ghost"
  | "icon"
  | "close";

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

    // Base button styling - Section 5: Display 700, 16px, radius-m (14px), outline (2.5px solid ink), min-height 44px
    // All interactive touch targets must be at least 44x44px. Button width hugs content.
    const baseStyles =
      "relative inline-flex flex-row items-center justify-center font-display font-bold select-none cursor-pointer outline-none transition-all duration-120 sticker-press disabled:pointer-events-none disabled:bg-lavender disabled:text-muted disabled:border-muted disabled:shadow-none min-h-[44px] w-auto whitespace-nowrap shrink-0";

    // Size variants: compact width according to the word, touch targets >= 44x44px
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "min-h-[44px] px-3.5 py-1 text-xs rounded-m gap-1.5",
      md: "min-h-[44px] px-4 py-2 text-sm rounded-m gap-2",
      lg: "min-h-[52px] px-6 py-2.5 text-base rounded-m gap-2.5",
    };

    // Variant styling - Section 5
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-violet text-paper border-[2.5px] border-ink shadow-sticker",
      secondary:
        "bg-paper text-ink border-[2.5px] border-ink shadow-sticker",
      tertiary:
        "bg-transparent text-violet border-none shadow-none hover:underline focus:underline min-h-[44px] px-2",
      ghost:
        "bg-transparent text-violet border-none shadow-none hover:underline focus:underline min-h-[44px] px-2",
      danger:
        "bg-paper text-error border-[2.5px] border-error shadow-[4px_4px_0_var(--color-error)]",
      destructive:
        "bg-paper text-error border-[2.5px] border-error shadow-[4px_4px_0_var(--color-error)]",
      success:
        "bg-mint text-ink border-[2.5px] border-ink shadow-sticker",
      icon:
        "p-0 min-w-[48px] min-h-[48px] rounded-m bg-paper text-ink border-[2.5px] border-ink shadow-sticker",
      close:
        "p-0 min-w-[44px] min-h-[44px] rounded-pill bg-paper text-ink border-[2.5px] border-ink shadow-sticker group",
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
        aria-busy={isLoading ? "true" : undefined}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex flex-row items-center justify-center gap-1.5 py-1 whitespace-nowrap" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-current animate-bounce" />
          </span>
        ) : (
          <span className="inline-flex flex-row items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap [&>svg]:shrink-0 [&>svg]:inline-block [&>span]:inline-flex [&>span]:items-center">
            {leftIcon && <span className="shrink-0 inline-flex items-center justify-center">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 inline-flex items-center justify-center">{rightIcon}</span>}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
