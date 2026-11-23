"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { BrandMark } from "../icons";
import { oddlyApi } from "@/lib/api";
import { colors } from "@oddly/ui-tokens";
import type { ShareFormat, ShareTheme } from "@oddly/shared";

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dropId: string;
  laneSlug?: string;
  laneName?: string;
  laneAccent?: string;
  defaultFormat?: ShareFormat;
}

function getFallbackCardSvg(format: ShareFormat, laneName = "Everyday", laneAccent = "violet"): string {
  const bg = colors.cream;
  const surface = colors.paper;
  const border = colors.ink;
  const text = colors.ink;
  const muted = colors.muted;
  const violet = colors.violet;
  const sun = colors.sun;

  const w = format === "story" ? 1080 : format === "square" ? 1080 : 1200;
  const h = format === "story" ? 1920 : format === "square" ? 1080 : 630;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}"/>
    <rect x="${w / 2 - 360}" y="${h / 2 - 400}" width="720" height="800" rx="40" fill="${surface}" stroke="${border}" stroke-width="8"/>
    <!-- Lane Chip Indicator -->
    <rect x="${w / 2 - 320}" y="${h / 2 - 370}" width="180" height="44" rx="22" fill="${sun}" stroke="${border}" stroke-width="4"/>
    <text x="${w / 2 - 230}" y="${h / 2 - 340}" font-family="sans-serif" font-size="20" font-weight="bold" fill="${text}" text-anchor="middle">${laneName.toUpperCase()} LANE</text>
    <rect x="${w / 2 - 160}" y="${h / 2 - 340}" width="320" height="52" rx="26" fill="${sun}" stroke="${border}" stroke-width="4"/>
    <text x="${w / 2}" y="${h / 2 - 305}" font-family="sans-serif" font-size="24" font-weight="bold" fill="${text}" text-anchor="middle">★ RARE TIER · 84% ODD</text>
    <text x="${w / 2}" y="${h / 2 - 120}" font-family="sans-serif" font-size="120" font-weight="bold" fill="${text}" text-anchor="middle">4 of 5</text>
    <text x="${w / 2}" y="${h / 2 - 50}" font-family="sans-serif" font-size="28" font-weight="bold" fill="${muted}" text-anchor="middle">SHARED ANSWERS</text>
    <line x1="${w / 2 - 300}" y1="${h / 2 + 50}" x2="${w / 2 + 300}" y2="${h / 2 + 50}" stroke="${border}" stroke-width="4"/>
    <text x="${w / 2}" y="${h / 2 + 130}" font-family="sans-serif" font-size="34" font-weight="bold" fill="${text}" text-anchor="middle">Stranger in Berlin, Germany</text>
    <text x="${w / 2}" y="${h / 2 + 190}" font-family="sans-serif" font-size="24" fill="${muted}" text-anchor="middle">Only 0.4% of players matched you today</text>
    <text x="${w / 2}" y="${h - 80}" font-family="sans-serif" font-size="28" font-weight="bold" fill="${violet}" text-anchor="middle">oddly.app</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function ShareSheet({
  isOpen,
  onClose,
  dropId,
  laneSlug = "everyday",
  laneName = "Everyday",
  laneAccent = "violet",
  defaultFormat = "story",
}: ShareSheetProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<ShareFormat>(defaultFormat);
  const [shareMode, setShareMode] = useState<"front" | "both">("front");
  const [theme] = useState<ShareTheme>("light");
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
          return;
        }
      } catch {
        if (!isCancelled) {
          setCardUrl(getFallbackCardSvg(format, laneName, laneAccent));
          setShortId("daily");
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
  }, [isOpen, dropId, format, theme, laneName, laneAccent]);

  if (!isOpen) return null;

  const laneQuery = laneSlug && laneSlug !== "everyday" ? `&lane=${encodeURIComponent(laneSlug)}` : "";
  const challengeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${shortId || "daily"}?challenge=1${laneQuery}`
      : `https://oddly.app/c/${shortId || "daily"}?challenge=1${laneQuery}`;

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
            console.warn("Native file share fallback:", err);
          } else {
            setIsSharing(false);
            return;
          }
        }
      }

      if (!sharedWithFile) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
    >
      <div
        className="w-full sm:max-w-md bg-paper border-[2.5px] border-ink sm:rounded-l rounded-t-l shadow-card flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-240"
      >
        {/* Header with drag handle and close */}
        <div className="flex flex-col px-6 pt-4 pb-3 border-b-[1.5px] border-ink/20">
          <div className="w-10 h-1.5 bg-ink rounded-pill mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark size={24} />
              <h2 id="share-sheet-title" className="font-display text-display-m font-extrabold text-ink">
                Share your match
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close share sheet"
              className="w-11 h-11 flex items-center justify-center text-ink rounded-pill border-[2px] border-ink bg-paper hover:bg-cream transition-colors text-base font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Share Content Option: "Share front" (default) or "Share both" */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShareMode("front")}
              className={`flex-1 py-2 px-3 rounded-m border-[2px] border-ink font-display text-xs font-bold transition-all ${
                shareMode === "front"
                  ? "bg-violet text-paper shadow-sticker"
                  : "bg-paper text-ink hover:bg-cream"
              }`}
            >
              Share front (default)
            </button>
            <button
              type="button"
              onClick={() => setShareMode("both")}
              className={`flex-1 py-2 px-3 rounded-m border-[2px] border-ink font-display text-xs font-bold transition-all ${
                shareMode === "both"
                  ? "bg-violet text-paper shadow-sticker"
                  : "bg-paper text-ink hover:bg-cream"
              }`}
            >
              Share both (front + back)
            </button>
          </div>

          {/* Format Selector Tabs */}
          <div className="flex p-1 bg-cream rounded-m border-[2px] border-ink gap-1">
            {(["story", "square", "link"] as ShareFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex-1 py-2 text-xs font-display font-bold rounded-s capitalize transition-all ${
                  format === fmt
                    ? "bg-paper text-ink border-[1.5px] border-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {fmt === "story" ? "Story (9:16)" : fmt === "square" ? "Square (1:1)" : "Link (1.9:1)"}
              </button>
            ))}
          </div>

          {/* Card Preview Area */}
          <div className="relative w-full aspect-[4/5] bg-cream rounded-m border-[2px] border-ink flex items-center justify-center overflow-hidden p-2">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-violet border-t-transparent rounded-full animate-spin" />
                <span className="font-display text-xs font-bold text-muted">
                  Rendering Sticker Pop card...
                </span>
              </div>
            ) : cardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardUrl}
                alt="Oddly match share card preview"
                className="w-full h-full object-contain drop-shadow-md animate-in fade-in duration-200"
              />
            ) : (
              <div className="font-display text-sm font-bold text-muted text-center px-4">
                Failed to load card preview.
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleNativeShare}
              disabled={loading || isSharing}
            >
              {isSharing ? "Sharing..." : "Share card image"}
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
