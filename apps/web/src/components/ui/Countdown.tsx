"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

interface UnitCardProps {
  value: string;
  label: string;
  shouldReduceMotion: boolean | null;
}

// Memoized outside of Countdown to prevent unmounting/remounting on every second
const UnitCard = React.memo(function UnitCard({
  value,
  label,
  shouldReduceMotion,
}: UnitCardProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 sm:w-20 h-20 sm:h-24 rounded-2xl bg-surface-2 border border-border shadow-sm flex items-center justify-center overflow-hidden relative">
        {shouldReduceMotion ? (
          <span className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text">
            {value}
          </span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text block"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
      <span className="text-[11px] font-heading font-semibold text-text-muted mt-2 tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
});

export function Countdown({
  targetDate,
  onComplete,
  className = "",
}: {
  targetDate?: Date;
  onComplete?: () => void;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  // Helper calculating next 07:00 IST (01:30 UTC)
  const calculateDefaultTarget = (): Date => {
    const now = new Date();
    // 07:00 IST is 01:30 UTC
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 30, 0, 0));
    if (now.getTime() >= target.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    return target;
  };

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = targetDate || calculateDefaultTarget();

    const update = () => {
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        onComplete?.();
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeRemaining({ hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <UnitCard
          value={pad(timeRemaining.hours)}
          label="HRS"
          shouldReduceMotion={shouldReduceMotion}
        />
        <span className="font-heading text-2xl font-bold text-text-muted pb-6">:</span>
        <UnitCard
          value={pad(timeRemaining.minutes)}
          label="MIN"
          shouldReduceMotion={shouldReduceMotion}
        />
        <span className="font-heading text-2xl font-bold text-text-muted pb-6">:</span>
        <UnitCard
          value={pad(timeRemaining.seconds)}
          label="SEC"
          shouldReduceMotion={shouldReduceMotion}
        />
      </div>
      <p className="font-body text-xs text-text-muted mt-4">until today&apos;s five drop at 7:00 AM IST</p>
    </div>
  );
}
