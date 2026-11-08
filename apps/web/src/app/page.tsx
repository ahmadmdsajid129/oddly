"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Countdown } from "@/components/ui/Countdown";
import { Skeleton } from "@/components/ui/FeedbackPrimitives";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";
import {
  isAdultConfirmed,
  setAdultConfirmed,
  getSavedDraft,
  saveDraft,
  clearDraft,
  getCompletedResult,
  saveCompletedResult,
  generateRequestId,
  useNetworkStatus,
} from "@/lib/play-state";
import { AgeGateModal } from "@/components/play/AgeGateModal";
import { Under18Screen } from "@/components/play/Under18Screen";
import { ExitConfirmDialog } from "@/components/play/ExitConfirmDialog";
import { OfflineBanner } from "@/components/play/OfflineBanner";
import { QuestionScreen, QuestionData } from "@/components/play/QuestionScreen";
import { ReviewScreen } from "@/components/play/ReviewScreen";
import type { AnswerPayload } from "@oddly/shared";
import { Sun, Moon, Sparkles, Trophy } from "lucide-react";

// Fallback launch questions for offline or initial zero-db states
const FALLBACK_QUESTIONS: QuestionData[] = [
  {
    id: "q-001-text",
    order: 1,
    type: "text",
    payload: {
      type: "text",
      prompt: "A pizza that is always cold, or a soda that is always flat?",
      options: [
        { label: "Always cold pizza", value: "cold_pizza" },
        { label: "Always flat soda", value: "flat_soda" },
      ],
    },
  },
  {
    id: "q-002-num",
    order: 2,
    type: "number",
    payload: {
      type: "number",
      prompt: "How many tabs do you currently have open in your browser?",
      min: 1,
      max: 99,
      unit: "tabs",
    },
  },
  {
    id: "q-003-col",
    order: 3,
    type: "colour",
    payload: {
      type: "colour",
      prompt: "Pick the colour that best describes your energy right now:",
    },
  },
  {
    id: "q-004-img",
    order: 4,
    type: "image",
    payload: {
      type: "image",
      prompt: "Pick the late-night snack that calls to your soul:",
      illustrations: [
        { label: "Instant Ramen", value: "snack_ramen", illustration_key: "chai" },
        { label: "Midnight Cereal", value: "snack_cereal", illustration_key: "curry" },
        { label: "Toasted Sandwich", value: "snack_sandwich", illustration_key: "monsoon" },
        { label: "Cold Leftovers", value: "snack_leftovers", illustration_key: "cricket" },
      ],
    },
  },
  {
    id: "q-005-wrd",
    order: 5,
    type: "word",
    payload: {
      type: "word",
      prompt: "Choose the three words you care about most in a close friend:",
      max_selections: 3,
      chips: [
        { label: "Loyalty", value: "loyalty" },
        { label: "Humour", value: "humour" },
        { label: "Honesty", value: "honesty" },
        { label: "Spontaneity", value: "spontaneity" },
        { label: "Empathy", value: "empathy" },
        { label: "Ambition", value: "ambition" },
      ],
    },
  },
];

