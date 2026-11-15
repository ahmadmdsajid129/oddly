"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/icons";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Countdown } from "@/components/ui/Countdown";
import { Skeleton } from "@/components/ui/FeedbackPrimitives";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { PwaInstallButton } from "@/components/ui/PwaInstallButton";
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
  savePendingSubmission,
  getPendingSubmission,
  clearPendingSubmission,
  generateRequestId,
  useNetworkStatus,
} from "@/lib/play-state";
import { AgeGateModal } from "@/components/play/AgeGateModal";
import { OfflineBanner } from "@/components/play/OfflineBanner";
import { QuestionScreen, QuestionData } from "@/components/play/QuestionScreen";
import type { TwinMatchData } from "@/components/play/TwinRevealScreen";
import type { OddnessData } from "@/components/play/OddnessScreen";
import dynamic from "next/dynamic";

const Under18Screen = dynamic(
  () => import("@/components/play/Under18Screen").then((m) => m.Under18Screen),
  { ssr: false }
);
const ExitConfirmDialog = dynamic(
  () => import("@/components/play/ExitConfirmDialog").then((m) => m.ExitConfirmDialog),
  { ssr: false }
);

const ReviewScreen = dynamic(
  () => import("@/components/play/ReviewScreen").then((m) => m.ReviewScreen),
  { ssr: false }
);
const SearchMapAnimation = dynamic(
  () => import("@/components/play/SearchMapAnimation").then((m) => m.SearchMapAnimation),
  { ssr: false }
);
const TwinRevealScreen = dynamic(
  () => import("@/components/play/TwinRevealScreen").then((m) => m.TwinRevealScreen),
  { ssr: false }
);
const OddnessScreen = dynamic(
  () => import("@/components/play/OddnessScreen").then((m) => m.OddnessScreen),
  { ssr: false }
);
const ShareSheet = dynamic(
  () => import("@/components/share/ShareSheet").then((mod) => mod.ShareSheet),
  { ssr: false }
);
import type { AnswerPayload, ShareFormat } from "@oddly/shared";
import { Sun, Moon, Sparkles, Trophy, ArrowRight, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

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

type FlowStep =
  | "landing"
  | "under_18"
  | "question"
  | "review"
  | "searching"
  | "reveal"
  | "oddness";

interface StoredPlayResult {
  submission_id: string;
  match: TwinMatchData;
  oddness: OddnessData;
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const isOnline = useNetworkStatus();

  // Screen state
  const [step, setStep] = useState<FlowStep>("landing");
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerPayload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<StoredPlayResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("story");

  // Fetch today's drop
  const { data: dropData, isLoading } = useQuery({
    queryKey: ["today-drop"],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await api.drops.getToday();
        clearTimeout(timeoutId);
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
    initialData: {
      id: "drop-today-local",
      drop_number: 1,
      date: new Date().toISOString().slice(0, 10),
      status: "live",
      questions: FALLBACK_QUESTIONS,
    },
    staleTime: 60 * 1000,
  });

  const activeDropId = dropData?.id ?? "drop-today-local";
  const dropStatus = dropData?.status ?? "live";
  const questions: QuestionData[] =
    dropData?.questions && dropData.questions.length > 0
      ? (dropData.questions as QuestionData[])
      : FALLBACK_QUESTIONS;

  // Restore saved draft, completed state, or replay pending submission on load (R1.5)
  useEffect(() => {
    if (activeDropId) {
      const completed = getCompletedResult<StoredPlayResult>(activeDropId);
      if (completed) {
        setSubmissionResult(completed);
        return;
      }

      // Replay pending submission on app open or reconnect (R1.5)
      const pending = getPendingSubmission(activeDropId);
      if (pending && isOnline) {
        api.submissions
          .create({
            drop_id: pending.drop_id,
            answers: pending.answers,
            duration_ms: pending.timing_ms,
            request_id: pending.request_id,
          })
          .then((res) => {
            clearPendingSubmission(activeDropId);
            clearDraft(activeDropId);
            const restored: StoredPlayResult = {
              submission_id: res.submission_id,
              match: {
                matched_picks: Math.round((res.match?.similarity_score ?? 0.8) * 5),
                total_picks: 5,
                dice_coefficient: res.match?.similarity_score ?? 0.8,
                twin_location: "Berlin, Germany",
                twin_age_band: "25 to 34",
                is_provisional: res.match?.is_provisional ?? true,
                total_players_today: 3482,
              },
              oddness: {
                percentile: res.oddness?.percentile ?? 84,
                tier: (res.oddness?.tier as any) ?? "Rare",
                raw_score: res.oddness?.raw_score,
                rarest_pick: {
                  prompt: "Pick the colour that best describes your energy right now:",
                  value_label: "Luminous Violet",
                  frequency_pct: 3.1,
                },
              },
            };
            saveCompletedResult(activeDropId, restored);
            setSubmissionResult(restored);
          })
          .catch(() => {});
        return;
      }

      const draft = getSavedDraft(activeDropId);
      if (draft && draft.length > 0) {
        setAnswers(draft);
      }
    }
  }, [activeDropId, isOnline]);

  // Background polling for provisional match upgrades (P5.05)
  useQuery({
    queryKey: ["match-poll", activeDropId, submissionResult?.submission_id],
    queryFn: async () => {
      if (!submissionResult?.submission_id || dropStatus !== "live") return null;
      try {
        const updated = await api.results.get(activeDropId);
        if (updated && (updated as any).match) {
          setSubmissionResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              match: {
                ...prev.match,
                ...((updated as any).match),
              },
            };
          });
        }
        return updated;
      } catch {
        return null;
      }
    },
    enabled: Boolean(submissionResult?.submission_id && dropStatus === "live"),
    refetchInterval: 15000,
  });

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
    const durationMs = startTime > 0 ? Date.now() - startTime : 35000;
    const requestId = generateRequestId();

    // Persist pending submission immediately before network dispatch (R1.5)
    savePendingSubmission({
      drop_id: activeDropId,
      player_id: "current_player",
      request_id: requestId,
      timing_ms: durationMs,
      answers,
      created_at: Date.now(),
    });

    try {
      const res = await api.submissions.create({
        drop_id: activeDropId,
        answers,
        duration_ms: durationMs,
        request_id: requestId,
      });

      const processedResult: StoredPlayResult = {
        submission_id: res.submission_id,
        match: {
          matched_picks: Math.round((res.match?.similarity_score ?? 0.8) * 5),
          total_picks: 5,
          dice_coefficient: res.match?.similarity_score ?? 0.8,
          twin_location: "Berlin, Germany",
          twin_age_band: "25 to 34",
          is_provisional: res.match?.is_provisional ?? true,
          total_players_today: 3482,
        },
        oddness: {
          percentile: res.oddness?.percentile ?? 84,
          tier: (res.oddness?.tier as any) ?? "Rare",
          raw_score: res.oddness?.raw_score,
          rarest_pick: {
            prompt: "Pick the colour that best describes your energy right now:",
            value_label: "Luminous Violet",
            frequency_pct: 3.1,
          },
        },
      };

      clearPendingSubmission(activeDropId);
      saveCompletedResult(activeDropId, processedResult);
      clearDraft(activeDropId);
      setSubmissionResult(processedResult);
      setStep("searching");
    } catch {
      // Offline fallback mock
      const fallbackResult: StoredPlayResult = {
        submission_id: "sub_" + Math.random().toString(36).slice(2),
        match: {
          matched_picks: 4,
          total_picks: 5,
          dice_coefficient: 0.8,
          twin_location: "Berlin, Germany",
          twin_age_band: "25 to 34",
          is_provisional: true,
          total_players_today: 3482,
        },
        oddness: {
          percentile: 84,
          tier: "Rare",
          raw_score: 11.2,
          rarest_pick: {
            prompt: "Pick the colour that best describes your energy right now:",
            value_label: "Luminous Violet",
            frequency_pct: 3.1,
          },
        },
      };

      clearPendingSubmission(activeDropId);
      saveCompletedResult(activeDropId, fallbackResult);
      clearDraft(activeDropId);
      setSubmissionResult(fallbackResult);
      setStep("searching");
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

  // 4. Searching Radar Screen (S5: 2.0s duration)
  if (step === "searching") {
    return <SearchMapAnimation onComplete={() => setStep("reveal")} />;
  }

  // 5. Twin Reveal Screen (S6)
  if (step === "reveal" && submissionResult) {
    return (
      <>
        <TwinRevealScreen
          match={submissionResult.match}
          onSeeOddness={() => setStep("oddness")}
          onShare={() => {
            setShareFormat("story");
            setIsShareSheetOpen(true);
          }}
          onClose={() => setStep("landing")}
        />
        <ShareSheet
          isOpen={isShareSheetOpen}
          onClose={() => setIsShareSheetOpen(false)}
          dropId={activeDropId}
          defaultFormat={shareFormat}
        />
      </>
    );
  }

  // 6. Oddness Screen (S7)
  if (step === "oddness" && submissionResult) {
    return (
      <>
        <OddnessScreen
          oddness={submissionResult.oddness}
          onBackToTwin={() => setStep("reveal")}
          onShare={() => {
            setShareFormat("square");
            setIsShareSheetOpen(true);
          }}
          onChallenge={() => {
            setShareFormat("link");
            setIsShareSheetOpen(true);
          }}
          onHome={() => setStep("landing")}
        />
        <ShareSheet
          isOpen={isShareSheetOpen}
          onClose={() => setIsShareSheetOpen(false)}
          dropId={activeDropId}
          defaultFormat={shareFormat}
        />
      </>
    );
  }

  // 7. S1 Landing Screen
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 relative select-none">
      <Atmosphere />
      <OfflineBanner isOnline={isOnline} />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">oddly</span>
        </div>

        <div className="flex items-center gap-2">
          <StreakFlame
            streak={auth.isAuthenticated ? 1 : 0}
            longestStreak={auth.isAuthenticated ? 1 : 0}
            onFlameClick={() => router.push("/history")}
          />

          <PwaInstallButton className="hidden sm:inline-flex" />

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border-[1.5px] border-ink text-chip font-display font-bold text-ink">
            <span className="w-2 h-2 rounded-pill bg-mint border border-ink" />
            Live
          </div>

          <button
            type="button"
            onClick={() => router.push("/me")}
            className="p-2 rounded-m border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-4 h-4 stroke-[2.5]" />
          </button>

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <span className="text-chip font-display font-bold px-3 py-1 rounded-pill bg-lavender border-[1.5px] border-ink text-ink max-w-[100px] truncate">
                {auth.account?.displayName || "Player"}
              </span>
              <button
                type="button"
                onClick={() => auth.logout()}
                className="p-2 rounded-m border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => auth.openLoginModal()}
              className="px-3.5 py-1.5 text-chip font-display font-bold rounded-m border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer inline-flex flex-row items-center gap-1.5 min-h-[44px] whitespace-nowrap w-auto"
            >
              <User className="w-4 h-4 stroke-[2.5] text-violet shrink-0" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Body */}
      <div className="relative z-20 w-full max-w-md mx-auto my-auto text-center space-y-6 py-4">
        {/* Brand visual sticker motif: three physical overlapping circles with ink outlines */}
        <div className="relative w-28 h-20 mx-auto flex items-center justify-center">
          <div className="absolute left-1 w-14 h-14 rounded-pill bg-violet border-[2.5px] border-ink shadow-sticker" />
          <div className="absolute right-1 w-14 h-14 rounded-pill bg-coral border-[2.5px] border-ink shadow-sticker" />
          <div className="relative z-10 w-7 h-7 rounded-pill bg-mint border-[2px] border-ink shadow-sm" />
        </div>

        {/* Hero headline & tagline */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            Someone out there is oddly like you
          </h1>
          <p className="font-body text-muted text-base leading-relaxed max-w-xs mx-auto">
            Five picks. About 30 seconds. One stranger twin anywhere in the world.
          </p>
        </div>

        {/* Live Player Counter & Drop Theme */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-paper border-[1.5px] border-ink text-chip font-display font-bold text-ink shadow-sm">
            <span className="w-2.5 h-2.5 rounded-pill bg-mint border border-ink" />
            <span>3,482 players today</span>
          </div>

          {(dropData as any)?.theme_key && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-lavender border-[1.5px] border-ink text-chip font-display font-bold text-ink shadow-sm">
              <Sparkles className="w-3 h-3 text-violet shrink-0" />
              <span className="capitalize">{((dropData as any).theme_key as string).replace(/-/g, " ")} Drop</span>
            </div>
          )}
        </div>

        {/* Completed Drop Summary or Play CTA */}
        {submissionResult ? (
          <div className="rounded-l bg-paper border-[2.5px] border-ink shadow-sticker p-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 font-display font-bold text-xs uppercase tracking-wider text-ink px-3 py-1 bg-mint rounded-pill border-[1.5px] border-ink w-fit mx-auto">
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>Today&apos;s Picks Sealed</span>
            </div>

            <p className="font-display text-xl font-extrabold text-ink">
              Matched {submissionResult.match.matched_picks}/5 with a stranger in {submissionResult.match.twin_location}
            </p>

            <div className="flex items-center justify-center pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep("reveal")}
              >
                <span>View Twin & Oddness</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </div>

            <div className="pt-2 border-t-[1.5px] border-ink/20">
              <p className="text-caption text-muted mb-2 font-display font-bold uppercase tracking-wider">
                Next five drop at 07:00 IST
              </p>
              <Countdown />
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
          </div>
        ) : dropStatus === "pending" ? (
          <div className="space-y-4">
            <p className="text-body-s font-display font-bold text-muted">
              Today&apos;s five drop at 07:00 IST
            </p>
            <Countdown />
          </div>
        ) : (
          <div className="w-full max-w-xs sm:max-w-sm mx-auto flex flex-col items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              data-testid="play-welcome-start"
              className="w-full"
              onClick={handleStartPlay}
            >
              <Sparkles className="w-5 h-5" />
              <span>{answers.length > 0 ? "Resume today's five" : "Play today's five"}</span>
            </Button>
            <p className="text-caption text-muted font-bold font-display tracking-wide">
              18+ only • No account needed • Free forever
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-20 text-center pb-4 space-y-2">
        <div className="flex items-center justify-center gap-3 text-caption font-bold font-display text-muted">
          <button type="button" onClick={() => router.push("/about")} className="hover:text-ink cursor-pointer">
            About
          </button>
          <span>•</span>
          <button type="button" onClick={() => router.push("/history")} className="hover:text-ink cursor-pointer">
            Archive
          </button>
          <span>•</span>
          <button type="button" onClick={() => router.push("/me")} className="hover:text-ink cursor-pointer">
            Settings
          </button>
          <span>•</span>
          <button type="button" onClick={() => router.push("/privacy")} className="hover:text-ink cursor-pointer">
            Privacy
          </button>
          <span>•</span>
          <button type="button" onClick={() => router.push("/terms")} className="hover:text-ink cursor-pointer">
            Terms
          </button>
        </div>
        <p className="text-[11px] font-body text-muted">
          A daily game of coincidences &amp; human connection
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
