"use client";

import React, { useState } from "react";
import { Lock, Unlock, Sparkles, Flame, Check, ArrowRight, MessageSquare, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_TRIAL_PROMPTS,
  evaluateThreeDoors,
  transitionChatConfirm,
  type TrialAnswerEntry,
} from "@oddly/shared";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ChatUnlockDoorsCardProps {
  orbitId: string;
  coStreak: number;
  syncScorePct?: number;
  currentUnlockState?: string; // 'locked' | 'unlocked'
  currentChatState?: string; // 'closed' | 'pending_confirm' | 'chat_ready'
  className?: string;
}

export function ChatUnlockDoorsCard({
  orbitId,
  coStreak,
  syncScorePct = 0,
  currentUnlockState = "locked",
  currentChatState = "closed",
  className,
}: ChatUnlockDoorsCardProps) {
  const [unlockState, setUnlockState] = useState<string>(currentUnlockState);
  const [chatState, setChatState] = useState<string>(currentChatState);
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [trialAnswers, setTrialAnswers] = useState<TrialAnswerEntry[]>([]);
  const [currentPromptIdx, setCurrentPromptIdx] = useState<number>(0);
  const [trialSuccess, setTrialSuccess] = useState<boolean>(false);

  // Evaluate doors
  const evaluation = evaluateThreeDoors({
    trialPassed: trialSuccess || unlockState === "unlocked",
    coStreak,
    syncScorePct,
    streakThreshold: 3,
    syncThreshold: 60,
  });

  const isUnlocked = evaluation.isUnlocked || unlockState === "unlocked";

  const handleStartTrial = () => {
    setIsTrialActive(true);
    setTrialAnswers([]);
    setCurrentPromptIdx(0);
  };

  const handlePickTrialOption = (choice: string) => {
    const prompt = DEFAULT_TRIAL_PROMPTS[currentPromptIdx];
    const updated = [...trialAnswers, { prompt_id: prompt.id, choice }];
    setTrialAnswers(updated);

    if (currentPromptIdx + 1 < DEFAULT_TRIAL_PROMPTS.length) {
      setCurrentPromptIdx(currentPromptIdx + 1);
    } else {
      // Completed all 8 trial prompts
      setIsTrialActive(false);
      setTrialSuccess(true);
      setUnlockState("unlocked");
    }
  };

  const handleConfirmUnlock = () => {
    const result = transitionChatConfirm({
      currentChatState: chatState,
      callerPlayerId: "me",
      consentPlayerId: hasConfirmed ? "me" : null,
      unlockState: "unlocked",
    });

    if (result.ok) {
      setHasConfirmed(true);
      setChatState(result.nextChatState);
    }
  };

  return (
    <div
      className={cn(
        "p-5 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-4 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-m bg-sun text-ink border-[1.5px] border-ink">
            {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </span>
          <div>
            <span className="font-display text-xs font-bold text-muted uppercase tracking-wider block">
              Connection Gate
            </span>
            <h3 className="font-display text-base font-extrabold text-ink leading-tight">
              The Three Doors
            </h3>
          </div>
        </div>

        <span
          className={cn(
            "px-2.5 py-1 rounded-pill border border-ink text-[11px] font-display font-extrabold",
            chatState === "chat_ready"
              ? "bg-mint text-ink"
              : isUnlocked
              ? "bg-sun text-ink"
              : "bg-cream text-muted"
          )}
        >
          {chatState === "chat_ready"
            ? "Chat Ready"
            : isUnlocked
            ? "Doors Open"
            : "Locked"}
        </span>
      </div>

      {/* Intro microcopy */}
      <p className="text-xs font-display font-medium text-muted leading-relaxed">
        Pass any one of the Three Doors with your twin to unlock mutual connection confirmation.
      </p>

      {/* The 3 Door Cards */}
      <div className="grid grid-cols-1 gap-2.5">
        {/* Door 1: Duo Trial v0 */}
        <div
          className={cn(
            "p-3 rounded-m border-[1.5px] border-ink flex items-center justify-between transition-colors",
            trialSuccess || evaluation.doors.trial.passed
              ? "bg-mint/30"
              : "bg-cream"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-pill bg-paper border border-ink flex items-center justify-center font-display font-black text-xs">
              1
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-extrabold text-ink">
                  Duo Trial v0
                </span>
                <span className="text-[10px] font-display font-bold text-muted uppercase">
                  (8 Prompts)
                </span>
              </div>
              <span className="text-[11px] font-display font-medium text-muted block">
                {trialSuccess || evaluation.doors.trial.passed
                  ? "Trial completed! Door is open."
                  : "Sync choices on 8 rapid instinct prompts"}
              </span>
            </div>
          </div>

          <div>
            {trialSuccess || evaluation.doors.trial.passed ? (
              <span className="px-2 py-0.5 rounded-pill bg-mint text-ink border border-ink text-[11px] font-display font-black">
                Passed ✓
              </span>
            ) : !isTrialActive ? (
              <button
                type="button"
                onClick={handleStartTrial}
                className="px-3 py-1.5 min-h-[44px] rounded-m bg-sun text-ink border-[1.5px] border-ink font-display text-xs font-extrabold shadow-sticker-flat active:translate-x-[2px] active:translate-y-[2px]"
              >
                Try Door 1
              </button>
            ) : null}
          </div>
        </div>

        {/* Door 2: Co-Streak */}
        <div
          className={cn(
            "p-3 rounded-m border-[1.5px] border-ink flex items-center justify-between",
            evaluation.doors.streak.passed ? "bg-mint/30" : "bg-cream"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-pill bg-paper border border-ink flex items-center justify-center font-display font-black text-xs">
              2
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-extrabold text-ink">
                  3-Day Co-Streak
                </span>
                <Flame className="w-3.5 h-3.5 text-coral" />
              </div>
              <span className="text-[11px] font-display font-medium text-muted block">
                {coStreak} of 3 consecutive drops together
              </span>
            </div>
          </div>

          <span
            className={cn(
              "px-2 py-0.5 rounded-pill border border-ink text-[11px] font-display font-bold",
              evaluation.doors.streak.passed
                ? "bg-mint text-ink font-black"
                : "bg-paper text-muted"
            )}
          >
            {evaluation.doors.streak.passed ? "Passed ✓" : `${coStreak}/3d`}
          </span>
        </div>

        {/* Door 3: Sync Score */}
        <div
          className={cn(
            "p-3 rounded-m border-[1.5px] border-ink flex items-center justify-between",
            evaluation.doors.sync.passed ? "bg-mint/30" : "bg-cream"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-pill bg-paper border border-ink flex items-center justify-center font-display font-black text-xs">
              3
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-extrabold text-ink">
                  High Sync Score
                </span>
                <Sparkles className="w-3.5 h-3.5 text-violet" />
              </div>
              <span className="text-[11px] font-display font-medium text-muted block">
                Achieve ≥ 60% agreement over daily drops
              </span>
            </div>
          </div>

          <span
            className={cn(
              "px-2 py-0.5 rounded-pill border border-ink text-[11px] font-display font-bold",
              evaluation.doors.sync.passed
                ? "bg-mint text-ink font-black"
                : "bg-paper text-muted"
            )}
          >
            {evaluation.doors.sync.passed ? "Passed ✓" : `${syncScorePct}% / 60%`}
          </span>
        </div>
      </div>

      {/* Active Trial Modal / Inline Interactive Prompt */}
      {isTrialActive && (
        <div className="p-4 rounded-m bg-paper border-[2px] border-ink shadow-sticker space-y-3">
          <div className="flex items-center justify-between text-xs font-display font-extrabold text-ink border-b border-ink/20 pb-2">
            <span>Duo Trial Prompt {currentPromptIdx + 1} of 8</span>
            <span className="text-muted font-bold">
              {DEFAULT_TRIAL_PROMPTS[currentPromptIdx].category}
            </span>
          </div>

          <h4 className="font-display text-sm font-extrabold text-ink">
            {DEFAULT_TRIAL_PROMPTS[currentPromptIdx].prompt_text}
          </h4>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                handlePickTrialOption(DEFAULT_TRIAL_PROMPTS[currentPromptIdx].option_a)
              }
              className="w-full min-h-[44px] p-2.5 rounded-m bg-cream border-[1.5px] border-ink font-display text-xs font-bold text-ink text-left hover:bg-sun active:translate-x-[2px] active:translate-y-[2px]"
            >
              A: {DEFAULT_TRIAL_PROMPTS[currentPromptIdx].option_a}
            </button>
            <button
              type="button"
              onClick={() =>
                handlePickTrialOption(DEFAULT_TRIAL_PROMPTS[currentPromptIdx].option_b)
              }
              className="w-full min-h-[44px] p-2.5 rounded-m bg-cream border-[1.5px] border-ink font-display text-xs font-bold text-ink text-left hover:bg-sun active:translate-x-[2px] active:translate-y-[2px]"
            >
              B: {DEFAULT_TRIAL_PROMPTS[currentPromptIdx].option_b}
            </button>
          </div>
        </div>
      )}

      {/* Both-Confirm & chat_ready Section */}
      {isUnlocked && (
        <div className="pt-2 border-t-[1.5px] border-ink/20 space-y-3">
          {chatState === "chat_ready" ? (
            <div className="p-4 rounded-m bg-mint/40 border-[2px] border-ink shadow-sticker space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ink" />
                <h4 className="font-display text-sm font-extrabold text-ink">
                  Chat Unlocked! (chat_ready)
                </h4>
              </div>
              <p className="text-xs font-display font-medium text-ink/80 leading-relaxed">
                Both you and your twin passed the doors and confirmed connection. The
                dedicated messaging room will arrive in a future update.
              </p>
            </div>
          ) : chatState === "pending_confirm" ? (
            <div className="p-3.5 rounded-m bg-sun/30 border-[1.5px] border-ink space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-extrabold text-ink">
                  Awaiting Twin Confirmation
                </span>
                <span className="text-[10px] font-display font-bold text-muted">
                  1/2 Confirmed
                </span>
              </div>
              <p className="text-xs font-display font-medium text-muted">
                You have confirmed chat unlock. As soon as your twin confirms from their
                side, connection will enter `chat_ready`.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={handleConfirmUnlock}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 font-display text-sm font-extrabold"
              >
                <Unlock className="w-4 h-4" />
                <span>Confirm Chat Unlock</span>
              </Button>
              <p className="text-[11px] font-display font-medium text-muted text-center">
                Requires mutual confirmation by both twins.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
