"use client";

import React, { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { Flag, CheckCircle2 } from "lucide-react";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType?: "drop" | "question" | "twin" | "other";
  targetId?: string;
}

export function ReportModal({
  open,
  onOpenChange,
  targetType = "other",
  targetId = "general",
}: ReportModalProps) {
  const [reason, setReason] = useState<
    "inappropriate" | "offensive" | "bot_abuse" | "technical_glitch" | "other"
  >("inappropriate");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.reports.submit({
        target_type: targetType,
        target_id: targetId,
        reason,
        note: note.slice(0, 140),
      });
      setSubmitted(true);
      toast("Report submitted to moderation", "success");
      setTimeout(() => {
        setSubmitted(false);
        setNote("");
        onOpenChange(false);
      }, 1800);
    } catch {
      toast("Failed to submit report. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col text-left px-2 py-3">
        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-mint mx-auto" />
            <h3 className="font-heading text-lg font-bold text-text">
              Thank you for keeping Oddly safe
            </h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto">
              Our moderation team reviews every report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-text font-heading font-bold text-lg mb-1">
              <Flag className="w-5 h-5 text-flame" />
              <span>Report an Issue</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Help us maintain an authentic, respectful community of stranger twins.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-text text-sm focus:outline-none focus:border-violet cursor-pointer"
              >
                <option value="inappropriate">Inappropriate or vulgar content</option>
                <option value="offensive">Harassment or hate speech</option>
                <option value="bot_abuse">Bot activity or fake submissions</option>
                <option value="technical_glitch">Technical glitch / bug</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-text">Details (optional)</label>
                <span className="text-text-muted">{140 - note.length} chars left</span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                rows={3}
                placeholder="Briefly describe what went wrong..."
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-text text-xs placeholder:text-text-muted focus:outline-none focus:border-violet resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => onOpenChange(false)}
                className="w-1/2 text-text-muted hover:text-text"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-1/2"
              >
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
}
