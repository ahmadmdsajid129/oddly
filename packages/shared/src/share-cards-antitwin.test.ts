import { describe, expect, it } from "vitest";
import {
  renderAntiTwinCardPng,
  renderOrbitCardPng,
  type AntiTwinShareCardData,
  type OrbitShareCardData,
} from "./share-cards.js";

describe("Anti-Twin & Orbit Satori Share Cards (Stage F4 / Tasks P10D.05, P10D.06)", () => {
  const isPng = (buf: Buffer) =>
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  it("renders valid Anti-Twin front card PNG with PNG signature", async () => {
    const data: AntiTwinShareCardData = {
      differedCount: 5,
      total: 5,
      oppositeLocation: "Berlin, Germany",
      oppositeAgeBand: "25-34",
      sampleSize: 2000,
      shortId: "antiTest1",
      side: "front",
    };

    const buf = await renderAntiTwinCardPng(data);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
    expect(isPng(buf)).toBe(true);
  });

  it("renders valid Anti-Twin sealed back card PNG with PNG signature", async () => {
    const data: AntiTwinShareCardData = {
      differedCount: 4,
      total: 5,
      oppositeLocation: "Tokyo, Japan",
      oppositeAgeBand: "18-24",
      sampleSize: 2000,
      shortId: "antiTest2",
      side: "back",
    };

    const buf = await renderAntiTwinCardPng(data);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
    expect(isPng(buf)).toBe(true);
  });

  it("renders valid Day 14 Orbit milestone card PNG with PNG signature", async () => {
    const data: OrbitShareCardData = {
      milestoneDay: 14,
      coStreakDays: 14,
      partnerLocation: "London, UK",
      partnerAgeBand: "25-34",
      shortId: "orbitDay14",
      side: "front",
    };

    const buf = await renderOrbitCardPng(data);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
    expect(isPng(buf)).toBe(true);
  });

  it("renders valid Day 30 Orbit anniversary card PNG with PNG signature", async () => {
    const data: OrbitShareCardData = {
      milestoneDay: 30,
      coStreakDays: 30,
      partnerLocation: "Paris, France",
      partnerAgeBand: "25-34",
      shortId: "orbitDay30",
      side: "back",
    };

    const buf = await renderOrbitCardPng(data);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
    expect(isPng(buf)).toBe(true);
  });
});
