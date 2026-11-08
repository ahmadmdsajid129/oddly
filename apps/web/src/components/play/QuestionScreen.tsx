"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { ArrowLeft, X } from "lucide-react";
import { ProgressDots } from "@/components/ui/FeedbackPrimitives";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { feedback } from "@/lib/feedback";
import {
  AnswerTile,
  NumberPicker,
  ColourSwatchGrid,
  ImageTileGrid,
  WordChipsGrid,
} from "@/components/play/AnswerComponents";
import { Button } from "@/components/ui/Button";
import type { AnswerPayload } from "@oddly/shared";

export interface QuestionData {
  id: string;
  order: number;
  type: "text" | "number" | "colour" | "image" | "word";
  payload: {
    type: string;
    prompt: string;
    options?: Array<{ label: string; value: string }>;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    swatches?: Array<{ label: string; value: string; hex: string }>;
    illustrations?: Array<{ label: string; value: string; illustration_key: string }>;
    chips?: Array<{ label: string; value: string }>;
    max_selections?: number;
  };
}

interface QuestionScreenProps {
  question: QuestionData;
  currentIndex: number;
  totalQuestions: number;
  currentAnswer?: AnswerPayload;
  answers: AnswerPayload[];
  onAnswer: (answer: AnswerPayload) => void;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
  onJumpToIndex: (index: number) => void;
}

