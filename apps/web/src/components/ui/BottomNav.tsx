"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Globe, History, User } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Sparkles },
  { href: "/globe", label: "Globe", icon: Globe },
  { href: "/history", label: "History", icon: History },
  { href: "/me", label: "Me", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  // If on a sub-route where bottom nav would obstruct focus (e.g., question screen)
  // or error/not-found, still render if on primary tabs
  const shouldRender =
    pathname === "/" ||
    pathname.startsWith("/globe") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/orbit");

  if (!shouldRender) {
    return null;
  }

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur-md border-t-[2.5px] border-ink select-none"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-m flex flex-col items-center justify-center gap-0.5",
                "font-display text-[11px] font-bold transition-all",
                "active:translate-x-[1px] active:translate-y-[1px]",
                "focus-visible:ring-2 focus-visible:ring-violet focus-visible:outline-none",
                isActive
                  ? "text-ink bg-lavender border-[1.5px] border-ink shadow-sticker-flat font-extrabold"
                  : "text-muted hover:text-ink hover:bg-cream"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 stroke-[2.2]",
                  isActive ? "text-violet stroke-[2.5]" : "text-muted"
                )}
              />
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
