/**
 * @file subscriptions-invariants.integration.test.ts
 * @package @oddly/api
 *
 * Integration & Invariants Test Suite for Stage M8 (Phase 10K):
 * Premium Groundwork, Single-Tap Cancellation & Rule 17 Guardrails.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildServer } from "./server.js";
import { prisma } from "./db/client.js";
import { randomUUID } from "node:crypto";
import { FEATURE_FLAG_PREMIUM, ODDLY_PLUS_PLAN_KEY } from "@oddly/shared";

describe("Stage M8 (Phase 10K): Subscriptions & Guardrail Invariants Integration", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  const testId = randomUUID().slice(0, 8);
  const testPlayerId = `player_sub_${testId}`;
  let createdSubId = "";

  beforeAll(async () => {
    app = await buildServer({ logger: false, testing: true });
    await app.ready();

    // Ensure test player exists
    await prisma.player.upsert({
      where: { id: testPlayerId },
      update: {},
      create: {
        id: testPlayerId,
        did: `did:test:${testId}`,
        region: "IN",
        age_band: "18-24",
      },
    });

    // Ensure feature.premium is enabled for integration testing
    await prisma.appConfig.upsert({
      where: { key: FEATURE_FLAG_PREMIUM },
      update: { value: "true" },
      create: { key: FEATURE_FLAG_PREMIUM, value: "true" },
    });
  });

  afterAll(async () => {
    if (createdSubId) {
      await prisma.subscription.deleteMany({
        where: { id: createdSubId },
      });
    }
    await prisma.paywallEvent.deleteMany({
      where: { player_id: testPlayerId },
    });
    await prisma.subscription.deleteMany({
      where: { player_id: testPlayerId },
    });
    await prisma.player.deleteMany({
      where: { id: testPlayerId },
    });
    await app.close();
  });

  it("GET /v1/plans returns active subscription catalogue and INR price", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/plans",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.plans)).toBe(true);
    expect(body.plans.length).toBeGreaterThan(0);

    const oddlyPlus = body.plans.find((p: { key: string }) => p.key === ODDLY_PLUS_PLAN_KEY);
    expect(oddlyPlus).toBeDefined();
    expect(oddlyPlus.price_inr_cents).toBe(7900); // ₹79.00
    expect(oddlyPlus.entitlements.some((e: { feature_key: string }) => e.feature_key === "streak_freeze")).toBe(true);
  });

  it("GET /v1/me/subscription returns has_subscription: false when unsubscribed", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/me/subscription",
      headers: {
        "x-player-id": testPlayerId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.has_subscription).toBe(false);
    expect(body.can_cancel).toBe(false);
  });

  it("POST /v1/subscriptions/subscribe activates subscription with 30-day period", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/subscriptions/subscribe",
      headers: {
        "x-player-id": testPlayerId,
      },
      payload: {
        plan_key: ODDLY_PLUS_PLAN_KEY,
        provider: "mock",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.plan_key).toBe(ODDLY_PLUS_PLAN_KEY);
    createdSubId = body.subscription.id;

    // Verify GET /v1/me/subscription reflects active state
    const meRes = await app.inject({
      method: "GET",
      url: "/v1/me/subscription",
      headers: {
        "x-player-id": testPlayerId,
      },
    });
    const meBody = JSON.parse(meRes.body);
    expect(meBody.has_subscription).toBe(true);
    expect(meBody.status).toBe("active");
    expect(meBody.is_cancelled).toBe(false);
    expect(meBody.can_cancel).toBe(true);
    expect(meBody.entitlements.streak_freeze).toBeDefined();
  });

  it("POST /v1/subscriptions/cancel executes single-tap cancellation without dark patterns (Rule 17)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/subscriptions/cancel",
      headers: {
        "x-player-id": testPlayerId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.message).toContain("Subscription cancelled successfully");
    expect(body.cancelled_at).toBeDefined();
    expect(body.access_until).toBeDefined();

    // Verify GET /v1/me/subscription indicates cancelled status but access retained
    const meRes = await app.inject({
      method: "GET",
      url: "/v1/me/subscription",
      headers: {
        "x-player-id": testPlayerId,
      },
    });
    const meBody = JSON.parse(meRes.body);
    expect(meBody.has_subscription).toBe(true);
    expect(meBody.status).toBe("cancelled");
    expect(meBody.is_cancelled).toBe(true);
    expect(meBody.can_cancel).toBe(false);
    // User retains entitlement access until period end
    expect(meBody.entitlements.streak_freeze).toBeDefined();
  });

  it("POST /v1/subscriptions/cancel returns 400 when no active subscription exists", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/subscriptions/cancel",
      headers: {
        "x-player-id": testPlayerId,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("NO_ACTIVE_SUBSCRIPTION");
  });

  it("POST /v1/subscriptions/webhook updates subscription state on provider events", async () => {
    // 1. Re-activate subscription with webhook charged event
    const resCharged = await app.inject({
      method: "POST",
      url: "/v1/subscriptions/webhook",
      payload: {
        event: "subscription.charged",
        subscription_id: createdSubId,
      },
    });

    expect(resCharged.statusCode).toBe(200);
    const chargedBody = JSON.parse(resCharged.body);
    expect(chargedBody.ok).toBe(true);
    expect(chargedBody.handled).toBe(true);

    const sub = await prisma.subscription.findUnique({
      where: { id: createdSubId },
    });
    expect(sub?.status).toBe("active");

    // 2. Halt subscription with webhook halted event
    const resHalted = await app.inject({
      method: "POST",
      url: "/v1/subscriptions/webhook",
      payload: {
        event: "subscription.halted",
        subscription_id: createdSubId,
      },
    });

    expect(resHalted.statusCode).toBe(200);
    const haltedSub = await prisma.subscription.findUnique({
      where: { id: createdSubId },
    });
    expect(haltedSub?.status).toBe("past_due");
  });

  describe("Paywall Surface Protections (Rule 12 & Rule 17)", () => {
    it("GET /v1/paywall/eligibility rejects Drop surface (Rule 12)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/paywall/eligibility?surface=drop",
        headers: {
          "x-player-id": testPlayerId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.eligibility.canShow).toBe(false);
      expect(body.eligibility.reason).toBe("rule_12_drop_surface_forbidden");
    });

    it("GET /v1/paywall/eligibility rejects broken streak surface (Rule 17)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/paywall/eligibility?surface=broken_streak",
        headers: {
          "x-player-id": testPlayerId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.eligibility.canShow).toBe(false);
      expect(body.eligibility.reason).toBe("rule_17_broken_streak_forbidden");
    });

    it("POST /v1/paywall/event rejects attempt to record event on Drop surface", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/paywall/event",
        headers: {
          "x-player-id": testPlayerId,
        },
        payload: {
          surface: "drop",
          event_type: "offer_shown",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("GUARDRAIL_VIOLATION");
    });

    it("POST /v1/paywall/event records valid event on neutral surface and triggers frequency cap", async () => {
      // 1. Record offer_shown on me_settings
      const recordRes = await app.inject({
        method: "POST",
        url: "/v1/paywall/event",
        headers: {
          "x-player-id": testPlayerId,
        },
        payload: {
          surface: "me_settings",
          event_type: "offer_shown",
        },
      });

      expect(recordRes.statusCode).toBe(200);
      const recordBody = JSON.parse(recordRes.body);
      expect(recordBody.ok).toBe(true);
      expect(recordBody.event_id).toBeDefined();

      // 2. Query eligibility on neutral surface -> frequency cap should block offer
      const checkRes = await app.inject({
        method: "GET",
        url: "/v1/paywall/eligibility?surface=me_settings",
        headers: {
          "x-player-id": testPlayerId,
        },
      });

      expect(checkRes.statusCode).toBe(200);
      const checkBody = JSON.parse(checkRes.body);
      expect(checkBody.ok).toBe(true);
      expect(checkBody.eligibility.canShow).toBe(false);
      expect(checkBody.eligibility.reason).toBe("frequency_cap_14d");
      expect(checkBody.eligibility.cooldownRemainingDays).toBeGreaterThan(0);
    });
  });
});

