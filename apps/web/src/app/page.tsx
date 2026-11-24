"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { LaneChip } from "@/components/lanes/LaneChip";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";
import type { LaneSummary } from "@oddly/shared";
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
  usePlayStore,
} from "@/lib/play-state";
import { OfflineBanner } from "@/components/play/OfflineBanner";
import { FirstRunConsentBanner } from "@/components/ui/FirstRunConsentBanner";
import type { QuestionData } from "@/components/play/QuestionScreen";
import type { TwinMatchData } from "@/components/play/TwinRevealScreen";
import type { OddnessData } from "@/components/play/OddnessScreen";
import { DegradationBanner, type DegradationLevel } from "@/components/ui/DegradationBanner";
import { ModeBPendingScreen } from "@/components/ui/ModeBPendingScreen";
import { FreshnessLabel } from "@/components/ui/OverloadScreens";
import { WidgetErrorBoundary } from "@/components/ui/ResiliencePrimitives";
import { useResultPolling } from "@/lib/use-result-polling";
import dynamic from "next/dynamic";

const LanePicker = dynamic(
  () => import("@/components/lanes/LanePicker").then((m) => m.LanePicker),
  { ssr: false }
);

const AgeGateModal = dynamic(
  () => import("@/components/play/AgeGateModal").then((m) => m.AgeGateModal),
  { ssr: false }
);

const QuestionScreen = dynamic(
  () => import("@/components/play/QuestionScreen").then((m) => m.QuestionScreen),
  { ssr: false }
);

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
  | "lane_picker"
  | "under_18"
  | "question"
  | "review"
  | "searching"
  | "pending_mode_b"
  | "reveal"
  | "oddness";

interface StoredPlayResult {
  submission_id: string;
  match: TwinMatchData;
  oddness: OddnessData;
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLane = searchParams.get("lane");
  const { toast } = useToast();
  const auth = useAuth();
  const isOnline = useNetworkStatus();

  // Lane state & Persistence (Stage B0 / Slice A1 / Decision D1)
  const lastPlayedLaneSlug = usePlayStore((state) => state.lastPlayedLaneSlug);
  const setLastPlayedLaneSlug = usePlayStore((state) => state.setLastPlayedLaneSlug);
  const completedResults = usePlayStore((state) => state.completedResults);

  const [currentLane, setCurrentLane] = useState({
    slug: urlLane || lastPlayedLaneSlug || "everyday",
    name_key: urlLane ? urlLane.charAt(0).toUpperCase() + urlLane.slice(1) : "Everyday",
    accent_token: "violet",
  });
  const hasPlayedBefore = Object.keys(completedResults).length > 0;

  // Derive played lanes today
  const playedLanesToday = React.useMemo(() => {
    const list: string[] = [];
    if (completedResults) {
      for (const key of Object.keys(completedResults)) {
        if (key.includes("memes")) list.push("memes");
        else list.push("everyday");
      }
    }
    return Array.from(new Set(list));
  }, [completedResults]);

  // Screen state
  const [step, setStep] = useState<FlowStep>("lane_picker");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerPayload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<StoredPlayResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>("story");

