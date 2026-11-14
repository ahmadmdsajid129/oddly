"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back</span>
        </Button>

        <h1 className="font-display text-display-m font-extrabold text-ink">
          Terms of Service
        </h1>

        <div className="w-12" />
      </header>

      <div className="space-y-6">
        {/* Lawyer Review Required Notice */}
        <div className="p-3.5 rounded-m bg-sun/40 border-[2px] border-ink flex items-center gap-3 text-ink text-xs font-display font-bold shadow-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-coral stroke-[2.5]" />
          <span>Notice: Draft policy for platform launch — lawyer review required before commercial scale.</span>
        </div>

        <div className="p-6 sm:p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-6 leading-relaxed">
          <div className="space-y-2 border-b-[1.5px] border-ink/20 pb-4">
            <div className="flex items-center gap-2 text-ink font-display font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-violet stroke-[2.5]" />
              <span>Platform Terms &amp; Conditions</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink">
              Oddly Terms of Service
            </h2>
            <p className="text-caption font-display font-bold text-muted">Last updated: November 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              1. Eligibility &amp; 18+ Only
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              Oddly is strictly intended for individuals 18 years of age or older. By accessing or playing Oddly, you represent and warrant that you are at least 18 years old. Users found to be under 18 will have their access terminated immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              2. Acceptable Use &amp; Anti-Spam
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              You agree to use Oddly solely for personal entertainment. You agree not to:
            </p>
            <ul className="list-disc pl-5 font-body text-sm text-muted space-y-1">
              <li>Deploy automated scripts, bots, scrapers, or multiple duplicate submissions per drop.</li>
              <li>Attempt to reverse-engineer or re-identify paired anonymous stranger twins.</li>
              <li>Harass, abuse, or send offensive content through challenge links or shared cards.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              3. Limitation of Liability
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              Oddly is provided &ldquo;as is&rdquo; without warranties of any kind. Match pairings and rarity metrics are calculated algorithmically for social discovery and entertainment only. We make no guarantees regarding uninterrupted availability.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              4. Governing Law &amp; Jurisdiction
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              These terms are governed by the laws of India. Any disputes arising in connection with Oddly shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, India.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
