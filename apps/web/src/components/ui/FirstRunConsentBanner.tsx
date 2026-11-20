"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

const DISMISSED_KEY = "oddly_dpdp_notice_dismissed";

export function FirstRunConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
      if (!dismissed) {
        setVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Privacy notice"
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-lg mx-auto z-40 p-3.5 bg-paper border-[2.5px] border-ink rounded-m shadow-sticker flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ShieldCheck className="w-5 h-5 text-violet shrink-0 stroke-[2.5]" />
        <p className="font-body text-xs text-ink leading-snug">
          <strong className="font-display font-bold">Privacy first:</strong> We collect zero tracking analytics by default under the DPDP Act. Review in{" "}
          <Link
            href="/me"
            className="underline font-bold text-violet hover:text-ink"
            onClick={handleDismiss}
          >
            Settings
          </Link>
          .
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-pill hover:bg-lavender text-ink cursor-pointer shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Dismiss privacy notice"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </aside>
  );
}

