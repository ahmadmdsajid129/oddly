/**
 * @file PushPermissionPrompt.tsx
 * @package @oddly/web
 *
 * Contextual Second-Visit Push Permission Prompt Sheet (P10.02).
 */

"use client";

import React, { useState } from "react";
import { ResponsiveDialog } from "./Dialogs";
import { Button } from "./Button";
import { subscribeUserToPush } from "@/lib/push";
import { useToast } from "./Toast";
import { Bell, Sparkles, Shield, Clock } from "lucide-react";

interface PushPermissionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PushPermissionPrompt({
  open,
  onOpenChange,
  onSuccess,
}: PushPermissionPromptProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await subscribeUserToPush();
      if (res.success) {
        toast("Notifications enabled! You'll be notified at 7:00 AM.", "success");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast(res.error || "Could not enable notifications.", "error");
        onOpenChange(false);
      }
    } catch {
      toast("Notification request failed. Please check your browser settings.", "error");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("oddly_push_prompt_dismissed", "true");
    } catch {
      // ignore
    }
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Never miss your stranger twin"
      description="Every morning at 7:00 AM IST, five fresh picks drop."
    >
      <div className="space-y-5 pt-2">
        {/* Value Props */}
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-surface border border-border flex items-start gap-3">
            <Clock className="w-5 h-5 text-mint shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <div className="text-xs font-bold text-text">7:00 AM Daily Drop</div>
              <div className="text-[11px] text-text-muted">
                Be the first in the world to answer today&apos;s five questions.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-border flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <div className="text-xs font-bold text-text">Stranger Twin Upgrade</div>
              <div className="text-[11px] text-text-muted">
                Get alerted when an even closer stranger twin appears across the globe.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface border border-border flex items-start gap-3">
            <Shield className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <div className="text-xs font-bold text-text">Strict 2-Per-Day Cap &amp; Quiet Hours</div>
              <div className="text-[11px] text-text-muted">
                Zero spam. Completely silenced between 10:00 PM and 7:00 AM IST.
              </div>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 rounded-full font-bold shadow-md"
            onClick={handleSubscribe}
            isLoading={loading}
          >
            <Bell className="w-4 h-4" />
            <span>Turn on daily notifications</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full text-text-muted hover:text-text"
            onClick={handleDismiss}
          >
            Not now
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
