"use client";

import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Sparkles, CalendarDays, UserRound, Sun, Moon } from "lucide-react";
import { BrandMark, StreakFlame } from "@/components/icons";
import { useTheme } from "./ThemeProvider";
import { feedback } from "@/lib/feedback";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// 1. Tooltip Component
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={350}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            className="z-50 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-text shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// 2. Tabs Component (Radix Tabs Wrapper)
export function Tabs({
  defaultValue,
  value,
  onValueChange,
  items,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  items: { value: string; label: string; content: React.ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue || items[0]?.value}
      value={value}
      onValueChange={(val) => {
        feedback.triggerHaptic("select");
        feedback.playSound("tick");
        onValueChange?.(val);
      }}
      className="w-full flex flex-col"
    >
      <TabsPrimitive.List className="inline-flex h-11 items-center justify-center rounded-full bg-surface-2 p-1 border border-border">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2 text-xs font-heading font-semibold text-text-muted transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint data-[state=active]:bg-violet data-[state=active]:text-white data-[state=active]:shadow-sm cursor-pointer"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          className="mt-4 focus-visible:outline-none"
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

// 3. Mobile Bottom Tab Bar (Today, History, Me)
export function BottomTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: "today" | "history" | "me";
  onTabChange: (tab: "today" | "history" | "me") => void;
}) {
  const tabs = [
    { id: "today" as const, label: "Today", icon: Sparkles },
    { id: "history" as const, label: "History", icon: CalendarDays },
    { id: "me" as const, label: "Me", icon: UserRound },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-surface/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-4 sm:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              feedback.triggerHaptic("select");
              feedback.playSound("tick");
              onTabChange(tab.id);
            }}
            className="flex flex-col items-center justify-center gap-1 w-16 py-1 select-none cursor-pointer"
          >
            <div
              className={cn(
                "p-1.5 rounded-full transition-all duration-150",
                isActive ? "bg-violet/15 text-violet" : "text-text-muted hover:text-text"
              )}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={cn(
                "text-[10px] font-heading tracking-wider uppercase",
                isActive ? "font-bold text-violet" : "text-text-muted"
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// 4. Top Navigation Bar
export function TopNav({
  streakCount = 0,
  onSignInClick,
}: {
  streakCount?: number;
  onSignInClick?: () => void;
}) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="w-full h-16 border-b border-border/60 bg-bg/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
      {/* Brand logo left */}
      <div className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <span className="font-heading text-xl font-bold tracking-tight text-text">oddly</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {streakCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border">
            <StreakFlame size={18} />
            <span className="font-heading font-bold text-xs text-text">{streakCount}</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={() => {
            feedback.triggerHaptic("select");
            toggleTheme();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-violet" />}
        </button>

        {/* Sign in Button */}
        {onSignInClick && (
          <button
            type="button"
            onClick={onSignInClick}
            className="text-xs font-heading font-semibold text-violet hover:underline px-2.5 py-1.5 cursor-pointer"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
