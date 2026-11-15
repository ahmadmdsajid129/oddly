"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { OrbitRequestCard } from "@/components/orbit/OrbitRequestCard";
import { OrbitListRow } from "@/components/orbit/OrbitListRow";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { IncomingKeepItem, OrbitListItem } from "@oddly/api-client";
import { Sparkles, ArrowLeft, Heart, Globe, Users } from "lucide-react";

export default function OrbitListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, openLoginModal } = useAuth();
  const { success, error, info } = useToast();

  const [incoming, setIncoming] = useState<IncomingKeepItem[]>([]);
  const [orbits, setOrbits] = useState<OrbitListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [incomingRes, orbitsRes] = await Promise.allSettled([
        api.keeps.getIncoming(),
        api.orbits.list(),
      ]);

      if (incomingRes.status === "fulfilled" && incomingRes.value?.ok) {
        setIncoming(incomingRes.value.incoming || []);
      }
      if (orbitsRes.status === "fulfilled" && orbitsRes.value?.ok) {
        setOrbits(orbitsRes.value.orbits || []);
      }
    } catch (err) {
      console.error("Failed to load orbit data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadData]);

  const handleAcceptKeep = async (id: string) => {
    try {
      const res = await api.keeps.respond(id, "accept");
      if (res && res.ok) {
        success("Orbit formed! Your co-streak starts today ✨");
        // Remove from incoming and reload orbits
        setIncoming((prev) => prev.filter((k) => k.id !== id));
        void loadData();
      } else {
        error(res.message || "Failed to accept keep.");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error(errObj?.message || "Failed to accept keep.");
    }
  };

  const handleDeclineKeep = async (id: string) => {
    try {
      const res = await api.keeps.respond(id, "decline");
      if (res && res.ok) {
        info("Request dismissed.");
        setIncoming((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error(errObj?.message || "Failed to decline keep.");
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink p-4 sm:p-6 max-w-xl mx-auto pb-24 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-pill bg-paper border-[2px] border-ink shadow-sticker flex items-center justify-center text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display text-display-m font-extrabold text-ink leading-tight">
              Orbits
            </h1>
            <p className="font-body text-xs text-muted">
              Mutual twin bonds &amp; daily co-streaks
            </p>
          </div>
        </div>

        <Link
          href="/globe"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-lavender border-[2px] border-ink shadow-sticker text-xs font-display font-extrabold text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat"
        >
          <Globe className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
          <span>Globe</span>
        </Link>
      </header>

      {!isAuthenticated && !authLoading ? (
        // Guest Soft Sign-In Callout
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-4 my-8">
          <div className="w-14 h-14 rounded-pill bg-cream border-[2.5px] border-ink shadow-sticker mx-auto flex items-center justify-center">
            <Heart className="w-7 h-7 text-coral fill-coral stroke-ink stroke-[1.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-lg font-extrabold text-ink">
              Sign in to keep your twins
            </h2>
            <p className="font-body text-xs text-muted max-w-xs mx-auto">
              Orbits let you hold onto your stranger twins across drops, build co-streaks, and exchange daily tactile waves.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full bg-coral hover:bg-coral text-ink border-[2.5px] border-ink shadow-sticker"
            onClick={openLoginModal}
          >
            Sign in with Google
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Incoming Keep Requests */}
          {incoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-extrabold text-ink uppercase tracking-wider">
                  Pending Requests ({incoming.length})
                </span>
                <span className="text-[11px] font-display font-bold text-muted">
                  Expires in 48h
                </span>
              </div>

              <div className="space-y-3">
                {incoming.map((req) => (
                  <OrbitRequestCard
                    key={req.id}
                    request={req}
                    onAccept={handleAcceptKeep}
                    onDecline={handleDeclineKeep}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Active Orbits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-extrabold text-ink uppercase tracking-wider">
                Active Orbits ({orbits.filter((o) => o.status === "active").length} / 3)
              </span>
              <span className="text-[11px] font-display font-bold text-muted">
                Max 3 simultaneous
              </span>
            </div>

            {orbits.length === 0 && !isLoading ? (
              <div className="p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-3">
                <div className="w-12 h-12 rounded-pill bg-cream border-[2px] border-ink shadow-sticker mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted" />
                </div>
                <h3 className="font-display text-base font-extrabold text-ink">
                  No active orbits yet
                </h3>
                <p className="font-body text-xs text-muted max-w-xs mx-auto leading-relaxed">
                  Play today&apos;s drop, match with a stranger twin, and tap &quot;Keep this twin&quot; to form your first Orbit!
                </p>
                <Link href="/">
                  <Button variant="primary" size="sm" className="mt-2">
                    Play Today&apos;s Drop
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orbits.map((orbit, idx) => (
                  <OrbitListRow
                    key={orbit.orbit_id}
                    orbit={orbit}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
