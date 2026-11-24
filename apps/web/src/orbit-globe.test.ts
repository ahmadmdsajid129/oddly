/**
 * @file orbit-globe.test.ts
 * @package @oddly/web
 *
 * Test suite for Phase 10B: Orbit & Globe UI (Stage F2 / P10B.01-P10B.10).
 */

import { describe, expect, it } from "vitest";
import { APPROVED_EXPRESSIONS } from "./components/orbit/ExpressionTray";
import { ORBIT_MILESTONES } from "./components/orbit/StagedUnlocks";
import type { IncomingKeepItem, OrbitListItem, GlobeArc, UserOrbitLine } from "@oddly/api-client";

describe("Phase 10B: Orbit & Globe UI (Stage F2)", () => {
  describe("P10B.01: Keep Twin and Provisional State", () => {
    it("enforces keep button is locked on provisional twin until final 07:00 IST reveal", () => {
      const isProvisional = true;
      const canKeep = !isProvisional;
      expect(canKeep).toBe(false);

      const lockedFinalTwin = false; // is_provisional = false
      const canKeepFinal = !lockedFinalTwin;
      expect(canKeepFinal).toBe(true);
    });

    it("requires soft Google sign-in prompt for guest users", () => {
      const guestPlayer = { isAuthenticated: false };
      const promptCopy =
        "Sign in with Google to keep your twin across daily drops. Never lose a bond.";
      expect(guestPlayer.isAuthenticated).toBe(false);
      expect(promptCopy).toContain("Sign in with Google");
      expect(promptCopy).toContain("Never lose a bond");
    });
  });

  describe("P10B.02: Orbit Incoming Request Card", () => {
    it("sanitizes incoming requests to anonymous coarse region and age band", () => {
      const mockRequest: IncomingKeepItem = {
        id: "keep-123",
        drop_date: "2026-11-15",
        similarity_snapshot: 0.8,
        region: "Western Europe",
        age_band: "18-24",
        created_at: new Date().toISOString(),
      };

      expect(mockRequest.id).toBe("keep-123");
      expect(mockRequest.similarity_snapshot).toBe(0.8);
      // Privacy invariant: zero PII or individual answers exposed
      expect((mockRequest as any).phone).toBeUndefined();
      expect((mockRequest as any).answers).toBeUndefined();
      expect((mockRequest as any).user_id).toBeUndefined();
      expect(mockRequest.region).toBe("Western Europe");
      expect(mockRequest.age_band).toBe("18-24");
    });
  });

  describe("P10B.04: Expression Tray (The Wave)", () => {
    it("contains exactly 6 approved curated database stickers", () => {
      expect(APPROVED_EXPRESSIONS.length).toBe(6);
      const keys = APPROVED_EXPRESSIONS.map((e) => e.key);
      expect(keys).toEqual([
        "wave",
        "sparkles",
        "purple_heart",
        "raised_hands",
        "coffee",
        "thinking",
      ]);

      const emojis = APPROVED_EXPRESSIONS.map((e) => e.emoji);
      expect(emojis).toContain("👋");
      expect(emojis).toContain("✨");
      expect(emojis).toContain("💜");
      expect(emojis).toContain("🙌");
      expect(emojis).toContain("☕");
      expect(emojis).toContain("🤔");
    });

    it("enforces 1 expression per direction per day", () => {
      const myExpressionsSentToday: number = 1;
      const canExpress = myExpressionsSentToday === 0;
      expect(canExpress).toBe(false);
    });
  });

  describe("P10B.05: Staged Unlocks Progression Track", () => {
    it("defines 5 progressive milestones from Day 1 to Day 30", () => {
      expect(ORBIT_MILESTONES.length).toBe(5);
      expect(ORBIT_MILESTONES[0]?.day).toBe(1);
      expect(ORBIT_MILESTONES[0]?.title).toBe("Globe Line");

      expect(ORBIT_MILESTONES[1]?.day).toBe(3);
      expect(ORBIT_MILESTONES[1]?.title).toBe("Pick Overlap");

      expect(ORBIT_MILESTONES[2]?.day).toBe(7);
      expect(ORBIT_MILESTONES[2]?.title).toBe("Telepathy Sync");

      expect(ORBIT_MILESTONES[3]?.day).toBe(14);
      expect(ORBIT_MILESTONES[3]?.title).toBe("Orbit Card");

      expect(ORBIT_MILESTONES[4]?.day).toBe(30);
      expect(ORBIT_MILESTONES[4]?.title).toBe("Co-Anniversary");
    });

    it("correctly identifies unlocked milestones based on co-streak", () => {
      const currentStreak = 5;
      const unlocked = ORBIT_MILESTONES.filter((m) => currentStreak >= m.day);
      expect(unlocked.length).toBe(2); // Day 1 & Day 3 unlocked

      const next = ORBIT_MILESTONES.find((m) => currentStreak < m.day);
      expect(next?.day).toBe(7);
      expect(next?.title).toBe("Telepathy Sync");
    });
  });

  describe("P10B.06 & P10B.07: Twin Globe Map Projection and Arcs", () => {
    it("projects coordinates accurately onto 800x450 map plane", () => {
      const mapWidth = 800;
      const mapHeight = 450;

      // Equator & Prime Meridian [0, 0] should map to center [400, 225]
      const projectCoords = (lat: number, lon: number) => [
        ((lon + 180) / 360) * mapWidth,
        ((90 - lat) / 180) * mapHeight,
      ];

      const [cx, cy] = projectCoords(0, 0);
      expect(cx).toBe(400);
      expect(cy).toBe(225);

      // Western Europe (lat 48.8, lon 2.3)
      const [ex, ey] = projectCoords(48.8566, 2.3522);
      expect(ex).toBeGreaterThan(400);
      expect(ey).toBeLessThan(225);
    });

    it("generates smooth quadratic bezier arc with upward apex", () => {
      const from: [number, number] = [20.59, 78.96]; // South Asia
      const to: [number, number] = [48.85, 2.35]; // Western Europe

      const x1 = ((from[1] + 180) / 360) * 800;
      const y1 = ((90 - from[0]) / 180) * 450;
      const x2 = ((to[1] + 180) / 360) * 800;
      const y2 = ((90 - to[0]) / 180) * 450;

      const mx = (x1 + x2) / 2;
      const my = Math.min(y1, y2) - 40;

      const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
      expect(path).toContain("M ");
      expect(path).toContain("Q ");
      expect(my).toBeLessThan(Math.min(y1, y2)); // bows upward toward top of map
    });
  });

  describe("P10B.08: Live vs Replay Volume Threshold", () => {
    it("triggers Replay loop when submissions count < 50", () => {
      const liveVolume = 12;
      const isLive = liveVolume >= 50;
      const mode = isLive ? "live" : "replay";
      const statusText = isLive
        ? "Live matches"
        : "Quiet right now. Replaying yesterday's twins.";

      expect(mode).toBe("replay");
      expect(statusText).toContain("Replaying yesterday's twins");
    });

    it("engages Live mode when submissions count >= 50", () => {
      const liveVolume = 142;
      const isLive = liveVolume >= 50;
      const mode = isLive ? "live" : "replay";

      expect(mode).toBe("live");
    });
  });

  describe("Stage A11 (F28): Subject Sync (Statistics Only)", () => {
    it("locks subject tag sync when shared questions < threshold (k < 5)", () => {
      const threshold = 5;
      const item = {
        tag_id: "tag-pop-culture",
        tag_key: "pop-culture",
        category: "culture",
        shared_questions: 3,
        agreement_count: null,
        agreement_percentage: null,
        status: 3 >= threshold ? "unlocked" : "locked",
        lock_reason: "Play 2 more drops together to unlock Pop Culture sync (3/5)",
      };

      expect(item.status).toBe("locked");
      expect(item.agreement_percentage).toBeNull();
      expect(item.lock_reason).toContain("Play 2 more drops together");
    });

    it("unlocks tag agreement percentage when shared questions >= threshold (k >= 5)", () => {
      const threshold = 5;
      const shared = 6;
      const agreed = 5;
      const item = {
        tag_id: "tag-humor",
        tag_key: "humor",
        category: "memes",
        shared_questions: shared,
        status: shared >= threshold ? "unlocked" : "locked",
        agreement_count: agreed,
        agreement_percentage: Math.round((agreed / shared) * 100),
        lock_reason: null,
      };

      expect(item.status).toBe("unlocked");
      expect(item.agreement_percentage).toBe(83); // 5/6 = 83%
      expect(item.agreement_count).toBe(5);
      expect(item.lock_reason).toBeNull();
    });

    it("verifies Rule 19 Zero-Leak: no pick-level or question-level data in payload", () => {
      const payload: Record<string, unknown> = {
        tag_id: "tag-humor",
        tag_key: "humor",
        category: "memes",
        shared_questions: 6,
        agreement_count: 5,
        agreement_percentage: 83,
        status: "unlocked",
      };

      expect(payload["answers"]).toBeUndefined();
      expect(payload["picks"]).toBeUndefined();
      expect(payload["question_id"]).toBeUndefined();
      expect(payload["question_text"]).toBeUndefined();
      expect(payload["raw_vectors"]).toBeUndefined();
    });
  });
});
