"use client";

import React, { useState } from "react";
import { MapPin, User, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { feedback } from "@/lib/feedback";
import type { IncomingKeepItem } from "@oddly/api-client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface OrbitRequestCardProps {
  request: IncomingKeepItem;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
  className?: string;
}

export function OrbitRequestCard({
  request,
  onAccept,
  onDecline,
  className,
}: OrbitRequestCardProps) {
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    if (loadingAction) return;
    setLoadingAction("accept");
    feedback.triggerHaptic("reveal");
    feedback.playSound("celebrate");
    try {
      await onAccept(request.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    if (loadingAction) return;
    setLoadingAction("decline");
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    try {
      await onDecline(request.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const matchPct = Math.round(request.similarity_snapshot * 100);

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4 select-none",
        className
      )}
    >
      {/* Top Row: Title & Similarity Badge */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
        <div>
          <span className="font-display text-xs font-bold text-muted uppercase tracking-wider block">
            Incoming Request
          </span>
          <h3 className="font-display text-base font-extrabold text-ink mt-0.5">
            Your Twin from {request.drop_date}
          </h3>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-sun border-[1.5px] border-ink text-xs font-display font-extrabold text-ink shadow-sticker-flat">
          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{matchPct}% Match</span>
        </div>
      </div>

      {/* Anonymous Traits (k >= 20 region, age band) */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-m bg-cream border-[1.5px] border-ink text-xs font-display font-bold text-ink">
          <MapPin className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
          <span>{request.region}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-m bg-cream border-[1.5px] border-ink text-xs font-display font-bold text-ink">
          <User className="w-3.5 h-3.5 text-muted stroke-[2.5]" />
          <span>Age {request.age_band}</span>
        </div>
      </div>

      <p className="font-body text-xs text-muted leading-relaxed">
        Both of you can start an Orbit co-streak and exchange one tactile wave each day.
      </p>

      {/* Action Buttons with >= 44px touch target */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="md"
          isLoading={loadingAction === "decline"}
          disabled={loadingAction !== null}
          onClick={handleDecline}
          className="border-[2px] border-ink text-muted hover:text-ink"
        >
          <X className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span>Not now</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={loadingAction === "accept"}
          disabled={loadingAction !== null}
          onClick={handleAccept}
          className="bg-mint hover:bg-mint text-ink border-[2.5px] border-ink shadow-sticker font-extrabold"
        >
          <Check className="w-4 h-4 stroke-[3] shrink-0" />
          <span>Accept</span>
        </Button>
      </div>
    </div>
  );
}

