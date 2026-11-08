import { useEffect, useState } from "react";
import type { AnswerPayload } from "@oddly/shared";

const ADULT_CONFIRMED_KEY = "oddly_adult_confirmed";
const DRAFT_PREFIX = "oddly_draft_";
const COMPLETED_PREFIX = "oddly_completed_";

export function isAdultConfirmed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ADULT_CONFIRMED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdultConfirmed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADULT_CONFIRMED_KEY, "true");
  } catch {
    // LocalStorage might be disabled in private mode
  }
}

export function getSavedDraft(dropId: string): AnswerPayload[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${dropId}`);
    if (!raw) return null;
    return JSON.parse(raw) as AnswerPayload[];
  } catch {
    return null;
  }
}

export function saveDraft(dropId: string, answers: AnswerPayload[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${dropId}`, JSON.stringify(answers));
  } catch {
    // Ignore quota errors
  }
}

export function clearDraft(dropId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${dropId}`);
  } catch {
    // Ignore
  }
}

export function getCompletedResult<T = unknown>(dropId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${COMPLETED_PREFIX}${dropId}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveCompletedResult(dropId: string, result: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${COMPLETED_PREFIX}${dropId}`, JSON.stringify(result));
  } catch {
    // Ignore
  }
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "req_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Hook to track online/offline connectivity
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
