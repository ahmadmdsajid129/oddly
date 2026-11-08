"use client";

import React, { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/FormControls";
import { ShieldCheck, UserCheck } from "lucide-react";

interface AgeGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onUnder18: () => void;
}

export function AgeGateModal({ open, onOpenChange, onConfirm, onUnder18 }: AgeGateModalProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Before you play"
      description="Oddly is a game for adults. We never ask for your name, phone number, or password."
    >
      <div className="space-y-6 pt-2">
        <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-mint shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            Under India&apos;s Digital Personal Data Protection (DPDP) Act, Oddly is strictly restricted to adults aged 18 and older. No account is required to play.
          </div>
        </div>

        <div className="flex items-center space-x-3 p-2">
          <Checkbox
            checked={agreed}
            onChange={(checked: boolean) => setAgreed(checked)}
            label="I confirm that I am 18 years of age or older"
          />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            disabled={!agreed}
            onClick={() => {
              if (agreed) {
                onConfirm();
              }
            }}
          >
            <UserCheck className="w-5 h-5" />
            Continue to today&apos;s five
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full text-text-muted hover:text-text"
            onClick={onUnder18}
          >
            I am under 18
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
