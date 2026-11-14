"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BrandMark, fireConfetti } from "@/components/icons";
import { FlipCard } from "@/components/share/FlipCard";
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
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-violet border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-body font-display font-bold text-muted">Loading challenge...</p>
      </main>
    );
  }

  if (error || !shareData) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center mb-6">
          <BrandMark size={32} />
        </div>
        <h1 className="font-display text-display-l font-extrabold mb-2">Challenge Link Expired</h1>
        <p className="text-body text-muted max-w-sm mb-6 font-body">
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
        currentIndex={currentIndex}
        totalQuestions={formattedQuestions.length}
        currentAnswer={existingAnswer}
        answers={userAnswers}
        onAnswer={handleAnswer}
        onNext={() => {
          if (currentIndex < formattedQuestions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            setIsCompleted(true);
            setInGame(false);
            fireConfetti();
          }
        }}
        onBack={() => {
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          else setInGame(false);
        }}
        onExit={() => setInGame(false)}
        onJumpToIndex={(idx) => setCurrentIndex(idx)}
      />
    );
  }

  // 2. Completed: Side-by-Side Comparison Matrix
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
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-between p-4 sm:p-6 pb-12">
        {/* Header */}
        <header className="w-full max-w-md flex items-center justify-between pt-4 pb-6">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-display font-extrabold text-lg text-ink">oddly challenge</span>
          </div>
          <Link href="/" className="font-display text-xs font-bold text-violet hover:underline">
            Play Daily Drop
          </Link>
        </header>

        {/* Sync Hero Result */}
        <div className="w-full max-w-md flex flex-col items-center text-center my-4">
          <div className="w-24 h-24 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex flex-col items-center justify-center mb-4">
            <span className="font-display text-3xl font-extrabold text-ink leading-none">
              {matchesCount}/{shareData.questions.length}
            </span>
            <span className="font-display text-[11px] font-bold text-muted uppercase mt-1">SYNC</span>
          </div>

          <h1 className="font-display text-display-l font-extrabold text-ink mb-1">
            {syncPercentage >= 80
              ? "Uncanny Connection!"
              : syncPercentage >= 60
              ? "Solid Compatibility!"
              : "Complementary Opposites!"}
          </h1>
          <p className="font-body text-body-s text-muted max-w-xs">
            You and your friend made identical choices on {matchesCount} of {shareData.questions.length} questions ({syncPercentage}% sync).
          </p>
        </div>

        {/* Side-by-side comparison matrix */}
        <div className="w-full max-w-md flex flex-col gap-3 my-2">
          {comparisons.map((c, i) => (
            <div
              key={c.id}
              className={`p-4 rounded-m border-[2.5px] border-ink bg-paper shadow-sticker flex flex-col gap-2`}
            >
              <div className="flex items-center justify-between text-caption font-display font-bold">
                <span className="text-muted">Question {i + 1}</span>
                {c.isMatch ? (
                  <span className="px-2 py-0.5 rounded-pill bg-mint border border-ink text-ink font-bold">
                    ✓ Matched
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-pill bg-lavender border border-ink text-muted font-bold">
                    Different
                  </span>
                )}
              </div>
              <p className="font-display text-sm font-bold text-ink">{c.prompt}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-s bg-cream border-[1.5px] border-ink">
                  <span className="block text-[10px] font-bold text-muted uppercase mb-0.5 font-display">
                    Your Choice
                  </span>
                  <span className="font-display font-bold text-ink truncate block">
                    {c.userAns}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-s border-[1.5px] border-ink ${
                    c.isMatch ? "bg-sun/40" : "bg-cream"
                  }`}
                >
                  <span className="block text-[10px] font-bold text-muted uppercase mb-0.5 font-display">
                    Friend&apos;s Choice
                  </span>
                  <span className="font-display font-bold text-ink truncate block">
                    {c.friendAns}
                  </span>
                </div>
              </div>
            </div>
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
            variant="secondary"
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
    <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-between p-4 sm:p-6 pb-12">
      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between pt-4 pb-4">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-display font-extrabold text-lg text-ink">oddly</span>
        </div>
        <Link href="/" className="font-display text-xs font-bold text-violet hover:underline">
          Daily Drop
        </Link>
      </header>

      {/* Hero Sharer Teaser Card with 3D FlipCard (Auto-Flips on Arrival) */}
      <div className="w-full max-w-md flex flex-col items-center text-center my-auto space-y-4">
        <FlipCard
          matchedPicks={shareData.sharerScore}
          totalPicks={shareData.questions?.length || 5}
          tier={shareData.sharerTier}
          location={shareData.twinCity ? `Stranger in ${shareData.twinCity}` : "A Stranger nearby"}
          rarityText={`Only ${shareData.sharerPercentile}% of players matched this today`}
          autoFlip={true}
        />

        <div className="space-y-1 pt-2">
          <h1 className="font-display text-display-m font-extrabold text-ink tracking-tight">
            Can you beat their match?
          </h1>
          <p className="font-body text-body-s text-muted max-w-xs mx-auto">
            Answer the 5 daily questions to reveal how your picks compare with your friend.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs text-base py-4"
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
      <footer className="w-full max-w-md text-center text-caption font-display font-bold text-muted pt-6">
        Zero spam · DPDP compliant · No account required
      </footer>
    </main>
  );
}
