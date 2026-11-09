"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Notice
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
            <div className="flex items-center gap-2 text-mint font-heading font-bold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Digital Personal Data Protection (DPDP) Act 2023 Compliant</span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-text">
              Oddly Privacy Notice &amp; Data Principles
            </h2>
            <p className="text-xs text-text-muted">Last updated: November 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              1. Zero Plaintext Email Storage
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              When you sign in using Google OAuth, Oddly generates a one-way cryptographic SHA-256 hash of your email. Your actual email address is discarded immediately from memory and is <strong>never stored</strong> in our databases. We have no way to spam, email, sell, or disclose your contact information.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              2. Data We Collect &amp; Why
            </h3>
            <ul className="text-sm text-text-muted list-disc pl-5 space-y-1.5">
              <li>
                <strong>Daily Picks:</strong> Your 5 answers each day, used solely to compute mathematical distance ($L_1$) and pair you with your stranger twin.
              </li>
              <li>
                <strong>Pseudonymous Device ID:</strong> A randomly generated client token stored in your browser to save your daily streak without forcing an account creation.
              </li>
              <li>
                <strong>Approximate Region:</strong> City or country derived ephemerally from network headers for twin reveal labels (e.g., &quot;Stranger in Tokyo&quot;). Precise GPS coordinates are never collected.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              3. Right to Data Portability &amp; Erasure
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Under Sections 11 and 12 of the DPDP Act, you have the right to export your complete gameplay archive at any time via the <strong>Export My Data</strong> button in Settings. You also have the unconditional right to erase your account and disassociate all historical picks via <strong>Erase Account</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-heading text-base font-bold text-text">
              4. 18+ Age Verification
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Oddly is designed exclusively for adults 18 and older. We do not knowingly process data of minors. Any user indicating they are under 18 is immediately excluded from play.
            </p>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="font-heading text-sm font-bold text-text">
              Contact Our Data Protection Officer
            </h3>
            <p className="text-xs text-text-muted">
              For privacy inquiries, rights enforcement, or audits, contact: <span className="text-violet">privacy@oddly.app</span>
            </p>
          </section>
        </Card>
      </div>
    </main>
  );
}
