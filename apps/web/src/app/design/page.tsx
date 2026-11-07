"use client";

import React, { useState } from "react";
import { Sparkles, Sun, Moon, Volume2, VolumeX, ArrowRight, Info } from "lucide-react";
import { Atmosphere, AtmosphereMode } from "@/components/ui/Atmosphere";
import { useTheme } from "@/components/ui/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Chip } from "@/components/ui/Card";
import { Toggle, Checkbox, Input, Textarea } from "@/components/ui/FormControls";
import { ResponsiveDialog } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/Toast";
import { Tooltip, Tabs, BottomTabBar, TopNav } from "@/components/ui/Navigation";
import { ProgressDots, Skeleton, EmptyState } from "@/components/ui/FeedbackPrimitives";
import { Countdown } from "@/components/ui/Countdown";
import {
  BrandMark,
  StreakFlame,
  CommonBadge,
  UncommonBadge,
  RareBadge,
  MythicBadge,
  fireConfetti,
} from "@/components/icons";
import {
  AnswerTile,
  NumberPicker,
  ColourSwatchGrid,
  ImageTileGrid,
  WordChipsGrid,
} from "@/components/play/AnswerComponents";
import { SearchMapAnimation } from "@/components/play/SearchMapAnimation";
import { feedback } from "@/lib/feedback";

