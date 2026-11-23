"use client";

import React, { useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
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

// Dynamic component code-splitting for Richer Formats (P10M.07 bundle budget guard)
const Pick2Of6Card = dynamic(
  () => import("@/components/play/Pick2Of6Card").then((mod) => mod.Pick2Of6Card),
  { ssr: true }
);
const Rank3Card = dynamic(
  () => import("@/components/play/Rank3Card").then((mod) => mod.Rank3Card),
  { ssr: true }
);
const Slider7Card = dynamic(
  () => import("@/components/play/Slider7Card").then((mod) => mod.Slider7Card),
  { ssr: true }
);
const SceneCard = dynamic(
  () => import("@/components/play/SceneCard").then((mod) => mod.SceneCard),
  { ssr: true }
);
import { DynamicIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/Button";
import type { AnswerPayload } from "@oddly/shared";

const TEMPLATE_KEY_TO_ILLUSTRATION: Record<string, string> = {
  "snooze-battle": "weekend-nap",
  "overthinking-3am": "sky-starry",
  "chai-urgency": "path-chai",
  "battery-anxiety": "island-torch",
  "browser-tabs-clutter": "island-notebook",
  "midnight-refrigerator": "market-sweets",
  "indie-cinema-vibe": "weekend-cinema",
  "neon-street-cravings": "path-neon",
  "wifi-disconnection": "island-torch",
  "snack-indecision": "weekend-streetfood",
  "traffic-patience": "path-chai",
};

export interface QuestionData {
  id: string;
  order: number;
  type: string;
  format?: string;
  render_variant?: "standard" | "meme";
  template_key?: string;
  template_illustration_key?: string;
  tags?: string[];
  payload: {
    type?: string;
    format?: string;
    prompt: string;
    options?: Array<{ label: string; value: string; illustration_key?: string | null }>;
    items?: Array<{ label: string; value: string }>;
    left_label?: string;
    right_label?: string;
    mid_label?: string | null;
    cards?: Array<{ label: string; value: string; illustration_key?: string | null; caption?: string | null }>;
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

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative select-none bg-cream">
      <Atmosphere />

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
          className={`p-2.5 rounded-pill border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
            currentIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 5 Progress Dots */}
        <div className="flex items-center">
          <ProgressDots
            total={totalQuestions}
            current={currentIndex}
            onDotClick={(targetIdx) => {
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
          className="p-2.5 rounded-pill border-[2.5px] border-ink bg-paper text-ink shadow-sticker sticker-press cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </header>

      {/* Question Content Body */}
      <main className="relative z-20 w-full max-w-lg mx-auto my-auto flex flex-col items-center text-center space-y-4 py-2">
        {/* Type or Meme Badge */}
        {question.render_variant === "meme" ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-pill text-chip font-display font-bold uppercase tracking-wider bg-coral text-ink border-[1.5px] border-ink">
              Meme Pick
            </span>
            {question.tags && question.tags.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-caption font-display font-bold bg-lavender text-ink border-[1.5px] border-ink">
                #{question.tags[0].replace(/-/g, " ")}
              </span>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center px-3 py-1 rounded-pill text-chip font-display font-bold uppercase tracking-wider bg-lavender text-ink border-[1.5px] border-ink">
            {question.type === "text" && "Pick One"}
            {question.type === "number" && "Choose a Number"}
            {question.type === "colour" && "Pick a Colour"}
            {question.type === "image" && "Select an Image"}
            {question.type === "word" && "Select Words"}
          </div>
        )}

        {/* Meme Vector Template Sticker Frame */}
        {question.render_variant === "meme" && (
          <div className="w-full max-w-xs mx-auto p-3 bg-paper border-[2.5px] border-ink rounded-l shadow-sticker flex flex-col items-center justify-center">
            <DynamicIllustration
              assetKey={
                question.template_illustration_key ||
                (question.template_key ? TEMPLATE_KEY_TO_ILLUSTRATION[question.template_key] : undefined) ||
                "weekend-nap"
              }
              size={120}
              className="mx-auto"
            />
          </div>
        )}

        {/* Question Prompt - Section 3: Display-l clamp(26px, 7vw, 32px), Display 800 */}
        <h1
          data-testid="question-prompt"
          className="font-display text-display-l font-extrabold text-ink leading-tight max-w-md"
        >
          {question.payload.prompt}
        </h1>

        {/* Polymorphic Input Component */}
        <div className="w-full pt-1">
          {/* Rich Format 1: pick2of6 */}
          {(question.format === "pick2of6" ||
            question.type === "pick2of6" ||
            question.payload.format === "pick2of6") &&
            question.payload.options && (
              <Pick2Of6Card
                questionId={question.id}
                options={question.payload.options}
                selectedValue={
                  currentAnswer?.type === "pick2of6"
                    ? (currentAnswer.value as string[])
                    : []
                }
                onChange={(val) => {
                  onAnswer({
                    type: "pick2of6",
                    question_id: question.id,
                    value: val,
                  });
                }}
                onLockIn={(val) => {
                  const payload: AnswerPayload = {
                    type: "pick2of6",
                    question_id: question.id,
                    value: val,
                  };
                  scheduleAutoAdvance(payload);
                }}
              />
            )}

          {/* Rich Format 2: rank3 */}
          {(question.format === "rank3" ||
            question.type === "rank3" ||
            question.payload.format === "rank3") &&
            question.payload.items && (
              <Rank3Card
                questionId={question.id}
                items={question.payload.items}
                currentOrder={
                  currentAnswer?.type === "rank3"
                    ? (currentAnswer.value as string[])
                    : undefined
                }
                onChange={(val) => {
                  onAnswer({
                    type: "rank3",
                    question_id: question.id,
                    value: val,
                  });
                }}
                onLockIn={(val) => {
                  const payload: AnswerPayload = {
                    type: "rank3",
                    question_id: question.id,
                    value: val,
                  };
                  scheduleAutoAdvance(payload);
                }}
              />
            )}

          {/* Rich Format 3: slider7 */}
          {(question.format === "slider7" ||
            question.type === "slider7" ||
            question.payload.format === "slider7" ||
            Boolean(question.payload.left_label)) && (
            <Slider7Card
              questionId={question.id}
              leftLabel={question.payload.left_label || "Low"}
              rightLabel={question.payload.right_label || "High"}
              midLabel={question.payload.mid_label}
              value={
                currentAnswer?.type === "slider7" ? currentAnswer.value : 4
              }
              onChange={(val) => {
                onAnswer({
                  type: "slider7",
                  question_id: question.id,
                  value: val,
                });
              }}
              onLockIn={(val) => {
                const payload: AnswerPayload = {
                  type: "slider7",
                  question_id: question.id,
                  value: val,
                };
                scheduleAutoAdvance(payload);
              }}
            />
          )}

          {/* Rich Format 4: scene */}
          {(question.format === "scene" ||
            question.type === "scene" ||
            question.payload.format === "scene") &&
            question.payload.cards && (
              <SceneCard
                questionId={question.id}
                cards={question.payload.cards}
                selectedValue={
                  currentAnswer?.type === "scene" ? currentAnswer.value : undefined
                }
                onSelect={(val) => {
                  scheduleAutoAdvance({
                    type: "scene",
                    question_id: question.id,
                    value: val,
                  });
                }}
              />
            )}

          {/* 1. Text Question (Pick 1 of 2-4) */}
          {question.type === "text" &&
            question.format !== "pick2of6" &&
            question.format !== "rank3" &&
            question.payload.format !== "pick2of6" &&
            question.payload.format !== "rank3" &&
            question.payload.options && (
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

          {/* 2. Number Question (1 to 50 Grid) */}
          {question.type === "number" && (
            <div className="space-y-4 w-full">
              <NumberPicker
                value={
                  currentAnswer?.type === "number"
                    ? currentAnswer.value
                    : Math.round(((question.payload.min ?? 1) + (question.payload.max ?? 50)) / 2)
                }
                min={question.payload.min ?? 1}
                max={question.payload.max ?? 50}
                onChange={(val) => {
                  onAnswer({
                    type: "number",
                    question_id: question.id,
                    value: val,
                  });
                }}
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                aria-label="Confirm Number"
                onClick={() => {
                  const finalNum =
                    currentAnswer?.type === "number"
                      ? currentAnswer.value
                      : Math.round(((question.payload.min ?? 1) + (question.payload.max ?? 50)) / 2);
                  onAnswer({
                    type: "number",
                    question_id: question.id,
                    value: finalNum,
                  });
                  feedback.playSound("tick");
                  onNext();
                }}
              >
                Lock in number
              </Button>
            </div>
          )}

          {/* 3. Colour Question (12 Swatches) */}
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

          {/* 4. Image Question (2x2 Grid) */}
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

          {/* 5. Word Question (Wrap Chips) */}
          {question.type === "word" && question.payload.chips && (
            <div className="space-y-4 w-full">
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
                <div className="pt-2 flex justify-center w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
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
        <span className="text-caption font-bold text-muted">
          Press 1-4 for options • Esc to exit
        </span>
      </footer>
    </div>
  );
}
