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
    // 1. Register service worker at /sw.js
    registerServiceWorker();

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
