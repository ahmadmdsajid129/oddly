"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AntiTwinCard } from "@/components/results/AntiTwinCard";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";
import { ArrowLeft, Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { ShareSheet } from "@/components/share/ShareSheet";

function AntiTwinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dropId, setDropId] = useState<string | null>(searchParams.get("dropId"));
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    async function resolveDrop() {
      if (!dropId) {
        try {
          const todayDrop = await api.drops.getToday();
          if (todayDrop && todayDrop.id) {
            setDropId(todayDrop.id);
          }
        } catch {
          // If today drop fails, fallback or let component display error
        }
      }
    }
    void resolveDrop();
  }, [dropId]);

  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col p-4 sm:p-6 max-w-lg mx-auto pb-16">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Home</span>
        </Button>

        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <h1 className="font-display text-xl font-extrabold text-ink">
            Anti-Twin
          </h1>
        </div>

        <div className="w-12" />
      </header>

      {/* Main Card */}
      <div className="my-auto flex flex-col items-center">
        {dropId ? (
          <AntiTwinCard
            dropId={dropId}
            onShare={() => setShareOpen(true)}
          />
        ) : (
          <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker text-center">
            <p className="font-body text-sm text-muted">
              Loading today&apos;s drop...
            </p>
          </div>
        )}
      </div>

      {/* Share Sheet modal */}
      {dropId && (
        <ShareSheet
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          dropId={dropId}
        />
      )}
    </main>
  );
}

export default function AntiTwinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <AntiTwinContent />
    </Suspense>
  );
}
