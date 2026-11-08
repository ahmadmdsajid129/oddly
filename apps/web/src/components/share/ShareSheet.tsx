"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { BrandMark } from "../icons";
import { oddlyApi } from "@/lib/api";
import type { ShareFormat, ShareTheme } from "@oddly/shared";

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dropId: string;
  defaultFormat?: ShareFormat;
}

export function ShareSheet({
  isOpen,
  onClose,
  dropId,
  defaultFormat = "story",
}: ShareSheetProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<ShareFormat>(defaultFormat);
  const [theme, setTheme] = useState<ShareTheme>("dark");
  const [loading, setLoading] = useState(true);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [shortId, setShortId] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!isOpen || !dropId) return;

    let isCancelled = false;
    setLoading(true);

    async function loadCard() {
      try {
        const response = await oddlyApi.getCard(dropId, format, theme);
        if (!isCancelled && response.success) {
          setCardUrl(response.cardUrl);
          setShortId(response.shortId);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load share card:", err);
          toast("Could not load share card. Please retry.", "error");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadCard();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, dropId, format, theme, toast]);

  if (!isOpen) return null;

  const challengeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/c/${shortId || "daily"}?challenge=1`
    : `https://oddly.app/c/${shortId || "daily"}?challenge=1`;

  const handleCopyChallengeLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(challengeUrl);
        toast("Challenge link copied to clipboard!", "success");
      } else {
        toast(challengeUrl, "info");
      }
    } catch {
      toast("Failed to copy link. Please copy manually.", "error");
    }
  };

  const handleNativeShare = async () => {
    if (!cardUrl) return;
    setIsSharing(true);

    try {
      // Attempt Web Share API with image file if possible
      let sharedWithFile = false;
      if (navigator.share) {
        try {
          const res = await fetch(cardUrl);
          const blob = await res.blob();
          const file = new File([blob], `oddly-match-${format}.png`, {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "Oddly — Beat my stranger twin match!",
              text: "I found my stranger twin on Oddly today. Can you beat my match?",
              url: challengeUrl,
              files: [file],
            });
            sharedWithFile = true;
          } else {
            await navigator.share({
              title: "Oddly — Beat my stranger twin match!",
              text: "I found my stranger twin on Oddly today. Can you beat my match?",
              url: challengeUrl,
            });
            sharedWithFile = true;
          }
        } catch (err: any) {
          if (err.name !== "AbortError") {
            // Non-user cancellation error, fall back to download
            console.warn("Native file share fallback:", err);
          } else {
            setIsSharing(false);
            return;
          }
        }
      }

      if (!sharedWithFile) {
        // Desktop / Unsupported browser fallback: Download image + copy link
        const link = document.createElement("a");
        link.href = cardUrl;
        link.download = `oddly-match-${format}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await handleCopyChallengeLink();
        toast("Card downloaded! Link copied to clipboard.", "success");
      }
    } catch (err) {
      console.error("Share error:", err);
      toast("Sharing failed. You can copy the challenge link below.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-midnight/80 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
    >
      <div
        className="w-full sm:max-w-md bg-surface border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Header with drag handle and close */}
        <div className="flex flex-col px-6 pt-4 pb-2 border-b border-border/40">
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark size={24} />
              <h2 id="share-sheet-title" className="text-xl font-bold text-text">
                Share your match
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close share sheet"
              className="p-2 text-textMuted hover:text-text rounded-full hover:bg-surface-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Format Selector Tabs */}
          <div className="flex p-1 bg-surface-2 rounded-xl border border-border/60">
            {(["story", "square", "link"] as ShareFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
                  format === fmt
                    ? "bg-violet text-white shadow-sm"
                    : "text-textMuted hover:text-text"
                }`}
              >
                {fmt === "story" ? "Story (9:16)" : fmt === "square" ? "Square (1:1)" : "Link (1.9:1)"}
              </button>
            ))}
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-between text-xs text-textMuted px-1">
            <span>Card Theme:</span>
            <div className="flex gap-2">
              {(["dark", "light", "mythic"] as ShareTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-all ${
                    theme === t
                      ? "border-mint text-mint bg-mint/10"
                      : "border-border text-textMuted hover:text-text"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Card Preview Area */}
          <div className="relative w-full aspect-[4/5] bg-surface-2 rounded-2xl border border-border flex items-center justify-center overflow-hidden shadow-inner">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-violet border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-textMuted font-medium">
                  Rendering high-res card...
                </span>
              </div>
            ) : cardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardUrl}
                alt="Oddly match share card preview"
                className="w-full h-full object-contain p-2 animate-in fade-in duration-300"
              />
            ) : (
              <div className="text-sm text-textMuted text-center px-4">
                Failed to load card preview.
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleNativeShare}
              disabled={loading || isSharing}
            >
              {isSharing ? "Sharing..." : "Share via..."}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleCopyChallengeLink}
            >
              Copy challenge link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
