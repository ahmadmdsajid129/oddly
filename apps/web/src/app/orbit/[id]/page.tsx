"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, User, Flame, Calendar, Trash2, AlertCircle } from "lucide-react";
import { BrandMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ProceduralAvatar } from "@/components/orbit/ProceduralAvatar";
import { StagedUnlocks } from "@/components/orbit/StagedUnlocks";
import { ExpressionTray, APPROVED_EXPRESSIONS } from "@/components/orbit/ExpressionTray";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { feedback } from "@/lib/feedback";
import type { OrbitDetail } from "@oddly/api-client";

export default function OrbitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orbitId = params?.id as string;
  const { success, error, info } = useToast();

  const [orbit, setOrbit] = useState<OrbitDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const loadOrbit = useCallback(async () => {
    if (!orbitId) return;
    setIsLoading(true);
    try {
      const res = await api.orbits.get(orbitId);
      if (res && res.ok && res.orbit) {
        setOrbit(res.orbit);
      } else {
        error("Could not load Orbit.");
      }
    } catch (err: unknown) {
      console.error(err);
      error("Orbit not found or access denied.");
    } finally {
      setIsLoading(false);
    }
  }, [orbitId, error]);

  useEffect(() => {
    void loadOrbit();
  }, [loadOrbit]);

  const handleSendExpression = async (key: string) => {
    if (!orbitId) return;
    try {
      const res = await api.orbits.express(orbitId, key);
      if (res && res.ok) {
        success("Expression sent! 👋");
        void loadOrbit();
      } else {
        error(res.message || "Failed to send expression.");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error(errObj?.message || "Already expressed today.");
    }
  };

  const handleConfirmEndOrbit = async () => {
    if (!orbitId || isEnding) return;
    setIsEnding(true);
    try {
      const res = await api.orbits.end(orbitId);
      if (res && res.ok) {
        feedback.triggerHaptic("select");
        feedback.playSound("tick");
        info("Orbit ended. You will quietly return to the pool.");
        setIsEndDialogOpen(false);
        router.push("/orbit");
      } else {
        error(res.message || "Failed to end orbit.");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error(errObj?.message || "Failed to end orbit.");
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-cream text-ink p-6 max-w-xl mx-auto flex items-center justify-center">
        <div className="font-display font-extrabold text-muted animate-pulse">
          Loading Orbit...
        </div>
      </main>
    );
  }

  if (!orbit) {
    return (
      <main className="min-h-screen bg-cream text-ink p-6 max-w-xl mx-auto flex flex-col items-center justify-center text-center space-y-4">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Orbit Not Found
        </h2>
        <p className="font-body text-xs text-muted">
          This Orbit may have ended or belongs to another account.
        </p>
        <Link href="/orbit">
          <Button variant="primary" size="md">
            Return to Orbits
          </Button>
        </Link>
      </main>
    );
  }

  const isEnded = orbit.status === "ended";

  return (
    <main className="min-h-screen bg-cream text-ink p-4 sm:p-6 max-w-xl mx-auto pb-24 select-none">
      {/* Top Navigation */}
      <header className="flex items-center justify-between py-2 mb-6">
        <Link
          href="/orbit"
          className="w-10 h-10 rounded-pill bg-paper border-[2px] border-ink shadow-sticker flex items-center justify-center text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-sticker-flat"
          aria-label="Back to orbits list"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </Link>

        <span className="text-caption font-display font-extrabold text-muted bg-paper px-3 py-1 rounded-pill border-[1.5px] border-ink">
          Orbit Detail
        </span>
      </header>

      <div className="space-y-6">
        {/* Partner Hero Card */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4">
          <div className="flex items-center gap-4">
            <ProceduralAvatar seed={orbit.id} size={56} />

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-extrabold text-ink truncate">
                  Twin Connection
                </h1>
                {isEnded ? (
                  <span className="text-xs font-display font-bold text-muted bg-cream px-2 py-0.5 rounded-pill border border-ink">
                    Ended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-ink bg-coral px-2.5 py-0.5 rounded-pill border border-ink shadow-sticker-flat">
                    <Flame className="w-3.5 h-3.5 fill-ink stroke-ink" />
                    <span>{orbit.co_streak_current} Day Streak</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-display font-bold text-muted">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-violet stroke-[2.5]" />
                  <span>{orbit.partner.region}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Age {orbit.partner.age_band}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t-[1.5px] border-ink/20 flex items-center justify-between text-xs font-display font-bold text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Orbit started {orbit.started_on}</span>
            </span>
            <span>Best streak: {orbit.co_streak_best}d</span>
          </div>
        </div>

        {/* Staged Unlocks Progression Track */}
        <StagedUnlocks
          currentStreak={orbit.co_streak_current}
          bestStreak={orbit.co_streak_best}
        />

        {/* Daily Expression Tray (The Wave) */}
        {!isEnded && (
          <ExpressionTray
            canExpressToday={orbit.can_express_today}
            onSend={handleSendExpression}
          />
        )}

        {/* Today's Exchanged Expressions */}
        {orbit.today_expressions.length > 0 && (
          <div className="p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-3">
            <h3 className="font-display text-xs font-extrabold text-ink uppercase tracking-wider">
              Today&apos;s Waves
            </h3>
            <div className="space-y-2">
              {orbit.today_expressions.map((exp) => {
                const item = APPROVED_EXPRESSIONS.find((e) => e.key === exp.expression_key);
                return (
                  <div
                    key={exp.id}
                    className="p-3 rounded-m bg-cream border-[1.5px] border-ink flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item?.emoji || "👋"}</span>
                      <span className="font-display text-xs font-bold text-ink">
                        {exp.is_from_me ? "You expressed" : "Twin expressed"}{" "}
                        {item?.label || "Wave"}
                      </span>
                    </div>
                    <span className="text-[11px] font-display font-bold text-muted">
                      {new Date(exp.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* End Orbit Action (Instant unprovoked dissolution) */}
        {!isEnded && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsEndDialogOpen(true)}
              className="text-xs font-display font-bold text-muted hover:text-coral underline underline-offset-4 cursor-pointer"
            >
              End this Orbit
            </button>
          </div>
        )}
      </div>

      {/* End Orbit Neutral Confirmation Dialog */}
      <ResponsiveDialog
        open={isEndDialogOpen}
        onOpenChange={setIsEndDialogOpen}
        title="End Orbit"
      >
        <div className="p-4 space-y-4 text-center">
          <div className="w-12 h-12 rounded-pill bg-coral/20 border-[2px] border-ink mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-coral stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-base font-extrabold text-ink">
              End this twin connection?
            </h3>
            <p className="font-body text-xs text-muted max-w-sm mx-auto leading-relaxed">
              Both of you will quietly return to the stranger matching pool. No alert or blame is shown to your twin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              disabled={isEnding}
              onClick={() => setIsEndDialogOpen(false)}
            >
              Keep Orbit
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isEnding}
              onClick={handleConfirmEndOrbit}
              className="bg-coral hover:bg-coral text-ink border-[2px] border-ink"
            >
              End Orbit
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </main>
  );
}
