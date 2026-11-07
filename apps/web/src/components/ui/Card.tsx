"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type CardVariant = "default" | "elevated" | "glass";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({
  variant = "default",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  const variantStyles: Record<CardVariant, string> = {
    default: "bg-surface border border-border shadow-sm",
    elevated: "bg-surface border border-border shadow-md hover:shadow-lg",
    glass: "glass-panel shadow-sm",
  };

  const interactiveStyles = interactive
    ? "transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:border-violet/60 active:translate-y-0 active:scale-[0.99]"
    : "";

  return (
    <div
      className={cn(
        "rounded-2xl p-5 sm:p-6",
        variantStyles[variant],
        interactiveStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: "default" | "mint" | "violet" | "coral";
  className?: string;
  children: React.ReactNode;
}) {
  const variantStyles = {
    default: "bg-surface-2 text-text-muted border-border",
    mint: "bg-mint/15 text-mint border-mint/40",
    violet: "bg-violet/15 text-violet dark:text-lavender border-violet/40",
    coral: "bg-coral/15 text-coral border-coral/40",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  selected = false,
  onClick,
  className,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-heading font-medium transition-all duration-150 border cursor-pointer select-none",
        selected
          ? "bg-violet text-white border-violet shadow-sm scale-102"
          : "bg-surface-2 text-text border-border hover:border-violet/60 hover:text-violet",
        className
      )}
    >
      {children}
    </button>
  );
}
