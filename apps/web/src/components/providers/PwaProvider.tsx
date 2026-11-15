/**
 * @file PwaProvider.tsx
 * @package @oddly/web
 *
 * Client provider for PWA service worker registration, second-visit push prompt,
 * and iOS Safari installation instructions (P10.01, P10.02, P10.07).
 */

"use client";

import React, { useEffect, useState } from "react";
import { registerServiceWorker, recordVisit, shouldShowPushPrompt } from "@/lib/push";
import { PushPermissionPrompt } from "@/components/ui/PushPermissionPrompt";
import { IosInstallBanner } from "@/components/ui/IosInstallBanner";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    // 1. In production, register service worker at /sw.js
    if (process.env.NODE_ENV === "production") {
      registerServiceWorker();
    } else if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      // In development on localhost, clean up any stale service workers and cached chunks
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if (typeof window !== "undefined" && "caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }

    // 2. Track visit count
    recordVisit();

    // 3. Check if eligible for second-visit prompt
    const timer = setTimeout(() => {
      if (shouldShowPushPrompt()) {
        setShowPushPrompt(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      <PushPermissionPrompt
        open={showPushPrompt}
        onOpenChange={setShowPushPrompt}
      />
      <IosInstallBanner />
    </>
  );
}
