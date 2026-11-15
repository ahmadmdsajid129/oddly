"use client";

import React, { useState } from "react";
import type { GlobeArc, UserOrbitLine } from "@oddly/api-client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TwinGlobeMapProps {
  arcs: GlobeArc[];
  userOrbits?: UserOrbitLine[];
  className?: string;
}

const MAP_WIDTH = 800;
const MAP_HEIGHT = 450;

/** Convert [lat, lon] to SVG (x, y) via equirectangular projection */
function projectCoords(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** Calculate quadratic bezier curve path */
function getArcPath(
  fromCoords: [number, number],
  toCoords: [number, number]
): string {
  const [x1, y1] = projectCoords(fromCoords[0], fromCoords[1]);
  const [x2, y2] = projectCoords(toCoords[0], toCoords[1]);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Curve apex bows upward
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - Math.min(80, Math.max(30, dist * 0.25));

  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export function TwinGlobeMap({
  arcs,
  userOrbits = [],
  className,
}: TwinGlobeMapProps) {
  const [activePin, setActivePin] = useState<string | null>(null);

  // Gather unique active regions
  const pinMap = new Map<string, { name: string; coords: [number, number]; count: number }>();
  for (const arc of arcs) {
    if (!pinMap.has(arc.from_region)) {
      pinMap.set(arc.from_region, {
        name: arc.from_region,
        coords: arc.from_coords,
        count: arc.count,
      });
    }
    if (!pinMap.has(arc.to_region)) {
      pinMap.set(arc.to_region, {
        name: arc.to_region,
        coords: arc.to_coords,
        count: arc.count,
      });
    }
  }

  const pins = Array.from(pinMap.values());

  return (
    <div
      className={cn(
        "relative w-full aspect-[16/9] rounded-l bg-paper border-[2.5px] border-ink shadow-card overflow-hidden select-none",
        className
      )}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle dotted background pattern */}
          <pattern
            id="map-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="12.5" cy="12.5" r="1" fill="#14123A" fillOpacity="0.1" />
          </pattern>
        </defs>

        {/* Ocean Background */}
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#FFF8F0" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#map-grid)" />

        {/* Simplified Continents Silhouettes */}
        <g fill="#EEEAFE" stroke="#14123A" strokeWidth="1.5" strokeOpacity="0.35">
          {/* North America */}
          <path d="M 120 70 Q 180 60 250 80 Q 230 160 190 190 Q 140 180 110 130 Z" />
          {/* South America */}
          <path d="M 220 220 Q 280 230 270 320 Q 220 380 200 350 Q 190 280 220 220 Z" />
          {/* Europe */}
          <path d="M 390 80 Q 460 70 480 130 Q 420 160 380 130 Z" />
          {/* Africa */}
          <path d="M 380 170 Q 480 170 460 280 Q 430 350 400 340 Q 360 250 380 170 Z" />
          {/* Asia */}
          <path d="M 480 70 Q 680 70 690 180 Q 580 220 500 170 Z" />
          {/* India Subcontinent */}
          <path d="M 540 170 Q 590 180 570 250 Q 535 220 540 170 Z" />
          {/* Australia */}
          <path d="M 640 270 Q 730 270 720 340 Q 640 350 640 270 Z" />
        </g>

        {/* Aggregated Community Macro-Region Arcs (k >= 20) */}
        <g>
          {arcs.map((arc) => {
            const d = getArcPath(arc.from_coords, arc.to_coords);
            return (
              <g key={arc.id}>
                {/* Arc stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke="#14123A"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.6"
                />
              </g>
            );
          })}
        </g>

        {/* User's Active Orbits: Glowing Violet Lines */}
        <g>
          {userOrbits.map((uo) => {
            const d = getArcPath(uo.user_coords, uo.partner_coords);
            return (
              <g key={uo.orbit_id}>
                {/* Outer Glow Stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke="#6C4CF1"
                  strokeWidth="6"
                  strokeOpacity="0.3"
                />
                {/* Solid Core Stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke="#6C4CF1"
                  strokeWidth="3"
                />
              </g>
            );
          })}
        </g>

        {/* Regional Pins */}
        <g>
          {pins.map((pin) => {
            const [px, py] = projectCoords(pin.coords[0], pin.coords[1]);
            const isHovered = activePin === pin.name;

            return (
              <g
                key={pin.name}
                className="cursor-pointer"
                onClick={() => setActivePin(isHovered ? null : pin.name)}
              >
                {/* Pulse ring */}
                <circle
                  cx={px}
                  cy={py}
                  r="12"
                  fill="#6C4CF1"
                  fillOpacity="0.2"
                  className="animate-ping"
                />
                {/* Pin core */}
                <circle
                  cx={px}
                  cy={py}
                  r="5"
                  fill="#FF6B5E"
                  stroke="#14123A"
                  strokeWidth="2"
                />

                {/* Touch target overlay (>= 44x44px target) */}
                <circle
                  cx={px}
                  cy={py}
                  r="22"
                  fill="transparent"
                  aria-label={pin.name}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Selected Pin Tooltip */}
      {activePin && (
        <div className="absolute bottom-3 left-3 bg-paper px-3 py-1.5 rounded-m border-[2px] border-ink shadow-sticker text-xs font-display font-extrabold text-ink">
          📍 {activePin}
        </div>
      )}
    </div>
  );
}
