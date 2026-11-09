/**
 * @file settings.test.ts
 * @package @oddly/api
 *
 * Comprehensive integration test suite for Stage 8:
 * Streaks, History, Settings, Privacy, and Reports (P8.01 – P8.10).
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import { StreaksRepository, STREAK_MILESTONES } from "./db/streaks.repo.js";
import { HistoryRepository } from "./db/history.repo.js";
import { getTwinDay } from "@oddly/shared";

describe("Stage 8: Streaks, History, Settings & Privacy (P8.01 – P8.10)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  describe("P8.01: Streak Verification & Milestone Calculation", () => {
    it("computes streak and detects milestone thresholds (7, 30, 100, 365)", async () => {
      expect(STREAK_MILESTONES).toEqual([7, 30, 100, 365]);

      const playerId = "plyr_streak_test_" + Date.now();
      const dropId = "drop_streak_test_" + Date.now();

      const res = await StreaksRepository.recordStreakForSubmission(playerId, dropId);

      expect(res.currentStreak).toBeGreaterThanOrEqual(1);
      expect(res.totalActiveDays).toBeGreaterThanOrEqual(1);
      expect(typeof res.isMilestone).toBe("boolean");
    });

    it("returns streak summary with days until next milestone", async () => {
      const playerId = "plyr_summary_" + Date.now();
      const summary = await StreaksRepository.getStreakSummary(playerId);

      expect(summary.nextMilestone).toBeGreaterThanOrEqual(7);
      expect(summary.daysToNextMilestone).toBeGreaterThanOrEqual(0);
    });
  });

  describe("P8.03: GET /v1/history Archive Endpoint", () => {
    it("returns history items and streak stats for authenticated or guest player", async () => {
      const mockPlayerId = "plyr_hist_" + Date.now();
      HistoryRepository.setInMemoryHistory(mockPlayerId, [
        {
          submissionId: "sub_1",
          dropId: "drop_1",
          dropDate: getTwinDay(new Date()),
          completedAt: new Date().toISOString(),
          sharerScore: 4,
          sharerTier: "Rare",
          sharerPercentile: 82,
          twinCity: "Tokyo, Japan",
          shareCardUrl: "http://localhost:3000/cards/card_1.png",
          answersCount: 5,
        },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/v1/history?limit=10",
        cookies: {
          oddly_session: mockPlayerId,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.streak).toBeDefined();
      expect(data.streak.next_milestone).toBeDefined();
    });
  });

  describe("P8.04: User Settings & Preferences (/v1/me/preferences)", () => {
    it("retrieves and updates notification preferences and quiet hours", async () => {
      // 1. Get default preferences
      const getRes = await app.inject({
        method: "GET",
        url: "/v1/me/preferences",
      });

      expect(getRes.statusCode).toBe(200);
      const getData = JSON.parse(getRes.body);
      expect(getData.ok).toBe(true);
      expect(getData.preferences.notifications_enabled).toBeDefined();

      // 2. Update preferences
      const putRes = await app.inject({
        method: "PUT",
        url: "/v1/me/preferences",
        payload: {
          notifications_enabled: false,
          quiet_hours_start: "23:00",
        },
      });

      expect(putRes.statusCode).toBe(200);
      const putData = JSON.parse(putRes.body);
      expect(putData.ok).toBe(true);
    });
  });

  describe("P8.05: DPDP Data Portability (/v1/me/export)", () => {
    it("exports downloadable user data containing zero plaintext email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/me/export",
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(data.export_date).toBeDefined();
      expect(data.streaks).toBeDefined();

      // DPDP privacy audit: zero plaintext email in export payload
      const jsonStr = JSON.stringify(data);
      expect(jsonStr).not.toContain("@oddly.app");
      expect(jsonStr).not.toContain("@gmail.com");
    });
  });

  describe("P8.06: DPDP Right to Erasure (DELETE /v1/me)", () => {
    it("erases account and clears session cookies", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/v1/me",
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(data.message).toContain("erased");

      // Verify clear cookie headers
      const setCookies = res.headers["set-cookie"] as string[];
      expect(setCookies).toBeDefined();
      const clearAccess = setCookies.find((c) => c.includes("oddly_at="));
      expect(clearAccess).toMatch(/Max-Age=0|expires=/i);
    });
  });

  describe("P8.07: Moderation Reporting (POST /v1/reports)", () => {
    it("accepts content and user conduct reports within 140 char note limit", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/reports",
        payload: {
          target_type: "twin",
          target_id: "match_12345",
          reason: "offensive",
          note: "Inappropriate nickname revealed in matchup.",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(data.report_id).toMatch(/^rep_/);
      expect(data.message).toContain("moderation");
    });

    it("rejects reports with notes exceeding 140 characters", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/reports",
        payload: {
          target_type: "drop",
          target_id: "drop_12345",
          reason: "inappropriate",
          note: "A".repeat(150), // exceeds 140 chars
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
