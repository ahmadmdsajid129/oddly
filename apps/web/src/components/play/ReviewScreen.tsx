"use client";

import React from "react";
import { ArrowLeft, Sparkles, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Atmosphere } from "@/components/ui/Atmosphere";
import type { AnswerPayload } from "@oddly/shared";
import type { QuestionData } from "./QuestionScreen";

interface ReviewScreenProps {
  questions: QuestionData[];
  answers: AnswerPayload[];
  isSubmitting: boolean;
  isOnline: boolean;
  onJumpToQuestion: (index: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function ReviewScreen({
  questions,
  answers,
  isSubmitting,
  isOnline,
  onJumpToQuestion,
  onSubmit,
  onBack,
}: ReviewScreenProps) {
  const getAnswerDisplay = (q: QuestionData, ans?: AnswerPayload) => {
    if (!ans) return <span className="text-muted italic">Unanswered</span>;

    if (ans.type === "text") {
      const opt = q.payload.options?.find((o) => o.value === ans.value);
      return <span className="font-bold text-ink">{opt ? opt.label : ans.value}</span>;
    }

    if (ans.type === "number") {
      return (
        <span className="font-extrabold text-ink font-display text-lg tabular-nums">
          {ans.value} {q.payload.unit ?? ""}
        </span>
      );
    }

    if (ans.type === "colour") {
      const swatch = q.payload.swatches?.find((s) => s.hex === ans.value);
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-pill border-[1.5px] border-ink shadow-sm shrink-0"
            style={{ backgroundColor: ans.value }}
          />
          <span className="font-bold text-ink">{swatch?.label ?? ans.value}</span>
        </div>
      );
    }

    if (ans.type === "image") {
      const ill = q.payload.illustrations?.find((i) => i.value === ans.value);
      return <span className="font-bold text-ink">{ill ? ill.label : ans.value}</span>;
    }

    if (ans.type === "word") {
      return (
        <div className="flex flex-wrap gap-1.5 justify-end">
          {ans.value.map((val) => {
            const chip = q.payload.chips?.find((c) => c.value === val);
            return (
              <span
                key={val}
                className="px-2 py-0.5 rounded-pill bg-lavender border-[1.5px] border-ink text-xs font-bold font-display text-ink"
              >
                {chip ? chip.label : val}
              </span>
            );
          })}
        </div>
      );
    }

    if (ans.type === "pick2of6") {
      const vals = Array.isArray(ans.value) ? ans.value : [];
      return (
        <div className="flex flex-wrap gap-1.5 justify-end">
          {vals.map((v) => {
            const opt = q.payload.options?.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="px-2 py-0.5 rounded-pill bg-sun border-[1.5px] border-ink text-xs font-bold font-display text-ink"
              >
                {opt ? opt.label : v}
              </span>
            );
          })}
        </div>
      );
    }

    if (ans.type === "rank3") {
      const vals = Array.isArray(ans.value) ? ans.value : [];
      return (
        <span className="font-bold text-xs text-ink">
          {vals
            .map((v, i) => {
              const it = q.payload.items?.find((item) => item.value === v);
              return `${i + 1}. ${it ? it.label : v}`;
            })
            .join(" → ")}
        </span>
      );
    }

    if (ans.type === "slider7") {
      return (
        <span className="px-2.5 py-0.5 rounded-pill bg-paper border-[1.5px] border-ink text-xs font-bold font-display text-ink">
          {ans.value === 1
            ? q.payload.left_label || "Left"
            : ans.value === 7
            ? q.payload.right_label || "Right"
            : ans.value === 4 && q.payload.mid_label
            ? q.payload.mid_label
            : `Point ${ans.value} of 7`}
        </span>
      );
    }

    if (ans.type === "scene") {
      const card = q.payload.cards?.find((c) => c.value === ans.value);
      return <span className="font-bold text-ink">{card ? card.label : ans.value}</span>;
    }

    return null;
  };

  const allAnswered = answers.length === questions.length;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none bg-cream">
      <Atmosphere />

      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to questions"
          className="p-2.5 rounded-pill border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <span className="font-display text-chip font-bold tracking-wider uppercase text-muted">
          Final Review
        </span>

        <div className="w-11" />
      </header>

      {/* Main Review Content */}
      <main className="relative z-20 w-full max-w-lg mx-auto my-auto space-y-6 py-4">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
            Review your five picks
          </h1>
          <p className="text-body-s font-body text-muted">
            Make sure you are satisfied before we lock your picks and find your twin.
          </p>
        </div>

        {/* 5 Pick Cards */}
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const ans = answers.find((a) => a.question_id === q.id);
            return (
              <div
                key={q.id}
                className="p-4 rounded-m bg-paper border-[2.5px] border-ink shadow-sticker sticker-press flex items-center justify-between gap-4 cursor-pointer"
                onClick={() => onJumpToQuestion(idx)}
              >
                <div className="flex flex-col text-left space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-violet">
                      Pick {idx + 1}
                    </span>
                  </div>
                  <span className="text-xs font-body text-muted truncate max-w-[220px] sm:max-w-[280px]">
                    {q.payload.prompt}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-sm">
                    {getAnswerDisplay(q, ans)}
                  </div>
                  <div className="text-ink">
                    <Edit3 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit CTA */}
        <div className="pt-4 space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!allAnswered || !isOnline || isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? (
              <span>Matching with your stranger twin...</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Find my stranger twin</span>
              </>
            )}
          </Button>

          {!isOnline && (
            <p className="text-xs text-center text-coral font-bold font-display" role="alert">
              You are offline. Connect to the internet to find your twin.
            </p>
          )}
        </div>
      </main>

      <footer className="relative z-20 text-center pb-2 text-caption text-muted">
        Once submitted, picks are sealed for today&apos;s drop.
      </footer>
    </div>
  );
}
