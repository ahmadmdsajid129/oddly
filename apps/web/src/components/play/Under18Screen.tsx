"use client";

import React from "react";
import { BrandMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeartHandshake } from "lucide-react";

interface Under18ScreenProps {
  onBack: () => void;
}

export function Under18Screen({ onBack }: Under18ScreenProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      <Card variant="elevated" className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <BrandMark size={48} />
        </div>

        <div className="w-12 h-12 rounded-full bg-violet/10 text-violet flex items-center justify-center mx-auto">
          <HeartHandshake className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading text-text">
            Thanks for visiting Oddly
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Because of privacy regulations (including India&apos;s Digital Personal Data Protection Act) and our commitment to user safety, Oddly is strictly restricted to adults aged 18 and older.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border text-xs text-text-muted leading-relaxed">
          Zero data was collected. No cookies, account tokens, or device identifiers have been saved on this device.
        </div>

        <Button variant="secondary" size="lg" className="w-full" onClick={onBack}>
          Back to Homepage
        </Button>
      </Card>
    </main>
  );
}
