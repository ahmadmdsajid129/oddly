"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, X, Lock, Zap, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";
import type { TelepathyRoundResponse } from "@oddly/api-client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TelepathyGameCardProps {
  orbitId: string;
  className?: string;
  onSyncUpdated?: () => void;
}

export function TelepathyGameCard({
  orbitId,
  className,
  onSyncUpdated,
}: TelepathyGameCardProps) {
  const [round, setRound] = useState<TelepathyRoundResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRound = useCallback(async () => {
    if (!orbitId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.telepathy.get(orbitId);
      if (res && res.ok && res.round) {
        setRound(res.round);
      }
    } catch (err: unknown) {
      console.error("Failed to load telepathy round:", err);
      setErrorMsg("Could not load Telepathy round.");
    } finally {
      setIsLoading(false);
    }
  }, [orbitId]);

  useEffect(() => {
    void fetchRound();
  }, [fetchRound]);

  const handleLockInGuess = async () => {
    if (!selectedOption || !orbitId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      feedback.triggerHaptic("reveal");
      feedback.playSound("tick");
      const res = await api.telepathy.guess(orbitId, selectedOption);
      if (res && res.ok && res.round) {
        setRound(res.round);
        if (res.round.reveal?.is_match) {
          feedback.playSound("chime");
        }
        if (onSyncUpdated) onSyncUpdated();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMsg(errObj?.message || "Could not lock in guess.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-3",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-pill bg-cream border-[1.5px] border-ink flex items-center justify-center animate-spin">
            <Zap className="w-3 h-3 text-ink" />
          </div>
          <span className="font-display text-xs font-extrabold uppercase tracking-wider text-muted">
            Checking Daily Telepathy...
          </span>
        </div>
      </div>
    );
  }

  if (errorMsg && !round) {
    return (
      <div
        className={cn(
          "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card text-center space-y-2",
          className
        )}
      >
        <p className="text-xs font-display font-bold text-coral">{errorMsg}</p>
        <Button variant="secondary" size="sm" onClick={() => void fetchRound()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!round) return null;

  // Case 1: Both partners have not yet submitted today's Drop
  if (!round.has_both_submitted) {
    return (
      <div
        className={cn(
          "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-3",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🔮</span>
            <h3 className="font-display text-sm font-extrabold text-ink uppercase tracking-wider">
              Daily Telepathy
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-pill bg-cream text-[10px] font-display font-extrabold border-[1.5px] border-ink text-muted">
            Drop Prerequisite
          </span>
        </div>

        <div className="p-3.5 rounded-m bg-cream border-[1.5px] border-ink space-y-2">
          <p className="font-body text-xs text-ink leading-relaxed">
            {!round.caller_submitted
              ? "Complete today's five picks first to unlock Telepathy with your twin."
              : "Your picks are sealed! Telepathy activates once your twin finishes today's Drop."}
          </p>

          {!round.caller_submitted && (
            <Link href="/" className="inline-block pt-1">
              <Button variant="primary" size="sm">
                <span>Play Today&apos;s Drop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { question, my_guess, reveal, sync_summary } = round;

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-pill bg-electric/20 border-[2px] border-ink flex items-center justify-center">
            <Zap className="w-4 h-4 text-ink" />
          </div>
          <div>
            <h3 className="font-display text-sm font-extrabold text-ink">
              Daily Telepathy
            </h3>
            <p className="font-body text-[11px] text-muted">
              Instinct sync on today&apos;s designated question
            </p>
          </div>
        </div>

        {my_guess ? (
          <span className="px-2.5 py-1 rounded-pill bg-cream text-[11px] font-display font-extrabold border-[1.5px] border-ink text-ink flex items-center gap-1">
            <Lock className="w-3 h-3 text-ink" />
            Locked
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-pill bg-warning/20 text-[11px] font-display font-extrabold border-[1.5px] border-ink text-ink">
            Guess Open
          </span>
        )}
      </div>

      {/* Error alert banner if any */}
      {errorMsg && (
        <div className="p-2.5 rounded-m bg-coral/10 border-[1.5px] border-coral text-xs font-display font-bold text-coral">
          {errorMsg}
        </div>
      )}

      {/* Question Prompt */}
      {question && (
        <div className="space-y-3">
          <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink">
            <span className="text-[10px] font-display font-extrabold uppercase text-muted tracking-wider block mb-0.5">
              Question #{question.position} • {question.type === "image" ? "Visual Pick" : "Text Choice"}
            </span>
            <p className="font-display text-sm font-extrabold text-ink leading-snug">
              {question.prompt}
            </p>
          </div>

          {/* STATE A: ACTIVE GUESSING (My Guess is NULL) */}
          {!my_guess && (
            <div className="space-y-2">
              <span className="text-xs font-display font-extrabold text-ink block">
                What did your twin pick?
              </span>

              <div className="grid grid-cols-1 gap-2">
                {question.answer_options.map((opt) => {
                  const isSelected = selectedOption === opt.value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        feedback.triggerHaptic("select");
                        setSelectedOption(opt.value);
                      }}
                      className={cn(
                        "w-full min-h-[44px] px-3.5 py-2.5 rounded-m border-[2px] border-ink text-left font-display text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer",
                        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                        isSelected
                          ? "bg-electric/25 shadow-sticker text-ink"
                          : "bg-paper hover:bg-cream shadow-sticker text-ink"
                      )}
                    >
                      <span>{opt.label}</span>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-pill border-[1.5px] border-ink flex items-center justify-center shrink-0 ml-2",
                          isSelected ? "bg-ink text-cream" : "bg-cream"
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="font-body text-[11px] text-muted leading-tight">
                  Permanent lock-in: once submitted, your twin&apos;s pick is revealed.
                </p>

                <Button
                  variant="primary"
                  size="md"
                  disabled={!selectedOption || isSubmitting}
                  isLoading={isSubmitting}
                  onClick={handleLockInGuess}
                  className="w-full sm:w-auto shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock In Guess</span>
                </Button>
              </div>
            </div>
          )}

          {/* STATE B: REVEAL & OUTCOME (My Guess is LOCKED) */}
          {my_guess && reveal && (
            <div className="space-y-3 pt-1">
              {/* Match/Differ Outcome Banner */}
              <div
                className={cn(
                  "p-3 rounded-m border-[2px] border-ink shadow-sticker flex items-center gap-3",
                  reveal.is_match ? "bg-mint/30" : "bg-cream"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-pill border-[2px] border-ink flex items-center justify-center shrink-0",
                    reveal.is_match
                      ? "bg-mint text-ink"
                      : "bg-paper text-ink"
                  )}
                >
                  {reveal.is_match ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <X className="w-4 h-4 stroke-[3]" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-display text-xs font-extrabold text-ink uppercase tracking-wider">
                    {reveal.is_match ? "Instinct Match!" : "Instinct Differed"}
                  </h4>
                  <p className="font-body text-[11px] text-muted">
                    {reveal.is_match
                      ? "You accurately guessed your twin's choice today."
                      : "Your instincts diverged on this question today."}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Sticker Pair */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Your Guess Sticker */}
                <div className="p-3 rounded-m bg-paper border-[2px] border-ink shadow-sticker space-y-1">
                  <span className="text-[10px] font-display font-extrabold uppercase text-muted block tracking-wider">
                    Your Guess
                  </span>
                  <p className="font-display text-xs font-extrabold text-ink leading-snug">
                    {question.answer_options.find((o) => o.value === my_guess.guessed_option)
                      ?.label || my_guess.guessed_option}
                  </p>
                </div>

                {/* Twin's Pick Sticker */}
                <div className="p-3 rounded-m bg-paper border-[2px] border-ink shadow-sticker space-y-1">
                  <span className="text-[10px] font-display font-extrabold uppercase text-muted block tracking-wider">
                    Twin&apos;s Pick
                  </span>
                  <p className="font-display text-xs font-extrabold text-ink leading-snug">
                    {question.answer_options.find((o) => o.value === reveal.partner_pick)
                      ?.label || reveal.partner_pick}
                  </p>
                </div>
              </div>

              {/* Statistical Luck Baseline Caption */}
              <div className="p-2.5 rounded-m bg-cream border-[1px] border-ink/20 flex items-center justify-between text-[11px] font-display font-bold text-muted">
                <span>Random chance baseline:</span>
                <span className="text-ink font-extrabold">
                  {Math.round(reveal.baseline_p * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RUNNING COMPOSITE SYNC SCORE CARD (P10C.08) */}
      {sync_summary && (
        <div className="pt-2 border-t-[1.5px] border-ink/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-extrabold text-ink uppercase tracking-wider">
              Orbit Instinct Sync
            </span>
            <span className="text-[11px] font-display font-bold text-muted">
              {sync_summary.total_rounds} {sync_summary.total_rounds === 1 ? "round" : "rounds"} played
            </span>
          </div>

          {sync_summary.unlocked ? (
            <div className="p-3.5 rounded-m bg-electric/15 border-[2px] border-ink shadow-sticker space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display text-2xl font-extrabold text-ink">
                    {Math.round(sync_summary.sync_score * 100)}%
                  </span>
                  <span className="font-display text-xs font-extrabold text-muted ml-1.5">
                    Sync Score
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-display text-xs font-extrabold text-ink">
                    {sync_summary.matches} of {sync_summary.total_rounds} matches
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-display font-bold text-muted border-t border-ink/10 pt-2">
                <span>Random chance baseline: {Math.round(sync_summary.baseline_score * 100)}%</span>
                <span className={cn(
                  "font-extrabold",
                  sync_summary.lift >= 0 ? "text-ink" : "text-coral"
                )}>
                  {sync_summary.lift >= 0 ? "+" : ""}
                  {Math.round(sync_summary.lift * 100)}% lift
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink space-y-2">
              <div className="flex items-center justify-between text-[11px] font-display font-bold text-muted">
                <span>Unlocks after 5 completed rounds</span>
                <span className="font-extrabold text-ink">
                  {sync_summary.total_rounds} / 5
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 h-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      "rounded-pill border-[1px] border-ink",
                      step <= sync_summary.total_rounds
                        ? "bg-electric"
                        : "bg-paper"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
