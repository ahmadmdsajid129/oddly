"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { BrandMark, fireConfetti } from "@/components/icons";
import { QuestionScreen, QuestionData } from "@/components/play/QuestionScreen";
import { oddlyApi } from "@/lib/api";
import type { PublicShareResponse } from "@oddly/api-client";
import type { AnswerPayload } from "@oddly/shared";

interface ChallengeClientViewProps {
  shortId: string;
  isChallengeMode?: boolean;
}

export default function ChallengeClientView({
  shortId,
  isChallengeMode = false,
}: ChallengeClientViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<PublicShareResponse | null>(null);

  // Challenge game state
  const [inGame, setInGame] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<AnswerPayload[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchShare() {
      try {
        setLoading(true);
        const data = await oddlyApi.getShare(shortId);
        if (!cancelled && data.success) {
          setShareData(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          // If backend offline or mock mode, supply mock public share
          setShareData({
            success: true,
            shortId,
            dropId: "drop-mock",
            dropDate: new Date().toISOString(),
            sharerScore: 4,
            sharerTier: "Rare",
            sharerPercentile: 84,
            twinCity: "Berlin, Germany",
            answers: [
              { questionId: "q-1", value: "opt-a" },
              { questionId: "q-2", value: "opt-b" },
              { questionId: "q-3", value: 3 },
              { questionId: "q-4", value: ["jazz", "lofi"] },
              { questionId: "q-5", value: "opt-c" },
            ],
            questions: [
              {
                id: "q-1",
                type: "text",
                prompt: "A pizza that is always cold, or a soda that is always flat?",
                options: [
                  { label: "Always cold pizza", value: "opt-a" },
                  { label: "Always flat soda", value: "opt-b" },
                ],
              },
              {
                id: "q-2",
                type: "text",
                prompt: "Would you rather remember everything or be able to unsee anything?",
                options: [
                  { label: "Remember everything", value: "opt-a" },
                  { label: "Unsee anything", value: "opt-b" },
                ],
              },
              {
                id: "q-3",
                type: "scale",
                prompt: "How comfortable are you eating alone at a busy restaurant?",
              },
              {
                id: "q-4",
                type: "word",
                prompt: "Pick the music genres you listen to when you need to focus:",
              },
              {
                id: "q-5",
                type: "text",
                prompt: "Sunrise in the mountains or sunset by the ocean?",
                options: [
                  { label: "Sunrise in mountains", value: "opt-c" },
                  { label: "Sunset by ocean", value: "opt-d" },
                ],
              },
            ],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchShare();

    return () => {
      cancelled = true;
    };
  }, [shortId]);

  // Loading skeleton
  if (loading) {
    return (
      <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-4">
        <Atmosphere mode="searching" />
        <div className="w-12 h-12 border-4 border-violet border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-textMuted font-medium">Loading challenge...</p>
      </main>
    );
  }

  if (error || !shareData) {
    return (
      <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center">
        <Atmosphere mode="common" />
        <BrandMark size={40} className="mb-4" />
        <h1 className="text-2xl font-bold mb-2">Challenge Link Expired</h1>
        <p className="text-sm text-textMuted max-w-sm mb-6">
          This challenge link is no longer available. Play today&apos;s active drop to find your own stranger twin!
        </p>
        <Link href="/">
          <Button variant="primary">Play Today&apos;s Drop</Button>
        </Link>
      </main>
    );
  }

  // Convert raw questions into QuestionData format for QuestionScreen
  const formattedQuestions: QuestionData[] = shareData.questions.map((q, idx) => ({
    id: q.id,
    order: idx + 1,
    type: (q.type as any) || "text",
    payload: {
      type: (q.type as any) || "text",
      prompt: q.prompt,
      options: (q.options as any[]) || [
        { label: "Option A", value: "opt-a" },
        { label: "Option B", value: "opt-b" },
      ],
      min_label: "Not at all",
      max_label: "Extremely",
      chips: [
        { label: "Loyalty", value: "loyalty" },
        { label: "Humour", value: "humour" },
        { label: "Honesty", value: "honesty" },
      ],
    },
  }));

  // Handle answering during challenge
  const handleAnswer = (answer: AnswerPayload) => {
    const updated = [...userAnswers];
    updated[currentIndex] = answer;
    setUserAnswers(updated);

    if (currentIndex < formattedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Completed!
      setIsCompleted(true);
      setInGame(false);
      fireConfetti();
    }
  };

  // 1. In Game: Player is answering questions 1 to 5
  if (inGame && !isCompleted) {
    const currentQ = formattedQuestions[currentIndex];
    const existingAnswer = userAnswers[currentIndex];

    return (
      <QuestionScreen
        question={currentQ}
        totalQuestions={formattedQuestions.length}
        currentAnswer={existingAnswer}
        onAnswer={handleAnswer}
        onBack={() => {
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          else setInGame(false);
        }}
        onExit={() => setInGame(false)}
      />
    );
  }

  // 2. Completed: Side-by-Side Comparison Matrix (P6.07)
  if (isCompleted) {
    let matchesCount = 0;
    const comparisons = shareData.questions.map((q) => {
      const friendAns = shareData.answers.find((a) => a.questionId === q.id)?.value;
      const userAns = userAnswers.find((a) => a.question_id === q.id)?.value;

      const isMatch =
        JSON.stringify(friendAns) === JSON.stringify(userAns) && userAns !== undefined;
      if (isMatch) matchesCount++;

      return {
        id: q.id,
        prompt: q.prompt,
        friendAns: String(friendAns || "—"),
        userAns: String(userAns || "—"),
        isMatch,
      };
    });

    const syncPercentage = Math.round((matchesCount / shareData.questions.length) * 100);

    return (
      <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-between p-4 sm:p-6 pb-12">
        <Atmosphere mode={syncPercentage >= 60 ? "mythic" : "rare"} />

        {/* Header */}
        <header className="w-full max-w-md flex items-center justify-between pt-4 pb-6">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-lg tracking-tight">oddly challenge</span>
          </div>
          <Link href="/" className="text-xs text-textMuted hover:text-text">
            Play Daily Drop
          </Link>
        </header>

        {/* Sync Hero Result */}
        <div className="w-full max-w-md flex flex-col items-center text-center my-4 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-mint flex flex-col items-center justify-center shadow-lg shadow-mint/20 mb-4">
            <span className="text-3xl font-extrabold text-mint leading-none">
              {matchesCount}/{shareData.questions.length}
            </span>
            <span className="text-[10px] font-bold text-textMuted uppercase mt-1">SYNC</span>
          </div>

          <h1 className="text-2xl font-bold text-text mb-1">
            {syncPercentage >= 80
              ? "Uncanny Connection!"
              : syncPercentage >= 60
              ? "Solid Compatibility!"
              : "Complementary Opposites!"}
          </h1>
          <p className="text-sm text-textMuted max-w-xs">
            You and your friend made identical choices on {matchesCount} of {shareData.questions.length} questions ({syncPercentage}% sync).
          </p>
        </div>

        {/* Side-by-side comparison matrix */}
        <div className="w-full max-w-md flex flex-col gap-3 my-2">
          {comparisons.map((c, i) => (
            <Card
              key={c.id}
              className={`p-4 transition-all border ${
                c.isMatch
                  ? "border-mint/60 bg-mint/5 shadow-sm shadow-mint/10"
                  : "border-border/60 bg-surface"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-textMuted">Question {i + 1}</span>
                {c.isMatch ? (
                  <span className="text-mint flex items-center gap-1 font-bold">
                    ✓ Matched
                  </span>
                ) : (
                  <span className="text-textMuted">Different</span>
                )}
              </div>
              <p className="text-sm font-medium text-text mb-3">{c.prompt}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-surface-2/60 border border-border/40">
                  <span className="block text-[10px] font-medium text-textMuted uppercase mb-0.5">
                    Your Choice
                  </span>
                  <span className="font-semibold text-text truncate block">
                    {c.userAns}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${
                    c.isMatch
                      ? "bg-mint/10 border-mint/40 text-mint"
                      : "bg-surface-2/60 border-border/40 text-text"
                  }`}
                >
                  <span className="block text-[10px] font-medium text-textMuted uppercase mb-0.5">
                    Friend&apos;s Choice
                  </span>
                  <span className="font-semibold truncate block">
                    {c.friendAns}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA to find their own twin */}
        <div className="w-full max-w-md flex flex-col gap-3 pt-6">
          <Link href="/" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              Find My Stranger Twin Today
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCompleted(false);
              setInGame(true);
              setCurrentIndex(0);
              setUserAnswers([]);
            }}
          >
            Retake Challenge
          </Button>
        </div>
      </main>
    );
  }

  // 3. Welcome Screen: Teaser of friend's match + Accept Challenge CTA
  return (
    <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-between p-4 sm:p-6 pb-12">
      <Atmosphere mode="rare" />

      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between pt-4 pb-6">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-lg tracking-tight">oddly</span>
        </div>
        <Link href="/" className="text-xs text-textMuted hover:text-text">
          Daily Drop
        </Link>
      </header>

      {/* Hero Sharer Teaser Card */}
      <div className="w-full max-w-md flex flex-col items-center text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border text-xs font-semibold text-mint mb-6">
          ★ {shareData.sharerTier.toUpperCase()} TIER · {shareData.sharerPercentile}% ODD
        </div>

        <div className="w-28 h-28 rounded-full bg-surface border-4 border-mint flex flex-col items-center justify-center shadow-xl shadow-mint/25 mb-6 animate-pulse">
          <span className="text-4xl font-extrabold text-mint leading-none">
            {shareData.sharerScore}/5
          </span>
          <span className="text-[11px] font-bold text-textMuted uppercase mt-1">MATCH</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          Your friend matched a Stranger in {shareData.twinCity || "Berlin, Germany"}
        </h1>

        <p className="text-sm text-textMuted max-w-xs mb-8">
          Can you match their 5 daily choices? Answer the same questions to reveal your sync score.
        </p>

        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs text-base py-4 shadow-lg shadow-violet/25"
          onClick={() => {
            setInGame(true);
            setCurrentIndex(0);
            setUserAnswers([]);
          }}
        >
          Accept Challenge
        </Button>
      </div>

      {/* Footer reassurance */}
      <footer className="w-full max-w-md text-center text-xs text-textMuted pt-6">
        Zero spam · DPDP compliant · No account required
      </footer>
    </main>
  );
}
