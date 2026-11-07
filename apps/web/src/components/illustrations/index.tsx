"use client";

import React from "react";

interface IllustrationProps {
  size?: number | string;
  className?: string;
}

// 1. Sky Illustrations (4)
export function SunriseSky({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Sunrise sky">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="48" cy="62" r="24" fill="#FFD23F" fillOpacity="0.9" />
      <path d="M48 20V28M26 30L32 36M70 30L64 36M16 62H24M72 62H80" stroke="#FF8176" strokeWidth="3" strokeLinecap="round" />
      <path d="M0 64C20 60 40 68 60 64C80 60 96 66 96 66V96H0V64Z" fill="#3F37C9" fillOpacity="0.7" />
    </svg>
  );
}

export function StormSky({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Thunderstorm sky">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <path d="M26 50C22 50 18 46 18 42C18 37 22 34 26 34C28 26 36 22 44 24C50 20 60 22 64 28C72 28 78 34 78 42C78 48 72 50 68 50H26Z" fill="#64748B" />
      <path d="M48 46L40 60H50L44 76L60 56H48L52 46H48Z" fill="#FFD23F" />
    </svg>
  );
}

export function StarrySky({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Starry night sky">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <circle cx="68" cy="36" r="16" fill="#FFF8F0" />
      <circle cx="62" cy="32" r="14" fill="#14123A" />
      <circle cx="24" cy="28" r="2" fill="#3DDBB0" />
      <circle cx="38" cy="44" r="1.5" fill="#FFF8F0" />
      <circle cx="28" cy="64" r="2.5" fill="#FFD23F" />
      <circle cx="54" cy="70" r="1.5" fill="#8B72FF" />
      <path d="M74 66L75 62L79 61L75 60L74 56L73 60L69 61L73 62L74 66Z" fill="#3DDBB0" />
    </svg>
  );
}

export function OvercastSky({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Overcast sky">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M24 60C18 60 14 55 14 50C14 44 19 40 25 40C27 30 38 26 48 30C54 26 64 28 68 34C76 34 82 40 82 48C82 55 76 60 70 60H24Z" fill="#B3AEE0" fillOpacity="0.4" />
      <path d="M34 68C28 68 24 63 24 58C24 52 29 48 35 48C37 38 48 34 58 38C64 34 74 36 78 42C86 42 92 48 92 56C92 63 86 68 80 68H34Z" fill="#B3AEE0" fillOpacity="0.7" />
    </svg>
  );
}

