/**
 * @file push.test.ts
 * @package @oddly/api
 *
 * Integration test suite for Stage 10 Push Notification Routes & Repository (P10.02, P10.09).
 */

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import { NotificationsRepository } from "./db/notifications.repo.js";

describe("Stage 10 API: Push Notifications & Telemetry (P10.02, P10.09)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  beforeEach(() => {
    NotificationsRepository.clearMemory();
  });

  describe("Push Subscription Endpoints (P10.02)", () => {
    it("POST /v1/me/push-subscription registers a valid Web Push subscription", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/me/push-subscription",
        headers: { "content-type": "application/json" },
        cookies: { oddly_session: "player_test_push_1" },
        payload: {
          endpoint: "https://fcm.googleapis.com/fcm/send/device-token-12345",
          keys: {
            p256dh: "BMockPublicKeyForTesting1234567890",
            auth: "MockAuthKey123",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain("registered successfully");

      // Verify repository stored subscription
      const active = await NotificationsRepository.getActiveSubscriptions("player_test_push_1");
      expect(active.length).toBe(1);
      expect(active[0]?.endpoint).toBe("https://fcm.googleapis.com/fcm/send/device-token-12345");
    });

    it("POST /v1/push/subscribe works as an alias for guest or client devices", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/push/subscribe",
        headers: { "content-type": "application/json" },
        cookies: { oddly_did: "device_uuid_999" },
        payload: {
          endpoint: "https://updates.push.services.mozilla.com/wpush/v2/firefox-sub-token",
          keys: {
            p256dh: "BMockMozillaKey123",
            auth: "MozillaAuth123",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.ok).toBe(true);
    });

    it("rejects invalid subscription payloads with 400 Bad Request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/me/push-subscription",
        headers: { "content-type": "application/json" },
        payload: {
          endpoint: "not-a-valid-url",
          keys: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Push Delivery & Open Rate Telemetry (P10.09)", () => {
    it("logs dispatches and tracks notification clicks/opens", async () => {
      // 1. Log a dispatched notification
      const notifId = await NotificationsRepository.logDispatch({
        playerId: "player_telemetry_1",
        channel: "drop_live",
        status: "sent",
      });
      expect(notifId).toBeDefined();

      // 2. Track open via POST /v1/push/track
      const trackResponse = await app.inject({
        method: "POST",
        url: "/v1/push/track",
        headers: { "content-type": "application/json" },
        cookies: { oddly_session: "player_telemetry_1" },
        payload: {
          channel: "drop_live",
          event: "opened",
          notificationId: notifId,
        },
      });

      expect(trackResponse.statusCode).toBe(200);
      expect(trackResponse.json().tracked).toBe(true);

      // 3. Query stats via GET /v1/push/stats
      const statsResponse = await app.inject({
        method: "GET",
        url: "/v1/push/stats?channel=drop_live",
      });

      expect(statsResponse.statusCode).toBe(200);
      const statsJson = statsResponse.json();
      expect(statsJson.ok).toBe(true);
      expect(statsJson.stats.length).toBe(1);

      const dropLiveStats = statsJson.stats[0];
      expect(dropLiveStats.channel).toBe("drop_live");
      expect(dropLiveStats.totalSent).toBe(1);
      expect(dropLiveStats.totalOpened).toBe(1);
      expect(dropLiveStats.openRatePercent).toBe(100);
    });

    it("correctly deactivates expired subscriptions (410/404 handling)", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/expired-token-777";
      await NotificationsRepository.saveSubscription({
        playerId: "player_expire_test",
        endpoint,
        keys: { p256dh: "key", auth: "auth" },
      });

      const before = await NotificationsRepository.getActiveSubscriptions("player_expire_test");
      expect(before.length).toBe(1);

      // Deactivate
      await NotificationsRepository.deactivateSubscription(endpoint);

      const after = await NotificationsRepository.getActiveSubscriptions("player_expire_test");
      expect(after.length).toBe(0);
    });

    it("calculates daily sent count for capping enforcement", async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await NotificationsRepository.logDispatch({
        playerId: "player_cap_test",
        channel: "drop_live",
        status: "sent",
      });
      await NotificationsRepository.logDispatch({
        playerId: "player_cap_test",
        channel: "smart_nudge",
        status: "sent",
      });

      const count = await NotificationsRepository.getDailySentCount("player_cap_test", todayStr);
      expect(count).toBe(2);
    });
  });
});
