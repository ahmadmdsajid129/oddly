/**
 * @file page.tsx
 * @package @oddly/web
 *
 * Dedicated Offline Fallback Page (/offline).
 * Rendered when network connection drops and cached assets serve standalone mode.
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
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
    <main className="min-h-screen flex flex-col justify-between p-6 relative select-none">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-heading text-xl font-bold tracking-tight text-text">oddly</span>
        </div>
      </header>

      {/* Main card */}
      <div className="relative z-20 w-full max-w-md mx-auto my-auto text-center space-y-6 py-6">
        <div className="w-16 h-16 rounded-full bg-flame/10 border border-flame/30 mx-auto flex items-center justify-center text-flame">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text">
            You&apos;re currently offline
          </h1>
          <p className="font-body text-text-muted text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
            Any picks you made today are safe on your device. Oddly will automatically sync with your stranger twin once you reconnect.
          </p>
        </div>

        <div className="w-full max-w-xs mx-auto pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 rounded-full"
            onClick={handleRetry}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try reconnecting</span>
          </Button>
        </div>
      </div>

      {/* Footer note */}
      <footer className="relative z-20 text-center pb-4 text-xs text-text-muted">
        <span>Oddly offline mode · Saved locally</span>
      </footer>
    </main>
  );
}
