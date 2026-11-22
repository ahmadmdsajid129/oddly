import { useEffect, useState } from "react";
import type { AnswerPayload } from "@oddly/shared";
import { usePlayStore, type PendingSubmissionPayload } from "./play-store";

export type { PendingSubmissionPayload };
export { usePlayStore };

export function savePendingSubmission(payload: PendingSubmissionPayload): void {
  usePlayStore.getState().savePendingSubmission(payload);
}

export function getPendingSubmission(dropId: string): PendingSubmissionPayload | null {
  return usePlayStore.getState().getPendingSubmission(dropId);
}

export function clearPendingSubmission(dropId: string): void {
  usePlayStore.getState().clearPendingSubmission(dropId);
}

export function getAllPendingSubmissions(): PendingSubmissionPayload[] {
  return usePlayStore.getState().getAllPendingSubmissions();
}

export function isAdultConfirmed(): boolean {
  return usePlayStore.getState().isAdultConfirmed();
}

export function setAdultConfirmed(confirmed = true): void {
  usePlayStore.getState().setAdultConfirmed(confirmed);
}

export function getSavedDraft(dropId: string): AnswerPayload[] | null {
  return usePlayStore.getState().getDraft(dropId);
}

export function saveDraft(dropId: string, answers: AnswerPayload[]): void {
  usePlayStore.getState().saveDraft(dropId, answers);
}

export function clearDraft(dropId: string): void {
  usePlayStore.getState().clearDraft(dropId);
}

export function getCompletedResult<T = unknown>(dropId: string): T | null {
  return usePlayStore.getState().getCompletedResult<T>(dropId);
}

export function saveCompletedResult(dropId: string, result: unknown): void {
  usePlayStore.getState().saveCompletedResult(dropId, result);
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