// 2. Door Illustrations (4)
export function RedDoor({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Red door">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M28 80V32C28 24 38 18 48 18C58 18 68 24 68 32V80H28Z" fill="#D7263D" />
      <rect x="34" y="32" width="12" height="18" rx="2" fill="#FF6B5E" />
      <rect x="50" y="32" width="12" height="18" rx="2" fill="#FF6B5E" />
      <rect x="34" y="56" width="12" height="20" rx="2" fill="#FF6B5E" />
      <rect x="50" y="56" width="12" height="20" rx="2" fill="#FF6B5E" />
      <circle cx="62" cy="54" r="3" fill="#FFD23F" />
      <line x1="20" y1="80" x2="76" y2="80" stroke="#3A3580" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function WoodDoor({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Carved wooden door">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="30" y="22" width="36" height="58" rx="4" fill="#F59E0B" />
      <line x1="42" y1="22" x2="42" y2="80" stroke="#78350F" strokeWidth="2" strokeDasharray="4 2" />
      <line x1="54" y1="22" x2="54" y2="80" stroke="#78350F" strokeWidth="2" strokeDasharray="4 2" />
      <circle cx="60" cy="52" r="3.5" fill="#14123A" />
      <line x1="22" y1="80" x2="74" y2="80" stroke="#3A3580" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function GlassDoor({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Modern glass door">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="28" y="20" width="40" height="60" rx="2" stroke="#3DDBB0" strokeWidth="3" fill="#4CC9F0" fillOpacity="0.25" />
      <line x1="36" y1="30" x2="60" y2="70" stroke="#FFF8F0" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
      <rect x="62" y="44" width="3" height="14" rx="1.5" fill="#FFF8F0" />
      <line x1="20" y1="80" x2="76" y2="80" stroke="#3A3580" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function TinyDoor({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Tiny garden door">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M34 80V52C34 44 40 38 48 38C56 38 62 44 62 52V80H34Z" fill="#8BC34A" />
      <circle cx="44" cy="60" r="2.5" fill="#FFD23F" />
      <path d="M30 46Q34 36 44 34Q54 34 60 44" stroke="#3DDBB0" strokeWidth="3" fill="none" />
      <circle cx="34" cy="40" r="3" fill="#FF6B5E" />
      <circle cx="58" cy="38" r="3" fill="#FF8176" />
      <line x1="24" y1="80" x2="72" y2="80" stroke="#3A3580" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// 3. Urban Pathways (4)
export function ChaiLane({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Mumbai chai lane">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M38 72H58L62 42H34L38 72Z" fill="#F59E0B" />
      <rect x="36" y="36" width="24" height="6" rx="3" fill="#D7263D" />
      <path d="M44 32C44 26 48 24 46 18" stroke="#FFF8F0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M52 32C52 26 56 24 54 18" stroke="#FFF8F0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ParkPath({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Quiet park path">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="30" cy="40" r="16" fill="#8BC34A" fillOpacity="0.8" />
      <circle cx="66" cy="40" r="16" fill="#3DDBB0" fillOpacity="0.8" />
      <path d="M48 36Q42 60 30 84H66Q54 60 48 36Z" fill="#F59E0B" fillOpacity="0.7" />
    </svg>
  );
}

export function NeonMarket({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Neon market alley">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <rect x="24" y="24" width="20" height="34" rx="4" stroke="#FF6B5E" strokeWidth="3" />
      <rect x="52" y="24" width="20" height="34" rx="4" stroke="#4CC9F0" strokeWidth="3" />
      <circle cx="34" cy="41" r="5" fill="#FF8176" />
      <circle cx="62" cy="41" r="5" fill="#3DDBB0" />
      <path d="M20 78L48 58L76 78" stroke="#8B72FF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BeachPromenade({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Beach promenade">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M26 80Q32 50 48 34" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 34Q34 26 24 30M48 34Q54 22 66 26M48 34Q60 38 68 46" stroke="#8BC34A" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 70Q32 64 48 70Q64 76 80 70" stroke="#4CC9F0" strokeWidth="3" fill="none" />
    </svg>
  );
}

// 4. Desert Island Essentials (4)
export function IslandBook({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Island book">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M26 28L48 34L70 28V68L48 74L26 68V28Z" fill="#F4F1FF" />
      <path d="M48 34V74" stroke="#6C4CF1" strokeWidth="3" />
      <path d="M26 28Q48 32 70 28" stroke="#3A3580" strokeWidth="2" />
      <path d="M54 36V50L58 46L62 50V38" fill="#FF6B5E" />
    </svg>
  );
}

export function IslandGuitar({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Acoustic guitar">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="48" cy="62" r="16" fill="#F59E0B" />
      <circle cx="48" cy="42" r="10" fill="#F59E0B" />
      <rect x="45" y="18" width="6" height="24" rx="2" fill="#78350F" />
      <circle cx="48" cy="52" r="4.5" fill="#14123A" />
      <line x1="48" y1="18" x2="48" y2="68" stroke="#FFF8F0" strokeWidth="1.5" />
    </svg>
  );
}

export function IslandTorch({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Brass torch lamp">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="36" y="38" width="24" height="34" rx="6" fill="#F59E0B" />
      <circle cx="48" cy="52" r="8" fill="#FFD23F" />
      <path d="M38 38L48 22L58 38" stroke="#FFF8F0" strokeWidth="3" fill="none" />
      <line x1="48" y1="44" x2="48" y2="60" stroke="#FF8176" strokeWidth="2" />
    </svg>
  );
}

export function IslandNotebook({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Blank notebook">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="28" y="24" width="40" height="52" rx="4" fill="#3DDBB0" />
      <line x1="36" y1="36" x2="60" y2="36" stroke="#14123A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="46" x2="60" y2="46" stroke="#14123A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="56" x2="52" y2="56" stroke="#14123A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 5. Weekend Plans (4)
export function IndieCinema({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Indie cinema">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="22" y="32" width="52" height="34" rx="4" fill="#D7263D" />
      <circle cx="48" cy="49" r="8" fill="#FFD23F" />
      <line x1="22" y1="42" x2="74" y2="42" stroke="#FFF8F0" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

export function RoadTrip({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Road trip">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="24" y="44" width="48" height="20" rx="6" fill="#4CC9F0" />
      <circle cx="34" cy="66" r="6" fill="#14123A" />
      <circle cx="62" cy="66" r="6" fill="#14123A" />
      <path d="M34 44L40 32H56L62 44" fill="#6C4CF1" />
    </svg>
  );
}

export function LongNap({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Long afternoon nap">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M26 62Q48 50 70 62V72H26V62Z" fill="#8B72FF" />
      <circle cx="38" cy="46" r="9" fill="#FFD23F" />
      <path d="M52 32H60L54 40H62" stroke="#3DDBB0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M64 24H70L66 30H72" stroke="#3DDBB0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StreetFood({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Street food crawl">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <path d="M26 56Q48 40 70 56L66 70H30L26 56Z" fill="#F59E0B" />
      <line x1="48" y1="24" x2="48" y2="52" stroke="#FF8176" strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="32" r="5" fill="#D7263D" />
      <circle cx="48" cy="44" r="5" fill="#FFD23F" />
    </svg>
  );
}

// 6. Market Stalls (4)
export function FruitStall({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Fruit market stall">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="48" cy="38" r="8" fill="#FF8176" />
      <circle cx="38" cy="54" r="9" fill="#F59E0B" />
      <circle cx="58" cy="54" r="9" fill="#FFD23F" />
      <circle cx="48" cy="68" r="9" fill="#8BC34A" />
    </svg>
  );
}

export function BooksStall({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Books stall">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <rect x="28" y="58" width="40" height="12" rx="2" fill="#6C4CF1" />
      <rect x="32" y="44" width="36" height="12" rx="2" fill="#3DDBB0" />
      <rect x="36" y="30" width="32" height="12" rx="2" fill="#F59E0B" />
    </svg>
  );
}

export function BanglesStall({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Glass bangles stall">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <ellipse cx="48" cy="38" rx="20" ry="7" stroke="#FF6B5E" strokeWidth="3" fill="none" />
      <ellipse cx="48" cy="48" rx="20" ry="7" stroke="#3DDBB0" strokeWidth="3" fill="none" />
      <ellipse cx="48" cy="58" rx="20" ry="7" stroke="#FFD23F" strokeWidth="3" fill="none" />
      <ellipse cx="48" cy="68" rx="20" ry="7" stroke="#8B72FF" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function SweetsStall({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Traditional sweets stall">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="36" cy="42" r="7" fill="#F472B6" />
      <circle cx="60" cy="42" r="7" fill="#FFD23F" />
      <circle cx="48" cy="58" r="8" fill="#3DDBB0" />
      <circle cx="48" cy="58" r="2.5" fill="#D7263D" />
    </svg>
  );
}

// 7. Sunrise / Sunset Scenes (4)
export function GoldenDawn({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Golden dawn">
      <rect width="96" height="96" rx="16" fill="#1E1B4B" />
      <circle cx="48" cy="48" r="22" fill="#FFD23F" />
      <path d="M16 80L44 48L64 70L80 54L96 74V96H16V80Z" fill="#6C4CF1" />
    </svg>
  );
}

export function MountainMist({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Mountain mist">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <path d="M20 78L48 38L76 78H20Z" fill="#3F37C9" />
      <path d="M10 84Q48 68 86 84" stroke="#B3AEE0" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

export function OceanSunset({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Ocean sunset">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <circle cx="48" cy="50" r="18" fill="#FF6B5E" />
      <line x1="20" y1="62" x2="76" y2="62" stroke="#4CC9F0" strokeWidth="3" strokeLinecap="round" />
      <line x1="28" y1="70" x2="68" y2="70" stroke="#4CC9F0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function TwilightHorizon({ size = 96, className = "" }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={className} aria-label="Twilight horizon">
      <rect width="96" height="96" rx="16" fill="#14123A" />
      <path d="M12 66Q48 56 84 66V84H12V66Z" fill="#3DDBB0" fillOpacity="0.8" />
      <circle cx="48" cy="42" r="14" fill="#8E5CF6" />
    </svg>
  );
}

/**
 * Dynamic polymorphic illustration registry
 */
export const illustrationsRegistry: Record<string, React.ComponentType<IllustrationProps>> = {
  // Sky
  "sky-sunrise": SunriseSky,
  "sky-storm": StormSky,
  "sky-starry": StarrySky,
  "sky-overcast": OvercastSky,
  // Doors
  "door-red": RedDoor,
  "door-wood": WoodDoor,
  "door-glass": GlassDoor,
  "door-tiny": TinyDoor,
  // Urban
  "path-chai": ChaiLane,
  "path-park": ParkPath,
  "path-neon": NeonMarket,
  "path-beach": BeachPromenade,
  // Essentials
  "island-book": IslandBook,
  "island-guitar": IslandGuitar,
  "island-torch": IslandTorch,
  "island-notebook": IslandNotebook,
  // Weekend
  "weekend-cinema": IndieCinema,
  "weekend-roadtrip": RoadTrip,
  "weekend-nap": LongNap,
  "weekend-streetfood": StreetFood,
  // Market
  "market-fruit": FruitStall,
  "market-books": BooksStall,
  "market-bangles": BanglesStall,
  "market-sweets": SweetsStall,
  // Horizons
  "horizon-goldendawn": GoldenDawn,
  "horizon-mountainmist": MountainMist,
  "horizon-oceansunset": OceanSunset,
  "horizon-twilight": TwilightHorizon,
};

export function DynamicIllustration({
  assetKey,
  size = 96,
  className = "",
}: {
  assetKey: string;
  size?: number | string;
  className?: string;
}) {
  const Component = illustrationsRegistry[assetKey] || SunriseSky;
  return <Component size={size} className={className} />;
}
