/**
 * @file use-result-polling.ts
 * @package @oddly/web
 *
 * Pending-Result Polling with ETag 304 Backoff & Page Visibility Pausing (Task P5.10, Architecture Sec 6.3).
 *
 * Enforces strict network and anti-DDoS discipline:
 *   1. Starts at 30s base interval (or 3s for Mode B pending status).
 *   2. Backs off exponentially on HTTP 304 Not Modified up to 5 minutes (300s).
 *   3. Pauses polling when the browser tab is hidden (Page Visibility API) to eliminate wasted battery and edge requests.
 *   4. Adjusts interval dynamically according to degradation level (e.g. doubles interval under L1 load shedding).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api";
import type { ResultResponse, SubmissionStatusResponse } from "@oddly/api-client";
import type { DegradationLevel } from "@/components/ui/DegradationBanner";

export interface UseResultPollingOptions {
  dropId: string;
  requestId?: string;
  enabled?: boolean;
  isModeBPending?: boolean;
  degradationLevel?: DegradationLevel;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  onResult?: (result: ResultResponse) => void;
  onModeBPersisted?: (status: SubmissionStatusResponse) => void;
}

export function useResultPolling({
  dropId,
  requestId,
  enabled = true,
  isModeBPending = false,
  degradationLevel = "L0",
  initialIntervalMs = 30000,
  maxIntervalMs = 300000, // 5 minutes max per Sec 6.3
  onResult,
  onModeBPersisted,
}: UseResultPollingOptions) {
  const [currentIntervalMs, setCurrentIntervalMs] = useState<number>(
    isModeBPending ? 3000 : initialIntervalMs
  );
  const [isPolling, setIsPolling] = useState(false);
  const [etag, setEtag] = useState<string | null>(null);

  const etagRef = useRef<string | null>(null);
  etagRef.current = etag;

  const currentIntervalRef = useRef(currentIntervalMs);
  currentIntervalRef.current = currentIntervalMs;

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isTabVisibleRef = useRef<boolean>(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );

  // Compute degradation multiplier: L1 doubles interval; L2 multiplies by 4; L3/L4 pauses non-critical polling
  const getDegradationMultiplier = useCallback(() => {
    switch (degradationLevel) {
      case "L1":
        return 2;
      case "L2":
        return 4;
      case "L3":
      case "L4":
        return isModeBPending ? 2 : 10;
      default:
        return 1;
    }
  }, [degradationLevel, isModeBPending]);

  const poll = useCallback(async () => {
    if (!enabled || !dropId) return;

    // Do not poll if browser tab is hidden (Page Visibility API)
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    setIsPolling(true);

    try {
      if (isModeBPending && requestId) {
        // Mode B pending status check
        const statusRes = await api.submissions.getStatus(requestId);
        if (statusRes.ok && statusRes.status === "persisted") {
          onModeBPersisted?.(statusRes);
          return;
        }
        // Still pending: back off gradually (3s -> 6s -> 12s up to 30s)
        setCurrentIntervalMs((prev) => Math.min(prev * 1.5, 30000));
      } else {
        // Standard provisional match / outcome upgrade polling with ETag
        const res = await api.results.getWithEtag(dropId, etagRef.current || undefined);

        if (res.notModified) {
          // HTTP 304 Not Modified: back off interval exponentially up to 5 minutes (Sec 6.3)
          setCurrentIntervalMs((prev) => Math.min(prev * 2, maxIntervalMs));
        } else if (res.data) {
          // Fresh results received (HTTP 200)
          if (res.etag) {
            setEtag(res.etag);
          }
          // Reset interval back to baseline
          setCurrentIntervalMs(initialIntervalMs);
          onResult?.(res.data);
        }
      }
    } catch {
      // On network dropout, back off interval
      setCurrentIntervalMs((prev) => Math.min(prev * 2, maxIntervalMs));
    } finally {
      setIsPolling(false);
    }
  }, [
    enabled,
    dropId,
    requestId,
    isModeBPending,
    initialIntervalMs,
    maxIntervalMs,
    onResult,
    onModeBPersisted,
  ]);

  // Main polling scheduler effect
  useEffect(() => {
    if (!enabled) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      return;
    }

    const scheduleNext = () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

      const multiplier = getDegradationMultiplier();
      const delay = Math.min(currentIntervalRef.current * multiplier, maxIntervalMs);

      timeoutIdRef.current = setTimeout(async () => {
        if (isTabVisibleRef.current) {
          await poll();
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [enabled, currentIntervalMs, getDegradationMultiplier, maxIntervalMs, poll]);

  // Page Visibility API integration: pause polling when tab is hidden, resume immediately when visible
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      isTabVisibleRef.current = isVisible;

      if (isVisible && enabled) {
        // Tab just became visible: trigger an immediate check and reset timer
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, poll]);

  return {
    isPolling,
    currentIntervalMs,
    etag,
    pollNow: poll,
  };
}
