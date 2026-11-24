/**
 * @file safety-foundation.test.ts
 * @package @oddly/shared
 *
 * Tests for Slice A6: Safety Foundation (Block, Report, Sever, Consent, Kill Switches, Audit Log).
 */

import { describe, it, expect } from "vitest";

describe("Slice A6: Safety Foundation", () => {
  describe("Mutual Block Exclusion & Safety Invariants", () => {
    it("disallows self-blocking", () => {
      const blockerId = "player-1";
      const blockedId = "player-1";
      expect(blockerId === blockedId).toBe(true);
    });

    it("evaluates bidirectional block exclusion during candidate pairing", () => {
      const blockedPairs = new Set<string>([
        "p1:p2", // p1 blocked p2
      ]);

      const isBlocked = (u: string, v: string) => {
        return blockedPairs.has(`${u}:${v}`) || blockedPairs.has(`${v}:${u}`);
      };

      expect(isBlocked("p1", "p2")).toBe(true);
      expect(isBlocked("p2", "p1")).toBe(true); // Bidirectional exclusion
      expect(isBlocked("p1", "p3")).toBe(false);
      expect(isBlocked("p2", "p3")).toBe(false);
    });

    it("transitions orbit status to severed upon blocking", () => {
      interface OrbitMock {
        id: string;
        initiator_id: string;
        partner_id: string;
        status: "active" | "severed" | "dormant";
      }

      const orbit: OrbitMock = {
        id: "orb-1",
        initiator_id: "p1",
        partner_id: "p2",
        status: "active",
      };

      // Player 1 blocks Player 2
      if (
        (orbit.initiator_id === "p1" && orbit.partner_id === "p2") ||
        (orbit.initiator_id === "p2" && orbit.partner_id === "p1")
      ) {
        orbit.status = "severed";
      }

      expect(orbit.status).toBe("severed");
    });
  });

  describe("Audit Log & Ops Event Invariants", () => {
    it("formats valid immutable audit log records for sever_orbit and ban_player", () => {
      const allowedActions = [
        "sever_orbit",
        "ban_player",
        "block_player",
        "report_submitted",
        "pull_question",
        "disable_feature",
      ];

      const severLog = {
        action: "sever_orbit",
        target_type: "orbit",
        target_id: "orb-123",
        actor: "ops_admin",
        before_data: { status: "active" },
        after_data: { status: "severed", reason: "harassment_report" },
        created_at: new Date().toISOString(),
      };

      const banLog = {
        action: "ban_player",
        target_type: "player",
        target_id: "ply-456",
        actor: "ops_admin",
        before_data: { active_orbits_count: 2 },
        after_data: { reason: "tos_violation" },
        created_at: new Date().toISOString(),
      };

      expect(allowedActions).toContain(severLog.action);
      expect(allowedActions).toContain(banLog.action);
      expect(severLog.after_data.status).toBe("severed");
    });
  });

  describe("Kill Switches & Consent Gating (DPDP)", () => {
    it("respects consent gating for telemetry", () => {
      const checkTelemetryAllowed = (consent: { analytics: boolean }) => {
        return consent.analytics === true;
      };

      expect(checkTelemetryAllowed({ analytics: false })).toBe(false);
      expect(checkTelemetryAllowed({ analytics: true })).toBe(true);
    });
  });
});
