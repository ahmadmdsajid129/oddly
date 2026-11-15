"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Heart, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface KeepButtonProps {
  dropId: string;
  isProvisional?: boolean;
  className?: string;
  onKeepSuccess?: (status: "pending" | "accepted") => void;
}

export function KeepButton({
  dropId,
  isProvisional = false,
  className,
  onKeepSuccess,
}: KeepButtonProps) {
  const { isAuthenticated, openLoginModal } = useAuth();
  const { toast, success, error, info } = useToast();
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "accepted">("idle");

  // Load initial keep state from localStorage if previously sent
  useEffect(() => {
    if (typeof window !== "undefined" && dropId) {
      try {
        const saved = localStorage.getItem(`oddly_keep_${dropId}`);
        if (saved === "pending") setStatus("sent");
        if (saved === "accepted") setStatus("accepted");
      } catch {
        // ignore
      }
    }
  }, [dropId]);

  const handleKeepClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Crucial: Stop click event propagation so parent flip-cards do NOT flip back
    e.stopPropagation();
    e.preventDefault();

    if (isProvisional) {
      info("Final reveal seals at 07:00 IST. Keep unlocks once your twin is locked.");
      return;
    }

    if (!isAuthenticated) {
      info("Sign in with Google to keep your twin across daily drops. Never lose a bond.");
      openLoginModal();
      return;
    }

    if (status !== "idle") return;

    setStatus("loading");
    try {
      const res = await api.keeps.create(dropId);
      if (res && res.ok) {
        if (res.status === "accepted") {
          setStatus("accepted");
          try {
            localStorage.setItem(`oddly_keep_${dropId}`, "accepted");
          } catch {}
          feedback.triggerHaptic("reveal");
          feedback.playSound("celebrate");
          success("Mutual Keep! Your Orbit is now active ✨");
          onKeepSuccess?.("accepted");
        } else {
          setStatus("sent");
          try {
            localStorage.setItem(`oddly_keep_${dropId}`, "pending");
          } catch {}
          feedback.triggerHaptic("select");
          feedback.playSound("tick");
          success("Keep request sent. Waiting for twin to respond within 48h.");
          onKeepSuccess?.("pending");
        }
      } else {
        setStatus("idle");
        error(res.message || "Could not send Keep request.");
      }
    } catch (err: unknown) {
      setStatus("idle");
      const errObj = err as { message?: string; error?: string };
      if (errObj?.error === "COOLDOWN_ACTIVE") {
        info("Cooldown active: A recent Orbit already exists with this twin.");
      } else if (errObj?.error === "MAX_ORBITS_REACHED") {
        info("Orbit limit reached (maximum 3 concurrent Orbits).");
      } else if (errObj?.error === "TARGET_BUSY") {
        info("This twin has reached their maximum daily incoming requests.");
      } else {
        error(errObj?.message || "Failed to send keep request.");
      }
    }
  };

  if (isProvisional) {
    return (
      <button
        type="button"
        disabled
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full h-11 px-4 rounded-m bg-cream/70 border-[2px] border-ink/40 text-ink/60 font-display text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80",
          className
        )}
        title="Unlocks after 07:00 IST lock"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Keep locks at 07:00 IST</span>
      </button>
    );
  }

  if (status === "accepted") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full h-11 px-4 rounded-m bg-violet text-paper border-[2.5px] border-ink shadow-sticker-flat font-display text-xs font-extrabold flex items-center justify-center gap-2",
          className
        )}
      >
        <Sparkles className="w-4 h-4 text-sun stroke-[2.5]" />
        <span>In Orbit with Twin ✨</span>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full h-11 px-4 rounded-m bg-lavender text-ink border-[2px] border-ink shadow-sticker-flat font-display text-xs font-bold flex items-center justify-center gap-2",
          className
        )}
      >
        <Check className="w-4 h-4 text-ink stroke-[3]" />
        <span>Keep Request Sent (48h)</span>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      isLoading={status === "loading"}
      onClick={handleKeepClick}
      className={cn(
        "w-full h-11 font-display text-sm font-extrabold flex items-center justify-center gap-2 bg-coral hover:bg-coral text-ink border-[2.5px] border-ink shadow-sticker active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat",
        className
      )}
    >
      <Heart className="w-4 h-4 fill-ink stroke-ink stroke-[1.5]" />
      <span>Keep this twin</span>
    </Button>
  );
}