export default function DesignKitPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const toast = useToast();

  // State management for interactive showcase controls
  const [atmosphereMode, setAtmosphereMode] = useState<AtmosphereMode>("hero");
  const [activeSwatchHex, setActiveSwatchHex] = useState<string>("#3DDBB0");
  const [soundOn, setSoundOn] = useState(feedback.isSoundEnabled());
  const [hapticsOn, setHapticsOn] = useState(feedback.isHapticsEnabled());

  // Component state controls
  const [textOption, setTextOption] = useState<string>("opt-1");
  const [pickedNumber, setPickedNumber] = useState<number>(27);
  const [selectedImage, setSelectedImage] = useState<string>("img-1");
  const [selectedWord, setSelectedWord] = useState<string>("Cozy");
  const [currentProgressDot, setCurrentProgressDot] = useState<number>(2);
  const [toggleChecked, setToggleChecked] = useState<boolean>(true);
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [showSearchMap, setShowSearchMap] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<"today" | "history" | "me">("today");
  const [inputText, setInputText] = useState("");
  const [reportNote, setReportNote] = useState("");

  const handleSoundToggle = (val: boolean) => {
    setSoundOn(val);
    feedback.setSoundEnabled(val);
    toast.info(val ? "Sound effects enabled" : "Sound effects muted");
  };

  const handleHapticsToggle = (val: boolean) => {
    setHapticsOn(val);
    feedback.setHapticsEnabled(val);
    toast.info(val ? "Haptics enabled" : "Haptics disabled");
  };

  return (
    <div className="w-full min-h-screen relative pb-28 pt-4">
      {/* Dynamic Background Atmosphere */}
      <Atmosphere mode={atmosphereMode} activeColorHex={activeSwatchHex} />

      {/* Top Header */}
      <TopNav streakCount={12} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-12">
        {/* Kit Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet/15 text-violet text-xs font-bold uppercase tracking-wider">
                Stage 1 Deliverable
              </span>
              <span className="text-xs text-text-muted">WCAG 2.2 AA Verified</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text">
              Oddly UI Design Kit
            </h1>
            <p className="font-body text-sm sm:text-base text-text-muted mt-1">
              Interactive sandbox proving design tokens, typography, component states, and accessibility.
            </p>
          </div>

          {/* Theme & Controls Bar */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              leftIcon={resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-violet" />}
            >
              {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSoundToggle(!soundOn)}
              leftIcon={soundOn ? <Volume2 className="w-4 h-4 text-mint" /> : <VolumeX className="w-4 h-4 text-text-muted" />}
            >
              Sound
            </Button>
          </div>
        </section>

        {/* 1. Brand Tokens & Tier Badges */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">1. Brand Identity & Tier Badges</h2>
          <Card variant="glass" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <BrandMark size={40} />
                <span className="font-heading text-lg font-bold">Brand Mark</span>
              </div>
              <div className="flex items-center gap-3">
                <StreakFlame size={28} />
                <span className="font-heading text-lg font-bold">12-Day Streak Flame</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Information-Theoretic Rarity Tiers
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <CommonBadge percentile={34.2} />
                <UncommonBadge percentile={68.5} />
                <RareBadge percentile={88.4} />
                <MythicBadge percentile={99.1} />
              </div>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Confetti & Celebration Emitter
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  feedback.playSound("celebrate");
                  fireConfetti();
                  toast.success("Confetti celebration triggered!");
                }}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Fire Confetti (High Match / Milestone)
              </Button>
            </div>
          </Card>
        </section>

        {/* 2. Button Primitives & Interactive States */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">2. Button Primitives & Interactive States</h2>
          <Card variant="default" className="flex flex-col gap-6">
            {/* Primary & Secondary */}
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg">Primary Large</Button>
              <Button variant="primary" size="md">Primary Medium</Button>
              <Button variant="primary" size="sm">Primary Small</Button>
              <Button variant="primary" size="md" isLoading>Loading</Button>
              <Button variant="primary" size="md" disabled>Disabled</Button>
            </div>

            {/* Secondary, Ghost, Destructive, Icons */}
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" size="md">Secondary Button</Button>
              <Button variant="ghost" size="md">Ghost Button</Button>
              <Button variant="destructive" size="md">Destructive Button</Button>
              <Button variant="icon" aria-label="Settings icon button">
                <Sparkles className="w-5 h-5 text-violet" />
              </Button>
              <Button variant="close" />
            </div>
          </Card>
        </section>

        {/* 3. Containers, Badges, and Chips */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">3. Containers, Badges, and Chips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="default">
              <h3 className="font-heading font-bold text-base mb-1">Default Card</h3>
              <p className="text-xs text-text-muted">Standard surface with 1px border.</p>
            </Card>
            <Card variant="elevated">
              <h3 className="font-heading font-bold text-base mb-1">Elevated Card</h3>
              <p className="text-xs text-text-muted">Raised surface with subtle shadow-2.</p>
            </Card>
            <Card variant="glass">
              <h3 className="font-heading font-bold text-base mb-1">Glass Card</h3>
              <p className="text-xs text-text-muted">Semi-transparent with backdrop blur.</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="default">Default Badge</Badge>
            <Badge variant="mint">Mint Highlight</Badge>
            <Badge variant="violet">Violet Brand</Badge>
            <Badge variant="coral">Coral Accent</Badge>
            <Chip selected={false} onClick={() => toast.info("Chip clicked")}>Filter Chip</Chip>
            <Chip selected={true} onClick={() => toast.info("Active chip clicked")}>Selected Chip</Chip>
          </div>
        </section>

        {/* 4. Form Controls */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">4. Form Controls</h2>
          <Card variant="default" className="flex flex-col gap-5">
            <Toggle
              checked={toggleChecked}
              onCheckedChange={setToggleChecked}
              label="Push Notifications"
              description="Receive gentle alerts when the daily five drop at 07:00 IST."
            />
            <Toggle
              checked={hapticsOn}
              onCheckedChange={handleHapticsToggle}
              label="Tactile Haptic Feedback"
              description="Vibrate lightly on selection ticks and score reveals."
            />

            <Checkbox
              checked={ageConfirmed}
              onChange={setAgeConfirmed}
              label={
                <span>
                  I confirm that I am <strong>18 or older</strong> (required by India DPDP Act).
                </span>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                placeholder="Standard text input..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Input
                placeholder="Error state input..."
                defaultValue="invalid_email"
                error="Please enter a valid format."
              />
            </div>

            <Textarea
              placeholder="Report note (optional, max 140 characters)..."
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
            />
          </Card>
        </section>

        {/* 5. Interactive Question Answer Components */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">5. Interactive Question Answer Types</h2>

          {/* Question Type 1: Text Pick One */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="violet">Type 1: Pick One (Text)</Badge>
              <button
                type="button"
                onClick={() => setAtmosphereMode("text")}
                className="text-xs text-violet hover:underline cursor-pointer"
              >
                Set Violet Glow
              </button>
            </div>
            <h3 className="font-heading text-lg font-bold">A pizza that is always cold, or coffee that is always lukewarm?</h3>
            <div className="flex flex-col gap-3 mt-1">
              <AnswerTile
                option={{ id: "opt-1", text: "A pizza that is always cold" }}
                selected={textOption === "opt-1"}
                onSelect={setTextOption}
              />
              <AnswerTile
                option={{ id: "opt-2", text: "Coffee that is always lukewarm" }}
                selected={textOption === "opt-2"}
                onSelect={setTextOption}
              />
            </div>
          </Card>

          {/* Question Type 2: Number Picker Dial */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="coral">Type 2: Number (1 to 50)</Badge>
              <button
                type="button"
                onClick={() => setAtmosphereMode("number")}
                className="text-xs text-coral hover:underline cursor-pointer"
              >
                Set Coral Glow
              </button>
            </div>
            <h3 className="font-heading text-lg font-bold">Pick your lucky number.</h3>
            <NumberPicker
              value={pickedNumber}
              onChange={setPickedNumber}
              onConfirm={() => toast.success(`Confirmed number: ${pickedNumber}`)}
            />
          </Card>

          {/* Question Type 3: 12-Colour Swatch Grid */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="mint">Type 3: 12-Colour Palette</Badge>
              <span className="text-xs text-text-muted">Clicking shifts atmosphere glow</span>
            </div>
            <h3 className="font-heading text-lg font-bold">Colour for this feeling: Monday morning.</h3>
            <ColourSwatchGrid
              selectedHex={activeSwatchHex}
              onSelect={(swatch) => {
                setActiveSwatchHex(swatch.hex);
                setAtmosphereMode("colour");
                toast.info(`Selected ${swatch.label} (${swatch.hex})`);
              }}
            />
          </Card>

          {/* Question Type 4: Pick One Image Grid */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="default">Type 4: Image Pick One (4 SVG Tiles)</Badge>
              <button
                type="button"
                onClick={() => setAtmosphereMode("image")}
                className="text-xs text-sky-400 hover:underline cursor-pointer"
              >
                Set Sky Glow
              </button>
            </div>
            <h3 className="font-heading text-lg font-bold">Which door would you open?</h3>
            <ImageTileGrid
              options={[
                { id: "img-1", assetKey: "door-red", caption: "Red Door" },
                { id: "img-2", assetKey: "door-wood", caption: "Carved Wood" },
                { id: "img-3", assetKey: "door-glass", caption: "Modern Glass" },
                { id: "img-4", assetKey: "door-tiny", caption: "Tiny Garden Door" },
              ]}
              selectedId={selectedImage}
              onSelect={setSelectedImage}
            />
          </Card>

          {/* Question Type 5: Word Chips */}
          <Card variant="glass" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="coral">Type 5: Word (6 Options)</Badge>
              <button
                type="button"
                onClick={() => setAtmosphereMode("word")}
                className="text-xs text-amber hover:underline cursor-pointer"
              >
                Set Amber Glow
              </button>
            </div>
            <h3 className="font-heading text-lg font-bold">Pick the word that fits today.</h3>
            <WordChipsGrid
              words={["Cozy", "Restless", "Curious", "Sleepy", "Bold", "Calm"]}
              selectedWord={selectedWord}
              onSelect={setSelectedWord}
            />
          </Card>
        </section>

        {/* 6. Feedback, Transitions & Animations */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">6. Feedback & Animation Primitives</h2>
          <Card variant="default" className="flex flex-col gap-6">
            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Five Progress Dots (Interactive Navigation)
              </span>
              <ProgressDots
                current={currentProgressDot}
                onDotClick={(idx) => {
                  setCurrentProgressDot(idx);
                  toast.info(`Jumped to question ${idx + 1}`);
                }}
              />
              <div className="flex justify-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentProgressDot <= 0}
                  onClick={() => setCurrentProgressDot((p) => Math.max(0, p - 1))}
                >
                  Prev Dot
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentProgressDot >= 4}
                  onClick={() => setCurrentProgressDot((p) => Math.min(4, p + 1))}
                >
                  Next Dot
                </Button>
              </div>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Tabular Countdown Clock (Drop Release)
              </span>
              <Countdown />
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Skeleton Shimmer Blocks
              </span>
              <div className="flex flex-col gap-2 max-w-sm">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Toast System Triggers
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => toast.success("Picks submitted successfully!")}>
                  Success Toast
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast.error("Network disconnected. Retrying...")}>
                  Error Toast
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast.info("Your twin was updated.")}>
                  Info Toast
                </Button>
              </div>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Search Map Animation (1.5s Journey)
              </span>
              <Button variant="primary" size="md" onClick={() => setShowSearchMap(true)}>
                Preview S5 Search Journey
              </Button>
            </div>

            <div>
              <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Responsive Dialog (Bottom Sheet / Desktop Modal)
              </span>
              <Button variant="secondary" size="md" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
            </div>
          </Card>
        </section>

        {/* 7. Empty State Primitive */}
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-bold text-text">7. Empty State Primitive</h2>
          <Card variant="glass">
            <EmptyState
              title="Your twins will show up here"
              description="Play today's five picks to find the one stranger who answered most like you."
              actionLabel="Play today's five"
              onAction={() => toast.info("Redirecting to play flow")}
            />
          </Card>
        </section>
      </main>

      {/* Responsive Dialog Instance */}
      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Quick Check"
        description="Oddly is designed strictly for adults. Confirm below to continue."
      >
        <div className="flex flex-col gap-4 py-2">
          <Checkbox
            checked={ageConfirmed}
            onChange={setAgeConfirmed}
            label="I am 18 or older"
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!ageConfirmed}
              onClick={() => {
                setDialogOpen(false);
                toast.success("Age confirmed!");
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* S5 Search Map Animation Overlay */}
      {showSearchMap && (
        <SearchMapAnimation
          onComplete={() => {
            setShowSearchMap(false);
            feedback.playSound("chime");
            fireConfetti();
            toast.success("Twin found: Lagos (4 of 5)!");
          }}
        />
      )}

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar activeTab={activeNavTab} onTabChange={setActiveNavTab} />
    </div>
  );
}
