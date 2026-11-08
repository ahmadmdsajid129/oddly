"use client";

import React from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-amber/15 border-b border-amber/30 text-amber px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 relative z-50 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are offline. Your picks are safely saved on this device.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
