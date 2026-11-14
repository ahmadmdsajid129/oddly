"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { feedback } from "@/lib/feedback";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      if (type === "success") {
        feedback.playSound("chime");
        feedback.triggerHaptic("reveal");
      } else if (type === "error") {
        feedback.triggerHaptic("error");
      } else {
        feedback.triggerHaptic("select");
      }

      setToasts((prev) => [...prev, { id, type, message }]);

      // Error toasts stay until dismissed; others auto-dismiss in 3000ms
      if (type !== "error") {
        setTimeout(() => {
          removeToast(id);
        }, 3000);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);
  const info = useCallback((message: string) => toast(message, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast Render Viewport - top of screen below safe area */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 pt-safe"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker text-ink text-sm font-display font-bold"
              role={t.type === "error" ? "alert" : "status"}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.type === "success" && (
                  <span className="w-6 h-6 rounded-pill bg-mint text-ink flex items-center justify-center shrink-0 border-[1.5px] border-ink">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
                {t.type === "error" && (
                  <span className="w-6 h-6 rounded-pill bg-error text-paper flex items-center justify-center shrink-0 border-[1.5px] border-ink">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                )}
                {t.type === "info" && (
                  <span className="w-6 h-6 rounded-pill bg-lavender text-ink flex items-center justify-center shrink-0 border-[1.5px] border-ink">
                    <Info className="w-4 h-4" />
                  </span>
                )}
                <span className="truncate">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-ink hover:text-violet p-1 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
