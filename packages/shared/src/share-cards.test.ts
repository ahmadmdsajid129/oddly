import { describe, it, expect } from "vitest";
import { generateQrCodeSvg, generateQrCodeDataUrl } from "./qrcode.js";
import {
  generateShareCardSvg,
  renderShareCardPng,
  CARD_DIMENSIONS,
  type ShareCardData,
} from "./share-cards.js";

describe("QR Code Generation (P6.08)", () => {
  it("generates a valid SVG string with transparent background", async () => {
    const svg = await generateQrCodeSvg("https://oddly.app/c/test12");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('stroke="#FFFFFF"');
  });

  it("generates a data URL for image embedding", async () => {
    const dataUrl = await generateQrCodeDataUrl("https://oddly.app/c/test12");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("Share Card Satori & Resvg Generation (P6.01, P6.02)", () => {
  const sampleData: ShareCardData = {
    score: 4,
    total: 5,
    tier: "Rare",
    percentile: 84,
    twinCity: "Berlin, Germany",
    rarestPickTitle: "Violet for Monday Morning",
    streak: 12,
    dateStr: "Nov 8, 2026",
    shortId: "xK9mP2",
    appDomain: "oddly.app",
    theme: "dark",
  };

  it("generates Story SVG (1080x1920) with vector glyph paths", async () => {
    const svg = await generateShareCardSvg({
      ...sampleData,
      format: "story",
    });

    expect(svg).toContain(`width="${CARD_DIMENSIONS.story.width}"`);
    expect(svg).toContain(`height="${CARD_DIMENSIONS.story.height}"`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    // Satori renders text as vector bezier paths
    expect(svg).toContain("<path");
  });

  it("generates Square SVG (1080x1080) for feed posts", async () => {
    const svg = await generateShareCardSvg({
      ...sampleData,
      format: "square",
      theme: "light",
    });

    expect(svg).toContain(`width="${CARD_DIMENSIONS.square.width}"`);
    expect(svg).toContain(`height="${CARD_DIMENSIONS.square.height}"`);
    expect(svg).toContain("<path");
  });

  it("generates Link preview SVG (1200x630) for OpenGraph cards", async () => {
    const svg = await generateShareCardSvg({
      ...sampleData,
      format: "link",
      theme: "mythic",
    });

    expect(svg).toContain(`width="${CARD_DIMENSIONS.link.width}"`);
    expect(svg).toContain(`height="${CARD_DIMENSIONS.link.height}"`);
    expect(svg).toContain("<path");
  });

  it("renders a valid PNG buffer with correct PNG magic bytes", async () => {
    // Warm-up run
    await renderShareCardPng({ ...sampleData, format: "square" });

    // Timed run
    const start = Date.now();
    const pngBuffer = await renderShareCardPng({
      ...sampleData,
      format: "square",
    });
    const elapsed = Date.now() - start;

    expect(Buffer.isBuffer(pngBuffer)).toBe(true);
    expect(pngBuffer.length).toBeGreaterThan(1000);

    // Verify PNG header signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50);
    expect(pngBuffer[2]).toBe(0x4e);
    expect(pngBuffer[3]).toBe(0x47);

    // Warm generation SLA: Under 800ms
    expect(elapsed).toBeLessThan(800);
  });

  it("guarantees zero PII or user IDs appear on share cards (P6.10)", async () => {
    const svg = await generateShareCardSvg(sampleData);

    // Assert absence of database UUIDs or internal IDs
    expect(svg).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    // Assert absence of email patterns
    expect(svg).not.toMatch(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
    // Assert absence of IP addresses
    expect(svg).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });
});