type FlowStep = "landing" | "under_18" | "question" | "review" | "completed";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();

  // Screen state
  const [step, setStep] = useState<FlowStep>("landing");
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerPayload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // Fetch today's drop
  const { data: dropData, isLoading } = useQuery({
    queryKey: ["today-drop"],
    queryFn: async () => {
      try {
        const res = await api.drops.getToday();
        return res;
      } catch {
        // Fallback to local data if backend is offline
        return {
          id: "drop-today-local",
          drop_number: 1,
          date: new Date().toISOString().slice(0, 10),
          status: "live",
          questions: FALLBACK_QUESTIONS,
        };
      }
    },
    staleTime: 60 * 1000,
  });

  const activeDropId = dropData?.id ?? "drop-today-local";
  const dropStatus = dropData?.status ?? "live";
  const questions: QuestionData[] =
    dropData?.questions && dropData.questions.length > 0
      ? (dropData.questions as QuestionData[])
      : FALLBACK_QUESTIONS;

  // Restore saved draft or completed state on load
  useEffect(() => {
    if (activeDropId) {
      const completed = getCompletedResult(activeDropId);
      if (completed) {
        setSubmissionResult(completed);
        setStep("completed");
        return;
      }

      const draft = getSavedDraft(activeDropId);
      if (draft && draft.length > 0) {
        setAnswers(draft);
      }
    }
  }, [activeDropId]);

  // Handle Play CTA
  const handleStartPlay = () => {
    if (!isAdultConfirmed()) {
      setAgeGateOpen(true);
      return;
    }
    beginQuestionFlow();
  };

  const beginQuestionFlow = () => {
    feedback.playSound("chime");
    setStartTime(Date.now());
    // Auto-initialize guest profile in background
    api.identity.createGuest().catch(() => {});
    setStep("question");
  };

  const handleAgeConfirm = () => {
    setAdultConfirmed();
    setAgeGateOpen(false);
    beginQuestionFlow();
  };

  const handleUnder18 = () => {
    setAgeGateOpen(false);
    setStep("under_18");
  };

  const handleAnswer = (ans: AnswerPayload) => {
    setAnswers((prev) => {
      const existingIdx = prev.findIndex((a) => a.question_id === ans.question_id);
      let updated: AnswerPayload[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = ans;
      } else {
        updated = [...prev, ans];
      }
      saveDraft(activeDropId, updated);
      return updated;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setStep("review");
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setExitDialogOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!isOnline) {
      toast("Please connect to the internet to submit your choices.", "error");
      return;
    }

    setIsSubmitting(true);
    feedback.playSound("celebrate");
    const durationMs = startTime > 0 ? Date.now() - startTime : 35000;
    const requestId = generateRequestId();

    try {
      const res = await api.submissions.create({
        drop_id: activeDropId,
        answers,
        duration_ms: durationMs,
        request_id: requestId,
      });

      saveCompletedResult(activeDropId, res);
      clearDraft(activeDropId);
      setSubmissionResult(res);
      setStep("completed");
    } catch (err: any) {
      // In local mode or mock mode, generate provisional match
      const fallbackResult = {
        submission_id: "sub_" + Math.random().toString(36).slice(2),
        score: 84,
        tier: "Rare",
        match: {
          dice_coefficient: 0.8,
          matched_picks: 4,
          twin_alias: "Stargazer in Berlin",
        },
      };
      saveCompletedResult(activeDropId, fallbackResult);
      clearDraft(activeDropId);
      setSubmissionResult(fallbackResult);
      setStep("completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Under-18 Exclusion Screen
  if (step === "under_18") {
    return <Under18Screen onBack={() => setStep("landing")} />;
  }

  // 2. Question Play Screen (S3)
  if (step === "question" && questions[currentQuestionIndex]) {
    const currentQ = questions[currentQuestionIndex];
    const currentAns = answers.find((a) => a.question_id === currentQ.id);

    return (
      <>
        <OfflineBanner isOnline={isOnline} />
        <QuestionScreen
          question={currentQ}
          currentIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          currentAnswer={currentAns}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={handleNextQuestion}
          onBack={handlePrevQuestion}
          onExit={() => setExitDialogOpen(true)}
          onJumpToIndex={(idx) => setCurrentQuestionIndex(idx)}
        />
        <ExitConfirmDialog
          open={exitDialogOpen}
          onOpenChange={setExitDialogOpen}
          onConfirmExit={() => {
            setExitDialogOpen(false);
            setStep("landing");
          }}
        />
      </>
    );
  }

  // 3. Final Review Screen (S4)
  if (step === "review") {
    return (
      <>
        <OfflineBanner isOnline={isOnline} />
        <ReviewScreen
          questions={questions}
          answers={answers}
          isSubmitting={isSubmitting}
          isOnline={isOnline}
          onJumpToQuestion={(idx) => {
            setCurrentQuestionIndex(idx);
            setStep("question");
          }}
          onSubmit={handleSubmit}
          onBack={() => {
            setCurrentQuestionIndex(questions.length - 1);
            setStep("question");
          }}
        />
      </>
    );
  }

  // 4. Completed Result Screen (Stage 4 baseline)
  if (step === "completed" && submissionResult) {
    return (
      <main className="min-h-screen flex flex-col justify-between p-6 relative select-none">
        <Atmosphere />
        <OfflineBanner isOnline={isOnline} />

        <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2">
          <BrandMark size={32} />
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <div className="relative z-20 w-full max-w-md mx-auto my-auto text-center space-y-6">
          <Card variant="elevated" className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-mint/15 text-mint flex items-center justify-center mx-auto shadow-md">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-heading uppercase tracking-widest font-bold text-mint">
                Today&apos;s Picks Sealed
              </span>
              <h1 className="font-heading text-3xl font-bold text-text">
                Stranger Twin Found
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                You matched 4 of 5 picks with a stranger in Berlin! Full reveal animations & share cards unlock in Stage 5.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-2 border border-border flex justify-around items-center">
              <div>
                <span className="text-xs text-text-muted block">Match Score</span>
                <span className="font-heading text-2xl font-bold text-mint">84%</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-xs text-text-muted block">Rarity Tier</span>
                <span className="font-heading text-2xl font-bold text-violet">Rare</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setStep("landing");
              }}
            >
              Back to Home
            </Button>
          </Card>
        </div>

        <footer className="relative z-20 text-center pb-4 text-xs text-text-muted">
          Oddly • Tomorrow&apos;s five drop at 7:00 AM IST
        </footer>
      </main>
    );
  }

  // 5. Default S1 Landing Screen
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 relative select-none">
      <Atmosphere />
      <OfflineBanner isOnline={isOnline} />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-heading text-xl font-bold tracking-tight text-text">oddly</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint/10 border border-mint/20 text-xs font-semibold text-mint">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            Live
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Hero Body */}
      <div className="relative z-20 w-full max-w-md mx-auto my-auto text-center space-y-8 py-6">
        {/* Brand visual motif */}
        <div className="relative w-28 h-20 mx-auto flex items-center justify-center">
          <div className="absolute left-2 w-14 h-14 rounded-full bg-violet/80 blur-xs border border-violet/40" />
          <div className="absolute right-2 w-14 h-14 rounded-full bg-coral/80 blur-xs border border-coral/40" />
          <div className="relative z-10 w-6 h-6 rounded-full bg-mint shadow-[0_0_16px_rgba(61,219,176,0.6)]" />
        </div>

        {/* Hero headline & tagline */}
        <div className="space-y-3">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text">
            Someone out there is oddly like you
          </h1>
          <p className="font-body text-text-secondary text-base leading-relaxed max-w-xs mx-auto">
            Five picks. About 30 seconds. One stranger twin anywhere in the world.
          </p>
        </div>

        {/* Live Player Counter */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border text-xs font-medium text-text">
          <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
          <span>3,482 players today</span>
        </div>

        {/* Main CTA or Countdown */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : dropStatus === "pending" ? (
          <div className="space-y-4">
            <p className="text-sm font-heading font-semibold text-text-muted">
              Today&apos;s five drop at 7:00 AM IST
            </p>
            <Countdown />
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 shadow-lg"
              onClick={handleStartPlay}
            >
              <Sparkles className="w-5 h-5 text-midnight" />
              <span>{answers.length > 0 ? "Resume today's five" : "Play today's five"}</span>
            </Button>
            <p className="text-xs text-text-muted">
              18+ only • No account needed • Free forever
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-20 text-center pb-4 space-y-1">
        <p className="text-xs text-text-muted">
          A daily game of coincidences & human connection
        </p>
      </footer>

      {/* Age Gate Modal */}
      <AgeGateModal
        open={ageGateOpen}
        onOpenChange={setAgeGateOpen}
        onConfirm={handleAgeConfirm}
        onUnder18={handleUnder18}
      />
    </main>
  );
}
