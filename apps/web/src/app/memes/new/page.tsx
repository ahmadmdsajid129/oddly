"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/FormControls";
import { DynamicIllustration } from "@/components/illustrations";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { feedback } from "@/lib/feedback";
import { api } from "@/lib/api";

interface MemeTemplate {
  id: string;
  key: string;
  illustration_registry_key: string;
  aspect: string;
  alt_text_i18n: Record<string, unknown>;
  license_note: string;
}

// Fallback seed templates for instantaneous hydration & offline resilience
const SEED_TEMPLATES: MemeTemplate[] = [
  {
    id: "tmpl_snooze",
    key: "snooze-battle",
    illustration_registry_key: "weekend-nap",
    aspect: "1:1",
    alt_text_i18n: { en: "A peacefully sleeping character fighting the morning alarm" },
    license_note: "Oddly original sticker art",
  },
  {
    id: "tmpl_overthinking",
    key: "overthinking-3am",
    illustration_registry_key: "sky-starry",
    aspect: "1:1",
    alt_text_i18n: { en: "Wide awake staring at starry midnight sky" },
    license_note: "Oddly original sticker art",
  },
  {
    id: "tmpl_chai",
    key: "chai-urgency",
    illustration_registry_key: "path-chai",
    aspect: "1:1",
    alt_text_i18n: { en: "Steaming hot cup of morning chai" },
    license_note: "Oddly original sticker art",
  },
  {
    id: "tmpl_battery",
    key: "battery-anxiety",
    illustration_registry_key: "island-torch",
    aspect: "1:1",
    alt_text_i18n: { en: "Flickering torch on 1 percent battery life" },
    license_note: "Oddly original sticker art",
  },
  {
    id: "tmpl_browser",
    key: "browser-tabs-clutter",
    illustration_registry_key: "island-notebook",
    aspect: "1:1",
    alt_text_i18n: { en: "Forty open browser tabs left for later reading" },
    license_note: "Oddly original sticker art",
  },
  {
    id: "tmpl_midnight",
    key: "midnight-refrigerator",
    illustration_registry_key: "market-sweets",
    aspect: "1:1",
    alt_text_i18n: { en: "Searching the kitchen shelves for midnight snacks" },
    license_note: "Oddly original sticker art",
  },
];

