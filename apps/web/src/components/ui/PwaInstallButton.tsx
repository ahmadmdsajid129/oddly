/**
 * @file PwaInstallButton.tsx
 * @package @oddly/web
 *
 * In-app PWA install button hooked to beforeinstallprompt event (P10.08).
 */

"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "./Toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast("Oddly installed! Launch from your home screen.", "success");
        setIsInstallable(false);
      }
    } catch (err) {
      console.warn("[PWA] Installation prompt error:", err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!isInstallable) return null;

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`px-3 py-1.5 rounded-full border border-mint/40 bg-mint/10 text-mint text-xs font-semibold flex items-center gap-1.5 hover:bg-mint/20 transition-all cursor-pointer shadow-xs ${className}`}
      title="Install Oddly Web App"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
}
