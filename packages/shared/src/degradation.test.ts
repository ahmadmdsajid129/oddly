/**
 * @file degradation.test.ts
 * Tests for Degradation Ladder Controller Logic (R2.5, Section 6, R2-PATCH-2 Item 5)
 *
 * Verifies:
 * - Signal threshold mapping (L0 to L3)
 * - Up-fast escalation: 6 consecutive 10s ticks (60s) needed to step up
 * - Down-slow hysteresis: 30 consecutive healthy ticks (300s = 5 min) needed to step down 1 level
 * - Interrupted stress resets the up-fast counter
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DegradationController, SystemHealthSignals } from "./degradation";

describe("DegradationController (R2.5 & Addendum Section 6)", () => {
  const healthySignals: SystemHealthSignals = {
    eventLoopDelayMs: 5,
    p95SubmitLatencyMs: 120,
    queueDepth: 10,
    errorRatePercent: 0.1,
  };

  const l1Signals: SystemHealthSignals = {
    eventLoopDelayMs: 30, // > 25ms
    p95SubmitLatencyMs: 200,
    queueDepth: 50,
    errorRatePercent: 0.1,
  };

  const l2Signals: SystemHealthSignals = {
    eventLoopDelayMs: 60, // > 50ms
    p95SubmitLatencyMs: 1200, // > 1000ms
    queueDepth: 1200,
    errorRatePercent: 2.5,
  };

  const l3Signals: SystemHealthSignals = {
    eventLoopDelayMs: 150, // > 100ms
    p95SubmitLatencyMs: 2500, // > 2000ms
    queueDepth: 6000, // > 5000
    errorRatePercent: 6.0, // > 5%
  };

  beforeEach(() => {
    DegradationController.setLevel(0);
  });

  describe("Signal Evaluation", () => {
    it("evaluates healthy signals to L0", () => {
      expect(DegradationController.evaluateSignals(healthySignals)).toBe(0);
    });

    it("evaluates L1 stress signals correctly across triggers", () => {
      expect(DegradationController.evaluateSignals(l1Signals)).toBe(1);
      expect(
        DegradationController.evaluateSignals({
          ...healthySignals,
          p95SubmitLatencyMs: 600, // > 500ms
        })
      ).toBe(1);
      expect(
        DegradationController.evaluateSignals({
          ...healthySignals,
          queueDepth: 300, // > 200
        })
      ).toBe(1);
      expect(
        DegradationController.evaluateSignals({
          ...healthySignals,
          errorRatePercent: 0.8, // > 0.5%
        })
      ).toBe(1);
    });

    it("evaluates L2 stress signals correctly", () => {
      expect(DegradationController.evaluateSignals(l2Signals)).toBe(2);
    });

    it("evaluates L3 stress signals correctly", () => {
      expect(DegradationController.evaluateSignals(l3Signals)).toBe(3);
    });
  });

  describe("Hysteresis & Escalation Timing", () => {
    it("escalates up-fast only after 6 consecutive ticks (60s) of stress", () => {
      expect(DegradationController.getLevel()).toBe(0);

      // Ticks 1 to 5: no level change
      for (let i = 1; i <= 5; i++) {
        const result = DegradationController.tick(l2Signals);
        expect(result.changed).toBe(false);
        expect(result.level).toBe(0);
        expect(DegradationController.getLevel()).toBe(0);
      }

      // Tick 6: escalates to L2
      const result6 = DegradationController.tick(l2Signals);
      expect(result6.changed).toBe(true);
      expect(result6.level).toBe(2);
      expect(DegradationController.getLevel()).toBe(2);
    });

    it("resets up-fast counter if stress is interrupted before 6 ticks", () => {
      // 3 ticks under L2 stress
      for (let i = 0; i < 3; i++) {
        DegradationController.tick(l2Signals);
      }
      expect(DegradationController.getLevel()).toBe(0);

      // 1 tick healthy: resets highStressTicks
      DegradationController.tick(healthySignals);
      expect(DegradationController.getLevel()).toBe(0);

      // Another 5 ticks under L2 stress: still not enough (needs 6 consecutive)
      for (let i = 0; i < 5; i++) {
        const res = DegradationController.tick(l2Signals);
        expect(res.changed).toBe(false);
        expect(res.level).toBe(0);
      }

      // 6th tick: now it escalates
      const res6 = DegradationController.tick(l2Signals);
      expect(res6.changed).toBe(true);
      expect(res6.level).toBe(2);
    });

    it("de-escalates down-slow: requires 30 consecutive healthy ticks (300s = 5 min) to step down 1 level", () => {
      DegradationController.setLevel(2);
      expect(DegradationController.getLevel()).toBe(2);

      // Ticks 1 to 29: level remains at 2
      for (let i = 1; i <= 29; i++) {
        const res = DegradationController.tick(healthySignals);
        expect(res.changed).toBe(false);
        expect(res.level).toBe(2);
      }

      // Tick 30: steps down by 1 level to L1
      const res30 = DegradationController.tick(healthySignals);
      expect(res30.changed).toBe(true);
      expect(res30.level).toBe(1);
      expect(DegradationController.getLevel()).toBe(1);

      // Next 29 ticks: remains at L1
      for (let i = 1; i <= 29; i++) {
        const res = DegradationController.tick(healthySignals);
        expect(res.changed).toBe(false);
        expect(res.level).toBe(1);
      }

      // Next 30th tick: steps down to L0
      const res60 = DegradationController.tick(healthySignals);
      expect(res60.changed).toBe(true);
      expect(res60.level).toBe(0);
      expect(DegradationController.getLevel()).toBe(0);

      // Further healthy ticks stay at L0 without error
      const resPost = DegradationController.tick(healthySignals);
      expect(resPost.changed).toBe(false);
      expect(resPost.level).toBe(0);
    });
  });
});

