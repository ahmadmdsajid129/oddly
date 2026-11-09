"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative flex flex-col p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      <Atmosphere />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between py-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text pl-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <h1 className="font-heading text-lg font-bold text-text">
          Terms of Service
        </h1>

        <div className="w-12" />
      </header>

      <div className="relative z-20 space-y-6 text-text">
        {/* Lawyer Review Required Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 text-amber-400 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>Notice: Draft policy for platform launch — lawyer review required before commercial scale.</span>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 leading-relaxed">
          <div className="space-y-2 border-b border-border pb-4">
            <div className="flex items-center gap-2 text-violet font-heading font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Platform Terms &amp; Conditions</span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-text">
              Oddly Terms of Service
            </h2>
            <p className="text-xs text-text-muted">Last updated: November 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              1. Eligibility &amp; 18+ Only
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Oddly is strictly intended for individuals 18 years of age or older. By accessing or playing Oddly, you represent and warrant that you are at least 18 years old. Users found to be under 18 will have their access terminated immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              2. Gameplay Rules &amp; Bot Prevention
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Oddly relies on genuine human intuition. You agree not to automate submissions, reverse-engineer answer distributions, script multiple accounts, or bypass bot challenges (such as Cloudflare Turnstile). Violating these rules will result in disqualification and IP restriction.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              3. Pseudonymous Pairings
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Oddly reveals stranger twin matches based on mathematical similarity of your daily picks. Twin matches display only approximate geographic cities (e.g. &quot;Stranger in Tokyo&quot;) and pseudonymous avatars. Oddly does not provide direct messaging or personal contact exchange between twins.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              4. Disclaimer of Warranties
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Oddly is provided &quot;as is&quot; for entertainment, introspection, and serendipity. While we strive for 99.9% uptime and accurate twin pairing, we make no guarantees of unbroken availability.
            </p>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="font-heading text-sm font-bold text-text">
              Questions
            </h3>
            <p className="text-xs text-text-muted">
              For legal inquiries regarding these terms, reach us at: <span className="text-violet">legal@oddly.app</span>
            </p>
          </section>
        </Card>
      </div>
    </main>
  );
}
