/**
 * @file signals.ts
 * @package @oddly/web
 *
 * Lightweight, zero-dependency client telemetry batcher (P10F.02).
 *
 * Invariants:
 * 1. DPDP Default OFF: zero events recorded or transmitted without explicit active 'analytics' consent.
 * 2. Payload size <= 450 bytes minified.
 * 3. Uses navigator.sendBeacon with fetch keepalive fallback.
 * 4. Memory queue auto-flushes at >= 10 events or visibilitychange/pagehide.
 */

import type { SignalEventName, SignalEventProps, SignalEventItem } from "@oddly/shared";

const CONSENT_STORAGE_KEY = "oddly_consent_analytics";
const SESSION_ID_KEY = "oddly_signals_session";

let eventQueue: SignalEventItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    sid = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
}

export function isAnalyticsConsented(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
}

export function setAnalyticsConsentLocal(granted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_STORAGE_KEY, granted ? "true" : "false");
  if (!granted) {
    // Immediate memory flush on withdrawal
    eventQueue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
}

export function flushSignals(): void {
  if (eventQueue.length === 0 || !isAnalyticsConsented()) return;

  const payload = JSON.stringify({
    session_id: getSessionId(),
    events: eventQueue.slice(0, 50),
  });

  const endpoint = "/api/v1/events";

  let sent = false;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      sent = navigator.sendBeacon(endpoint, blob);
    } catch {
      sent = false;
    }
  }

  if (!sent && typeof fetch !== "undefined") {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  eventQueue = [];
}

export function trackSignal(
  eventName: SignalEventName,
  dropDate: string,
  props?: SignalEventProps
): void {
  // DPDP Invariant: Zero recording without consent
  if (!isAnalyticsConsented()) return;

  eventQueue.push({
    event_name: eventName,
    drop_date: dropDate,
    props: props ?? {},
    timestamp_ms: Date.now(),
  });

  if (eventQueue.length >= 10) {
    flushSignals();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSignals();
    }, 5000);
  }
}

// Hook lifecycle unload listeners
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSignals();
    }
  });
  window.addEventListener("pagehide", () => flushSignals());
}

