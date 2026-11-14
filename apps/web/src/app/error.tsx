"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-6">
        <div className="w-16 h-16 rounded-pill bg-coral border-[2.5px] border-ink shadow-sticker mx-auto flex items-center justify-center text-ink">
          <BrandMark size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-display-l font-extrabold text-ink">
            Something went oddly wrong
          </h1>
          <p className="font-body text-body-s text-muted max-w-xs mx-auto">
            We hit an unexpected bump. Your picks and session are safe on this device.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => reset()}
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    </main>
  );
}