  // Initial 18+ Gate Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!isAdultConfirmed()) {
        setAgeGateOpen(true);
      } else {
        setStep("lane_picker");
      }
    }
  }, []);

  // Fetch runtime configuration (including degradation level)
  const { data: publicConfig } = useQuery({
    queryKey: ["public-config"],
    queryFn: () => api.config.getPublic().catch(() => null),
    staleTime: 60 * 1000,
  });

  const degradationLevel: DegradationLevel =
    (publicConfig?.degradation_level as DegradationLevel) || "L0";

  // Fetch today's drop for active lane
  const { data: dropData, isLoading } = useQuery({
    queryKey: ["today-drop", currentLane.slug],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await api.drops.getToday(currentLane.slug);
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
              submission_id: res.submission_id ?? res.request_id ?? "",
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

  // Background polling for provisional match upgrades & Mode B status (P5.10, Architecture Sec 6.3)
  const { isPolling: isMatchPolling, pollNow: pollMatchNow } = useResultPolling({
    dropId: activeDropId,
    requestId: pendingRequestId || undefined,
    enabled: Boolean(
      (submissionResult?.submission_id || step === "pending_mode_b") && dropStatus === "live"
    ),
    isModeBPending: step === "pending_mode_b",
    degradationLevel,
    onResult: (updated) => {
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
    },
    onModeBPersisted: (status) => {
      if (status.status === "persisted") {
        const persistedResult: StoredPlayResult = {
          submission_id: status.submission_id || pendingRequestId || "",
          match: {
            matched_picks: Math.round(((status.match?.similarity_score as number) ?? 0.8) * 5),
            total_picks: 5,
            dice_coefficient: (status.match?.similarity_score as number) ?? 0.8,
            twin_location: "Berlin, Germany",
            twin_age_band: "25 to 34",
            is_provisional: status.match?.is_provisional ?? false,
            total_players_today: 3482,
          },
          oddness: {
            percentile: status.oddness?.percentile ?? 84,
            tier: (status.oddness?.tier as any) ?? "Rare",
            raw_score: status.oddness?.raw_score,
            rarest_pick: {
              prompt: "Pick the colour that best describes your energy right now:",
              value_label: "Luminous Violet",
              frequency_pct: 3.1,
            },
          },
        };
        saveCompletedResult(activeDropId, persistedResult);
        setSubmissionResult(persistedResult);
        setStep("reveal");
      }
    },
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
    setStep("lane_picker");
  };

  const handleSelectLane = (lane: LaneSummary, mode?: "play" | "view_twin") => {
    setCurrentLane({
      slug: lane.slug,
      name_key: lane.name_key,
      accent_token: lane.accent_token,
    });
    setLastPlayedLaneSlug(lane.slug);
    if (mode === "view_twin") {
      const stored =
        getCompletedResult<StoredPlayResult>(lane.slug) ||
        getCompletedResult<StoredPlayResult>(activeDropId);
      if (stored) {
        setSubmissionResult(stored);
        setStep("reveal");
        return;
      }
    }
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

      // Mode B async acceptance handling (Architecture Sec 6.1 & P5.10)
      if ((res as any).mode === "async" || ((res as any).status === "accepted" && !res.match)) {
        setPendingRequestId(requestId);
        clearDraft(activeDropId);
        setStep("pending_mode_b");
        return;
      }

      const processedResult: StoredPlayResult = {
        submission_id: res.submission_id ?? res.request_id ?? "",
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

  // 4.5. Mode B Pending Screen (S5.5 / R1.5)
  if (step === "pending_mode_b") {
    return (
      <WidgetErrorBoundary>
        <ModeBPendingScreen
          requestId={pendingRequestId || undefined}
          isPolling={isMatchPolling}
          onCheckStatus={pollMatchNow}
          onHome={() => setStep("lane_picker")}
        />
      </WidgetErrorBoundary>
    );
  }

  // 5. Twin Reveal Screen (S6)
  if (step === "reveal" && submissionResult) {
    return (
      <WidgetErrorBoundary>
        <OfflineBanner isOnline={isOnline} />
        {degradationLevel !== "L0" && (
          <div className="max-w-md mx-auto pt-2 px-4 flex justify-end">
            <FreshnessLabel isStale timestamp={Date.now()} />
          </div>
        )}
        <TwinRevealScreen
          match={submissionResult.match}
          lane={{
            name: currentLane.name_key,
            slug: currentLane.slug,
            accent: currentLane.accent_token,
          }}
          onSeeOddness={() => setStep("oddness")}
          onShare={() => {
            setShareFormat("story");
            setIsShareSheetOpen(true);
          }}
          onClose={() => setStep("lane_picker")}
        />
        <ShareSheet
          isOpen={isShareSheetOpen}
          onClose={() => setIsShareSheetOpen(false)}
          dropId={activeDropId}
          laneSlug={currentLane.slug}
          laneName={currentLane.name_key}
          laneAccent={currentLane.accent_token}
          defaultFormat={shareFormat}
        />
      </WidgetErrorBoundary>
    );
  }

  // 6. Oddness Screen (S7)
  if (step === "oddness" && submissionResult) {
    return (
      <WidgetErrorBoundary>
        <OfflineBanner isOnline={isOnline} />
        {degradationLevel !== "L0" && (
          <div className="max-w-md mx-auto pt-2 px-4 flex justify-end">
            <FreshnessLabel isStale timestamp={Date.now()} />
          </div>
        )}
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
          onHome={() => setStep("lane_picker")}
        />
        <ShareSheet
          isOpen={isShareSheetOpen}
          onClose={() => setIsShareSheetOpen(false)}
          dropId={activeDropId}
          laneSlug={currentLane.slug}
          laneName={currentLane.name_key}
          laneAccent={currentLane.accent_token}
          defaultFormat={shareFormat}
        />
      </WidgetErrorBoundary>
    );
  }

  // 7. S1 Landing Screen
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 relative select-none">
      <Atmosphere />
      <OfflineBanner isOnline={isOnline} />
      <DegradationBanner level={degradationLevel} />

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

      {/* Primary Lane Picker Screen (Decision D1: First screen after 18+ confirmation) */}
      <div className="relative z-20 w-full max-w-xl mx-auto my-auto py-2">
        <LanePicker
          selectedSlug={currentLane.slug}
          lastPlayedLaneSlug={lastPlayedLaneSlug}
          playedLanesToday={playedLanesToday}
          onSelectLane={handleSelectLane}
        />
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

      {/* First Run DPDP Privacy Consent Banner */}
      <FirstRunConsentBanner />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center font-display font-bold text-ink">
          Loading Oddly...
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
