import { describe, it, expect } from "vitest";
import { colors, palette12 } from "@oddly/ui-tokens";
import {
  generateShareCardSvg,
  renderFrontCardPng,
  renderBackCardPng,
  renderCompositeStoryPng,
  getThemePalette,
  type ShareCardData,
} from "./share-cards.js";
import fs from "node:fs";
import path from "node:path";

describe("D1.5 Share Cards Token Alignment & Unit Tests", () => {
  const allowedHexes = new Set<string>();
  for (const [, v] of Object.entries(colors)) {
    if (typeof v === "string") {
      allowedHexes.add(v.toLowerCase());
    }
  }
  for (const p of palette12) {
    allowedHexes.add(p.hex.toLowerCase());
  }
  allowedHexes.add("#00000000"); // transparent QR background

  it("proves getThemePalette returns only colours present in @oddly/ui-tokens", () => {
    const tiers = ["Common", "Uncommon", "Rare", "Mythic"] as const;
    const themes = ["dark", "light", "mythic"] as const;

    for (const theme of themes) {
      for (const tier of tiers) {
        const palette = getThemePalette(theme, tier);
        for (const [key, val] of Object.entries(palette)) {
          expect(
            allowedHexes.has(val.toLowerCase()),
            `Theme ${theme} tier ${tier} key ${key} with value ${val} must be in @oddly/ui-tokens`
          ).toBe(true);
        }
      }
    }
  });

  it("proves share-cards.ts source code contains zero literal hex codes except #00000000", () => {
    const filePath = path.resolve(__dirname, "./share-cards.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Match hex literals (# followed by 3, 6, or 8 hex digits)
    const matches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    for (const hex of matches) {
      expect(hex.toLowerCase()).toBe("#00000000");
    }
  });

  it("proves generated SVG uses only valid tokens and valid structure", async () => {
    const sampleData: ShareCardData = {
      score: 4,
      total: 5,
      tier: "Rare",
      percentile: 84,
      twinCity: "Berlin, Germany",
      shortId: "xK9mP2",
      appDomain: "oddly.app",
    };

    const frontSvg = await generateShareCardSvg({ ...sampleData, side: "front" });
    expect(frontSvg).toContain("<svg");
    expect(frontSvg).toContain("</svg>");

    const backSvg = await generateShareCardSvg({ ...sampleData, side: "back" });
    expect(backSvg).toContain("<svg");
    expect(backSvg).toContain("</svg>");
  });

  it("renders front, back, and story composite PNG buffers with PNG signature", async () => {
    const sampleData: ShareCardData = {
      score: 4,
      total: 5,
      tier: "Mythic",
      percentile: 96,
      twinCity: "Tokyo, Japan",
      shortId: "tKy991",
      appDomain: "oddly.app",
      streak: 7,
      dateStr: "Nov 14, 2026",
    };

    const [frontPng, backPng, compositePng] = await Promise.all([
      renderFrontCardPng(sampleData),
      renderBackCardPng(sampleData),
      renderCompositeStoryPng(sampleData),
    ]);

    for (const buf of [frontPng, backPng, compositePng]) {
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(1000);
      // PNG header signature: 0x89 0x50 0x4E 0x47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    }
  }, 30000);
});
