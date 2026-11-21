/**
 * @file entitlements.test.ts
 * @package @oddly/shared
 *
 * Unit tests for Stage M8 (Phase 10K) Entitlements Engine, Guardrails & Dark Pattern Linter.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";
}

import { PrismaClient } from "../db.js";
import {
  checkEntitlement,
  getPlayerEntitlements,
  FEATURE_FLAG_PREMIUM,
  ODDLY_PLUS_PLAN_KEY,
} from "./entitlements.js";
import {
  canShowPaywallOffer,
  recordPaywallEvent,
  lintDarkPatternCopy,
} from "./guardrails.js";

const prisma = new PrismaClient();

describe("Phase 10K: Entitlements Engine & Guardrail Monitor", () => {
  const testPlayerId = "test-p10k-player-001";
  const testSubscribedPlayerId = "test-p10k-player-002";
  const testCancelledPlayerId = "test-p10k-player-003";
  let planId: string;

  beforeAll(async () => {
    // 1. Ensure test players exist
    await prisma.player.upsert({
      where: { id: testPlayerId },
      update: {},
      create: { id: testPlayerId, did: "did:test:p10k-001", region: "IN", age_band: "18-24" },
    });
    await prisma.player.upsert({
      where: { id: testSubscribedPlayerId },
      update: {},
      create: { id: testSubscribedPlayerId, did: "did:test:p10k-002", region: "IN", age_band: "18-24" },
    });
    await prisma.player.upsert({
      where: { id: testCancelledPlayerId },
      update: {},
      create: { id: testCancelledPlayerId, did: "did:test:p10k-003", region: "IN", age_band: "18-24" },
    });

    // 2. Fetch or create Oddly Plus plan
    const plan = await prisma.plan.findUnique({
      where: { key: ODDLY_PLUS_PLAN_KEY },
    });
    if (!plan) {
      const createdPlan = await prisma.plan.create({
        data: {
          key: ODDLY_PLUS_PLAN_KEY,
          name_i18n: { en: "Oddly Plus" },
          description_i18n: { en: "Test Plan" },
          price_inr_cents: 7900,
          duration_days: 30,
          status: "active",
        },
      });
      planId = createdPlan.id;
    } else {
      planId = plan.id;
    }

    // Ensure streak_freeze entitlement exists on plan
    await prisma.entitlement.upsert({
      where: {
        plan_feature_unique: {
          plan_id: planId,
          feature_key: "streak_freeze",
        },
      },
      update: { config: { monthly_freezes: 2 } },
      create: {
        plan_id: planId,
        feature_key: "streak_freeze",
        config: { monthly_freezes: 2 },
      },
    });

    // Clean up test subscriptions & paywall events
    await prisma.subscription.deleteMany({
      where: {
        player_id: { in: [testPlayerId, testSubscribedPlayerId, testCancelledPlayerId] },
      },
    });
    await prisma.paywallEvent.deleteMany({
      where: {
        player_id: { in: [testPlayerId, testSubscribedPlayerId, testCancelledPlayerId] },
      },
    });
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({
      where: {
        player_id: { in: [testPlayerId, testSubscribedPlayerId, testCancelledPlayerId] },
      },
    });
    await prisma.paywallEvent.deleteMany({
      where: {
        player_id: { in: [testPlayerId, testSubscribedPlayerId, testCancelledPlayerId] },
      },
    });
    await prisma.$disconnect();
  });

  describe("P10K.02: checkEntitlement", () => {
    it("returns premium_disabled when feature.premium is false", async () => {
      await prisma.appConfig.upsert({
        where: { key: FEATURE_FLAG_PREMIUM },
        update: { value: "false" },
        create: { key: FEATURE_FLAG_PREMIUM, value: "false" },
      });

      const res = await checkEntitlement(prisma, testPlayerId, "streak_freeze");
      expect(res.entitled).toBe(false);
      expect(res.reason).toBe("premium_disabled");
    });

    it("evaluates active subscription when feature.premium is enabled", async () => {
      await prisma.appConfig.upsert({
        where: { key: FEATURE_FLAG_PREMIUM },
        update: { value: "true" },
        create: { key: FEATURE_FLAG_PREMIUM, value: "true" },
      });

      // Player with no subscription
      const unsub = await checkEntitlement(prisma, testPlayerId, "streak_freeze");
      expect(unsub.entitled).toBe(false);
      expect(unsub.reason).toBe("no_subscription");

      // Create active subscription for testSubscribedPlayerId
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.subscription.create({
        data: {
          player_id: testSubscribedPlayerId,
          plan_id: planId,
          status: "active",
          current_period_end: futureDate,
        },
      });

      const activeRes = await checkEntitlement(
        prisma,
        testSubscribedPlayerId,
        "streak_freeze"
      );
      expect(activeRes.entitled).toBe(true);
      expect(activeRes.reason).toBe("active_subscription");
      expect(activeRes.planKey).toBe(ODDLY_PLUS_PLAN_KEY);
      expect(activeRes.config).toEqual({ monthly_freezes: 2 });

      // Non-existent feature on same active plan
      const unlistedRes = await checkEntitlement(
        prisma,
        testSubscribedPlayerId,
        "non_existent_perk"
      );
      expect(unlistedRes.entitled).toBe(false);
      expect(unlistedRes.reason).toBe("feature_not_in_plan");
    });

    it("cancelled subscription retains entitlement until current_period_end", async () => {
      await prisma.appConfig.upsert({
        where: { key: FEATURE_FLAG_PREMIUM },
        update: { value: "true" },
        create: { key: FEATURE_FLAG_PREMIUM, value: "true" },
      });

      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await prisma.subscription.create({
        data: {
          player_id: testCancelledPlayerId,
          plan_id: planId,
          status: "cancelled",
          cancelled_at: new Date(),
          current_period_end: futureDate,
        },
      });

      const res = await checkEntitlement(
        prisma,
        testCancelledPlayerId,
        "streak_freeze"
      );
      expect(res.entitled).toBe(true);
      expect(res.reason).toBe("active_subscription");

      const allEntitlements = await getPlayerEntitlements(
        prisma,
        testCancelledPlayerId
      );
      expect(allEntitlements.active).toBe(true);
      expect(allEntitlements.isCancelled).toBe(true);
      expect(allEntitlements.entitlements.streak_freeze).toBeDefined();
    });
  });

  describe("P10K.03 & P10K.04: Paywall Guardrails & Rule 12 / Rule 17 Protections", () => {
    it("Rule 12: forbids paywall offers on Drop surfaces", async () => {
      const dropCheck = await canShowPaywallOffer(prisma, testPlayerId, "drop");
      expect(dropCheck.canShow).toBe(false);
      expect(dropCheck.reason).toBe("rule_12_drop_surface_forbidden");

      const flowCheck = await canShowPaywallOffer(
        prisma,
        testPlayerId,
        "drop_flow"
      );
      expect(flowCheck.canShow).toBe(false);
      expect(flowCheck.reason).toBe("rule_12_drop_surface_forbidden");
    });

    it("Rule 17: forbids paywall offers on broken streak moments", async () => {
      const streakCheck = await canShowPaywallOffer(
        prisma,
        testPlayerId,
        "broken_streak"
      );
      expect(streakCheck.canShow).toBe(false);
      expect(streakCheck.reason).toBe("rule_17_broken_streak_forbidden");
    });

    it("forbids offers to players who are already subscribed", async () => {
      const subscribedCheck = await canShowPaywallOffer(
        prisma,
        testSubscribedPlayerId,
        "me_settings"
      );
      expect(subscribedCheck.canShow).toBe(false);
      expect(subscribedCheck.reason).toBe("already_subscribed");
    });

    it("allows offer on neutral surface (me_settings) when eligible", async () => {
      await prisma.appConfig.upsert({
        where: { key: FEATURE_FLAG_PREMIUM },
        update: { value: "true" },
        create: { key: FEATURE_FLAG_PREMIUM, value: "true" },
      });

      const eligible = await canShowPaywallOffer(
        prisma,
        testPlayerId,
        "me_settings"
      );
      expect(eligible.canShow).toBe(true);
      expect(eligible.reason).toBe("allowed");
    });

    it("Rule 17: enforces 14-day frequency cap after offer_shown", async () => {
      // Record offer_shown 2 days ago
      await prisma.paywallEvent.create({
        data: {
          player_id: testPlayerId,
          surface: "me_settings",
          event_type: "offer_shown",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      const capped = await canShowPaywallOffer(
        prisma,
        testPlayerId,
        "me_settings"
      );
      expect(capped.canShow).toBe(false);
      expect(capped.reason).toBe("frequency_cap_14d");
      expect(capped.cooldownRemainingDays).toBeGreaterThan(0);
    });

    it("Rule 17: enforces 90-day dismissal halt after 2 dismissals", async () => {
      // Clear past events
      await prisma.paywallEvent.deleteMany({
        where: { player_id: testPlayerId },
      });

      // Record 2 dismissals
      await prisma.paywallEvent.createMany({
        data: [
          {
            player_id: testPlayerId,
            surface: "me_settings",
            event_type: "dismissed",
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            player_id: testPlayerId,
            surface: "archive_view",
            event_type: "dismissed",
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      const halted = await canShowPaywallOffer(
        prisma,
        testPlayerId,
        "archive_view"
      );
      expect(halted.canShow).toBe(false);
      expect(halted.reason).toBe("dismissal_halt_90d");
      expect(halted.dismissalHaltRemainingDays).toBeGreaterThan(0);
    });

    it("recordPaywallEvent throws if attempted on Drop or broken streak", async () => {
      await expect(
        recordPaywallEvent(prisma, testPlayerId, "drop", "offer_shown")
      ).rejects.toThrow("Rule 12 Violation");

      await expect(
        recordPaywallEvent(prisma, testPlayerId, "broken_streak", "offer_shown")
      ).rejects.toThrow("Rule 17 Violation");
    });
  });

  describe("P10K.04: Dark Pattern Copy Linter", () => {
    it("flags urgency words", () => {
      const res = lintDarkPatternCopy("Hurry up! This offer expires in 10 minutes!");
      expect(res.passed).toBe(false);
      expect(res.violations.some((v) => v.category === "urgency")).toBe(true);
    });

    it("flags guilt words", () => {
      const res = lintDarkPatternCopy("Don't let down the team, you'll regret missing out!");
      expect(res.passed).toBe(false);
      expect(res.violations.some((v) => v.category === "guilt")).toBe(true);
    });

    it("flags streak threat extortion copy", () => {
      const res = lintDarkPatternCopy("Your streak will die if you do not upgrade right now!");
      expect(res.passed).toBe(false);
      expect(res.violations.some((v) => v.category === "streak_threat")).toBe(true);
    });

    it("passes clean, calm, informative copy conforming to Rule 17", () => {
      const res = lintDarkPatternCopy(
        "Oddly Plus provides 2 monthly streak freezes, full archive access, and bespoke themes. Cancel anytime in one tap."
      );
      expect(res.passed).toBe(true);
      expect(res.violations).toHaveLength(0);
    });
  });
});