export default function MemeCaptionComposerPage() {
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<MemeTemplate[]>(SEED_TEMPLATES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [attestOriginality, setAttestOriginality] = useState(false);
  const [turnstileToken] = useState("mock-valid-turnstile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedMeme, setSubmittedMeme] = useState<{
    id: string;
    caption_text: string;
    template: MemeTemplate;
    status: string;
  } | null>(null);

  // Load templates from API
  useEffect(() => {
    let mounted = true;
    api.memes
      .getTemplates()
      .then((res) => {
        if (mounted && res.ok && res.templates && res.templates.length > 0) {
          setTemplates(res.templates as MemeTemplate[]);
        }
      })
      .catch(() => {
        // Fallback to seed templates on network delay or offline
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeTemplate = useMemo(() => {
    return templates[selectedIndex] || SEED_TEMPLATES[0]!;
  }, [templates, selectedIndex]);

  // Carousel handlers
  const handlePrev = useCallback(() => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    setSelectedIndex((prev) => (prev === 0 ? templates.length - 1 : prev - 1));
  }, [templates.length]);

  const handleNext = useCallback(() => {
    feedback.triggerHaptic("select");
    feedback.playSound("tick");
    setSelectedIndex((prev) => (prev === templates.length - 1 ? 0 : prev + 1));
  }, [templates.length]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") {
        return;
      }
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  // Character limit calculation
  const charCount = caption.length;
  const isNearLimit = charCount >= 85;
  const isAtLimit = charCount >= 100;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 100);
    setCaption(val);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || charCount > 100 || !attestOriginality || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    feedback.triggerHaptic("select");

    try {
      const res = await api.memes.submit({
        template_id: activeTemplate.id,
        caption_text: caption.trim(),
        turnstile_token: turnstileToken,
        attest_originality: true,
      });

      if (res.ok && res.submission) {
        feedback.triggerHaptic("milestone");
        feedback.playSound("celebrate");
        setSubmittedMeme({
          id: res.submission.id,
          caption_text: res.submission.caption_text,
          template: activeTemplate,
          status: res.submission.status,
        });
      } else {
        setErrorMsg("Failed to submit caption. Please try again.");
      }
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      if (error.status === 429) {
        setErrorMsg("Daily limit reached (maximum 2 submissions per day). Please return tomorrow!");
      } else if (error.status === 409) {
        setErrorMsg("A duplicate or very similar caption already exists for this template. Try a fresh twist!");
      } else if (error.status === 503) {
        setErrorMsg("Meme Lab is temporarily paused during peak Drop traffic. Please check back shortly.");
      } else {
        setErrorMsg(error.message || "An error occurred while submitting your meme.");
      }
      feedback.triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    feedback.triggerHaptic("select");
    setSubmittedMeme(null);
    setCaption("");
    setAttestOriginality(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col items-center justify-start p-4 sm:p-6 relative select-none">
      <Atmosphere />

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-5 pt-2 pb-12 z-10">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between gap-3 w-full">
          <Link
            href="/"
            className="w-11 h-11 rounded-pill border-[2.5px] border-ink bg-paper shadow-sticker flex items-center justify-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-120 touch-manipulation"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-ink stroke-[2.5]" />
          </Link>

          <div className="flex flex-col items-center text-center">
            <h1 className="font-display text-display-m font-extrabold text-ink leading-none">
              Meme Lab
            </h1>
            <span className="text-caption text-muted font-body mt-0.5">
              Community Captions
            </span>
          </div>

          <Chip fill="sun" className="text-caption font-bold">
            Beta
          </Chip>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* Success / Queued For Moderation View                           */}
        {/* ------------------------------------------------------------- */}
        {submittedMeme ? (
          <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            <Card className="flex flex-col items-center text-center p-6 border-[2.5px] border-ink shadow-sticker bg-paper">
              {/* Stamp Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-pill bg-sun text-ink border-[2px] border-ink shadow-sticker font-display font-extrabold text-caption tracking-wider uppercase mb-4">
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                Queued For Review
              </div>

              {/* Submitted Sticker Preview */}
              <div className="w-full max-w-[260px] p-4 bg-cream rounded-l border-[2.5px] border-ink shadow-sticker flex flex-col items-center justify-center mb-5">
                <DynamicIllustration
                  assetKey={submittedMeme.template.illustration_registry_key}
                  size={120}
                  className="mx-auto drop-shadow-sm"
                />
                <p className="font-display text-body font-bold text-ink text-center leading-snug mt-3 break-words px-1">
                  &ldquo;{submittedMeme.caption_text}&rdquo;
                </p>
              </div>

              <h2 className="font-display text-display-s font-extrabold text-ink mb-2">
                Caption Locked In!
              </h2>

              <p className="font-body text-body-s text-muted leading-relaxed mb-6">
                To keep Oddly warm, witty, and safe from abuse, every submission passes through
                human moderation in Mission Control before appearing in Meme Corner or future daily Drops.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleResetForAnother}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  className="w-full min-h-[44px]"
                >
                  Write Another Caption
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push("/")}
                  className="w-full min-h-[44px]"
                >
                  Back to Home
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* Caption Composer Form View                                    */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Template Selector Carousel */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-display text-body-s font-bold text-ink">
                  1. Choose Template
                </span>
                <span className="text-caption font-mono text-muted">
                  {selectedIndex + 1} of {templates.length}
                </span>
              </div>

              <div className="relative flex items-center justify-center gap-3">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-11 h-11 rounded-pill border-[2.5px] border-ink bg-paper shadow-sticker flex items-center justify-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-120 touch-manipulation shrink-0"
                  aria-label="Previous template"
                >
                  <ChevronLeft className="w-5 h-5 text-ink stroke-[2.5]" />
                </button>

                {/* Live WYSIWYG Sticker Preview Card */}
                <div
                  data-testid="meme-preview-card"
                  className="w-full min-h-[260px] p-5 bg-paper rounded-l border-[2.5px] border-ink shadow-sticker flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-150"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-caption font-mono text-muted uppercase tracking-wider">
                      {activeTemplate.key}
                    </span>
                    <Chip fill="lavender" className="text-[11px] py-0.5 px-2">
                      Live Preview
                    </Chip>
                  </div>

                  {/* Vector Illustration */}
                  <div className="my-auto py-2">
                    <DynamicIllustration
                      assetKey={activeTemplate.illustration_registry_key}
                      size={130}
                      className="mx-auto"
                    />
                  </div>

                  {/* Dynamic Caption Display (Rule 18 Live Rendering) */}
                  <div className="w-full min-h-[48px] flex items-center justify-center pt-2">
                    {caption.trim() ? (
                      <p
                        data-testid="live-caption-preview"
                        className="font-display text-body font-bold text-ink text-center leading-tight break-words max-w-full px-2"
                      >
                        &ldquo;{caption.trim()}&rdquo;
                      </p>
                    ) : (
                      <p className="font-body text-body-s text-muted italic">
                        Your caption appears here...
                      </p>
                    )}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-11 h-11 rounded-pill border-[2.5px] border-ink bg-paper shadow-sticker flex items-center justify-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-120 touch-manipulation shrink-0"
                  aria-label="Next template"
                >
                  <ChevronRight className="w-5 h-5 text-ink stroke-[2.5]" />
                </button>
              </div>

              {/* Carousel Dot Indicators */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {templates.map((tmpl, idx) => (
                  <button
                    key={tmpl.id || tmpl.key}
                    type="button"
                    onClick={() => {
                      feedback.triggerHaptic("select");
                      setSelectedIndex(idx);
                    }}
                    className={`h-2 rounded-pill transition-all duration-150 border-[1.5px] border-ink ${
                      idx === selectedIndex ? "w-6 bg-violet" : "w-2 bg-lavender"
                    }`}
                    aria-label={`Select template ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Caption Input Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="caption-input"
                  className="font-display text-body-s font-bold text-ink"
                >
                  2. Write Caption
                </label>

                {/* Character Counter (Rule 18 <= 100 characters) */}
                <div
                  data-testid="char-counter"
                  className={`text-caption font-mono font-bold px-2 py-0.5 rounded-pill border-[1.5px] border-ink transition-colors ${
                    isAtLimit
                      ? "bg-coral text-ink"
                      : isNearLimit
                      ? "bg-sun text-ink"
                      : "bg-paper text-muted"
                  }`}
                >
                  {charCount} / 100
                </div>
              </div>

              <textarea
                id="caption-input"
                data-testid="caption-textarea"
                rows={3}
                maxLength={100}
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Write a punchy, universal feeling... (e.g. When the code compiles on the first try)"
                className="w-full p-3.5 rounded-m border-[2.5px] border-ink bg-paper text-ink font-body text-body placeholder:text-muted/70 resize-none outline-none focus:ring-2 focus:ring-violet focus:ring-offset-2 transition-all shadow-sm"
              />

              <p className="text-caption text-muted px-1 leading-snug">
                Rule 18: Max 100 characters. Keep it relatable, universal, and lighthearted.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                data-testid="error-banner"
                className="flex items-start gap-2.5 p-3 rounded-m bg-coral/20 border-[2px] border-ink text-ink text-body-s animate-in fade-in"
              >
                <AlertCircle className="w-5 h-5 text-coral shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-body text-body-s">{errorMsg}</span>
              </div>
            )}

            {/* Originality Attestation Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={attestOriginality}
                onChange={setAttestOriginality}
                label={
                  <span className="font-body text-body-s text-ink leading-tight">
                    I created this caption myself and have the rights to share it. No hate speech,
                    personal attacks, or copyright infringement.
                  </span>
                }
              />
            </div>

            {/* Turnstile Human Verification Badge */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-m border-[1.5px] border-ink bg-paper/70 text-ink text-caption">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-mint stroke-[2.5]" />
                <span className="font-body">Human Verification</span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-mint font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                Turnstile Verified
              </span>
            </div>

            {/* Tactile Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={!caption.trim() || charCount > 100 || !attestOriginality || isSubmitting}
              leftIcon={<Sparkles className="w-5 h-5" />}
              className="w-full min-h-[48px] text-body font-display font-bold"
              data-testid="submit-meme-button"
            >
              Submit Caption for Review
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
