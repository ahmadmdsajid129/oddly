"use client";

import React from "react";
import { ArrowLeft, Sparkles, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    if (!ans) return <span className="text-text-muted italic">Unanswered</span>;

    if (ans.type === "text") {
      const opt = q.payload.options?.find((o) => o.value === ans.value);
      return <span className="font-semibold text-text">{opt ? opt.label : ans.value}</span>;
    }

    if (ans.type === "number") {
      return (
        <span className="font-semibold text-text font-heading text-lg">
          {ans.value} {q.payload.unit ?? ""}
        </span>
      );
    }

    if (ans.type === "colour") {
      const swatch = q.payload.swatches?.find((s) => s.hex === ans.value);
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border border-border/80 shadow-sm shrink-0"
            style={{ backgroundColor: ans.value }}
          />
          <span className="font-semibold text-text">{swatch?.label ?? ans.value}</span>
        </div>
      );
    }

    if (ans.type === "image") {
      const ill = q.payload.illustrations?.find((i) => i.value === ans.value);
      return <span className="font-semibold text-text">{ill ? ill.label : ans.value}</span>;
    }

    if (ans.type === "word") {
      return (
        <div className="flex flex-wrap gap-1.5 justify-end">
          {ans.value.map((val) => {
            const chip = q.payload.chips?.find((c) => c.value === val);
            return (
              <span
                key={val}
                className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-xs font-medium text-text"
              >
                {chip ? chip.label : val}
              </span>
            );
          })}
        </div>
      );
    }

    return null;
  };

  const allAnswered = answers.length === questions.length;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none">
      <Atmosphere />

      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to questions"
          className="p-2.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-heading text-sm font-semibold tracking-wider uppercase text-text-muted">
          Final Review
        </span>

        <div className="w-10" />
      </header>

      {/* Main Review Content */}
      <main className="relative z-20 w-full max-w-lg mx-auto my-auto space-y-6 py-4">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text">
            Review your five picks
          </h1>
          <p className="text-sm text-text-secondary">
            Make sure you are satisfied before we lock your picks and find your twin.
          </p>
        </div>

        {/* 5 Pick Cards */}
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const ans = answers.find((a) => a.question_id === q.id);
            return (
              <Card
                key={q.id}
                variant="default"
                className="p-4 flex items-center justify-between gap-4 hover:border-violet/40 transition-all cursor-pointer group"
                onClick={() => onJumpToQuestion(idx)}
              >
                <div className="flex flex-col text-left space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-violet">
                      Pick {idx + 1}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted truncate max-w-[220px] sm:max-w-[280px]">
                    {q.payload.prompt}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-sm">
                    {getAnswerDisplay(q, ans)}
                  </div>
                  <div className="text-text-muted group-hover:text-violet transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Submit CTA */}
        <div className="pt-4 space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-base font-bold shadow-lg"
            disabled={!allAnswered || !isOnline || isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? (
              <span>Matching with your stranger twin...</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-midnight" />
                <span>Find my stranger twin</span>
              </>
            )}
          </Button>

          {!isOnline && (
            <p className="text-xs text-center text-amber font-medium">
              You are offline. Connect to the internet to find your twin.
            </p>
          )}
        </div>
      </main>

      <footer className="relative z-20 text-center pb-2 text-[11px] text-text-muted">
        Once submitted, picks are sealed for today&apos;s drop.
      </footer>
    </div>
  );
}
