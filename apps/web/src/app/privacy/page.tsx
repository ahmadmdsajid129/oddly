"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Notice
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
              <Shield className="w-4 h-4 text-violet stroke-[2.5]" />
              <span>Digital Personal Data Protection (DPDP) Act 2023 Compliant</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink">
              Oddly Privacy Notice &amp; Data Principles
            </h2>
            <p className="text-caption font-display font-bold text-muted">Last updated: November 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              1. Zero Plaintext Email Storage
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              When you sign in using Google OAuth, Oddly generates a one-way cryptographic SHA-256 hash of your email. Your actual email address is discarded immediately from memory and is <strong>never stored</strong> in our databases. We have no way to spam, email, sell, or disclose your contact information.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              2. Data Minimisation by Design
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              We collect strictly the minimum data required to facilitate game matches:
            </p>
            <ul className="list-disc pl-5 font-body text-sm text-muted space-y-1">
              <li>Your daily 5 question picks.</li>
              <li>Your approximate geographic region (coarse city level, never fine GPS or lat/long coordinates).</li>
              <li>An ephemeral device session token stored on your device.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              3. Data Retention &amp; Auto-Purging
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              Guest submissions are anonymised and disassociated after 30 days. Daily pairing candidate sets are purged automatically upon drop closure at 07:00 IST.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-extrabold text-ink">
              4. Your DPDP Data Rights
            </h3>
            <p className="font-body text-sm text-muted leading-relaxed">
              Under India&apos;s DPDP Act 2023 and global privacy frameworks, you have full ownership of your data:
            </p>
            <ul className="list-disc pl-5 font-body text-sm text-muted space-y-1">
              <li><strong>Right to Access &amp; Portability:</strong> Export a machine-readable JSON archive of all your picks and twin history directly from the Me &amp; Settings screen.</li>
              <li><strong>Right to Erasure:</strong> Permanently erase your account and all associated submissions with one click.</li>
              <li><strong>Right to Grievance Redressal:</strong> Contact our designated Data Protection Officer at privacy@oddly.app.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