export function QuestionScreen({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  answers,
  onAnswer,
  onNext,
  onBack,
  onExit,
  onJumpToIndex,
}: QuestionScreenProps) {
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount or question change
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [question.id]);

  const scheduleAutoAdvance = useCallback(
    (ans: AnswerPayload) => {
      onAnswer(ans);
      feedback.playSound("tick");
      feedback.triggerHaptic("select");

      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }

      autoAdvanceTimerRef.current = setTimeout(() => {
        onNext();
      }, 350);
    },
    [onAnswer, onNext]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      // Numerical shortcuts for options 1-4
      if (["1", "2", "3", "4"].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (question.type === "text" && question.payload.options?.[optionIndex]) {
          const opt = question.payload.options[optionIndex];
          scheduleAutoAdvance({
            type: "text",
            question_id: question.id,
            value: opt.value,
          });
        } else if (question.type === "image" && question.payload.illustrations?.[optionIndex]) {
          const ill = question.payload.illustrations[optionIndex];
          scheduleAutoAdvance({
            type: "image",
            question_id: question.id,
            value: ill.value,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, onExit, scheduleAutoAdvance]);

  const atmosphereType = question.type;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none">
      <Atmosphere mode={atmosphereType} />

      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        Question {currentIndex + 1} of {totalQuestions}: {question.payload.prompt}
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-xl mx-auto pt-2 pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Previous question"
          className={`p-2.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer ${
            currentIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* 5 Progress Dots */}
        <div className="flex items-center">
          <ProgressDots
            total={totalQuestions}
            current={currentIndex + 1}
            onDotClick={(index1Based) => {
              const targetIdx = index1Based - 1;
              if (targetIdx <= answers.length) {
                onJumpToIndex(targetIdx);
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={onExit}
          aria-label="Exit drop"
          className="p-2.5 rounded-full border border-border bg-surface text-text hover:bg-surface-2 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Question Content Body */}
      <main className="relative z-20 w-full max-w-lg mx-auto my-auto flex flex-col items-center text-center space-y-6 py-4">
        {/* Type Badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-heading font-semibold uppercase tracking-wider bg-violet/10 text-violet border border-violet/20">
          {question.type === "text" && "Pick One"}
          {question.type === "number" && "Choose a Number"}
          {question.type === "colour" && "Pick a Colour"}
          {question.type === "image" && "Select an Image"}
          {question.type === "word" && "Select Three Words"}
        </div>

        {/* Question Prompt */}
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text leading-tight max-w-md">
          {question.payload.prompt}
        </h1>

        {/* Polymorphic Input Component */}
        <div className="w-full pt-2">
          {/* 1. Text Question */}
          {question.type === "text" && question.payload.options && (
            <div className="flex flex-col gap-3 w-full">
              {question.payload.options.map((opt) => (
                <AnswerTile
                  key={opt.value}
                  option={{ id: opt.value, text: opt.label }}
                  selected={
                    currentAnswer?.type === "text" &&
                    currentAnswer.value === opt.value
                  }
                  onSelect={(id) => {
                    scheduleAutoAdvance({
                      type: "text",
                      question_id: question.id,
                      value: id,
                    });
                  }}
                />
              ))}
            </div>
          )}

          {/* 2. Number Question */}
          {question.type === "number" && (
            <NumberPicker
              value={
                currentAnswer?.type === "number"
                  ? currentAnswer.value
                  : Math.round(((question.payload.min ?? 1) + (question.payload.max ?? 100)) / 2)
              }
              min={question.payload.min ?? 1}
              max={question.payload.max ?? 100}
              onChange={(val) => {
                onAnswer({
                  type: "number",
                  question_id: question.id,
                  value: val,
                });
              }}
              onConfirm={() => {
                feedback.playSound("tick");
                onNext();
              }}
            />
          )}

          {/* 3. Colour Question */}
          {question.type === "colour" && (
            <ColourSwatchGrid
              selectedHex={
                currentAnswer?.type === "colour" ? currentAnswer.value : undefined
              }
              onSelect={(swatch) => {
                scheduleAutoAdvance({
                  type: "colour",
                  question_id: question.id,
                  value: swatch.hex,
                });
              }}
            />
          )}

          {/* 4. Image Question */}
          {question.type === "image" && question.payload.illustrations && (
            <ImageTileGrid
              options={question.payload.illustrations.map((ill) => ({
                id: ill.value,
                caption: ill.label,
                assetKey: ill.illustration_key,
              }))}
              selectedId={
                currentAnswer?.type === "image" ? currentAnswer.value : undefined
              }
              onSelect={(id) => {
                scheduleAutoAdvance({
                  type: "image",
                  question_id: question.id,
                  value: id,
                });
              }}
            />
          )}

          {/* 5. Word Question */}
          {question.type === "word" && question.payload.chips && (
            <div className="space-y-4">
              <WordChipsGrid
                words={question.payload.chips.map((c) => c.label)}
                selectedWord={
                  currentAnswer?.type === "word" ? currentAnswer.value[0] : undefined
                }
                onSelect={(wordLabel) => {
                  const chip = question.payload.chips?.find((c) => c.label === wordLabel);
                  const val = chip ? chip.value : wordLabel;
                  const currentWords =
                    currentAnswer?.type === "word" ? currentAnswer.value : [];
                  
                  let nextWords: string[];
                  if (currentWords.includes(val)) {
                    nextWords = currentWords.filter((w) => w !== val);
                  } else {
                    const maxAllowed = question.payload.max_selections ?? 3;
                    if (currentWords.length >= maxAllowed) {
                      nextWords = [...currentWords.slice(1), val];
                    } else {
                      nextWords = [...currentWords, val];
                    }
                  }

                  const updatedPayload: AnswerPayload = {
                    type: "word",
                    question_id: question.id,
                    value: nextWords,
                  };
                  onAnswer(updatedPayload);

                  if (nextWords.length === (question.payload.max_selections ?? 3)) {
                    scheduleAutoAdvance(updatedPayload);
                  }
                }}
              />

              {currentAnswer?.type === "word" && currentAnswer.value.length > 0 && (
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full max-w-xs"
                    onClick={() => {
                      feedback.playSound("tick");
                      onNext();
                    }}
                  >
                    Confirm Picks ({currentAnswer.value.length}/{question.payload.max_selections ?? 3})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Subtle keyboard hint on desktop */}
      <footer className="relative z-20 text-center pb-2 hidden sm:block">
        <span className="text-[11px] text-text-muted">
          Press 1-4 for options • Esc to exit
        </span>
      </footer>
    </div>
  );
}
