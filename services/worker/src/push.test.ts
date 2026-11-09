/**
 * @file push.test.ts
 * @package @oddly/worker
 *
 * Automated test suite for Stage 10 Push Notifications (P10.03, P10.04, P10.05, P10.06, P10.10).
 * Verifies delivery policy (cap & quiet hours), twin upgrade triggers, templates, and sendPush processor.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isQuietHour,
  evaluatePushPolicy,
  MAX_PUSHES_PER_DAY,
  getIstTime,
} from "./push/policy.js";
import {
  shouldTriggerTwinUpgrade,
  MIN_SIMILARITY_DELTA,
  MAX_UPGRADE_PUSHES_PER_DAY,
} from "./push/triggers.js";
import { buildPushPayload } from "./push/templates.js";
import { processSendPushJob, type SendPushJobData } from "./jobs/send-push.js";
import type { Job } from "bullmq";
import { webpush } from "./push/vapid.js";

// Mock web-push for controlled job execution
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe("Stage 10: Push Notifications Engine (P10.03 - P10.10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Delivery Constraints & Quiet Hours (P10.05)
  // -------------------------------------------------------------------------
  describe("Push Delivery Constraints & Quiet Hours (P10.05)", () => {
    it("should correctly convert UTC timestamps into Indian Standard Time (IST, UTC+05:30)", () => {
      // 01:30 UTC = 07:00 IST
      const utcDate = new Date("2026-11-09T01:30:00.000Z");
      const ist = getIstTime(utcDate);
      expect(ist.hours).toBe(7);
      expect(ist.minutes).toBe(0);

      // 16:30 UTC = 22:00 IST
      const utcDateNight = new Date("2026-11-09T16:30:00.000Z");
      const istNight = getIstTime(utcDateNight);
      expect(istNight.hours).toBe(22);
      expect(istNight.minutes).toBe(0);
    });

    it("should identify 22:00 - 07:00 IST as quiet hours", () => {
      // 23:00 IST (17:30 UTC) -> Quiet
      const nightDate = new Date("2026-11-09T17:30:00.000Z");
      expect(isQuietHour(nightDate)).toBe(true);

      // 03:00 IST (21:30 UTC previous day) -> Quiet
      const earlyMorningDate = new Date("2026-11-08T21:30:00.000Z");
      expect(isQuietHour(earlyMorningDate)).toBe(true);

      // 06:59 IST (01:29 UTC) -> Quiet
      const justBeforeSevenDate = new Date("2026-11-09T01:29:00.000Z");
      expect(isQuietHour(justBeforeSevenDate)).toBe(true);

      // 07:00 IST (01:30 UTC) -> Active (Not quiet)
      const dropTimeDate = new Date("2026-11-09T01:30:00.000Z");
      expect(isQuietHour(dropTimeDate)).toBe(false);

      // 14:00 IST (08:30 UTC) -> Active (Not quiet)
      const afternoonDate = new Date("2026-11-09T08:30:00.000Z");
      expect(isQuietHour(afternoonDate)).toBe(false);
    });

    it("should enforce the strict 2-pushes-per-user-per-day ceiling", () => {
      const activeDate = new Date("2026-11-09T08:30:00.000Z"); // 14:00 IST

      // 0 pushes today -> Allowed
      const decision0 = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: 0,
        date: activeDate,
      });
      expect(decision0.allowed).toBe(true);

      // 1 push today -> Allowed
      const decision1 = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: 1,
        date: activeDate,
      });
      expect(decision1.allowed).toBe(true);

      // 2 pushes today -> Blocked by 2-per-day cap
      const decision2 = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: MAX_PUSHES_PER_DAY,
        date: activeDate,
      });
      expect(decision2.allowed).toBe(false);
      expect(decision2.reason).toContain("Daily push limit reached");

      // 3 pushes today -> Blocked
      const decision3 = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: 3,
        date: activeDate,
      });
      expect(decision3.allowed).toBe(false);
    });

    it("should block dispatch during quiet hours even when under daily cap", () => {
      const nightDate = new Date("2026-11-09T18:00:00.000Z"); // 23:30 IST

      const decision = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: 0,
        date: nightDate,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("quiet hours");
    });

    it("should block dispatch if user disabled push notifications in preferences", () => {
      const activeDate = new Date("2026-11-09T08:30:00.000Z"); // 14:00 IST

      const decision = evaluatePushPolicy({
        playerId: "player-1",
        currentPushesToday: 0,
        date: activeDate,
        notificationsEnabled: false,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("disabled push notifications");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Twin Upgrade Triggers (P10.06)
  // -------------------------------------------------------------------------
  describe("Twin Upgrade Push Trigger (P10.06)", () => {
    it("should trigger upgrade push when similarity delta ΔS ≥ 0.10", () => {
      const decision = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: {
          similarity: 0.60,
          matchedCount: 3,
        },
        newMatch: {
          similarity: 0.72, // +0.12 (>= 0.10)
          matchedCount: 3,
        },
        upgradePushesToday: 0,
      });

      expect(decision.shouldTrigger).toBe(true);
      expect(decision.deltaS).toBeGreaterThanOrEqual(MIN_SIMILARITY_DELTA);
    });

    it("should trigger upgrade push when matched picks jump to 4 or 5", () => {
      // Jump from 3 to 4 picks
      const decisionJump4 = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: {
          similarity: 0.70,
          matchedCount: 3,
        },
        newMatch: {
          similarity: 0.75, // +0.05 (< 0.10), but picks jumped 3 -> 4
          matchedCount: 4,
        },
        upgradePushesToday: 0,
      });

      expect(decisionJump4.shouldTrigger).toBe(true);
      expect(decisionJump4.isPickJump).toBe(true);
      expect(decisionJump4.reason).toContain("jumped from 3/5 to 4/5");

      // Jump from 4 to 5 picks (perfect twin!)
      const decisionJump5 = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: {
          similarity: 0.85,
          matchedCount: 4,
        },
        newMatch: {
          similarity: 0.92,
          matchedCount: 5,
        },
        upgradePushesToday: 0,
      });

      expect(decisionJump5.shouldTrigger).toBe(true);
      expect(decisionJump5.isPickJump).toBe(true);
    });

    it("should NOT trigger upgrade push if improvement is under ΔS 0.10 and no pick jump", () => {
      const decision = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: {
          similarity: 0.65,
          matchedCount: 3,
        },
        newMatch: {
          similarity: 0.71, // +0.06 (< 0.10)
          matchedCount: 3,
        },
        upgradePushesToday: 0,
      });

      expect(decision.shouldTrigger).toBe(false);
      expect(decision.reason).toContain("Upgrade criteria not met");
    });

    it("should enforce maximum 1 twin upgrade push per day", () => {
      const decision = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: {
          similarity: 0.60,
          matchedCount: 3,
        },
        newMatch: {
          similarity: 0.90, // Massive improvement
          matchedCount: 5,
        },
        upgradePushesToday: MAX_UPGRADE_PUSHES_PER_DAY, // Already received 1 today
      });

      expect(decision.shouldTrigger).toBe(false);
      expect(decision.reason).toContain("Maximum twin upgrade pushes reached today");
    });

    it("should NOT trigger upgrade push on initial reveal without previous match", () => {
      const decision = shouldTriggerTwinUpgrade({
        playerId: "player-1",
        previousMatch: null,
        newMatch: {
          similarity: 0.80,
          matchedCount: 4,
        },
        upgradePushesToday: 0,
      });

      expect(decision.shouldTrigger).toBe(false);
      expect(decision.reason).toContain("initial reveal");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Notification Templates & Channels (P10.04)
  // -------------------------------------------------------------------------
  describe("Push Notification Templates (P10.04)", () => {
    it("should build valid payload for drop_live channel", () => {
      const payload = buildPushPayload("drop_live");
      expect(payload.title).toContain("Drop Live");
      expect(payload.body).toContain("Today's five are live");
      expect(payload.data.channel).toBe("drop_live");
      expect(payload.data.url).toBe("/");
    });

    it("should build valid payload for smart_nudge channel", () => {
      const payload = buildPushPayload("smart_nudge");
      expect(payload.title).toContain("twin is waiting");
      expect(payload.body).toContain("Find your twin");
      expect(payload.data.channel).toBe("smart_nudge");
    });

    it("should build valid payload for twin_upgrade channel with location details", () => {
      const payload = buildPushPayload("twin_upgrade", {
        twinUpgrade: {
          matchedCount: 4,
          city: "Berlin",
          country: "Germany",
          similarity: 0.88,
        },
      });

      expect(payload.title).toContain("Twin Upgrade");
      expect(payload.body).toContain("4/5 picks with a twin in Berlin");
      expect(payload.data.channel).toBe("twin_upgrade");
      expect(payload.data.url).toBe("/results");
    });

    it("should build valid payload for recap channel", () => {
      const payload = buildPushPayload("recap");
      expect(payload.title).toContain("Recap Ready");
      expect(payload.body).toContain("Yesterday's results are locked");
      expect(payload.data.channel).toBe("recap");
      expect(payload.data.url).toBe("/recap");
    });

    it("should build valid payload for streak_at_risk channel", () => {
      const payload = buildPushPayload("streak_at_risk", {
        streakAtRisk: { currentStreak: 5 },
      });

      expect(payload.title).toContain("Streak at Risk");
      expect(payload.body).toContain("5-day flame");
      expect(payload.data.channel).toBe("streak_at_risk");
    });
  });

  // -------------------------------------------------------------------------
  // 4. BullMQ sendPush Processor & Error Handling (P10.03)
  // -------------------------------------------------------------------------
  describe("sendPush BullMQ Processor (P10.03)", () => {
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      keys: {
        p256dh: "BMockPublicKey1234567890",
        auth: "MockAuthSecret123",
      },
    };

    it("should successfully dispatch web push notification via web-push", async () => {
      vi.mocked(webpush.sendNotification).mockResolvedValueOnce({
        statusCode: 201,
        body: "",
        headers: {},
      });

      const mockJob = {
        data: {
          playerId: "player-1",
          subscription: mockSubscription,
          payload: buildPushPayload("drop_live"),
        },
      } as unknown as Job<SendPushJobData>;

      const result = await processSendPushJob(mockJob);
      expect(result.delivered).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it("should detect expired subscriptions on HTTP 410 Gone", async () => {
      const err = Object.assign(
        new Error("Subscription has expired or is no longer valid"),
        { statusCode: 410 }
      );
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(err);

      const mockJob = {
        data: {
          playerId: "player-1",
          subscription: mockSubscription,
          payload: "Test payload",
        },
      } as unknown as Job<SendPushJobData>;

      const result = await processSendPushJob(mockJob);
      expect(result.delivered).toBe(false);
      expect(result.statusCode).toBe(410);
      expect(result.expired).toBe(true);
    });

    it("should respect delivery policy check inside job processor", async () => {
      const mockJob = {
        data: {
          playerId: "player-1",
          subscription: mockSubscription,
          payload: "Test payload",
          policyCheck: {
            playerId: "player-1",
            currentPushesToday: 2, // cap reached
          },
        },
      } as unknown as Job<SendPushJobData>;

      const result = await processSendPushJob(mockJob);
      expect(result.delivered).toBe(false);
      expect(result.reason).toContain("Daily push limit reached");
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });
});
