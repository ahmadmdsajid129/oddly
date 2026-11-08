"use client";

import React from "react";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { Button } from "@/components/ui/Button";

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmExit: () => void;
}

export function ExitConfirmDialog({ open, onOpenChange, onConfirmExit }: ExitConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Leave today's drop?"
      description="Your choices are automatically saved on this device. You can return anytime before tomorrow's 7:00 AM drop."
    >
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Keep playing
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full text-text-muted hover:text-text"
            onClick={onConfirmExit}
          >
            Leave drop
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
