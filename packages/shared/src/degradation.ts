/**
 * @file degradation.ts
 * @package @oddly/shared
 *
 * Degradation Ladder Controller Logic (R2.5 & Addendum Section 6)
 *
 * Rules:
 * - Runs every 10 seconds (single distributed leader lock)
 * - Evaluates signals: event-loop delay, in-process p95 submit latency, queue lag, error rate
 * - Up fast (1 minute = 6 ticks of persistent strain escalates level)
 * - Down slow (5 consecutive healthy minutes = 30 ticks required to step down 1 level)
 * - Writes app_config.degradation_level and emits alerts
 */

export interface SystemHealthSignals {
  eventLoopDelayMs: number;
  p95SubmitLatencyMs: number;
  queueDepth: number;
  errorRatePercent: number;
}

export class DegradationController {
  private static currentLevel = 0;
  private static highStressTicks = 0;   // 10s ticks under strain
  private static healthyTicks = 0;      // 10s ticks under normal health

  static getLevel(): number {
    return this.currentLevel;
  }

  static setLevel(level: number): void {
    this.currentLevel = level;
    this.highStressTicks = 0;
    this.healthyTicks = 0;
  }

  /**
   * Computes desired level from real health signals.
   */
  static evaluateSignals(signals: SystemHealthSignals): number {
    // Addendum Section 6 Trigger Thresholds:
    // L3: event loop > 100ms OR p95 > 2000ms OR queue depth > 5000 OR error rate > 5%
    if (
      signals.eventLoopDelayMs > 100 ||
      signals.p95SubmitLatencyMs > 2000 ||
      signals.queueDepth > 5000 ||
      signals.errorRatePercent > 5
    ) {
      return 3;
    }

    // L2: event loop > 50ms OR p95 > 1000ms OR queue depth > 1000 OR error rate > 2%
    if (
      signals.eventLoopDelayMs > 50 ||
      signals.p95SubmitLatencyMs > 1000 ||
      signals.queueDepth > 1000 ||
      signals.errorRatePercent > 2
    ) {
      return 2;
    }

    // L1: event loop > 25ms OR p95 > 500ms OR queue depth > 200 OR error rate > 0.5%
    if (
      signals.eventLoopDelayMs > 25 ||
      signals.p95SubmitLatencyMs > 500 ||
      signals.queueDepth > 200 ||
      signals.errorRatePercent > 0.5
    ) {
      return 1;
    }

    return 0; // L0 Normal
  }

  /**
   * Evaluates hysteresis:
   * Up fast: 6 consecutive 10s ticks (60s = 1 min) escalates level
   * Down slow: 30 consecutive healthy 10s ticks (300s = 5 min) steps down 1 level
   */
  static tick(signals: SystemHealthSignals): { level: number; changed: boolean } {
    const targetLevel = this.evaluateSignals(signals);

    if (targetLevel > this.currentLevel) {
      this.highStressTicks++;
      this.healthyTicks = 0;

      // Up fast: 6 ticks (60s)
      if (this.highStressTicks >= 6) {
        this.currentLevel = targetLevel;
        this.highStressTicks = 0;
        console.warn(`[Degradation Escalated] Up fast trigger -> New Level: L${this.currentLevel}`);
        return { level: this.currentLevel, changed: true };
      }
    } else if (targetLevel < this.currentLevel) {
      this.healthyTicks++;
      this.highStressTicks = 0;

      // Down slow: 30 ticks (300s = 5 min)
      if (this.healthyTicks >= 30) {
        this.currentLevel = Math.max(0, this.currentLevel - 1);
        this.healthyTicks = 0;
        console.log(`[Degradation De-escalated] Down slow trigger -> New Level: L${this.currentLevel}`);
        return { level: this.currentLevel, changed: true };
      }
    } else {
      // Maintaining current level
      this.highStressTicks = 0;
      this.healthyTicks = 0;
    }

    return { level: this.currentLevel, changed: false };
  }
}

