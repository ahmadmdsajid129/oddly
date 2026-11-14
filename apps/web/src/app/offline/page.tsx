/**
 * @file page.tsx
 * @package @oddly/web
 *
 * Dedicated Offline Fallback Page (/offline).
 * Rendered when network connection drops and cached assets serve standalone mode.
 * Styled with Sticker Pop physical cream desk.
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";
import { WifiOff, RotateCcw } from "lucide-react";

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col justify-between p-6 select-none">
      {/* Header */}
      <header className="flex items-center justify-between w-full max-w-xl mx-auto pt-2">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">oddly</span>
        </div>
      </header>

      {/* Main card */}
      <div className="w-full max-w-md mx-auto my-auto text-center space-y-6 py-6 p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card">
        <div className="w-16 h-16 rounded-pill bg-coral border-[2.5px] border-ink shadow-sticker mx-auto flex items-center justify-center text-ink">
          <WifiOff className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-display-l font-extrabold tracking-tight text-ink">
            You&apos;re currently offline
          </h1>
          <p className="font-body text-body-s text-muted leading-relaxed max-w-xs mx-auto">
            Any picks you made today are safe on your device. Oddly will automatically sync with your stranger twin once you reconnect.
          </p>
        </div>

        <div className="w-full max-w-xs mx-auto pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleRetry}
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Try Reconnecting</span>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-xl mx-auto text-center text-caption font-display font-bold text-muted pb-4">
        Zero progress lost · Local state preserved
      </footer>
    </main>
  );
}
