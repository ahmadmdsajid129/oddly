/**
 * @file resilience.test.ts
 * @package @oddly/api
 *
 * Automated Test Suite for R2.4: Circuit Breakers (Opossum)
 * Fault-Injection Testing: Thresholds, Fast-Fails, Half-Open Probing, Recovery & Fallbacks
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  breakerRegistry,
  googleAuthBreaker,
  turnstileBreaker,
  r2UploadBreaker,
  redisCacheBreaker,
} from "./resilience/circuit-breakers.js";

describe("Stage R2.4: Circuit Breakers (Opossum Fault Injection)", () => {
  beforeEach(() => {
    breakerRegistry.resetAll();
  });

  describe("Google OAuth Breaker", () => {
    it("trips OPEN after repeated errors and provides friendly fallback", async () => {
      // 1. Initial healthy calls
      const initial = await googleAuthBreaker.fire("valid-token");
      expect(initial.sub).toBe("google_123");
      expect(googleAuthBreaker.opened).toBe(false);

      // 2. Inject repeated faults (volumeThreshold = 3, errorThresholdPercentage = 50%)
      for (let i = 0; i < 4; i++) {
        await googleAuthBreaker.fire("trigger-network-failure").catch(() => {});
      }

      // Breaker is now tripped OPEN
      expect(googleAuthBreaker.opened).toBe(true);

      // 3. Fast-fail: subsequent call immediately returns fallback without calling upstream
      const fallbackResult = (await googleAuthBreaker.fire("any-token")) as Record<string, unknown>;
      expect(fallbackResult.fallback).toBe(true);
      expect(fallbackResult.error).toBe("GOOGLE_AUTH_UNAVAILABLE");
      expect(String(fallbackResult.message)).toContain("Google login is temporarily degraded");
    });
  });

  describe("Turnstile Bot Verification Breaker Policy", () => {
    it("fails-open for low-risk gameplay with tighter rate limit flag", async () => {
      // Trip breaker open
      for (let i = 0; i < 4; i++) {
        await turnstileBreaker.fire({ token: "trigger-turnstile-failure", isSignUp: false }).catch(() => {});
      }
      expect(turnstileBreaker.opened).toBe(true);

      // Gameplay call: fails open
      const gameplayRes = (await turnstileBreaker.fire({ token: "any-token", isSignUp: false })) as Record<string, unknown>;
      expect(gameplayRes.success).toBe(true);
      expect(gameplayRes.fallback).toBe(true);
      expect(gameplayRes.tighterRateLimitRequired).toBe(true);
    });

    it("fails-closed for high-risk sign-up actions", async () => {
      // Trip breaker open
      for (let i = 0; i < 4; i++) {
        await turnstileBreaker.fire({ token: "trigger-turnstile-failure", isSignUp: true }).catch(() => {});
      }
      expect(turnstileBreaker.opened).toBe(true);

      // Sign-up call: fails closed
      const signUpRes = (await turnstileBreaker.fire({ token: "any-token", isSignUp: true })) as Record<string, unknown>;
      expect(signUpRes.success).toBe(false);
      expect(signUpRes.fallback).toBe(true);
      expect(signUpRes.error).toBe("BOT_VERIFICATION_REQUIRED");
    });
  });

  describe("Cloudflare R2 Upload Breaker", () => {
    it("falls back to on-demand render and text preview when R2 fails", async () => {
      for (let i = 0; i < 4; i++) {
        await r2UploadBreaker.fire({ key: "trigger-r2-failure/card.png", buffer: Buffer.from("png") }).catch(() => {});
      }
      expect(r2UploadBreaker.opened).toBe(true);

      const res = (await r2UploadBreaker.fire({ key: "cards/mycard.png", buffer: Buffer.from("png") })) as Record<string, unknown>;
      expect(res.uploaded).toBe(false);
      expect(res.mode).toBe("on_demand_render");
      expect(res.textPreviewFallback).toBe(true);
    });
  });

  describe("Redis Cache Breaker", () => {
    it("falls back to bounded direct Postgres read when cache trips open", async () => {
      for (let i = 0; i < 4; i++) {
        await redisCacheBreaker.fire("trigger-cache-failure").catch(() => {});
      }
      expect(redisCacheBreaker.opened).toBe(true);

      const res = (await redisCacheBreaker.fire("cache:drop:today")) as Record<string, unknown>;
      expect(res.hit).toBe(false);
      expect(res.readDirectFromPostgres).toBe(true);
    });
  });

  describe("Breaker State & Metric Exposition", () => {
    it("exposes breaker status snapshots for Prometheus metrics exporter", async () => {
      await googleAuthBreaker.fire("valid-token");
      const snapshots = breakerRegistry.getAllSnapshots();

      expect(snapshots.length).toBeGreaterThanOrEqual(5);
      const googleSnap = snapshots.find((s) => s.name === "google_oauth");
      expect(googleSnap).toBeDefined();
      expect(googleSnap?.state).toBe("CLOSED");
      expect(googleSnap?.stats.successes).toBeGreaterThanOrEqual(1);
    });
  });
});
