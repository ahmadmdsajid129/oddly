"use client";

import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

/**
 * useMinimumLoading (Task P1.23)
 * Custom React hook that prevents jarring single-frame layout flicker
 * by ensuring a loading state remains visible for at least minDisplayMs (default 200ms).
 */
export function useMinimumLoading(
  isLoading: boolean,
  minDisplayMs = 200
): boolean {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoading(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      if (startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = minDisplayMs - elapsed;

        if (remaining > 0) {
          timerRef.current = setTimeout(() => {
            setShowLoading(false);
            startTimeRef.current = null;
            timerRef.current = null;
          }, remaining);
        } else {
          setShowLoading(false);
          startTimeRef.current = null;
        }
      } else {
        setShowLoading(false);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, minDisplayMs]);

  return showLoading;
}

/**
 * AntiFlickerSkeleton (Task P1.23)
 * Enforces anti-flicker threshold on content loading states.
 */
export interface AntiFlickerSkeletonProps {
  isLoading: boolean;
  minDisplayMs?: number;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AntiFlickerSkeleton({
  isLoading,
  minDisplayMs = 200,
  skeleton,
  children,
  className,
}: AntiFlickerSkeletonProps) {
  const activeLoading = useMinimumLoading(isLoading, minDisplayMs);

  return (
    <div className={cn("relative transition-opacity duration-150", className)}>
      {activeLoading ? (
        <div data-testid="anti-flicker-skeleton-container" aria-busy="true">
          {skeleton}
        </div>
      ) : (
        <div data-testid="anti-flicker-content-container">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * WidgetErrorBoundary (Task P1.23)
 * Granular React Error Boundary isolating crashes in secondary widgets
 * (Meme Card, Orbit Row, Globe Arc viewer) without terminating the core Drop flow.
 */
export interface WidgetErrorBoundaryProps {
  name?: string;
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  className?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Structured client log without PII
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[WidgetErrorBoundary:${this.props.name || "anonymous"}] caught error:`,
        error.message,
        errorInfo.componentStack
      );
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          data-testid="widget-error-fallback"
          className={cn(
            "rounded-m bg-paper border-[2.5px] border-ink shadow-sticker p-4 text-center select-none space-y-3",
            this.props.className
          )}
        >
          <div className="w-10 h-10 rounded-pill bg-coral/20 border-[1.5px] border-ink mx-auto flex items-center justify-center text-ink">
            <AlertCircle className="w-5 h-5 text-ink" />
          </div>

          <div className="space-y-1">
            <h4 className="font-display text-sm font-extrabold text-ink">
              {this.props.name ? `${this.props.name} took a nap` : "This widget took a nap"}
            </h4>
            <p className="font-body text-xs text-muted max-w-[240px] mx-auto leading-normal">
              The rest of your Drop is running smoothly. Tap retry to wake it up.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={this.handleRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="mx-auto min-h-[44px]"
          >
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
