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

const Digit = React.memo(function Digit({ digit, shouldReduceMotion }: DigitProps) {
  if (shouldReduceMotion) {
    return (
      <span className="font-display text-3xl sm:text-4xl font-extrabold tabular-nums text-ink">
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
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="font-display text-3xl sm:text-4xl font-extrabold tabular-nums text-ink inline-block"
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

// Unit card: paper fill, 2.5px solid ink outline, shadow-sticker
const UnitCard = React.memo(function UnitCard({
  value,
  label,
  shouldReduceMotion,
}: UnitCardProps) {
  const tens = value[0] ?? "0";
  const ones = value[1] ?? "0";

  return (
    <div className="flex flex-col items-center">
      <div className="w-16 sm:w-20 h-20 sm:h-24 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center gap-0.5 overflow-hidden relative">
        <Digit digit={tens} shouldReduceMotion={shouldReduceMotion} />
        <Digit digit={ones} shouldReduceMotion={shouldReduceMotion} />
      </div>
      <span className="text-caption font-display font-bold text-muted mt-2 tracking-widest uppercase">
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
      const now = new Date(Date.now() + serverDateOffsetMs);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
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
        <span className="font-display text-2xl font-bold text-ink pb-6">:</span>
        <UnitCard
          value={pad(timeRemaining.minutes)}
          label="MIN"
          shouldReduceMotion={shouldReduceMotion}
        />
        <span className="font-display text-2xl font-bold text-ink pb-6">:</span>
        <UnitCard
          value={pad(timeRemaining.seconds)}
          label="SEC"
          shouldReduceMotion={shouldReduceMotion}
        />
      </div>
      <p className="font-body text-body-s text-muted mt-4">
        Today&apos;s five drop at <strong className="text-ink font-bold">07:00 IST</strong>
      </p>
    </div>
  );
}
