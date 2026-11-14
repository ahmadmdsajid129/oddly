"use client";

import React, { useEffect, useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

interface DigitProps {
  digit: string;
  shouldReduceMotion: boolean | null;
}

// Individual digit component: only re-renders and animates when this specific digit changes
const Digit = React.memo(function Digit({ digit, shouldReduceMotion }: DigitProps) {
  if (shouldReduceMotion) {
    return (
      <span className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text">
        {digit}
      </span>
    );
  }

  return (
    <span className="relative inline-block tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={digit}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text inline-block"
        >
          {digit}
        </m.span>
      </AnimatePresence>
    </span>
  );
});

interface UnitCardProps {
  value: string;
  label: string;
  shouldReduceMotion: boolean | null;
}

// Unit card containing tens digit and ones digit independently
const UnitCard = React.memo(function UnitCard({
  value,
  label,
  shouldReduceMotion,
}: UnitCardProps) {
  const tens = value[0] ?? "0";
  const ones = value[1] ?? "0";

  return (
    <div className="flex flex-col items-center">
      <div className="w-16 sm:w-20 h-20 sm:h-24 rounded-2xl bg-surface-2 border border-border shadow-sm flex items-center justify-center gap-0.5 overflow-hidden relative">
        <Digit digit={tens} shouldReduceMotion={shouldReduceMotion} />
        <Digit digit={ones} shouldReduceMotion={shouldReduceMotion} />
      </div>
      <span className="text-[11px] font-heading font-semibold text-text-muted mt-2 tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
});

export function Countdown({
  targetDate,
  serverDateOffsetMs = 0,
  onComplete,
  className = "",
}: {
  targetDate?: Date;
  serverDateOffsetMs?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const hasTriggeredRef = React.useRef(false);

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Helper calculating next 07:00 IST (01:30 UTC)
    const calculateDefaultTarget = (): Date => {
      const now = new Date(Date.now() + serverDateOffsetMs);
      // 07:00 IST is 01:30 UTC
      const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 30, 0, 0));
      if (now.getTime() >= target.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
      return target;
    };

    hasTriggeredRef.current = false;
    const target = targetDate || calculateDefaultTarget();

    const update = () => {
      // Adjusted client time using server Date header offset (R1.5)
      const now = new Date(Date.now() + serverDateOffsetMs);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Thundering Herd Defense: randomized 0 to 4-second jitter before firing fetch (R1.5)
          const jitterMs = Math.floor(Math.random() * 4000);
          setTimeout(() => {
            onComplete?.();
          }, jitterMs);
        }
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
  }, [targetDate, serverDateOffsetMs, onComplete]);

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
