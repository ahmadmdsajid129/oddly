/**
 * @file play-store.ts
 * @package @oddly/web
 *
 * Zustand Draft Persistence & Pending-Submission Recovery Store (Task P4.13, Architecture Sec 6.1 & 6.3).
 * Lightweight (< 1 KB), selector-driven state with localStorage persistence.
 * Guarantees that draft answers and pending request_ids survive accidental page refreshes,
 * browser restarts, and flaking network connections without losing picks.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnswerPayload } from "@oddly/shared";

export interface PendingSubmissionPayload {
  drop_id: string;
  player_id: string;
  request_id: string;
  timing_ms?: number;
  answers: AnswerPayload[];
  created_at: number;
}

export interface PlayStoreState {
  // State
  drafts: Record<string, AnswerPayload[]>;
  pendingSubmissions: Record<string, PendingSubmissionPayload>;
  completedResults: Record<string, unknown>;
  adultConfirmed: boolean;
  lastPlayedLaneSlug?: string;

  // Lane Preferences
  setLastPlayedLaneSlug: (slug: string) => void;

  // Draft Actions
  saveDraft: (dropId: string, answers: AnswerPayload[]) => void;
  getDraft: (dropId: string) => AnswerPayload[] | null;
  clearDraft: (dropId: string) => void;

  // Pending Submission Actions
  savePendingSubmission: (payload: PendingSubmissionPayload) => void;
  getPendingSubmission: (dropId: string) => PendingSubmissionPayload | null;
  clearPendingSubmission: (dropId: string) => void;
  getAllPendingSubmissions: () => PendingSubmissionPayload[];

  // Completed Results
  saveCompletedResult: (dropId: string, result: unknown) => void;
  getCompletedResult: <T = unknown>(dropId: string) => T | null;

  // Adult Confirmation (DPDP Gate)
  setAdultConfirmed: (confirmed?: boolean) => void;
  isAdultConfirmed: () => boolean;

  // Pending Recovery on App Open / Reconnect
  recoverPendingSubmission: (
    dropId: string,
    submitFn: (pending: PendingSubmissionPayload) => Promise<unknown>
  ) => Promise<unknown | null>;
}

export const usePlayStore = create<PlayStoreState>()(
  persist(
    (set, get) => ({
      drafts: {},
      pendingSubmissions: {},
      completedResults: {},
      adultConfirmed: false,
      lastPlayedLaneSlug: undefined,

      setLastPlayedLaneSlug: (slug: string) => {
        set({ lastPlayedLaneSlug: slug });
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("oddly_last_played_lane", slug);
          }
        } catch {}
      },

      saveDraft: (dropId, answers) => {
        set((state) => ({
          drafts: { ...state.drafts, [dropId]: answers },
        }));
        // Dual-write to localStorage for backward compatibility with external scripts
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(`oddly_draft_${dropId}`, JSON.stringify(answers));
          }
        } catch {}
      },

      getDraft: (dropId) => {
        const memoryDraft = get().drafts[dropId];
        if (memoryDraft && memoryDraft.length > 0) return memoryDraft;
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem(`oddly_draft_${dropId}`);
            if (raw) return JSON.parse(raw) as AnswerPayload[];
          }
        } catch {}
        return null;
      },

      clearDraft: (dropId) => {
        set((state) => {
          const next = { ...state.drafts };
          delete next[dropId];
          return { drafts: next };
        });
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(`oddly_draft_${dropId}`);
          }
        } catch {}
      },

      savePendingSubmission: (payload) => {
        set((state) => ({
          pendingSubmissions: { ...state.pendingSubmissions, [payload.drop_id]: payload },
        }));
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(`oddly_pending_submission_${payload.drop_id}`, JSON.stringify(payload));
          }
        } catch {}
      },

      getPendingSubmission: (dropId) => {
        const memoryPending = get().pendingSubmissions[dropId];
        if (memoryPending) return memoryPending;
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem(`oddly_pending_submission_${dropId}`);
            if (raw) return JSON.parse(raw) as PendingSubmissionPayload;
          }
        } catch {}
        return null;
      },

      clearPendingSubmission: (dropId) => {
        set((state) => {
          const next = { ...state.pendingSubmissions };
          delete next[dropId];
          return { pendingSubmissions: next };
        });
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(`oddly_pending_submission_${dropId}`);
          }
        } catch {}
      },

      getAllPendingSubmissions: () => {
        const pendingMap = get().pendingSubmissions;
        const list = Object.values(pendingMap);
        if (list.length > 0) return list;

        // Fallback scan of localStorage
        const legacyList: PendingSubmissionPayload[] = [];
        try {
          if (typeof window !== "undefined") {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("oddly_pending_submission_")) {
                const raw = localStorage.getItem(key);
                if (raw) legacyList.push(JSON.parse(raw) as PendingSubmissionPayload);
              }
            }
          }
        } catch {}
        return legacyList;
      },

      saveCompletedResult: (dropId, result) => {
        set((state) => ({
          completedResults: { ...state.completedResults, [dropId]: result },
        }));
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(`oddly_completed_${dropId}`, JSON.stringify(result));
          }
        } catch {}
      },

      getCompletedResult: (dropId) => {
        const memoryResult = get().completedResults[dropId];
        if (memoryResult) return memoryResult as any;
        try {
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem(`oddly_completed_${dropId}`);
            if (raw) return JSON.parse(raw);
          }
        } catch {}
        return null;
      },

      setAdultConfirmed: (confirmed = true) => {
        set({ adultConfirmed: confirmed });
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("oddly_adult_confirmed", String(confirmed));
          }
        } catch {}
      },

      isAdultConfirmed: () => {
        if (get().adultConfirmed) return true;
        try {
          if (typeof window !== "undefined") {
            return localStorage.getItem("oddly_adult_confirmed") === "true";
          }
        } catch {}
        return false;
      },

      recoverPendingSubmission: async (dropId, submitFn) => {
        const pending = get().getPendingSubmission(dropId);
        if (!pending) return null;

        try {
          const result = await submitFn(pending);
          get().clearPendingSubmission(dropId);
          get().clearDraft(dropId);
          if (result) {
            get().saveCompletedResult(dropId, result);
          }
          return result;
        } catch (err) {
          // Keep pending submission intact for next retry attempt
          throw err;
        }
      },
    }),
    {
      name: "oddly-play-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage && typeof window.localStorage.setItem === "function") {
          return window.localStorage;
        }
        if (
          typeof globalThis !== "undefined" &&
          (globalThis as any).localStorage &&
          typeof (globalThis as any).localStorage.setItem === "function"
        ) {
          return (globalThis as any).localStorage;
        }
        const memoryStore: Record<string, string> = {};
        return {
          getItem: (k: string) => memoryStore[k] ?? null,
          setItem: (k: string, v: string) => {
            memoryStore[k] = v;
          },
          removeItem: (k: string) => {
            delete memoryStore[k];
          },
        };
      }),
    }
  )
);
