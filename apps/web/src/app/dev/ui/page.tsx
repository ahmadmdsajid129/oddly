"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { OptionRow } from "@/components/ui/OptionRow";
import { colors } from "@oddly/ui-tokens";
import { Chip, TierBadge } from "@/components/ui/Card";
import { Input, Checkbox, Toggle } from "@/components/ui/FormControls";
import { ProgressDots, Skeleton } from "@/components/ui/FeedbackPrimitives";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/Toast";
import { FlipCard } from "@/components/share/FlipCard";
import { BrandMark } from "@/components/icons";
import {
  NumberPicker,
  ColourSwatchGrid,
  ImageTileGrid,
  WordChipsGrid,
} from "@/components/play/AnswerComponents";
import { SearchMapAnimation } from "@/components/play/SearchMapAnimation";
import { Check, Flame, Sparkles, Orbit, Compass, UserCheck, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import { DegradationBanner, DegradationLevel } from "@/components/ui/DegradationBanner";
import { FreshnessLabel, RateLimitScreen, ServiceOverloadScreen } from "@/components/ui/OverloadScreens";
import { AntiFlickerSkeleton, WidgetErrorBoundary } from "@/components/ui/ResiliencePrimitives";
import { ModeBPendingScreen } from "@/components/ui/ModeBPendingScreen";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function DevUiGallery() {
  const { toast } = useToast();

  // State for interactive gallery controls
  const [selectedOption, setSelectedOption] = useState<string>("opt-2");
  const [pickedNumber, setPickedNumber] = useState<number>(27);
  const [selectedColor, setSelectedColor] = useState<string>(colors.mint);
  const [selectedImage, setSelectedImage] = useState<string>("img-1");
  const [selectedWord, setSelectedWord] = useState<string>("Cozy");
  const [activeProgress, setActiveProgress] = useState<number>(3);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [checkboxVal, setCheckboxVal] = useState<boolean>(true);
  const [toggleVal, setToggleVal] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>("Stranger from Earth");
  const [demoDegradationLevel, setDemoDegradationLevel] = useState<DegradationLevel>("L2");
  const [antiFlickerLoading, setAntiFlickerLoading] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-cream text-ink p-6 sm:p-10 max-w-5xl mx-auto space-y-12 select-none">
      {/* Header */}
      <header className="border-b-[2.5px] border-ink pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-pill bg-paper border-[2.5px] border-ink shadow-sticker flex items-center justify-center">
            <BrandMark size={28} />
          </div>
          <div>
            <h1 className="font-display text-display-l font-extrabold text-ink">
              /dev/ui — Sticker Pop Design Gallery
            </h1>
            <p className="font-body text-body-s text-muted">
              Oddly v1 single source of truth component showcase &amp; visual regression baseline
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-paper border-[2px] border-ink font-display text-xs font-bold shadow-xs">
          <span className="w-2.5 h-2.5 rounded-pill bg-mint inline-block border border-ink" />
          <span>Cream Desk (v1.0)</span>
        </div>
      </header>

      {/* Section 1: Buttons */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          1. Buttons (Section 5)
        </h2>
        <p className="font-body text-caption text-muted">
          All buttons have 2.5px ink outlines, 4px hard offset shadow, hover lift (-2px), and 120ms press-flat translate. Min 44x44px.
        </p>

        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary (Violet)</Button>
            <Button variant="secondary">Secondary (Paper)</Button>
            <Button variant="tertiary">Tertiary (Ghost)</Button>
            <Button variant="danger">Danger (Error)</Button>
            <Button variant="success">Success (Mint)</Button>
            <Button variant="primary" isLoading>Loading State</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </div>
      </section>

      {/* Section 2: Option Rows (The Core Game Control) */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          2. Option Rows (Section 6)
        </h2>
        <p className="font-body text-caption text-muted">
          Full-width sticker rows. Rest = paper; Selected = sun fill + ink check icon.
        </p>

        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
          <OptionRow
            label="Option 1 (Rest state)"
            selected={selectedOption === "opt-1"}
            onClick={() => setSelectedOption("opt-1")}
          />
          <OptionRow
            label="Option 2 (Selected state — Sun fill + Check icon)"
            selected={selectedOption === "opt-2"}
            onClick={() => setSelectedOption("opt-2")}
          />
          <OptionRow
            label="Option 3 (Rest state)"
            selected={selectedOption === "opt-3"}
            onClick={() => setSelectedOption("opt-3")}
          />
          <OptionRow
            label="Option 4 (Locked in / Other faded)"
            selected={false}
            disabled={true}
            onClick={() => {}}
          />
        </div>
      </section>

      {/* Section 3: Question Types UI */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          3. Question Input Types (Section 6)
        </h2>

        {/* 5x10 Number Grid */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4">
          <h3 className="font-display text-base font-extrabold text-ink">
            Type 2: 5x10 Number Grid (1 to 50 Square Stickers)
          </h3>
          <p className="font-body text-caption text-muted">
            Replaced thumb slider to guarantee minimum hit areas and tactile sticker selection. Current: {pickedNumber}
          </p>
          <NumberPicker
            value={pickedNumber}
            onChange={(val: number) => setPickedNumber(val)}
          />
        </div>

        {/* 4x3 Colour Swatches */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4">
          <h3 className="font-display text-base font-extrabold text-ink">
            Type 3: 4x3 Colour Swatch Grid (12 Brand Swatches)
          </h3>
          <ColourSwatchGrid
            selectedHex={selectedColor}
            onSelect={(swatch) => setSelectedColor(swatch.hex)}
          />
        </div>

        {/* 2x2 Image Grid */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4">
          <h3 className="font-display text-base font-extrabold text-ink">
            Type 4: 2x2 Image Tile Grid
          </h3>
          <ImageTileGrid
            selectedId={selectedImage}
            onSelect={(id: string) => setSelectedImage(id)}
            options={[
              { id: "img-1", assetKey: "door-midnight", caption: "Cozy Study" },
              { id: "img-2", assetKey: "door-forest", caption: "Open Sea" },
              { id: "img-3", assetKey: "door-cyberpunk", caption: "Neon Alley" },
              { id: "img-4", assetKey: "door-warmth", caption: "Forest Path" },
            ]}
          />
        </div>

        {/* Word Chips */}
        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4">
          <h3 className="font-display text-base font-extrabold text-ink">
            Type 5: Word Chips
          </h3>
          <WordChipsGrid
            selectedWord={selectedWord}
            onSelect={(w: string) => setSelectedWord(w)}
            words={["Cozy", "Quiet", "Wander", "Spark", "Stillness", "Kinship"]}
          />
        </div>
      </section>

      {/* Section 4: Flip Card (Hero Reveal Centerpiece) */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          4. 3D Flip Share Card (Hero Component — Section 11)
        </h2>
        <p className="font-body text-caption text-muted">
          Arrives sealed face-down, auto-flips after 550ms to front (hero score, tier chip, holographic sheen), tap/Enter flips to back for 5-pick overlap details.
        </p>

        <div className="p-8 rounded-l bg-cream border-[2.5px] border-ink shadow-sticker flex flex-col items-center justify-center">
          <FlipCard
            matchedPicks={4}
            totalPicks={5}
            tier="Rare"
            location="Stranger in Berlin, Germany"
            rarityText="Only 0.4% of players matched you today"
            autoFlip={false}
          />
        </div>
      </section>

      {/* Section 5: Chips & Badges */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          5. Chips &amp; Tier Badges (Sections 2.3 &amp; 7)
        </h2>

        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker flex flex-wrap items-center gap-3">
          <TierBadge tier="Common" />
          <TierBadge tier="Uncommon" />
          <TierBadge tier="Rare" />
          <TierBadge tier="Mythic" />
          <Chip fill="coral">
            <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>7-Day Streak</span>
          </Chip>
          <Chip fill="mint">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Matched</span>
          </Chip>
          <Chip fill="lavender">Question 1</Chip>
        </div>
      </section>

      {/* Section 6: Form Controls */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          6. Form Controls &amp; Focus Visible (Section 7)
        </h2>

        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-4 max-w-md">
          <Input
            label="Display Name / Handle"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />

          <Checkbox
            label="I confirm I am 18 years of age or older"
            checked={checkboxVal}
            onChange={(c: boolean) => setCheckboxVal(c)}
          />

          <Toggle
            label="Push notification for daily 07:00 IST drop"
            checked={toggleVal}
            onCheckedChange={(val: boolean) => setToggleVal(val)}
          />
        </div>
      </section>

      {/* Section 7: Feedback Primitives */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          7. Feedback Primitives (ProgressDots, Skeletons, BottomSheet, Toast)
        </h2>

        <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-6">
          <div className="space-y-2">
            <div className="font-display text-xs font-bold text-muted uppercase">ProgressDots:</div>
            <ProgressDots total={5} current={activeProgress} />
            <div className="flex gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <Button
                  key={step}
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveProgress(step)}
                >
                  Step {step}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t-[1.5px] border-ink/20">
            <div className="font-display text-xs font-bold text-muted uppercase">Skeleton (Opacity Pulse):</div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t-[1.5px] border-ink/20">
            <Button
              variant="secondary"
              onClick={() => toast("This is a Sticker Pop feedback notification!", "success")}
            >
              Trigger Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(true)}
            >
              Open Bottom Sheet
            </Button>
          </div>
        </div>
      </section>

      {/* Section 8: New Feature Style Shells (Section 12) */}
      <section className="space-y-4">
        <h2 className="font-display text-display-m font-extrabold text-ink">
          8. New Feature Style Shells (Section 12)
        </h2>
        <p className="font-body text-caption text-muted">
          Style-only shells for Twin Globe, Orbit, Telepathy, Anti-Twin, and Oddly Deck.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Twin Globe Shell */}
          <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
            <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-2">
              <span className="font-display text-sm font-extrabold text-ink uppercase">Twin Globe</span>
              <Compass className="w-4 h-4 text-violet stroke-[2.5]" />
            </div>
            <SearchMapAnimation onComplete={() => {}} />
            <p className="font-body text-caption text-muted">
              Static SVG globe, lavender fill, land dots, pulsing violet pin (replaces repaint-heavy radar).
            </p>
          </div>

          {/* Orbit Shell */}
          <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
            <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-2">
              <span className="font-display text-sm font-extrabold text-ink uppercase">Orbit Kept Twins</span>
              <Orbit className="w-4 h-4 text-violet stroke-[2.5]" />
            </div>
            <div className="p-3.5 rounded-m bg-cream border-[2px] border-ink flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-pill bg-paper border-[2px] border-ink flex items-center justify-center font-display font-extrabold text-xs">
                  #42
                </div>
                <div>
                  <div className="font-display text-xs font-bold text-ink">Stranger in Tokyo</div>
                  <div className="text-[10px] font-display font-bold text-muted">Day 7 of 30 Unlock</div>
                </div>
              </div>
              <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-pill bg-lavender border border-ink">
                Unlocked
              </span>
            </div>
            {/* 5-dot milestone track */}
            <div className="flex items-center justify-between px-2 pt-1">
              {[1, 3, 7, 14, 30].map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className={`w-3 h-3 rounded-pill border border-ink ${i <= 2 ? "bg-mint" : "bg-cream"}`} />
                  <span className="text-[9px] font-bold text-muted">{d}d</span>
                </div>
              ))}
            </div>
          </div>

          {/* Telepathy Shell */}
          <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
            <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-2">
              <span className="font-display text-sm font-extrabold text-ink uppercase">Telepathy Daily Guess</span>
              <UserCheck className="w-4 h-4 text-violet stroke-[2.5]" />
            </div>
            <p className="font-display text-xs font-bold text-ink">
              &ldquo;Will your twin choose Cold Pizza or Warm Soda?&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted uppercase">You Guessed</span>
                <span className="font-display font-bold text-ink mt-0.5">Cold Pizza</span>
                <span className="mt-2 text-[10px] font-bold text-ink px-2 py-0.5 rounded-pill bg-mint border border-ink">
                  ✓ Matched
                </span>
              </div>
              <div className="p-3 rounded-m bg-cream border-[1.5px] border-ink flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted uppercase">They Picked</span>
                <span className="font-display font-bold text-ink mt-0.5">Cold Pizza</span>
                <span className="mt-2 text-[10px] font-bold text-muted">50% Baseline</span>
              </div>
            </div>
          </div>

          {/* Oddly Collectible Deck Shell */}
          <div className="p-6 rounded-l bg-paper border-[2.5px] border-ink shadow-sticker space-y-3">
            <div className="flex items-center justify-between border-b-[1.5px] border-ink/20 pb-2">
              <span className="font-display text-sm font-extrabold text-ink uppercase">Oddly Deck Mini-Card</span>
              <Sparkles className="w-4 h-4 text-sun stroke-[2.5]" />
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="w-[140px] aspect-[210/290] rounded-m bg-paper border-[2.5px] border-ink shadow-sticker p-3 flex flex-col justify-between text-center ring-2 ring-sun/50">
                <span className="text-[9px] font-display font-extrabold text-ink uppercase">★ RARE</span>
                <span className="font-display text-2xl font-extrabold text-ink">4/5</span>
                <span className="text-[9px] font-display font-bold text-muted">Berlin</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 1 Resilience & Degradation Showcase (P1.20 - P1.23) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b-[2px] border-ink pb-2">
          <h2 className="font-display text-display-m font-bold text-ink">
            10. Resilience &amp; Degradation UI Kit (P1.20 - P1.23)
          </h2>
          <span className="text-xs font-mono font-bold text-muted bg-paper border border-ink rounded-pill px-2.5 py-0.5">
            Phase 1 Complete
          </span>
        </div>

        {/* P1.20: Degradation Banners */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-display-s font-bold text-ink">
              P1.20 Degradation Banners (L0–L4)
            </h3>
            <div className="flex items-center gap-1">
              {(["L0", "L1", "L2", "L3", "L4"] as DegradationLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDemoDegradationLevel(lvl)}
                  className={cn(
                    "px-2 py-0.5 rounded-pill text-xs font-bold border border-ink transition-transform active:scale-95",
                    demoDegradationLevel === lvl
                      ? "bg-violet text-paper shadow-xs"
                      : "bg-paper text-ink hover:bg-cream"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <DegradationBanner
              level={demoDegradationLevel}
              onDismiss={() => toast("Banner dismissed", "info")}
            />
            {demoDegradationLevel === "L0" && (
              <div className="p-3 bg-paper border-[1.5px] border-ink rounded-m text-xs text-muted font-body">
                Level L0 (Healthy) active: Banner cleanly hidden (null render) to preserve zero user-facing clutter.
              </div>
            )}
          </div>
        </div>

        {/* P1.22: Freshness Labels & Overload Screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-display text-display-s font-bold text-ink">
              P1.22 Freshness Labels
            </h3>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-cream border-[1.5px] border-ink rounded-m">
              <FreshnessLabel label="Live 12s ago" />
              <FreshnessLabel timestamp={Date.now() - 120000} isStale={false} />
              <FreshnessLabel timestamp={Date.now() - 480000} isStale={true} />
              <FreshnessLabel label="Serving cached standings" isStale={true} />
            </div>
          </div>

          {/* P1.23: Anti-Flicker Skeleton & Error Boundary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-display-s font-bold text-ink">
                P1.23 Anti-Flicker &amp; Error Boundary
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAntiFlickerLoading(true);
                  setTimeout(() => setAntiFlickerLoading(false), 50); // fast 50ms trigger to test 200ms lock
                }}
              >
                Trigger 50ms pulse
              </Button>
            </div>

            <AntiFlickerSkeleton
              isLoading={antiFlickerLoading}
              minDisplayMs={200}
              skeleton={<div className="h-14 rounded-m bg-lavender border-[1.5px] border-ink animate-pulse flex items-center px-4 text-xs font-bold text-muted">200ms Minimum Skeleton Lock...</div>}
            >
              <WidgetErrorBoundary name="Stats Widget">
                <div className="p-3 bg-paper border-[1.5px] border-ink rounded-m text-xs font-bold text-ink flex items-center justify-between">
                  <span>Widget Content Healthy</span>
                  <span className="text-mint font-black">Online</span>
                </div>
              </WidgetErrorBoundary>
            </AntiFlickerSkeleton>
          </div>
        </div>

        {/* P1.21: Mode B Pending Screen Preview */}
        <div className="space-y-3">
          <h3 className="font-display text-display-s font-bold text-ink">
            P1.21 Mode B Asynchronous Pending Screen
          </h3>
          <div className="border-[2px] border-ink rounded-xl bg-cream p-4">
            <ModeBPendingScreen
              requestId="req_preview_9876543210"
              onCheckStatus={() => toast("Checking status...", "info")}
              onHome={() => toast("Returning home...", "info")}
            />
          </div>
        </div>
      </section>

      {/* Dialog Showcase */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Sticker Pop Bottom Sheet"
        description="Slides up 240ms with 40x5px ink grab handle and focus trapping."
      >
        <div className="space-y-4 pt-2">
          <p className="font-body text-sm text-muted">
            This bottom sheet adheres strictly to WCAG focus trapping, 44x44 minimum hit targets, and Esc to dismiss.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setDialogOpen(false)}
          >
            Got It
          </Button>
        </div>
      </ResponsiveDialog>
    </main>
  );
}
