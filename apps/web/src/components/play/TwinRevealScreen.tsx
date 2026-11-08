"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandMark, fireConfetti } from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { feedback } from "@/lib/feedback";
import { Check, X, Share2, Sparkles, ArrowRight, Info, Compass } from "lucide-react";

export interface TwinMatchData {
  matched_picks: number;
  total_picks?: number;
  dice_coefficient: number;
  twin_location: string;
  twin_age_band?: string;
  is_provisional: boolean;
  total_players_today?: number;
  pick_matches?: Array<{
    question_number: number;
    label: string;
    matched: boolean;
  }>;
}

interface TwinRevealScreenProps {
  match: TwinMatchData;
  onSeeOddness: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

export function TwinRevealScreen({
  match,
  onSeeOddness,
  onShare,
  onClose,
}: TwinRevealScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = useState<number>(shouldReduceMotion ? match.matched_picks : 0);

  const matchedPicks = match.matched_picks ?? 4;
  const totalPicks = match.total_picks ?? 5;
  const isExactTwin = matchedPicks === 5;
  const isWeakMatch = matchedPicks <= 2;
  const isEarlyDay = (match.total_players_today ?? 3500) < 200;

  // Animate count up of matched picks
  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayScore(matchedPicks);
      return;
    }

    feedback.playSound("celebrate");
    feedback.triggerHaptic("reveal");

    if (matchedPicks >= 4) {
      fireConfetti();
    }

    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count <= matchedPicks) {
        setDisplayScore(count);
        feedback.playSound("tick");
      } else {
        clearInterval(interval);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [matchedPicks, shouldReduceMotion]);

  const defaultPickMatches = [
    { question_number: 1, label: "Pick 1", matched: matchedPicks >= 1 },
    { question_number: 2, label: "Pick 2", matched: matchedPicks >= 2 },
    { question_number: 3, label: "Pick 3", matched: matchedPicks >= 3 },
    { question_number: 4, label: "Pick 4", matched: matchedPicks >= 4 },
    { question_number: 5, label: "Pick 5", matched: matchedPicks >= 5 },
  ];

  const pickMatches = match.pick_matches && match.pick_matches.length === 5
    ? match.pick_matches
    : defaultPickMatches;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none">
      <Atmosphere mode="hero" />

      {/* Screen Reader Summary */}
      <div aria-live="polite" className="sr-only">
        Stranger Twin Found. You matched {matchedPicks} of {totalPicks} picks with someone in {match.twin_location}.
      </div>

      {/* Header Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
        <BrandMark size={32} />

        <div className="flex items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              aria-label="Share match"
              className="p-2.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Climax Body */}
      <main className="relative z-20 w-full max-w-md mx-auto my-auto flex flex-col items-center text-center space-y-6 py-2">
        {/* Overlapping Brand Circles with glowing pulse */}
        <div className="relative w-28 h-20 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute left-2 w-14 h-14 rounded-full bg-violet/80 blur-xs border border-violet/40"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute right-2 w-14 h-14 rounded-full bg-coral/80 blur-xs border border-coral/40"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative z-10 w-7 h-7 rounded-full bg-mint shadow-[0_0_20px_rgba(61,219,176,0.8)]"
          />
        </div>

        {/* Big Animated Count-Up Score */}
        <div className="space-y-1">
          <motion.div
            key={displayScore}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            className="font-heading text-6xl sm:text-7xl font-extrabold text-text tracking-tight tabular-nums"
          >
            {displayScore} <span className="text-3xl sm:text-4xl text-text-muted font-normal">/ {totalPicks}</span>
          </motion.div>
          <p className="text-xs font-heading font-semibold uppercase tracking-widest text-mint">
            Picks Matched
          </p>
        </div>

        {/* Persona & Geographic Location (City, Country) */}
        <div className="space-y-2">
          {match.is_provisional && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-mint/10 text-mint border border-mint/20">
              <Compass className="w-3.5 h-3.5 animate-spin [animation-duration:12s]" />
              Closest so far
            </span>
          )}

          <h2 className="font-heading text-xl sm:text-2xl font-bold text-text">
            Someone in {match.twin_location}
            {match.twin_age_band ? `, age ${match.twin_age_band}` : ""}
          </h2>

          <p className="text-sm text-text-secondary max-w-xs mx-auto">
            {isExactTwin && "Rare miracle! You and your twin answered all five questions identically."}
            {!isExactTwin && !isWeakMatch && "Four out of five questions aligned across oceans and cultures."}
            {isWeakMatch && "An eclectic, unique set of picks! As more players drop in, a closer match may emerge."}
          </p>
        </div>

        {/* 5 Sequential Pick Indicator Dots */}
        <Card variant="glass" className="w-full p-4 flex items-center justify-around">
          {pickMatches.map((pick, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={shouldReduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  pick.matched
                    ? "bg-mint text-midnight shadow-[0_0_12px_rgba(61,219,176,0.5)]"
                    : "bg-surface-2 text-text-muted border border-border"
                }`}
              >
                {pick.matched ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
                )}
              </motion.div>
              <span className="text-[10px] font-heading font-semibold text-text-muted">
                {pick.label}
              </span>
            </div>
          ))}
        </Card>

        {/* Honest State Notice */}
        <div className="w-full p-3 rounded-xl bg-card border border-border flex items-start gap-2.5 text-left text-xs text-text-secondary leading-relaxed">
          <Info className="w-4 h-4 text-violet shrink-0 mt-0.5" />
          <span>
            {isEarlyDay
              ? "It is early in today's drop. People are still playing across different time zones. Your official final twin locks tomorrow at 7:00 AM IST."
              : "More people are playing throughout the day. If a closer stranger twin submits, your match will automatically refine."}
          </span>
        </div>

        {/* Primary CTA leading to S7 Oddness */}
        <div className="w-full pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-base font-bold shadow-lg"
            onClick={() => {
              feedback.playSound("chime");
              onSeeOddness();
            }}
          >
            <Sparkles className="w-5 h-5 text-midnight" />
            <span>See how odd you are</span>
            <ArrowRight className="w-4 h-4 text-midnight ml-1" />
          </Button>
        </div>
      </main>

      <footer className="relative z-20 text-center pb-2 text-xs text-text-muted">
        Oddly • No chat • No profiles • Pure coincidence
      </footer>
    </div>
  );
}
