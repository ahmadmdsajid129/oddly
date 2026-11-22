"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function queryRetryPolicy(failureCount: number, error: unknown): boolean {
  // Architecture Sec 6.3: Retry up to 5 times for idempotent requests
  if (failureCount >= 5) return false;

  const err = error as { statusCode?: number; status?: number };
  const status = err?.statusCode || err?.status;

  // Do NOT retry 4xx errors except 408 (Timeout) and 429 (Too Many Requests / Rate Limited)
  if (status && status >= 400 && status < 500) {
    return status === 408 || status === 429;
  }

  // Always retry 5xx server errors and network dropouts
  return true;
}

export function queryRetryDelayPolicy(attemptIndex: number, error: unknown): number {
  const err = error as {
    headers?: Record<string, string>;
    response?: { headers?: { get?: (name: string) => string | null } };
    retry_after?: number;
  };

  // Honor server Retry-After header if returned (e.g. from 429 or 503)
  const retryAfterHeader =
    err?.response?.headers?.get?.("retry-after") ||
    err?.headers?.["retry-after"] ||
    err?.headers?.["Retry-After"];

  if (retryAfterHeader) {
    const parsedSeconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
      return parsedSeconds * 1000;
    }
  }

  if (err?.retry_after && typeof err.retry_after === "number") {
    return err.retry_after * 1000;
  }

  // Exponential backoff per Sec 6.3: 500ms -> 1s -> 2s -> 4s -> 8s (capped at 30s)
  // Full jitter: uniformly random between 0 and baseDelay
  const baseDelay = Math.min(500 * 2 ** attemptIndex, 30000);
  return Math.floor(Math.random() * baseDelay);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Resilience: Exponential backoff with full jitter & Retry-After support (R1.5)
            retry: queryRetryPolicy,
            retryDelay: queryRetryDelayPolicy,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
